/**
 * v3.11.4: Places Service — Low-Level Provider Wrapper
 *
 * Thin wrapper around the nearby-places edge function.
 * Only imported by placesEngine.ts — no direct usage by UI components.
 * Fail-safe: returns empty array on any error, never throws.
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

export type PlaceType = 'gas_station' | 'restaurant' | 'convenience_store' | 'tourist_attraction' | 'museum' | 'park' | 'bar' | 'cafe' | 'art_gallery' | 'amusement_park' | 'night_club';

interface FetchNearbyPlacesParams {
  lat: number;
  lng: number;
  type: PlaceType;
  radiusMiles?: number;
  limit?: number;
}

/**
 * Low-level fetch via the nearby-places edge function.
 * Consumed by placesEngine only — not by UI components directly.
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
