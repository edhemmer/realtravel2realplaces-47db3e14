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
import { DatetimeFormatPreference } from '@/lib/displayFormats';
import { formatLocalTimeDirect, formatLocalDateDirect } from '@/lib/canonicalTimeNormalizer';
import { UNKNOWN_TIME_PLACEHOLDER } from '@/lib/datetimeIntegrity';
import { resolveMapsFromTimelineEvent, openMapsDestination } from '@/lib/mapsDestination';
import { 
  Plane, Building2, Car, CircleParking, Compass, Ticket, 
  TrainFront, Bus, TramFront, Ship, PartyPopper, Navigation, ExternalLink 
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

const openInMapsResolved = (event: CanonicalTimelineEvent, e: React.MouseEvent) => {
  e.stopPropagation();
  const dest = resolveMapsFromTimelineEvent(event);
  if (dest) openMapsDestination(dest);
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
 * v2.2.10: Build combined flight subtitle using direct digit extraction.
 * Pattern: EJMB2X • DEN → COS • Dep 6:00 AM • Arr 7:39 AM
 * Extracts time digits directly from stored strings — no Date() timezone shifting.
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
  
  // v2.2.10: Departure time — extract digits directly, no Date() shifting
  if (event.hasDepartureTime && event.departureLocalTime) {
    const depTime = formatLocalTimeDirect(event.departureLocalTime, use24h)
      || UNKNOWN_TIME_PLACEHOLDER;
    parts.push(`Dep ${depTime}`);
  }
  
  // v2.2.10: Arrival time — extract digits directly
  if (event.hasArrivalTime && event.arrivalLocalTime) {
    const arrTime = formatLocalTimeDirect(event.arrivalLocalTime, use24h)
      || UNKNOWN_TIME_PLACEHOLDER;
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

  // v2.6.5: Get today's local date for "Today" badge
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Group events by date (extracted from eventLocalDateTime string)
  const grouped: { date: string; events: CanonicalTimelineEvent[] }[] = [];
  const use24h = datetimeFormat === 'DD/MM/YYYY 24h';

  for (const event of events) {
    const dateStr = event.eventLocalDateTime ? event.eventLocalDateTime.substring(0, 10) : '';
    const lastGroup = grouped[grouped.length - 1];
    if (lastGroup && lastGroup.date === dateStr) {
      lastGroup.events.push(event);
    } else {
      grouped.push({ date: dateStr, events: [event] });
    }
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
      
      {/* Event list grouped by day */}
      <div className="space-y-0.5">
        {grouped.map((group) => {
          const isToday = group.date === todayStr;
          const dateLabel = formatLocalDateDirect(group.date, use24h) || group.date;

          return (
            <div key={group.date}>
              {/* v2.6.5: Day header with optional Today badge */}
              <div className={`flex items-center gap-2 py-1.5 px-1 mb-0.5 rounded-md ${isToday ? 'bg-primary/5' : ''}`}>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {dateLabel}
                </span>
                {isToday && (
                  <Badge variant="default" className="text-[9px] h-4 px-1.5 py-0 font-semibold">
                    Today
                  </Badge>
                )}
              </div>

              {/* Events for this day */}
              {group.events.map((event, index) => {
                const subtitle = event.eventType === 'flight' 
                  ? buildFlightSubtitle(event, datetimeFormat)
                  : event.subtitle;

                return (
                  <div 
                    key={event.id} 
                    className={`relative flex gap-4 cursor-pointer hover:bg-muted/50 rounded-lg p-2 -mx-2 transition-colors ${isToday ? 'bg-primary/[0.02]' : ''}`}
                    onClick={() => onEventClick?.(event)}
                  >
                    {/* Icon circle - sits on top of the vertical line */}
                    <div className="relative z-10 flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full border-2 border-background flex items-center justify-center ${isToday ? 'bg-primary/15 text-primary' : 'bg-primary/10 text-primary'}`}>
                        {getEventIcon(event.bookingType, event.transportMode)}
                      </div>
                    </div>
                    
                    {/* Event content */}
                    <div className="flex-1 pb-2 md:pb-3 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-[13px] leading-snug truncate">{event.title}</p>
                          <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">{subtitle}</p>
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
                        <div className="text-right shrink-0 tabular-nums">
                          <p className={`text-[11px] ${event.hasExplicitTime ? 'text-muted-foreground/80' : 'text-destructive font-medium'}`}>
                            {event.hasExplicitTime
                              ? (formatLocalTimeDirect(event.eventLocalDateTime, use24h) || UNKNOWN_TIME_PLACEHOLDER)
                              : UNKNOWN_TIME_PLACEHOLDER
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1.5 mt-1">
                        {(event.address || event.departureAirportCode || event.title) && resolveMapsFromTimelineEvent(event) && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-6 px-2.5 text-[11px] rounded-full press-scale"
                            onClick={(e) => openInMapsResolved(event, e)}
                          >
                            <Navigation className="w-3 h-3 mr-1" />
                            Navigate
                          </Button>
                        )}
                        {event.linkUrl && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[11px] press-scale-subtle"
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
          );
        })}
      </div>
    </div>
  );
}
