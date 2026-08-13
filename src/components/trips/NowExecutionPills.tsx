/**
 * NOW Execution Pills
 *
 * Mobile-only shortcuts around saved trip events. A navigation control is only
 * rendered when canonical navigation can resolve a defensible destination.
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Compass, Plus, Navigation, Clock, CalendarCheck } from 'lucide-react';
import { getTodayActionItems, TodayActionItem } from '@/lib/todayActionItems';
import { resolveCanonicalNavigation, openCanonicalNav } from '@/lib/canonicalNavigation';
import type { CanonicalTimelineEvent } from '@/lib/canonicalTripState';

interface NowExecutionPillsProps {
  timelineEvents: CanonicalTimelineEvent[];
  onExplore: () => void;
  onAddExpense: () => void;
}

function resolveItemNavigation(item: TodayActionItem) {
  return resolveCanonicalNavigation({
    address: item.address,
    bookingType: item.bookingType === 'flight' || item.eventType === 'flight_departure' || item.eventType === 'flight'
      ? 'flight'
      : undefined,
    departureAirportCode: item.departureAirportCode,
    arrivalAirportCode: item.arrivalAirportCode,
    locationLabel: item.title,
  });
}

export function NowExecutionPills({ timelineEvents, onExplore, onAddExpense }: NowExecutionPillsProps) {
  const todayItems = useMemo(() => getTodayActionItems(timelineEvents), [timelineEvents]);

  return (
    <div className="md:hidden space-y-2">
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

      {todayItems.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          {todayItems.map((item) => {
            const nav = resolveItemNavigation(item);
            const content = (
              <>
                {nav && <Navigation className="w-3.5 h-3.5 shrink-0 text-primary" />}
                <span className="truncate">{item.title}</span>
                {item.localTime && (
                  <span className="ml-auto flex items-center gap-1 text-muted-foreground shrink-0">
                    <Clock className="w-3 h-3" />
                    {item.localTime}
                  </span>
                )}
              </>
            );

            if (!nav) {
              return (
                <div
                  key={item.id}
                  className="flex h-10 w-full items-center gap-2 rounded-full border border-border/40 bg-muted/30 px-4 text-xs font-medium text-foreground"
                >
                  {content}
                </div>
              );
            }

            return (
              <Button
                key={item.id}
                variant="secondary"
                size="sm"
                className="h-10 rounded-full text-xs font-medium press-scale w-full justify-start gap-2"
                onClick={() => void openCanonicalNav(nav)}
              >
                {content}
              </Button>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/30">
          <CalendarCheck className="w-4 h-4 text-muted-foreground/60 shrink-0" />
          <p className="text-xs text-muted-foreground">No upcoming saved trip actions today.</p>
        </div>
      )}
    </div>
  );
}
