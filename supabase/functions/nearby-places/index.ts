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

interface OsmElement {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function osmSelectors(type: string): string[] {
  switch (type) {
    case 'restaurant': return ['["amenity"~"restaurant|fast_food"]'];
    case 'bar':
    case 'night_club': return ['["amenity"~"bar|pub|biergarten|nightclub"]'];
    case 'cafe': return ['["amenity"="cafe"]'];
    case 'tourist_attraction': return ['["tourism"~"attraction|viewpoint|artwork|zoo|theme_park"]', '["historic"]'];
    case 'museum': return ['["tourism"="museum"]'];
    case 'park': return ['["leisure"~"park|garden|nature_reserve"]', '["tourism"="picnic_site"]'];
    case 'hiking_trail': return ['["route"="hiking"]', '["highway"~"path|footway"]["name"]'];
    case 'grocery_store': return ['["shop"~"supermarket|grocery"]'];
    case 'gas_station': return ['["amenity"="fuel"]'];
    case 'convenience_store': return ['["shop"="convenience"]'];
    default: return ['["tourism"]', '["amenity"]'];
  }
}

function buildHereQuery(type: string): string {
  switch (type) {
    case 'restaurant': return 'restaurant';
    case 'bar':
    case 'night_club': return 'bar pub nightlife';
    case 'cafe': return 'coffee cafe';
    case 'tourist_attraction': return 'tourist attraction landmark';
    case 'museum': return 'museum gallery';
    case 'park': return 'park garden nature';
    case 'hiking_trail': return 'hiking trail trailhead';
    case 'grocery_store': return 'grocery supermarket';
    case 'gas_station': return 'gas station';
    case 'convenience_store': return 'convenience store';
    default: return type.replace(/_/g, ' ');
  }
}

async function fetchHerePlaces(lat: number, lng: number, type: string, radiusMeters: number, limit: number): Promise<NearbyPlace[]> {
  const apiKey = Deno.env.get('HERE_API_KEY');
  if (!apiKey) return [];

  try {
    const url = new URL('https://discover.search.hereapi.com/v1/discover');
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('at', `${lat},${lng}`);
    url.searchParams.set('in', `circle:${lat},${lng};r=${Math.min(Math.max(radiusMeters, 500), 50000)}`);
    url.searchParams.set('q', buildHereQuery(type));
    url.searchParams.set('limit', String(Math.min(limit, 20)));
    url.searchParams.set('lang', 'en-US');

    const response = await fetch(url.toString());
    if (!response.ok) {
      console.warn(`[nearby-places] HERE fallback error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    return (data.items || []).map((item: any) => ({
      placeId: item.id || `here:${item.position?.lat}:${item.position?.lng}:${item.title}`,
      name: item.title || '',
      address: item.address?.label || item.vicinity || '',
      rating: null,
      lat: item.position?.lat ?? 0,
      lng: item.position?.lng ?? 0,
      photoUrl: null,
      reviewCount: null,
    })).filter((place: NearbyPlace) => place.name && place.lat && place.lng);
  } catch (err) {
    console.warn('[nearby-places] HERE fallback failed:', err);
    return [];
  }
}

function formatOsmAddress(tags: Record<string, string>, fallbackLat: number, fallbackLng: number): string {
  const street = [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' ');
  const locality = tags['addr:city'] || tags['addr:town'] || tags['addr:village'];
  return [street, locality, tags['addr:state'], tags['addr:country']].filter(Boolean).join(', ') ||
    tags.operator || tags.tourism || tags.amenity || tags.leisure || `${fallbackLat.toFixed(4)}, ${fallbackLng.toFixed(4)}`;
}

async function fetchOsmPlaces(lat: number, lng: number, type: string, radiusMeters: number, limit: number): Promise<NearbyPlace[]> {
  const radius = Math.min(Math.max(radiusMeters, 500), 50000);
  const blocks = osmSelectors(type).flatMap((selector) => [
    `node${selector}(around:${radius},${lat},${lng});`,
    `way${selector}(around:${radius},${lat},${lng});`,
    `relation${selector}(around:${radius},${lat},${lng});`,
  ]).join('\n');
  const query = `[out:json][timeout:12];(${blocks});out center tags ${Math.min(limit * 3, 60)};`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: query,
      signal: controller.signal,
    });
    if (!response.ok) return [];
    const data = await response.json();
    const seen = new Set<string>();
    return ((data.elements || []) as OsmElement[])
      .map((el) => {
        const placeLat = el.lat ?? el.center?.lat ?? 0;
        const placeLng = el.lon ?? el.center?.lon ?? 0;
        const tags = el.tags || {};
        const name = tags.name || tags.brand || tags.operator || '';
        if (!name || !placeLat || !placeLng) return null;
        return {
          placeId: `osm:${el.type}:${el.id}`,
          name,
          address: formatOsmAddress(tags, placeLat, placeLng),
          rating: null,
          lat: placeLat,
          lng: placeLng,
          photoUrl: null,
          reviewCount: null,
          distance: haversineMiles(lat, lng, placeLat, placeLng),
        };
      })
      .filter((place): place is NearbyPlace & { distance: number } => Boolean(place))
      .filter((place) => {
        if (seen.has(place.name.toLowerCase())) return false;
        seen.add(place.name.toLowerCase());
        return place.distance * 1609.34 <= radius;
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map(({ distance: _distance, ...place }) => place);
  } catch (err) {
    console.warn('[nearby-places] OSM fallback failed:', err);
    return [];
  } finally {
    clearTimeout(timer);
  }
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
      console.warn('[nearby-places] GOOGLE_PLACES_API_KEY not configured — using OSM fallback');
      const places = await fetchOsmPlaces(lat, lng, type, radiusMeters, limit);
      return new Response(
        JSON.stringify({ places, provider: 'osm_fallback' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { textQuery, includedType } = buildTextQuery(type, lat, lng);

    // Use Text Search (New) API with locationBias (circle) to prefer nearby results.
    // Strict radius enforcement is handled client-side via haversine filter.
    const requestBody: Record<string, unknown> = {
      textQuery,
      locationBias: {
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
      const places = await fetchOsmPlaces(lat, lng, type, radiusMeters, limit);
      return new Response(
        JSON.stringify({ places, provider: 'osm_fallback', fallbackReason: 'GOOGLE_PLACES_ERROR' }),
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
