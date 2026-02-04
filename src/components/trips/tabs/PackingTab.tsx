import { useState, useMemo } from 'react';
import { usePackingItems, useCreatePackingItem, useUpdatePackingItem, useDeletePackingItem, useBulkCreatePackingItems } from '@/hooks/usePackingItems';
import { useTrip } from '@/hooks/useTrips';
import { useTripWeather } from '@/hooks/useWeather';
import { supabase } from '@/integrations/supabase/client';
import { PackingItem } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, Trash2, Sparkles, Copy, Check, Cloud, Sun, 
  Briefcase, ShoppingBag, Luggage, Waves, RefreshCw, AlertCircle, Mountain, Building2,
  Minus
} from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';
import { useTripPermission } from '@/pages/TripDetail';
import { CompactWeatherWidget } from '@/components/trips/CompactWeatherWidget';

interface PackingTabProps {
  tripId: string;
}

// Icon mapping for categories
const categoryIcons: Record<string, React.ReactNode> = {
  'Clothing': <ShoppingBag className="w-4 h-4" />,
  'Swimwear & Beach': <Waves className="w-4 h-4" />,
  'Hiking & Outdoor': <Mountain className="w-4 h-4" />,
  'City Essentials': <Building2 className="w-4 h-4" />,
  'Toiletries & Health': <Plus className="w-4 h-4" />,
  'Electronics': <Sparkles className="w-4 h-4" />,
  'Documents': <Briefcase className="w-4 h-4" />,
  'Essentials': <Check className="w-4 h-4" />,
  'Weather Gear': <Cloud className="w-4 h-4" />,
  'Business': <Briefcase className="w-4 h-4" />,
};

// Category colors for visual distinction
const categoryColors: Record<string, string> = {
  'Clothing': 'bg-blue-500/10 text-blue-600 border-blue-200',
  'Swimwear & Beach': 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  'Hiking & Outdoor': 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  'City Essentials': 'bg-slate-500/10 text-slate-600 border-slate-200',
  'Toiletries & Health': 'bg-green-500/10 text-green-600 border-green-200',
  'Electronics': 'bg-purple-500/10 text-purple-600 border-purple-200',
  'Documents': 'bg-amber-500/10 text-amber-600 border-amber-200',
  'Essentials': 'bg-rose-500/10 text-rose-600 border-rose-200',
  'Weather Gear': 'bg-sky-500/10 text-sky-600 border-sky-200',
  'Business': 'bg-slate-500/10 text-slate-600 border-slate-200',
};

interface AIPackingResponse {
  items: { category: string; item_name: string; quantity: number }[];
  luggage_recommendation: { type: string; description: string };
  special_notes?: string[];
}

function getLuggageRecommendation(tripDays: number): { type: string; icon: React.ReactNode; description: string } {
  if (tripDays <= 2) {
    return {
      type: 'Personal Item',
      icon: <Briefcase className="w-5 h-5" />,
      description: 'A backpack or small bag should be sufficient for a quick trip',
    };
  } else if (tripDays <= 5) {
    return {
      type: 'Carry-On Bag',
      icon: <ShoppingBag className="w-5 h-5" />,
      description: 'A standard carry-on bag (22" x 14" x 9") should fit everything',
    };
  } else {
    return {
      type: 'Checked Bag',
      icon: <Luggage className="w-5 h-5" />,
      description: 'Consider a checked bag for extended trips with more items',
    };
  }
}

