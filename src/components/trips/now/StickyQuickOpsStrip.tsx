/**
 * v3.3.5: StickyQuickOpsStrip
 *
 * Contextual quick-action bar for mobile NOW tab.
 * Actions: Parking, Timeline, Bookings.
 * No duplication of bottom-nav global tabs (Expense, Explore removed).
 *
 * Compact height (~44px). Hidden on desktop.
 */

import { CircleParking, CalendarDays, Plane } from 'lucide-react';

interface StickyQuickOpsStripProps {
  onParking: () => void;
  onTimeline: () => void;
  onBookings: () => void;
}

export function StickyQuickOpsStrip({
  onParking,
  onTimeline,
  onBookings,
}: StickyQuickOpsStripProps) {
  return (
    <div className="md:hidden">
      <div className="flex items-center justify-around bg-card/95 backdrop-blur-sm border border-border/60 rounded-2xl px-2 py-1.5 shadow-lg mx-auto max-w-sm">
        <button
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-foreground/70 hover:bg-accent/50 active:bg-accent transition-colors"
          onClick={onParking}
          aria-label="Parking"
        >
          <CircleParking className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">Parking</span>
        </button>
        <button
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-foreground/70 hover:bg-accent/50 active:bg-accent transition-colors"
          onClick={onTimeline}
          aria-label="Timeline"
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">Timeline</span>
        </button>
        <button
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-foreground/70 hover:bg-accent/50 active:bg-accent transition-colors"
          onClick={onBookings}
          aria-label="Bookings"
        >
          <Plane className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">Bookings</span>
        </button>
      </div>
    </div>
  );
}
