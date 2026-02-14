import { useParking } from '@/hooks/useParking';
import { useAccess } from '@/hooks/useAccess';
import { Clock } from 'lucide-react';
import { formatLocalTimeDirect } from '@/lib/canonicalTimeNormalizer';

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
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const nowLocal = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const endNorm = endStr.substring(0, 16);
  if (endNorm <= nowLocal) return null;

  const timeDisplay = formatLocalTimeDirect(endStr);
  if (!timeDisplay) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
      <Clock className="w-3 h-3" />
      <span>Expires at {timeDisplay}</span>
    </div>
  );
}
