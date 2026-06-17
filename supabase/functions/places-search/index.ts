/**
 * v3.8.4: Places Search Edge Function
 * 
 * Server-side proxy for OSM Photon geocoding.
 * Provides rate control and caching for the free provider.
 * 
 * Input: { countryCode, regionCode, query }
 * Output: { success, candidates: PlaceCandidate[] }
 */

import { corsJsonHeaders, handleCors } from "../_shared/cors.ts";
import { validateAuth } from "../_shared/auth.ts";

// ============================================================================
// TYPES
// ============================================================================

interface SearchRequest {
  countryCode: string;
  regionCode: string;
  query: string;
}

interface PhotonFeature {
  type: string;
  geometry: {
    coordinates: [number, number]; // [lng, lat]
    type: string;
  };
  properties: {
    osm_id?: number;
    osm_type?: string;
    name?: string;
    city?: string;
    state?: string;
    country?: string;
    countrycode?: string;
    type?: string; // city, town, village, etc.
    postcode?: string;
  };
}

interface PhotonResponse {
  type: string;
  features: PhotonFeature[];
}

interface PlaceCandidate {
  provider: string;
  providerId: string;
  primary: string;
  secondary: string;
  formatted: string;
  lat: number;
  lng: number;
  regionCode: string;
  countryCode: string;
}

// ============================================================================
// SIMPLE IN-MEMORY CACHE
// ============================================================================

const cache = new Map<string, { candidates: PlaceCandidate[]; timestamp: number }>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getCacheKey(req: SearchRequest): string {
  return `${req.countryCode}:${req.regionCode}:${req.query.toLowerCase().trim()}`;
}

// ============================================================================
// US STATE NAME → CODE MAP
// ============================================================================

const US_STATE_NAMES: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'district of columbia': 'DC', 'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI',
  'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
  'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME',
  'maryland': 'MD', 'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN',
  'mississippi': 'MS', 'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE',
  'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM',
  'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
  'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX',
  'utah': 'UT', 'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA',
  'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY',
};

function stateNameToCode(stateName: string | undefined): string {
  if (!stateName) return '';
  const lower = stateName.toLowerCase().trim();
  // Check if already a 2-letter code
  if (/^[A-Z]{2}$/i.test(stateName.trim())) return stateName.trim().toUpperCase();
  return US_STATE_NAMES[lower] || stateName.trim();
}

// ============================================================================
// PHOTON API CALL
// ============================================================================

async function searchPhoton(req: SearchRequest): Promise<PlaceCandidate[]> {
  // Build Photon URL with constraints
  const params = new URLSearchParams({
    q: req.query,
    limit: '8',
    lang: 'en',
    osm_tag: 'place:city',
  });

  // Photon doesn't have direct state filtering, but we filter results post-hoc
  // We can't restrict by region in the API itself for Photon

  const url = `https://photon.komoot.io/api/?${params.toString()}`;
  
  const response = await fetch(url, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    console.error(`[places-search] Photon API error: ${response.status}`);
    return [];
  }

  const data: PhotonResponse = await response.json();

  if (!data.features || data.features.length === 0) {
    // Retry with broader osm_tag for smaller places
    const retryParams = new URLSearchParams({
      q: req.query,
      limit: '8',
      lang: 'en',
    });
    const retryUrl = `https://photon.komoot.io/api/?${retryParams.toString()}`;
    const retryResponse = await fetch(retryUrl, {
      headers: { 'Accept': 'application/json' },
    });
    if (!retryResponse.ok) return [];
    const retryData: PhotonResponse = await retryResponse.json();
    if (!retryData.features) return [];
    return filterAndMap(retryData.features, req);
  }

  return filterAndMap(data.features, req);
}

function filterAndMap(features: PhotonFeature[], req: SearchRequest): PlaceCandidate[] {
  const candidates: PlaceCandidate[] = [];

  for (const feature of features) {
    const props = feature.properties;
    const coords = feature.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;

    // Must be a populated place type
    const placeTypes = ['city', 'town', 'village', 'hamlet', 'suburb', 'borough', 'locality'];
    if (props.type && !placeTypes.includes(props.type)) continue;

    // Country filter
    const featureCountry = (props.countrycode || '').toUpperCase();
    if (req.countryCode && featureCountry !== req.countryCode.toUpperCase()) continue;

    // Region/state filter (for US)
    const featureState = stateNameToCode(props.state);
    if (req.regionCode && featureState) {
      if (featureState.toUpperCase() !== req.regionCode.toUpperCase()) continue;
    }

    const cityName = props.name || props.city || '';
    if (!cityName) continue;

    const secondary = [featureState, props.country].filter(Boolean).join(', ');
    const formatted = [cityName, featureState, featureCountry].filter(Boolean).join(', ');

    candidates.push({
      provider: 'OSM_PHOTON',
      providerId: `osm:${props.osm_type || 'node'}:${props.osm_id || coords.join(',')}`,
      primary: cityName,
      secondary,
      formatted,
      lat: coords[1], // Photon returns [lng, lat]
      lng: coords[0],
      regionCode: featureState || req.regionCode,
      countryCode: featureCountry || req.countryCode,
    });
  }

  // Deduplicate by city name (keep first/best)
  const seen = new Set<string>();
  return candidates.filter(c => {
    const key = `${c.primary.toLowerCase()}:${c.regionCode}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================================
// HANDLER
// ============================================================================

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = await validateAuth(req);
    if (!auth.success) return auth.errorResponse!;

    const body: SearchRequest = await req.json();

    if (!body.query || body.query.trim().length < 2) {
      return new Response(
        JSON.stringify({ success: true, candidates: [] }),
        { headers: corsJsonHeaders(req) }
      );
    }

    // Check cache
    const cacheKey = getCacheKey(body);
    const cached = cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
      return new Response(
        JSON.stringify({ success: true, candidates: cached.candidates }),
        { headers: corsJsonHeaders(req) }
      );
    }

    // Search
    const candidates = await searchPhoton(body);

    // Cache result
    cache.set(cacheKey, { candidates, timestamp: Date.now() });

    // Cleanup old cache entries (keep max 100)
    if (cache.size > 100) {
      const oldest = [...cache.entries()]
        .sort((a, b) => a[1].timestamp - b[1].timestamp)
        .slice(0, cache.size - 50);
      for (const [key] of oldest) {
        cache.delete(key);
      }
    }

    return new Response(
      JSON.stringify({ success: true, candidates }),
      { headers: corsJsonHeaders(req) }
    );
  } catch (err) {
    console.error('[places-search] Error:', err);
    return new Response(
      JSON.stringify({ success: false, candidates: [], message: 'Internal error' }),
      { status: 200, headers: corsJsonHeaders(req) }
    );
  }
});
