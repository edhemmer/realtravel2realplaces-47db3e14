/**
 * v3.6.0: Canonical Explore Ranking & Sections helper
 *
 * Consumes v3.5.2 engine results and produces:
 *   - rightNow[]: 4-8 high-confidence items for horizontal carousel
 *   - sections[]: categorized vertical feed with stable IDs
 *
 * Applies:
 *   - Final-stage dedupe (defensive, across all sections)
 *   - Time-of-day context boosts (morning/afternoon/evening)
 *   - Weather-aware biasing (indoor vs outdoor) if data available
 *   - Graceful fallback to v3.5.2 ordering when context missing
 */

import { AttractionSuggestion } from '@/types/attraction';
import { dedupeAttractions, rankAttractions } from '@/lib/mockAttractions';

// ============================================================================
// TYPES
// ============================================================================

export interface ExploreSection {
  id: string;
  title: string;
  items: AttractionSuggestion[];
}

export interface ExploreSectionsResult {
  rightNow: AttractionSuggestion[];
  sections: ExploreSection[];
}

// ============================================================================
// CATEGORY MAPPING
// ============================================================================

const SECTION_DEFS: { id: string; title: string; categories: string[] }[] = [
  {
    id: 'signature',
    title: 'Signature Attractions',
    categories: ['Tourist Attraction', 'Theme Park', 'Entertainment', 'Tour'],
  },
  {
    id: 'nature',
    title: 'Nature & Trails',
    categories: ['Hike', 'Nature Reserve', 'Park'],
  },
  {
    id: 'viewpoints',
    title: 'Viewpoints & Scenic',
    categories: ['Viewpoint'],
  },
  {
    id: 'culture',
    title: 'Museums & Culture',
    categories: ['Museum', 'Art Gallery', 'Visitor Center'],
  },
  {
    id: 'historic',
    title: 'Historic & Landmarks',
    categories: ['Landmark', 'Historic Site', 'Monument'],
  },
];

// ============================================================================
// TIME-OF-DAY BUCKETING
// ============================================================================

type TimeBucket = 'morning' | 'afternoon' | 'evening';

function getTimeBucket(): TimeBucket {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/** Small score boost for time-relevant categories */
function timeBoost(category: string, bucket: TimeBucket): number {
  if (bucket === 'morning') {
    // Hikes, nature best in morning
    if (['Hike', 'Nature Reserve', 'Park', 'Viewpoint'].includes(category)) return 0.3;
  }
  if (bucket === 'afternoon') {
    // Museums, indoor activities good for afternoon
    if (['Museum', 'Art Gallery', 'Visitor Center', 'Tourist Attraction'].includes(category)) return 0.2;
  }
  if (bucket === 'evening') {
    // Entertainment, dining-adjacent
    if (['Entertainment', 'Tour'].includes(category)) return 0.3;
    if (['Viewpoint'].includes(category)) return 0.15; // sunset viewpoints
  }
  return 0;
}

// ============================================================================
// WEATHER BIASING
// ============================================================================

const OUTDOOR_CATEGORIES = new Set([
  'Hike', 'Nature Reserve', 'Park', 'Viewpoint', 'Landmark', 'Monument',
]);

const INDOOR_CATEGORIES = new Set([
  'Museum', 'Art Gallery', 'Visitor Center', 'Entertainment', 'Theme Park',
]);

function weatherBias(
  category: string,
  weatherCondition?: string | null
): number {
  if (!weatherCondition) return 0;
  const cond = weatherCondition.toLowerCase();
  const isRainy = cond.includes('rain') || cond.includes('shower') || cond.includes('storm');
  const isSnowy = cond.includes('snow') || cond.includes('ice') || cond.includes('sleet');
  const isBadWeather = isRainy || isSnowy;

  if (isBadWeather) {
    if (INDOOR_CATEGORIES.has(category)) return 0.4; // boost indoor
    if (OUTDOOR_CATEGORIES.has(category)) return -0.3; // penalize outdoor
  } else {
    // Good weather: slight outdoor boost
    if (OUTDOOR_CATEGORIES.has(category)) return 0.15;
  }
  return 0;
}

// ============================================================================
// COMPOSITE SCORING
// ============================================================================

function computeScore(
  a: AttractionSuggestion,
  timeBucket: TimeBucket,
  weatherCondition?: string | null
): number {
  // Base: inverse distance (closer = higher), then rating, then reviews
  const distScore = 1 / (1 + (a.distanceMiles ?? 50));
  const ratingScore = (a.rating ?? 3) / 5;
  const reviewScore = Math.min((a.reviewCount ?? 0) / 10000, 1);

  const base = distScore * 0.5 + ratingScore * 0.3 + reviewScore * 0.2;
  const tBoost = timeBoost(a.category, timeBucket);
  const wBias = weatherBias(a.category, weatherCondition);

  return base + tBoost + wBias;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Produce sections from v3.5.2 ranked results.
 * @param attractions - Already deduped + ranked from v3.5.2 engine
 * @param weatherCondition - Optional current weather condition string
 */
export function buildExploreSections(
  attractions: AttractionSuggestion[],
  weatherCondition?: string | null
): ExploreSectionsResult {
  // Defensive dedupe
  const pool = dedupeAttractions(attractions);

  const timeBucket = getTimeBucket();

  // Score all items
  const scored = pool.map((a) => ({
    item: a,
    score: computeScore(a, timeBucket, weatherCondition),
  }));

  // Sort by score desc for "Right Now" picks
  const sortedByScore = [...scored].sort((a, b) => b.score - a.score);

  // Track used IDs to prevent cross-section duplication
  const usedIds = new Set<string>();

  // === RIGHT NOW: top 4-8 high-confidence items ===
  const rightNow: AttractionSuggestion[] = [];
  for (const { item } of sortedByScore) {
    if (rightNow.length >= 8) break;
    if (!usedIds.has(item.id)) {
      rightNow.push(item);
      usedIds.add(item.id);
    }
  }

  // === SECTIONS ===
  const sections: ExploreSection[] = [];

  for (const def of SECTION_DEFS) {
    const categorySet = new Set(def.categories);

    // Get items matching this section, sorted by score
    const sectionScored = scored
      .filter(({ item }) => categorySet.has(item.category) && !usedIds.has(item.id))
      .sort((a, b) => b.score - a.score);

    const sectionItems = sectionScored.map(({ item }) => item);

    if (sectionItems.length === 0) continue;

    // Mark as used
    for (const item of sectionItems) {
      usedIds.add(item.id);
    }

    sections.push({
      id: def.id,
      title: def.title,
      items: sectionItems,
    });
  }

  // Catch any uncategorized items and add to nearest section or create "More to Explore"
  const uncategorized = scored
    .filter(({ item }) => !usedIds.has(item.id))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);

  if (uncategorized.length > 0) {
    sections.push({
      id: 'more',
      title: 'More to Explore',
      items: uncategorized,
    });
  }

  return { rightNow, sections };
}
