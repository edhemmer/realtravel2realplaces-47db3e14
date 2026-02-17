/**
 * v3.11.3: Places Service — Separate from DriveEngine
 *
 * Fetches nearby places via backend edge function.
 * Never imported by DriveEngine. UI-only consumption.
 * Fail-safe: returns empty array on any error.
 */

import { supabase } from '@/integrations/supabase/client';

export interface NearbyPlace {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  lat: number;
  lng: number;
}

export type PlaceType = 'gas_station' | 'restaurant';

interface FetchNearbyPlacesParams {
  lat: number;
  lng: number;
  type: PlaceType;
  radiusMiles?: number;
  limit?: number;
}

/**
 * Fetch nearby places via the places-search edge function.
 * Fail-safe: returns empty array on error, never throws.
 */
export async function fetchNearbyPlaces({
  lat,
  lng,
  type,
  radiusMiles = 8,
  limit = 8,
}: FetchNearbyPlacesParams): Promise<NearbyPlace[]> {
  try {
    const { data, error } = await supabase.functions.invoke('nearby-places', {
      body: {
        lat,
        lng,
        type,
        radiusMeters: Math.round(radiusMiles * 1609.34),
        limit,
      },
    });

    if (error || !data?.places) {
      console.warn('[PlacesService] Failed to fetch places:', error?.message || 'No data');
      return [];
    }

    return (data.places as NearbyPlace[]).slice(0, limit);
  } catch (err) {
    console.warn('[PlacesService] Unexpected error:', err);
    return [];
  }
}
