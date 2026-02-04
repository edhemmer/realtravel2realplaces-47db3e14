import { useTripEvents } from '@/hooks/useTripEvents';
import { useIsPro } from '@/hooks/useSubscription';
import { format, parseISO, isAfter } from 'date-fns';
import { Clock } from 'lucide-react';

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
  const isPro = useIsPro();
  const { data: events = [] } = useTripEvents(tripId);

  // Not visible for Free users
  if (!isPro) {
    return null;
  }

  // Find the parking_expiration event for this specific parking record
  const expirationEvent = events.find(
    event => 
      event.event_type === 'parking_expiration' && 
      event.source_id === parkingId &&
      event.source_type === 'parking'
  );

  // Don't render if no event exists
  if (!expirationEvent) {
    return null;
  }

  const expirationTime = parseISO(expirationEvent.event_datetime);
  const now = new Date();

  // Only show if expiration is in the future or very recent (within last hour for "just expired" context)
  if (!isAfter(expirationTime, now)) {
    return null;
  }

  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
      <Clock className="w-3 h-3" />
      <span>Expires at {format(expirationTime, 'h:mm a')}</span>
    </div>
  );
}
