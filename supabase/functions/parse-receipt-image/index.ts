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
      return new Response(JSON.stringify({ 
        success: false,
        data: {},
        message: "Please sign in to use this feature." 
      }), {
        status: 200,
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
      return new Response(JSON.stringify({ 
        success: false,
        data: {},
        message: "Your session has expired. Please sign in again." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let imageBase64: string | undefined;
    let imageUrl: string | undefined;
    
    try {
      const body = await req.json();
      imageBase64 = body.imageBase64;
      imageUrl = body.imageUrl;
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

    if (!imageBase64 && !imageUrl) {
      return new Response(JSON.stringify({ 
        success: false,
        data: {},
        message: "No image provided. Please upload or take a photo of a receipt." 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are an expert receipt parser with OCR capabilities. Analyze the receipt image and extract detailed expense data.

CRITICAL INSTRUCTIONS:
1. If the image is blurry, unclear, not a receipt, or text is unreadable, respond with: {"readable": false, "reason": "Brief description of why"}
2. If the image IS readable and IS a receipt, extract the data and respond with: {"readable": true, "data": {...}}

For readable receipts, extract ALL of these fields:
- date: Date in YYYY-MM-DD format (look for date stamps, if year missing use current year 2026)
- category: One of: meals, transport, activity, shopping, parking, other
- sub_category: Be specific! Use these values:
  * For alcohol (wine, beer, spirits, cocktails): "alcohol"
  * For non-alcoholic drinks: "beverages"  
  * For coffee/espresso: "coffee"
  * For grocery stores: "groceries"
  * For restaurant breakfast: "breakfast"
  * For restaurant lunch: "lunch"
  * For restaurant dinner: "dinner"
  * For snacks: "snacks"
  * For uber/lyft: "uber"
  * For taxi: "taxi"
  * For gas stations: "gas"
  * For tolls: "tolls"
  * For public transit: "public_transit"
  * For parking: "parking_expense"
  * For rental cars: "rental_car"
  * For tours: "tours"
  * For entertainment: "entertainment"
  * For tickets: "tickets"
  * For souvenirs: "souvenirs"
  * For clothing: "clothing"
  * For gifts: "gifts"
  * For tips: "tips"
  * For fees: "fees"
  * For insurance: "insurance"
  * Otherwise: "miscellaneous"
- vendor_name: Name of the business/restaurant/store (REQUIRED)
- location: City, state or address if visible on receipt (optional)
- subtotal: Subtotal amount BEFORE tax and tip (number)
- tax: Tax amount as a number (look for "tax", "sales tax", etc.)
- tip: Tip/gratuity amount as a number (look for "tip", "gratuity", "service charge")
- amount: FINAL TOTAL amount paid (the bottom-line total including tax and tip)
- description: Brief description combining vendor name and what was purchased
- confidence: Your confidence level 0-100 for the extracted data accuracy

ACCURACY RULES:
- Only return data you can clearly read
- If a field is uncertain, mark confidence lower
- If total amount is unclear, do not guess
- Look for the FINAL TOTAL (grand total, total due, amount paid), not subtotals
- For restaurants: subtotal is food/drink total, then add tax and tip to get final amount
- Always try to extract vendor_name - it's usually at the top of the receipt`;

    const imageContent = imageBase64 
      ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      : { type: "image_url", image_url: { url: imageUrl } };

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
            { 
              role: "user", 
              content: [
                { type: "text", text: "Please analyze this receipt image and extract the expense data. If the image is not clear or not a receipt, let me know." },
                imageContent
              ]
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "extract_receipt_data",
                description: "Extract expense data from a receipt image",
                parameters: {
                  type: "object",
                  properties: {
                    readable: { 
                      type: "boolean", 
                      description: "Whether the image is readable and is a receipt" 
                    },
                    reason: { 
                      type: "string", 
                      description: "If not readable, why (e.g., 'Image is blurry', 'Not a receipt', 'Text is cut off')" 
                    },
                    data: {
                      type: "object",
                      properties: {
                        date: { type: "string", description: "Date in YYYY-MM-DD format" },
                        category: { type: "string", enum: ["meals", "transport", "activity", "shopping", "parking", "other"] },
                        sub_category: { 
                          type: "string", 
                          enum: ["breakfast", "lunch", "dinner", "snacks", "coffee", "groceries", "alcohol", "beverages", "uber", "taxi", "gas", "tolls", "public_transit", "parking_expense", "rental_car", "tours", "entertainment", "tickets", "sports", "souvenirs", "clothing", "gifts", "tips", "fees", "insurance", "miscellaneous"]
                        },
                        vendor_name: { type: "string", description: "Name of the business/restaurant" },
                        location: { type: "string", description: "City, state or address if visible" },
                        subtotal: { type: "number", description: "Subtotal before tax and tip" },
                        tax: { type: "number", description: "Tax amount" },
                        tip: { type: "number", description: "Tip/gratuity amount" },
                        amount: { type: "number", description: "Final total amount paid" },
                        description: { type: "string", description: "Brief description of the expense" },
                        confidence: { type: "number", description: "Confidence level 0-100" }
                      },
                      required: ["date", "category", "sub_category", "vendor_name", "amount", "confidence"]
                    }
                  },
                  required: ["readable"]
                }
              }
            }
          ],
          tool_choice: { type: "function", function: { name: "extract_receipt_data" } },
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
      
      let userMessage = "We couldn't parse this receipt. Please enter details manually.";
      
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

    let aiResponse;
    try {
      aiResponse = await response.json();
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

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      let parsed;
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse tool call arguments");
        return new Response(JSON.stringify({ 
          success: false,
          data: {},
          message: "AI returned incomplete data. Please enter details manually." 
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (!parsed.readable) {
        return new Response(JSON.stringify({ 
          success: false, 
          readable: false,
          data: {},
          message: parsed.reason || "Unable to read the receipt. Please take a clearer photo.",
          retryMessage: "Please retake the photo with better lighting and ensure the entire receipt is visible."
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate confidence level - warn if below 60%
      if (parsed.data?.confidence && parsed.data.confidence < 60) {
        return new Response(JSON.stringify({ 
          success: true, 
          readable: true,
          lowConfidence: true,
          data: parsed.data || {},
          message: "Low confidence in extracted data. Please verify the information.",
          retryMessage: "Consider retaking the photo or verify the extracted data carefully."
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate required fields
      if (!parsed.data?.amount || parsed.data.amount <= 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          readable: true,
          data: parsed.data || {},
          message: "Could not extract a valid amount from the receipt.",
          retryMessage: "Please ensure the total amount is clearly visible in the photo."
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        readable: true,
        data: parsed.data,
        message: `Receipt parsed: ${parsed.data.vendor_name || 'Receipt'} - $${parsed.data.amount?.toFixed(2) || '0.00'}`
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      success: false,
      data: {},
      message: "We couldn't extract details from this receipt. Please enter the information manually." 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Parse receipt image error:", error);
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
