/**
 * v3.9.25: Parse Booking Edge Function
 * 
 * Uses the canonical parse contract for document classification,
 * required field enforcement, and receipt handling across ALL entity types.
 * 
 * v3.9.25: LINE-BREAK TOLERANT FLIGHT PARSING
 * - Raw text is normalized (blank-line collapse, invisible char strip) before AI
 * - Normalization is parse-time only — raw text is NOT modified for storage
 * 
 * MULTI-LEG PRESERVATION (v4.5.0):
 * - AI tool schema includes a `flight_legs` array for multi-leg itineraries
 * - Each flight leg is mapped to a SEPARATE CanonicalBooking in the batch
 * - Deduplication uses segment-level identity (dep+arr+datetime), NOT PNR alone
 * - All legs persist independently in timeline
 * 
 * COST INTEGRITY RULES (v2.1.19):
 * - Airline confirmations with a SINGLE total trip price (Frontier-style):
 *   Full fare assigned to first leg, null on subsequent legs.
 * - If a field (price, tax, fee) is missing: leave null, never guess or copy.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { 
  normalizeDatetime, 
  normalizeReceiptDate, 
  cleanNullStrings,
  hasServiceDates,
  extractRawTimeToken,
  tryDeriveIsoTime,
} from "../_shared/datetime-utils.ts";
import {
  classifyDocument,
  enforceRequiredFields,
  type DocClassification,
  type ParseIssue,
  ENTITY_TYPE_LABELS,
} from "../_shared/parse-contract.ts";
import {
  type CanonicalBooking,
  type CanonicalImportBatch,
  deriveTripDatesFromBookings,
} from "../_shared/import-contract.ts";

// ============================================================================
// v3.9.25: TEXT NORMALIZATION (parse-time only)
// ============================================================================

const INVISIBLE_CHARS_RE = /[\u200B\u200C\u200D\u00AD\uFEFF\u2060\u180E\u034F\u2028\u2029]/g;

/**
 * Normalize raw confirmation text for AI parsing.
 * Collapses blank lines, strips invisible chars, trims lines.
 * Parse-time only — never persisted.
 */
function normalizeForParsing(rawText: string): string {
  if (!rawText) return rawText;
  const cleaned = rawText.replace(INVISIBLE_CHARS_RE, '');
  const lines = cleaned.split(/\r?\n/);
  const result: string[] = [];
  let lastWasBlank = true;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      if (!lastWasBlank) {
        result.push('');
        lastWasBlank = true;
      }
      continue;
    }
    result.push(trimmed);
    lastWasBlank = false;
  }

  // Remove trailing blank
  while (result.length > 0 && result[result.length - 1] === '') {
    result.pop();
  }

  return result.join('\n');
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================================
// v4.5.0: MULTI-LEG NORMALIZER
// ============================================================================

/**
 * Normalize a single datetime field, preserving explicit times.
 * If rawTimeToken exists but normalization lost the time, re-derive it.
 */
function normalizeWithTimePreservation(
  rawDt: string | null | undefined,
  parseIssues: ParseIssue[],
  fieldPath: string,
  bookingType: string,
): { datetime: string | null; rawTime: string | null } {
  const rawTime = extractRawTimeToken(rawDt) || null;
  let normalized = normalizeDatetime(rawDt);

  // If we extracted a raw time but normalization lost it, try to re-derive
  if (rawTime && normalized && !normalized.includes('T')) {
    const derived = tryDeriveIsoTime(rawTime);
    if (derived) {
      normalized = `${normalized}T${derived}:00`;
    } else {
      parseIssues.push({
        issueType: 'TIME_DERIVATION_FAILED',
        entityType: bookingType || 'other',
        missingFields: [],
        actionHint: `Could not parse time "${rawTime}". The raw time is preserved for display.`,
        rawValue: rawTime,
        fieldPath,
      });
    }
  }

  return { datetime: normalized, rawTime };
}

/**
 * v4.5.0: Build CanonicalBooking[] from parsed AI output.
 * If flight_legs[] is present, each leg becomes its own CanonicalBooking.
 * Otherwise, a single booking is created (backward compatible).
 */
