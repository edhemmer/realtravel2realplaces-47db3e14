/**
 * v4.0.1: Drive Mode Entry Card
 *
 * Small card/button on Trip Detail that appears when trip is within
 * 1 calendar day of start or currently in progress AND has drive segments.
 * All eligibility logic uses driveIntelligenceHelper — no local reimplementation.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Car, ChevronRight } from 'lucide-react';
import type { Trip } from '@/types/database';
import type { CanonicalTripState } from '@/lib/canonicalTripState';
import { getActiveDriveSegment } from '@/lib/driveIntelligenceHelper';

interface DriveModeEntryCardProps {
  tripId: string;
  trip: Trip;
  canonicalState: CanonicalTripState | null;
}

/**
 * Determine if today is within 1 day before trip start or during the trip.
 * Pure string comparison — no timezone math.
 */
function isDriveModeEligible(trip: Trip): boolean {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const today = `${y}-${m}-${d}`;

  // Trip in the past
  if (today > trip.end_date) return false;

  // Trip starts more than 1 day from now
  // Compute "tomorrow" string
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const ty = tomorrow.getFullYear();
  const tm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const td = String(tomorrow.getDate()).padStart(2, '0');
  const tomorrowStr = `${ty}-${tm}-${td}`;

  // Eligible if: today >= start_date - 1 day AND today <= end_date
  // start_date - 1 day ≈ trip.start_date <= tomorrowStr
  if (trip.start_date > tomorrowStr) return false;

  return true;
}

export function DriveModeEntryCard({ tripId, trip, canonicalState }: DriveModeEntryCardProps) {
  const eligible = useMemo(() => isDriveModeEligible(trip), [trip]);

  const hasSegment = useMemo(
    () => getActiveDriveSegment(canonicalState, new Date()) !== null,
    [canonicalState],
  );

  if (!eligible || !hasSegment) return null;

  // Determine subtitle based on timing
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const today = `${y}-${m}-${d}`;
  const isInTrip = today >= trip.start_date && today <= trip.end_date;

  return (
    <Link
      to={`/trip/${tripId}/drive`}
      className="block rounded-lg border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Car className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Drive Mode</p>
          <p className="text-xs text-muted-foreground">
            {isInTrip
              ? 'Open drive view for this leg.'
              : 'Preview your route and alerts before you leave.'}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}
