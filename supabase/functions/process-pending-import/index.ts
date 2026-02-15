/**
 * process-pending-import — Async worker that parses inbound email body
 *
 * 1. Read pending_import by ID (service role)
 * 2. Extract clean plain-text body, strip quoted threads
 * 3. Send to AI extraction (reusing parse-booking prompt logic)
 * 4. Validate extracted fields against original body
 * 5. Update pending_import with structured data + status
 * 6. PURGE raw email content from the record (non-negotiable)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callAiGateway } from "../_shared/ai-client.ts";
import {
  normalizeDatetime,
  normalizeReceiptDate,
  cleanNullStrings,
} from "../_shared/datetime-utils.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // This is an internal function — validate with service role secret
  const authHeader = req.headers.get("x-internal-secret");
  if (authHeader !== SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let importId: string;
  try {
    const body = await req.json();
    importId = body.import_id;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!importId) {
    return new Response(JSON.stringify({ error: "Missing import_id" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
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
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (pending.status !== "pending") {
    return new Response(JSON.stringify({ status: "already_processed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Mark as processing
  await supabase
    .from("pending_imports")
    .update({ status: "processing" })
    .eq("id", importId);

  const parsedData = pending.parsed_data as Record<string, unknown>;
  const textBody = (parsedData.text_body as string) || "";
  const htmlBody = (parsedData.html_body as string) || "";

  // Prefer plain text, fall back to stripped HTML
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
              booking_type: { type: "string", enum: ["flight", "stay", "car_rental", "activity", "parking", "other"] },
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

  // ── 5. Validate extracted fields against raw body ──────────────
  const validationResult = validateAgainstSource(extracted, cleanBody);

  // Compute confidence
  let confidence = 0.8;
  if (validationResult.hardFails.length > 0) {
    confidence = 0.3;
  } else if (validationResult.softIssues.length > 0) {
    confidence = 0.6;
  }

  const status = validationResult.hardFails.length > 0
    ? "needs_review"
    : "ready_for_review";

  // Build a human-readable summary for the card
  const summary = buildSummary(extracted);

  // ── 6. Purge raw content and update with structured data ───────
  await purgeAndSetStatus(supabase, importId, status, null, {
    ...extracted,
    _validation: {
      hard_fails: validationResult.hardFails,
      soft_issues: validationResult.softIssues,
    },
    _summary: summary,
  }, confidence, extracted.vendor_name as string || null);

  console.log(`process-pending-import: ${importId} → ${status} (confidence: ${confidence})`);
  return jsonOk({ status, confidence, import_id: importId });
});

// ═════════════════════════════════════════════════════════════════
// HELPERS
// ═════════════════════════════════════════════════════════════════

function jsonOk(data: Record<string, unknown>) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "Content-Type": "application/json" },
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
    // PURGE: Replace raw content with structured-only data (no text_body/html_body)
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
    // Stop at common reply markers
    if (/^[-]+\s*Original Message\s*[-]+/i.test(line)) break;
    if (/^On .+ wrote:$/i.test(line)) break;
    if (/^From:/i.test(line) && result.length > 5) break;
    if (/^>{2,}/.test(line)) continue; // skip deeply quoted
    result.push(line);
  }
  return result.join("\n").trim();
}

function buildSystemPrompt(): string {
  return `You are a travel booking confirmation parser for inbound emails. Extract structured booking details.

BOOKING TYPE CLASSIFICATION:
- flight: Airline tickets, boarding passes, flight confirmations
- stay: Hotels, Airbnb, VRBO, vacation rentals
- car_rental: Rental cars
- parking: Parking services
- activity: Tours, excursions, permits, event tickets
- other: Anything that doesn't fit above

DATETIME RULES:
- ONLY extract times explicitly stated in the document
- If no explicit time, use date-only format (YYYY-MM-DD)
- For flights: start_datetime = departure, end_datetime = arrival
- For stays: start_datetime = check-in, end_datetime = check-out

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

  // Hard: Airport codes must appear in body
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

  // Hard: Confirmation number must appear in body
  if (extracted.confirmation_number) {
    const conf = String(extracted.confirmation_number).toUpperCase();
    if (!bodyUpper.includes(conf)) {
      hardFails.push(`confirmation_number "${extracted.confirmation_number}" not found in email body`);
    }
  }

  // Hard: Key dates must appear (normalized check)
  for (const field of ["start_datetime", "end_datetime"]) {
    const val = extracted[field] as string | null;
    if (!val) continue;
    const dateOnly = val.substring(0, 10); // YYYY-MM-DD
    // Check various formats
    const found = body.includes(dateOnly) ||
      bodyContainsDateVariants(body, dateOnly);
    if (!found) {
      hardFails.push(`${field} date "${dateOnly}" not found in email body`);
    }
  }

  // Hard: Lodging name must appear
  if (extracted.property_name) {
    const prop = String(extracted.property_name).toUpperCase();
    if (!bodyUpper.includes(prop)) {
      hardFails.push(`property_name "${extracted.property_name}" not found in email body`);
    }
  }

  // Soft: Missing optional fields
  if (!extracted.total_cost) softIssues.push("missing_cost");
  if (!extracted.confirmation_number) softIssues.push("missing_confirmation");
  if (!extracted.address && !extracted.location_summary) softIssues.push("missing_location");

  return { hardFails, softIssues };
}

function bodyContainsDateVariants(body: string, isoDate: string): boolean {
  // isoDate = "2026-03-07"
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

  // Check: "March 7", "Mar 7", "03/07/2026", "3/7/2026"
  const variants = [
    `${monthName} ${dayNum}`,
    `${monthName.substring(0, 3)} ${dayNum}`,
    `${m}/${d}/${y}`,
    `${monthNum}/${dayNum}/${y}`,
    `${d}/${m}/${y}`, // DD/MM/YYYY
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

  const typeLabel: Record<string, string> = {
    flight: "a flight",
    stay: "a hotel stay",
    car_rental: "a car rental",
    parking: "parking",
    activity: "an activity",
    other: "a booking",
  };

  let summary = `We found ${typeLabel[type] || "a booking"}`;
  if (dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    summary += ` on ${monthNames[d.getMonth()]} ${d.getDate()}`;
  }
  if (dep && arr) {
    summary += ` — ${dep} → ${arr}`;
  } else if (vendor) {
    summary += ` with ${vendor}`;
  }
  return summary;
}
