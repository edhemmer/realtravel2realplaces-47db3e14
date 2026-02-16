/**
 * v4.3.0: Parse Booking Edge Function
 * 
 * Uses the canonical parse contract for document classification,
 * required field enforcement, and receipt handling across ALL entity types.
 * 
 * MULTI-LEG PRESERVATION (v4.3.0):
 * - Each flight leg is extracted as a separate entity
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
- Examples of EXPLICIT times: "Departs 6:00 AM", "Check-in 3:00 PM", "Pickup at 10:30 AM"
- Examples of NON-EXPLICIT times: "Check-in after 3 PM", "Checkout by 11 AM", "Arrives evening", no time mentioned

For RECEIPT ONLY documents (is_receipt_only: true), extract:
- vendor_name
- total_cost (amount paid)
- receipt_date (payment/transaction date in YYYY-MM-DD format)
- Set booking_type based on context if determinable (flight, stay, car_rental, parking, activity, other)
- start_datetime: use date-only if no explicit time
- end_datetime: same rules
- confirmation_number
- address

CRITICAL AIRFARE COST RULES (v4.3.0):
- For multi-leg/round-trip flights: Create SEPARATE booking records for EACH LEG
- Each leg must have its own departure_airport_code, arrival_airport_code, start_datetime, end_datetime
- total_cost: assign the FULL fare to the FIRST leg only, set other legs to null
- The confirmation_number (PNR) may be the same across legs — that is expected
- Example: DEN→LAX and LAX→DEN should be TWO separate booking records
- NEVER collapse multiple legs into a single booking record

CRITICAL FOR FLIGHTS WITH MULTIPLE LEGS (round trips, multi-city):
- Create a SEPARATE booking record for EACH LEG
- Each leg has its own departure and arrival airports, times
- If only one total cost: assign to first leg, set null on subsequent legs
- Include shared confirmation_number on all legs

For flights also extract:
- airline
- passenger_name
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
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
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
                    start_datetime: { type: "string" },
                    end_datetime: { type: "string" },
                    receipt_date: { type: "string", description: "For receipts only: payment date in YYYY-MM-DD" },
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
                    departure_airport_code: { type: "string", description: "3-letter IATA code for departure airport" },
                    arrival_airport_code: { type: "string", description: "3-letter IATA code for arrival airport" },
                    activity_name: { type: "string" },
                    provider_name: { type: "string" },
                    is_ticket_or_permit: { type: "boolean" },
                    location_summary: { type: "string" },
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
        
        // Sanitize airport codes — only valid 3-letter IATA codes allowed
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
        
        // v4.4.0: Extract raw time tokens BEFORE normalization
        parsed.rawStartTimeText = extractRawTimeToken(parsed.start_datetime) || null;
        parsed.rawEndTimeText = extractRawTimeToken(parsed.end_datetime) || null;
        parsed.rawStartDateText = parsed.start_datetime ? String(parsed.start_datetime).substring(0, 10) : null;
        parsed.rawEndDateText = parsed.end_datetime ? String(parsed.end_datetime).substring(0, 10) : null;
        
        // Normalize datetimes (never throws)
        parsed.start_datetime = normalizeDatetime(parsed.start_datetime);
        parsed.end_datetime = normalizeDatetime(parsed.end_datetime);
        parsed.receipt_date = normalizeReceiptDate(parsed.receipt_date);
        
        // v4.4.0: If raw time token exists but normalization lost time, try derive
        const parseIssues: ParseIssue[] = [];
        if (parsed.rawStartTimeText && parsed.start_datetime && !parsed.start_datetime.includes('T')) {
          const derived = tryDeriveIsoTime(parsed.rawStartTimeText);
          if (derived) {
            parsed.start_datetime = `${parsed.start_datetime}T${derived}:00`;
          } else {
            parseIssues.push({
              issueType: 'TIME_DERIVATION_FAILED',
              entityType: parsed.booking_type || 'other',
              missingFields: [],
              actionHint: `Could not parse time "${parsed.rawStartTimeText}". The raw time is preserved for display.`,
              rawValue: parsed.rawStartTimeText,
              fieldPath: 'start_datetime',
            });
          }
        }
        if (parsed.rawEndTimeText && parsed.end_datetime && !parsed.end_datetime.includes('T')) {
          const derived = tryDeriveIsoTime(parsed.rawEndTimeText);
          if (derived) {
            parsed.end_datetime = `${parsed.end_datetime}T${derived}:00`;
          } else {
            parseIssues.push({
              issueType: 'TIME_DERIVATION_FAILED',
              entityType: parsed.booking_type || 'other',
              missingFields: [],
              actionHint: `Could not parse time "${parsed.rawEndTimeText}". The raw time is preserved for display.`,
              rawValue: parsed.rawEndTimeText,
              fieldPath: 'end_datetime',
            });
          }
        }
        if (parseIssues.length > 0) {
          parsed._parse_issues = [...(parsed._parse_issues || []), ...parseIssues];
        }
        // ── v4.2.0: CANONICAL CLASSIFICATION ────────────────────────
        const entityType = parsed.booking_type as string || 'other';
        const hasDates = hasServiceDates(parsed);
        const docClass: DocClassification = classifyDocument(parsed, hasDates);
        
        // Stamp classification on parsed data
        parsed._doc_classification = docClass;
        
        // ── RECEIPT PATH ─────────────────────────────────────────────
        if (docClass === 'RECEIPT') {
          parsed._is_receipt_only = true;
          const entityLabel = ENTITY_TYPE_LABELS[entityType] || 'Booking';
          
          return new Response(JSON.stringify({ 
            success: true, 
            data: parsed,
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
              is_receipt_only: false,
              doc_classification: docClass,
              has_issues: true,
              missing_fields: issue.missingFields,
              message: `${entityLabel} confirmation parsed, but missing: ${issue.missingFields.map(f => f.replace(/_/g, ' ')).join(', ')}. Please complete these fields manually.`
            }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          
          // All required fields present — clean confirmation
          return new Response(JSON.stringify({ 
            success: true, 
            data: parsed,
            is_receipt_only: false,
            doc_classification: docClass,
            message: "Successfully parsed booking details."
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        // ── CHANGE/CANCEL PATH ───────────────────────────────────────
        if (docClass === 'CHANGE_OR_CANCEL') {
          return new Response(JSON.stringify({ 
            success: true, 
            data: parsed,
            is_receipt_only: false,
            doc_classification: 'CHANGE_OR_CANCEL',
            message: "This appears to be a change or cancellation notice. Please review your existing bookings."
          }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        // Fallback
        return new Response(JSON.stringify({ 
          success: true, data: parsed, is_receipt_only: false, doc_classification: 'UNKNOWN',
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
