/**
 * v3.3.8: StickyQuickOpsStrip
 *
 * Contextual quick-action bar for mobile NOW tab.
 * Actions: Parking, Timeline, Bookings.
 *
 * v3.3.8: Semantic color upgrade
 * - Timeline: solid primary (blue) bg, white icon/text
 * - Bookings: solid primary (blue) bg, white icon/text
 * - Parking: outline style, neutral gray
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
      <div className="flex items-center justify-around bg-card/95 backdrop-blur-sm border border-border/60 rounded-2xl px-3 py-2 shadow-lg mx-auto max-w-sm">
        <button
          className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 transition-colors"
          onClick={onTimeline}
          aria-label="Timeline"
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] font-semibold leading-none">Timeline</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:bg-primary/80 transition-colors"
          onClick={onBookings}
          aria-label="Bookings"
        >
          <Plane className="w-5 h-5" />
          <span className="text-[10px] font-semibold leading-none">Bookings</span>
        </button>
        <button
          className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl border border-border/60 text-muted-foreground hover:bg-muted/50 active:bg-muted transition-colors"
          onClick={onParking}
          aria-label="Parking"
        >
          <CircleParking className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">Parking</span>
        </button>
      </div>
    </div>
  );
}
