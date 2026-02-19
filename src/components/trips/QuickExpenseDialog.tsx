/**
 * v3.9.6: Quick Expense Dialog — Minimal Capture Variant (Mobile)
 *
 * Launched from active trip context. Shows only:
 * - Amount (required)
 * - Category (required, defaults to last-used on this trip)
 * - Optional Note
 * - "Advanced" toggle for remaining fields
 *
 * After save: closes dialog (no redirect), shows success toast,
 * query invalidation updates Trip Total & My Share automatically.
 */

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useCreateExpense, useExpenses } from '@/hooks/useExpenses';
import { useTrip } from '@/hooks/useTrips';
import { ExpenseCategory, ExpensePurpose } from '@/types/database';
import { format } from 'date-fns';
import { useTripPermission } from '@/pages/TripDetail';

interface QuickExpenseDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: 'meals', label: 'Meals' },
  { value: 'transport', label: 'Transport' },
  { value: 'activity', label: 'Activity' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'parking', label: 'Parking' },
  { value: 'other', label: 'Other' },
];

export function QuickExpenseDialog({ tripId, open, onOpenChange }: QuickExpenseDialogProps) {
  const createExpense = useCreateExpense();
  const { data: expenses = [] } = useExpenses(tripId);
  const { data: trip } = useTrip(tripId);
  const { canEdit, canAddExpenses } = useTripPermission();
  const canWrite = canAddExpenses || canEdit;

  // Derive last-used category for this trip
  const lastUsedCategory = useMemo((): ExpenseCategory => {
    if (expenses.length === 0) return 'other';
    // Expenses are sorted by date desc from the hook
    return (expenses[0].category as ExpenseCategory) || 'other';
  }, [expenses]);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(lastUsedCategory);
  const [notes, setNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Advanced fields
  const [description, setDescription] = useState('');
  const [myShare, setMyShare] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expensePurpose, setExpensePurpose] = useState<ExpensePurpose | ''>('');

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setAmount('');
      setCategory(lastUsedCategory);
      setNotes('');
      setShowAdvanced(false);
      setDescription('');
      setMyShare('');
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setExpensePurpose('');
    }
  }, [open, lastUsedCategory]);

  const isMixedTrip = trip?.trip_type === 'mixed';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;

    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) return;

    const parsedMyShare = myShare && myShare.trim() !== ''
      ? parseFloat(myShare)
      : parsedAmount;

    await createExpense.mutateAsync({
      trip_id: tripId,
      date,
      category,
      amount: parsedAmount,
      my_share: parsedMyShare,
      notes: notes || undefined,
      description: description || undefined,
      expense_purpose: isMixedTrip && expensePurpose ? expensePurpose : undefined,
    });

    // Close dialog — stay on current screen. Toast handled by useCreateExpense.
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Expense</DialogTitle>
          <DialogDescription>Capture on the go</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount — primary input */}
          <div className="space-y-2">
            <Label>Amount *</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
              autoFocus
              className="text-lg h-12"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category *</Label>
            <Select value={category} onValueChange={(v: ExpenseCategory) => setCategory(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label>Note (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Quick note..."
            />
          </div>

          {/* Advanced toggle */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="w-full text-xs text-muted-foreground gap-1">
                {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Advanced
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description"
                />
              </div>
              <div className="space-y-2">
                <Label>My Share</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={myShare}
                  onChange={(e) => setMyShare(e.target.value)}
                  placeholder="Defaults to full amount"
                />
              </div>
              {isMixedTrip && (
                <div className="space-y-2">
                  <Label>Expense Type</Label>
                  <Select value={expensePurpose} onValueChange={(v: ExpensePurpose) => setExpensePurpose(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Business or Personal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">💼 Business</SelectItem>
                      <SelectItem value="personal">🏠 Personal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-success text-success-foreground hover:bg-success/90"
              disabled={createExpense.isPending}
            >
              {createExpense.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
