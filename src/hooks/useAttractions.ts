/**
 * v3.5.2: Canonical Attractions Retrieval Engine
 *
 * Multi-query coverage across intent categories, progressive radius
 * expansion, deduplication, and distance-based ranking.
 *
 * v4.0: Optional query parameter for keyword-based search.
 *
 * Progressive Radius Steps:
 *   Step 1: 10 mi  → need ≥25 unique results
 *   Step 2: 25 mi  → need ≥40 unique results
 *   Step 3: 50 mi  → stop (accept whatever count)
 *
 * Dedupe by id, then normalized(name + location).
 * Rank by distance asc → rating desc → reviewCount desc.
 */

import { useQuery } from '@tanstack/react-query';
import {
  getMockAttractions,
  filterByRadius,
  filterByQuery,
  dedupeAttractions,
  rankAttractions,
} from '@/lib/mockAttractions';
import { AttractionSuggestion } from '@/types/attraction';

interface UseAttractionsOptions {
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
  /** User-selected display radius (does NOT limit engine minimum depth) */
  radiusMiles?: number;
  /** Optional keyword search query */
  query?: string;
  enabled?: boolean;
}

/** Progressive radius steps for depth guarantee */
const RADIUS_STEPS = [10, 25, 50] as const;
const MIN_RESULTS_PER_STEP = [25, 40, 0] as const; // 0 = accept any at final step

export function useAttractions({
  city,
  state,
  lat,
  lng,
  radiusMiles = 25,
  query,
  enabled = true,
}: UseAttractionsOptions) {
  const hasCity = !!city;
  const hasCoords = lat !== undefined && lng !== undefined;
  const canSearch = hasCity || hasCoords;

  return useQuery({
    queryKey: ['attractions', city, state, lat, lng, radiusMiles, query || ''],
    queryFn: async (): Promise<AttractionSuggestion[]> => {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Step 1: Fetch full pool of attractions (multi-category built into getMockAttractions)
      const fullPool = hasCoords && !hasCity
        ? getMockAttractions('default')
        : getMockAttractions(city || '', state);

      // Step 1b: Apply keyword filter if query is present
      const queryFiltered = query ? filterByQuery(fullPool, query) : fullPool;

      // Step 2: Progressive radius expansion
      // Use the larger of user-selected radius or engine minimum to guarantee depth
      let results: AttractionSuggestion[] = [];

      for (let step = 0; step < RADIUS_STEPS.length; step++) {
        const stepRadius = RADIUS_STEPS[step];
        // Use the maximum of the step radius and user-selected radius
        const effectiveRadius = Math.max(stepRadius, radiusMiles);

        const filtered = filterByRadius(queryFiltered, effectiveRadius);
        const deduped = dedupeAttractions(filtered);

        results = deduped;

        const minRequired = MIN_RESULTS_PER_STEP[step];
        if (minRequired === 0 || results.length >= minRequired) {
          break; // Sufficient depth achieved
        }
      }

      // If user selected a smaller radius than engine, also provide the
      // narrower view but ONLY if it has enough results; otherwise use expanded
      if (radiusMiles < RADIUS_STEPS[RADIUS_STEPS.length - 1]) {
        const narrowFiltered = filterByRadius(results, radiusMiles);
        if (narrowFiltered.length >= 10) {
          results = narrowFiltered;
        }
        // Otherwise keep the expanded results for depth
      }

      // Step 3: Final dedupe + rank
      results = dedupeAttractions(results);
      results = rankAttractions(results);

      return results;
    },
    enabled: enabled && canSearch,
    staleTime: 0,
    gcTime: 0,
  });
}
