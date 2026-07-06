import { Car, Compass, DollarSign } from 'lucide-react';
import { tapHaptic } from '@/lib/native/haptics';

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
      <div className="rt-ios-action-strip nav-floating mx-auto grid max-w-sm grid-cols-2 gap-2 rounded-2xl p-2">
        <button
          className="rt-ios-quick-action"
          onClick={() => {
            void tapHaptic();
            onAddExpense();
          }}
          aria-label="Add spend"
        >
          <DollarSign className="h-5 w-5" />
          <span className="text-sm font-semibold">Spend</span>
        </button>
        <button
          className="rt-ios-quick-action rt-ios-quick-action-primary"
          onClick={() => {
            void tapHaptic();
            onExplore();
          }}
          aria-label="Open places"
        >
          <Compass className="h-5 w-5" />
          <span className="text-sm font-semibold">Places</span>
        </button>
      </div>

      {onDriveMode && (
        <button
          className="rt-ios-drive-ribbon nav-floating mx-auto flex h-12 w-full max-w-sm items-center gap-3 rounded-2xl px-4 transition-colors hover:border-primary/35 active:scale-[0.99]"
          onClick={() => {
            void tapHaptic();
            onDriveMode();
          }}
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
