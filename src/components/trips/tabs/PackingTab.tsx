import { useState, useMemo } from 'react';
import { usePackingItems, useCreatePackingItem, useUpdatePackingItem, useDeletePackingItem, useBulkCreatePackingItems, useDeleteAutoPackingItems } from '@/hooks/usePackingItems';
import { useTrip } from '@/hooks/useTrips';
import { useBookings } from '@/hooks/useBookings';
import { useWeatherEngine } from '@/hooks/useWeatherEngine';
import { generatePackingRecommendations, buildPackingContext, deriveClimateTags, type PackingEngineResult, type PackingEngineOutput, type PackingContext } from '@/lib/packingEngine';
import { resolveWeather } from '@/lib/weatherEngine';
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
  Minus, Thermometer, MapPin, ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';
import { useTripPermission } from '@/pages/TripDetail';

interface PackingTabProps {
  tripId: string;
}

// Icon mapping for categories
const categoryIcons: Record<string, React.ReactNode> = {
  'Clothing': <ShoppingBag className="w-4 h-4" />,
  'Clothing Core': <ShoppingBag className="w-4 h-4" />,
  'Layers & Outerwear': <Mountain className="w-4 h-4" />,
  'Rain & Wet Weather': <Cloud className="w-4 h-4" />,
  'Cold / Snow Gear': <Thermometer className="w-4 h-4" />,
  'Footwear': <ShoppingBag className="w-4 h-4" />,
  'Accessories': <Sun className="w-4 h-4" />,
  'Swimwear & Beach': <Waves className="w-4 h-4" />,
  'Hiking & Outdoor': <Mountain className="w-4 h-4" />,
  'City Essentials': <Building2 className="w-4 h-4" />,
  'Toiletries & Health': <Plus className="w-4 h-4" />,
  'Electronics': <Sparkles className="w-4 h-4" />,
  'Tech & Chargers': <Sparkles className="w-4 h-4" />,
  'Documents': <Briefcase className="w-4 h-4" />,
  'Documents & Critical Items': <Briefcase className="w-4 h-4" />,
  'Essentials': <Check className="w-4 h-4" />,
  'Weather Gear': <Cloud className="w-4 h-4" />,
  'Business': <Briefcase className="w-4 h-4" />,
};

// Category colors for visual distinction
const categoryColors: Record<string, string> = {
  'Clothing': 'bg-blue-500/10 text-blue-600 border-blue-200',
  'Clothing Core': 'bg-blue-500/10 text-blue-600 border-blue-200',
  'Layers & Outerwear': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'Rain & Wet Weather': 'bg-sky-500/10 text-sky-600 border-sky-200',
  'Cold / Snow Gear': 'bg-indigo-500/10 text-indigo-600 border-indigo-200',
  'Footwear': 'bg-stone-500/10 text-stone-600 border-stone-200',
  'Accessories': 'bg-yellow-500/10 text-yellow-600 border-yellow-200',
  'Swimwear & Beach': 'bg-cyan-500/10 text-cyan-600 border-cyan-200',
  'Hiking & Outdoor': 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
  'City Essentials': 'bg-slate-500/10 text-slate-600 border-slate-200',
  'Toiletries & Health': 'bg-green-500/10 text-green-600 border-green-200',
  'Electronics': 'bg-purple-500/10 text-purple-600 border-purple-200',
  'Tech & Chargers': 'bg-purple-500/10 text-purple-600 border-purple-200',
  'Documents': 'bg-amber-500/10 text-amber-600 border-amber-200',
  'Documents & Critical Items': 'bg-amber-500/10 text-amber-600 border-amber-200',
  'Essentials': 'bg-rose-500/10 text-rose-600 border-rose-200',
  'Weather Gear': 'bg-sky-500/10 text-sky-600 border-sky-200',
  'Business': 'bg-slate-500/10 text-slate-600 border-slate-200',
};

interface AIPackingResponse {
  items: { category: string; item_name: string; quantity: number; own_it_likely?: boolean; suggest_buy_early?: boolean; rationale?: string; color_tip?: string; applies_to?: string[] }[];
  special_notes?: string[];
  leg_summaries?: { city: string; climate_summary: string; style_note?: string }[];
}

