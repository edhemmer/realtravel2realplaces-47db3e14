import { useState, useMemo } from 'react';
import { usePackingItems, useCreatePackingItem, useUpdatePackingItem, useDeletePackingItem, useBulkCreatePackingItems, useDeleteAutoPackingItems } from '@/hooks/usePackingItems';
import { useTrip } from '@/hooks/useTrips';
import { useBookings } from '@/hooks/useBookings';
import { useWeatherEngine } from '@/hooks/useWeatherEngine';
import { generatePackingRecommendations, buildPackingContext, deriveClimateTags, type PackingEngineResult, type PackingEngineOutput, type PackingContext } from '@/lib/packingEngine';
import { resolveWeather } from '@/lib/weatherEngine';
import { supabase } from '@/integrations/supabase/client';
import { PackingItem } from '@/types/database';
import { airports } from '@/lib/airportData';
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

    // Helper: resolve country from airport code
    const resolveCountryFromAirport = (code: string | null): string | null => {
      if (!code) return null;
      const apt = airports.find(a => a.code === code.toUpperCase());
      return apt?.country || null;
    };

    // 1. LODGING FIRST (highest priority)
    for (const booking of sortedBookings) {
      if (booking.booking_type === 'stay') {
        const addr = booking.address || '';
        const parts = addr.split(',').map((p: string) => p.trim());
        let city = parts.length >= 2 ? parts[parts.length - 2] : '';
        const stayCountry = parts.length >= 1 ? parts[parts.length - 1] : '';
        if (city && !seenCities.has(city.toLowerCase())) {
          seenCities.add(city.toLowerCase());
          legs.push({ 
            city, country: stayCountry || trip.destination_country || '',
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
          const flightCountry = resolveCountryFromAirport(booking.arrival_airport_code) || trip.destination_country || '';
          legs.push({ 
            city, country: flightCountry, 
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
      console.log('[PackingTab] Starting generation, deleting auto items...');
      await deleteAutoItems.mutateAsync({ trip_id: tripId });
      console.log('[PackingTab] Auto items deleted, building legs...');
      
      // v4.10.0: Build per-leg itinerary — lodging first, exclude home airport
      const itineraryLegs: Array<{ city: string; country: string; arriveDate?: string; departDate?: string; climateTags?: string[]; source: string }> = [];
      const sortedBookings = [...bookings].sort((a, b) => 
        new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
      );
      const legCities = new Set<string>();
      
      // Identify home airport
      const homeAirport = sortedBookings.find(b => b.booking_type === 'flight')?.departure_airport_code?.toUpperCase() || '';
      const homeCity = sortedBookings.find(b => b.booking_type === 'flight')?.from_location?.toLowerCase() || '';

      // Helper: resolve country from airport code
      const resolveCountryFromAirport = (code: string | null): string | null => {
        if (!code) return null;
        const apt = airports.find(a => a.code === code.toUpperCase());
        return apt?.country || null;
      };

      // 1. LODGING FIRST
      for (const booking of sortedBookings) {
        if (booking.booking_type === 'stay') {
          const addr = booking.address || '';
          const parts = addr.split(',').map((p: string) => p.trim());
          let stayCity = parts.length >= 2 ? parts[parts.length - 2] : '';
          // Try to extract country from last part of address
          const stayCountry = parts.length >= 1 ? parts[parts.length - 1] : '';
          if (stayCity && !legCities.has(stayCity.toLowerCase())) {
            legCities.add(stayCity.toLowerCase());
            const resolvedCountry = stayCountry || trip.destination_country || '';
            const legWeather = resolveWeather({
              city: stayCity,
              country: resolvedCountry,
              startDate: booking.start_datetime?.split('T')[0] || trip.start_date,
              endDate: booking.end_datetime?.split('T')[0] || trip.end_date,
            });
            itineraryLegs.push({
              city: stayCity,
              country: resolvedCountry,
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
            // Resolve country from arrival airport code, not trip destination
            const flightCountry = resolveCountryFromAirport(booking.arrival_airport_code) || trip.destination_country || '';
            const legWeather = resolveWeather({
              city: legCity,
              country: flightCountry,
              startDate: trip.start_date,
              endDate: trip.end_date,
            });
            itineraryLegs.push({
              city: legCity,
              country: flightCountry,
              arriveDate: booking.end_datetime?.split('T')[0],
              climateTags: legWeather?.summary ? deriveClimateTags(legWeather.summary) : [],
              source: 'flight',
            });
          }
        }
      }

      // Use destination_city, or derive from first leg
      const effectiveCity = city || itineraryLegs[0]?.city || 'Unknown';

      console.log('[PackingTab] Invoking edge function with', itineraryLegs.length, 'legs, effectiveCity:', effectiveCity);
      const { data, error } = await supabase.functions.invoke('generate-packing-list', {
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

      console.log('[PackingTab] Edge function response:', { data, error });
      if (error) throw error;

      const responseData = data as { success: boolean; data: AIPackingResponse; meta?: any; error?: string } | null;
      if (responseData?.success && responseData.data?.items) {
        const normalizedItems = responseData.data.items.map(item => ({
          category: item.category || 'General',
          item_name: item.item_name || 'Unknown item',
          quantity: typeof item.quantity === 'number' && item.quantity >= 1 ? item.quantity : 1,
          color_tip: item.color_tip || null,
          applies_to: item.applies_to || null,
        }));
        await bulkCreate.mutateAsync({ trip_id: tripId, items: normalizedItems, is_custom: false });
        
        if (responseData.data.special_notes) {
          setSpecialNotes(responseData.data.special_notes);
        }
        if (responseData.data.leg_summaries) {
          setLegSummaries(responseData.data.leg_summaries);
        }

        if (isRegenerate) {
          toast.success('Packing list updated with latest weather data. Your custom items were preserved.');
        }
      } else {
        throw new Error(responseData?.error || 'Failed to generate packing list');
      }
    } catch (err: any) {
      console.error('[PackingTab] Generation failed:', JSON.stringify(err, null, 2), err);
      const message = err instanceof Error ? err.message 
        : typeof err === 'object' && err !== null ? (err.message || err.msg || err.error || JSON.stringify(err))
        : String(err);
      console.error('[PackingTab] Error detail:', message);
      if (message.includes('Rate limit') || message.includes('429')) {
        toast.error('Too many requests. Please wait a moment and try again.');
      } else if (message.includes('credits') || message.includes('402')) {
        toast.error('AI credits are temporarily unavailable. Please try again later.');
      } else {
        toast.error(`Packing list error: ${String(message).slice(0, 200)}`);
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
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">Packing List</h3>
          <p className="text-xs text-muted-foreground truncate">
            {tripNights} night{tripNights !== 1 ? 's' : ''}
            {trip?.destination_city ? ` · ${trip.destination_city}` : ''}
            {locationCount > 1 && ` + ${locationCount - 1} more`}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {packingItems.length === 0 ? (
              <Button onClick={() => generatePackingList(false)} size="sm" disabled={isGenerating} className="h-8 text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {isGenerating ? 'Generating…' : 'Generate Smart List'}
              </Button>
            ) : (
              <>
                <Button onClick={() => setShowRegenerateConfirm(true)} variant="ghost" size="sm" disabled={isGenerating} className="h-7 text-xs px-2">
                  <RefreshCw className={`w-3 h-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={copyToClipboard} variant="ghost" size="sm" className="h-7 text-xs px-2">
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </>
            )}
            <Button onClick={() => setDialogOpen(true)} size="sm" className="h-7 w-7 p-0" variant="outline">
              <Plus className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
        {!canEdit && packingItems.length > 0 && (
          <Button onClick={copyToClipboard} variant="ghost" size="sm" className="h-7 text-xs px-2">
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </Button>
        )}
      </div>

      {/* Inline progress bar when items exist */}
      {packingItems.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              {progress === 100 ? '✓ All packed' : `${packedItems}/${totalItems} packed`}
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      )}

      {/* Per-Leg Climate Cards — compact horizontal scroll */}
      {legSummaries.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {legSummaries.map((leg, idx) => (
            <div key={idx} className="flex-shrink-0 rounded-lg border border-border/40 bg-card px-3 py-2 min-w-[180px] max-w-[240px]">
              <div className="flex items-center gap-1.5 mb-0.5">
                <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                <span className="text-xs font-semibold truncate">{leg.city}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{leg.climate_summary}</p>
              {leg.style_note && (
                <p className="text-[10px] text-primary/70 mt-0.5 italic leading-snug line-clamp-1">{leg.style_note}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Cultural Tips — compact inline */}
      {specialNotes.length > 0 && (
        <div className="rounded-lg border border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/10 px-3 py-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5">
              {specialNotes.map((note, idx) => (
                <p key={idx}>{note}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Grid — compact cards */}
      {Object.keys(groupedItems).length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(groupedItems).map(([category, items]) => {
            const categoryPacked = items.filter(i => i.is_packed).length;
            const allPacked = categoryPacked === items.length;
            
            return (
              <div key={category} className={`rounded-lg border bg-card transition-colors ${allPacked ? 'border-green-200/60 bg-green-50/20 dark:bg-green-950/10' : 'border-border/40'}`}>
                {/* Category header — tight */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/20">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground flex-shrink-0">{categoryIcons[category] || <ShoppingBag className="w-3.5 h-3.5" />}</span>
                    <span className="text-xs font-semibold truncate">{category}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] font-medium tabular-nums ${allPacked ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {categoryPacked}/{items.length}
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => openAddDialogForCategory(category)}
                        className="flex items-center justify-center w-5 h-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Items — ultra compact rows */}
                <div className="divide-y divide-border/10">
                  {items.map((item) => {
                    const colorTip = (item as any).color_tip as string | null;
                    const appliesTo = (item as any).applies_to as string[] | null;
                    return (
                      <div
                        key={item.id}
                        className={`group flex items-center gap-2 px-3 py-1.5 transition-colors ${
                          item.is_packed ? 'opacity-50' : 'hover:bg-muted/20'
                        }`}
                      >
                        <Checkbox
                          checked={item.is_packed}
                          onCheckedChange={() => canEdit && togglePacked(item)}
                          disabled={!canEdit}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 h-3.5 w-3.5 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs leading-tight ${item.is_packed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                              {item.item_name}
                            </span>
                            {item.is_custom && (
                              <span className="text-[8px] uppercase tracking-wider text-primary/60 font-semibold flex-shrink-0">you</span>
                            )}
                            {/* Inline location tags */}
                            {appliesTo && appliesTo.length > 0 && !item.is_packed && appliesTo[0] !== 'all' && (
                              <>
                                {appliesTo.slice(0, 2).map((tag, i) => (
                                  <span key={i} className="text-[8px] px-1 py-0 rounded bg-primary/6 text-primary/60 font-medium flex-shrink-0 hidden sm:inline">
                                    {tag}
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                          {/* Color tip — subtle inline */}
                          {colorTip && !item.is_packed && (
                            <p className="text-[10px] text-muted-foreground/60 leading-tight mt-px italic truncate">
                              {colorTip}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {canEdit ? (
                            <div className="inline-flex items-center h-5 rounded border border-border/30 bg-background overflow-hidden">
                              <button
                                type="button"
                                className="flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                                onClick={() => updateQuantity(item, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-2.5 h-2.5" />
                              </button>
                              <span className="text-[10px] font-semibold w-4 text-center tabular-nums">{item.quantity}</span>
                              <button
                                type="button"
                                className="flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => updateQuantity(item, item.quantity + 1)}
                              >
                                <Plus className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground tabular-nums">×{item.quantity}</span>
                          )}
                          {canEdit && (
                            <button
                              className="flex items-center justify-center w-5 h-5 text-muted-foreground/40 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="rounded-lg border border-dashed border-border/60 bg-card">
          <div className="flex flex-col items-center justify-center py-10 px-4">
            {isGenerating ? (
              <>
                <div className="relative w-14 h-14 mb-3">
                  <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" style={{ animationDuration: '2s' }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Luggage className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <p className="text-sm font-medium">Building your packing list…</p>
                <p className="text-xs text-muted-foreground mt-0.5">Analyzing weather, culture & itinerary</p>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-primary/8 flex items-center justify-center mb-3">
                  <Luggage className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-medium">No packing list yet</p>
                <p className="text-xs text-muted-foreground mt-0.5 text-center max-w-xs">
                  {weather ? 'Weather data ready — generate your AI-powered smart list.' : 'Add your trip details to get started.'}
                </p>
                {canEdit && (
                  <div className="flex gap-2 mt-3">
                    <Button onClick={() => generatePackingList(false)} size="sm" disabled={isGenerating} className="h-8 text-xs">
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Generate Smart List
                    </Button>
                    <Button onClick={() => setDialogOpen(true)} variant="outline" size="sm" className="h-8 text-xs">
                      Add Manually
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {preselectedCategory ? `Add to ${preselectedCategory}` : 'Add Packing Item'}
            </DialogTitle>
            <DialogDescription className="text-xs">Add an item to your packing list</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            {preselectedCategory ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/30 text-sm">
                {categoryIcons[preselectedCategory]}
                <span className="font-medium text-xs">{preselectedCategory}</span>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs">Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Clothing, Toiletries…"
                  required
                  className="h-8 text-sm"
                />
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs">Item</Label>
                <Input
                  value={formData.item_name}
                  onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                  placeholder="T-shirt"
                  required
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }} className="flex-1 h-8 text-xs">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 h-8 text-xs" disabled={createItem.isPending}>
                {createItem.isPending ? 'Adding…' : 'Add Item'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Regenerate Confirmation */}
      <Dialog open={showRegenerateConfirm} onOpenChange={setShowRegenerateConfirm}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-base">Regenerate packing list?</DialogTitle>
            <DialogDescription className="text-xs">
              Updates suggestions with latest weather. Custom items are preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={() => setShowRegenerateConfirm(false)} className="flex-1 h-8 text-xs">
              Cancel
            </Button>
            <Button onClick={() => generatePackingList(true)} disabled={isGenerating} className="flex-1 h-8 text-xs">
              <RefreshCw className={`w-3 h-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Updating…' : 'Regenerate'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}