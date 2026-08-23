/**
 * v4.4.x: Explore Category Pagination Engine
 *
 * Per-category page state management for the Explore feed.
 * Appends new provider-backed items without resorting existing ones.
 */

import { AttractionSuggestion } from '@/types/attraction';
import { dedupeAttractions } from '@/lib/explore/dedupeAttractions';

export interface CategoryPageState {
  items: AttractionSuggestion[];
  hasMore: boolean;
  pageIndex: number;
  isLoadingMore: boolean;
}

export type CategoryPaginationMap = Record<string, CategoryPageState>;

/** Page size for "More" loads — reveals up to 30 results per category */
export const CATEGORY_PAGE_SIZE = 15;

/** Initial visible count per section (matches ExploreSectionFeed INITIAL_SHOW) */
export const INITIAL_VISIBLE = 3;

/** Initialize pagination state from sections produced by buildExploreSections. */
export function initCategoryPagination(
  sections: { id: string; items: AttractionSuggestion[] }[]
): CategoryPaginationMap {
  const map: CategoryPaginationMap = {};
  for (const section of sections) {
    map[section.id] = {
      items: section.items,
      hasMore: section.items.length > INITIAL_VISIBLE,
      pageIndex: 0,
      isLoadingMore: false,
    };
  }
  return map;
}

/** Compute visible items for a category based on current page state. */
export function getVisibleItems(state: CategoryPageState): AttractionSuggestion[] {
  const visibleCount = INITIAL_VISIBLE + state.pageIndex * CATEGORY_PAGE_SIZE;
  return state.items.slice(0, visibleCount);
}

/** Advance pagination for a category, deduplicating any newly fetched provider items. */
export function advanceCategoryPage(
  current: CategoryPageState,
  additionalItems?: AttractionSuggestion[]
): CategoryPageState {
  const nextPageIndex = current.pageIndex + 1;
  const nextVisibleCount = INITIAL_VISIBLE + nextPageIndex * CATEGORY_PAGE_SIZE;

  let allItems = current.items;
  if (additionalItems && additionalItems.length > 0) {
    allItems = dedupeAttractions([...current.items, ...additionalItems]);
  }

  return {
    items: allItems,
    hasMore: allItems.length > nextVisibleCount,
    pageIndex: nextPageIndex,
    isLoadingMore: false,
  };
}
