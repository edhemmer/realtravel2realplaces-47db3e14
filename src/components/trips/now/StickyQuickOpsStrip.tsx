/**
 * v4.0.3: StickyQuickOpsStrip
 *
 * Quick-action bar for mobile NOW tab.
 * Actions: Add Expense (emerald), Explore (navy), Drive Mode (conditional).
 * Compact, premium styling. Hidden on desktop.
 */

import { Car, Compass, DollarSign } from 'lucide-react';

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
      <div className="nav-floating mx-auto grid max-w-sm grid-cols-2 gap-2 rounded-2xl p-2">
        <button
          className="flex h-[50px] items-center justify-center gap-2 rounded-xl bg-card text-foreground shadow-sm ring-1 ring-border/50 transition-all hover:bg-muted/50 active:scale-[0.98]"
          onClick={onAddExpense}
          aria-label="Add Expense"
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-sm font-semibold">Expense</span>
        </button>
        <button
          className="flex h-[50px] items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          onClick={onExplore}
          aria-label="Explore"
        >
          <Compass className="w-5 h-5" />
          <span className="text-sm font-semibold">Explore</span>
        </button>
      </div>

      {/* v4.0.3: Drive Mode quick entry — only when drive segment exists */}
      {onDriveMode && (
        <button
          className="nav-floating mx-auto flex h-12 w-full max-w-sm items-center gap-3 rounded-2xl px-4 transition-colors hover:border-primary/35 active:scale-[0.99]"
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
