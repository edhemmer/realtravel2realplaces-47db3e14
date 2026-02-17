/**
 * TripTimeline Component
 * v2.1.22: Combined flight entries (dep + arrival on one row)
 * 
 * Displays trip events in chronological order with a single continuous
 * vertical line connecting all events from first to last.
 * 
 * Flights now appear as a single row showing both departure and arrival info.
 */

import { Badge } from '@/components/ui/badge'; // used by activity badges
import { Button } from '@/components/ui/button';
import { CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import { DatetimeFormatPreference } from '@/lib/displayFormats';
import { formatLocalTimeDirect, formatLocalDateDirect } from '@/lib/canonicalTimeNormalizer';
import { UNKNOWN_TIME_PLACEHOLDER } from '@/lib/datetimeIntegrity';
import { resolveMapsFromTimelineEvent, openMapsDestination } from '@/lib/mapsDestination';
import { buildFlightDisplayLine } from '@/lib/flightDisplayUtils';
import { 
  Plane, Building2, Car, CircleParking, Compass, Ticket, 
  TrainFront, Bus, TramFront, Ship, PartyPopper, Navigation
} from 'lucide-react';

interface TripTimelineProps {
  events: CanonicalTimelineEvent[];
  datetimeFormat?: DatetimeFormatPreference;
  onEventClick?: (event: CanonicalTimelineEvent) => void;
  /** v3.12.4: Explore nearby action for timeline items */
  onExploreNearby?: (eventId: string) => void;
}

// v3.6.1: openExternalUrl removed — "View" inline button removed; row tap handles detail view

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
 * v3.13.2: Build combined flight subtitle using canonical display format.
 * Pattern: DEN → COS • Conf EJMB2X • Dep 6:00 AM • Arr 7:39 AM
 * Uses buildFlightDisplayLine for consistency across all surfaces.
 */
function buildFlightSubtitle(
  event: CanonicalTimelineEvent,
  datetimeFormat: DatetimeFormatPreference
): string {
  const use24h = datetimeFormat === 'DD/MM/YYYY 24h';
  return buildFlightDisplayLine({
    departureAirportCode: event.departureAirportCode,
    arrivalAirportCode: event.arrivalAirportCode,
    confirmationNumber: event.confirmationNumber,
    departureLocalTime: event.departureLocalTime,
    arrivalLocalTime: event.arrivalLocalTime,
    hasDepartureTime: event.hasDepartureTime,
    hasArrivalTime: event.hasArrivalTime,
    use24h,
  });
}

export function TripTimeline({ events, datetimeFormat, onEventClick, onExploreNearby }: TripTimelineProps) {
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
          className="absolute left-[20px] top-4 bottom-4 w-px bg-border -translate-x-1/2"
          aria-hidden="true"
        />
      )}
      
      {/* Event list grouped by day */}
      <div className="space-y-0.5">
        {grouped.map((group) => {
          const isToday = group.date === todayStr;
          const dateLabel = formatLocalDateDirect(group.date, use24h) || group.date;

          // v3.6.5: Determine day name for TODAY header
          const dayName = (() => {
            if (!isToday) return '';
            const d = new Date(group.date + 'T12:00:00');
            return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
          })();

          // v3.6.5: Find first upcoming event index within today
          const firstUpcomingIdx = isToday
            ? group.events.findIndex((ev) => {
                const evDate = ev.eventLocalDateTime ? ev.eventLocalDateTime.substring(0, 10) : '';
                const evTime = ev.eventLocalDateTime ? ev.eventLocalDateTime.substring(11, 16) : '';
                return !(evDate < todayStr || (evDate === todayStr && !!evTime && evTime < `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`));
              })
            : -1;

          return (
            <div key={group.date}>
              {/* v3.6.5: Date header — TODAY gets command header, others stay standard */}
              {isToday ? (
                <div className="pt-3 pb-2 px-1 mb-0.5">
                  <p className="text-[13px] font-bold text-foreground uppercase tracking-wide leading-tight">
                    Today
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                    {dayName}
                  </p>
                  <div className="mt-1.5 h-[2px] w-10 rounded-full bg-foreground/15" />
                </div>
              ) : (
                <div className="py-1.5 px-1 mb-0.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                    {dateLabel}
                  </span>
                </div>
              )}

              {/* Events for this day */}
              {group.events.map((event, eventIdx) => {
                const subtitle = event.eventType === 'flight' 
                  ? buildFlightSubtitle(event, datetimeFormat)
                  : event.subtitle;

                const eventDateStr = event.eventLocalDateTime ? event.eventLocalDateTime.substring(0, 10) : '';
                const eventTimeStr = event.eventLocalDateTime ? event.eventLocalDateTime.substring(11, 16) : '';
                const isPast = eventDateStr < todayStr || (eventDateStr === todayStr && !!eventTimeStr && eventTimeStr < `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
                const isFirstUpcoming = isToday && eventIdx === firstUpcomingIdx;

                return (
                  <div 
                    key={event.id} 
                    className={`relative flex gap-3 cursor-pointer hover:bg-muted/50 rounded-lg py-1.5 px-1.5 -mx-1.5 transition-colors ${isToday ? 'bg-foreground/[0.02]' : ''} ${isPast ? 'opacity-90' : ''}`}
                    onClick={() => onEventClick?.(event)}
                  >
                    {/* v3.6.5: Left accent bar for first upcoming item in Today */}
                    {isFirstUpcoming && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full bg-foreground/20" />
                    )}
                    {/* Icon circle - v3.6.1: reduced from w-8 h-8 to w-7 h-7 */}
                    <div className="relative z-10 flex-shrink-0">
                      <div className={`w-7 h-7 rounded-full border-2 border-background flex items-center justify-center ${isToday ? 'bg-primary/15 text-primary' : isPast ? 'bg-muted/60 text-muted-foreground' : 'bg-primary/10 text-primary'}`}>
                        {getEventIcon(event.bookingType, event.transportMode)}
                      </div>
                    </div>
                    
                    {/* Event content - v3.6.1: reduced bottom padding */}
                    <div className="flex-1 pb-1 md:pb-2 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={`text-[13px] leading-tight truncate ${isFirstUpcoming ? 'font-semibold' : 'font-medium'}`}>{event.title}</p>
                          <p className="text-[11px] text-muted-foreground/80 mt-px whitespace-normal break-words line-clamp-2 md:truncate">{subtitle}</p>
                          {/* Activity-specific badges */}
                          {event.bookingType === 'activity' && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
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
                        {/* v3.6.1: time - reduced size, medium gray, aligned to title */}
                        <div className="text-right shrink-0 tabular-nums pt-px">
                          <p className={`text-[10px] ${event.hasExplicitTime ? 'text-muted-foreground/70' : 'text-destructive font-medium'}`}>
                            {event.hasExplicitTime
                              ? (formatLocalTimeDirect(event.eventLocalDateTime, use24h) || UNKNOWN_TIME_PLACEHOLDER)
                              : UNKNOWN_TIME_PLACEHOLDER
                            }
                          </p>
                        </div>
                      </div>
                      {/* v3.6.1: Navigate + v3.12.4: Explore nearby buttons */}
                      {(event.address || event.departureAirportCode || event.title) && resolveMapsFromTimelineEvent(event) && (
                        <div className="mt-1 flex gap-1.5">
                          <Button
                            size="sm"
                            variant="default"
                            className={`h-[34px] px-3 text-[11px] rounded-full shadow-none press-scale ${isPast ? 'opacity-80' : ''}`}
                            onClick={(e) => openInMapsResolved(event, e)}
                          >
                            <Navigation className="w-3 h-3 mr-1" />
                            Navigate
                          </Button>
                          {onExploreNearby && (
                            <Button
                              size="sm"
                              variant="outline"
                              className={`h-[34px] px-3 text-[11px] rounded-full shadow-none press-scale ${isPast ? 'opacity-80' : ''}`}
                              onClick={(e) => { e.stopPropagation(); onExploreNearby(event.id); }}
                            >
                              <Compass className="w-3 h-3 mr-1" />
                              Explore nearby
                            </Button>
                          )}
                        </div>
                      )}
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
