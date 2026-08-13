import { ExternalLink, FileImage, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import type { Expense } from '@/types/database';
import { resolveReceiptAccess } from '@/lib/receiptAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ReceiptRecordsPanel({ expenses }: { expenses: Expense[] }) {
  const receiptExpenses = expenses.filter(
    (expense) => Boolean(expense.receipt_storage_path || expense.receipt_url),
  );

  if (receiptExpenses.length === 0) return null;

  const openReceipt = async (expense: Expense) => {
    const result = await resolveReceiptAccess(expense);
    if (result.status === 'missing') {
      toast.error('No receipt file is attached to this expense.');
      return;
    }
    if (result.status === 'forbidden_or_unavailable') {
      toast.error(result.message);
      return;
    }

    window.open(result.url, '_blank', 'noopener,noreferrer');
    if (result.source === 'legacy_url') {
      toast.message('Opening a legacy receipt link. This older record may need to be reattached if the link has expired.');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileImage className="h-4 w-4 text-primary" />
          Receipt records
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="mb-3 flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Private receipt files are opened with short-lived access generated when you request them. Stored object identity does not expire.</span>
        </div>
        {receiptExpenses.slice(0, 8).map((expense) => (
          <div key={expense.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{expense.description || expense.category}</p>
              <p className="text-xs text-muted-foreground">{expense.date}</p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => void openReceipt(expense)}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Receipt
            </Button>
          </div>
        ))}
        {receiptExpenses.length > 8 && (
          <p className="pt-1 text-xs text-muted-foreground">Showing the 8 most recent receipt records in this quick-access panel.</p>
        )}
      </CardContent>
    </Card>
  );
}
