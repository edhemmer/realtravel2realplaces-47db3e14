import type { AttractionSuggestion } from '@/types/attraction';

/**
 * Deduplicate provider-backed place results without depending on fixtures or mock data.
 * Prefer stable provider identity; fall back to normalized name + location.
 */
export function dedupeAttractions(items: AttractionSuggestion[]): AttractionSuggestion[] {
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const unique: AttractionSuggestion[] = [];

  for (const item of items) {
    const id = item.id?.trim();
    const fallbackKey = `${item.name || ''}|${item.locationSummary || ''}`
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    if (id && seenIds.has(id)) continue;
    if (fallbackKey && seenKeys.has(fallbackKey)) continue;

    if (id) seenIds.add(id);
    if (fallbackKey) seenKeys.add(fallbackKey);
    unique.push(item);
  }

  return unique;
}
