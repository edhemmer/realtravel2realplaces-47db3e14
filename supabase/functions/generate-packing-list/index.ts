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
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error("Auth validation failed:", authError?.message);
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { 
      destination_city, destination_state, destination_country, 
      start_date, end_date, trip_type, destination_type,
      weather_forecast, weather_envelope 
    } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Calculate trip nights and days
    const startD = new Date(start_date);
    const endD = new Date(end_date);
    const tripNights = Math.ceil((endD.getTime() - startD.getTime()) / (1000 * 60 * 60 * 24));
    const tripDays = tripNights + 1;

    // Get month for seasonality
    const travelMonth = startD.toLocaleString('en-US', { month: 'long' });

    // Detect destination type
    const beachDestinations = ['florida', 'miami', 'orlando', 'tampa', 'key west', 'fort lauderdale', 'clearwater', 'naples', 'sarasota', 'destin', 'panama city', 'jacksonville beach', 'daytona', 'hawaii', 'maui', 'honolulu', 'cancun', 'cabo', 'puerto rico', 'virgin islands', 'bahamas', 'caribbean', 'aruba', 'jamaica', 'turks', 'caicos', 'bermuda', 'maldives', 'bali', 'phuket', 'thailand beach', 'costa rica', 'san diego', 'los angeles', 'santa monica', 'malibu', 'galveston', 'south padre', 'gulf shores', 'myrtle beach', 'outer banks', 'hilton head', 'charleston'];
    const beachStates = ['florida', 'fl', 'hawaii', 'hi'];
    const mountainDestinations = ['aspen', 'vail', 'breckenridge', 'telluride', 'park city', 'jackson hole', 'big sky', 'lake tahoe', 'mammoth', 'whistler', 'banff', 'jasper', 'zermatt', 'chamonix', 'innsbruck', 'st moritz', 'courchevel', 'verbier', 'denver', 'boulder', 'colorado springs', 'flagstaff', 'sedona', 'grand canyon', 'yellowstone', 'yosemite', 'glacier', 'rocky mountain', 'gatlinburg', 'pigeon forge', 'asheville', 'lake placid', 'stowe', 'killington', 'salt lake city', 'reno', 'santa fe', 'taos', 'durango', 'steamboat', 'keystone', 'copper mountain', 'winter park', 'crested butte', 'sun valley', 'bend', 'mount rainier', 'swiss alps', 'austrian alps', 'italian alps', 'dolomites', 'pyrenees', 'scottish highlands', 'patagonia', 'queenstown', 'interlaken'];
    const mountainStates = ['colorado', 'co', 'utah', 'ut', 'wyoming', 'wy', 'montana', 'mt', 'idaho', 'id', 'vermont', 'vt', 'new hampshire', 'nh'];
    
    const cityLower = destination_city?.toLowerCase() || '';
    const stateLower = destination_state?.toLowerCase() || '';
    const countryLower = destination_country?.toLowerCase() || '';
    
    const manualDestinationType = destination_type && destination_type !== 'unspecified' ? destination_type : null;
    
    const autoDetectedBeach = beachDestinations.some(beach => 
      cityLower.includes(beach) || stateLower.includes(beach) || countryLower.includes(beach)
    ) || beachStates.some(state => stateLower === state || stateLower.includes(state));

    const autoDetectedMountain = mountainDestinations.some(mountain => 
      cityLower.includes(mountain) || stateLower.includes(mountain) || countryLower.includes(mountain)
    ) || mountainStates.some(state => stateLower === state || stateLower.includes(state));

    const isBeachDestination = manualDestinationType === 'beach' || (!manualDestinationType && autoDetectedBeach);
    const isMountainDestination = manualDestinationType === 'mountain' || (!manualDestinationType && autoDetectedMountain);
    const isCityDestination = manualDestinationType === 'city';

    const beachItemsInstruction = isBeachDestination ? `
MANDATORY BEACH ITEMS (YOU MUST INCLUDE ALL OF THESE):
- Swimsuit/Swimwear: 2 (one to wear, one drying)
- Sunscreen SPF 30+: 1
- Sunglasses: 1
- Sun hat/Baseball cap: 1
- Flip-flops/Sandals: 1 pair
- Beach towel: 1
- After-sun lotion/Aloe vera: 1
These items are REQUIRED for this destination. Do not skip any of them.` : '';

    const mountainItemsInstruction = isMountainDestination ? `
MANDATORY MOUNTAIN/HIKING ITEMS (YOU MUST INCLUDE ALL OF THESE):
- Hiking boots or sturdy trail shoes: 1 pair
- Warm hat/Beanie: 1
- Layering base layer top: 1
- Fleece or insulated mid-layer jacket: 1
- Waterproof/windproof outer layer jacket: 1
- Hiking socks (wool or synthetic): 2 pairs
- Sunglasses (UV protection for altitude): 1
- Sunscreen SPF 30+ (UV is stronger at altitude): 1
- Reusable water bottle: 1
- Daypack/Backpack for hikes: 1
- Gloves (lightweight or insulated based on season): 1 pair
These items are REQUIRED for mountain destinations. Do not skip any of them.` : '';

    const cityItemsInstruction = isCityDestination ? `
MANDATORY CITY/URBAN ITEMS (YOU MUST INCLUDE ALL OF THESE):
- Comfortable walking shoes: 1 pair
- Daypack or crossbody bag for sightseeing: 1
- Portable phone charger/power bank: 1
- Umbrella (compact): 1
- Light jacket or cardigan for AC/evening: 1
- Smart casual outfit for dining: 1 set
These items are RECOMMENDED for city destinations.` : '';

    // v3.8.13: Build weather context from envelope if available
    let weatherContext = '';
    if (weather_envelope) {
      const env = weather_envelope;
      weatherContext = `
- Weather intelligence: ${env.weatherMode === 'SEASONAL_NORMALS' ? 'Based on typical conditions for this time of year' : env.weatherMode === 'FORECAST_BLEND' ? 'Mix of forecast + typical conditions' : 'Based on current forecast'}
- Average high: ${env.summary?.avgHigh || 'unknown'}°F, Average low: ${env.summary?.avgLow || 'unknown'}°F
- Rain expected: ${env.summary?.hasRain ? 'Yes' : 'No'}
- Snow expected: ${env.summary?.hasSnow ? 'Yes' : 'No'}
- Cold days (≤45°F): ${env.summary?.hasCold ? 'Yes' : 'No'}
- Hot days (≥90°F): ${env.summary?.hasHot ? 'Yes' : 'No'}
- Precipitation type: ${env.summary?.precipTypeHint || 'unknown'}
- Cloud cover: ${env.summary?.cloudCoverHint || 'unknown'}`;
    } else if (weather_forecast) {
      weatherContext = `- Weather forecast: ${JSON.stringify(weather_forecast)}`;
    }

    const systemPrompt = `You are a smart travel packing assistant. Generate a practical, accurate packing list based on the destination, trip duration, time of year, and weather conditions.

CRITICAL RULES for clothing quantities:
- Trip nights (not days) determine clothing quantities
- Underwear: exactly ${tripNights} pairs
- Socks: exactly ${tripNights} pairs
- Tops/T-shirts: ${tripNights} shirts (one per day)
- Bottoms: ${Math.ceil(tripNights / 2)} pairs of pants/shorts (can repeat)
- Sleepwear: 1 set (for trips under 5 nights) or 2 sets
- Keep total quantity practical - travelers prefer packing light
${beachItemsInstruction}
${mountainItemsInstruction}
${cityItemsInstruction}

Location-aware items:
- Florida/Beach/Tropical destinations: ALWAYS include swimsuit, sunscreen, sunglasses, sun hat, flip-flops, beach towel, after-sun care
- Mountain/Hiking destinations: ALWAYS include hiking boots, warm hat, layers, fleece jacket, waterproof jacket, hiking socks, gloves, daypack
- City/Urban destinations: comfortable walking shoes, daypack, portable charger, umbrella, smart casual outfit
- Cold destinations: layers, warm jacket, gloves, hat
- Business trips: add professional attire items

Weather-based adjustments:
- Rain likely: umbrella, rain jacket
- Hot (>80°F): more shorts, light fabrics, sun protection
- Cold (<50°F): layers, warm jacket, thermals
- Snow likely: snow boots, insulated jacket, warm gloves, thermal layers
- Variable: versatile pieces that layer

For each item, indicate if it's a seasonal/specialty item the traveler may need to BUY vs a common item they likely already OWN.

Return a JSON object with categorized items. Each item needs: category, item_name, quantity, own_it_likely (boolean), suggest_buy_early (boolean), rationale (optional string).
Categories: Clothing Core, Layers & Outerwear, Rain & Wet Weather, Cold / Snow Gear, Footwear, Accessories, Swimwear & Beach, Toiletries & Health, Tech & Chargers, Documents & Critical Items, Business (if applicable)`;

    const userPrompt = `Generate a packing list for this trip:
- Destination: ${destination_city}${destination_state ? `, ${destination_state}` : ''}, ${destination_country}
- Dates: ${start_date} to ${end_date} (${tripNights} nights, ${tripDays} days)
- Month of travel: ${travelMonth}
- Trip type: ${trip_type}
${weatherContext}

Return a practical packing list. Be accurate with quantities based on trip length. Mark seasonal/specialty items as suggest_buy_early=true with a short rationale.`;

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
                          description: "Item category",
                          enum: ["Clothing Core", "Layers & Outerwear", "Rain & Wet Weather", "Cold / Snow Gear", "Footwear", "Accessories", "Swimwear & Beach", "Toiletries & Health", "Tech & Chargers", "Documents & Critical Items", "Business"]
                        },
                        item_name: { type: "string", description: "Name of the item" },
                        quantity: { type: "number", description: "How many to pack" },
                        own_it_likely: { type: "boolean", description: "Whether the traveler likely already owns this" },
                        suggest_buy_early: { type: "boolean", description: "Whether to suggest buying early if missing" },
                        rationale: { type: "string", description: "Short reason for including this item (e.g., 'Typical wet period')" },
                      },
                      required: ["category", "item_name", "quantity"],
                    },
                  },
                  special_notes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Special packing tips for this destination/time of year"
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
      
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
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

    return new Response(JSON.stringify({ success: false, error: "Could not generate packing list" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Generate packing list error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
