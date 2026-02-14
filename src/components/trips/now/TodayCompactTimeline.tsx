/**
 * v3.7.3: TodayCompactTimeline
 *
 * Compact timeline filtered to today's actionable events only.
 * Expired/completed items are excluded. Tomorrow items never appear.
 * No "View Full Timeline" link — NOW has a single Timeline entry point.
 *
 * Uses string-based date/time comparison — no Date() for logic (except parking).
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar, Plane, Building2, Car, CircleParking, Compass,
  Ticket, TrainFront, PartyPopper
} from 'lucide-react';
import { getLocalNowString } from '@/lib/canonicalNextStop';
import type { CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import { cn } from '@/lib/utils';

interface TodayCompactTimelineProps {
  timelineEvents: CanonicalTimelineEvent[];
  /** v3.7.1: Set of parking IDs that are currently active. Parking not in this set is filtered out. */
  activeParkingIds?: Set<string>;
}

function extractDate(dt: string | undefined): string | null {
  if (!dt) return null;
  const d = dt.substring(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function extractTime(dt: string | undefined): string | null {
  if (!dt) return null;
  const match = dt.match(/\d{4}-\d{2}-\d{2}[\sT](\d{2}:\d{2})/);
  return match ? match[1] : null;
}

function formatTime12h(time: string): string {
  const h = parseInt(time.substring(0, 2));
  const m = time.substring(3, 5);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}


const getEventIcon = (type: string) => {
  switch (type) {
    case 'flight':
    case 'flight_departure': return <Plane className="w-3.5 h-3.5" />;
    case 'hotel_checkin':
    case 'hotel_checkout': return <Building2 className="w-3.5 h-3.5" />;
    case 'rental_pickup':
    case 'rental_dropoff':
    case 'car_rental': return <Car className="w-3.5 h-3.5" />;
    case 'parking_start':
    case 'parking_end': return <CircleParking className="w-3.5 h-3.5" />;
    case 'activity_start': return <Ticket className="w-3.5 h-3.5" />;
    case 'transport_departure': return <TrainFront className="w-3.5 h-3.5" />;
    case 'engagement_start': return <Compass className="w-3.5 h-3.5" />;
    default: return <PartyPopper className="w-3.5 h-3.5" />;
  }
};

export function TodayCompactTimeline({ timelineEvents, activeParkingIds }: TodayCompactTimelineProps) {
  const nowStr = getLocalNowString();
  const todayDate = nowStr.substring(0, 10);
  const nowTime = nowStr.substring(11, 16);

  const todayEvents = useMemo(() => {
    return timelineEvents
      .filter((e) => {
        // v3.9.2: Parking uses same string-based date comparison as other events
        // eventLocalDateTime is already normalized by canonical time normalizer
        if (e.sourceType === 'parking') {
          if (activeParkingIds && !activeParkingIds.has(e.sourceId)) return false;
          const eventDate = extractDate(e.eventLocalDateTime);
          return eventDate === todayDate;
        }

        // Non-parking: string-based date comparison
        const eventDate = extractDate(e.eventLocalDateTime);
        if (eventDate !== todayDate) return false;

        // v3.9.2: Stay check-in events remain visible until checkout time passes
        // (stays are ACTIVE from check-in until checkout — never hide early)
        if (e.eventType === 'hotel_checkin') return true;

        // v3.7.3: Exclude expired items (event time already passed)
        const eventTime = extractTime(e.eventLocalDateTime);
        if (eventTime && eventTime < nowTime) return false;

        return true;
      })
      .sort((a, b) => {
        const ta = extractTime(a.eventLocalDateTime) || '99:99';
        const tb = extractTime(b.eventLocalDateTime) || '99:99';
        return ta.localeCompare(tb);
      });
  }, [timelineEvents, todayDate, nowTime, activeParkingIds]);

  // v3.7.3: Do not render TODAY block if no actionable items today
  if (todayEvents.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/30 bg-muted/30 shadow-none">
      <CardHeader className="pb-1.5 pt-2.5 px-3">
        <CardTitle className="text-[10px] font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
          <Calendar className="w-3 h-3" />
          Today
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-2.5 space-y-0.5">
        {todayEvents.map((event) => {
          // v3.9.2: All events use canonical string-based time extraction
          const eventTime = extractTime(event.eventLocalDateTime);
          const displayTime = eventTime ? formatTime12h(eventTime) : '--:--';
          const isPast = eventTime ? eventTime < nowTime : false;

          return (
            <div
              key={event.id}
              className={cn(
                'flex items-center gap-2.5 py-1.5 rounded-lg transition-opacity',
                isPast ? 'opacity-50' : 'opacity-100'
              )}
            >
              <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {getEventIcon(event.eventType)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{event.title}</p>
              </div>
              <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                {displayTime}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
