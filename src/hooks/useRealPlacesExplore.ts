/**
 * v4.5.0: Real Places Explore Hook
 *
 * Replaces mock useAttractions with real place-data results via placesEngine.
 * Queries multiple categories in parallel and maps to AttractionSuggestion[].
 */

import { useQuery } from '@tanstack/react-query';
import { queryPlaces, PlacesCategory, PlaceResult } from '@/lib/places/placesEngine';
import { AttractionSuggestion } from '@/types/attraction';

interface UseRealPlacesExploreOptions {
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  query?: string;
  enabled?: boolean;
  /** Optional context key to force query differentiation (e.g. selected area) */
  contextKey?: string;
}

/** Categories to query for Explore */
const EXPLORE_CATEGORIES: { category: PlacesCategory; displayCategory: string; limit: number }[] = [
  { category: 'attractions', displayCategory: 'Tourist Attraction', limit: 30 },
  { category: 'food', displayCategory: 'Restaurant', limit: 30 },
  { category: 'cafe', displayCategory: 'Cafe', limit: 25 },
  { category: 'nightlife', displayCategory: 'Bar', limit: 25 },
  { category: 'nature', displayCategory: 'Park', limit: 25 },
  { category: 'hiking', displayCategory: 'Hiking Trail', limit: 25 },
  { category: 'culture', displayCategory: 'Museum', limit: 25 },
  { category: 'grocery', displayCategory: 'Grocery', limit: 20 },
];

/** Haversine distance in miles */
function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function placeToAttraction(place: PlaceResult, displayCategory: string, originLat: number, originLng: number): AttractionSuggestion {
  const dist = (place.lat && place.lng) ? haversineMi(originLat, originLng, place.lat, place.lng) : undefined;
  return {
    id: place.placeId,
    name: place.name,
    shortDescription: place.address || 'Nearby place',
    category: displayCategory,
    thumbnailUrl: place.photoUrl ?? null,
    priceLevel: 'unknown',
    bookingInfo: {
      ticketRequired: false,
      advanceRecommended: false,
      bookingPattern: 'unknown',
    },
    locationSummary: place.address,
    rating: place.rating,
    reviewCount: place.reviewCount,
    distanceMiles: dist ? Math.round(dist * 10) / 10 : undefined,
  };
}

function filterByQuery(items: AttractionSuggestion[], query: string): AttractionSuggestion[] {
  const q = query.toLowerCase();
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.shortDescription.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
  );
}

export function useRealPlacesExplore({
  lat,
  lng,
  radiusMiles = 25,
  query,
  enabled = true,
  contextKey,
}: UseRealPlacesExploreOptions) {
  const hasCoords = lat !== undefined && lng !== undefined;

  // Round coords to ~110m grid (3 decimals) so small GPS drift / walking
  // doesn't bust the cache key and trigger a new fan-out of API calls.
  const latKey = hasCoords ? Math.round(lat! * 1000) / 1000 : undefined;
  const lngKey = hasCoords ? Math.round(lng! * 1000) / 1000 : undefined;

  return useQuery({
    queryKey: ['real-places-explore', latKey, lngKey, radiusMiles, query || '', contextKey || 'default'],
    queryFn: async (): Promise<AttractionSuggestion[]> => {
      if (!hasCoords || lat === undefined || lng === undefined) return [];

      // Query all categories in parallel
      const results = await Promise.all(
        EXPLORE_CATEGORIES.map(async ({ category, displayCategory, limit }) => {
          const result = await queryPlaces({
            origin: { lat, lng },
            category,
            radiusMiles,
            limit,
            planContext: 'free',
            sourceContext: 'explore',
          });

          if (result.status !== 'OK') return [];

          return result.results.map((place) =>
            placeToAttraction(place, displayCategory, lat, lng)
          );
        })
      );

      // Flatten — dedupe within each category
      const allItems: AttractionSuggestion[] = [];
      const seenPerCategory = new Map<string, Set<string>>();
      
      for (const categoryResults of results) {
        for (const item of categoryResults) {
          // Client-side radius enforcement: drop items beyond selected radius
          if (item.distanceMiles !== undefined && item.distanceMiles > radiusMiles) continue;

          const catSet = seenPerCategory.get(item.category) ?? new Set();
          if (catSet.has(item.id)) continue;
          catSet.add(item.id);
          seenPerCategory.set(item.category, catSet);
          allItems.push(item);
        }
      }

      // Apply keyword filter if present
      const filtered = query ? filterByQuery(allItems, query) : allItems;

      // Sort by rating desc
      return filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    },
    enabled: enabled && hasCoords,
    staleTime: 5 * 60 * 1000, // 5 min
    gcTime: 10 * 60 * 1000,
  });
}
