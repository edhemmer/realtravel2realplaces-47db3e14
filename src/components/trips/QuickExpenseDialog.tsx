/**
 * v4.2.0: Quick Expense Dialog — Minimal Capture Variant (Mobile)
 *
 * Launched from active trip context. Shows only:
 * - Receipt photo capture (camera / gallery)
 * - Amount (required)
 * - Category (required, defaults to last-used on this trip)
 * - Optional Note
 * - "Advanced" toggle for remaining fields
 *
 * After save: closes dialog (no redirect), shows success toast,
 * query invalidation updates Trip Total & My Share automatically.
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp, AlertCircle, Camera, Image as ImageIcon, X, Loader2 } from 'lucide-react';
import { useCreateExpense, useExpenses } from '@/hooks/useExpenses';
import { useTrip } from '@/hooks/useTrips';
import { useUserProfile } from '@/hooks/useUserProfile';
import { ExpenseCategory, ExpensePurpose } from '@/types/database';
import { format } from 'date-fns';
import { useTripPermission } from '@/pages/TripDetail';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const { data: userProfile } = useUserProfile();
  const homeCurrency = userProfile?.preferred_currency || 'USD';
  const { canEdit, canAddExpenses } = useTripPermission();
  const canWrite = canAddExpenses || canEdit;

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Derive last-used category for this trip
  const lastUsedCategory = useMemo((): ExpenseCategory => {
    if (expenses.length === 0) return 'other';
    return (expenses[0].category as ExpenseCategory) || 'other';
  }, [expenses]);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>(lastUsedCategory);
  const [notes, setNotes] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [currency, setCurrency] = useState(homeCurrency);
  const [convertedAmount, setConvertedAmount] = useState('');

  // Photo state
  const [receiptUrl, setReceiptUrl] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Advanced fields
  const [description, setDescription] = useState('');
  const [myShare, setMyShare] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [expensePurpose, setExpensePurpose] = useState<ExpensePurpose | ''>('');

  const isForeignCurrency = currency.toUpperCase() !== homeCurrency.toUpperCase();

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
      setCurrency(homeCurrency);
      setConvertedAmount('');
      setReceiptUrl('');
      setPreviewImage(null);
      setUploadingImage(false);
    }
  }, [open, lastUsedCategory, homeCurrency]);

  const isMixedTrip = trip?.trip_type === 'mixed';

  // Handle image file from camera or gallery
  const handleImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setUploadingImage(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to storage
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get a signed URL (1 hour expiry)
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('receipts')
        .createSignedUrl(fileName, 3600);

      if (signedUrlError) throw signedUrlError;

      setReceiptUrl(signedUrlData.signedUrl);
      toast.success('Receipt uploaded');
    } catch (error) {
      console.error('Image upload error:', error);
      toast.error('Failed to upload image');
      setPreviewImage(null);
    } finally {
      setUploadingImage(false);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  }, [handleImageFile]);

  const removeImage = useCallback(() => {
    setPreviewImage(null);
    setReceiptUrl('');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWrite) return;

    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) return;

    const parsedMyShare = myShare && myShare.trim() !== ''
      ? parseFloat(myShare)
      : parsedAmount;

    const parsedConverted = convertedAmount ? parseFloat(convertedAmount) : null;
    const finalConverted = isForeignCurrency && parsedConverted && parsedConverted > 0 ? parsedConverted : null;

    await createExpense.mutateAsync({
      trip_id: tripId,
      date,
      category,
      amount: parsedAmount,
      my_share: parsedMyShare,
      notes: notes || undefined,
      description: description || undefined,
      expense_purpose: isMixedTrip && expensePurpose ? expensePurpose : undefined,
      currency: currency || homeCurrency,
      converted_amount: finalConverted,
      converted_currency: finalConverted ? homeCurrency : undefined,
      receipt_url: receiptUrl || undefined,
    });

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
          {/* Receipt Photo — camera / gallery */}
          <div className="space-y-2">
            <Label>Receipt Photo</Label>
            {previewImage ? (
              <div className="relative rounded-lg overflow-hidden border border-border">
                <img
                  src={previewImage}
                  alt="Receipt preview"
                  className="w-full max-h-40 object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full"
                  onClick={removeImage}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
                {uploadingImage && (
                  <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 flex-col gap-1 text-xs"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-primary" />
                  )}
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-14 flex-col gap-1 text-xs"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-primary" />
                  )}
                  From Gallery
                </Button>
              </div>
            )}
            {/* Hidden file inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileInput}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

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

          {/* Currency selector */}
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
                <SelectItem value="CAD">CAD</SelectItem>
                <SelectItem value="AUD">AUD</SelectItem>
                <SelectItem value="JPY">JPY</SelectItem>
                <SelectItem value="CHF">CHF</SelectItem>
                <SelectItem value="MXN">MXN</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Manual conversion for foreign currency */}
          {isForeignCurrency && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  Convert to {homeCurrency}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter the {homeCurrency} equivalent to include in trip totals.
              </p>
              <Input
                type="number"
                step="0.01"
                value={convertedAmount}
                onChange={(e) => setConvertedAmount(e.target.value)}
                placeholder={`Amount in ${homeCurrency}`}
              />
              {!convertedAmount && (
                <p className="text-[11px] text-amber-600 italic">
                  Without conversion, this won't be in trip totals.
                </p>
              )}
            </div>
          )}
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
              disabled={createExpense.isPending || uploadingImage}
            >
              {createExpense.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
