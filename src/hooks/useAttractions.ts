/**
 * Patch 2.1.17: Hook for fetching and managing attractions data
 */

import { useQuery } from '@tanstack/react-query';
import { getMockAttractions, filterByRadius } from '@/lib/mockAttractions';
import { AttractionSuggestion } from '@/types/attraction';

interface UseAttractionsOptions {
  city: string;
  state?: string;
  radiusMiles?: number;
  enabled?: boolean;
}

export function useAttractions({ city, state, radiusMiles = 25, enabled = true }: UseAttractionsOptions) {
  return useQuery({
    queryKey: ['attractions', city, state, radiusMiles],
    queryFn: async (): Promise<AttractionSuggestion[]> => {
      // Simulate network delay for realistic UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const attractions = getMockAttractions(city, state);
      return filterByRadius(attractions, radiusMiles);
    },
    enabled: enabled && !!city,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
