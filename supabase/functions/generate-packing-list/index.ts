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
    const body = await req.json();
    const { 
      destination_city, destination_state, destination_country, 
      start_date, end_date, trip_type, destination_type,
      weather_envelope,
      itinerary_legs,
      additional_locations,
      is_regenerate,
    } = body;

    if (!destination_city || typeof destination_city !== 'string' || !destination_city.trim()) {
      return new Response(JSON.stringify({ success: false, error: "Destination city is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!start_date || !end_date) {
      return new Response(JSON.stringify({ success: false, error: "Trip dates are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const startD = new Date(start_date);
    const endD = new Date(end_date);
    const tripNights = Math.max(1, Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24)));
    const tripDays = tripNights + 1;
    const today = new Date();
    const daysUntilTrip = Math.max(0, Math.ceil((startD.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const isEarlyDraft = daysUntilTrip > 7;
    const travelMonth = startD.toLocaleString('en-US', { month: 'long' });

    // v4.7.0: Build per-leg itinerary context
    let itineraryContext = `Primary destination: ${destination_city}${destination_state ? `, ${destination_state}` : ''}, ${destination_country || ''}`;
    
    const legs = itinerary_legs || additional_locations || [];
    if (Array.isArray(legs) && legs.length > 0) {
      itineraryContext += '\n\nTrip Itinerary Legs:';
      for (const leg of legs) {
        if (!leg.city) continue;
        const dates = leg.arriveDate ? ` (arriving ${leg.arriveDate}${leg.departDate ? `, departing ${leg.departDate}` : ''})` : '';
        const climate = leg.climateTags?.length ? ` — Climate: ${leg.climateTags.join(', ')}` : '';
        itineraryContext += `\n  • ${leg.city}${leg.country ? `, ${leg.country}` : ''}${dates}${climate}`;
      }
    }

    // Destination type detection
    const cityLower = destination_city?.toLowerCase() || '';
    const stateLower = destination_state?.toLowerCase() || '';
    const countryLower = destination_country?.toLowerCase() || '';
    
    const beachDestinations = ['florida', 'miami', 'hawaii', 'maui', 'cancun', 'cabo', 'bahamas', 'caribbean', 'maldives', 'bali', 'phuket', 'tenerife', 'ibiza', 'mallorca', 'sardinia', 'amalfi', 'santorini', 'mykonos', 'crete'];
    const isBeachDestination = destination_type === 'beach' || beachDestinations.some(b => cityLower.includes(b) || stateLower.includes(b));
    
    const mountainDestinations = ['aspen', 'vail', 'zermatt', 'chamonix', 'dolomites', 'alps', 'pyrenees', 'patagonia'];
    const isMountainDestination = destination_type === 'mountain' || mountainDestinations.some(m => cityLower.includes(m));

    // Weather context
    let weatherContext = '';
    if (weather_envelope?.summary) {
      const s = weather_envelope.summary;
      weatherContext = `
Weather Intelligence (${weather_envelope.weatherMode || 'SEASONAL_NORMALS'}):
- Average high: ${s.avgHigh ?? 'unknown'}°F / Average low: ${s.avgLow ?? 'unknown'}°F
- Rain: ${s.hasRain ? 'Yes' : 'No'} | Snow: ${s.hasSnow ? 'Yes' : 'No'}
- Precipitation: ${s.precipTypeHint || 'unknown'} | Cloud cover: ${s.cloudCoverHint || 'unknown'}`;
    }

    const systemPrompt = `You are an expert travel packing advisor with deep knowledge of global cultures, regional fashion, and climate patterns. Generate a comprehensive, culturally-aware packing list.

TRIP CONTEXT:
${itineraryContext}
- Dates: ${start_date} to ${end_date} (${tripNights} nights, ${tripDays} days)
- Month: ${travelMonth}
- Trip type: ${trip_type}
- Days until departure: ${daysUntilTrip}
${weatherContext}

CRITICAL RULES:
1. MULTI-LEG AWARENESS: This trip visits MULTIPLE cities/regions. Consider the weather and culture of EACH leg separately. Pack for the widest range of conditions across ALL stops.
2. CLOTHING QUANTITIES based on ${tripNights} nights:
   - Underwear: ${tripNights} pairs
   - Socks: ${tripNights} pairs
   - Tops: ${tripNights} (one per day)
   - Bottoms: ${Math.ceil(tripNights / 2)} pairs
   - Sleepwear: ${tripNights < 5 ? 1 : 2} set(s)
3. CULTURAL AWARENESS:
   - Suggest clothing appropriate for local culture and norms (e.g., covering shoulders for churches in Italy, modest dress in certain regions)
   - Note dress codes for restaurants, museums, or religious sites common in the destination
   - Include cultural tips in special_notes
4. COLOR & STYLE SUGGESTIONS:
   - For each clothing item, include a "color_tip" with region-appropriate color suggestions
   - Europeans tend toward neutral tones (navy, black, olive, cream, beige) — suggest blending in
   - Beach destinations: lighter, brighter colors are appropriate
   - Business: dark suits, muted tones
   - Consider what locals typically wear during that time of year
5. PER-LEG APPLICABILITY: Each item must have an "applies_to" array indicating which legs/conditions it covers (e.g., ["all"], ["Milan - cold"], ["Barcelona - warm"], ["rain"], ["beach"])
6. DEDUPLICATION: Each item appears ONCE in the master list. If needed for multiple legs, list all applicable legs in applies_to.
${isBeachDestination ? '\n7. BEACH MANDATORY: Include swimsuit(s), sunscreen SPF 30+, sunglasses, sun hat, flip-flops, beach towel, after-sun care.' : ''}
${isMountainDestination ? '\n7. MOUNTAIN MANDATORY: Include hiking boots, warm layers, waterproof jacket, hiking socks, daypack.' : ''}
${is_regenerate ? '\nREGENERATION MODE: Generating updated list with latest weather data. Focus on accuracy.' : ''}

Categories: Clothing Core, Layers & Outerwear, Rain & Wet Weather, Cold / Snow Gear, Footwear, Accessories, Swimwear & Beach, Toiletries & Health, Tech & Chargers, Documents & Critical Items, Cultural Essentials, Business (if applicable)`;

    const userPrompt = `Generate a complete, culturally-aware packing list for this multi-leg trip. 

For each clothing item, include color suggestions appropriate for the regions visited. Include cultural tips about dress codes, local customs, and what to wear where.

Be specific about which leg each item applies to. For example:
- A warm jacket applies to Milan (cool/cold) but not to beach stops
- Modest clothing for church visits in Italy
- Comfortable walking shoes for all legs

Return practical quantities. Mark specialty items as suggest_buy_early=true with rationale.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_packing_list",
              description: "Generate a categorized packing list for the trip",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { 
                          type: "string", 
                          enum: ["Clothing Core", "Layers & Outerwear", "Rain & Wet Weather", "Cold / Snow Gear", "Footwear", "Accessories", "Swimwear & Beach", "Toiletries & Health", "Tech & Chargers", "Documents & Critical Items", "Cultural Essentials", "Business"]
                        },
                        item_name: { type: "string", description: "Name of the item" },
                        quantity: { type: "number", description: "How many to pack" },
                        own_it_likely: { type: "boolean" },
                        suggest_buy_early: { type: "boolean" },
                        rationale: { type: "string", description: "Why this item is included, which leg it serves" },
                        color_tip: { type: "string", description: "Color/style suggestion appropriate for the region (e.g., 'Navy or olive — blends with Italian style')" },
                        applies_to: { 
                          type: "array", 
                          items: { type: "string" },
                          description: "Which legs/conditions this covers, e.g. ['all'], ['Milan - cold'], ['Barcelona - warm'], ['rain']"
                        },
                      },
                      required: ["category", "item_name", "quantity"],
                    },
                  },
                  special_notes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Cultural tips, dress code advice, regional fashion notes, and packing wisdom for this specific trip"
                  },
                  leg_summaries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        city: { type: "string" },
                        climate_summary: { type: "string", description: "Brief weather/climate description" },
                        style_note: { type: "string", description: "What locals typically wear, dress code tips" },
                      },
                      required: ["city", "climate_summary"],
                    },
                    description: "Per-city climate and style summaries for the trip"
                  }
                },
                required: ["items"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_packing_list" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ 
        success: true, 
        data: parsed,
        meta: {
          isEarlyDraft: isEarlyDraft,
          generatedAt: new Date().toISOString(),
          legCount: legs.length,
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Could not generate packing list" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-packing-list error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
