/**
 * v4.6.0: Nearby Places Search Edge Function
 *
 * Uses Google Places Text Search (New) API for accurate, relevant results.
 * Falls back gracefully if GOOGLE_PLACES_API_KEY is not configured.
 *
 * Input: { lat, lng, type, radiusMeters, limit }
 * Output: { places: NearbyPlace[] }
 *
 * v4.10.1: Uses locationRestriction (hard boundary) instead of locationBias
 * to ensure results are strictly within the user-selected radius.
 */

import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface NearbySearchRequest {
  lat: number;
  lng: number;
  type: string;
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
  photoUrl: string | null;
  reviewCount: number | null;
}

/**
 * Map our internal type to a Text Search query + includedType for accuracy.
 * Text Search gives far better relevance than Nearby Search.
 */
function buildTextQuery(type: string, lat: number, lng: number): { textQuery: string; includedType?: string } {
  switch (type) {
    case 'restaurant':
      return { textQuery: 'restaurants', includedType: 'restaurant' };
    case 'bar':
    case 'night_club':
      return { textQuery: 'bars and pubs', includedType: 'bar' };
    case 'cafe':
      return { textQuery: 'cafes and coffee shops', includedType: 'cafe' };
    case 'tourist_attraction':
      return { textQuery: 'tourist attractions and landmarks', includedType: 'tourist_attraction' };
    case 'museum':
      return { textQuery: 'museums and galleries', includedType: 'museum' };
    case 'park':
      return { textQuery: 'parks hiking trails nature walks and gardens', includedType: 'park' };
    case 'hiking_trail':
      return { textQuery: 'hiking trails and trailheads' };
    case 'grocery_store':
      return { textQuery: 'grocery stores and supermarkets', includedType: 'grocery_store' };
    case 'gas_station':
    case 'convenience_store':
      return { textQuery: 'convenience stores', includedType: 'convenience_store' };
    default:
      return { textQuery: type.replace(/_/g, ' ') };
  }
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

    const { textQuery, includedType } = buildTextQuery(type, lat, lng);

    // Use Text Search (New) API with locationRestriction for strict radius enforcement
    const requestBody: Record<string, unknown> = {
      textQuery,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: Math.min(radiusMeters, 50000),
        },
      },
      maxResultCount: Math.min(limit, 20),
      rankPreference: 'DISTANCE',
    };

    if (includedType) {
      requestBody.includedType = includedType;
    }

    const url = 'https://places.googleapis.com/v1/places:searchText';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.rating,places.location,places.photos,places.userRatingCount',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[nearby-places] Google Text Search API error: ${response.status}`, errText);
      return new Response(
        JSON.stringify({ places: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    const places: NearbyPlace[] = (data.places || [])
      .slice(0, limit)
      .map((p: any) => {
        // Build photo ref for proxy (keeps API key server-side)
        let photoUrl: string | null = null;
        if (p.photos && p.photos.length > 0) {
          const photoName = p.photos[0].name;
          // Return the photo resource name — client will use places-photo proxy
          photoUrl = `${photoName}/media`;
        }
        return {
          placeId: p.id || '',
          name: p.displayName?.text || '',
          address: p.formattedAddress || '',
          rating: p.rating ?? null,
          lat: p.location?.latitude ?? 0,
          lng: p.location?.longitude ?? 0,
          photoUrl,
          reviewCount: p.userRatingCount ?? null,
        };
      });

    console.log(`[nearby-places] Text Search for "${textQuery}" returned ${places.length} results`);

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
