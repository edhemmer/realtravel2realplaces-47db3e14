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

    // v4.10.0: destination_city can be derived from itinerary legs
    const effectiveCity = (destination_city && typeof destination_city === 'string' && destination_city.trim())
      ? destination_city.trim()
      : (itinerary_legs?.length > 0 ? itinerary_legs[0]?.city : null);
    
    if (!effectiveCity) {
      return new Response(JSON.stringify({ success: false, error: "Destination city or bookings are required" }), {
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
    let itineraryContext = `Primary destination: ${effectiveCity}${destination_state ? `, ${destination_state}` : ''}, ${destination_country || ''}`;
    
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
    const cityLower = effectiveCity?.toLowerCase() || '';
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

    // Smart quantity capping: assume laundry access for trips >7 nights
    const assumeLaundry = tripNights > 7;
    const dailyWearCap = assumeLaundry ? 7 : tripNights;
    const bottomsCap = assumeLaundry ? 4 : Math.ceil(tripNights / 2);

    const systemPrompt = `You are a premium travel packing advisor with expertise in regional fashion, climate, and smart travel. Generate an intelligent, curated packing list.

TRIP CONTEXT:
${itineraryContext}
- Dates: ${start_date} to ${end_date} (${tripNights} nights, ${tripDays} days)
- Month: ${travelMonth}
- Trip type: ${trip_type}
${weatherContext}

CRITICAL RULES:
1. Pack for ALL legs/locations — widest climate range. Each leg may be in a DIFFERENT COUNTRY — use the country provided for each leg, do NOT assume all legs are in the same country.
2. SMART QUANTITIES (${assumeLaundry ? 'LAUNDRY ASSUMED — traveler will wash clothes' : 'no laundry expected'}):
   - Underwear: ${dailyWearCap} pairs (max). Socks: ${dailyWearCap} pairs (max).
   - Tops: ${dailyWearCap} (max). Bottoms: ${bottomsCap} (max).
   - Nobody packs more than 7 of any daily-wear item. Be practical.
3. color_tip REQUIRED for all clothing/accessory items — region-specific style advice (e.g., "Dark neutrals — Milan is a fashion capital", "Linen in earthy tones for Barcelona").
4. applies_to array REQUIRED — tag each item with which leg(s) or condition it serves (e.g., ["Milan, Italy"], ["Barcelona, Spain"], ["all"], ["rain days"]).
5. Deduplicate — each item appears ONCE with the widest applies_to coverage.
6. Be SPECIFIC to each city's culture: Milan = high fashion, dark/neutral tones. Barcelona = relaxed Mediterranean, bright colors ok. Rome = smart-casual. Canary Islands = resort casual.
7. Include a power adapter/converter if traveling between countries with different outlet types.
${isBeachDestination ? '8. BEACH: Include swimsuit (2), sunscreen SPF 50+, reef-safe if applicable, sunglasses, wide-brim sun hat, sandals, beach cover-up.' : ''}
${isMountainDestination ? '8. MOUNTAIN: Include hiking boots, moisture-wicking layers, waterproof shell, hiking socks (wool blend), daypack, trekking poles if needed.' : ''}

Categories: Clothing Core, Layers & Outerwear, Rain & Wet Weather, Footwear, Accessories, Toiletries & Health, Tech & Chargers, Documents & Critical Items${isBeachDestination ? ', Swimwear & Beach' : ''}${isMountainDestination ? ', Hiking & Outdoor' : ''}${trip_type === 'business' ? ', Business' : ''}`;

    const userPrompt = `Generate a complete, curated packing list. Smart quantities only — assume laundry for ${tripNights > 7 ? 'this longer trip' : 'trips over a week'}. Region-specific color_tip on every clothing item. Tag every item with applies_to showing which city/country or condition. Return practical, stylish recommendations a savvy traveler would appreciate.`;

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
