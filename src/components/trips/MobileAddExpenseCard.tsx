/**
 * v2.3.5: Mobile "Add Expense" Field Card
 *
 * Mobile-only persistent card providing one-tap access to log an expense.
 * Wires to existing Add Expense flow — no new logic, fields, or camera workflow.
 * Hidden on desktop (md+).
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Receipt } from 'lucide-react';

interface MobileAddExpenseCardProps {
  onTap: () => void;
}

export function MobileAddExpenseCard({ onTap }: MobileAddExpenseCardProps) {
  return (
    <div className="block md:hidden">
      <Card className="border-muted-foreground/15 bg-muted/50">
        <CardContent className="p-3">
          <div className="min-w-0 mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary mb-0.5">
              Add Expense
            </p>
            <p className="text-xs text-muted-foreground">
              Quick capture while you're on the go
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            className="w-full min-h-[44px]"
            onClick={onTap}
          >
            <Receipt className="w-4 h-4 mr-1" />
            Add Expense
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
