/**
 * v3.8.4: Places Provider Interface + OSM Photon Implementation
 * 
 * Provider-abstract interface for city autocomplete.
 * Currently implements OSM Photon (free, keyless).
 * Stub for Google Places included for future migration.
 */

import { PlacesProviderType } from './types';

// ============================================================================
// PROVIDER INTERFACE
// ============================================================================

export interface PlaceCandidate {
  provider: PlacesProviderType;
  providerId: string;
  /** Primary display text (city name) */
  primary: string;
  /** Secondary display text (state, country) */
  secondary: string;
  /** Full formatted string */
  formatted: string;
  lat: number;
  lng: number;
  /** Region/state code extracted from result */
  regionCode: string;
  /** Country code extracted from result */
  countryCode: string;
}

export interface PlacesSearchParams {
  countryCode: string;
  regionCode: string;
  query: string;
}

export interface PlacesProvider {
  searchCities(params: PlacesSearchParams): Promise<PlaceCandidate[]>;
}

// ============================================================================
// ACTIVE PROVIDER (calls server-side proxy)
// ============================================================================

import { supabase } from '@/integrations/supabase/client';

/**
 * Server-proxied places provider.
 * Calls the places-search edge function which handles rate limiting and caching.
 */
export const serverPlacesProvider: PlacesProvider = {
  async searchCities(params: PlacesSearchParams): Promise<PlaceCandidate[]> {
    try {
      const { data, error } = await supabase.functions.invoke('places-search', {
        body: params,
      });

      if (error) {
        console.error('[LocationProvider] Edge function error:', error);
        return [];
      }

      if (data?.success && Array.isArray(data.candidates)) {
        return data.candidates as PlaceCandidate[];
      }

      return [];
    } catch (err) {
      console.error('[LocationProvider] Unexpected error:', err);
      return [];
    }
  },
};

// ============================================================================
// GOOGLE PLACES STUB (future migration)
// ============================================================================

/**
 * TODO: Wire Google Places API when PAYG keys are available.
 * 
 * Implementation notes:
 * - Will require GOOGLE_PLACES_API_KEY secret in edge function
 * - Endpoint: POST https://places.googleapis.com/v1/places:searchText
 * - Use includedType: 'locality' to constrain to cities
 * - Use regionCode param for state/province constraint
 * - Returns placeId, displayName, location (lat/lng)
 */
// export const googlePlacesProvider: PlacesProvider = { ... };
