/**
 * v4.4.0A: process-pending-import — Async worker that parses inbound email body
 *
 * Uses the canonical parse contract for universal classification
 * and required field enforcement across ALL entity types.
 *
 * v4.4.0A changes:
 * - Each flight leg becomes its own CanonicalBooking (no more flight_legs array in output).
 * - parsed_data is stored as a CanonicalImportBatch.
 * - Trip start/end derived from service dates across ALL bookings.
 *
 * 1. Read pending_import by ID (service role)
 * 2. Extract clean plain-text body, strip quoted threads
 * 3. Send to AI extraction
 * 4. Apply canonical classification + required field enforcement
 * 5. Build CanonicalBooking[] (one per bookable unit)
 * 6. Derive trip window from service dates
 * 7. Store CanonicalImportBatch in parsed_data, PURGE raw email content
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiGateway } from "../_shared/ai-client.ts";
import {
  normalizeDatetime,
  normalizeReceiptDate,
  cleanNullStrings,
  hasServiceDates,
} from "../_shared/datetime-utils.ts";
import {
  classifyDocument,
  enforceRequiredFields,
  type DocClassification,
  ENTITY_TYPE_LABELS,
} from "../_shared/parse-contract.ts";
import {
  type CanonicalBooking,
  type CanonicalImportBatch,
  deriveTripDatesFromBookings,
} from "../_shared/import-contract.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("x-internal-secret");
  if (authHeader !== SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }

  let importId: string;
  try {
    const body = await req.json();
    importId = body.import_id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  if (!importId) {
    return new Response(JSON.stringify({ error: "Missing import_id" }), {
      status: 400, headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ── 1. Read pending import ──────────────────────────────────────
  const { data: pending, error: fetchErr } = await supabase
    .from("pending_imports")
    .select("*")
    .eq("id", importId)
    .single();

  if (fetchErr || !pending) {
    console.error("process-pending-import: not found", importId, fetchErr?.message);
    return new Response(JSON.stringify({ error: "Import not found" }), {
      status: 404, headers: { "Content-Type": "application/json" },
    });
  }

  if (pending.status !== "pending") {
    return jsonOk({ status: "already_processed" });
  }

  await supabase
    .from("pending_imports")
    .update({ status: "processing" })
    .eq("id", importId);

  const parsedData = pending.parsed_data as Record<string, unknown>;
  const textBody = (parsedData.text_body as string) || "";
  const htmlBody = (parsedData.html_body as string) || "";
  const rawContent = textBody || stripHtml(htmlBody);

  if (!rawContent.trim()) {
    await purgeAndSetStatus(supabase, importId, "failed", "EMPTY_BODY", null);
    return jsonOk({ status: "failed", reason: "empty_body" });
  }

  // ── 2. Strip quoted threads ────────────────────────────────────
  const cleanBody = stripQuotedThreads(rawContent);

  // ── 3. Send to AI extraction ───────────────────────────────────
  const systemPrompt = buildSystemPrompt();
  const { data: extracted, errorResponse } = await callAiGateway<Record<string, unknown>>({
    systemPrompt,
    userContent: cleanBody,
    tools: [
      {
        type: "function",
        function: {
          name: "extract_booking",
          description: "Extract booking details from email confirmation",
          parameters: {
            type: "object",
            properties: {
              is_receipt_only: { type: "boolean", description: "True if receipt without service dates" },
              booking_type: { type: "string", enum: ["flight", "stay", "car_rental", "activity", "parking", "transport", "other"] },
              vendor_name: { type: "string" },
              start_datetime: { type: "string" },
              end_datetime: { type: "string" },
              confirmation_number: { type: "string" },
              total_cost: { type: "number" },
              address: { type: "string" },
              airline: { type: "string" },
              passenger_name: { type: "string" },
              property_name: { type: "string" },
              stay_type: { type: "string", enum: ["hotel", "airbnb", "vrbo", "other"] },
              rental_company: { type: "string" },
              pickup_location: { type: "string" },
              return_location: { type: "string" },
              parking_type: { type: "string", enum: ["airport", "hotel", "city_garage", "beach", "other"] },
              departure_airport_code: { type: "string" },
              arrival_airport_code: { type: "string" },
              location_summary: { type: "string" },
              notes: { type: "string" },
              receipt_date: { type: "string", description: "Payment date YYYY-MM-DD for receipts" },
              flight_legs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    departure_airport_code: { type: "string" },
                    arrival_airport_code: { type: "string" },
                    departure_datetime: { type: "string" },
                    arrival_datetime: { type: "string" },
                    flight_number: { type: "string" },
                  },
                },
              },
              is_payment_declined: { type: "boolean" },
              currency_code: { type: "string" },
            },
            required: ["vendor_name"],
          },
        },
      },
    ],
    toolChoice: { type: "function", function: { name: "extract_booking" } },
  });

  if (errorResponse || !extracted) {
    await purgeAndSetStatus(supabase, importId, "failed", "PARSE_FAILED", null);
    console.error("process-pending-import: AI parse failed for", importId);
    return jsonOk({ status: "failed", reason: "parse_failed" });
  }

  // ── 4. Post-process extracted fields ───────────────────────────
  cleanNullStrings(extracted);
  const IATA_RE = /^[A-Z]{3}$/i;
  if (extracted.departure_airport_code && !IATA_RE.test(String(extracted.departure_airport_code).trim())) {
    extracted.departure_airport_code = null;
  } else if (extracted.departure_airport_code) {
    extracted.departure_airport_code = String(extracted.departure_airport_code).trim().toUpperCase();
  }
  if (extracted.arrival_airport_code && !IATA_RE.test(String(extracted.arrival_airport_code).trim())) {
    extracted.arrival_airport_code = null;
  } else if (extracted.arrival_airport_code) {
    extracted.arrival_airport_code = String(extracted.arrival_airport_code).trim().toUpperCase();
  }
  extracted.start_datetime = normalizeDatetime(extracted.start_datetime as string | null);
  extracted.end_datetime = normalizeDatetime(extracted.end_datetime as string | null);
  if (extracted.receipt_date) {
    extracted.receipt_date = normalizeReceiptDate(extracted.receipt_date as string | null);
  }

  // v4.3.0: Normalize and sort flight legs
  if (Array.isArray(extracted.flight_legs) && (extracted.flight_legs as unknown[]).length > 0) {
    const legs = extracted.flight_legs as Record<string, unknown>[];
    legs.forEach(leg => {
      const rawDep = leg.departure_datetime as string | null;
      const rawArr = leg.arrival_datetime as string | null;

      // If the value already contains a date portion, normalize normally
      // If it looks like a bare time (HH:MM) without a date, do not normalize — it will be lost
      leg.departure_datetime = rawDep && rawDep.length >= 10
        ? normalizeDatetime(rawDep)
        : rawDep || null;

      leg.arrival_datetime = rawArr && rawArr.length >= 10
        ? normalizeDatetime(rawArr)
        : rawArr || null;
    });
    legs.sort((a, b) => ((a.departure_datetime as string) || '').localeCompare((b.departure_datetime as string) || ''));
    legs.forEach((leg, i) => { leg.is_outbound = i === 0; });
    extracted.flight_legs = legs;
  }

  // v4.3.0: Flag declined payments
  if (extracted.is_payment_declined === true) {
    extracted._payment_declined = true;
  }

  // v4.3.0: Normalize currency code
  if (extracted.currency_code) {
    extracted.currency_code = String(extracted.currency_code).toUpperCase().trim();
  }

  // ── 4b. CANONICAL CLASSIFICATION ──────────────────────────────
  const entityType = (extracted.booking_type as string) || 'other';
  const hasDates = hasServiceDates(extracted);
  const docClass: DocClassification = classifyDocument(extracted, hasDates);
  
  extracted._doc_classification = docClass;

  if (docClass === 'RECEIPT') {
    extracted._is_receipt_only = true;
  } else if (docClass === 'CONFIRMATION' || docClass === 'UNKNOWN') {
    // Enforce required fields
    const issue = enforceRequiredFields(extracted, entityType);
    if (issue) {
      extracted._parse_issues = [issue];
    }
  }

  // ── 5. Validate extracted fields against raw body ──────────────
  const validationResult = validateAgainstSource(extracted, cleanBody);

  // v4.3.0: Check if multi-leg flight provides dates via flight_legs
  const hasFlightLegs = Array.isArray(extracted.flight_legs) && (extracted.flight_legs as unknown[]).length > 0;

  // Compute confidence
  let confidence = 0.8;
  if (validationResult.hardFails.length > 0) confidence = 0.3;
  else if (validationResult.softIssues.length > 0) confidence = 0.6;

  // Lower confidence for issues
  if (extracted._parse_issues && (extracted._parse_issues as unknown[]).length > 0) {
    // v4.3.0: If multi-leg flight has legs, don't penalize for missing start_datetime
    if (hasFlightLegs) {
      const issues = extracted._parse_issues as string[];
      const nonDateIssues = issues.filter(i => !String(i).toLowerCase().includes('start_datetime'));
      if (nonDateIssues.length > 0) {
        confidence = Math.min(confidence, 0.4);
      }
      extracted._parse_issues = nonDateIssues.length > 0 ? nonDateIssues : undefined;
    } else {
      confidence = Math.min(confidence, 0.4);
    }
  }
  if (extracted._is_receipt_only) {
    confidence = Math.min(confidence, 0.5);
  }

  // v4.3.0: For status, don't flag needs_review solely for missing start_datetime when flight_legs exist
  const hasParseIssues = extracted._parse_issues && (extracted._parse_issues as unknown[]).length > 0;
  const status = (
    validationResult.hardFails.length > 0 ||
    extracted._is_receipt_only ||
    hasParseIssues
  ) ? "needs_review" : "ready_for_review";

  const summary = buildSummary(extracted);

  // ── 6. v4.4.0A: Build CanonicalBooking[] from extracted ────────
  const bookings: CanonicalBooking[] = [];
  const vendorName = (extracted.vendor_name as string) || (extracted.airline as string) || "Unknown";
  const confNum = (extracted.confirmation_number as string) || null;
  const docClassStr = String(docClass);
  const extractedCost = (extracted.total_cost as number) || null;
  const extractedCurrency = (extracted.currency_code as string) || null;

  // v3.9.9: Detect declined/cancelled confirmations
  const isDeclined = extracted._payment_declined === true ||
    extracted.is_payment_declined === true ||
    docClass === 'CHANGE_OR_CANCEL';

  if (
    (extracted.booking_type as string) === "flight" &&
    Array.isArray(extracted.flight_legs) &&
    (extracted.flight_legs as unknown[]).length > 0
  ) {
    // Multi-leg or single-leg flight: one CanonicalBooking per leg
    const legs = extracted.flight_legs as Record<string, unknown>[];
    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const cb: CanonicalBooking = {
        booking_type: "flight",
        vendor_name: vendorName,
        start_datetime: (leg.departure_datetime as string) || null,
        end_datetime: (leg.arrival_datetime as string) || null,
        confirmation_number: confNum,
        departure_airport_code: (leg.departure_airport_code as string) || null,
        arrival_airport_code: (leg.arrival_airport_code as string) || null,
        airline: (extracted.airline as string) || null,
        passenger_name: (extracted.passenger_name as string) || null,
        flight_number: (leg.flight_number as string) || null,
        // v3.9.9: Assign full cost to FIRST leg only (PNR-aware sync handles the rest)
        total_cost: i === 0 ? (isDeclined ? null : extractedCost) : null,
        currency_code: extractedCurrency,
        _source: "email",
        _import_id: importId,
        _doc_classification: isDeclined ? 'CHANGE_OR_CANCEL' : docClassStr,
      };
      if (isDeclined) {
        cb._parse_issues = [{ issueType: 'PAYMENT_DECLINED', entityType: 'flight', missingFields: [], actionHint: 'Payment was declined or cancelled.' }];
      }
      bookings.push(cb);
    }
  } else {
    // Non-flight or single-leg flight without flight_legs array
    const bt = (extracted.booking_type as string) || "other";
    const cb: CanonicalBooking = {
      booking_type: bt as CanonicalBooking["booking_type"],
      vendor_name: vendorName,
      start_datetime: (extracted.start_datetime as string) || null,
      end_datetime: (extracted.end_datetime as string) || null,
      confirmation_number: confNum,
      departure_airport_code: (extracted.departure_airport_code as string) || null,
      arrival_airport_code: (extracted.arrival_airport_code as string) || null,
      airline: (extracted.airline as string) || null,
      passenger_name: (extracted.passenger_name as string) || null,
      property_name: (extracted.property_name as string) || null,
      stay_type: (extracted.stay_type as CanonicalBooking["stay_type"]) || null,
      rental_company: (extracted.rental_company as string) || null,
      pickup_location: (extracted.pickup_location as string) || null,
      return_location: (extracted.return_location as string) || null,
      parking_type: (extracted.parking_type as CanonicalBooking["parking_type"]) || null,
      address: (extracted.address as string) || null,
      total_cost: isDeclined ? null : extractedCost,
      currency_code: extractedCurrency,
      _source: "email",
      _import_id: importId,
      _doc_classification: isDeclined ? 'CHANGE_OR_CANCEL' : docClassStr,
    };
    if (isDeclined) {
      cb._parse_issues = [{ issueType: 'PAYMENT_DECLINED', entityType: bt, missingFields: [], actionHint: 'Payment was declined or cancelled.' }];
    }
    bookings.push(cb);
  }

  // ── 7. Derive trip dates from service dates ────────────────────
  const tripDates = deriveTripDatesFromBookings(bookings);

  const batch: CanonicalImportBatch = {
    trip: {
      start_date: tripDates.start_date,
      end_date: tripDates.end_date,
    },
    bookings,
    _batch_summary: {
      booking_count: bookings.length,
      validation_hard_fails: validationResult.hardFails,
      validation_soft_issues: validationResult.softIssues,
      summary,
    },
  };

  // ── 8. Purge raw content and store canonical batch ─────────────
  await purgeAndSetStatus(supabase, importId, status, null, batch as unknown as Record<string, unknown>, confidence, vendorName);

  console.log(`process-pending-import: v4.4.0A ${importId} → ${status} (confidence: ${confidence}, classification: ${docClass}, bookings: ${bookings.length})`);
  return jsonOk({ status, confidence, import_id: importId, doc_classification: docClass, booking_count: bookings.length });
});

// ═════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════

function jsonOk(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}

async function purgeAndSetStatus(
  supabase: ReturnType<typeof createClient>,
  importId: string,
  status: string,
  errorCode: string | null,
  structuredData: Record<string, unknown> | null,
  confidence?: number,
  vendor?: string | null,
) {
  const update: Record<string, unknown> = {
    status,
    error_code: errorCode,
    parsed_data: structuredData ?? {},
    updated_at: new Date().toISOString(),
  };
  if (confidence !== undefined) update.confidence = confidence;
  if (vendor !== undefined) update.sender = vendor;
  await supabase.from("pending_imports").update(update).eq("id", importId);
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripQuotedThreads(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    if (/^[-]+\s*Original Message\s*[-]+/i.test(line)) break;
    if (/^On .+ wrote:$/i.test(line)) break;
    if (/^From:/i.test(line) && result.length > 5) break;
    if (/^>{2,}/.test(line)) continue;
    result.push(line);
  }
  return result.join("\n").trim();
}

function buildSystemPrompt(): string {
  return `You are a travel booking confirmation parser for inbound emails. Extract structured booking details.

FIRST determine if this is a CONFIRMATION (has service dates), a RECEIPT (payment only), or a CHANGE/CANCELLATION.
Set is_receipt_only accordingly.

BOOKING TYPE CLASSIFICATION:
- flight: Airline tickets, boarding passes, flight confirmations
- stay: Hotels, Airbnb, VRBO, vacation rentals
- car_rental: Rental cars
- parking: Parking services
- activity: Tours, excursions, permits, event tickets
- transport: Train, bus, ferry tickets
- other: Anything that doesn't fit above

DATETIME RULES:
- ONLY extract times explicitly stated in the document
- If no explicit time, use date-only format (YYYY-MM-DD)
- For flights: start_datetime = departure, end_datetime = arrival
- For stays: start_datetime = check-in, end_datetime = check-out

MULTI-LEG FLIGHT RULES:
- If the email contains more than one flight segment, populate flight_legs with one object per segment in chronological order.
- Each leg needs departure_airport_code, arrival_airport_code, departure_datetime, arrival_datetime.
- All datetimes must be YYYY-MM-DD or YYYY-MM-DDTHH:mm exactly as written in the email. No timezone conversion.
- Single-leg flights: leave flight_legs empty and use start_datetime/end_datetime as normal.

PAYMENT STATUS:
- If the email shows a declined, failed, or rejected payment, set is_payment_declined to true. Default false.

CURRENCY:
- Set currency_code to the 3-letter ISO code of the total_cost amount (USD, EUR, GBP). Null if unknown.

AIRPORT CODES:
- Extract 3-letter IATA codes (e.g., ATL, DEN)
- Only use codes explicitly mentioned in the text

Return JSON. Use null for unknown fields.`;
}

interface ValidationResult {
  hardFails: string[];
  softIssues: string[];
}

function validateAgainstSource(
  extracted: Record<string, unknown>,
  body: string,
): ValidationResult {
  const hardFails: string[] = [];
  const softIssues: string[] = [];
  const bodyUpper = body.toUpperCase();

  if (extracted.departure_airport_code) {
    if (!bodyUpper.includes(String(extracted.departure_airport_code))) {
      hardFails.push(`departure_airport_code "${extracted.departure_airport_code}" not found in email body`);
    }
  }
  if (extracted.arrival_airport_code) {
    if (!bodyUpper.includes(String(extracted.arrival_airport_code))) {
      hardFails.push(`arrival_airport_code "${extracted.arrival_airport_code}" not found in email body`);
    }
  }

  if (extracted.confirmation_number) {
    const conf = String(extracted.confirmation_number).toUpperCase();
    if (!bodyUpper.includes(conf)) {
      hardFails.push(`confirmation_number "${extracted.confirmation_number}" not found in email body`);
    }
  }

  for (const field of ["start_datetime", "end_datetime"]) {
    const val = extracted[field] as string | null;
    if (!val) continue;
    const dateOnly = val.substring(0, 10);
    const found = body.includes(dateOnly) || bodyContainsDateVariants(body, dateOnly);
    if (!found) {
      hardFails.push(`${field} date "${dateOnly}" not found in email body`);
    }
  }

  if (extracted.property_name) {
    const prop = String(extracted.property_name).toUpperCase();
    if (!bodyUpper.includes(prop)) {
      hardFails.push(`property_name "${extracted.property_name}" not found in email body`);
    }
  }

  if (!extracted.total_cost) softIssues.push("missing_cost");
  if (!extracted.confirmation_number) softIssues.push("missing_confirmation");
  if (!extracted.address && !extracted.location_summary) softIssues.push("missing_location");

  return { hardFails, softIssues };
}

function bodyContainsDateVariants(body: string, isoDate: string): boolean {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return false;
  const [y, m, d] = parts;
  const months = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthNum = parseInt(m, 10);
  const dayNum = parseInt(d, 10);
  const monthName = months[monthNum] || "";

  const variants = [
    `${monthName} ${dayNum}`,
    `${monthName.substring(0, 3)} ${dayNum}`,
    `${m}/${d}/${y}`,
    `${monthNum}/${dayNum}/${y}`,
    `${d}/${m}/${y}`,
  ];

  const bodyUpper = body.toUpperCase();
  return variants.some((v) => bodyUpper.includes(v.toUpperCase()));
}

function buildSummary(extracted: Record<string, unknown>): string {
  const type = extracted.booking_type as string || "item";
  const vendor = extracted.vendor_name as string || "";
  const dep = extracted.departure_airport_code as string || "";
  const arr = extracted.arrival_airport_code as string || "";
  const start = extracted.start_datetime as string || "";
  const dateStr = start ? start.substring(0, 10) : "";
  const docClass = extracted._doc_classification as string || "";

  const typeLabel: Record<string, string> = {
    flight: "a flight",
    stay: "a hotel stay",
    car_rental: "a car rental",
    parking: "parking",
    activity: "an activity",
    transport: "ground transport",
    other: "a booking",
  };

  // Prefix with classification for receipts
  if (docClass === 'RECEIPT') {
    return `Receipt: ${vendor || typeLabel[type] || 'payment'}${dateStr ? ` on ${formatDateShort(dateStr)}` : ''}`;
  }

  let summary = `We found ${typeLabel[type] || "a booking"}`;
  if (dateStr) {
    summary += ` on ${formatDateShort(dateStr)}`;
  }
  if (dep && arr) {
    summary += ` — ${dep} → ${arr}`;
  } else if (vendor) {
    summary += ` with ${vendor}`;
  }
  return summary;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[d.getMonth()]} ${d.getDate()}`;
}
