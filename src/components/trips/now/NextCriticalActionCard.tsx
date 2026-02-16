/**
 * v4.0.0: NextCriticalActionCard
 *
 * Shows the earliest upcoming event with countdown + single primary action.
 * "Trip Complete" only shown when canonical lifecycle = COMPLETED.
 * For UPCOMING/PRE_TRIP trips with no events, shows appropriate planning state.
 * Uses canonical next stop engine — no Date() logic.
 */

import { useNextStop, type NextStopEvent } from '@/hooks/useNextStop';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, Clock, CheckCircle2, CalendarClock, Sparkles } from 'lucide-react';
import { resolveMapsFromNextStop, openMapsDestination } from '@/lib/mapsDestination';
import { getLocalNowString } from '@/lib/canonicalNextStop';
import { resolveCanonicalLifecycle } from '@/lib/canonicalTimePolicy';
import { useMemo } from 'react';

interface NextCriticalActionCardProps {
  tripId: string;
  trip: import('@/types/database').Trip;
}

/**
 * Format "YYYY-MM-DD" to "Feb 11"
 */
function formatDateShort(dateStr: string): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = parseInt(dateStr.substring(5, 7), 10);
  const day = parseInt(dateStr.substring(8, 10), 10);
  return `${months[month - 1]} ${day}`;
}

/**
 * Compute a simple countdown string from now to the event.
 * Uses string comparison only for date, minimal Date() for time diff display.
 */
function computeCountdown(event: NextStopEvent): string {
  const nowStr = getLocalNowString();
  const nowDate = nowStr.substring(0, 10);
  const eventDate = event.eventLocalDate;
  const eventTime = event.eventLocalTime;

  if (eventDate > nowDate) {
    // Future date — show date
    return `${formatDateShort(eventDate)} at ${formatTime12h(eventTime)}`;
  }

  // Same day — show relative time
  const nowTime = nowStr.substring(11, 16);
  const nowMins = parseInt(nowTime.substring(0, 2)) * 60 + parseInt(nowTime.substring(3, 5));
  const eventMins = parseInt(eventTime.substring(0, 2)) * 60 + parseInt(eventTime.substring(3, 5));
  const diffMins = eventMins - nowMins;

  if (diffMins <= 0) return 'Now';
  if (diffMins < 60) return `In ${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `In ${hours}h ${mins}m` : `In ${hours}h`;
}

function formatTime12h(time: string): string {
  const h = parseInt(time.substring(0, 2));
  const m = time.substring(3, 5);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

export function NextCriticalActionCard({ tripId, trip }: NextCriticalActionCardProps) {
  const { state } = useCanonicalTripState(tripId, trip);
  const { nextStop } = useNextStop(state);

  const lifecycle = useMemo(
    () => resolveCanonicalLifecycle(trip.start_date, trip.end_date),
    [trip.start_date, trip.end_date]
  );

  const countdown = useMemo(() => {
    if (!nextStop) return null;
    return computeCountdown(nextStop);
  }, [nextStop]);

  // No next stop — choose message based on canonical lifecycle
  if (!nextStop) {
    // Only show "Trip Complete" for COMPLETED lifecycle
    if (lifecycle.phase === 'COMPLETED') {
      return (
        <Card className="border-border/30 bg-muted/20 shadow-none">
          <CardContent className="py-4 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-success" />
            <p className="text-sm font-semibold text-foreground">Trip Complete</p>
            <p className="text-xs text-muted-foreground">No more upcoming events.</p>
          </CardContent>
        </Card>
      );
    }

    // UPCOMING or PRE_TRIP with no events — show planning state
    if (lifecycle.phase === 'UPCOMING') {
      return (
        <Card className="border-border/30 bg-muted/20 shadow-none">
          <CardContent className="py-4 flex flex-col items-center gap-2">
            <CalendarClock className="w-8 h-8 text-blue-500" />
            <p className="text-sm font-semibold text-foreground">Trip starts in {lifecycle.daysUntilStart} days</p>
            <p className="text-xs text-muted-foreground">Add bookings to build your timeline.</p>
          </CardContent>
        </Card>
      );
    }

    if (lifecycle.substate === 'PRE_TRIP') {
      return (
        <Card className="border-border/30 bg-muted/20 shadow-none">
          <CardContent className="py-4 flex flex-col items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <p className="text-sm font-semibold text-foreground">
              {lifecycle.daysUntilStart > 0
                ? `Trip starts in ${lifecycle.daysUntilStart} days`
                : 'Trip starts today'}
            </p>
            <p className="text-xs text-muted-foreground">Add bookings to see your next event.</p>
          </CardContent>
        </Card>
      );
    }

    // IN_TRIP with no remaining events
    return (
      <Card className="border-border/30 bg-muted/20 shadow-none">
        <CardContent className="py-4 flex flex-col items-center gap-2">
          <CheckCircle2 className="w-8 h-8 text-success" />
          <p className="text-sm font-semibold text-foreground">All caught up</p>
          <p className="text-xs text-muted-foreground">No more events scheduled.</p>
        </CardContent>
      </Card>
    );
  }

  const mapsDest = resolveMapsFromNextStop(nextStop);
  const hasLocation = !!mapsDest;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/8 to-background shadow-md">
      <CardContent className="py-5 px-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Next Up
          </span>
        </div>
        <p className="text-base font-bold text-foreground truncate leading-snug">
          {nextStop.displayName}
        </p>
        <p className="text-sm font-medium text-primary mt-0.5">
          {countdown}
        </p>
        {nextStop.locationLabel && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {nextStop.locationLabel}
          </p>
        )}
        <Button
          variant={hasLocation ? 'default' : 'outline'}
          disabled={!hasLocation}
          className="w-full h-12 rounded-xl font-semibold shadow-sm mt-3 press-scale"
          onClick={() => {
            if (mapsDest) openMapsDestination(mapsDest);
          }}
        >
          <Navigation className="w-4 h-4" />
          {hasLocation ? 'Navigate' : 'No location available'}
        </Button>
      </CardContent>
    </Card>
  );
}
