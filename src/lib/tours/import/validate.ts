/**
 * v3.8.5: Tour Import Validation + Apply
 * 
 * Validates parsed items and creates canonical tour stops.
 * Only items with zero BLOCKING issues can be imported.
 */

import { TourImportItem, hasBlockingIssues } from './types';
import { isLocationComplete } from '@/lib/location/types';

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate all items and add/update issues.
 * Returns a new array with issues populated.
 */
export function validateItems(items: TourImportItem[]): TourImportItem[] {
  return items.map(item => {
    // Start fresh with only non-date/location issues
    const existingIssues = item.issues.filter(
      i => !['MISSING_DATE', 'MISSING_LOCATION', 'MISSING_TITLE'].includes(i.code)
    );
    const issues = [...existingIssues];

    // Date is required
    if (!item.date) {
      issues.push({
        type: 'BLOCKING',
        code: 'MISSING_DATE',
        message: 'Date is required. Please enter a valid date.',
      });
    }

    // Location must be fully resolved
    if (!isLocationComplete(item.location)) {
      issues.push({
        type: 'BLOCKING',
        code: 'MISSING_LOCATION',
        message: 'Location must be selected from search results.',
      });
    }

    // Title is nice to have
    if (!item.title?.trim()) {
      issues.push({
        type: 'WARNING',
        code: 'MISSING_TITLE',
        message: 'No title provided. A default name will be used.',
      });
    }

    return { ...item, issues };
  });
}

// ============================================================================
// APPLY
// ============================================================================

export interface ApplyResult {
  imported: number;
  skipped: number;
  errors: string[];
}

/**
 * Build the engagement insert payloads for importable items.
 * Only items with zero BLOCKING issues are included.
 */
export function buildEngagementPayloads(
  items: TourImportItem[],
  tripId: string,
): Array<{
  trip_id: string;
  name: string;
  date: string;
  start_time: string;
  end_time: null;
  location: string | null;
  address: string | null;
  notes: string | null;
  origin: 'parsed';
}> {
  return items
    .filter(item => !hasBlockingIssues(item))
    .map(item => ({
      trip_id: tripId,
      name: item.title?.trim() || item.venue?.trim() || 'Imported Stop',
      date: item.date!,
      start_time: item.time ? `${item.time}:00` : '00:00:00',
      end_time: null,
      location: item.location?.formatted || item.rawLocationText || null,
      address: item.location ? `${item.location.cityName}, ${item.location.regionCode}` : null,
      notes: item.notes || null,
      origin: 'parsed' as const,
    }));
}
