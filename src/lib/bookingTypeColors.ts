/**
 * Canonical booking type icon color classes.
 * Single source of truth — use everywhere booking type icons are rendered.
 *
 * These use semantic Tailwind tokens where possible,
 * falling back to curated palette for per-type differentiation.
 */

export type BookingTypeKey = 'flight' | 'stay' | 'car_rental' | 'transport' | 'activity' | 'other';

export interface BookingTypeStyle {
  /** Combined bg + text class for icon container */
  iconContainer: string;
}

const BOOKING_TYPE_STYLES: Record<BookingTypeKey, BookingTypeStyle> = {
  flight:     { iconContainer: 'bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  stay:       { iconContainer: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  car_rental: { iconContainer: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  transport:  { iconContainer: 'bg-teal-500/10 text-teal-600 dark:text-teal-400' },
  activity:   { iconContainer: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
  other:      { iconContainer: 'bg-muted/50 text-muted-foreground' },
};

/**
 * Get the canonical icon container classes for a given booking type.
 */
export function getBookingTypeStyle(type: string | null | undefined): BookingTypeStyle {
  return BOOKING_TYPE_STYLES[(type as BookingTypeKey)] ?? BOOKING_TYPE_STYLES.other;
}
