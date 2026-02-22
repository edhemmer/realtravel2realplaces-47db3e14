/**
 * v4.5.0: Real Places Explore Hook
 *
 * Replaces mock useAttractions with real Google Places API via placesEngine.
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
}

/** Categories to query for Explore */
const EXPLORE_CATEGORIES: { category: PlacesCategory; displayCategory: string; limit: number }[] = [
  { category: 'attractions', displayCategory: 'Tourist Attraction', limit: 20 },
  { category: 'food', displayCategory: 'Restaurant', limit: 20 },
  { category: 'cafe', displayCategory: 'Cafe', limit: 15 },
  { category: 'nightlife', displayCategory: 'Bar', limit: 15 },
  { category: 'nature', displayCategory: 'Park', limit: 15 },
  { category: 'hiking', displayCategory: 'Hiking Trail', limit: 15 },
  { category: 'culture', displayCategory: 'Museum', limit: 15 },
  { category: 'grocery', displayCategory: 'Grocery', limit: 10 },
];

function placeToAttraction(place: PlaceResult, displayCategory: string, index: number): AttractionSuggestion {
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
    distanceMiles: undefined,
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
}: UseRealPlacesExploreOptions) {
  const hasCoords = lat !== undefined && lng !== undefined;

  return useQuery({
    queryKey: ['real-places-explore', lat, lng, radiusMiles, query || ''],
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

          return result.results.map((place, i) =>
            placeToAttraction(place, displayCategory, i)
          );
        })
      );

      // Flatten — dedupe within each category but allow same place in different categories
      // so that e.g. a park that's also a tourist attraction appears in both sections
      const allItems: AttractionSuggestion[] = [];
      const seenPerCategory = new Map<string, Set<string>>();
      
      for (const categoryResults of results) {
        for (const item of categoryResults) {
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
