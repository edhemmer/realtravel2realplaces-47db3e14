/**
 * v4.4.x: Explore Category Pagination Engine
 *
 * Per-category page state management for the Explore feed.
 * Appends new items without resorting existing ones.
 * Uses existing dedupe logic from mockAttractions.
 */

import { AttractionSuggestion } from '@/types/attraction';
import { dedupeAttractions } from '@/lib/mockAttractions';

// ============================================================================
// TYPES
// ============================================================================

export interface CategoryPageState {
  items: AttractionSuggestion[];
  hasMore: boolean;
  pageIndex: number;
  isLoadingMore: boolean;
}

export type CategoryPaginationMap = Record<string, CategoryPageState>;

/** Page size for "More" loads */
export const CATEGORY_PAGE_SIZE = 10;

/** Initial visible count per section (matches ExploreSectionFeed INITIAL_SHOW) */
export const INITIAL_VISIBLE = 3;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Initialize pagination state from sections produced by buildExploreSections.
 * Each section gets its full item pool stored, with hasMore based on pool size.
 */
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

/**
 * Compute visible items for a category based on current page state.
 * Page 0 shows INITIAL_VISIBLE, each subsequent page adds CATEGORY_PAGE_SIZE.
 */
export function getVisibleItems(state: CategoryPageState): AttractionSuggestion[] {
  const visibleCount = INITIAL_VISIBLE + state.pageIndex * CATEGORY_PAGE_SIZE;
  return state.items.slice(0, visibleCount);
}

/**
 * Advance pagination for a category. Returns updated state.
 * Dedupes appended items against existing ones.
 */
export function advanceCategoryPage(
  current: CategoryPageState,
  additionalItems?: AttractionSuggestion[]
): CategoryPageState {
  const nextPageIndex = current.pageIndex + 1;
  const nextVisibleCount = INITIAL_VISIBLE + nextPageIndex * CATEGORY_PAGE_SIZE;

  let allItems = current.items;

  // If additional items provided (from deeper engine queries), append with dedupe
  if (additionalItems && additionalItems.length > 0) {
    const combined = [...current.items, ...additionalItems];
    allItems = dedupeAttractions(combined);
  }

  return {
    items: allItems,
    hasMore: allItems.length > nextVisibleCount,
    pageIndex: nextPageIndex,
    isLoadingMore: false,
  };
}
