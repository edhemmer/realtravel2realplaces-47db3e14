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
import { resolveMapsDestination, openMapsDestination } from '@/lib/mapsDestination';
import type { CanonicalTimelineEvent } from '@/lib/canonicalTripState';

interface NowExecutionPillsProps {
  timelineEvents: CanonicalTimelineEvent[];
  onExplore: () => void;
  onAddExpense: () => void;
}

/**
 * Resolve a navigation action for an actionable item.
 */
function handleItemNavigate(item: TodayActionItem) {
  // Try address first
  if (item.address) {
    const dest = resolveMapsDestination({ address: item.address });
    if (dest) {
      openMapsDestination(dest);
      return;
    }
  }
  // Fallback: open Google Maps search with title
  const query = item.address || item.title;
  window.open(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    '_blank',
    'noopener,noreferrer'
  );
}

export function NowExecutionPills({ timelineEvents, onExplore, onAddExpense }: NowExecutionPillsProps) {
  const todayItems = useMemo(() => getTodayActionItems(timelineEvents), [timelineEvents]);

  return (
    <div className="md:hidden space-y-2">
      {/* Base pills — always present */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-full text-xs font-medium press-scale flex-1"
          onClick={onExplore}
        >
          <Compass className="w-3.5 h-3.5" />
          Explore
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-full text-xs font-medium press-scale flex-1"
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
