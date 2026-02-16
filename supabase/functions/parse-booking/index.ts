/**
 * v2.1.19: Parse Booking Edge Function
 * 
 * COST INTEGRITY RULES (v2.1.19):
 * - Airline confirmations with a SINGLE total trip price (Frontier-style):
 *   Create ONE booking record with ONE total_cost for all legs combined.
 *   Never assign the total to each leg separately.
 * - Airline confirmations with per-leg prices:
 *   Sum them for total_cost on the single booking record.
 *   Never create separate booking records per leg.
 * - If a field (price, tax, fee) is missing: leave null, never guess or copy.
 * - total_cost = booking-level total, NOT sum of segment costs.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Uses shared datetime-utils for pre-compiled regex and short-circuit evaluations
 * - Reduced redundant parsing operations
 * - Error handling preserves existing behavior
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { 
  normalizeDatetime, 
  normalizeReceiptDate, 
  cleanNullStrings,
  hasServiceDates 
} from "../_shared/datetime-utils.ts";

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
        success: false, 
        data: {},
        message: "Please sign in to use this feature." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Validate the user's session by calling getUser
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth validation failed:", authError?.message);
      return new Response(JSON.stringify({ 
        success: false,
        data: {},
        message: "Your session has expired. Please sign in again." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let text: string;
    let type: string;
    
    try {
      const body = await req.json();
      text = body.text;
      type = body.type;
    } catch {
      return new Response(JSON.stringify({ 
        success: false,
        data: {},
        message: "Invalid request format. Please try again." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(JSON.stringify({ 
        success: false,
        data: {},
        message: "No text provided to parse. Please paste or drop a booking confirmation." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(JSON.stringify({ 
        success: false,
        data: {},
        message: "AI parsing is temporarily unavailable. Please enter details manually." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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

CRITICAL DISTINCTION:
- BOOKING CONFIRMATION: Contains actual service dates like departure/arrival times, check-in/check-out dates, pickup/dropoff times, parking entry/exit times
- RECEIPT ONLY: Contains only payment info (amount, vendor, card details, transaction date) but NO service dates

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
  - Examples: The Wave permit, Antelope Canyon tour, Broadway show tickets, museum admission, theme park tickets

For ACTIVITY bookings, also extract:
- activity_name (name of the tour/attraction/event)
- provider_name (company running the tour/issuing the permit)
- is_ticket_or_permit: true if this is an entry ticket or permit type booking

CRITICAL v2.0.6 - STRICT DATETIME INTEGRITY:
- ONLY extract times that are EXPLICITLY stated in the document
- If a document shows a date but NO explicit time (e.g., "Check-in: January 30, 2026"), set the time to null
- DO NOT infer, guess, or default times to midnight, morning, or any placeholder
- DO NOT interpret phrases like "after 4:00 PM" or "by 10:00 AM" as exact times - these are NOT explicit times
- For start_datetime and end_datetime: if no explicit time exists, use date-only format (YYYY-MM-DD) NOT a datetime with 00:00:00
- Examples of EXPLICIT times: "Departs 6:00 AM", "Check-in 3:00 PM", "Pickup at 10:30 AM"
- Examples of NON-EXPLICIT times: "Check-in after 3 PM", "Checkout by 11 AM", "Arrives evening", no time mentioned

For RECEIPT ONLY documents (is_receipt_only: true), extract:
- vendor_name
- total_cost (amount paid)
- receipt_date (payment/transaction date in YYYY-MM-DD format)
- Set booking_type based on context if determinable (flight, stay, car_rental, parking, activity, other)
- start_datetime: 
  - If EXPLICIT time exists: use ISO 8601 format with time (e.g., "2026-01-30T18:13:00")
  - If NO explicit time: use date-only format (e.g., "2026-01-30")
  - For flights: DEPARTURE time of FIRST/OUTBOUND flight
  - For stays: CHECK-IN date/time (if time not explicit, use date only)
  - For car rentals: PICKUP time
  - For parking: entry/start time
- end_datetime:
  - Same rules as start_datetime regarding explicit times
  - For flights: ARRIVAL time of LAST/RETURN flight
  - For stays: CHECK-OUT date
  - For car rentals: DROP-OFF time
  - For parking: exit/end time
- confirmation_number
- address

CRITICAL AIRFARE COST RULES (v2.1.9):
- total_cost should contain the TOTAL airfare for the entire booking (all legs combined)
- For multi-leg/round-trip flights: Report ONE single booking record with ONE total_cost
- NEVER create separate booking records for each leg - all legs belong to ONE booking
- If the confirmation shows one total (e.g., "$350.00 Total") for a round trip:
  - Return ONE booking record with total_cost: 350
  - Include all leg details in the notes field (e.g., "Outbound: F1234, Return: F5678")
- Do NOT infer per-leg costs. Only report amounts explicitly shown.
- If separate per-leg costs are explicitly provided (rare), SUM them for total_cost on the single booking.
- NEVER multiply or duplicate the total based on number of passengers or legs.
- NEVER create multiple booking records for what is clearly one purchase/confirmation.

CRITICAL FOR FLIGHTS WITH MULTIPLE LEGS (round trips, multi-city):
- Create ONLY ONE booking record for the entire itinerary, regardless of number of legs/segments
- start_datetime = DEPARTURE time of the FIRST/OUTBOUND flight
- end_datetime = ARRIVAL time of the LAST/RETURN flight (NOT the outbound arrival)
- This ensures the flight booking spans the entire trip duration
- Example: If outbound departs Jan 30 6:13 PM and return arrives Feb 1 9:46 PM:
  - Create ONE booking: start_datetime=2026-01-30T18:13:00, end_datetime=2026-02-01T21:46:00, total_cost=(full trip fare)
  - Include leg details in notes: "Outbound: ATL→MCO F1234, Return: MCO→ATL F5678"
- The single total_cost applies to this ONE booking record spanning ALL legs
- NEVER create separate bookings per leg from a single confirmation

For flights also extract:
- airline (the actual airline name like "Frontier Airlines", "Delta", "United" - extract from the confirmation text)
- passenger_name
- flight_number (put in notes, format as "Outbound: XXXX, Return: XXXX" for round trips)
- departure_airport_code (3-letter IATA code for departure airport, e.g., "ATL")
- arrival_airport_code (3-letter IATA code for arrival airport, e.g., "DEN")

CRITICAL FOR STAYS - DATE VALIDATION:
- start_datetime MUST be the actual CHECK-IN DATE (sometimes labeled "arrival date" or "check-in")
- end_datetime MUST be the actual CHECK-OUT DATE (sometimes labeled "departure date" or "check-out")
- ONLY these dates are valid for stays: check-in date, check-out date, arrival date, departure date
- NEVER USE ANY OF THESE for stay dates:
  * Reservation date / booking date
  * Payment date / transaction date / charge date
  * Email sent date / confirmation email date
  * Order creation date / purchase date
- If you cannot find explicit check-in AND check-out dates, set is_receipt_only to true
- A "Payment successful" or "Booking confirmed" email without check-in/check-out dates is a RECEIPT, not a booking
- When in doubt, if dates appear near words like "paid", "charged", "booked on", "reserved", these are NOT check-in dates
- For check-in/check-out TIMES: only include if explicitly stated (e.g., "Check-in: 3:00 PM")

For stays also extract:
- property_name
- stay_type (hotel, airbnb, vrbo, other)
- check_in_time (the actual CHECK-IN time if explicitly stated, null otherwise)
- check_out_time (the actual CHECK-OUT time if explicitly stated, null otherwise)

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
                      description: "Specific sub-category for detailed reporting. Use 'alcohol' for wine/beer/spirits, 'groceries' for grocery store items, 'beverages' for non-alcoholic drinks"
                    },
                    description: { type: "string" },
                    amount: { type: "number" },
                    vendor_name: { type: "string" },
                  },
                  required: ["date", "category", "amount", "sub_category"],
                } : {
                  type: "object",
                  properties: {
                    is_receipt_only: { type: "boolean", description: "True if this is a payment receipt without service dates (no flight times, no check-in/out, no pickup/dropoff)" },
                    booking_type: { type: "string", enum: ["flight", "stay", "car_rental", "activity", "parking", "other"] },
                    vendor_name: { type: "string" },
                    start_datetime: { type: "string", description: "For stays: check-in date. For flights: departure. For rentals: pickup. For parking: start time. For activities: event date/time. NULL for receipts." },
                    end_datetime: { type: "string", description: "For stays: check-out date. For flights: arrival. For rentals: drop-off. For parking: end time. NULL for receipts." },
                    receipt_date: { type: "string", description: "For receipts only: the payment/transaction date in YYYY-MM-DD format" },
                    confirmation_number: { type: "string" },
                    total_cost: { type: "number", description: "Total cost for entire booking. For flights: single total for all legs combined - never duplicate or split" },
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
                    // Flight-specific airport codes (v2.2.4)
                    departure_airport_code: { type: "string", description: "3-letter IATA code for departure airport (e.g., ATL)" },
                    arrival_airport_code: { type: "string", description: "3-letter IATA code for arrival airport (e.g., DEN)" },
                    // Activity-specific fields (v2.1.17)
                    activity_name: { type: "string", description: "For activities: name of the tour, attraction, or event" },
                    provider_name: { type: "string", description: "For activities: company/organization providing the tour/experience" },
                    is_ticket_or_permit: { type: "boolean", description: "For activities: true if this is a ticket or permit type booking" },
                    location_summary: { type: "string", description: "Brief location description (e.g., 'Near Page, AZ')" },
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
        success: false,
        data: {},
        message: "Unable to connect to AI service. Please try again or enter details manually." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      let userMessage = "We couldn't fully parse this confirmation. Please review and complete the details manually.";
      
      if (response.status === 429) {
        userMessage = "AI service is busy. Please wait a moment and try again.";
      } else if (response.status === 402) {
        userMessage = "AI parsing limit reached. Please enter details manually.";
      }
      
      return new Response(JSON.stringify({ 
        success: false,
        data: {},
        message: userMessage 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let data;
    try {
      data = await response.json();
    } catch {
      console.error("Failed to parse AI response JSON");
      return new Response(JSON.stringify({ 
        success: false,
        data: {},
        message: "Received an invalid response from AI. Please enter details manually." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        
        // v2.6.3: Use optimized shared utilities for post-processing
        // Clean up "null" strings to actual null values
        cleanNullStrings(parsed);
        
        // v3.13.2: Sanitize airport codes — only valid 3-letter IATA codes allowed
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
        
        // v2.6.3: Apply optimized datetime normalization
        // Uses pre-compiled regex and short-circuit evaluations
        parsed.start_datetime = normalizeDatetime(parsed.start_datetime);
        parsed.end_datetime = normalizeDatetime(parsed.end_datetime);
        parsed.receipt_date = normalizeReceiptDate(parsed.receipt_date);
        
        // Check if this is a receipt-only document
        if (parsed.is_receipt_only === true) {
          // v4.1.0: For flights flagged as receipt-only, classify explicitly
          if (parsed.booking_type === 'flight') {
            parsed._email_classification = 'FLIGHT_RECEIPT';
          }
          return new Response(JSON.stringify({ 
            success: true, 
            data: parsed,
            is_receipt_only: true,
            message: "This appears to be a payment receipt without booking details. An expense will be created instead." 
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // v2.6.3: Use optimized hasServiceDates for validation
        // Consolidates service date checks with short-circuit evaluation
        if (!hasServiceDates(parsed)) {
          // No valid service dates - treat as receipt if has cost
          if (parsed.total_cost) {
            parsed.is_receipt_only = true;
            if (parsed.booking_type === 'flight') {
              parsed._email_classification = 'FLIGHT_RECEIPT';
            }
            const message = parsed.booking_type === 'stay'
              ? "This appears to be a payment confirmation without check-in/check-out dates. An expense will be created. To add timeline entries, please upload the full booking confirmation."
              : "This appears to be a payment receipt without service dates. An expense will be created instead.";
            
            return new Response(JSON.stringify({ 
              success: true, 
              data: parsed,
              is_receipt_only: true,
              message
            }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        
        // v4.1.0: Flight classification and required field enforcement
        if (parsed.booking_type === 'flight') {
          parsed._email_classification = 'FLIGHT_CONFIRMATION';
          
          // Enforce required fields for flight confirmations
          const missingFields: string[] = [];
          if (!parsed.departure_airport_code) missingFields.push('departure_airport_code');
          if (!parsed.arrival_airport_code) missingFields.push('arrival_airport_code');
          if (!parsed.start_datetime) missingFields.push('departure_datetime');
          if (!parsed.end_datetime) missingFields.push('arrival_datetime');
          
          if (missingFields.length > 0) {
            parsed._parse_issues = [{
              issueType: 'MISSING_REQUIRED_FIELDS',
              missingFields,
              emailType: 'FLIGHT_CONFIRMATION',
              actionHint: 'Some flight details could not be extracted. Please review and complete the missing fields, or re-upload the original confirmation email.',
            }];
            
            return new Response(JSON.stringify({ 
              success: true, 
              data: parsed,
              is_receipt_only: false,
              has_issues: true,
              missing_fields: missingFields,
              message: `Flight confirmation parsed, but missing: ${missingFields.map(f => f.replace(/_/g, ' ')).join(', ')}. Please complete these fields manually.`
            }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          data: parsed,
          is_receipt_only: false,
          message: "Successfully parsed booking details." 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        console.error("Failed to parse tool call arguments");
        return new Response(JSON.stringify({ 
          success: false,
          data: {},
          message: "AI returned incomplete data. Please review and complete the details manually." 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: false, 
      data: {},
      message: "We couldn't extract details from this text. Please enter the information manually." 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Parse booking error:", error);
    return new Response(JSON.stringify({ 
      success: false,
      data: {},
      message: "An unexpected error occurred. Please enter details manually." 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});