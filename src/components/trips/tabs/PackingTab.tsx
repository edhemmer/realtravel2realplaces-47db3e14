import { useState } from 'react';
import { usePackingItems, useCreatePackingItem, useUpdatePackingItem, useDeletePackingItem, useBulkCreatePackingItems } from '@/hooks/usePackingItems';
import { useTrip } from '@/hooks/useTrips';
import { PackingItem } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Trash2, Luggage, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface PackingTabProps {
  tripId: string;
}

const DEFAULT_PACKING_LIST = {
  'Clothing': [
    { item_name: 'T-shirts', quantity: 5 },
    { item_name: 'Pants/Shorts', quantity: 3 },
    { item_name: 'Underwear', quantity: 7 },
    { item_name: 'Socks', quantity: 7 },
    { item_name: 'Sleepwear', quantity: 2 },
    { item_name: 'Jacket/Sweater', quantity: 1 },
  ],
  'Toiletries': [
    { item_name: 'Toothbrush', quantity: 1 },
    { item_name: 'Toothpaste', quantity: 1 },
    { item_name: 'Shampoo', quantity: 1 },
    { item_name: 'Deodorant', quantity: 1 },
    { item_name: 'Sunscreen', quantity: 1 },
  ],
  'Electronics': [
    { item_name: 'Phone charger', quantity: 1 },
    { item_name: 'Power bank', quantity: 1 },
    { item_name: 'Headphones', quantity: 1 },
    { item_name: 'Camera', quantity: 1 },
  ],
  'Documents': [
    { item_name: 'Passport', quantity: 1 },
    { item_name: 'ID', quantity: 1 },
    { item_name: 'Travel insurance', quantity: 1 },
    { item_name: 'Booking confirmations', quantity: 1 },
  ],
  'Essentials': [
    { item_name: 'Wallet', quantity: 1 },
    { item_name: 'Medications', quantity: 1 },
    { item_name: 'Glasses/Contacts', quantity: 1 },
    { item_name: 'Travel pillow', quantity: 1 },
  ],
};

export function PackingTab({ tripId }: PackingTabProps) {
  const { data: packingItems = [], isLoading } = usePackingItems(tripId);
  const { data: trip } = useTrip(tripId);
  const createItem = useCreatePackingItem();
  const updateItem = useUpdatePackingItem();
  const deleteItem = useDeletePackingItem();
  const bulkCreate = useBulkCreatePackingItems();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    category: '',
    item_name: '',
    quantity: '1',
  });

  const resetForm = () => {
    setFormData({ category: '', item_name: '', quantity: '1' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createItem.mutateAsync({
      trip_id: tripId,
      category: formData.category,
      item_name: formData.item_name,
      quantity: parseInt(formData.quantity) || 1,
    });
    
    resetForm();
    setDialogOpen(false);
  };

  const togglePacked = async (item: PackingItem) => {
    await updateItem.mutateAsync({
      id: item.id,
      trip_id: tripId,
      is_packed: !item.is_packed,
    });
  };

  const handleDelete = async (itemId: string) => {
    await deleteItem.mutateAsync({ id: itemId, trip_id: tripId });
  };

  const generatePackingList = async () => {
    const items: { category: string; item_name: string; quantity: number }[] = [];
    
    Object.entries(DEFAULT_PACKING_LIST).forEach(([category, categoryItems]) => {
      categoryItems.forEach(item => {
        items.push({ category, ...item });
      });
    });

    // Add business items if business trip
    if (trip?.trip_type === 'business' || trip?.trip_type === 'mixed') {
      items.push(
        { category: 'Business', item_name: 'Business cards', quantity: 1 },
        { category: 'Business', item_name: 'Laptop', quantity: 1 },
        { category: 'Business', item_name: 'Formal attire', quantity: 2 },
      );
    }

    await bulkCreate.mutateAsync({ trip_id: tripId, items });
  };

  const copyToClipboard = () => {
    const groupedItems = packingItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, PackingItem[]>);

    let text = `Packing List for ${trip?.name || 'Trip'}\n\n`;
    
    Object.entries(groupedItems).forEach(([category, items]) => {
      text += `${category}:\n`;
      items.forEach(item => {
        const checkbox = item.is_packed ? '☑' : '☐';
        text += `  ${checkbox} ${item.item_name}${item.quantity > 1 ? ` (x${item.quantity})` : ''}\n`;
      });
      text += '\n';
    });

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Group items by category
  const groupedItems = packingItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, PackingItem[]>);

  const totalItems = packingItems.length;
  const packedItems = packingItems.filter(i => i.is_packed).length;
  const progress = totalItems > 0 ? (packedItems / totalItems) * 100 : 0;

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-semibold">Packing List</h3>
        <div className="flex gap-2 flex-wrap">
          {packingItems.length === 0 && (
            <Button onClick={generatePackingList} variant="outline" disabled={bulkCreate.isPending}>
              <Sparkles className="w-4 h-4 mr-2" />
              {bulkCreate.isPending ? 'Generating...' : 'Generate List'}
            </Button>
          )}
          {packingItems.length > 0 && (
            <Button onClick={copyToClipboard} variant="outline">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Copy to Clipboard
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)} className="bg-gradient-ocean hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Progress */}
      {packingItems.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Packing Progress</span>
              <span className="text-sm font-medium">{packedItems} / {totalItems} items</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-ocean transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items by Category */}
      {Object.keys(groupedItems).length > 0 ? (
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([category, items]) => (
            <Card key={category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{category}</CardTitle>
                <CardDescription>
                  {items.filter(i => i.is_packed).length} of {items.length} packed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={item.is_packed}
                          onCheckedChange={() => togglePacked(item)}
                        />
                        <span className={item.is_packed ? 'line-through text-muted-foreground' : ''}>
                          {item.item_name}
                          {item.quantity > 1 && (
                            <span className="text-muted-foreground ml-1">(x{item.quantity})</span>
                          )}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Luggage className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">No packing list yet</p>
            <div className="flex gap-2">
              <Button onClick={generatePackingList} variant="outline" disabled={bulkCreate.isPending}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Smart List
              </Button>
              <Button onClick={() => setDialogOpen(true)} variant="link">
                or add items manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Packing Item</DialogTitle>
            <DialogDescription>Add an item to your packing list</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="Clothing, Toiletries, Electronics..."
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label>Item Name *</Label>
                <Input
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  placeholder="T-shirt"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-ocean hover:opacity-90" disabled={createItem.isPending}>
                {createItem.isPending ? 'Adding...' : 'Add Item'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
