/**
 * v3.11.3: Nearby Places Search Edge Function
 *
 * Server-side proxy for Google Places Nearby Search.
 * Returns nearby gas stations, restaurants, etc.
 * Fails gracefully if GOOGLE_PLACES_API_KEY is not configured.
 *
 * Input: { lat, lng, type, radiusMeters, limit }
 * Output: { places: NearbyPlace[] }
 */

import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface NearbySearchRequest {
  lat: number;
  lng: number;
  type: string; // 'gas_station' | 'restaurant' | 'tourist_attraction' | 'museum' | 'park' | 'bar' | 'cafe' | etc.
  radiusMeters?: number;
  limit?: number;
}

interface NearbyPlace {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  lat: number;
  lng: number;
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const body: NearbySearchRequest = await req.json();
    const { lat, lng, type, radiusMeters = 12875, limit = 8 } = body;

    if (!lat || !lng || !type) {
      return new Response(
        JSON.stringify({ places: [], error: 'Missing required fields: lat, lng, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      console.warn('[nearby-places] GOOGLE_PLACES_API_KEY not configured — returning empty');
      return new Response(
        JSON.stringify({ places: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Google Places Nearby Search
    const params = new URLSearchParams({
      location: `${lat},${lng}`,
      radius: String(Math.min(radiusMeters, 50000)),
      type,
      key: apiKey,
    });

    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${params.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[nearby-places] Google API error: ${response.status}`);
      return new Response(
        JSON.stringify({ places: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error(`[nearby-places] Google Places status: ${data.status}`);
      return new Response(
        JSON.stringify({ places: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const places: NearbyPlace[] = (data.results || [])
      .slice(0, limit)
      .map((r: any) => ({
        placeId: r.place_id || '',
        name: r.name || '',
        address: r.vicinity || '',
        rating: r.rating ?? null,
        lat: r.geometry?.location?.lat ?? 0,
        lng: r.geometry?.location?.lng ?? 0,
      }));

    return new Response(
      JSON.stringify({ places }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[nearby-places] Error:', err);
    return new Response(
      JSON.stringify({ places: [] }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