// v4.6.0: Climate tag display labels
const CLIMATE_TAG_LABELS: Record<string, string> = {
  all: 'All trip',
  cold: 'Cold days',
  cool: 'Cool days',
  warm: 'Warm days',
  hot: 'Hot days',
  rain: 'Rainy days',
  snow: 'Snow days',
  beach: 'Beach days',
  business: 'Business',
  custom: 'Custom',
};


export function PackingTab({ tripId }: PackingTabProps) {
  const { canEdit } = useTripPermission();
  const { data: packingItems = [], isLoading } = usePackingItems(tripId);
  const { data: trip } = useTrip(tripId);
  const { data: bookings = [] } = useBookings(tripId);
  const createItem = useCreatePackingItem();
  const updateItem = useUpdatePackingItem();
  const deleteItem = useDeletePackingItem();
  const bulkCreate = useBulkCreatePackingItems();
  const deleteAutoItems = useDeleteAutoPackingItems();
  
  // v3.8.13: Always-on weather engine
  const { weather, isLoading: weatherLoading } = useWeatherEngine(trip || null, bookings);

  // v3.8.14: Hardened packing recommendations with prerequisite gate
  const packingOutput = useMemo(() => {
    if (!trip || !weather) return null;
    const days = differenceInDays(parseISO(trip.end_date), parseISO(trip.start_date)) + 1;
    const nights = days - 1;
    return generatePackingRecommendations(
      weather, days, nights, trip.trip_type, 
      (trip as any).destination_type || 'unspecified'
    );
  }, [trip, weather]);

  // v4.7.0: Build multi-location PackingContext with per-leg itinerary
  // v4.10.0: Lodging-first, exclude home airport, use destination airports
  const packingContext = useMemo((): PackingContext | null => {
    if (!trip) return null;

    const legs: Array<{ city: string; state?: string; country: string; arriveDate?: string; departDate?: string; source: string }> = [];
    const seenCities = new Set<string>();

    if (trip.destination_city) {
      seenCities.add(trip.destination_city.toLowerCase());
    }

    const sortedBookings = [...bookings].sort((a, b) => 
      new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
    );

    // Identify home airport (first departure) to exclude return legs
    const homeAirport = sortedBookings.find(b => b.booking_type === 'flight')?.departure_airport_code?.toUpperCase() || '';
    const homeCity = sortedBookings.find(b => b.booking_type === 'flight')?.from_location?.toLowerCase() || '';

    // 1. LODGING FIRST (highest priority)
    for (const booking of sortedBookings) {
      if (booking.booking_type === 'stay') {
        const addr = booking.address || '';
        const parts = addr.split(',').map((p: string) => p.trim());
        let city = parts.length >= 2 ? parts[parts.length - 2] : '';
        if (city && !seenCities.has(city.toLowerCase())) {
          seenCities.add(city.toLowerCase());
          legs.push({ 
            city, country: trip.destination_country || '',
            arriveDate: booking.start_datetime?.split('T')[0],
            departDate: booking.end_datetime?.split('T')[0],
            source: 'stay'
          });
        }
      }
    }

    // 2. DESTINATION AIRPORTS (exclude home airport and transit/connections)
    for (const booking of sortedBookings) {
      if (booking.booking_type === 'flight' && booking.to_location) {
        const arrCode = booking.arrival_airport_code?.toUpperCase() || '';
        // Skip home airport returns
        if (arrCode === homeAirport) continue;
        if (booking.to_location.toLowerCase() === homeCity) continue;

        const city = booking.to_location.trim();
        if (city && !seenCities.has(city.toLowerCase())) {
          // Check if this is a transit stop (next flight departs from same airport)
          const bookingIdx = sortedBookings.indexOf(booking);
          const nextFlight = sortedBookings.slice(bookingIdx + 1).find(b => b.booking_type === 'flight');
          const isTransit = nextFlight && nextFlight.departure_airport_code?.toUpperCase() === arrCode
            && new Date(nextFlight.start_datetime).getTime() - new Date(booking.end_datetime || booking.start_datetime).getTime() < 24 * 60 * 60 * 1000;
          
          if (isTransit) continue; // Skip short layovers/connections

          seenCities.add(city.toLowerCase());
          legs.push({ 
            city, country: trip.destination_country || '', 
            arriveDate: booking.end_datetime?.split('T')[0],
            source: 'flight'
          });
        }
      }
    }

    // Build weather results for each location
    const additionalLocations: Array<{ city: string | null; state?: string | null; country: string | null }> = 
      legs.map(l => ({ city: l.city, country: l.country }));

    const weatherResults: import('@/lib/weatherEngine').WeatherEngineResult[] = [];
    if (weather) weatherResults.push(weather);

    for (const loc of additionalLocations) {
      if (loc.city) {
        const locWeather = resolveWeather({
          city: loc.city,
          country: loc.country || trip.destination_country || '',
          startDate: trip.start_date,
          endDate: trip.end_date,
        });
        weatherResults.push(locWeather);
      }
    }

    return buildPackingContext(
      {
        start_date: trip.start_date,
        end_date: trip.end_date,
        trip_type: trip.trip_type,
        destination_city: trip.destination_city,
        destination_state: trip.destination_state,
        destination_country: trip.destination_country,
      },
      additionalLocations,
      weatherResults
    );
  }, [trip, bookings, weather]);

  // Extract ready result (null if not ready)
  const packingRecs: PackingEngineResult | null = packingOutput && !packingOutput.notReady ? packingOutput as PackingEngineResult : null;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [specialNotes, setSpecialNotes] = useState<string[]>([]);
  const [legSummaries, setLegSummaries] = useState<{ city: string; climate_summary: string; style_note?: string }[]>([]);
  const [preselectedCategory, setPreselectedCategory] = useState<string | null>(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

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
      is_custom: true,
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

  const generatePackingList = async (isRegenerate = false) => {
    if (!trip) return;

    // v4.10.0: destination_city OR bookings required (not just city)
    const city = trip.destination_city?.trim();
    const hasBookings = bookings.length > 0;
    if (!city && !hasBookings) {
      toast.error('We need a destination or bookings to build your packing list.');
      return;
    }
    if (!trip.start_date || !trip.end_date) {
      toast.error('We need trip dates to build your packing list. Please set your start and end dates first.');
      return;
    }
    
    setIsGenerating(true);
    setShowRegenerateConfirm(false);
    try {
      // Delete auto-generated items first, preserving custom items
      await deleteAutoItems.mutateAsync({ trip_id: tripId });
      
      // v4.10.0: Build per-leg itinerary — lodging first, exclude home airport
      const itineraryLegs: Array<{ city: string; country: string; arriveDate?: string; departDate?: string; climateTags?: string[]; source: string }> = [];
      const sortedBookings = [...bookings].sort((a, b) => 
        new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
      );
      const legCities = new Set<string>();
      
      // Identify home airport
      const homeAirport = sortedBookings.find(b => b.booking_type === 'flight')?.departure_airport_code?.toUpperCase() || '';
      const homeCity = sortedBookings.find(b => b.booking_type === 'flight')?.from_location?.toLowerCase() || '';

      // 1. LODGING FIRST
      for (const booking of sortedBookings) {
        if (booking.booking_type === 'stay') {
          const addr = booking.address || '';
          const parts = addr.split(',').map((p: string) => p.trim());
          let stayCity = parts.length >= 2 ? parts[parts.length - 2] : '';
          if (stayCity && !legCities.has(stayCity.toLowerCase())) {
            legCities.add(stayCity.toLowerCase());
            const legWeather = resolveWeather({
              city: stayCity,
              country: trip.destination_country || '',
              startDate: booking.start_datetime?.split('T')[0] || trip.start_date,
              endDate: booking.end_datetime?.split('T')[0] || trip.end_date,
            });
            itineraryLegs.push({
              city: stayCity,
              country: trip.destination_country || '',
              arriveDate: booking.start_datetime?.split('T')[0],
              departDate: booking.end_datetime?.split('T')[0],
              climateTags: legWeather?.summary ? deriveClimateTags(legWeather.summary) : [],
              source: 'stay',
            });
          }
        }
      }

      // 2. DESTINATION AIRPORTS (exclude home, exclude transit)
      for (const booking of sortedBookings) {
        if (booking.booking_type === 'flight' && booking.to_location) {
          const arrCode = booking.arrival_airport_code?.toUpperCase() || '';
          if (arrCode === homeAirport) continue;
          if (booking.to_location.toLowerCase() === homeCity) continue;

          const legCity = booking.to_location.trim();
          if (legCity && !legCities.has(legCity.toLowerCase())) {
            // Check transit (next flight departs same airport within 24h)
            const idx = sortedBookings.indexOf(booking);
            const nextFlight = sortedBookings.slice(idx + 1).find(b => b.booking_type === 'flight');
            const isTransit = nextFlight && nextFlight.departure_airport_code?.toUpperCase() === arrCode
              && new Date(nextFlight.start_datetime).getTime() - new Date(booking.end_datetime || booking.start_datetime).getTime() < 24 * 60 * 60 * 1000;
            if (isTransit) continue;

            legCities.add(legCity.toLowerCase());
            const legWeather = resolveWeather({
              city: legCity,
              country: trip.destination_country || '',
              startDate: trip.start_date,
              endDate: trip.end_date,
            });
            itineraryLegs.push({
              city: legCity,
              country: trip.destination_country || '',
              arriveDate: booking.end_datetime?.split('T')[0],
              climateTags: legWeather?.summary ? deriveClimateTags(legWeather.summary) : [],
              source: 'flight',
            });
          }
        }
      }

      // Use destination_city, or derive from first leg
      const effectiveCity = city || itineraryLegs[0]?.city || 'Unknown';

      const { data, error } = await supabase.functions.invoke<{ success: boolean; data: AIPackingResponse; meta?: { isEarlyDraft: boolean; generatedAt: string }; error?: string }>('generate-packing-list', {
        body: {
          destination_city: effectiveCity,
          destination_state: trip.destination_state || null,
          destination_country: trip.destination_country || null,
          start_date: trip.start_date,
          end_date: trip.end_date,
          trip_type: trip.trip_type,
          destination_type: (trip as any).destination_type || 'unspecified',
          weather_envelope: weather ? {
            weatherMode: weather.weatherMode,
            summary: weather.summary,
            anchorLabel: weather.anchor.label,
          } : null,
          itinerary_legs: itineraryLegs,
          is_regenerate: isRegenerate,
        },
      });

      if (error) throw error;

      if (data?.success && data.data?.items) {
        const normalizedItems = data.data.items.map(item => ({
          ...item,
          category: item.category || 'General',
          item_name: item.item_name || 'Unknown item',
          quantity: typeof item.quantity === 'number' && item.quantity >= 1 ? item.quantity : 1,
        }));
        await bulkCreate.mutateAsync({ trip_id: tripId, items: normalizedItems, is_custom: false });
        
        if (data.data.special_notes) {
          setSpecialNotes(data.data.special_notes);
        }
        if (data.data.leg_summaries) {
          setLegSummaries(data.data.leg_summaries);
        }

        if (isRegenerate) {
          toast.success('Packing list updated with latest weather data. Your custom items were preserved.');
        }
      } else {
        throw new Error(data?.error || 'Failed to generate packing list');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('Rate limit')) {
        toast.error('Too many requests. Please wait a moment and try again.');
      } else if (message.includes('credits')) {
        toast.error('AI credits are temporarily unavailable. Please try again later.');
      } else {
        toast.error('We had trouble generating your packing list. Please try again in a moment.');
      }
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

  // v4.6.0: Multi-location indicator
  const locationCount = packingContext?.locations.length ?? 0;
  const allClimateTags = useMemo(() => {
    if (!packingContext) return [];
    const tags = new Set<string>();
    for (const loc of packingContext.locations) {
      for (const tag of loc.climateTags) {
        tags.add(tag);
      }
    }
    return Array.from(tags);
  }, [packingContext]);

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Packing List</h3>
          <p className="text-sm text-muted-foreground">
            {tripNights} night{tripNights !== 1 ? 's' : ''} in {trip?.destination_city}{trip?.destination_state ? `, ${trip.destination_state}` : ''}
            {locationCount > 1 && ` + ${locationCount - 1} other location${locationCount > 2 ? 's' : ''}`}
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2 flex-wrap">
            {packingItems.length === 0 ? (
              <Button onClick={() => generatePackingList(false)} variant="outline" disabled={isGenerating}>
                <Sparkles className="w-4 h-4 mr-2" />
                {isGenerating ? 'Generating...' : 'Generate AI Packing List'}
              </Button>
            ) : (
              <>
                <Button onClick={() => setShowRegenerateConfirm(true)} variant="ghost" size="sm" disabled={isGenerating}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                  Regenerate with updated weather
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

      {/* v3.8.13: Weather Intelligence Banner */}
      {weather && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5">
                {weather.weatherMode === 'FORECAST_PRIMARY' ? (
                  <Sun className="w-4 h-4 text-primary" />
                ) : weather.weatherMode === 'FORECAST_BLEND' ? (
                  <Cloud className="w-4 h-4 text-primary" />
                ) : (
                  <Thermometer className="w-4 h-4 text-primary" />
                )}
                <span className="text-sm font-medium text-primary">
                  {packingRecs?.modeLabel || 'Weather Intelligence'}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">•</span>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{weather.anchor.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">•</span>
              <span className="text-sm text-muted-foreground">
                {weather.summary.avgHigh}°F high / {weather.summary.avgLow}°F low
              </span>
              {weather.summary.hasRain && (
                <Badge variant="outline" className="text-xs border-sky-300 text-sky-600 bg-sky-50">
                  Rain likely
                </Badge>
              )}
              {weather.summary.hasSnow && (
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-600 bg-blue-50">
                  Snow likely
                </Badge>
              )}
              {weather.summary.hasCold && (
                <Badge variant="outline" className="text-xs border-indigo-300 text-indigo-600 bg-indigo-50">
                  Cold
                </Badge>
              )}
              {weather.summary.hasHot && (
                <Badge variant="outline" className="text-xs border-orange-300 text-orange-600 bg-orange-50">
                  Hot
                </Badge>
              )}
            </div>
            {/* v4.6.0: Multi-location climate summary */}
            {locationCount > 1 && allClimateTags.length > 0 && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-primary/10">
                <span className="text-xs text-muted-foreground">{locationCount} locations:</span>
                <div className="flex gap-1 flex-wrap">
                  {allClimateTags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {CLIMATE_TAG_LABELS[tag] || tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* v4.7.0: Per-Leg Climate & Style Summaries */}
      {legSummaries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {legSummaries.map((leg, idx) => (
            <Card key={idx} className="border-muted">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  <span className="text-sm font-semibold">{leg.city}</span>
                </div>
                <p className="text-xs text-muted-foreground">{leg.climate_summary}</p>
                {leg.style_note && (
                  <p className="text-xs text-primary/80 mt-1 italic">{leg.style_note}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Special Notes / Cultural Tips from AI */}
      {specialNotes.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-4">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Cultural Tips & Packing Notes</p>
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
                          {item.is_custom && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 border-primary/30 text-primary/70">
                              Custom
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {/* Quantity Stepper */}
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
            {isGenerating ? (
              <>
                <div className="relative w-20 h-20 mb-4">
                  {/* Spinning circle */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" style={{ animationDuration: '2s' }} />
                  {/* Centered suitcase icon rotating slowly clockwise */}
                  <div className="absolute inset-0 flex items-center justify-center animate-spin" style={{ animationDuration: '6s' }}>
                    <Luggage className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h4 className="text-base font-medium mb-1">Generating your packing list…</h4>
                <p className="text-muted-foreground text-sm text-center max-w-sm">
                  Our AI is analyzing weather, culture, and your itinerary
                </p>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Luggage className="w-7 h-7 text-primary" />
                </div>
                <h4 className="text-base font-medium mb-1">No packing list yet</h4>
                <p className="text-muted-foreground text-sm text-center max-w-sm mb-4">
                  {weather ? `Weather data is ready — generate your smart packing list based on ${packingRecs?.modeLabel?.toLowerCase() || 'conditions'}.` : 'Packing lists help you avoid last-minute stress.'}
                </p>
                {canEdit && (
                  <div className="flex gap-2">
                    <Button onClick={() => generatePackingList(false)} disabled={isGenerating} className="bg-gradient-ocean hover:opacity-90">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate packing list
                    </Button>
                    <Button onClick={() => setDialogOpen(true)} variant="outline">
                      Add Manually
                    </Button>
                  </div>
                )}
              </>
            )}
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

      {/* v4.6.0: Regenerate Confirmation Dialog */}
      <Dialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Regenerate packing list?</DialogTitle>
            <DialogDescription>
              This will update suggested items based on the latest weather data. Your checked items and custom items will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowRegenerateConfirm(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={() => generatePackingList(true)} disabled={isGenerating} className="flex-1">
              <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Updating...' : 'Regenerate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}