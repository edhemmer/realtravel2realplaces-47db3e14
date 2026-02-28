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
