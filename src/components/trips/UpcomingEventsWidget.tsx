import { useTripEvents } from '@/hooks/useTripEvents';
import { useIsPro } from '@/hooks/useSubscription';
import { TripEventType } from '@/types/tripEvent';
import { format, parseISO, isAfter } from 'date-fns';
import { Plane, Building2, Car, CircleParking, Clock } from 'lucide-react';

interface UpcomingEventsWidgetProps {
  tripId: string;
}

// Event type labels for display
const EVENT_TYPE_LABELS: Record<TripEventType, string> = {
  flight_departure: 'Flight Departure',
  hotel_checkin: 'Hotel Check-in',
  hotel_checkout: 'Hotel Check-out',
  rental_pickup: 'Rental Pickup',
  rental_return: 'Rental Return',
  parking_expiration: 'Parking Expiration',
};

// Icons for event types
const getEventIcon = (eventType: TripEventType) => {
  switch (eventType) {
    case 'flight_departure':
      return <Plane className="w-4 h-4 text-muted-foreground" />;
    case 'hotel_checkin':
    case 'hotel_checkout':
      return <Building2 className="w-4 h-4 text-muted-foreground" />;
    case 'rental_pickup':
    case 'rental_return':
      return <Car className="w-4 h-4 text-muted-foreground" />;
    case 'parking_expiration':
      return <CircleParking className="w-4 h-4 text-muted-foreground" />;
    default:
      return <Clock className="w-4 h-4 text-muted-foreground" />;
  }
};

/**
 * v2.0.3: Pro-only Upcoming Events display
 * 
 * - Read-only display of next 1-3 upcoming TripEvents
 * - Only visible for Pro users
 * - Shows nothing if no upcoming events exist
 */
export function UpcomingEventsWidget({ tripId }: UpcomingEventsWidgetProps) {
  const isPro = useIsPro();
  const { data: events = [] } = useTripEvents(tripId);

  // Not visible for non-Pro users
  if (!isPro) {
    return null;
  }

  // Filter to upcoming events only (event_datetime > now)
  const now = new Date();
  const upcomingEvents = events
    .filter(event => isAfter(parseISO(event.event_datetime), now))
    .slice(0, 3); // Max 3 events

  // Show nothing if no upcoming events
  if (upcomingEvents.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Upcoming
      </h4>
      <div className="space-y-2">
        {upcomingEvents.map(event => (
          <div 
            key={event.id} 
            className="flex items-center gap-3 text-sm"
          >
            {getEventIcon(event.event_type)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {EVENT_TYPE_LABELS[event.event_type]}
              </p>
              <p className="text-xs text-muted-foreground">
                {format(parseISO(event.event_datetime), 'EEE, MMM d · h:mm a')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
