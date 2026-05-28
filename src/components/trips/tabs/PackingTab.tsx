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

import { 
  Plus, Trash2, Sparkles, Copy, Check, Cloud, Sun, 
  Briefcase, ShoppingBag, Luggage, Waves, RefreshCw, AlertCircle, Mountain, Building2,
  Minus, MapPin, Shirt, Footprints, Watch, Umbrella, Snowflake, 
  Globe, Battery, ShowerHead, BookOpen, Smartphone, Cable
} from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, parseISO } from 'date-fns';
import { useTripPermission } from '@/pages/TripDetail';

// Wearable categories (rendered in left column) vs utility (right column)
const WEARABLE_CATEGORIES = new Set([
  'Clothing Core', 'Clothing', 'Layers & Outerwear', 'Footwear', 
  'Accessories', 'Swimwear & Beach', 'Hiking & Outdoor', 'Rain & Wet Weather',
  'Cold / Snow Gear', 'Weather Gear', 'Business',
]);

// Category color system for premium visual identity
const categoryThemes: Record<string, { icon: React.ReactNode; border: string; bg: string; text: string; iconBg: string }> = {
  'Clothing Core':            { icon: <Shirt className="w-3.5 h-3.5" />,        border: 'border-l-blue-500',      bg: 'bg-blue-50/40 dark:bg-blue-950/20',      text: 'text-blue-700 dark:text-blue-300',      iconBg: 'bg-blue-100 dark:bg-blue-900/40' },
  'Clothing':                 { icon: <Shirt className="w-3.5 h-3.5" />,        border: 'border-l-blue-500',      bg: 'bg-blue-50/40 dark:bg-blue-950/20',      text: 'text-blue-700 dark:text-blue-300',      iconBg: 'bg-blue-100 dark:bg-blue-900/40' },
  'Layers & Outerwear':       { icon: <Mountain className="w-3.5 h-3.5" />,     border: 'border-l-slate-500',     bg: 'bg-slate-50/40 dark:bg-slate-950/20',    text: 'text-slate-700 dark:text-slate-300',    iconBg: 'bg-slate-100 dark:bg-slate-900/40' },
  'Rain & Wet Weather':       { icon: <Umbrella className="w-3.5 h-3.5" />,     border: 'border-l-cyan-500',      bg: 'bg-cyan-50/40 dark:bg-cyan-950/20',      text: 'text-cyan-700 dark:text-cyan-300',      iconBg: 'bg-cyan-100 dark:bg-cyan-900/40' },
  'Cold / Snow Gear':         { icon: <Snowflake className="w-3.5 h-3.5" />,    border: 'border-l-indigo-500',    bg: 'bg-indigo-50/40 dark:bg-indigo-950/20',  text: 'text-indigo-700 dark:text-indigo-300',  iconBg: 'bg-indigo-100 dark:bg-indigo-900/40' },
  'Footwear':                 { icon: <Footprints className="w-3.5 h-3.5" />,   border: 'border-l-amber-500',     bg: 'bg-amber-50/40 dark:bg-amber-950/20',    text: 'text-amber-700 dark:text-amber-300',    iconBg: 'bg-amber-100 dark:bg-amber-900/40' },
  'Accessories':              { icon: <Watch className="w-3.5 h-3.5" />,        border: 'border-l-purple-500',    bg: 'bg-purple-50/40 dark:bg-purple-950/20',  text: 'text-purple-700 dark:text-purple-300',  iconBg: 'bg-purple-100 dark:bg-purple-900/40' },
  'Swimwear & Beach':         { icon: <Waves className="w-3.5 h-3.5" />,        border: 'border-l-teal-500',      bg: 'bg-teal-50/40 dark:bg-teal-950/20',      text: 'text-teal-700 dark:text-teal-300',      iconBg: 'bg-teal-100 dark:bg-teal-900/40' },
  'Hiking & Outdoor':         { icon: <Mountain className="w-3.5 h-3.5" />,     border: 'border-l-emerald-500',   bg: 'bg-emerald-50/40 dark:bg-emerald-950/20',text: 'text-emerald-700 dark:text-emerald-300',iconBg: 'bg-emerald-100 dark:bg-emerald-900/40' },
  'Toiletries & Health':      { icon: <ShowerHead className="w-3.5 h-3.5" />,   border: 'border-l-rose-500',      bg: 'bg-rose-50/40 dark:bg-rose-950/20',      text: 'text-rose-700 dark:text-rose-300',      iconBg: 'bg-rose-100 dark:bg-rose-900/40' },
  'Tech & Chargers':          { icon: <Cable className="w-3.5 h-3.5" />,        border: 'border-l-violet-500',    bg: 'bg-violet-50/40 dark:bg-violet-950/20',  text: 'text-violet-700 dark:text-violet-300',  iconBg: 'bg-violet-100 dark:bg-violet-900/40' },
  'Electronics':              { icon: <Smartphone className="w-3.5 h-3.5" />,   border: 'border-l-violet-500',    bg: 'bg-violet-50/40 dark:bg-violet-950/20',  text: 'text-violet-700 dark:text-violet-300',  iconBg: 'bg-violet-100 dark:bg-violet-900/40' },
  'Documents & Critical Items':{ icon: <BookOpen className="w-3.5 h-3.5" />,    border: 'border-l-orange-500',    bg: 'bg-orange-50/40 dark:bg-orange-950/20',  text: 'text-orange-700 dark:text-orange-300',  iconBg: 'bg-orange-100 dark:bg-orange-900/40' },
  'Documents':                { icon: <BookOpen className="w-3.5 h-3.5" />,     border: 'border-l-orange-500',    bg: 'bg-orange-50/40 dark:bg-orange-950/20',  text: 'text-orange-700 dark:text-orange-300',  iconBg: 'bg-orange-100 dark:bg-orange-900/40' },
  'Cultural Essentials':      { icon: <Globe className="w-3.5 h-3.5" />,        border: 'border-l-pink-500',      bg: 'bg-pink-50/40 dark:bg-pink-950/20',      text: 'text-pink-700 dark:text-pink-300',      iconBg: 'bg-pink-100 dark:bg-pink-900/40' },
  'City Essentials':          { icon: <Building2 className="w-3.5 h-3.5" />,    border: 'border-l-sky-500',       bg: 'bg-sky-50/40 dark:bg-sky-950/20',        text: 'text-sky-700 dark:text-sky-300',        iconBg: 'bg-sky-100 dark:bg-sky-900/40' },
  'Essentials':               { icon: <Check className="w-3.5 h-3.5" />,        border: 'border-l-green-500',     bg: 'bg-green-50/40 dark:bg-green-950/20',    text: 'text-green-700 dark:text-green-300',    iconBg: 'bg-green-100 dark:bg-green-900/40' },
  'Weather Gear':             { icon: <Cloud className="w-3.5 h-3.5" />,        border: 'border-l-sky-500',       bg: 'bg-sky-50/40 dark:bg-sky-950/20',        text: 'text-sky-700 dark:text-sky-300',        iconBg: 'bg-sky-100 dark:bg-sky-900/40' },
  'Business':                 { icon: <Briefcase className="w-3.5 h-3.5" />,    border: 'border-l-gray-500',      bg: 'bg-gray-50/40 dark:bg-gray-950/20',      text: 'text-gray-700 dark:text-gray-300',      iconBg: 'bg-gray-100 dark:bg-gray-900/40' },
};

