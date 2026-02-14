/**
 * v3.10.8: TodayCompactTimeline
 *
 * Renders today's timeline rows from the canonical TODAY execution stack.
 * No sorting — receives pre-ordered rows from buildCanonicalTodayExecutionStack.
 *
 * Uses string-based date/time — no Date() for logic.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar, Plane, Building2, Car, CircleParking, Compass,
  Ticket, TrainFront, PartyPopper, MapPin
} from 'lucide-react';
import type { TodayTimelineRow } from '@/lib/canonicalTodayExecutionStack';
import { cn } from '@/lib/utils';

interface TodayCompactTimelineProps {
  /** Pre-sorted today timeline rows from buildCanonicalTodayExecutionStack */
  todayTimelineRows: TodayTimelineRow[];
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

export function TodayCompactTimeline({ todayTimelineRows }: TodayCompactTimelineProps) {
  if (todayTimelineRows.length === 0) return null;

  return (
    <Card className="border-border/30 bg-muted/30 shadow-none">
      <CardHeader className="pb-1.5 pt-2.5 px-3">
        <CardTitle className="text-[10px] font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
          <Calendar className="w-3 h-3" />
          Today
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-2.5 space-y-0.5">
        {todayTimelineRows.map((row) => (
          <div
            key={row.event.id}
            className={cn(
              'flex items-center gap-2.5 py-1.5 rounded-lg transition-opacity',
              row.isPast ? 'opacity-50' : 'opacity-100'
            )}
          >
            <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              {getEventIcon(row.event.eventType)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{row.event.title}</p>
              {/* v3.10.10: IATA code with pin — confirmation as separate text */}
              {row.displayLocation && (
                <p className="text-[11px] text-muted-foreground flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  {row.displayLocation}
                  {row.displaySubMeta && (
                    <span className="ml-1">· {row.displaySubMeta}</span>
                  )}
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground tabular-nums shrink-0">
              {row.timeDisplay}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
