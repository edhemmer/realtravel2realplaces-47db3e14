/**
 * Lightweight US state lookup from lat/lng using bounding boxes.
 * Not precision cartography — just "near Kentucky" level accuracy for fuel stop labels.
 * States are checked in order; first containing bbox wins.
 */

interface StateBBox {
  code: string;
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// Approximate bounding boxes for US states (CONUS only)
const STATE_BOXES: StateBBox[] = [
  { code: 'AL', name: 'Alabama', minLat: 30.2, maxLat: 35.0, minLng: -88.5, maxLng: -84.9 },
  { code: 'AZ', name: 'Arizona', minLat: 31.3, maxLat: 37.0, minLng: -114.8, maxLng: -109.0 },
  { code: 'AR', name: 'Arkansas', minLat: 33.0, maxLat: 36.5, minLng: -94.6, maxLng: -89.6 },
  { code: 'CA', name: 'California', minLat: 32.5, maxLat: 42.0, minLng: -124.4, maxLng: -114.1 },
  { code: 'CO', name: 'Colorado', minLat: 37.0, maxLat: 41.0, minLng: -109.1, maxLng: -102.0 },
  { code: 'CT', name: 'Connecticut', minLat: 41.0, maxLat: 42.1, minLng: -73.7, maxLng: -71.8 },
  { code: 'DE', name: 'Delaware', minLat: 38.5, maxLat: 39.8, minLng: -75.8, maxLng: -75.0 },
  { code: 'FL', name: 'Florida', minLat: 24.5, maxLat: 31.0, minLng: -87.6, maxLng: -80.0 },
  { code: 'GA', name: 'Georgia', minLat: 30.4, maxLat: 35.0, minLng: -85.6, maxLng: -80.8 },
  { code: 'ID', name: 'Idaho', minLat: 42.0, maxLat: 49.0, minLng: -117.2, maxLng: -111.0 },
  { code: 'IL', name: 'Illinois', minLat: 37.0, maxLat: 42.5, minLng: -91.5, maxLng: -87.5 },
  { code: 'IN', name: 'Indiana', minLat: 37.8, maxLat: 41.8, minLng: -88.1, maxLng: -84.8 },
  { code: 'IA', name: 'Iowa', minLat: 40.4, maxLat: 43.5, minLng: -96.6, maxLng: -90.1 },
  { code: 'KS', name: 'Kansas', minLat: 37.0, maxLat: 40.0, minLng: -102.1, maxLng: -94.6 },
  { code: 'KY', name: 'Kentucky', minLat: 36.5, maxLat: 39.1, minLng: -89.6, maxLng: -82.0 },
  { code: 'LA', name: 'Louisiana', minLat: 29.0, maxLat: 33.0, minLng: -94.0, maxLng: -89.0 },
  { code: 'ME', name: 'Maine', minLat: 43.1, maxLat: 47.5, minLng: -71.1, maxLng: -67.0 },
  { code: 'MD', name: 'Maryland', minLat: 38.0, maxLat: 39.7, minLng: -79.5, maxLng: -75.0 },
  { code: 'MA', name: 'Massachusetts', minLat: 41.2, maxLat: 42.9, minLng: -73.5, maxLng: -69.9 },
  { code: 'MI', name: 'Michigan', minLat: 41.7, maxLat: 48.3, minLng: -90.4, maxLng: -82.4 },
  { code: 'MN', name: 'Minnesota', minLat: 43.5, maxLat: 49.4, minLng: -97.2, maxLng: -89.5 },
  { code: 'MS', name: 'Mississippi', minLat: 30.2, maxLat: 35.0, minLng: -91.7, maxLng: -88.1 },
  { code: 'MO', name: 'Missouri', minLat: 36.0, maxLat: 40.6, minLng: -95.8, maxLng: -89.1 },
  { code: 'MT', name: 'Montana', minLat: 44.4, maxLat: 49.0, minLng: -116.1, maxLng: -104.0 },
  { code: 'NE', name: 'Nebraska', minLat: 40.0, maxLat: 43.0, minLng: -104.1, maxLng: -95.3 },
  { code: 'NV', name: 'Nevada', minLat: 35.0, maxLat: 42.0, minLng: -120.0, maxLng: -114.0 },
  { code: 'NH', name: 'New Hampshire', minLat: 42.7, maxLat: 45.3, minLng: -72.6, maxLng: -70.7 },
  { code: 'NJ', name: 'New Jersey', minLat: 39.0, maxLat: 41.4, minLng: -75.6, maxLng: -73.9 },
  { code: 'NM', name: 'New Mexico', minLat: 31.3, maxLat: 37.0, minLng: -109.1, maxLng: -103.0 },
  { code: 'NY', name: 'New York', minLat: 40.5, maxLat: 45.0, minLng: -79.8, maxLng: -71.9 },
  { code: 'NC', name: 'North Carolina', minLat: 33.8, maxLat: 36.6, minLng: -84.3, maxLng: -75.5 },
  { code: 'ND', name: 'North Dakota', minLat: 45.9, maxLat: 49.0, minLng: -104.1, maxLng: -96.6 },
  { code: 'OH', name: 'Ohio', minLat: 38.4, maxLat: 42.0, minLng: -84.8, maxLng: -80.5 },
  { code: 'OK', name: 'Oklahoma', minLat: 33.6, maxLat: 37.0, minLng: -103.0, maxLng: -94.4 },
  { code: 'OR', name: 'Oregon', minLat: 42.0, maxLat: 46.3, minLng: -124.6, maxLng: -116.5 },
  { code: 'PA', name: 'Pennsylvania', minLat: 39.7, maxLat: 42.3, minLng: -80.5, maxLng: -74.7 },
  { code: 'RI', name: 'Rhode Island', minLat: 41.1, maxLat: 42.0, minLng: -71.9, maxLng: -71.1 },
  { code: 'SC', name: 'South Carolina', minLat: 32.0, maxLat: 35.2, minLng: -83.4, maxLng: -78.5 },
  { code: 'SD', name: 'South Dakota', minLat: 42.5, maxLat: 45.9, minLng: -104.1, maxLng: -96.4 },
  { code: 'TN', name: 'Tennessee', minLat: 35.0, maxLat: 36.7, minLng: -90.3, maxLng: -81.6 },
  { code: 'TX', name: 'Texas', minLat: 25.8, maxLat: 36.5, minLng: -106.6, maxLng: -93.5 },
  { code: 'UT', name: 'Utah', minLat: 37.0, maxLat: 42.0, minLng: -114.1, maxLng: -109.0 },
  { code: 'VT', name: 'Vermont', minLat: 42.7, maxLat: 45.0, minLng: -73.4, maxLng: -71.5 },
  { code: 'VA', name: 'Virginia', minLat: 36.5, maxLat: 39.5, minLng: -83.7, maxLng: -75.2 },
  { code: 'WA', name: 'Washington', minLat: 45.5, maxLat: 49.0, minLng: -124.8, maxLng: -116.9 },
  { code: 'WV', name: 'West Virginia', minLat: 37.2, maxLat: 40.6, minLng: -82.6, maxLng: -77.7 },
  { code: 'WI', name: 'Wisconsin', minLat: 42.5, maxLat: 47.1, minLng: -92.9, maxLng: -86.8 },
  { code: 'WY', name: 'Wyoming', minLat: 41.0, maxLat: 45.0, minLng: -111.1, maxLng: -104.1 },
];

/**
 * Approximate US state name from lat/lng using bounding boxes.
 * Returns null for coordinates outside CONUS.
 */
export function approximateStateName(lat: number, lng: number): string | null {
  // Find smallest bbox that contains the point (most specific match)
  let best: StateBBox | null = null;
  let bestArea = Infinity;

  for (const box of STATE_BOXES) {
    if (lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng) {
      const area = (box.maxLat - box.minLat) * (box.maxLng - box.minLng);
      if (area < bestArea) {
        best = box;
        bestArea = area;
      }
    }
  }

  return best?.name ?? null;
}

// ============================================================================
// MAJOR US CITY CENTROIDS (for approximate coordinate resolution)
// ============================================================================

interface CityCentroid {
  city: string;
  state: string;
  lat: number;
  lng: number;
}

const CITY_CENTROIDS: CityCentroid[] = [
  // Major cities
  { city: 'Atlanta', state: 'GA', lat: 33.749, lng: -84.388 },
  { city: 'Austin', state: 'TX', lat: 30.267, lng: -97.743 },
  { city: 'Baltimore', state: 'MD', lat: 39.290, lng: -76.612 },
  { city: 'Birmingham', state: 'AL', lat: 33.521, lng: -86.802 },
  { city: 'Boston', state: 'MA', lat: 42.360, lng: -71.059 },
  { city: 'Charlotte', state: 'NC', lat: 35.227, lng: -80.843 },
  { city: 'Chicago', state: 'IL', lat: 41.878, lng: -87.630 },
  { city: 'Cincinnati', state: 'OH', lat: 39.103, lng: -84.512 },
  { city: 'Cleveland', state: 'OH', lat: 41.500, lng: -81.694 },
  { city: 'Columbus', state: 'OH', lat: 39.961, lng: -82.999 },
  { city: 'Dallas', state: 'TX', lat: 32.777, lng: -96.797 },
  { city: 'Denver', state: 'CO', lat: 39.739, lng: -104.990 },
  { city: 'Detroit', state: 'MI', lat: 42.331, lng: -83.046 },
  { city: 'Fort Worth', state: 'TX', lat: 32.755, lng: -97.331 },
  { city: 'Houston', state: 'TX', lat: 29.760, lng: -95.370 },
  { city: 'Indianapolis', state: 'IN', lat: 39.768, lng: -86.158 },
  { city: 'Jacksonville', state: 'FL', lat: 30.332, lng: -81.656 },
  { city: 'Kansas City', state: 'MO', lat: 39.100, lng: -94.578 },
  { city: 'Las Vegas', state: 'NV', lat: 36.169, lng: -115.140 },
  { city: 'Los Angeles', state: 'CA', lat: 34.052, lng: -118.244 },
  { city: 'Louisville', state: 'KY', lat: 38.253, lng: -85.759 },
  { city: 'Memphis', state: 'TN', lat: 35.150, lng: -90.049 },
  { city: 'Miami', state: 'FL', lat: 25.762, lng: -80.192 },
  { city: 'Milwaukee', state: 'WI', lat: 43.039, lng: -87.907 },
  { city: 'Minneapolis', state: 'MN', lat: 44.978, lng: -93.265 },
  { city: 'Nashville', state: 'TN', lat: 36.163, lng: -86.781 },
  { city: 'New Orleans', state: 'LA', lat: 29.951, lng: -90.072 },
  { city: 'New York', state: 'NY', lat: 40.713, lng: -74.006 },
  { city: 'Oklahoma City', state: 'OK', lat: 35.468, lng: -97.516 },
  { city: 'Orlando', state: 'FL', lat: 28.538, lng: -81.379 },
  { city: 'Philadelphia', state: 'PA', lat: 39.953, lng: -75.164 },
  { city: 'Phoenix', state: 'AZ', lat: 33.449, lng: -112.074 },
  { city: 'Pittsburgh', state: 'PA', lat: 40.441, lng: -79.996 },
  { city: 'Portland', state: 'OR', lat: 45.505, lng: -122.675 },
  { city: 'Raleigh', state: 'NC', lat: 35.780, lng: -78.639 },
  { city: 'Richmond', state: 'VA', lat: 37.541, lng: -77.436 },
  { city: 'Sacramento', state: 'CA', lat: 38.582, lng: -121.494 },
  { city: 'Salt Lake City', state: 'UT', lat: 40.761, lng: -111.891 },
  { city: 'San Antonio', state: 'TX', lat: 29.425, lng: -98.495 },
  { city: 'San Diego', state: 'CA', lat: 32.716, lng: -117.161 },
  { city: 'San Francisco', state: 'CA', lat: 37.775, lng: -122.419 },
  { city: 'San Jose', state: 'CA', lat: 37.339, lng: -121.895 },
  { city: 'Seattle', state: 'WA', lat: 47.606, lng: -122.332 },
  { city: 'St. Louis', state: 'MO', lat: 38.627, lng: -90.199 },
  { city: 'Tampa', state: 'FL', lat: 27.951, lng: -82.458 },
  { city: 'Tucson', state: 'AZ', lat: 32.222, lng: -110.975 },
  { city: 'Virginia Beach', state: 'VA', lat: 36.853, lng: -75.978 },
  { city: 'Washington', state: 'DC', lat: 38.907, lng: -77.037 },

  // Mid-size cities along major corridors (for fuel stop area labels)
  { city: 'Bowling Green', state: 'KY', lat: 36.990, lng: -86.444 },
  { city: 'Chattanooga', state: 'TN', lat: 35.046, lng: -85.309 },
  { city: 'Clarksville', state: 'TN', lat: 36.530, lng: -87.359 },
  { city: 'Elizabethtown', state: 'KY', lat: 37.694, lng: -85.859 },
  { city: 'Evansville', state: 'IN', lat: 37.972, lng: -87.571 },
  { city: 'Fort Wayne', state: 'IN', lat: 41.079, lng: -85.139 },
  { city: 'Gary', state: 'IN', lat: 41.593, lng: -87.346 },
  { city: 'Knoxville', state: 'TN', lat: 35.961, lng: -83.921 },
  { city: 'Lafayette', state: 'IN', lat: 40.417, lng: -86.875 },
  { city: 'Lexington', state: 'KY', lat: 38.040, lng: -84.504 },
  { city: 'Macon', state: 'GA', lat: 32.841, lng: -83.632 },
  { city: 'Champaign', state: 'IL', lat: 40.116, lng: -88.243 },
  { city: 'Springfield', state: 'IL', lat: 39.781, lng: -89.650 },
  { city: 'Terre Haute', state: 'IN', lat: 39.467, lng: -87.414 },
  { city: 'Bloomington', state: 'IN', lat: 39.165, lng: -86.526 },
  { city: 'Valdosta', state: 'GA', lat: 30.832, lng: -83.279 },
  { city: 'Montgomery', state: 'AL', lat: 32.377, lng: -86.300 },
  { city: 'Tuscaloosa', state: 'AL', lat: 33.210, lng: -87.569 },
  { city: 'Paducah', state: 'KY', lat: 37.084, lng: -88.600 },
  { city: 'Dayton', state: 'OH', lat: 39.759, lng: -84.192 },
  { city: 'Toledo', state: 'OH', lat: 41.654, lng: -83.537 },
  { city: 'Akron', state: 'OH', lat: 41.081, lng: -81.519 },
  { city: 'South Bend', state: 'IN', lat: 41.677, lng: -86.252 },
  { city: 'Savannah', state: 'GA', lat: 32.081, lng: -81.091 },
  { city: 'Tallahassee', state: 'FL', lat: 30.439, lng: -84.281 },
  { city: 'Gainesville', state: 'FL', lat: 29.652, lng: -82.325 },
  { city: 'Columbia', state: 'SC', lat: 34.000, lng: -81.035 },
  { city: 'Greenville', state: 'SC', lat: 34.852, lng: -82.394 },
  { city: 'Asheville', state: 'NC', lat: 35.595, lng: -82.551 },
  { city: 'Waco', state: 'TX', lat: 31.549, lng: -97.147 },
  { city: 'Little Rock', state: 'AR', lat: 34.746, lng: -92.290 },
  { city: 'Shreveport', state: 'LA', lat: 32.525, lng: -93.750 },
  { city: 'Jackson', state: 'MS', lat: 32.299, lng: -90.185 },
  { city: 'Baton Rouge', state: 'LA', lat: 30.451, lng: -91.187 },
  { city: 'Mobile', state: 'AL', lat: 30.695, lng: -88.040 },
  { city: 'Pensacola', state: 'FL', lat: 30.421, lng: -87.217 },
  { city: 'Albuquerque', state: 'NM', lat: 35.085, lng: -106.651 },
  { city: 'El Paso', state: 'TX', lat: 31.762, lng: -106.485 },
  { city: 'Amarillo', state: 'TX', lat: 35.222, lng: -101.831 },
  { city: 'Lubbock', state: 'TX', lat: 33.577, lng: -101.845 },
  { city: 'Boise', state: 'ID', lat: 43.615, lng: -116.202 },
  { city: 'Reno', state: 'NV', lat: 39.530, lng: -119.814 },
  { city: 'Bakersfield', state: 'CA', lat: 35.373, lng: -119.019 },
  { city: 'Fresno', state: 'CA', lat: 36.738, lng: -119.786 },
];

// State centroids (fallback when city not found)
const STATE_CENTROIDS: Record<string, { lat: number; lng: number }> = {};
for (const box of STATE_BOXES) {
  STATE_CENTROIDS[box.code] = {
    lat: (box.minLat + box.maxLat) / 2,
    lng: (box.minLng + box.maxLng) / 2,
  };
  STATE_CENTROIDS[box.name.toLowerCase()] = {
    lat: (box.minLat + box.maxLat) / 2,
    lng: (box.minLng + box.maxLng) / 2,
  };
}

/**
 * Resolve approximate lat/lng from a city name and optional state.
 * Tries exact city match first, falls back to state centroid.
 * Returns null if unresolvable.
 */
export function approximateCityCoords(
  city: string,
  state?: string | null,
): { lat: number; lng: number } | null {
  const cityLower = city.toLowerCase().trim();
  const stateUpper = state?.toUpperCase().trim();

  // Try exact city match
  for (const c of CITY_CENTROIDS) {
    if (c.city.toLowerCase() === cityLower) {
      // If state provided, match it too
      if (stateUpper && c.state !== stateUpper) continue;
      return { lat: c.lat, lng: c.lng };
    }
  }

  // Fallback: state centroid
  if (stateUpper && STATE_CENTROIDS[stateUpper]) {
    return STATE_CENTROIDS[stateUpper];
  }
  if (state) {
    const stateLower = state.toLowerCase().trim();
    if (STATE_CENTROIDS[stateLower]) {
      return STATE_CENTROIDS[stateLower];
    }
  }

  return null;
}

// ============================================================================
// NEAREST CITY LOOKUP (for fuel stop area labels)
// ============================================================================

const EARTH_RADIUS_MI = 3959;
function toRad(deg: number): number { return (deg * Math.PI) / 180; }

function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_MI * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find the nearest known city to a lat/lng within a radius.
 * Returns a label like "near Bowling Green, KY" or null if nothing close.
 */
export function approximateNearestCity(
  lat: number,
  lng: number,
  maxRadiusMiles: number = 40,
): string | null {
  let best: CityCentroid | null = null;
  let bestDist = Infinity;

  for (const c of CITY_CENTROIDS) {
    const d = haversineMi(lat, lng, c.lat, c.lng);
    if (d < bestDist && d <= maxRadiusMiles) {
      best = c;
      bestDist = d;
    }
  }

  if (!best) return null;
  return `near ${best.city}, ${best.state}`;
}
