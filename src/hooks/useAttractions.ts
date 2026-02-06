/**
 * Patch 2.1.17 / 2.1.26: Hook for fetching and managing attractions data
 * - 2.1.26: Added support for GPS coordinates (lat/lng)
 */

import { useQuery } from '@tanstack/react-query';
import { getMockAttractions, filterByRadius } from '@/lib/mockAttractions';
import { AttractionSuggestion } from '@/types/attraction';

interface UseAttractionsOptions {
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
  radiusMiles?: number;
  enabled?: boolean;
}

export function useAttractions({ city, state, lat, lng, radiusMiles = 25, enabled = true }: UseAttractionsOptions) {
  // Determine if we have a valid search target (either city or coords)
  const hasCity = !!city;
  const hasCoords = lat !== undefined && lng !== undefined;
  const canSearch = hasCity || hasCoords;

  return useQuery({
    queryKey: ['attractions', city, state, lat, lng, radiusMiles],
    queryFn: async (): Promise<AttractionSuggestion[]> => {
      // Simulate network delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // For GPS coords, we'd ideally do a reverse geocode to get city
      // For now, use default attractions when using coords (mock behavior)
      if (hasCoords && !hasCity) {
        // In a real implementation, we'd call a reverse geocoding API
        // For mock purposes, return default attractions
        const attractions = getMockAttractions('default');
        return filterByRadius(attractions, radiusMiles);
      }
      
      const attractions = getMockAttractions(city || '', state);
      return filterByRadius(attractions, radiusMiles);
    },
    enabled: enabled && canSearch,
    staleTime: 0, // v2.1.26: Always fresh on each tab activation
    gcTime: 0, // Don't cache results across tab switches
  });
}
