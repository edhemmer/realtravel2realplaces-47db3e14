/**
 * v4.0.3: StickyQuickOpsStrip
 *
 * Quick-action bar for mobile NOW tab.
 * Actions: Add Expense (emerald), Explore (navy), Drive Mode (conditional).
 * Compact, premium styling. Hidden on desktop.
 */

import { DollarSign, Compass, Car } from 'lucide-react';

interface StickyQuickOpsStripProps {
  onAddExpense: () => void;
  onExplore: () => void;
  /** v4.0.3: Drive Mode entry — shown when trip has active drive segment */
  onDriveMode?: (() => void) | null;
  /** v4.0.3: Sublabel for Drive Mode pill (e.g., destination) */
  driveModeLabel?: string | null;
}

export function StickyQuickOpsStrip({
  onAddExpense,
  onExplore,
  onDriveMode,
  driveModeLabel,
}: StickyQuickOpsStripProps) {
  return (
    <div className="md:hidden space-y-2">
      <div className="flex items-center gap-4 bg-white border border-border/40 rounded-2xl px-3 py-2 mx-auto max-w-sm">
        <button
          className="flex-1 flex items-center justify-center gap-2 h-[52px] rounded-xl bg-success text-success-foreground shadow-sm hover:bg-success/90 active:scale-[0.98] transition-all"
          onClick={onAddExpense}
          aria-label="Add Expense"
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-sm font-medium">Add Expense</span>
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-2 h-[52px] rounded-xl bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.98] transition-all"
          onClick={onExplore}
          aria-label="Explore"
        >
          <Compass className="w-5 h-5" />
          <span className="text-sm font-medium">Explore</span>
        </button>
      </div>

      {/* v4.0.3: Drive Mode quick entry — only when drive segment exists */}
      {onDriveMode && (
        <button
          className="w-full flex items-center gap-3 px-4 h-12 bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 active:bg-primary/15 transition-colors max-w-sm mx-auto"
          onClick={onDriveMode}
          aria-label="Open Drive Mode"
        >
          <Car className="w-5 h-5 text-primary" />
          <div className="flex-1 text-left min-w-0">
            <span className="text-sm font-medium text-foreground">Drive Mode</span>
            {driveModeLabel && (
              <span className="text-xs text-muted-foreground ml-1.5 truncate">
                — {driveModeLabel}
              </span>
            )}
          </div>
        </button>
      )}
    </div>
  );
}
