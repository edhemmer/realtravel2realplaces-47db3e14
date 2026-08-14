import type { TripReadinessBrief } from '@/lib/tripReadiness/tripReadinessEngine';

interface TripBriefSectionProps {
  brief: TripReadinessBrief;
  onAction?: (target: string) => void;
}

/**
 * The readiness/operating brief remains internal until its weather, drive,
 * timing, and recommendation contracts are validated end-to-end.
 *
 * Product rule: unsupported intelligence is not presented to travelers.
 */
export function TripBriefSection(_props: TripBriefSectionProps) {
  return null;
}
