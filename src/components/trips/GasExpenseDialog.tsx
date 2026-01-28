import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useCreateExpense } from '@/hooks/useExpenses';
import { Fuel, Camera, Loader2, Receipt } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface GasExpenseDialogProps {
  tripId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GasExpenseDialog({ tripId, open, onOpenChange }: GasExpenseDialogProps) {
  const createExpense = useCreateExpense();
  const [amount, setAmount] = useState('');
  const [gallons, setGallons] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setAmount('');
    setGallons('');
    setLocation('');
    setNotes('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    try {
      const description = gallons 
        ? `Gas - ${gallons} gallons${location ? ` at ${location}` : ''}`
        : `Gas${location ? ` at ${location}` : ''}`;

      await createExpense.mutateAsync({
        trip_id: tripId,
        amount: parseFloat(amount),
        category: 'transport',
        sub_category: 'gas',
        date: format(new Date(), 'yyyy-MM-dd'),
        description,
        notes: notes || undefined,
      });

      toast.success('Gas expense added!');
      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to add gas expense:', err);
      toast.error('Failed to add expense');
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        const { data, error } = await supabase.functions.invoke('parse-receipt-image', {
          body: { 
            image_base64: base64, 
            mime_type: file.type 
          },
        });

        if (error) throw error;

        if (data?.success && data?.data) {
          const parsed = data.data;
          if (parsed.amount) setAmount(parsed.amount.toString());
          if (parsed.description) setLocation(parsed.description);
          if (parsed.notes) setNotes(parsed.notes);
          toast.success('Receipt parsed!');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to parse receipt:', err);
      toast.error('Failed to parse receipt');
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="w-5 h-5" />
            Add Gas Expense
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick Scan */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleReceiptUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
            >
              {isParsing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Camera className="w-4 h-4 mr-2" />
              )}
              {isParsing ? 'Scanning...' : 'Scan Receipt'}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gallons">Gallons (optional)</Label>
              <Input
                id="gallons"
                type="number"
                step="0.001"
                placeholder="Gallons"
                value={gallons}
                onChange={(e) => setGallons(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Station/Location (optional)</Label>
            <Input
              id="location"
              placeholder="Station or location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-gradient-ocean hover:opacity-90"
              disabled={!amount || createExpense.isPending}
            >
              {createExpense.isPending ? 'Adding...' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
