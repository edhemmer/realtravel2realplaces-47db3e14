import { useParking } from '@/hooks/useParking';
import { useAccess } from '@/hooks/useAccess';
import { Clock } from 'lucide-react';
import { formatLocalTimeDirect } from '@/lib/canonicalTimeNormalizer';
import { getNowLocalDateTime, compareLocalDateTime } from '@/lib/canonicalTimePolicy';

interface ParkingExpirationIndicatorProps {
  tripId: string;
  parkingId: string;
}

/**
 * v2.0.4: Pro-only Parking Expiration Indicator
 * 
 * Shows a calm, read-only expiration time for parking records.
 * - Only visible for Pro users
 * - Uses existing TripEvent data with eventType = "parking_expiration"
 * - Only renders if the event exists and has a future/valid datetime
 * - No warnings, countdowns, or urgent styling
 */
export function ParkingExpirationIndicator({ tripId, parkingId }: ParkingExpirationIndicatorProps) {
  const { isPro } = useAccess();
  const { data: parkingList = [] } = useParking(tripId);

  // Not visible for Free users
  if (!isPro) {
    return null;
  }

  // v3.9.7: Read directly from parking record's local wall-time — no Date() math
  const parking = parkingList.find(p => p.id === parkingId);
  if (!parking) return null;

  const endStr = parking.end_local_datetime || parking.end_datetime;
  if (!endStr) return null;

  // Check if expiration is in the future using string comparison
  // v3.11.2: Use canonical time policy — no new Date()
  const nowLocal = getNowLocalDateTime();
  const endNorm = endStr.substring(0, 16).replace(' ', 'T');
  const nowNorm = nowLocal.replace(' ', 'T');
  if (compareLocalDateTime(endNorm, nowNorm) <= 0) return null;

  const timeDisplay = formatLocalTimeDirect(endStr);
  if (!timeDisplay) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
      <Clock className="w-3 h-3" />
      <span>Expires at {timeDisplay}</span>
    </div>
  );
}