const defaultTheme = { icon: <ShoppingBag className="w-3.5 h-3.5" />, border: 'border-l-primary', bg: 'bg-primary/5', text: 'text-primary', iconBg: 'bg-primary/10' };

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


interface PackingTabProps {
  tripId: string;
}

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
    // Tactile flip — light impact for the discrete on/off feel.
    void import('@/lib/native/haptics').then(m => m.haptic('toggle'));
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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {progress === 100 ? '✓ All packed' : `${packedItems} of ${totalItems} packed`}
            </span>
            <span className={`text-[11px] font-bold tabular-nums ${progress === 100 ? 'text-green-600' : 'text-primary'}`}>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-primary to-primary/70'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Per-Leg Climate Cards — rich colored horizontal scroll */}
      {legSummaries.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {legSummaries.map((leg, idx) => {
            const legColors = [
              { border: 'border-blue-400/60', bg: 'bg-blue-50/50 dark:bg-blue-950/20', dot: 'bg-blue-500' },
              { border: 'border-amber-400/60', bg: 'bg-amber-50/50 dark:bg-amber-950/20', dot: 'bg-amber-500' },
              { border: 'border-emerald-400/60', bg: 'bg-emerald-50/50 dark:bg-emerald-950/20', dot: 'bg-emerald-500' },
              { border: 'border-violet-400/60', bg: 'bg-violet-50/50 dark:bg-violet-950/20', dot: 'bg-violet-500' },
              { border: 'border-rose-400/60', bg: 'bg-rose-50/50 dark:bg-rose-950/20', dot: 'bg-rose-500' },
              { border: 'border-cyan-400/60', bg: 'bg-cyan-50/50 dark:bg-cyan-950/20', dot: 'bg-cyan-500' },
            ];
            const c = legColors[idx % legColors.length];
            return (
              <div key={idx} className={`flex-shrink-0 rounded-lg border ${c.border} ${c.bg} px-3 py-2 min-w-[160px] max-w-[200px]`}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`w-2 h-2 rounded-full ${c.dot} flex-shrink-0`} />
                  <span className="text-[11px] font-bold truncate">{leg.city}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug line-clamp-2">{leg.climate_summary}</p>
                {leg.style_note && (
                  <p className="text-[10px] text-foreground/50 mt-0.5 italic leading-snug line-clamp-1">{leg.style_note}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Cultural Tips — compact inline */}
      {specialNotes.length > 0 && (
        <div className="rounded-lg border border-amber-300/40 bg-amber-50/40 dark:bg-amber-950/10 px-3 py-2">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-amber-800 dark:text-amber-300 space-y-0.5 leading-relaxed">
              {specialNotes.map((note, idx) => (
                <p key={idx}>{note}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Category Grid — wearables left, utilities right */}
      {Object.keys(groupedItems).length > 0 ? (() => {
        const entries = Object.entries(groupedItems);
        const wearables = entries.filter(([cat]) => WEARABLE_CATEGORIES.has(cat));
        const utilities = entries.filter(([cat]) => !WEARABLE_CATEGORIES.has(cat));
        
        const renderCategory = ([category, items]: [string, PackingItem[]]) => {
            const categoryPacked = items.filter(i => i.is_packed).length;
            const allPacked = categoryPacked === items.length;
            const theme = categoryThemes[category] || defaultTheme;
            
            return (
              <div key={category} className={`rounded-lg border-l-[3px] border border-border/30 transition-colors ${theme.border} ${allPacked ? 'bg-green-50/30 dark:bg-green-950/10' : 'bg-card'}`}>
                {/* Category header — colored */}
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-[5px] ${theme.bg}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${theme.iconBg} ${theme.text} flex-shrink-0`}>
                      {theme.icon}
                    </div>
                    <span className={`text-xs font-bold tracking-tight truncate ${theme.text}`}>{category}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full ${allPacked ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : `${theme.iconBg} ${theme.text}`}`}>
                      {categoryPacked}/{items.length}
                    </span>
                    {canEdit && (
                      <button
                        onClick={() => openAddDialogForCategory(category)}
                        className={`flex items-center justify-center w-5 h-5 rounded-md ${theme.text} hover:${theme.iconBg} transition-colors opacity-60 hover:opacity-100`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                {/* Items */}
                <div className="divide-y divide-border/8">
                  {items.map((item) => {
                    const colorTip = (item as any).color_tip as string | null;
                    const appliesTo = (item as any).applies_to as string[] | null;
                    return (
                      <div
                        key={item.id}
                        className={`group flex items-center gap-2.5 px-3 py-2 transition-colors ${
                          item.is_packed ? 'opacity-40' : 'hover:bg-muted/15'
                        }`}
                      >
                        <Checkbox
                          checked={item.is_packed}
                          onCheckedChange={() => canEdit && togglePacked(item)}
                          disabled={!canEdit}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 h-4 w-4 flex-shrink-0 rounded"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[13px] leading-tight ${item.is_packed ? 'line-through text-muted-foreground' : 'font-semibold'}`}>
                              {item.item_name}
                            </span>
                            {item.is_custom && (
                              <span className="text-[8px] uppercase tracking-widest bg-primary/10 text-primary px-1 py-px rounded font-bold flex-shrink-0">custom</span>
                            )}
                            {/* Location tags */}
                            {appliesTo && appliesTo.length > 0 && !item.is_packed && appliesTo[0] !== 'all' && (
                              <>
                                {appliesTo.slice(0, 2).map((tag, i) => (
                                  <span key={i} className="text-[9px] px-1.5 py-px rounded-full bg-primary/8 text-primary/70 font-medium flex-shrink-0">
                                    {tag}
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                          {/* Color/style tip — visible, not buried */}
                          {colorTip && !item.is_packed && (
                            <p className="text-[11px] text-muted-foreground/70 leading-snug mt-0.5 line-clamp-1">
                              {colorTip}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {canEdit ? (
                            <div className="inline-flex items-center h-6 rounded-md border border-border/40 bg-background overflow-hidden shadow-sm">
                              <button
                                type="button"
                                className="flex items-center justify-center w-6 h-6 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors disabled:opacity-30"
                                onClick={() => updateQuantity(item, item.quantity - 1)}
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-[11px] font-bold w-5 text-center tabular-nums">{item.quantity}</span>
                              <button
                                type="button"
                                className="flex items-center justify-center w-6 h-6 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                                onClick={() => updateQuantity(item, item.quantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
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
          };
        
        // On mobile (single col): interleave wearable/utility for natural flow
        const interleaved: [string, PackingItem[]][] = [];
        const maxLen = Math.max(wearables.length, utilities.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < wearables.length) interleaved.push(wearables[i]);
          if (i < utilities.length) interleaved.push(utilities[i]);
        }

        return (
          <>
            {/* Desktop: 2-column wearables|utilities */}
            <div className="hidden md:grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                {wearables.map(renderCategory)}
              </div>
              <div className="space-y-2">
                {utilities.map(renderCategory)}
              </div>
            </div>
            {/* Mobile: interleaved single column */}
            <div className="md:hidden space-y-2">
              {interleaved.map(renderCategory)}
            </div>
          </>
        );
      })() : (
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
              <div className={`flex items-center gap-2 p-2 rounded-md text-sm ${(categoryThemes[preselectedCategory] || defaultTheme).bg}`}>
                <div className={`w-6 h-6 rounded-md flex items-center justify-center ${(categoryThemes[preselectedCategory] || defaultTheme).iconBg} ${(categoryThemes[preselectedCategory] || defaultTheme).text}`}>
                  {(categoryThemes[preselectedCategory] || defaultTheme).icon}
                </div>
                <span className={`font-semibold text-xs ${(categoryThemes[preselectedCategory] || defaultTheme).text}`}>{preselectedCategory}</span>
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