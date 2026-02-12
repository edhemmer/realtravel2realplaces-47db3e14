/**
 * v2.0.8: Unified Display Formatting Utilities
 * 
 * SINGLE SOURCE OF TRUTH for date, time, and currency display formats.
 * All UI components MUST use these helpers for consistent presentation.
 * 
 * v2.2.4: All time display now uses direct digit extraction from stored
 * datetime strings via formatLocalTimeDirect / formatLocalDateDirect.
 * This prevents browser timezone shifts on timestamptz values.
 */

import { format, parseISO, isSameYear } from 'date-fns';
import { UNKNOWN_TIME_PLACEHOLDER, parseDatetimeForDisplay, hasExplicitTime } from './datetimeIntegrity';
import { formatLocalTimeDirect, formatLocalDateDirect } from './canonicalTimeNormalizer';

// ============================================================================
// TRIP DATE RANGE FORMATTING
// ============================================================================

/**
 * Format trip date range in a consistent, readable format.
 * 
 * PATTERN: "Feb 10–15, 2026" (same year) or "Dec 28, 2025 – Jan 3, 2026" (cross-year)
 * 
 * Use this everywhere trip-level dates are displayed:
 * - Dashboard trip cards
 * - SummaryTab destination header
 * - Trip Report header
 * - TripStatusHeroBar (if dates shown)
 */
export function formatTripDateRange(startDate: string, endDate: string): string {
  const start = parseISO(startDate);
  const end = parseISO(endDate);
  
  // Same year: "Feb 10–15, 2026"
  if (isSameYear(start, end)) {
    const startMonth = format(start, 'MMM');
    const endMonth = format(end, 'MMM');
    
    // Same month: "Feb 10–15, 2026"
    if (startMonth === endMonth) {
      return `${startMonth} ${format(start, 'd')}–${format(end, 'd')}, ${format(end, 'yyyy')}`;
    }
    
    // Different months: "Feb 10 – Mar 3, 2026"
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}, ${format(end, 'yyyy')}`;
  }
  
  // Cross-year: "Dec 28, 2025 – Jan 3, 2026"
  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
}

/**
 * Format trip date range with duration suffix.
 * 
 * PATTERN: "Feb 10–15, 2026 • 6 days"
 */
export function formatTripDateRangeWithDuration(
  startDate: string, 
  endDate: string, 
  durationDays: number
): string {
  const dateRange = formatTripDateRange(startDate, endDate);
  const daysLabel = durationDays === 1 ? '1 day' : `${durationDays} days`;
  return `${dateRange} • ${daysLabel}`;
}

// ============================================================================
// EVENT TIME FORMATTING
// ============================================================================

/**
 * User's preferred datetime format type
 */
export type DatetimeFormatPreference = 'MM/DD/YYYY 12h' | 'DD/MM/YYYY 24h' | null | undefined;

/**
 * Format event time for timeline display.
 * 
 * PATTERN (12h): "3:45 PM" or "--:--" for unknown
 * PATTERN (24h): "15:45" or "--:--" for unknown
 * 
 * Use this for:
 * - SummaryTab timeline event times
 * - UpcomingEventsWidget times
 * - Trip Report timeline
 */
export function formatEventTime(
  datetime: string | Date,
  preferredFormat: DatetimeFormatPreference = 'MM/DD/YYYY 12h'
): string {
  // v2.2.4: For Date objects, extract local time components directly
  // instead of using toISOString() which converts to UTC and shifts times.
  if (datetime instanceof Date) {
    const hours = datetime.getHours();
    const minutes = datetime.getMinutes();
    // Midnight = likely defaulted, not explicit
    if (hours === 0 && minutes === 0) return UNKNOWN_TIME_PLACEHOLDER;
    
    const use24h = preferredFormat === 'DD/MM/YYYY 24h';
    if (use24h) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    return `${h12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }
  
  // For strings: check if original has explicit time
  if (!hasExplicitTime(datetime)) {
    return UNKNOWN_TIME_PLACEHOLDER;
  }
  
  // Use direct digit extraction to avoid browser timezone shifts.
  const use24h = preferredFormat === 'DD/MM/YYYY 24h';
  const directTime = formatLocalTimeDirect(datetime, use24h);
  if (directTime) return directTime;
  
  return UNKNOWN_TIME_PLACEHOLDER;
}

/**
 * Format event datetime for inline display with date and time.
 * 
 * PATTERN (12h): "Mon, Feb 10 · 3:45 PM" or "Mon, Feb 10 · --:--"
 * PATTERN (24h): "Mon, 10 Feb · 15:45"
 * 
 * Use this for:
 * - UpcomingEventsWidget full datetime
 * - Timeline event rows with full context
 */
export function formatEventDatetime(
  datetime: string,
  preferredFormat: DatetimeFormatPreference = 'MM/DD/YYYY 12h'
): string {
  // v2.2.4: Use direct date extraction to avoid timezone-shifted day-of-week
  const use24h = preferredFormat === 'DD/MM/YYYY 24h';
  const dateStr = formatLocalDateDirect(datetime, use24h);
  if (!dateStr) return '--';
  
  const timeStr = formatEventTime(datetime, preferredFormat);
  
  return `${dateStr} · ${timeStr}`;
}

/**
 * Format date only (no time) for event display.
 * 
 * PATTERN (12h): "Mon, Feb 10"
 * PATTERN (24h): "Mon, 10 Feb"
 */
export function formatEventDate(
  datetime: string | Date,
  preferredFormat: DatetimeFormatPreference = 'MM/DD/YYYY 12h'
): string {
  // v2.2.4: For Date objects, extract the local date components directly
  // instead of using toISOString() which converts to UTC and can shift the date.
  if (datetime instanceof Date) {
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayOfWeek = DAYS[datetime.getDay()];
    const monthName = MONTHS[datetime.getMonth()];
    const day = datetime.getDate();
    const use24h = preferredFormat === 'DD/MM/YYYY 24h';
    if (use24h) {
      return `${dayOfWeek}, ${day} ${monthName}`;
    }
    return `${dayOfWeek}, ${monthName} ${day}`;
  }
  
  const use24h = preferredFormat === 'DD/MM/YYYY 24h';
  const directDate = formatLocalDateDirect(datetime, use24h);
  if (directDate) return directDate;
  
  return '--';
}

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

/**
 * Format currency amount with consistent style.
 * 
 * PATTERN: "$1,234.56" (USD default)
 * 
 * Use this everywhere trip totals and costs are displayed:
 * - SummaryTab total
 * - Expenses tab total
 * - Trip Report cost summary
 * - TripHeaderWidgets cost card
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD'
): string {
  // Guard against NaN/Infinity
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    // Fallback for unsupported currencies
    return `$${safeAmount.toFixed(2)}`;
  }
}

/**
 * Format currency without decimals for compact display.
 * 
 * PATTERN: "$1,234" (for larger numbers)
 */
export function formatCurrencyCompact(
  amount: number,
  currencyCode: string = 'USD'
): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(safeAmount);
  } catch {
    return `$${Math.round(safeAmount).toLocaleString()}`;
  }
}

// ============================================================================
// COST LABEL CONSTANTS
// ============================================================================

/**
 * Standard label for trip total display.
 * Use this label consistently across all surfaces showing trip total.
 */
export const TRIP_TOTAL_LABEL = 'Trip Total';

/**
 * Standard label for individual share display.
 */
export const MY_SHARE_LABEL = 'My Share';
