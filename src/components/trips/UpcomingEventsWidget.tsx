import { useTripEvents } from '@/hooks/useTripEvents';
import { useBookings } from '@/hooks/useBookings';
import { useParking } from '@/hooks/useParking';
import { useAccess } from '@/hooks/useAccess';
import { useUserProfile } from '@/hooks/useUserProfile';
import { TripEventType } from '@/types/tripEvent';
import { format, parseISO, isAfter } from 'date-fns';
import { Plane, Building2, Car, CircleParking, Clock, ChevronRight } from 'lucide-react';
import { parseDatetimeForDisplay, hasExplicitTime, UNKNOWN_TIME_PLACEHOLDER } from '@/lib/datetimeIntegrity';
import type { DrillThroughTarget } from '@/pages/TripDetail';

interface UpcomingEventsWidgetProps {
  tripId: string;
  onDrillThrough?: (target: DrillThroughTarget) => void;
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
 * Get the tab target for drill-through based on event type
 */
const getTabForEventType = (eventType: TripEventType): 'bookings' | 'parking' => {
  if (eventType === 'parking_expiration') {
    return 'parking';
  }
  return 'bookings';
};

/**
 * Build descriptive label for an event based on source data
 */
const getEventLabel = (
  eventType: TripEventType,
  sourceId: string,
  bookings: Array<{ id: string; airline?: string | null; vendor_name: string; property_name?: string | null; rental_company?: string | null; pickup_location?: string | null; return_location?: string | null }>,
  parkingList: Array<{ id: string; label: string }>
): string => {
  const baseLabel = EVENT_TYPE_LABELS[eventType];
  
  if (eventType === 'parking_expiration') {
    const parking = parkingList.find(p => p.id === sourceId);
    return parking ? `${baseLabel} – ${parking.label}` : baseLabel;
  }
  
  const booking = bookings.find(b => b.id === sourceId);
  if (!booking) return baseLabel;
  
  switch (eventType) {
    case 'flight_departure':
      return `${baseLabel} – ${booking.airline || booking.vendor_name}`;
    case 'hotel_checkin':
    case 'hotel_checkout':
      return `${baseLabel} – ${booking.property_name || booking.vendor_name}`;
    case 'rental_pickup':
      return `${baseLabel} – ${booking.rental_company || booking.vendor_name}`;
    case 'rental_return':
      return `${baseLabel} – ${booking.rental_company || booking.vendor_name}`;
    default:
      return baseLabel;
  }
};

/**
 * Format datetime based on user preference
 * v2.2.0: Uses safe datetime parsing to preserve original dates
 * Formats: "MM/DD/YYYY 12h" or "DD/MM/YYYY 24h"
 */
const formatEventDatetime = (datetime: string, preferredFormat: string | null | undefined): string => {
  // v2.2.0: Use safe parsing that preserves the original date
  const parsed = parseDatetimeForDisplay(datetime);
  if (!parsed) return '--';
  
  const hasTime = hasExplicitTime(datetime);
  
  // If no explicit time, show date only with placeholder
  if (!hasTime) {
    if (!preferredFormat || preferredFormat === 'MM/DD/YYYY 12h') {
      return `${format(parsed, 'EEE, MMM d')} · ${UNKNOWN_TIME_PLACEHOLDER}`;
    }
    return `${format(parsed, 'EEE, d MMM')} · ${UNKNOWN_TIME_PLACEHOLDER}`;
  }
  
  // Default format: EEE, MMM d · h:mm a (e.g., "Mon, Jan 15 · 3:30 PM")
  if (!preferredFormat || preferredFormat === 'MM/DD/YYYY 12h') {
    return format(parsed, 'EEE, MMM d · h:mm a');
  }
  
  // 24-hour format: EEE, d MMM · HH:mm (e.g., "Mon, 15 Jan · 15:30")
  if (preferredFormat === 'DD/MM/YYYY 24h') {
    return format(parsed, 'EEE, d MMM · HH:mm');
  }
  
  // Fallback
  return format(parsed, 'EEE, MMM d · h:mm a');
};

/**
 * v2.1.1: Pro-only Upcoming Events strip powered by TripEvents
 * 
 * - Read-only display of next 3-5 upcoming TripEvents
 * - Only visible for Pro users
 * - Clickable events navigate to source record
 * - Shows "No upcoming events" when empty
 */
export function UpcomingEventsWidget({ tripId, onDrillThrough }: UpcomingEventsWidgetProps) {
  const { isPro } = useAccess();
  const { data: events = [] } = useTripEvents(tripId);
  const { data: bookings = [] } = useBookings(tripId);
  const { data: parkingList = [] } = useParking(tripId);
  const { data: userProfile } = useUserProfile();

  // Not visible for non-Pro users
  if (!isPro) {
    return null;
  }

  // Filter to upcoming events only (event_datetime > now)
  // Only include events with valid, non-null datetime
  // v2.2.0: Use safe datetime parsing
  const now = new Date();
  const upcomingEvents = events
    .filter(event => {
      if (!event.event_datetime) return false;
      const eventDate = parseDatetimeForDisplay(event.event_datetime);
      return eventDate && isAfter(eventDate, now);
    })
    .slice(0, 5); // Max 5 events per spec

  // Handle event click - navigate to source record
  const handleEventClick = (eventType: TripEventType, sourceId: string) => {
    if (!onDrillThrough) return;
    
    const tab = getTabForEventType(eventType);
    onDrillThrough({ tab, recordId: sourceId });
  };

  return (
    <div className="space-y-2 mt-4">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Clock className="w-4 h-4" />
        Upcoming Events
      </h4>
      
      {upcomingEvents.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No upcoming events</p>
      ) : (
        <div className="space-y-2">
          {upcomingEvents.map(event => {
            const label = getEventLabel(event.event_type, event.source_id, bookings, parkingList);
            const formattedTime = formatEventDatetime(event.event_datetime, userProfile?.preferred_datetime_format);
            const isClickable = !!onDrillThrough;
            
            return (
              <div 
                key={event.id} 
                className={`flex items-center gap-3 text-sm ${
                  isClickable 
                    ? 'cursor-pointer hover:bg-accent/50 rounded-md p-2 -m-2 transition-colors group' 
                    : ''
                }`}
                onClick={() => handleEventClick(event.event_type, event.source_id)}
                role={isClickable ? 'button' : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    handleEventClick(event.event_type, event.source_id);
                  }
                }}
              >
                {getEventIcon(event.event_type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formattedTime}
                  </p>
                </div>
                {isClickable && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
