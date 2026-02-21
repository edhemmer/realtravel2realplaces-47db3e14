/**
 * v4.4.x: Per-category Explore pagination hook
 *
 * Tracks pagination state for each Explore section independently.
 * Shared across all Explore entry points via tripId scoping.
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { ExploreSection } from '@/lib/exploreRankingSections';
import {
  CategoryPaginationMap,
  CategoryPageState,
  initCategoryPagination,
  advanceCategoryPage,
  getVisibleItems,
  INITIAL_VISIBLE,
  CATEGORY_PAGE_SIZE,
} from '@/lib/explore/explorePagination';

export interface PaginatedSection extends ExploreSection {
  hasMore: boolean;
  isLoadingMore: boolean;
}

export function useExplorePagination(sections: ExploreSection[], tripId: string) {
  const [paginationMap, setPaginationMap] = useState<CategoryPaginationMap>({});
  const prevSectionsRef = useRef<string>('');

  // Re-initialize when sections change (new search, new trip, refresh)
  useEffect(() => {
    const sectionKey = sections.map(s => `${s.id}:${s.items.length}`).join('|');
    if (sectionKey !== prevSectionsRef.current) {
      prevSectionsRef.current = sectionKey;
      setPaginationMap(initCategoryPagination(sections));
    }
  }, [sections]);

  // Load more for a specific category
  const loadMore = useCallback((sectionId: string) => {
    setPaginationMap(prev => {
      const current = prev[sectionId];
      if (!current || !current.hasMore) return prev;

      // Set loading state
      const withLoading: CategoryPaginationMap = {
        ...prev,
        [sectionId]: { ...current, isLoadingMore: true },
      };

      // Simulate async (consistent with useAttractions mock delay pattern)
      // In production with real providers, this would be an actual API call
      setTimeout(() => {
        setPaginationMap(p => {
          const c = p[sectionId];
          if (!c) return p;
          return {
            ...p,
            [sectionId]: advanceCategoryPage(c),
          };
        });
      }, 200);

      return withLoading;
    });
  }, []);

  // Build paginated sections with visible items
  const paginatedSections: PaginatedSection[] = useMemo(() => {
    return sections.map(section => {
      const pageState = paginationMap[section.id];
      if (!pageState) {
        return {
          ...section,
          items: section.items.slice(0, INITIAL_VISIBLE),
          hasMore: section.items.length > INITIAL_VISIBLE,
          isLoadingMore: false,
        };
      }

      return {
        id: section.id,
        title: section.title,
        items: getVisibleItems(pageState),
        hasMore: pageState.hasMore,
        isLoadingMore: pageState.isLoadingMore,
      };
    });
  }, [sections, paginationMap]);

  return { paginatedSections, loadMore };
}
