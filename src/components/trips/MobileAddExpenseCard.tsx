/**
 * v2.3.5 / v2.3.7: Mobile "Add Expense" Field Card
 *
 * Mobile-only persistent card providing one-tap access to log an expense.
 * v2.3.7: Pill-style CTA, subtle press feedback, improved visual hierarchy.
 * Hidden on desktop (md+).
 */

import { Card, CardContent } from '@/components/ui/card';
import { Plus, Receipt } from 'lucide-react';

interface MobileAddExpenseCardProps {
  onTap: () => void;
}

export function MobileAddExpenseCard({ onTap }: MobileAddExpenseCardProps) {
  return (
    <div className="block md:hidden">
      <Card className="border-muted-foreground/10 bg-muted/30">
        <CardContent className="px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Receipt className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground leading-snug">Add Expense</p>
              <p className="text-[11px] leading-snug text-muted-foreground">Quick capture on the go</p>
            </div>
          </div>
          <button
            onClick={onTap}
            className="w-full min-h-[40px] rounded-full bg-primary text-primary-foreground font-medium text-sm flex items-center justify-center gap-1.5 press-scale"
          >
            <Plus className="w-4 h-4" />
            Add Expense
          </button>
        </CardContent>
      </Card>
    </div>
  );
}