export function PackingTab({ tripId }: PackingTabProps) {
  const { canEdit } = useTripPermission();
  const { data: packingItems = [], isLoading } = usePackingItems(tripId);
  const { data: trip } = useTrip(tripId);
  const createItem = useCreatePackingItem();
  const updateItem = useUpdatePackingItem();
  const deleteItem = useDeletePackingItem();
  const bulkCreate = useBulkCreatePackingItems();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiLuggageRec, setAiLuggageRec] = useState<{ type: string; description: string } | null>(null);
  const [specialNotes, setSpecialNotes] = useState<string[]>([]);
  const [preselectedCategory, setPreselectedCategory] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category: '',
    item_name: '',
    quantity: '1',
  });

  // Calculate trip duration
  const tripDays = useMemo(() => {
    if (!trip) return 3;
    return differenceInDays(parseISO(trip.end_date), parseISO(trip.start_date)) + 1;
  }, [trip]);

  const tripNights = tripDays - 1;

  // Get weather data for AI packing list generation
  const { tripForecast, weatherAnalysis, isLoading: weatherLoading } = useTripWeather(
    trip?.destination_city?.trim() || '',
    trip?.destination_country || '',
    trip?.start_date || '',
    trip?.end_date || '',
    trip?.destination_state || undefined
  );

  const luggageRec = getLuggageRecommendation(tripDays);
  const displayLuggageRec = aiLuggageRec || luggageRec;

  const resetForm = () => {
    setFormData({ category: '', item_name: '', quantity: '1' });
    setPreselectedCategory(null);
  };

  const openAddDialogForCategory = (category: string) => {
    setPreselectedCategory(category);
    setFormData({ category, item_name: '', quantity: '1' });
    setDialogOpen(true);
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

  const updateQuantity = async (item: PackingItem, newQuantity: number) => {
    if (newQuantity < 1) return;
    await updateItem.mutateAsync({
      id: item.id,
      trip_id: tripId,
      quantity: newQuantity,
    });
  };

  const handleDelete = async (itemId: string) => {
    await deleteItem.mutateAsync({ id: itemId, trip_id: tripId });
  };

  const generatePackingList = async () => {
    if (!trip) return;
    
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke<{ success: boolean; data: AIPackingResponse; error?: string }>('generate-packing-list', {
        body: {
          destination_city: trip.destination_city.trim(),
          destination_state: trip.destination_state || null,
          destination_country: trip.destination_country,
          start_date: trip.start_date,
          end_date: trip.end_date,
          trip_type: trip.trip_type,
          destination_type: (trip as any).destination_type || 'unspecified',
          weather_forecast: tripForecast.length > 0 ? {
            avgHigh: weatherAnalysis.avgHigh,
            avgLow: weatherAnalysis.avgLow,
            hasRain: weatherAnalysis.hasRain,
            hasHot: weatherAnalysis.hasHot,
            hasCold: weatherAnalysis.hasCold,
            hasSnow: weatherAnalysis.hasSnow,
          } : null,
        },
      });

      if (error) throw error;

      if (data?.success && data.data?.items) {
        await bulkCreate.mutateAsync({ trip_id: tripId, items: data.data.items });
        
        if (data.data.luggage_recommendation) {
          setAiLuggageRec(data.data.luggage_recommendation);
        }
        if (data.data.special_notes) {
          setSpecialNotes(data.data.special_notes);
        }
      } else {
        throw new Error(data?.error || 'Failed to generate packing list');
      }
    } catch (err) {
      console.error('Error generating packing list:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to generate packing list');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    const groupedItems = packingItems.reduce((acc, item) => {
      if (!acc[item.category]) acc[item.category] = [];
      acc[item.category].push(item);
      return acc;
    }, {} as Record<string, PackingItem[]>);

    let text = `Packing List for ${trip?.name || 'Trip'}\n`;
    text += `${tripDays} days • ${trip?.destination_city}, ${trip?.destination_country}\n\n`;
    
    Object.entries(groupedItems).forEach(([category, items]) => {
      text += `▸ ${category}\n`;
      items.forEach(item => {
        const checkbox = item.is_packed ? '✓' : '○';
        text += `  ${checkbox} ${item.item_name}${item.quantity > 1 ? ` (×${item.quantity})` : ''}\n`;
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
    <div className="space-y-6">
      {/* Header with compact weather widget and actions v1.2.8 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h3 className="text-lg font-semibold">Packing List</h3>
            <p className="text-sm text-muted-foreground">{tripNights} night{tripNights !== 1 ? 's' : ''} in {trip?.destination_city}{trip?.destination_state ? `, ${trip.destination_state}` : ''}</p>
          </div>
          {trip && (
            <CompactWeatherWidget
              city={trip.destination_city}
              country={trip.destination_country}
              state={trip.destination_state || undefined}
              startDate={trip.start_date}
              endDate={trip.end_date}
            />
          )}
        </div>
        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            {packingItems.length === 0 ? (
              <Button onClick={generatePackingList} variant="outline" disabled={isGenerating || weatherLoading}>
                <Sparkles className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : weatherLoading ? 'Checking Weather...' : 'Generate AI Packing List'}
              </Button>
            ) : (
              <>
                <Button onClick={generatePackingList} variant="ghost" size="sm" disabled={isGenerating}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                <Button onClick={copyToClipboard} variant="outline" size="sm">
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  Copy
                </Button>
              </>
            )}
            <Button onClick={() => setDialogOpen(true)} className="bg-gradient-ocean hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        )}
        {!canEdit && packingItems.length > 0 && (
          <Button onClick={copyToClipboard} variant="outline" size="sm">
            {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
            Copy
          </Button>
        )}
      </div>

      {/* Luggage Recommendation */}
      <div className="grid gap-4 md:grid-cols-1">
        {/* Luggage Recommendation */}
        <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {displayLuggageRec.type === 'Checked Bag' ? <Luggage className="w-5 h-5" /> : 
               displayLuggageRec.type === 'Carry-On' ? <ShoppingBag className="w-5 h-5" /> : 
               <Briefcase className="w-5 h-5" />}
              Luggage Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="secondary" className="text-base font-semibold px-3 py-1">
                {displayLuggageRec.type}
              </Badge>
              <p className="text-sm text-muted-foreground">{displayLuggageRec.description}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Special Notes from AI */}
      {specialNotes.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Packing Tips for {trip?.destination_city}</p>
                <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
                  {specialNotes.map((note, idx) => (
                    <li key={idx}>• {note}</li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      {packingItems.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Packing Progress</span>
              <span className="text-sm text-muted-foreground">
                {packedItems} of {totalItems} items
              </span>
            </div>
            <Progress value={progress} className="h-2" />
            {progress === 100 && (
              <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                <Check className="w-4 h-4" /> All packed! Ready to go!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Items by Category */}
      {Object.keys(groupedItems).length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(groupedItems).map(([category, items]) => {
            const categoryPacked = items.filter(i => i.is_packed).length;
            const categoryProgress = (categoryPacked / items.length) * 100;
            const colorClass = categoryColors[category] || 'bg-muted text-foreground border-border';
            
            return (
              <Card key={category} className="overflow-hidden">
                <CardHeader className={`pb-2 ${colorClass.split(' ')[0]}`}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {categoryIcons[category]}
                      {category}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={colorClass}>
                        {categoryPacked}/{items.length}
                      </Badge>
                      {canEdit && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => openAddDialogForCategory(category)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <Progress value={categoryProgress} className="h-1 mt-2" />
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="space-y-1">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-2 rounded-lg transition-all ${
                          item.is_packed 
                            ? 'bg-green-50 dark:bg-green-950/20' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Checkbox
                            checked={item.is_packed}
                            onCheckedChange={() => canEdit && togglePacked(item)}
                            disabled={!canEdit}
                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 flex-shrink-0"
                          />
                          <span className={`text-sm truncate ${item.is_packed ? 'line-through text-muted-foreground' : ''}`}>
                            {item.item_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Quantity Stepper - Compact & Elegant */}
                          {canEdit ? (
                            <div className="inline-flex items-center h-5 rounded-full border border-border/60 bg-muted/30 overflow-hidden">
                              <button
                                type="button"
                                className="flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                onClick={() => updateQuantity(item, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-[11px] font-medium w-4 text-center tabular-nums">{item.quantity}</span>
                              <button
                                type="button"
                                className="flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                                onClick={() => updateQuantity(item, item.quantity + 1)}
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground tabular-nums">×{item.quantity}</span>
                          )}
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Luggage className="w-8 h-8 text-primary" />
            </div>
            <h4 className="text-lg font-medium mb-1">No packing list yet</h4>
            <p className="text-muted-foreground text-sm text-center max-w-sm mb-4">
              AI will generate a smart packing list based on your {tripNights}-night trip to {trip?.destination_city}{trip?.destination_state ? `, ${trip.destination_state}` : ''} and current weather
            </p>
            <div className="flex gap-2">
              <Button onClick={generatePackingList} disabled={isGenerating || weatherLoading}>
                <Sparkles className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate AI Packing List'}
              </Button>
              <Button onClick={() => setDialogOpen(true)} variant="outline">
                Add Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {preselectedCategory ? `Add Item to ${preselectedCategory}` : 'Add Packing Item'}
            </DialogTitle>
            <DialogDescription>Add an item to your packing list</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {preselectedCategory ? (
              <div className="space-y-2">
                <Label>Category</Label>
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                  {categoryIcons[preselectedCategory]}
                  <span className="font-medium">{preselectedCategory}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Category *</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Clothing, Toiletries, Electronics..."
                  required
                />
              </div>
            )}

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
