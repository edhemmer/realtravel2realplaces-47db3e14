/**
 * v3.1.0: StickyQuickOpsStrip
 *
 * Icon-only quick-action strip, sticky above bottom nav on mobile.
 * Actions: Add Expense, Parking, Gas (conditional), Share.
 *
 * Compact height. Hidden on desktop.
 */

import { Button } from '@/components/ui/button';
import { DollarSign, CircleParking, Fuel, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StickyQuickOpsStripProps {
  onAddExpense: () => void;
  onParking: () => void;
  onGas?: () => void;
  showGas: boolean;
  tripName: string;
}

export function StickyQuickOpsStrip({
  onAddExpense,
  onParking,
  onGas,
  showGas,
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
    <div className="md:hidden sticky bottom-16 z-30 px-4 pb-2">
      <div className="flex items-center justify-center gap-3 bg-card/95 backdrop-blur-sm border border-border/60 rounded-full px-4 py-2 shadow-lg mx-auto w-fit">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full text-success hover:bg-success/10 active:bg-success/20"
          onClick={onAddExpense}
          aria-label="Add Expense"
        >
          <DollarSign className="w-5 h-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full hover:bg-primary/10 active:bg-primary/20"
          onClick={onParking}
          aria-label="Parking"
        >
          <CircleParking className="w-5 h-5" />
        </Button>
        {showGas && onGas && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-primary/10 active:bg-primary/20"
            onClick={onGas}
            aria-label="Gas Expense"
          >
            <Fuel className="w-5 h-5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full hover:bg-primary/10 active:bg-primary/20"
          onClick={handleShare}
          aria-label="Share"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
