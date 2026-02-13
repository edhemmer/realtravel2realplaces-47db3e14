/**
 * v3.2.0: StickyQuickOpsStrip
 *
 * Labeled quick-action bar, sticky above bottom nav on mobile.
 * Actions: Expense, Explore, Parking, Share.
 *
 * Compact height (~44px). Hidden on desktop.
 */

import { Button } from '@/components/ui/button';
import { DollarSign, Compass, CircleParking, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface StickyQuickOpsStripProps {
  onAddExpense: () => void;
  onExplore: () => void;
  onParking: () => void;
  tripName: string;
}

export function StickyQuickOpsStrip({
  onAddExpense,
  onExplore,
  onParking,
  tripName,
}: StickyQuickOpsStripProps) {
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: tripName, text: `Check out my trip: ${tripName}` });
      } catch {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard');
    }
  };

  return (
    <div className="md:hidden sticky bottom-16 z-30 px-3 pb-2">
      <div className="flex items-center justify-around bg-card/95 backdrop-blur-sm border border-border/60 rounded-2xl px-2 py-1.5 shadow-lg mx-auto max-w-sm">
        <button
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-success hover:bg-success/8 active:bg-success/15 transition-colors"
          onClick={onAddExpense}
          aria-label="Add Expense"
        >
          <DollarSign className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">Expense</span>
        </button>
        <button
          className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl text-primary hover:bg-primary/8 active:bg-primary/15 transition-colors"
          onClick={onExplore}
          aria-label="Explore"
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">Explore</span>
        </button>
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
          onClick={handleShare}
          aria-label="Share"
        >
          <Share2 className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">Share</span>
        </button>
      </div>
    </div>
  );
}
