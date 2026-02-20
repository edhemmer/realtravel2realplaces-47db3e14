/**
 * v4.3.0: Parse Itinerary Edge Function
 * 
 * MULTI-LEG PRESERVATION:
 * - Each flight leg is returned as a SEPARATE booking record
 * - Deduplication uses segment-level identity (not PNR alone)
 * - All legs persist independently in the timeline
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Uses shared datetime-utils for pre-compiled regex and short-circuit evaluations
 * - Batch datetime normalization for booking arrays
 * - Reduced redundant parsing operations
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { 
  normalizeDatetime, 
  normalizeBatchDatetimes,
  extractDatePortion,
  cleanNullStrings,
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
import { deriveTripDatesFromBookings, type CanonicalBooking } from "../_shared/import-contract.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    
    try {
      const body = await req.json();
      text = body.text;
    } catch {
      return new Response(JSON.stringify({ 
        success: false, data: {}, message: "Invalid request format. Please try again." 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(JSON.stringify({ 
        success: false, data: {}, message: "No text provided to parse. Please paste or drop an itinerary." 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ 
        success: false, data: {}, message: "AI parsing is temporarily unavailable. Please enter details manually." 
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = `You are a travel itinerary and booking confirmation parser. Your job is to extract TRIP-LEVEL information from booking confirmations, itineraries, or travel documents.

CRITICAL v4.4.1 - MULTI-SEGMENT FLIGHT PRESERVATION:
- For round-trip or multi-city flights: create a SEPARATE booking record for EACH LEG
- Each leg must have its own departure_airport_code, arrival_airport_code, start_datetime, and end_datetime
- The confirmation_number (PNR) may be the same across legs — that is expected
- Example: DEN→LAX and LAX→DEN should be TWO separate flight bookings
- For total_cost: assign the FULL fare to the FIRST leg only, set other legs to null
- NEVER collapse multiple legs into a single booking record
- CRITICAL: Scan the ENTIRE itinerary section for ALL flight segments. Do NOT stop after 2 legs.
- Multi-segment itineraries (e.g. 4 legs: outbound connecting + return connecting) are common.
- Each flight header block (identified by a flight number pattern like BA0226, AA1234, etc.) is a SEPARATE leg.
- Continue scanning past ALL text sections until no more flight segments remain.
- Do NOT stop scanning when you encounter "Extra baggage", "Payment Information", "Taxes", or "Terms".
- There is NO maximum number of flight legs. Extract every single one.

CRITICAL - UNIVERSAL FLIGHT SEGMENT EXTRACTION (applies to ALL airlines, all formats):
- Every flight segment contains BOTH a departure block AND an arrival block with date+time+airport info.
- These may be laid out as:
  * Paired rows (departure on one line/side, arrival on the next line/side)
  * Table columns (Depart | Arrive)
  * Labeled fields ("Departing: ... Arriving: ...")
  * Side-by-side blocks in e-ticket receipts
- ALWAYS extract BOTH start_datetime (departure) AND end_datetime (arrival) for EVERY flight leg.
- The departure date+time is the FIRST date+time associated with the segment.
- The arrival date+time is the SECOND date+time associated with the segment.
- The arrival date MAY differ from departure (overnight/red-eye flights). Do NOT assume same-day.
- NEVER leave end_datetime empty or null for flights. If arrival info exists anywhere in the segment block, extract it.
- NEVER default times to 00:00 — if a time is shown (e.g., 23:10, 11:15, 2:30 PM), use it exactly.
- Examples of correct extraction:
  * "11 Mar 2026 23:10 ATL → 12 Mar 2026 11:15 LHR"
    → start_datetime="2026-03-11T23:10:00", end_datetime="2026-03-12T11:15:00"
  * "Departs: 03/26/2026 12:40 PM  Arrives: 03/26/2026 1:45 PM"
    → start_datetime="2026-03-26T12:40:00", end_datetime="2026-03-26T13:45:00"
  * "Jun 15 08:00 JFK | Jun 15 20:30 CDG"
    → start_datetime="2025-06-15T08:00:00", end_datetime="2025-06-15T20:30:00"

CRITICAL - GLOBAL DATETIME INTEGRITY RULES:
1. DATES ARE ABSOLUTE AUTHORITY
   - Extract dates EXACTLY as they appear in the confirmation
   - NEVER add or subtract days
   - NEVER apply timezone conversions that change the calendar date

2. TIMES ARE EXPLICIT ONLY
   - Only extract times that are EXPLICITLY stated (e.g., "Departs 6:00 PM", "Check-in 3:00 PM", "23:05", "14:30")
   - Both 12-hour (6:00 AM, 11:10 PM) and 24-hour (23:05, 14:30) formats are valid explicit times
   - If no explicit time is shown, leave time portion empty - use date-only format (YYYY-MM-DD)
   - NEVER infer or guess times
   - NEVER default to midnight (00:00) when time is unknown

3. FORMAT RULES
   - If EXPLICIT time exists: use ISO 8601 format (e.g., "2026-01-30T18:13:00" or "2026-01-30T23:05:00")
   - If NO explicit time: use date-only format (e.g., "2026-01-30")
   - For trips: start_date and end_date are always date-only (YYYY-MM-DD)

4. SEGMENT-ONLY DATES FOR FLIGHTS (v3.9.33)
   - For each flight leg, start_datetime and end_datetime MUST come from that leg's ITINERARY SEGMENT (the row showing origin, destination, date, and time)
   - NEVER use dates from ticket metadata: "Ticketed on", "Issued on", "Issue date", "Booking date", "Date of issue", "Purchase date", "Transaction date"
   - Each leg has its own departure date — extract from the segment line for THAT specific leg
   - If a return leg departs on March 26, use March 26 — do NOT use the ticket issue date

Extract the following TRIP information:
- trip_name: A descriptive name for the trip (e.g., "Orlando Family Vacation", "NYC Business Trip")
- destination_city: The main destination city
- destination_state: State/province if applicable (especially for US locations)
- destination_country: The destination country
- start_date: The earliest date found (departure date, check-in date, etc.) in YYYY-MM-DD format
- end_date: The latest date found (return date, check-out date, etc.) in YYYY-MM-DD format
- trip_type: Infer from context - "business" if work-related, "personal" for vacation/leisure, "mixed" if unclear

Also extract ALL BOOKINGS found in the document as an array. Each booking should include:
- booking_type: "flight", "stay", "car_rental", "activity", "parking", "transport"
- vendor_name: The company name (airline, hotel, rental company, etc.)
- start_datetime: With explicit time: ISO 8601 format (YYYY-MM-DDTHH:mm:ss); Without explicit time: date-only (YYYY-MM-DD)
- end_datetime: Same format rules as start_datetime. For flights this is the ARRIVAL date+time — MUST be extracted from the arrival block of each flight segment. NEVER omit for flights.
- confirmation_number: If present (PNR for flights)
- total_cost: Number only (for multi-leg flights: full fare on first leg, null on others)
- address: If applicable
- departure_airport_code: 3-letter IATA code (flights only). If unknown, set null.
- arrival_airport_code: 3-letter IATA code (flights only). If unknown, set null.
- departure_airport_name: Full airport name as written in the confirmation (e.g., "London Heathrow", "Milan Malpensa"). ALWAYS extract this even if IATA code is known.
- arrival_airport_name: Full airport name as written in the confirmation. ALWAYS extract this even if IATA code is known.
- from_location: Origin city or location name (e.g., "London", "Atlanta"). Extract for all booking types.
- to_location: Destination city or location name (e.g., "Milan", "New York"). Extract for all booking types.

For flights also extract:
- airline
- passenger_name
- flight_number: The airline flight number (e.g., "BA0226", "AA1234")

For stays also extract:
- property_name
- stay_type: "hotel", "airbnb", "vrbo", or "other"

For car rentals also extract:
- rental_company
- pickup_location
- return_location

For parking also extract:
- parking_type: "airport", "hotel", "city_garage", "beach", "other"

Return a JSON object with trip info and an array of bookings. Use null for any fields you cannot determine.
IMPORTANT: Each flight leg MUST be a separate booking in the array.
IMPORTANT: For flights, ALWAYS populate departure_airport_name and arrival_airport_name with the full airport name text from the confirmation, even when IATA codes are also available.
IMPORTANT: Count ALL flight header blocks in the itinerary. If there are 4 flight segments, return exactly 4 flight bookings.`;

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
            { role: "user", content: text },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_itinerary",
                description: "Extract trip details and all bookings from travel documents. Each flight leg must be a separate booking.",
                parameters: {
                  type: "object",
                  properties: {
                    trip: {
                      type: "object",
                      properties: {
                        trip_name: { type: "string", description: "Descriptive trip name" },
                        destination_city: { type: "string" },
                        destination_state: { type: "string" },
                        destination_country: { type: "string" },
                        start_date: { type: "string", description: "YYYY-MM-DD format" },
                        end_date: { type: "string", description: "YYYY-MM-DD format" },
                        trip_type: { type: "string", enum: ["business", "personal", "mixed"] },
                      },
                      required: ["trip_name", "destination_city", "destination_country", "start_date", "end_date"],
                    },
                    bookings: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          booking_type: { type: "string", enum: ["flight", "stay", "car_rental", "activity", "parking", "transport"] },
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
                          notes: { type: "string" },
                          departure_airport_code: { type: "string", description: "3-letter IATA code for departure airport. Null if unknown." },
                          arrival_airport_code: { type: "string", description: "3-letter IATA code for arrival airport. Null if unknown." },
                          departure_airport_name: { type: "string", description: "Full departure airport name as written in confirmation (e.g., London Heathrow)" },
                          arrival_airport_name: { type: "string", description: "Full arrival airport name as written in confirmation (e.g., Milan Malpensa)" },
                          from_location: { type: "string", description: "Origin city or location name" },
                          to_location: { type: "string", description: "Destination city or location name" },
                          flight_number: { type: "string", description: "Airline flight number (e.g., BA0226, AA1234)" },
                          location_summary: { type: "string" },
                        },
                        required: ["booking_type", "vendor_name", "start_datetime"],
                      },
                    },
                  },
                  required: ["trip", "bookings"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "extract_itinerary" } },
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
      
      let userMessage = "We couldn't fully parse this itinerary. Please review and complete the details manually.";
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
        
        // Normalize trip dates (always date-only)
        if (parsed.trip?.start_date) {
          parsed.trip.start_date = extractDatePortion(parsed.trip.start_date);
        }
        if (parsed.trip?.end_date) {
          parsed.trip.end_date = extractDatePortion(parsed.trip.end_date);
        }
        
        // Batch normalize booking datetimes
        if (Array.isArray(parsed.bookings)) {
          // v4.4.0: Extract raw time tokens BEFORE batch normalization
          for (const booking of parsed.bookings) {
            booking.rawStartTimeText = extractRawTimeToken(booking.start_datetime) || null;
            booking.rawEndTimeText = extractRawTimeToken(booking.end_datetime) || null;
            booking.rawStartDateText = booking.start_datetime ? String(booking.start_datetime).substring(0, 10) : null;
            booking.rawEndDateText = booking.end_datetime ? String(booking.end_datetime).substring(0, 10) : null;
          }
          
          parsed.bookings = normalizeBatchDatetimes(
            parsed.bookings,
            ['start_datetime', 'end_datetime']
          );
          
          // Clean null strings and sanitize IATA codes on each booking
          const IATA_RE = /^[A-Z]{3}$/i;
          for (const booking of parsed.bookings) {
            cleanNullStrings(booking);
            if (booking.departure_airport_code && !IATA_RE.test(String(booking.departure_airport_code).trim())) {
              booking.departure_airport_code = null;
            } else if (booking.departure_airport_code) {
              booking.departure_airport_code = String(booking.departure_airport_code).trim().toUpperCase();
            }
            if (booking.arrival_airport_code && !IATA_RE.test(String(booking.arrival_airport_code).trim())) {
              booking.arrival_airport_code = null;
            } else if (booking.arrival_airport_code) {
              booking.arrival_airport_code = String(booking.arrival_airport_code).trim().toUpperCase();
            }
          }
          
          // v4.3.0: Multi-leg safe dedupe — do NOT collapse by PNR alone
          parsed.bookings = deduplicateBookings(parsed.bookings);
          
          // v4.3.0: Classify each booking and enforce required fields
          const validBookings: Record<string, unknown>[] = [];
          const parseIssues: ParseIssue[] = [];
          const receipts: Record<string, unknown>[] = [];
          
          for (const booking of parsed.bookings) {
            const entityType = (booking.booking_type as string) || 'other';
            const hasDates = !!(booking.start_datetime || booking.end_datetime);
            const docClass = classifyDocument(booking, hasDates);
            
            booking._doc_classification = docClass;
            
            // v4.4.0: Try to recover machine time from raw tokens after normalization
            const bookingIssues: ParseIssue[] = [];
            if (booking.rawStartTimeText && booking.start_datetime && !String(booking.start_datetime).includes('T')) {
              const derived = tryDeriveIsoTime(booking.rawStartTimeText as string);
              if (derived) {
                booking.start_datetime = `${booking.start_datetime}T${derived}:00`;
              } else {
                bookingIssues.push({
                  issueType: 'TIME_DERIVATION_FAILED',
                  entityType,
                  missingFields: [],
                  actionHint: `Could not parse time "${booking.rawStartTimeText}". The raw time is preserved for display.`,
                  rawValue: booking.rawStartTimeText as string,
                  fieldPath: 'start_datetime',
                });
              }
            }
            if (booking.rawEndTimeText && booking.end_datetime && !String(booking.end_datetime).includes('T')) {
              const derived = tryDeriveIsoTime(booking.rawEndTimeText as string);
              if (derived) {
                booking.end_datetime = `${booking.end_datetime}T${derived}:00`;
              } else {
                bookingIssues.push({
                  issueType: 'TIME_DERIVATION_FAILED',
                  entityType,
                  missingFields: [],
                  actionHint: `Could not parse time "${booking.rawEndTimeText}". The raw time is preserved for display.`,
                  rawValue: booking.rawEndTimeText as string,
                  fieldPath: 'end_datetime',
                });
              }
            }
            
            if (docClass === 'RECEIPT') {
              booking._is_receipt_only = true;
              receipts.push(booking);
            } else {
              const issue = enforceRequiredFields(booking, entityType);
              const allIssues = [...bookingIssues];
              if (issue) allIssues.push(issue);
              if (allIssues.length > 0) {
                booking._parse_issues = allIssues;
                parseIssues.push(...allIssues);
              }
              validBookings.push(booking);
            }
          }
          
          // Replace bookings with classified results (valid + receipts, all preserved)
          parsed.bookings = [...validBookings, ...receipts];
          
          // v3.10.1: Per-type batch summary
          const typeCounts: Record<string, number> = {};
          for (const b of validBookings) {
            if ((b._parse_issues as unknown[])?.length) continue;
            const bt = (b.booking_type as string) || 'other';
            typeCounts[bt] = (typeCounts[bt] || 0) + 1;
          }
          
          parsed._batch_summary = {
            valid_bookings: validBookings.filter(b => !(b._parse_issues as unknown[])?.length).length,
            receipts: receipts.length,
            needs_attention: parseIssues.length,
            total: parsed.bookings.length,
            by_type: typeCounts,
          };
        }
        
        // v4.4.1: Derive trip dates from canonical helper (service dates only, no receipts)
        if (Array.isArray(parsed.bookings) && parsed.bookings.length > 0) {
          const nonReceiptBookings = (parsed.bookings as CanonicalBooking[]).filter(
            (b) => !(b as any)._is_receipt_only
          );

          if (nonReceiptBookings.length > 0) {
            const { start_date, end_date } = deriveTripDatesFromBookings(nonReceiptBookings);
            if (start_date) parsed.trip.start_date = start_date;
            if (end_date) parsed.trip.end_date = end_date;
          }
        }
        
        const batchSummary = parsed._batch_summary || {};
        const byType = (batchSummary.by_type || {}) as Record<string, number>;
        const summaryParts: string[] = [];
        
        // v3.10.1: Per-type created counts
        const typeLabels: Record<string, string> = {
          flight: 'Flight', stay: 'Lodging', car_rental: 'Car Rental',
          transport: 'Transport', parking: 'Parking', activity: 'Activity',
        };
        for (const [t, count] of Object.entries(byType)) {
          const label = typeLabels[t] || t;
          summaryParts.push(`${count} ${label}${count > 1 ? 's' : ''}`);
        }
        if (batchSummary.receipts > 0) summaryParts.push(`${batchSummary.receipts} Receipt(s)`);
        if (batchSummary.needs_attention > 0) summaryParts.push(`${batchSummary.needs_attention} Need(s) Attention`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          data: parsed,
          batch_summary: batchSummary,
          message: summaryParts.length > 0
            ? `Created: ${summaryParts.join(', ')}.`
            : `Successfully parsed ${parsed.bookings?.length || 0} booking(s).`,
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
    console.error("Parse itinerary error:", error);
    return new Response(JSON.stringify({ 
      success: false, data: {}, message: "An unexpected error occurred. Please enter details manually." 
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// ============================================================================
// MULTI-LEG SAFE DEDUPE
// ============================================================================

/**
 * v3.10.1: Deterministic segment-level fingerprint dedupe.
 * Each entity type uses a specific composite key — never confirmation number alone.
 * 
 * Flight:  carrier + flight_number + departure_date + departure_time_raw + departure_airport
 * Lodging: property_name + check_in_date + check_out_date
 * Rental:  company + pickup_date + pickup_location
 * Other:   vendor + type + start_datetime
 */
