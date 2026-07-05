import { Car, Compass, DollarSign } from 'lucide-react';

interface StickyQuickOpsStripProps {
  onAddExpense: () => void;
  onExplore: () => void;
  /** Driving Mode entry, shown for drive trips before and during travel. */
  onDriveMode?: (() => void) | null;
  /** Sublabel for Driving Mode pill, usually the destination or next stop. */
  driveModeLabel?: string | null;
}

export function StickyQuickOpsStrip({
  onAddExpense,
  onExplore,
  onDriveMode,
  driveModeLabel,
}: StickyQuickOpsStripProps) {
  return (
    <div className="space-y-2 md:hidden">
      <div className="nav-floating mx-auto grid max-w-sm grid-cols-2 gap-2 rounded-2xl p-2">
        <button
          className="flex h-[50px] items-center justify-center gap-2 rounded-xl bg-card text-foreground shadow-sm ring-1 ring-border/50 transition-all hover:bg-muted/50 active:scale-[0.98]"
          onClick={onAddExpense}
          aria-label="Add spend"
        >
          <DollarSign className="h-5 w-5" />
          <span className="text-sm font-semibold">Spend</span>
        </button>
        <button
          className="flex h-[50px] items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground shadow-sm transition-all hover:bg-primary/90 active:scale-[0.98]"
          onClick={onExplore}
          aria-label="Open places"
        >
          <Compass className="h-5 w-5" />
          <span className="text-sm font-semibold">Places</span>
        </button>
      </div>

      {onDriveMode && (
        <button
          className="nav-floating mx-auto flex h-12 w-full max-w-sm items-center gap-3 rounded-2xl px-4 transition-colors hover:border-primary/35 active:scale-[0.99]"
          onClick={onDriveMode}
          aria-label="Open Driving Mode"
        >
          <Car className="h-5 w-5 text-primary" />
          <div className="min-w-0 flex-1 text-left">
            <span className="text-sm font-medium text-foreground">Driving Mode</span>
            {driveModeLabel && (
              <span className="ml-1.5 truncate text-xs text-muted-foreground">- {driveModeLabel}</span>
            )}
          </div>
        </button>
      )}
    </div>
  );
}
