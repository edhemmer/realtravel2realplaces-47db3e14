/**
 * v2.3.2 / v2.3.3: Mobile "Next Up" Card
 *
 * Mobile-only compact card showing the next upcoming trip event.
 * Consumes useNextStop hook output — no logic changes to canonical helpers.
 * 
 * Features:
 * - Shows next event name, date, time, and location
 * - Navigate button opens maps URL when location available
 * - Hidden when no next stop exists
 * - Hidden on desktop (md+)
 */

import { useNextStop } from '@/hooks/useNextStop';
import { useCanonicalTripStateFromData } from '@/hooks/useCanonicalTripState';
import { useBookings } from '@/hooks/useBookings';
import { useExpenses } from '@/hooks/useExpenses';
import { useParking } from '@/hooks/useParking';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, Clock, MapPin } from 'lucide-react';
import { resolveMapsFromNextStop, openMapsDestination } from '@/lib/mapsDestination';
import type { Trip } from '@/types/database';

interface MobileNextUpCardProps {
  tripId: string;
  trip: Trip;
}


/**
 * Format date string "YYYY-MM-DD" to a short display like "Feb 11"
 * Uses string extraction only — no Date() for logic.
 */
function formatDateShort(dateStr: string): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = parseInt(dateStr.substring(5, 7), 10);
  const day = parseInt(dateStr.substring(8, 10), 10);
  return `${months[month - 1]} ${day}`;
}

export function MobileNextUpCard({ tripId, trip }: MobileNextUpCardProps) {
  // Fetch canonical data to derive next stop
  const { data: bookings = [] } = useBookings(tripId);
  const { data: expenses = [] } = useExpenses(tripId);
  const { data: parkingList = [] } = useParking(tripId);

  const canonicalState = useCanonicalTripStateFromData(trip, bookings, expenses, parkingList);
  const { nextStop } = useNextStop(canonicalState);

  // v2.3.3: Stable container — collapses cleanly when null, no layout shift
  if (!nextStop) return <div className="hidden md:hidden" />;

  const mapsDest = resolveMapsFromNextStop(nextStop);
  const hasLocation = !!mapsDest;

  return (
    <div className="block md:hidden">
      <Card className="rt-command-panel">
        <CardContent className="px-3 py-2.5">
          {/* Event info — single compact block */}
          <div className="min-w-0 mb-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-0.5">
              Next Up
            </p>
            <p className="text-sm font-medium truncate text-foreground leading-snug overflow-hidden text-ellipsis whitespace-nowrap">
              {nextStop.displayName}
            </p>
            <div className="flex items-center gap-2 mt-0.5 text-[12px] leading-snug text-muted-foreground truncate">
              <span className="flex items-center gap-1 shrink-0">
                <Clock className="w-3 h-3" />
                {formatDateShort(nextStop.eventLocalDate)} · {nextStop.eventLocalTime}
              </span>
              {nextStop.locationLabel && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{nextStop.locationLabel}</span>
                </span>
              )}
            </div>
          </div>

          <Button
            size="sm"
            variant={hasLocation ? "default" : "outline"}
            disabled={!hasLocation}
            className="w-full h-10 rounded-full text-sm font-medium press-scale mt-2"
            onClick={() => {
              if (mapsDest) openMapsDestination(mapsDest);
            }}
          >
            <Navigation className="w-4 h-4" />
            {hasLocation ? 'Navigate' : 'No location available'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
