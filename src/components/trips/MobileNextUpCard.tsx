/**
 * v2.3.2: Mobile "Next Up" Card
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
import type { Trip } from '@/types/database';
import type { NextStopEvent } from '@/lib/canonicalNextStop';

interface MobileNextUpCardProps {
  tripId: string;
  trip: Trip;
}

/**
 * Build a Google Maps URL from an event's address or locationLabel.
 */
function buildMapsUrl(event: NextStopEvent): string | null {
  const query = event.address || event.locationLabel;
  if (!query) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
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

  // Don't render if no next stop
  if (!nextStop) return null;

  const mapsUrl = buildMapsUrl(nextStop);
  const hasLocation = !!mapsUrl;

  return (
    <div className="block md:hidden">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-3">
            {/* Event info */}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-0.5">
                Next Up
              </p>
              <p className="text-sm font-medium truncate text-foreground">
                {nextStop.displayName}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
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

            {/* Navigate button */}
            <Button
              size="sm"
              variant={hasLocation ? "default" : "outline"}
              disabled={!hasLocation}
              className="shrink-0"
              onClick={() => {
                if (mapsUrl) {
                  window.open(mapsUrl, '_blank', 'noopener,noreferrer');
                }
              }}
            >
              <Navigation className="w-4 h-4 mr-1" />
              {hasLocation ? 'Navigate' : 'No location'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