function buildCanonicalBookings(
  parsed: Record<string, unknown>,
): { bookings: CanonicalBooking[]; parseIssues: ParseIssue[] } {
  const parseIssues: ParseIssue[] = [...(parsed._parse_issues as ParseIssue[] || [])];
  const isDeclined = parsed.is_payment_declined === true || parsed._payment_declined === true;
  const parsedCost = isDeclined ? null : (typeof parsed.total_cost === 'number' ? parsed.total_cost : null);
  const parsedCurrency = (parsed.currency_code as string) || (parsed._extracted_currency as string) || null;
  const bookingType = (parsed.booking_type as string) || 'other';

  // ── v4.5.0: MULTI-LEG FLIGHT PATH ─────────────────────────
  const flightLegs = parsed.flight_legs as Array<Record<string, unknown>> | undefined;
  
  if (bookingType === 'flight' && Array.isArray(flightLegs) && flightLegs.length > 0) {
    const bookings: CanonicalBooking[] = [];

    for (let i = 0; i < flightLegs.length; i++) {
      const leg = flightLegs[i];
      const legIssues: ParseIssue[] = [];

      const startResult = normalizeWithTimePreservation(
        (leg.start_datetime as string) || null,
        legIssues, 'start_datetime', 'flight',
      );
      const endResult = normalizeWithTimePreservation(
        (leg.end_datetime as string) || null,
        legIssues, 'end_datetime', 'flight',
      );

      // Sanitize IATA codes
      const IATA_RE = /^[A-Z]{3}$/i;
      let depCode = (leg.departure_airport_code as string) || null;
      let arrCode = (leg.arrival_airport_code as string) || null;
      if (depCode && !IATA_RE.test(depCode.trim())) depCode = null;
      else if (depCode) depCode = depCode.trim().toUpperCase();
      if (arrCode && !IATA_RE.test(arrCode.trim())) arrCode = null;
      else if (arrCode) arrCode = arrCode.trim().toUpperCase();

      const cb: CanonicalBooking = {
        booking_type: 'flight',
        vendor_name: (leg.vendor_name as string) || (parsed.vendor_name as string) || 'Unknown',
        start_datetime: startResult.datetime,
        end_datetime: endResult.datetime,
        confirmation_number: (leg.confirmation_number as string) || (parsed.confirmation_number as string) || null,
        departure_airport_code: depCode,
        arrival_airport_code: arrCode,
        airline: (leg.airline as string) || (parsed.airline as string) || null,
        passenger_name: (leg.passenger_name as string) || (parsed.passenger_name as string) || null,
        flight_number: (leg.flight_number as string) || null,
        // Cost: assign full fare to FIRST leg only
        total_cost: i === 0 ? parsedCost : null,
        currency_code: i === 0 ? parsedCurrency : null,
        from_location: (leg.from_location as string) || null,
        to_location: (leg.to_location as string) || null,
        _source: 'clipboard',
        _doc_classification: parsed._doc_classification as string || null,
        _parse_issues: legIssues.length > 0 ? legIssues : undefined,
      };

      if (isDeclined) {
        cb._parse_issues = [...(cb._parse_issues || []), {
          issueType: 'PAYMENT_DECLINED', entityType: 'flight',
          missingFields: [], actionHint: 'Payment was declined or cancelled.',
        }];
        cb._doc_classification = 'CHANGE_OR_CANCEL';
      }

      bookings.push(cb);
    }

    parseIssues.push(...bookings.flatMap(b => (b._parse_issues as ParseIssue[]) || []));
    return { bookings, parseIssues };
  }

  // ── SINGLE-BOOKING PATH (backward compatible) ──────────────
  const startResult = normalizeWithTimePreservation(
    parsed.start_datetime as string, parseIssues, 'start_datetime', bookingType,
  );
  const endResult = normalizeWithTimePreservation(
    parsed.end_datetime as string, parseIssues, 'end_datetime', bookingType,
  );

  // Update parsed with normalized values for downstream classification
  parsed.start_datetime = startResult.datetime;
  parsed.end_datetime = endResult.datetime;
  parsed.rawStartTimeText = startResult.rawTime;
  parsed.rawEndTimeText = endResult.rawTime;

  const cb: CanonicalBooking = {
    booking_type: (bookingType as CanonicalBooking['booking_type']) || 'other',
    vendor_name: (parsed.vendor_name as string) || 'Unknown',
    start_datetime: startResult.datetime,
    end_datetime: endResult.datetime,
    confirmation_number: (parsed.confirmation_number as string) || null,
    departure_airport_code: (parsed.departure_airport_code as string) || null,
    arrival_airport_code: (parsed.arrival_airport_code as string) || null,
    airline: (parsed.airline as string) || null,
    passenger_name: (parsed.passenger_name as string) || null,
    property_name: (parsed.property_name as string) || null,
    stay_type: (parsed.stay_type as CanonicalBooking['stay_type']) || null,
    rental_company: (parsed.rental_company as string) || null,
    pickup_location: (parsed.pickup_location as string) || null,
    return_location: (parsed.return_location as string) || null,
    parking_type: (parsed.parking_type as CanonicalBooking['parking_type']) || null,
    address: (parsed.address as string) || null,
    from_location: (parsed.from_location as string) || null,
    to_location: (parsed.to_location as string) || null,
    total_cost: parsedCost,
    currency_code: parsedCurrency,
    _source: 'clipboard',
    _doc_classification: (parsed._doc_classification as string) || null,
    _parse_issues: parseIssues.length > 0 ? parseIssues : undefined,
  };

  if (isDeclined) {
    cb._parse_issues = [...(cb._parse_issues || []), {
      issueType: 'PAYMENT_DECLINED', entityType: bookingType,
      missingFields: [], actionHint: 'Payment was declined or cancelled.',
    }];
    cb._doc_classification = 'CHANGE_OR_CANCEL';
  }

  return { bookings: [cb], parseIssues };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ 
        success: false, data: {}, message: "Please sign in to use this feature." 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth validation failed:", authError?.message);
      return new Response(JSON.stringify({ 
        success: false, data: {}, message: "Your session has expired. Please sign in again." 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let text: string;
    let type: string;
    
    try {
      const body = await req.json();
      text = body.text;
      type = body.type;
    } catch {
      return new Response(JSON.stringify({ 
        success: false, data: {}, message: "Invalid request format. Please try again." 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(JSON.stringify({ 
        success: false, data: {}, message: "No text provided to parse. Please paste or drop a booking confirmation." 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── v3.9.25: Normalize text for parsing (collapse blank lines, strip invisible chars) ──
    // This is parse-time only — the original raw text is NOT modified for storage.
    const normalizedText = normalizeForParsing(text);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ 
        success: false, data: {}, message: "AI parsing is temporarily unavailable. Please enter details manually." 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = type === 'receipt' 
      ? `You are an expense receipt parser for travel expense tracking. Extract and categorize items from the receipt.

IMPORTANT: Identify specific items for detailed reporting. For example:
- Wine, beer, cocktails, spirits → sub_category: "alcohol"
- Soda, juice, water, tea → sub_category: "beverages"  
- Breakfast items, eggs, pancakes → sub_category: "breakfast"
- Lunch/dinner meals → sub_category: "lunch" or "dinner" based on time
- Grocery store items → sub_category: "groceries"
- Coffee, espresso, lattes → sub_category: "coffee"
- Rental car charges → sub_category: "rental_car"

Extract:
- date (YYYY-MM-DD format)
- category (meals, transport, activity, shopping, parking, other)
- sub_category (breakfast, lunch, dinner, snacks, coffee, groceries, alcohol, beverages, uber, taxi, gas, tolls, public_transit, parking_expense, rental_car, tours, entertainment, tickets, sports, souvenirs, clothing, gifts, tips, fees, insurance, miscellaneous)
- description (brief description of the main item or vendor)
- amount (total number only)
- vendor_name

Return a JSON object with these fields. Use null for any fields you cannot determine.
Be precise with sub_category for future reporting (e.g., tracking alcohol spend across trips).`
: `You are a travel booking confirmation parser. Your job is to determine if a document is:
1. A FULL BOOKING CONFIRMATION with service dates (flight times, check-in/out dates, pickup/dropoff times), OR
2. A RECEIPT ONLY (payment record) without service dates
3. A CHANGE/CANCELLATION notice

CRITICAL DISTINCTION:
- BOOKING CONFIRMATION: Contains actual service dates like departure/arrival times, check-in/check-out dates, pickup/dropoff times, parking entry/exit times
- RECEIPT ONLY: Contains only payment info (amount, vendor, card details, transaction date) but NO service dates
- CHANGE/CANCELLATION: Contains cancellation notice, refund info, or schedule change details

First, determine which type this is by setting:
- is_receipt_only: true if this is just a payment receipt WITHOUT service dates
- is_receipt_only: false if this contains actual service dates (flight times, check-in/out, pickup/dropoff, etc.)

BOOKING TYPE CLASSIFICATION (v2.1.17):
- flight: Airline tickets, boarding passes, flight confirmations
- stay: Hotels, Airbnb, VRBO, vacation rentals
- car_rental: Rental cars (Hertz, Avis, Enterprise, Alamo, etc.)
- parking: Parking services (SpotHero, WallyPark, ParkWhiz, The Parking Spot, PreFlight, airport parking, garage parking, lot parking) - NOT "activity"
- activity: Tours, excursions, permits, event tickets, admission tickets, attraction reservations
  - Signals: "tour", "excursion", "permit", "entry ticket", "admission", "event ticket", "reservation for [tour/attraction]", "guided", "experience"
- transport: Train, bus, ferry tickets

For ACTIVITY bookings, also extract:
- activity_name (name of the tour/attraction/event)
- provider_name (company running the tour/issuing the permit)
- is_ticket_or_permit: true if this is an entry ticket or permit type booking

CRITICAL v2.0.6 - STRICT DATETIME INTEGRITY:
- ONLY extract times that are EXPLICITLY stated in the document
- If a document shows a date but NO explicit time, set the time to null
- DO NOT infer, guess, or default times to midnight, morning, or any placeholder
- For start_datetime and end_datetime: if no explicit time exists, use date-only format (YYYY-MM-DD) NOT a datetime with 00:00:00
- Examples of EXPLICIT times: "Departs 6:00 AM", "Check-in 3:00 PM", "Pickup at 10:30 AM", "23:05", "14:30"
- Examples of NON-EXPLICIT times: "Check-in after 3 PM", "Checkout by 11 AM", "Arrives evening", no time mentioned
- Both 12-hour (6:00 AM, 11:10 PM) and 24-hour (23:05, 14:30) formats are valid explicit times — extract them as-is

CRITICAL v3.9.33 - SEGMENT-ONLY DATES FOR FLIGHTS:
- For each flight leg, the start_datetime and end_datetime MUST come from that leg's ITINERARY SEGMENT (the row showing origin, destination, date, and time)
- NEVER use dates from ticket metadata sections like "Ticketed on", "Issued on", "Issue date", "Booking date", "Date of issue", "Purchase date", "Date of booking", "Transaction date"
- Each leg has its own departure date and arrival date — extract from the segment line for THAT specific leg
- If a return leg departs on March 26, use March 26 — do NOT use the ticket issue date (e.g., March 12)

For RECEIPT ONLY documents (is_receipt_only: true), extract:
- vendor_name
- total_cost: The SINGLE PAYMENT/TRANSACTION total shown on the receipt (e.g., "Payment Total USD 924.00"). Use the exact amount from ONE payment line. Do NOT sum per-passenger fares, per-ticket prices, or fare breakdowns across travelers. If a receipt shows "Payment Total USD 924.00" for 2 passengers, total_cost is 924.00 — NOT 1848.00.
- receipt_date (payment/transaction date in YYYY-MM-DD format)
- Set booking_type based on context if determinable (flight, stay, car_rental, parking, activity, other)
- start_datetime: use date-only if no explicit time
- end_datetime: same rules
- confirmation_number
- address

CRITICAL AIRFARE COST RULES (v4.5.0):
- For multi-leg/round-trip flights: Use the "flight_legs" array to return EACH LEG as a separate entry
- Each leg must have its own departure_airport_code, arrival_airport_code, start_datetime, end_datetime, flight_number
- total_cost: assign the SINGLE PAYMENT TOTAL to the top-level field only (first leg gets it). This is the amount from the "Payment Total" or "Amount Charged" line — NOT the sum of per-passenger fares.
- The confirmation_number (PNR) may be the same across legs — that is expected
- Example: ATL→LHR and LHR→LIN should be TWO separate entries in flight_legs[]
- NEVER collapse multiple legs into a single record — use flight_legs for EVERY leg

CRITICAL v5.2.0 - CARRIER COST FORMAT EXAMPLES:
- Ryanair: "Total price of your trip purchased via PayPal ending in: 0000\t262.40 USD" → total_cost=262.40, currency_code="USD"
- Wizz Air: "Grand total \t \t146.44  EUR" (payment summary section) → total_cost=146.44, currency_code="EUR"
  - Wizz Air also shows "Payment in selected currency" (e.g. "196.32 USD") — prefer the BASE amount in EUR from "Grand total" or "Base Amount and currency" column
- British Airways: "Payment Total USD 924.00" → total_cost=924.00, currency_code="USD"
- Generic: Look for "Grand Total", "Total Paid", "Amount Charged", "Payment Total" — extract the EXACT number shown
- ALWAYS extract currency_code alongside total_cost. If the cost shows "EUR", set currency_code="EUR". If "$" or "USD", set currency_code="USD".

CRITICAL v4.5.0 - MULTI-LEG FLIGHTS:
- When you detect a multi-leg itinerary (round-trip, multi-city, connecting flights):
  - Set booking_type to "flight"
  - Populate the "flight_legs" array with one entry PER LEG
  - Each leg entry must contain: flight_number, departure_airport_code, arrival_airport_code, start_datetime (departure), end_datetime (arrival)
  - Times MUST be in ISO format: YYYY-MM-DDTHH:mm:00 using 24-hour clock
  - Do NOT set top-level start_datetime/end_datetime for multi-leg flights (use flight_legs instead)
- For single-leg flights: still use top-level start_datetime/end_datetime (no flight_legs needed)

For flights also extract:
- airline
- passenger_name: Extract ALL passenger names listed in the booking, comma-separated. Example: "Paula Li Sanchez, Edward Hemmer, Erika Li Sanchez". NEVER return only one passenger if multiple are listed. Check ALL passenger sections, tables, and lists in the document.
- departure_airport_code (3-letter IATA code)
- arrival_airport_code (3-letter IATA code)

CRITICAL FOR STAYS - DATE VALIDATION:
- start_datetime MUST be the actual CHECK-IN DATE
- end_datetime MUST be the actual CHECK-OUT DATE
- NEVER USE reservation/payment/email dates for stay dates
- If you cannot find explicit check-in AND check-out dates, set is_receipt_only to true

For stays also extract:
- property_name
- stay_type (hotel, airbnb, vrbo, other)

For car rentals also extract:
- rental_company
- pickup_location
- return_location

For parking also extract:
- parking_type (airport, hotel, city_garage, beach, other)
- address (facility address)

Return a JSON object with these fields. Use null for any fields you cannot determine. Never return the string "null" - use actual null or omit the field.`;

    let response;
    try {
      response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: normalizedText },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: type === 'receipt' ? "extract_receipt" : "extract_booking",
                description: type === 'receipt' ? "Extract expense details from receipt" : "Extract booking details from confirmation",
                parameters: type === 'receipt' ? {
                  type: "object",
                  properties: {
                    date: { type: "string", description: "Date in YYYY-MM-DD format" },
                    category: { type: "string", enum: ["meals", "transport", "activity", "shopping", "parking", "other"] },
                    sub_category: { 
                      type: "string", 
                      enum: ["breakfast", "lunch", "dinner", "snacks", "coffee", "groceries", "alcohol", "beverages", "uber", "taxi", "gas", "tolls", "public_transit", "parking_expense", "rental_car", "tours", "entertainment", "tickets", "sports", "souvenirs", "clothing", "gifts", "tips", "fees", "insurance", "miscellaneous"],
                    },
                    description: { type: "string" },
                    amount: { type: "number" },
                    vendor_name: { type: "string" },
                  },
                  required: ["date", "category", "amount", "sub_category"],
                } : {
                  type: "object",
                  properties: {
                    is_receipt_only: { type: "boolean", description: "True if this is a payment receipt without service dates" },
                    booking_type: { type: "string", enum: ["flight", "stay", "car_rental", "activity", "parking", "transport", "other"] },
                    vendor_name: { type: "string" },
                    start_datetime: { type: "string", description: "ISO datetime (YYYY-MM-DDTHH:mm:00) for single-leg bookings. Omit for multi-leg flights." },
                    end_datetime: { type: "string", description: "ISO datetime for single-leg bookings. Omit for multi-leg flights." },
                    receipt_date: { type: "string", description: "For receipts only: payment date in YYYY-MM-DD" },
                    confirmation_number: { type: "string" },
                    total_cost: { type: "number", description: "Single payment/transaction total from the receipt. Do NOT sum per-passenger fares. For Wizz Air use 'Grand total' EUR amount, for Ryanair use the amount on the 'Total price' line." },
                    currency_code: { type: "string", description: "ISO 4217 currency code for the total_cost (e.g. USD, EUR, GBP). Extract from the payment line." },
                    address: { type: "string" },
                    airline: { type: "string" },
                    passenger_name: { type: "string", description: "ALL passenger names, comma-separated. E.g. 'Paula Li Sanchez, Edward Hemmer'. Extract EVERY passenger listed." },
                    property_name: { type: "string" },
                    stay_type: { type: "string", enum: ["hotel", "airbnb", "vrbo", "other"] },
                    rental_company: { type: "string" },
                    pickup_location: { type: "string" },
                    return_location: { type: "string" },
                    parking_type: { type: "string", enum: ["airport", "hotel", "city_garage", "beach", "other"] },
                    notes: { type: "string" },
                    departure_airport_code: { type: "string", description: "3-letter IATA code for departure airport (single-leg only)" },
                    arrival_airport_code: { type: "string", description: "3-letter IATA code for arrival airport (single-leg only)" },
                    activity_name: { type: "string" },
                    provider_name: { type: "string" },
                    is_ticket_or_permit: { type: "boolean" },
                    location_summary: { type: "string" },
                    // v4.5.0: Multi-leg flight support
                    flight_legs: {
                      type: "array",
                      description: "For multi-leg flights: one entry per flight leg with its own airports, times, and flight number. Use this for round-trips, multi-city, and connecting flights.",
                      items: {
                        type: "object",
                        properties: {
                          flight_number: { type: "string", description: "Flight number e.g. BA0226" },
                          departure_airport_code: { type: "string", description: "3-letter IATA departure code" },
                          arrival_airport_code: { type: "string", description: "3-letter IATA arrival code" },
                          start_datetime: { type: "string", description: "Departure datetime in YYYY-MM-DDTHH:mm:00 format (24h clock)" },
                          end_datetime: { type: "string", description: "Arrival datetime in YYYY-MM-DDTHH:mm:00 format (24h clock)" },
                          airline: { type: "string" },
                          from_location: { type: "string", description: "Departure airport/city name" },
                          to_location: { type: "string", description: "Arrival airport/city name" },
                          vendor_name: { type: "string" },
                        },
                        required: ["departure_airport_code", "arrival_airport_code", "start_datetime", "end_datetime"],
                      },
                    },
                  },
                  required: ["is_receipt_only", "vendor_name"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: type === 'receipt' ? "extract_receipt" : "extract_booking" } },
        }),
      });
    } catch (fetchError) {
      console.error("AI gateway fetch error:", fetchError);
      return new Response(JSON.stringify({ 
        success: false, data: {}, message: "Unable to connect to AI service. Please try again or enter details manually." 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      let userMessage = "We couldn't fully parse this confirmation. Please review and complete the details manually.";
      if (response.status === 429) userMessage = "AI service is busy. Please wait a moment and try again.";
      else if (response.status === 402) userMessage = "AI parsing limit reached. Please enter details manually.";
      
      return new Response(JSON.stringify({ 
        success: false, data: {}, message: userMessage 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let data;
    try {
      data = await response.json();
    } catch {
      console.error("Failed to parse AI response JSON");
      return new Response(JSON.stringify({ 
        success: false, data: {}, message: "Received an invalid response from AI. Please enter details manually." 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        
        // Clean up "null" strings to actual null values
        cleanNullStrings(parsed);
        
        // Sanitize top-level airport codes (for single-leg flights)
        const IATA_RE = /^[A-Z]{3}$/i;
        if (parsed.departure_airport_code && !IATA_RE.test(parsed.departure_airport_code.trim())) {
          parsed.departure_airport_code = null;
        } else if (parsed.departure_airport_code) {
          parsed.departure_airport_code = parsed.departure_airport_code.trim().toUpperCase();
        }
        if (parsed.arrival_airport_code && !IATA_RE.test(parsed.arrival_airport_code.trim())) {
          parsed.arrival_airport_code = null;
        } else if (parsed.arrival_airport_code) {
          parsed.arrival_airport_code = parsed.arrival_airport_code.trim().toUpperCase();
        }
        
        // ── v4.5.0: BUILD CANONICAL IMPORT BATCH via multi-leg aware builder ──
        const { bookings: canonicalBookings, parseIssues } = buildCanonicalBookings(parsed);
        
        if (parseIssues.length > 0) {
          parsed._parse_issues = [...(parsed._parse_issues || []), ...parseIssues];
        }

        const tripDates = deriveTripDatesFromBookings(canonicalBookings);
        const canonicalBatch: CanonicalImportBatch = {
          trip: { start_date: tripDates.start_date, end_date: tripDates.end_date },
          bookings: canonicalBookings,
        };

        // ── v4.2.0: CANONICAL CLASSIFICATION ────────────────────────
        const entityType = parsed.booking_type as string || 'other';
        const hasDates = hasServiceDates(parsed) || canonicalBookings.some(b => b.start_datetime != null);
        const docClass: DocClassification = classifyDocument(parsed, hasDates);
        
        // Stamp classification on parsed data
        parsed._doc_classification = docClass;
        
        // ── RECEIPT PATH ─────────────────────────────────────────────
        if (docClass === 'RECEIPT') {
          parsed._is_receipt_only = true;
          const entityLabel = ENTITY_TYPE_LABELS[entityType] || 'Booking';
          
          for (const cb of canonicalBookings) cb._doc_classification = 'RECEIPT';
          return new Response(JSON.stringify({ 
            success: true, 
            data: parsed,
            canonical_import: canonicalBatch,
            is_receipt_only: true,
            doc_classification: 'RECEIPT',
            message: `This appears to be a ${entityLabel.toLowerCase()} receipt without service dates. An expense will be created instead.`
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        // ── CONFIRMATION PATH ────────────────────────────────────────
        if (docClass === 'CONFIRMATION' || docClass === 'UNKNOWN') {
          // Enforce required fields for this entity type
          const issue = enforceRequiredFields(parsed, entityType);
          
          if (issue) {
            parsed._parse_issues = [issue];
            const entityLabel = ENTITY_TYPE_LABELS[entityType] || 'Booking';
            
            return new Response(JSON.stringify({ 
              success: true, 
              data: parsed,
              canonical_import: canonicalBatch,
              is_receipt_only: false,
              doc_classification: docClass,
              has_issues: true,
              missing_fields: issue.missingFields,
              message: `${entityLabel} confirmation parsed, but missing: ${issue.missingFields.map(f => f.replace(/_/g, ' ')).join(', ')}. Please complete these fields manually.`
            }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          
          // All required fields present — clean confirmation
          const legCount = canonicalBookings.length;
          const legMsg = legCount > 1 ? ` (${legCount} flight legs detected)` : '';
          return new Response(JSON.stringify({ 
            success: true, 
            data: parsed,
            canonical_import: canonicalBatch,
            is_receipt_only: false,
            doc_classification: docClass,
            message: `Successfully parsed booking details.${legMsg}`
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        // ── CHANGE/CANCEL PATH ───────────────────────────────────────
        if (docClass === 'CHANGE_OR_CANCEL') {
          return new Response(JSON.stringify({ 
            success: true, 
            data: parsed,
            canonical_import: canonicalBatch,
            is_receipt_only: false,
            doc_classification: 'CHANGE_OR_CANCEL',
            message: "This appears to be a change or cancellation notice. Please review your existing bookings."
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        // Fallback
        return new Response(JSON.stringify({ 
          success: true, data: parsed, canonical_import: canonicalBatch, is_receipt_only: false, doc_classification: 'UNKNOWN',
          message: "Successfully parsed booking details."
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        
      } catch {
        console.error("Failed to parse tool call arguments");
        return new Response(JSON.stringify({ 
          success: false, data: {}, message: "AI returned incomplete data. Please review and complete the details manually." 
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response(JSON.stringify({ 
      success: false, data: {}, message: "We couldn't extract details from this text. Please enter the information manually." 
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Parse booking error:", error);
    return new Response(JSON.stringify({ 
      success: false, data: {}, message: "An unexpected error occurred. Please enter details manually." 
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
