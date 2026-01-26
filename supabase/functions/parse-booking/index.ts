import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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
      : `You are a travel booking confirmation parser. Extract the following from the booking text:
- booking_type (flight, stay, car_rental, activity)
- vendor_name
- start_datetime (ISO 8601 format)
- end_datetime (ISO 8601 format, if applicable)
- confirmation_number
- total_cost (number only)
- address

For flights also extract:
- airline
- passenger_name
- flight_number (put in notes)

For stays also extract:
- property_name
- stay_type (hotel, airbnb, vrbo, other)
- check_in_time
- check_out_time

For car rentals also extract:
- rental_company
- pickup_location
- return_location

Return a JSON object with these fields. Use null for any fields you cannot determine.`;

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
        ],
        tool_choice: { type: "function", function: { name: type === 'receipt' ? "extract_receipt" : "extract_booking" } },
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

    return new Response(JSON.stringify({ success: false, error: "Could not parse content" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Parse booking error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
