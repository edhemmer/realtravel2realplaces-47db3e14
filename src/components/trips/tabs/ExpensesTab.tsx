import { useState, useCallback, useRef } from 'react';
import { useExpenses, useCreateExpense, useDeleteExpense } from '@/hooks/useExpenses';
import { Expense, ExpenseCategory, ExpenseSubCategory } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Trash2, Receipt, Utensils, Car, PartyPopper, ShoppingBag, 
  ParkingCircle, MoreHorizontal, Upload, Sparkles, Camera, AlertCircle,
  CheckCircle, RefreshCw, Image as ImageIcon, Fuel
} from 'lucide-react';
import { GasExpenseDialog } from '@/components/trips/GasExpenseDialog';
import { format, parseISO } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTripPermission } from '@/pages/TripDetail';

interface ExpensesTabProps {
  tripId: string;
}


const SUB_CATEGORIES: Record<ExpenseCategory, { value: ExpenseSubCategory; label: string }[]> = {
  meals: [
    { value: 'breakfast', label: 'Breakfast' },
    { value: 'lunch', label: 'Lunch' },
    { value: 'dinner', label: 'Dinner' },
    { value: 'snacks', label: 'Snacks' },
    { value: 'coffee', label: 'Coffee' },
    { value: 'groceries', label: 'Groceries' },
    { value: 'alcohol', label: 'Alcohol' },
    { value: 'beverages', label: 'Beverages' },
  ],
  transport: [
    { value: 'uber', label: 'Uber/Lyft' },
    { value: 'taxi', label: 'Taxi' },
    { value: 'gas', label: 'Gas' },
    { value: 'tolls', label: 'Tolls' },
    { value: 'public_transit', label: 'Public Transit' },
    { value: 'rental_car', label: 'Rental Car' },
  ],
  activity: [
    { value: 'tours', label: 'Tours' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'tickets', label: 'Tickets' },
    { value: 'sports', label: 'Sports' },
  ],
  shopping: [
    { value: 'souvenirs', label: 'Souvenirs' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'gifts', label: 'Gifts' },
  ],
  parking: [
    { value: 'parking_expense', label: 'Parking Fee' },
  ],
  other: [
    { value: 'tips', label: 'Tips' },
    { value: 'fees', label: 'Fees' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'miscellaneous', label: 'Miscellaneous' },
  ],
};

export function ExpensesTab({ tripId }: ExpensesTabProps) {
  const { canEdit } = useTripPermission();
  const { data: expenses = [], isLoading } = useExpenses(tripId);
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseSuccess, setParseSuccess] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

