import { useState, useCallback } from 'react';
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
  ParkingCircle, MoreHorizontal, Upload, Sparkles 
} from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const { data: expenses = [], isLoading } = useExpenses(tripId);
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [parsing, setParsing] = useState(false);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    category: 'meals' as ExpenseCategory,
    sub_category: '' as ExpenseSubCategory | '',
    description: '',
    amount: '',
    my_share: '',
    notes: '',
  });

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      category: 'meals',
      sub_category: '',
      description: '',
      amount: '',
      my_share: '',
      notes: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createExpense.mutateAsync({
      trip_id: tripId,
      date: formData.date,
      category: formData.category,
      sub_category: formData.sub_category || undefined,
      description: formData.description || undefined,
      amount: parseFloat(formData.amount) || 0,
      my_share: formData.my_share ? parseFloat(formData.my_share) : 0,
      notes: formData.notes || undefined,
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

  const handleReceiptParse = useCallback(async (text: string) => {
    setParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke('parse-booking', {
        body: { text, type: 'receipt' },
      });

      if (error) throw error;
      
      if (data?.success && data?.data) {
        const parsed = data.data;
        setFormData(prev => ({
          ...prev,
          date: parsed.date || prev.date,
          category: parsed.category || prev.category,
          sub_category: parsed.sub_category || '',
          description: parsed.description || parsed.vendor_name || '',
          amount: parsed.amount?.toString() || '',
        }));
        toast.success('Receipt parsed successfully!');
      }
    } catch (error) {
      console.error('Parse error:', error);
      toast.error('Failed to parse receipt');
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      handleReceiptParse(text);
    }
  }, [handleReceiptParse]);

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
  const totalMyShare = filteredExpenses.reduce((sum, e) => sum + Number(e.my_share || 0), 0);

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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Expenses</h3>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-ocean hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>

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
                          <p className="font-medium">{expense.description || expense.category}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(expense.date), 'MMM d, yyyy')} 
                            {expense.sub_category && ` • ${expense.sub_category.replace('_', ' ')}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">${Number(expense.amount).toFixed(2)}</p>
                          {expense.my_share > 0 && (
                            <p className="text-sm text-muted-foreground">My share: ${Number(expense.my_share).toFixed(2)}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setExpenseToDelete(expense.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Track your trip spending</DialogDescription>
          </DialogHeader>

          {/* AI Parse Drop Zone */}
          <div 
            className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            {parsing ? (
              <div className="flex items-center justify-center gap-2 text-primary">
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span>Parsing receipt...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="w-6 h-6" />
                <span className="text-sm">Drop receipt text here to auto-fill</span>
              </div>
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
                placeholder="Dinner at restaurant"
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
