/**
 * Reverse-geocode device coordinates → canonical LocationStructured.
 *
 * Used by the Drive Trip create flow's "Use my current location" affordance.
 * Calls OSM Nominatim public API (free, keyless) — volume is minimal (one
 * call per user tap), so client-side direct fetch is acceptable here.
 */

import type { LocationStructured } from './types';

interface NominatimResponse {
  lat: string;
  lon: string;
  display_name?: string;
  place_id?: number;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    suburb?: string;
    state?: string;
    state_code?: string;
    'ISO3166-2-lvl4'?: string; // e.g. "US-IL"
    country?: string;
    country_code?: string; // lowercase
  };
}

export async function reverseGeocodeToLocation(
  coords: { lat: number; lng: number },
): Promise<LocationStructured | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(coords.lat));
    url.searchParams.set('lon', String(coords.lng));
    url.searchParams.set('zoom', '10'); // city level
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data: NominatimResponse = await res.json();
    const addr = data.address || {};

    const cityName =
      addr.city || addr.town || addr.village || addr.hamlet || addr.municipality || addr.suburb || '';
    if (!cityName) return null;

    // Prefer ISO3166-2 subdivision suffix (e.g. "US-IL" → "IL")
    let regionCode = '';
    const iso = addr['ISO3166-2-lvl4'];
    if (iso && iso.includes('-')) regionCode = iso.split('-')[1] || '';
    if (!regionCode) regionCode = addr.state_code || addr.state || '';

    const countryCode = (addr.country_code || '').toUpperCase() || 'US';
    const formatted =
      data.display_name ||
      [cityName, regionCode, countryCode].filter(Boolean).join(', ');

    return {
      countryCode,
      regionCode,
      cityName,
      provider: 'OSM_NOMINATIM',
      providerId: data.place_id ? String(data.place_id) : `${coords.lat},${coords.lng}`,
      lat: coords.lat,
      lng: coords.lng,
      formatted,
    };
  } catch {
    return null;
  }
}
