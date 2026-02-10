/**
 * TripTimeline Component
 * v2.1.22: Combined flight entries (dep + arrival on one row)
 * 
 * Displays trip events in chronological order with a single continuous
 * vertical line connecting all events from first to last.
 * 
 * Flights now appear as a single row showing both departure and arrival info.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import { formatEventTime, formatEventDate, DatetimeFormatPreference } from '@/lib/displayFormats';
import { formatTimeInTimezone, formatDateInTimezone } from '@/lib/airportTimezones';
import { 
  Plane, Building2, Car, CircleParking, Compass, Ticket, 
  TrainFront, Bus, TramFront, Ship, PartyPopper, MapPin, ExternalLink 
} from 'lucide-react';

interface TripTimelineProps {
  events: CanonicalTimelineEvent[];
  datetimeFormat?: DatetimeFormatPreference;
  onEventClick?: (event: CanonicalTimelineEvent) => void;
}

// Helper to safely open external URLs in new tab
const openExternalUrl = (url: string | null | undefined, e: React.MouseEvent) => {
  e.stopPropagation();
  if (!url) return;
  const safeUrl = url.startsWith('http://') || url.startsWith('https://') 
    ? url 
    : `https://${url}`;
  window.open(safeUrl, '_blank', 'noopener,noreferrer');
};

const openInMaps = (address: string, e: React.MouseEvent) => {
  e.stopPropagation();
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
};

const getEventIcon = (type: string, transportMode?: string) => {
  switch (type) {
    case 'flight': return <Plane className="w-4 h-4" />;
    case 'stay': return <Building2 className="w-4 h-4" />;
    case 'car_rental': return <Car className="w-4 h-4" />;
    case 'parking': return <CircleParking className="w-4 h-4" />;
    case 'activity': return <Compass className="w-4 h-4" />;
    case 'transport':
      switch (transportMode) {
        case 'train': return <TrainFront className="w-4 h-4" />;
        case 'bus': return <Bus className="w-4 h-4" />;
        case 'metro': return <TramFront className="w-4 h-4" />;
        case 'ferry': return <Ship className="w-4 h-4" />;
        default: return <TrainFront className="w-4 h-4" />;
      }
    default: return <PartyPopper className="w-4 h-4" />;
  }
};

/**
 * v2.2.4: Build combined flight subtitle using timezone-aware local times
 * Pattern: EJMB2X • DEN → COS • Dep 6:00 AM • Arr 1:33 PM
 * Uses airport timezone to display times correctly regardless of viewer's device timezone.
 */
function buildFlightSubtitle(
  event: CanonicalTimelineEvent,
  datetimeFormat: DatetimeFormatPreference
): string {
  const parts: string[] = [];
  const use24h = datetimeFormat === 'DD/MM/YYYY 24h';
  
  // Confirmation number
  if (event.confirmationNumber) {
    parts.push(event.confirmationNumber);
  }
  
  // Airport route (only if both exist)
  if (event.departureAirportCode && event.arrivalAirportCode) {
    parts.push(`${event.departureAirportCode} → ${event.arrivalAirportCode}`);
  } else if (event.departureAirportCode) {
    parts.push(`From ${event.departureAirportCode}`);
  } else if (event.arrivalAirportCode) {
    parts.push(`To ${event.arrivalAirportCode}`);
  }
  
  // v2.2.4: Departure time - prefer timezone-aware formatting
  if (event.hasDepartureTime && event.departureLocalTime) {
    let depTime: string;
    if (event.departureTimeZone) {
      depTime = formatTimeInTimezone(event.departureLocalTime, event.departureTimeZone, use24h) 
        || formatEventTime(event.departureTime!.toISOString(), datetimeFormat);
    } else {
      depTime = formatEventTime(event.departureTime!.toISOString(), datetimeFormat);
    }
    parts.push(`Dep ${depTime}`);
  }
  
  // v2.2.4: Arrival time - prefer timezone-aware formatting
  if (event.hasArrivalTime && event.arrivalLocalTime) {
    let arrTime: string;
    if (event.arrivalTimeZone) {
      arrTime = formatTimeInTimezone(event.arrivalLocalTime, event.arrivalTimeZone, use24h)
        || formatEventTime(event.arrivalTime!.toISOString(), datetimeFormat);
    } else {
      arrTime = formatEventTime(event.arrivalTime!.toISOString(), datetimeFormat);
    }
    parts.push(`Arr ${arrTime}`);
  }
  
  return parts.join(' • ');
}

export function TripTimeline({ events, datetimeFormat, onEventClick }: TripTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-muted-foreground text-center py-8 text-sm">
        No events yet. Add bookings and parking to build your timeline.
      </p>
    );
  }

  return (
    <div className="relative">
      {/* v2.1.21: Single continuous vertical line - positioned behind all event icons */}
      {events.length > 1 && (
        <div 
          className="absolute left-4 top-4 bottom-4 w-px bg-border -translate-x-1/2"
          aria-hidden="true"
        />
      )}
      
      {/* Event list */}
      <div className="space-y-0">
        {events.map((event, index) => {
          // v2.1.22: Build subtitle dynamically for flights
          const subtitle = event.eventType === 'flight' 
            ? buildFlightSubtitle(event, datetimeFormat)
            : event.subtitle;
          
          return (
            <div 
              key={event.id} 
              className="relative flex gap-4 animate-slide-in cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors" 
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => onEventClick?.(event)}
            >
              {/* Icon circle - sits on top of the vertical line */}
              <div className="relative z-10 flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-primary">
                  {getEventIcon(event.bookingType, event.transportMode)}
                </div>
              </div>
              
              {/* Event content */}
              <div className="flex-1 pb-4 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
                    {/* Activity-specific badges */}
                    {event.bookingType === 'activity' && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {event.ticketRequired && (
                          <Badge variant="secondary" className="text-[10px] h-4 px-1 gap-0.5">
                            <Ticket className="w-2.5 h-2.5" />
                            Ticket
                          </Badge>
                        )}
                        {event.ticketsPurchased && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1 bg-accent">
                            Tickets purchased
                          </Badge>
                        )}
                        {event.activitySource && (
                          <span className="text-[10px] text-muted-foreground">
                            {event.activitySource === 'explore' ? 'From Explore' : 
                             event.activitySource === 'confirmation' ? 'From confirmation' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs shrink-0">
                    <p className="font-medium">
                      {/* v2.2.4: For flights with timezone, use timezone-aware date */}
                      {event.eventType === 'flight' && event.departureTimeZone && event.departureLocalTime
                        ? (formatDateInTimezone(event.departureLocalTime, event.departureTimeZone) || formatEventDate(event.datetime, datetimeFormat))
                        : formatEventDate(event.datetime, datetimeFormat)
                      }
                    </p>
                    <p className={event.hasExplicitTime ? 'text-muted-foreground' : 'text-destructive font-medium'}>
                      {/* v2.2.4: For flights with timezone, use timezone-aware time */}
                      {event.eventType === 'flight' && event.departureTimeZone && event.departureLocalTime && event.hasExplicitTime
                        ? (formatTimeInTimezone(event.departureLocalTime, event.departureTimeZone, datetimeFormat === 'DD/MM/YYYY 24h') || formatEventTime(event.datetime.toISOString(), datetimeFormat))
                        : formatEventTime(event.datetime.toISOString(), datetimeFormat)
                      }
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-1">
                  {event.address && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => openInMaps(event.address!, e)}
                    >
                      <MapPin className="w-3 h-3 mr-1" />
                      Maps
                    </Button>
                  )}
                  {event.linkUrl && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={(e) => openExternalUrl(event.linkUrl, e)}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
