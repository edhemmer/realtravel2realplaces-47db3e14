/**
 * v2.6.28: NOW Command Center — ExecutionZone
 *
 * Mobile-only execution-first component rendered at the top of the NOW tab.
 * Contains:
 *   A) Primary Action Row — Explore + Add Expense (always visible)
 *   B) Conditional Timeline Action Row — today-relevant actionable items
 *   C) Empty State — when no today items exist
 *
 * Hidden on desktop.
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Compass, Plus, Navigation, Clock, CalendarCheck } from 'lucide-react';
import { getTodayActionItems, TodayActionItem } from '@/lib/todayActionItems';
import { resolveMapsDestination, openMapsDestination } from '@/lib/mapsDestination';
import type { CanonicalTimelineEvent } from '@/lib/canonicalTripState';

interface ExecutionZoneProps {
  timelineEvents: CanonicalTimelineEvent[];
  onExplore: () => void;
  onAddExpense: () => void;
}

function handleItemNavigate(item: TodayActionItem) {
  if (item.address) {
    const dest = resolveMapsDestination({ address: item.address });
    if (dest) {
      openMapsDestination(dest);
      return;
    }
  }
  const query = item.address || item.title;
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    '_blank',
    'noopener,noreferrer'
  );
}

export function ExecutionZone({ timelineEvents, onExplore, onAddExpense }: ExecutionZoneProps) {
  const todayItems = useMemo(() => getTodayActionItems(timelineEvents), [timelineEvents]);

  return (
    <div className="md:hidden space-y-3">
      {/* A) Primary Action Row — always visible */}
      <div className="flex gap-3">
        <Button
          variant="default"
          className="h-12 rounded-xl text-sm font-semibold flex-1 press-scale shadow-sm"
          onClick={onExplore}
        >
          <Compass className="w-4 h-4" />
          Explore
        </Button>
        <Button
          className="h-12 rounded-xl text-sm font-semibold flex-1 press-scale shadow-sm bg-success text-success-foreground hover:bg-success/90 active:bg-success/80"
          onClick={onAddExpense}
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </Button>
      </div>

      {/* B) Conditional Timeline Action Row / C) Empty State */}
      {todayItems.length > 0 ? (
        <div className="flex flex-col gap-2">
          {todayItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl bg-secondary/60 border border-border/30"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                {item.localTime && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <Clock className="w-3 h-3" />
                    {item.localTime}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg text-xs font-medium shrink-0 press-scale"
                onClick={() => handleItemNavigate(item)}
              >
                <Navigation className="w-3.5 h-3.5" />
                Navigate
              </Button>
            </div>
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
