/**
 * v2.6.19: NOW Execution Pills
 *
 * Mobile-only component rendering the NOW tab's execution engine:
 * - Base pills: Explore + Add Expense (always)
 * - Execution pills: one per today-relevant actionable item
 * - Empty state: "No scheduled actions today." when no actionable items
 *
 * Hidden on desktop.
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Compass, Plus, Navigation, Clock, CalendarCheck } from 'lucide-react';
import { getTodayActionItems, TodayActionItem } from '@/lib/todayActionItems';
import { resolveAirportRef, getAirportCoords } from '@/lib/location/locationResolver';
import { buildNavTarget, openNavTarget, buildMapsSearchUrl } from '@/lib/location/navigationTargets';
import type { CanonicalTimelineEvent } from '@/lib/canonicalTripState';

interface NowExecutionPillsProps {
  timelineEvents: CanonicalTimelineEvent[];
  onExplore: () => void;
  onAddExpense: () => void;
}

/**
 * v3.5.3: Resolve a navigation action for an actionable item.
 * Uses coords-first resolution: airport coords → address NavTarget → coords-based URL.
 * NEVER sends raw strings like city names or "Nearby" as map queries.
 */
function handleItemNavigate(item: TodayActionItem) {
  // 1. Flights: resolve airport coordinates directly
  if (item.bookingType === 'flight' || item.eventType === 'flight_departure' || item.eventType === 'flight') {
    const depCode = item.departureAirportCode;
    const arrCode = item.arrivalAirportCode;
    // For departure events, prefer departure airport; otherwise arrival
    const code = (item.eventType === 'flight_departure' ? depCode : arrCode) || depCode || arrCode;
    if (code) {
      const coords = getAirportCoords(code);
      if (coords) {
        window.open(
          `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`,
          '_blank',
          'noopener,noreferrer'
        );
        return;
      }
      // Fallback: canonical airport ref → NavTarget
      const ref = resolveAirportRef({ iata: code });
      if (ref) {
        const target = buildNavTarget(ref);
        if (target) {
          window.open(buildMapsSearchUrl(target), '_blank', 'noopener,noreferrer');
          return;
        }
      }
    }
  }

  // 2. Address-based: build NavTarget (prefers coords → address → query)
  if (item.address) {
    const target = buildNavTarget({
      kind: 'PLACE',
      key: item.sourceId,
      label: item.title,
      address: item.address,
    });
    if (target) {
      window.open(buildMapsSearchUrl(target), '_blank', 'noopener,noreferrer');
      return;
    }
  }

  // 3. Last resort: use title as query (only when no other data available)
  const target = buildNavTarget({
    kind: 'PLACE',
    key: item.sourceId,
    label: item.title,
  });
  if (target) {
    window.open(buildMapsSearchUrl(target), '_blank', 'noopener,noreferrer');
  }
}

export function NowExecutionPills({ timelineEvents, onExplore, onAddExpense }: NowExecutionPillsProps) {
  const todayItems = useMemo(() => getTodayActionItems(timelineEvents), [timelineEvents]);

  return (
    <div className="md:hidden space-y-2">
      {/* Base pills — always present */}
      <div className="flex gap-2">
        <Button
          variant="default"
          className="h-12 rounded-xl text-sm font-semibold press-scale flex-1 shadow-sm"
          onClick={onExplore}
        >
          <Compass className="w-3.5 h-3.5" />
          Explore
        </Button>
        <Button
          className="h-12 rounded-xl text-sm font-semibold press-scale flex-1 shadow-sm bg-success text-success-foreground hover:bg-success/90 active:bg-success/80"
          onClick={onAddExpense}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Expense
        </Button>
      </div>

      {/* Execution pills or empty state */}
      {todayItems.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {todayItems.map((item) => (
            <Button
              key={item.id}
              variant="secondary"
              size="sm"
              className="h-10 rounded-full text-xs font-medium press-scale w-full justify-start gap-2"
              onClick={() => handleItemNavigate(item)}
            >
              <Navigation className="w-3.5 h-3.5 shrink-0 text-primary" />
              <span className="truncate">{item.title}</span>
              {item.localTime && (
                <span className="ml-auto flex items-center gap-1 text-muted-foreground shrink-0">
                  <Clock className="w-3 h-3" />
                  {item.localTime}
                </span>
              )}
            </Button>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/30">
          <CalendarCheck className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          <p className="text-xs text-muted-foreground">No scheduled actions today.</p>
        </div>
      )}
    </div>
  );
}
