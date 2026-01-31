import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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

For RECEIPT ONLY documents (is_receipt_only: true), extract:
- vendor_name
- total_cost (amount paid)
- receipt_date (payment/transaction date in YYYY-MM-DD format)
- Set booking_type based on context if determinable (flight, stay, car_rental, parking, activity, other)

For FULL BOOKING CONFIRMATIONS (is_receipt_only: false), extract all fields:
- booking_type (flight, stay, car_rental, activity, parking)
  - IMPORTANT: If the text mentions parking services (SpotHero, WallyPark, ParkWhiz, The Parking Spot, PreFlight, airport parking, garage parking, lot parking), classify as "parking" NOT "activity"
- vendor_name (the actual company name, e.g., "Frontier Airlines", "Alamo", "Marriott" - NEVER return "null" as a string)
- start_datetime (ISO 8601 format) - For flights: use DEPARTURE time of FIRST/OUTBOUND flight. For stays: use CHECK-IN date/time. For car rentals: use PICKUP time. For parking: use entry/start time.
- end_datetime (ISO 8601 format, if applicable) - For flights: use ARRIVAL time of LAST/RETURN flight. For stays: use CHECK-OUT date. For car rentals: use DROP-OFF time. For parking: use exit/end time.
- confirmation_number
- total_cost (number only) - For multi-leg flights with a single total, put the FULL cost on the FIRST/OUTBOUND leg only. Do NOT duplicate the same total across return flights.
- address

CRITICAL FOR FLIGHTS WITH MULTIPLE LEGS (round trips):
- start_datetime = DEPARTURE time of the FIRST/OUTBOUND flight
- end_datetime = ARRIVAL time of the LAST/RETURN flight (NOT the outbound arrival)
- This ensures the flight booking spans the entire trip duration
- Example: If outbound departs Jan 30 6:13 PM and return arrives Feb 1 9:46 PM, use start_datetime=2026-01-30T18:13:00 and end_datetime=2026-02-01T21:46:00

For flights also extract:
- airline (the actual airline name like "Frontier Airlines", "Delta", "United" - extract from the confirmation text)
- passenger_name
- flight_number (put in notes, format as "Outbound: XXXX, Return: XXXX" for round trips)

CRITICAL FOR STAYS - DATE VALIDATION:
- ONLY extract stays if you can identify ACTUAL CHECK-IN and CHECK-OUT dates
- start_datetime must be the CHECK-IN date, end_datetime must be the CHECK-OUT date
- NEVER use: reservation date, payment date, booking creation date, or transaction date
- If the confirmation only shows a payment/transaction date without explicit check-in/check-out dates, set is_receipt_only to true
- A "Payment successful" email is NOT a booking confirmation - it lacks check-in/check-out dates

For stays also extract:
- property_name
- stay_type (hotel, airbnb, vrbo, other)
- check_in_time (the actual CHECK-IN time, not reservation/booking time)
- check_out_time (the actual CHECK-OUT time)

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
                    start_datetime: { type: "string", description: "For stays: check-in date. For flights: departure. For rentals: pickup. For parking: start time. NULL for receipts." },
                    end_datetime: { type: "string", description: "For stays: check-out date. For flights: arrival. For rentals: drop-off. For parking: end time. NULL for receipts." },
                    receipt_date: { type: "string", description: "For receipts only: the payment/transaction date in YYYY-MM-DD format" },
                    confirmation_number: { type: "string" },
                    total_cost: { type: "number", description: "For multi-leg flights with single total, put full cost on first/outbound leg only" },
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
        
        // Post-process: Clean up "null" strings to actual null values
        for (const key of Object.keys(parsed)) {
          if (parsed[key] === "null" || parsed[key] === "NULL") {
            parsed[key] = null;
          }
        }
        
        // Check if this is a receipt-only document
        if (parsed.is_receipt_only === true) {
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
        
        // For non-receipt bookings, validate that we have service dates
        // If booking_type is set but no start_datetime, treat as receipt
        if (!parsed.start_datetime && parsed.total_cost) {
          parsed.is_receipt_only = true;
          return new Response(JSON.stringify({ 
            success: true, 
            data: parsed,
            is_receipt_only: true,
            message: "This appears to be a payment receipt without service dates. An expense will be created instead." 
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        
        // Validate stay bookings have actual check-in/check-out dates (not just payment dates)
        if (parsed.booking_type === 'stay') {
          const hasValidDates = parsed.start_datetime && parsed.end_datetime;
          if (!hasValidDates) {
            // Treat as receipt if missing dates
            parsed.is_receipt_only = true;
            return new Response(JSON.stringify({ 
              success: true, 
              data: parsed,
              is_receipt_only: true,
              message: "This appears to be a payment confirmation without check-in/check-out dates. An expense will be created. To add timeline entries, please upload the full booking confirmation." 
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