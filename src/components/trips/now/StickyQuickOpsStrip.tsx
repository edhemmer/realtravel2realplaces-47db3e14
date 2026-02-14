/**
 * v3.4.2: StickyQuickOpsStrip
 *
 * Two-button quick-action bar for mobile NOW tab.
 * Actions: Add Expense (emerald), Explore (navy).
 * Compact, premium styling. Hidden on desktop.
 */

import { DollarSign, Compass } from 'lucide-react';

interface StickyQuickOpsStripProps {
  onAddExpense: () => void;
  onExplore: () => void;
}

export function StickyQuickOpsStrip({
  onAddExpense,
  onExplore,
}: StickyQuickOpsStripProps) {
  return (
    <div className="md:hidden">
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
    </div>
  );
}
