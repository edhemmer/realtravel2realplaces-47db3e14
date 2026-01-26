import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a travel itinerary and booking confirmation parser. Your job is to extract TRIP-LEVEL information from booking confirmations, itineraries, or travel documents.

Extract the following TRIP information:
- trip_name: A descriptive name for the trip (e.g., "Orlando Family Vacation", "NYC Business Trip")
- destination_city: The main destination city
- destination_state: State/province if applicable (especially for US locations)
- destination_country: The destination country
- start_date: The earliest date found (departure date, check-in date, etc.) in YYYY-MM-DD format
- end_date: The latest date found (return date, check-out date, etc.) in YYYY-MM-DD format
- trip_type: Infer from context - "business" if work-related, "personal" for vacation/leisure, "mixed" if unclear

Also extract ALL BOOKINGS found in the document as an array. Each booking should include:
- booking_type: "flight", "stay", "car_rental", or "activity"
- vendor_name: The company name (airline, hotel, rental company, etc.)
- start_datetime: ISO 8601 format
- end_datetime: ISO 8601 format (if applicable)
- confirmation_number: If present
- total_cost: Number only
- address: If applicable

For flights also extract:
- airline
- passenger_name
- notes: Include flight numbers here

For stays also extract:
- property_name
- stay_type: "hotel", "airbnb", "vrbo", or "other"

For car rentals also extract:
- rental_company
- pickup_location
- return_location

Return a JSON object with trip info and an array of bookings. Use null for any fields you cannot determine.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              name: "extract_itinerary",
              description: "Extract trip details and all bookings from travel documents",
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
                        booking_type: { type: "string", enum: ["flight", "stay", "car_rental", "activity"] },
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
                        notes: { type: "string" },
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

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI parsing failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ success: true, data: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Could not parse itinerary" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Parse itinerary error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});