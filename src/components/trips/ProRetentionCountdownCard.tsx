import type { Trip } from '@/types/database';

interface ProRetentionCountdownCardProps {
  trip: Trip;
}

/**
 * Retention countdown intentionally withheld.
 *
 * The previous surface promised a fixed deletion schedule and exposed an
 * unfinished CSV export action. Under the RT2RP Promise Standard, retention
 * timing must not be shown until the backend lifecycle/deletion policy and
 * supported export paths are implemented, observable, and tested end-to-end.
 */
export function ProRetentionCountdownCard(_props: ProRetentionCountdownCardProps) {
  return null;
}