const [gasDialogOpen, setGasDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'meals' as ExpenseCategory,
    sub_category: '' as ExpenseSubCategory | '',
    description: '',
    amount: '',
    my_share: '',
    notes: '',
    receipt_url: '',
  });

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      category: 'meals' as ExpenseCategory,
      sub_category: '',
      description: '',
      amount: '',
      my_share: '',
      notes: '',
      receipt_url: '',
    });
    setPreviewImage(null);
    setParseError(null);
    setParseSuccess(false);
  };

  // Quick-add opens dialog with pre-selected category/subcategory
  const openQuickAdd = (category: ExpenseCategory, subCategory: ExpenseSubCategory) => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      category,
      sub_category: subCategory,
      description: '',
      amount: '',
      my_share: '',
      notes: '',
      receipt_url: '',
    });
    setPreviewImage(null);
    setParseError(null);
    setParseSuccess(false);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount) || 0;
    // Default my_share to total amount if not specified or empty
    const myShare = formData.my_share && formData.my_share.trim() !== '' 
      ? parseFloat(formData.my_share) 
      : amount;
    
    await createExpense.mutateAsync({
      trip_id: tripId,
      date: formData.date,
      category: formData.category,
      sub_category: formData.sub_category || 'miscellaneous',
      description: formData.description || undefined,
      amount: amount,
      my_share: myShare,
      notes: formData.notes || undefined,
      receipt_url: formData.receipt_url || undefined,
    });
    
    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (expenseToDelete) {
      deleteExpense.mutate({ id: expenseToDelete, trip_id: tripId });
      setExpenseToDelete(null);
    }
  };

  // Handle image file selection (from camera or file picker)
  const handleImageSelect = useCallback(async (file: File) => {
    setParseError(null);
    setParseSuccess(false);
    setUploadingImage(true);
    
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setParseError('Please select an image file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setParseError('Image must be less than 10MB');
        return;
      }

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
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('receipts')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get the URL for the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, receipt_url: publicUrl }));

      // Convert to base64 for AI parsing
      const base64Reader = new FileReader();
      base64Reader.onload = async (e) => {
        const base64Data = (e.target?.result as string).split(',')[1];
        await parseReceiptImage(base64Data);
      };
      base64Reader.readAsDataURL(file);

    } catch (error) {
      console.error('Image upload error:', error);
      setParseError('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  }, []);

  // Parse receipt image with AI
  const parseReceiptImage = async (base64Data: string) => {
    setParsing(true);
    setParseError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('parse-receipt-image', {
        body: { imageBase64: base64Data },
      });

      // Handle network-level errors
      if (error) {
        console.error('Network error:', error);
        setParseError('Unable to connect. Please check your connection and try again.');
        toast.error('Connection error');
        return;
      }

      // Handle unreadable receipts
      if (data?.readable === false) {
        const message = data.retryMessage || data.message || 'Unable to read receipt';
        setParseError(message);
        toast.error(data.message || 'Unable to read receipt');
        return;
      }
      
      // Handle low confidence - still populate but warn user
      if (data?.lowConfidence && data?.data) {
        const parsed = data.data;
        
        // Build notes from breakdown even for low confidence
        const noteParts: string[] = [];
        if (parsed.location) noteParts.push(`📍 ${parsed.location}`);
        if (parsed.subtotal) noteParts.push(`Subtotal: $${parsed.subtotal.toFixed(2)}`);
        if (parsed.tax) noteParts.push(`Tax: $${parsed.tax.toFixed(2)}`);
        if (parsed.tip) noteParts.push(`Tip: $${parsed.tip.toFixed(2)}`);
        
        setFormData(prev => ({
          ...prev,
          date: parsed.date || prev.date,
          category: parsed.category || prev.category,
          sub_category: parsed.sub_category || 'miscellaneous',
          description: parsed.vendor_name || parsed.description || '',
          amount: parsed.amount?.toString() || '',
          notes: noteParts.length > 0 ? noteParts.join(' | ') : '',
        }));
        setParseError('Low confidence in some fields. Please verify the data.');
        toast.warning('Data extracted with low confidence. Please verify.');
        return;
      }

      // Check for success
      if (!data?.success) {
        const message = data?.message || 'We couldn\'t parse this receipt. Please enter details manually.';
        setParseError(message);
        toast.warning(message);
        return;
      }

      // Success - populate form with all extracted data
      const parsed = data.data;
      
      // Build detailed notes from extracted breakdown
      const noteParts: string[] = [];
      if (parsed.location) noteParts.push(`📍 ${parsed.location}`);
      if (parsed.subtotal) noteParts.push(`Subtotal: $${parsed.subtotal.toFixed(2)}`);
      if (parsed.tax) noteParts.push(`Tax: $${parsed.tax.toFixed(2)}`);
      if (parsed.tip) noteParts.push(`Tip: $${parsed.tip.toFixed(2)}`);
      
      setFormData(prev => ({
        ...prev,
        date: parsed.date || prev.date,
        category: parsed.category || prev.category,
        sub_category: parsed.sub_category || 'miscellaneous',
        description: parsed.vendor_name || parsed.description || '',
        amount: parsed.amount?.toString() || '',
        notes: noteParts.length > 0 ? noteParts.join(' | ') : '',
      }));
      
      setParseSuccess(true);
      toast.success(data.message || `Receipt parsed: ${parsed.vendor_name || 'Receipt'}`);
      
    } catch (error) {
      console.error('Parse error:', error);
      setParseError('An unexpected error occurred. Please enter data manually or retake photo.');
      toast.error('Something went wrong');
    } finally {
      setParsing(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageSelect(file);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const handleReceiptParse = useCallback(async (text: string) => {
    setParsing(true);
    setParseError(null);
    try {
      const { data, error } = await supabase.functions.invoke('parse-booking', {
        body: { text, type: 'receipt' },
      });

      // Handle network-level errors
      if (error) {
        console.error('Network error:', error);
        setParseError('Unable to connect. Please check your connection.');
        toast.error('Connection error');
        return;
      }
      
      if (data?.success && data?.data) {
        const parsed = data.data;
        setFormData(prev => ({
          ...prev,
          date: parsed.date || prev.date,
          category: parsed.category || prev.category,
          sub_category: parsed.sub_category || 'miscellaneous',
          description: parsed.description || parsed.vendor_name || '',
          amount: parsed.amount?.toString() || '',
        }));
        setParseSuccess(true);
        toast.success(data.message || 'Receipt parsed successfully!');
      } else {
        const message = data?.message || 'We couldn\'t parse this text. Please enter details manually.';
        setParseError(message);
        toast.warning(message);
      }
    } catch (error) {
      console.error('Parse error:', error);
      setParseError('An unexpected error occurred. Please try again.');
      toast.error('Something went wrong');
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    
    // Check for files first (images)
    if (e.dataTransfer.files?.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        handleImageSelect(file);
        return;
      }
    }
    
    // Otherwise check for text
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      handleReceiptParse(text);
    }
  }, [handleReceiptParse, handleImageSelect]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'meals': return <Utensils className="w-4 h-4" />;
      case 'transport': return <Car className="w-4 h-4" />;
      case 'activity': return <PartyPopper className="w-4 h-4" />;
      case 'shopping': return <ShoppingBag className="w-4 h-4" />;
      case 'parking': return <ParkingCircle className="w-4 h-4" />;
      default: return <MoreHorizontal className="w-4 h-4" />;
    }
  };

  // Filter expenses by category
  const filteredExpenses = activeCategory === 'all' 
    ? expenses 
    : expenses.filter(e => e.category === activeCategory);

  // Calculate totals
  const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalMyShare = filteredExpenses.reduce((sum, e) => sum + Number(e.my_share ?? e.amount ?? 0), 0);

  // Group by category for summary
  const byCategory = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount || 0);
    return acc;
  }, {} as Record<string, number>);

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Expenses</h3>
          {canEdit && (
            <Button onClick={() => setDialogOpen(true)} className="bg-gradient-ocean hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          )}
        </div>
        
        {/* Quick-Add Buttons */}
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setGasDialogOpen(true)}>
              <Fuel className="w-4 h-4 mr-1" />
              Gas
            </Button>
            <Button variant="outline" size="sm" onClick={() => openQuickAdd('meals', 'groceries')}>
              <ShoppingBag className="w-4 h-4 mr-1" />
              Groceries
            </Button>
            <Button variant="outline" size="sm" onClick={() => openQuickAdd('meals', 'breakfast')}>
              <Utensils className="w-4 h-4 mr-1" />
              Breakfast
            </Button>
            <Button variant="outline" size="sm" onClick={() => openQuickAdd('meals', 'lunch')}>
              <Utensils className="w-4 h-4 mr-1" />
              Lunch
            </Button>
            <Button variant="outline" size="sm" onClick={() => openQuickAdd('meals', 'dinner')}>
              <Utensils className="w-4 h-4 mr-1" />
              Dinner
            </Button>
            <Button variant="outline" size="sm" onClick={() => openQuickAdd('other', 'miscellaneous')}>
              <MoreHorizontal className="w-4 h-4 mr-1" />
              Other
            </Button>
          </div>
        )}
      </div>

      {/* Gas Expense Dialog */}
      <GasExpenseDialog 
        tripId={tripId} 
        open={gasDialogOpen} 
        onOpenChange={setGasDialogOpen} 
      />

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Expenses</CardDescription>
            <CardTitle className="text-2xl">${totalAmount.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>My Share</CardDescription>
            <CardTitle className="text-2xl text-primary">${totalMyShare.toFixed(2)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top Category</CardDescription>
            <CardTitle className="text-lg capitalize">
              {Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Category Filter Tabs */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="meals" className="text-xs">
            <Utensils className="w-3 h-3 mr-1" />Meals
          </TabsTrigger>
          <TabsTrigger value="transport" className="text-xs">
            <Car className="w-3 h-3 mr-1" />Transport
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs">
            <PartyPopper className="w-3 h-3 mr-1" />Activity
          </TabsTrigger>
          <TabsTrigger value="shopping" className="text-xs">
            <ShoppingBag className="w-3 h-3 mr-1" />Shopping
          </TabsTrigger>
          <TabsTrigger value="parking" className="text-xs">
            <ParkingCircle className="w-3 h-3 mr-1" />Parking
          </TabsTrigger>
          <TabsTrigger value="other" className="text-xs">
            <MoreHorizontal className="w-3 h-3 mr-1" />Other
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeCategory} className="mt-4">
          {filteredExpenses.length > 0 ? (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredExpenses.map((expense: Expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                          {getCategoryIcon(expense.category)}
                        </div>
                        <div>
                          <p className="font-medium">
                            {expense.description || (expense.category === 'transport' && expense.sub_category === 'gas' ? 'Gas' : expense.category)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(expense.date), 'MMM d, yyyy')}
                            {/* Don't show sub-category for gas since 'Gas' is already displayed as the category */}
                            {expense.sub_category && expense.sub_category !== 'gas' && ` • ${expense.sub_category.replace('_', ' ')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">${Number(expense.amount).toFixed(2)}</p>
                          {Number(expense.my_share || expense.amount) > 0 && (
                            <p className="text-sm text-muted-foreground">My share: ${Number(expense.my_share ?? expense.amount).toFixed(2)}</p>
                          )}
                        </div>
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setExpenseToDelete(expense.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Receipt className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {activeCategory === 'all' ? 'No expenses yet' : `No ${activeCategory} expenses`}
                </p>
                <Button onClick={() => setDialogOpen(true)} variant="link" className="mt-2">
                  Add your first expense
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Take a photo or drop receipt text to auto-fill</DialogDescription>
          </DialogHeader>

          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInputChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* Receipt Photo/Upload Section */}
          <div className="space-y-3">
            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => cameraInputRef.current?.click()}
                disabled={parsing || uploadingImage}
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing || uploadingImage}
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                Upload Image
              </Button>
            </div>

            {/* Drop Zone */}
            <div 
              className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                parsing || uploadingImage ? 'border-primary bg-primary/5' : 'hover:border-primary/50 cursor-pointer'
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => !parsing && !uploadingImage && fileInputRef.current?.click()}
            >
              {parsing ? (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                  <span>AI is parsing your receipt...</span>
                </div>
              ) : uploadingImage ? (
                <div className="flex items-center justify-center gap-2 text-primary">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>Uploading image...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Upload className="w-6 h-6" />
                  <span className="text-sm">Drop receipt image or text here</span>
                </div>
              )}
            </div>

            {/* Preview Image */}
            {previewImage && (
              <div className="relative">
                <img 
                  src={previewImage} 
                  alt="Receipt preview" 
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1 h-6 w-6 p-0 bg-background/80"
                  onClick={() => {
                    setPreviewImage(null);
                    setFormData(prev => ({ ...prev, receipt_url: '' }));
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}

            {/* Parse Status Messages */}
            {parseError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{parseError}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setParseError(null);
                      cameraInputRef.current?.click();
                    }}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {parseSuccess && !parseError && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-300">
                  Receipt parsed successfully! Please verify the data below.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v: ExpenseCategory) => setFormData({ ...formData, category: v, sub_category: '' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meals">Meals</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="activity">Activity</SelectItem>
                    <SelectItem value="shopping">Shopping</SelectItem>
                    <SelectItem value="parking">Parking</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {SUB_CATEGORIES[formData.category]?.length > 0 && (
              <div className="space-y-2">
                <Label>Sub-Category</Label>
                <Select 
                  value={formData.sub_category} 
                  onValueChange={(v: ExpenseSubCategory) => setFormData({ ...formData, sub_category: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-category" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUB_CATEGORIES[formData.category].map(sub => (
                      <SelectItem key={sub.value} value={sub.value}>{sub.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>My Share</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.my_share}
                  onChange={(e) => setFormData({ ...formData, my_share: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-ocean hover:opacity-90" disabled={createExpense.isPending}>
                {createExpense.isPending ? 'Adding...' : 'Add Expense'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!expenseToDelete} onOpenChange={() => setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Expense</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this expense? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
