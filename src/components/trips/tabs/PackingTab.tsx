import { useState, useMemo } from 'react';
import { usePackingItems, useCreatePackingItem, useUpdatePackingItem, useDeletePackingItem, useBulkCreatePackingItems } from '@/hooks/usePackingItems';
import { useTrip } from '@/hooks/useTrips';
import { useTripWeather } from '@/hooks/useWeather';
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
  CloudRain, Snowflake, Thermometer, Briefcase, ShoppingBag, Luggage
} from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';

interface PackingTabProps {
  tripId: string;
}

// Icon mapping for categories
const categoryIcons: Record<string, React.ReactNode> = {
  'Clothing': <ShoppingBag className="w-4 h-4" />,
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
  'Toiletries & Health': 'bg-green-500/10 text-green-600 border-green-200',
  'Electronics': 'bg-purple-500/10 text-purple-600 border-purple-200',
  'Documents': 'bg-amber-500/10 text-amber-600 border-amber-200',
  'Essentials': 'bg-rose-500/10 text-rose-600 border-rose-200',
  'Weather Gear': 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  'Business': 'bg-slate-500/10 text-slate-600 border-slate-200',
};

function generateSmartPackingList(
  tripDays: number,
  tripType: string,
  weatherAnalysis: {
    hasRain: boolean;
    hasCold: boolean;
    hasHot: boolean;
    hasSnow: boolean;
    avgHigh: number | null;
    avgLow: number | null;
  }
) {
  const items: { category: string; item_name: string; quantity: number }[] = [];
  
  // Clothing - based on trip length and weather
  const tshirtCount = Math.min(tripDays + 1, 7);
  const underwearCount = Math.min(tripDays + 2, 10);
  const sockCount = Math.min(tripDays + 2, 10);
  const sleepwearCount = Math.min(Math.ceil(tripDays / 3), 3);
  
  items.push({ category: 'Clothing', item_name: 'T-shirts/Tops', quantity: tshirtCount });
  items.push({ category: 'Clothing', item_name: 'Underwear', quantity: underwearCount });
  items.push({ category: 'Clothing', item_name: 'Socks', quantity: sockCount });
  items.push({ category: 'Clothing', item_name: 'Sleepwear', quantity: sleepwearCount });
  
  // Weather-based clothing
  if (weatherAnalysis.hasHot || (weatherAnalysis.avgHigh && weatherAnalysis.avgHigh > 75)) {
    items.push({ category: 'Clothing', item_name: 'Shorts', quantity: Math.min(tripDays, 4) });
    items.push({ category: 'Clothing', item_name: 'Light shirts', quantity: Math.min(tripDays, 4) });
    items.push({ category: 'Clothing', item_name: 'Sandals', quantity: 1 });
    items.push({ category: 'Clothing', item_name: 'Swimsuit', quantity: 1 });
  }
  
  if (weatherAnalysis.hasCold || (weatherAnalysis.avgLow && weatherAnalysis.avgLow < 55)) {
    items.push({ category: 'Clothing', item_name: 'Long pants', quantity: Math.min(tripDays, 3) });
    items.push({ category: 'Clothing', item_name: 'Sweater/Hoodie', quantity: 2 });
    items.push({ category: 'Clothing', item_name: 'Jacket', quantity: 1 });
  } else {
    items.push({ category: 'Clothing', item_name: 'Pants', quantity: 2 });
    items.push({ category: 'Clothing', item_name: 'Light jacket', quantity: 1 });
  }
  
  // Shoes
  items.push({ category: 'Clothing', item_name: 'Comfortable walking shoes', quantity: 1 });
  
  // Toiletries & Health - expanded
  items.push({ category: 'Toiletries & Health', item_name: 'Toothbrush', quantity: 1 });
  items.push({ category: 'Toiletries & Health', item_name: 'Toothpaste', quantity: 1 });
  items.push({ category: 'Toiletries & Health', item_name: 'Shampoo/Conditioner', quantity: 1 });
  items.push({ category: 'Toiletries & Health', item_name: 'Deodorant', quantity: 1 });
  items.push({ category: 'Toiletries & Health', item_name: 'Skincare products', quantity: 1 });
  items.push({ category: 'Toiletries & Health', item_name: 'Razor/Shaving supplies', quantity: 1 });
  items.push({ category: 'Toiletries & Health', item_name: 'Prescription medications', quantity: 1 });
  items.push({ category: 'Toiletries & Health', item_name: 'Pain relievers (Tylenol/Ibuprofen)', quantity: 1 });
  items.push({ category: 'Toiletries & Health', item_name: 'Vitamins/Supplements', quantity: 1 });
  items.push({ category: 'Toiletries & Health', item_name: 'First aid kit', quantity: 1 });
  items.push({ category: 'Toiletries & Health', item_name: 'Hand sanitizer', quantity: 1 });
  
  if (weatherAnalysis.hasHot) {
    items.push({ category: 'Toiletries & Health', item_name: 'Sunscreen', quantity: 1 });
    items.push({ category: 'Toiletries & Health', item_name: 'Lip balm with SPF', quantity: 1 });
    items.push({ category: 'Toiletries & Health', item_name: 'Aloe vera gel', quantity: 1 });
    items.push({ category: 'Toiletries & Health', item_name: 'Insect repellent', quantity: 1 });
  }
  
  // Electronics
  items.push({ category: 'Electronics', item_name: 'Phone charger', quantity: 1 });
  items.push({ category: 'Electronics', item_name: 'Power bank', quantity: 1 });
  items.push({ category: 'Electronics', item_name: 'Headphones/Earbuds', quantity: 1 });
  items.push({ category: 'Electronics', item_name: 'Selfie stick/Tripod', quantity: 1 });
  
  // Documents
  items.push({ category: 'Documents', item_name: 'Passport', quantity: 1 });
  items.push({ category: 'Documents', item_name: 'ID/Driver\'s License', quantity: 1 });
  items.push({ category: 'Documents', item_name: 'Travel insurance docs', quantity: 1 });
  items.push({ category: 'Documents', item_name: 'Booking confirmations', quantity: 1 });
  items.push({ category: 'Documents', item_name: 'Credit cards', quantity: 1 });
  
  // Essentials
  items.push({ category: 'Essentials', item_name: 'Wallet', quantity: 1 });
  items.push({ category: 'Essentials', item_name: 'Keys', quantity: 1 });
  items.push({ category: 'Essentials', item_name: 'Glasses/Contacts', quantity: 1 });
  items.push({ category: 'Essentials', item_name: 'Travel pillow', quantity: 1 });
  items.push({ category: 'Essentials', item_name: 'Reusable water bottle', quantity: 1 });
  items.push({ category: 'Essentials', item_name: 'Snacks', quantity: 1 });
  
  // Weather gear
  if (weatherAnalysis.hasRain) {
    items.push({ category: 'Weather Gear', item_name: 'Rain jacket/Umbrella', quantity: 1 });
    items.push({ category: 'Weather Gear', item_name: 'Waterproof bag', quantity: 1 });
  }
  
  if (weatherAnalysis.hasSnow) {
    items.push({ category: 'Weather Gear', item_name: 'Winter coat', quantity: 1 });
    items.push({ category: 'Weather Gear', item_name: 'Gloves', quantity: 1 });
    items.push({ category: 'Weather Gear', item_name: 'Winter hat', quantity: 1 });
    items.push({ category: 'Weather Gear', item_name: 'Warm boots', quantity: 1 });
    items.push({ category: 'Weather Gear', item_name: 'Thermal underwear', quantity: 2 });
  }
  
  // Business items
  if (tripType === 'business' || tripType === 'mixed') {
    items.push({ category: 'Business', item_name: 'Business cards', quantity: 1 });
    items.push({ category: 'Business', item_name: 'Laptop', quantity: 1 });
    items.push({ category: 'Business', item_name: 'Laptop charger', quantity: 1 });
    items.push({ category: 'Business', item_name: 'Professional attire', quantity: 2 });
    items.push({ category: 'Business', item_name: 'Dress shoes', quantity: 1 });
  }
  
  return items;
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

  // Calculate trip duration
  const tripDays = useMemo(() => {
    if (!trip) return 3;
    return differenceInDays(parseISO(trip.end_date), parseISO(trip.start_date)) + 1;
  }, [trip]);

  // Get weather data
  const { tripForecast, weatherAnalysis, isLoading: weatherLoading } = useTripWeather(
    trip?.destination_city || '',
    trip?.destination_country || '',
    trip?.start_date || '',
    trip?.end_date || ''
  );

  const luggageRec = getLuggageRecommendation(tripDays);

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
    const items = generateSmartPackingList(tripDays, trip?.trip_type || 'personal', weatherAnalysis);
    await bulkCreate.mutateAsync({ trip_id: tripId, items });
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

  // Weather display helpers
  const getWeatherIcon = (condition: string) => {
    if (condition.includes('Rain') || condition.includes('Shower')) return <CloudRain className="w-4 h-4" />;
    if (condition.includes('Snow')) return <Snowflake className="w-4 h-4" />;
    if (condition.includes('Clear') || condition.includes('Sunny')) return <Sun className="w-4 h-4" />;
    return <Cloud className="w-4 h-4" />;
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Packing List</h3>
          <p className="text-sm text-muted-foreground">{tripDays} day trip to {trip?.destination_city}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {packingItems.length === 0 && (
            <Button onClick={generatePackingList} variant="outline" disabled={bulkCreate.isPending || weatherLoading}>
              <Sparkles className="w-4 h-4 mr-2" />
              {bulkCreate.isPending ? 'Generating...' : weatherLoading ? 'Checking Weather...' : 'Generate Smart List'}
            </Button>
          )}
          {packingItems.length > 0 && (
            <Button onClick={copyToClipboard} variant="outline" size="sm">
              {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              Copy
            </Button>
          )}
          <Button onClick={() => setDialogOpen(true)} className="bg-gradient-ocean hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Weather & Luggage Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Weather Summary */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-primary" />
              Weather Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weatherLoading ? (
              <p className="text-sm text-muted-foreground">Loading weather data...</p>
            ) : tripForecast.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  {weatherAnalysis.avgHigh && (
                    <div className="flex items-center gap-1">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span className="text-sm font-medium">{weatherAnalysis.avgHigh}°F high</span>
                    </div>
                  )}
                  {weatherAnalysis.avgLow && (
                    <div className="flex items-center gap-1">
                      <Cloud className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium">{weatherAnalysis.avgLow}°F low</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {weatherAnalysis.hasHot && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">☀️ Hot</Badge>
                  )}
                  {weatherAnalysis.hasCold && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">❄️ Cold</Badge>
                  )}
                  {weatherAnalysis.hasRain && (
                    <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">🌧️ Rain expected</Badge>
                  )}
                  {weatherAnalysis.hasSnow && (
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">🌨️ Snow</Badge>
                  )}
                </div>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {tripForecast.slice(0, 7).map((day) => (
                    <div key={day.date} className="flex flex-col items-center p-2 min-w-[3.5rem] rounded-lg bg-background/50">
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                      </span>
                      {getWeatherIcon(day.condition)}
                      <span className="text-xs font-medium">{day.tempHigh}°</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Weather data unavailable</p>
            )}
          </CardContent>
        </Card>

        {/* Luggage Recommendation */}
        <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              {luggageRec.icon}
              Luggage Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Badge variant="secondary" className="text-base font-semibold px-3 py-1">
                {luggageRec.type}
              </Badge>
              <p className="text-sm text-muted-foreground">{luggageRec.description}</p>
            </div>
          </CardContent>
        </Card>
      </div>

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
                    <Badge variant="outline" className={colorClass}>
                      {categoryPacked}/{items.length}
                    </Badge>
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
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={item.is_packed}
                            onCheckedChange={() => togglePacked(item)}
                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                          />
                          <span className={`text-sm ${item.is_packed ? 'line-through text-muted-foreground' : ''}`}>
                            {item.item_name}
                            {item.quantity > 1 && (
                              <span className="text-muted-foreground ml-1 text-xs">(×{item.quantity})</span>
                            )}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
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
              Generate a smart list based on your {tripDays}-day trip and weather forecast
            </p>
            <div className="flex gap-2">
              <Button onClick={generatePackingList} disabled={bulkCreate.isPending || weatherLoading}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Smart List
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
