/**
 * v4.7.0: Canonical Explore Ranking & Sections
 *
 * Produces:
 *   - rightNow[]: Diverse mix across ALL categories (1-2 per category, max 10)
 *   - sections[]: Every category as its own section with stable IDs
 *
 * Right Now picks the best item(s) from each category so users see
 * a representative cross-section of what's nearby.
 */

import { AttractionSuggestion } from '@/types/attraction';
import { dedupeAttractions } from '@/lib/explore/dedupeAttractions';

export interface ExploreSection {
  id: string;
  title: string;
  items: AttractionSuggestion[];
}

export interface ExploreSectionsResult {
  rightNow: AttractionSuggestion[];
  sections: ExploreSection[];
}

const SECTION_DEFS: { id: string; title: string; categories: string[] }[] = [
  { id: 'attractions', title: 'Signature Attractions', categories: ['Tourist Attraction', 'Theme Park', 'Entertainment', 'Tour'] },
  { id: 'dining', title: 'Dining', categories: ['Restaurant'] },
  { id: 'cafes', title: 'Cafes & Coffee', categories: ['Cafe'] },
  { id: 'nightlife', title: 'Bars & Nightlife', categories: ['Bar'] },
  { id: 'parks', title: 'Parks & Gardens', categories: ['Park'] },
  { id: 'hiking', title: 'Hiking Trails', categories: ['Hiking Trail'] },
  { id: 'culture', title: 'Museums & Culture', categories: ['Museum', 'Art Gallery', 'Visitor Center'] },
  { id: 'grocery', title: 'Grocery & Markets', categories: ['Grocery'] },
];

type TimeBucket = 'morning' | 'afternoon' | 'evening';

function getTimeBucket(): TimeBucket {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function timeBoost(category: string, bucket: TimeBucket): number {
  if (bucket === 'morning') {
    if (['Hiking Trail', 'Park'].includes(category)) return 0.3;
    if (category === 'Cafe') return 0.2;
  }
  if (bucket === 'afternoon') {
    if (['Museum', 'Tourist Attraction'].includes(category)) return 0.2;
    if (category === 'Cafe') return 0.15;
  }
  if (bucket === 'evening') {
    if (['Restaurant', 'Bar'].includes(category)) return 0.35;
    if (category === 'Entertainment') return 0.3;
  }
  return 0;
}

const OUTDOOR = new Set(['Hiking Trail', 'Park']);
const INDOOR = new Set(['Museum', 'Art Gallery', 'Restaurant', 'Cafe', 'Bar', 'Grocery', 'Entertainment']);

function weatherBias(category: string, weatherCondition?: string | null): number {
  if (!weatherCondition) return 0;
  const cond = weatherCondition.toLowerCase();
  const bad = cond.includes('rain') || cond.includes('storm') || cond.includes('snow');
  if (bad) {
    if (INDOOR.has(category)) return 0.4;
    if (OUTDOOR.has(category)) return -0.3;
  } else if (OUTDOOR.has(category)) {
    return 0.15;
  }
  return 0;
}

function computeScore(a: AttractionSuggestion, timeBucket: TimeBucket, weatherCondition?: string | null): number {
  const ratingScore = (a.rating ?? 3) / 5;
  const reviewScore = Math.min((a.reviewCount ?? 0) / 10000, 1);
  const base = ratingScore * 0.6 + reviewScore * 0.4;
  return base + timeBoost(a.category, timeBucket) + weatherBias(a.category, weatherCondition);
}

export function buildExploreSections(
  attractions: AttractionSuggestion[],
  weatherCondition?: string | null
): ExploreSectionsResult {
  const pool = dedupeAttractions(attractions);
  const timeBucket = getTimeBucket();
  const scored = pool.map((a) => ({ item: a, score: computeScore(a, timeBucket, weatherCondition) }));

  const rightNow: AttractionSuggestion[] = [];
  const categoryBuckets = new Map<string, typeof scored>();

  for (const entry of scored) {
    const cat = entry.item.category;
    if (!categoryBuckets.has(cat)) categoryBuckets.set(cat, []);
    categoryBuckets.get(cat)!.push(entry);
  }

  for (const [, bucket] of categoryBuckets) {
    bucket.sort((a, b) => b.score - a.score);
    if (bucket.length > 0) rightNow.push(bucket[0].item);
  }

  rightNow.sort((a, b) => computeScore(b, timeBucket, weatherCondition) - computeScore(a, timeBucket, weatherCondition));
  if (rightNow.length > 10) rightNow.length = 10;

  const sections: ExploreSection[] = [];
  for (const def of SECTION_DEFS) {
    const categorySet = new Set(def.categories);
    const sectionItems = scored
      .filter(({ item }) => categorySet.has(item.category))
      .sort((a, b) => b.score - a.score)
      .map(({ item }) => item);
    if (sectionItems.length > 0) sections.push({ id: def.id, title: def.title, items: sectionItems });
  }

  const allSectionCategories = new Set(SECTION_DEFS.flatMap(d => d.categories));
  const uncategorized = scored
    .filter(({ item }) => !allSectionCategories.has(item.category))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);

  if (uncategorized.length > 0) {
    sections.push({ id: 'more', title: 'More to Explore', items: uncategorized });
  }

  return { rightNow, sections };
}