function deduplicateBookings(bookings: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>();
  const result: Record<string, unknown>[] = [];
  
  for (const booking of bookings) {
    const segmentKey = buildSegmentFingerprint(booking);
    if (seen.has(segmentKey)) {
      console.log(`Deduplicate: skipping duplicate segment ${segmentKey}`);
      continue;
    }
    seen.add(segmentKey);
    result.push(booking);
  }
  
  return result;
}

/**
 * v3.10.1: Build deterministic fingerprint per entity type.
 * Never dedupes by confirmation number alone.
 */
function buildSegmentFingerprint(booking: Record<string, unknown>): string {
  const type = (booking.booking_type as string) || 'other';
  const startDt = (booking.start_datetime as string) || '';
  const startDate = startDt.substring(0, 10);
  const rawTime = (booking.rawStartTimeText as string) || '';
  
  if (type === 'flight') {
    const carrier = (booking.airline as string) || (booking.vendor_name as string) || '';
    const flightNum = (booking.flight_number as string) || '';
    const dep = (booking.departure_airport_code as string) || (booking.departure_airport_name as string) || (booking.from_location as string) || '';
    const arr = (booking.arrival_airport_code as string) || (booking.arrival_airport_name as string) || (booking.to_location as string) || '';
    return `flight::${carrier}::${flightNum}::${dep}::${arr}::${startDate}::${rawTime}`;
  }
  
  if (type === 'stay') {
    const property = (booking.property_name as string) || (booking.vendor_name as string) || '';
    const endDt = (booking.end_datetime as string) || '';
    const endDate = endDt.substring(0, 10);
    return `stay::${property}::${startDate}::${endDate}`;
  }
  
  if (type === 'car_rental') {
    const company = (booking.rental_company as string) || (booking.vendor_name as string) || '';
    const pickup = (booking.pickup_location as string) || '';
    return `car_rental::${company}::${startDate}::${pickup}`;
  }
  
  // Default: vendor + type + start_datetime
  const vendor = (booking.vendor_name as string) || '';
  return `${type}::${vendor}::${startDt}`;
}
