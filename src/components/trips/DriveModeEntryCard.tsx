/**
 * Drive Mode Entry Card
 *
 * Small card/button on Trip Detail for future or active drive trips.
 * Eligibility stays tied to the canonical drive intelligence helper.
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

function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isDriveModeEligible(trip: Trip): boolean {
  return todayLocalDate() <= trip.end_date;
}

export function DriveModeEntryCard({ tripId, trip, canonicalState }: DriveModeEntryCardProps) {
  const eligible = useMemo(() => isDriveModeEligible(trip), [trip]);

  const hasSegment = useMemo(
    () => getActiveDriveSegment(canonicalState, new Date()) !== null,
    [canonicalState],
  );

  if (!eligible || !hasSegment) return null;

  const today = todayLocalDate();
  const isInTrip = today >= trip.start_date && today <= trip.end_date;

  return (
    <Link
      to={`/trip/${tripId}/drive`}
      className="rt-command-panel block px-4 py-3 transition-colors hover:border-primary/35"
    >
      <div className="flex items-center gap-3">
        <div className="rt-icon-tile">
          <Car className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Drive Mode</p>
          <p className="text-xs text-muted-foreground">
            {isInTrip
              ? 'Open drive view for this leg.'
              : 'Plan route options, stops, fuel, and alerts before departure.'}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );
}
