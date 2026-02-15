import { useState, useCallback, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useCreateTrip } from '@/hooks/useTrips';
import { useCreateBooking } from '@/hooks/useBookings';
import { useCreateCompanion } from '@/hooks/useCompanions';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, FileText, Loader2, X, Check, Plane, Car, Palmtree, Mountain, Building2, ClipboardPaste, Scan, TrainFront, ArrowLeft, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getVendorUrl } from '@/lib/vendorUrls';
import { BookingType, StayType } from '@/types/database';
import { getSuggestedTripDates } from '@/hooks/useTripDateSync';
import { resolveTripFrame, validateConfirmationAlignment, isFrameResolved, type TripFrameMode } from '@/lib/tripFrameResolver';
import { LocationInput } from '@/components/LocationInput';
import { LocationStructured, isLocationComplete, locationLabel } from '@/lib/location/types';

// ============================================================================
// TYPES & HELPERS
// ============================================================================

type TravelMode = 'fly' | 'drive' | 'train' | null;
type WizardStep = 'mode' | 'fly-parse' | 'drive-form' | 'train-manual' | 'manual-form';

function parsePassengers(passengerString: string | undefined, airline: string | undefined): Array<{
  name: string;
  frequent_flyer_number?: string;
  airline?: string;
}> {
  if (!passengerString) return [];
  const passengers = passengerString
    .split(/,|\d+\s*[-–]\s*/)
    .map(p => p.trim())
    .filter(p => p.length > 0);
  return passengers.map(passenger => {
    const ffMatch = passenger.match(/(?:miles?|member|#)\s*[#:]?\s*(\d{5,})/i);
    const frequentFlyerNumber = ffMatch ? ffMatch[1] : undefined;
    const cleanName = passenger
      .replace(/(?:frontier|delta|united|american|southwest|jetblue)?\s*miles?\s*[#:]?\s*\d+/gi, '')
      .replace(/not a .* member\??.*$/i, '')
      .replace(/sign up!?/gi, '')
      .trim();
    return {
      name: cleanName,
      frequent_flyer_number: frequentFlyerNumber,
      airline: frequentFlyerNumber ? airline : undefined,
    };
  }).filter(p => p.name.length > 0);
}

const tripSchema = z.object({
  name: z.string().min(1, 'Trip name is required').max(100),
  destination_city: z.string().min(1, 'City is required').max(100),
  destination_state: z.string().max(100).optional(),
  destination_country: z.string().max(100).optional(),
  trip_type: z.enum(['business', 'personal', 'mixed']),
  transportation_mode: z.enum(['flight', 'drive', 'unspecified']),
  destination_type: z.enum(['beach', 'mountain', 'city', 'unspecified']),
  origin_address: z.string().max(500).optional(),
  destination_address: z.string().max(500).optional(),
});

type TripFormData = z.infer<typeof tripSchema>;

interface ParsedBooking {
  booking_type: BookingType;
  vendor_name: string;
  start_datetime: string;
  end_datetime?: string;
  confirmation_number?: string;
  total_cost?: number;
  address?: string;
  airline?: string;
  passenger_name?: string;
  property_name?: string;
  stay_type?: StayType;
  rental_company?: string;
  pickup_location?: string;
  return_location?: string;
  notes?: string;
}

interface CreateTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreateTripDialog({ open, onOpenChange }: CreateTripDialogProps) {
  const navigate = useNavigate();
  const createTrip = useCreateTrip();
  const createBooking = useCreateBooking();
  const createCompanion = useCreateCompanion();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('mode');
  const [travelMode, setTravelMode] = useState<TravelMode>(null);

  // Form state (shared across steps)
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedBookings, setParsedBookings] = useState<ParsedBooking[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [showPasteInput, setShowPasteInput] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Drive flow extra state
  const [driveDestination, setDriveDestination] = useState('');
  const [driveOrigin, setDriveOrigin] = useState('');
  // v3.8.4: Structured location state for Drive flow
  const [driveOriginLocation, setDriveOriginLocation] = useState<LocationStructured | null>(null);
  const [driveDestLocation, setDriveDestLocation] = useState<LocationStructured | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      name: '',
      destination_city: '',
      destination_state: '',
      destination_country: '',
      trip_type: 'personal',
      transportation_mode: 'unspecified',
      destination_type: 'unspecified',
      origin_address: '',
      destination_address: '',
    },
  });

  const tripType = watch('trip_type');
  const transportationMode = watch('transportation_mode');
  const destinationType = watch('destination_type');

  const resetAll = useCallback(() => {
    reset({
      name: '',
      destination_city: '',
      destination_state: '',
      destination_country: '',
      trip_type: 'personal',
      transportation_mode: 'unspecified',
      destination_type: 'unspecified',
      origin_address: '',
      destination_address: '',
    });
    setStep('mode');
    setTravelMode(null);
    setStartDate(undefined);
    setEndDate(undefined);
    setParsedBookings([]);
    setParseError(null);
    setPastedText('');
    setShowPasteInput(false);
    setDriveDestination('');
    setDriveOrigin('');
    setDriveOriginLocation(null);
    setDriveDestLocation(null);
  }, [reset]);

  useEffect(() => {
    if (open) {
      resetAll();
    }
  }, [open, resetAll]);

  // ============================================================================
  // PARSING LOGIC (reused from existing)
  // ============================================================================

  const parseItineraryText = useCallback(async (text: string) => {
    if (!text.trim()) {
      setParseError('Please paste your confirmation text first.');
      return;
    }

    setIsParsing(true);
    setParseError(null);
    toast.info('Parsing itinerary...');

    try {
      const { data, error } = await supabase.functions.invoke('parse-itinerary', {
        body: { text },
      });

      if (error) {
        console.error('Network error:', error);
        setParseError('Unable to connect. Please check your connection and try again.');
        toast.error('Connection error');
        return;
      }

      if (data?.success && data?.data) {
        const parsed = data.data;

        if (parsed.trip) {
          if (parsed.trip.trip_name) setValue('name', parsed.trip.trip_name);
          if (parsed.trip.destination_city) setValue('destination_city', parsed.trip.destination_city);
          if (parsed.trip.destination_state) setValue('destination_state', parsed.trip.destination_state);
          if (parsed.trip.destination_country) setValue('destination_country', parsed.trip.destination_country);
          if (parsed.trip.trip_type) setValue('trip_type', parsed.trip.trip_type);

          if (parsed.bookings?.some((b: any) => b.booking_type === 'flight')) {
            setValue('transportation_mode', 'flight');
          }
        }

        if (parsed.bookings && Array.isArray(parsed.bookings)) {
          setParsedBookings(parsed.bookings);

          // v2.2.7: Use TripFrameResolver for canonical date resolution
          const frameMode: TripFrameMode = travelMode === 'fly' ? 'fly' : travelMode === 'drive' ? 'drive' : 'train';
          const alignment = validateConfirmationAlignment(parsed.bookings, frameMode);

          if (alignment.aligned && alignment.frame && isFrameResolved(alignment.frame)) {
            try { setStartDate(parseISO(alignment.frame.startDate)); } catch {}
            try { setEndDate(parseISO(alignment.frame.endDate)); } catch {}
          } else if (!alignment.aligned) {
            // Warn user about potential multi-trip confirmations
            toast.warning('These confirmations may belong to separate trips. Please review the dates.');
            // Fall back to suggested dates
            const suggestedDates = getSuggestedTripDates(parsed.bookings);
            if (suggestedDates.start_date) {
              try { setStartDate(parseISO(suggestedDates.start_date)); } catch {}
            }
            if (suggestedDates.end_date) {
              try { setEndDate(parseISO(suggestedDates.end_date)); } catch {}
            }
          }

          // Surface warnings from resolver
          if (alignment.warnings.length > 0) {
            alignment.warnings.forEach(w => toast.info(w, { duration: 5000 }));
          }
        } else {
          if (parsed.trip?.start_date) {
            try { setStartDate(parseISO(parsed.trip.start_date)); } catch {}
          }
          if (parsed.trip?.end_date) {
            try { setEndDate(parseISO(parsed.trip.end_date)); } catch {}
          }
        }

        setPastedText('');
        setShowPasteInput(false);
        toast.success(data.message || `Parsed ${parsed.bookings?.length || 0} booking(s) from itinerary`);

        // After successful parse in Fly flow, go to manual form to review/submit
        setStep('manual-form');
      } else {
        const message = data?.message || 'We couldn\'t parse this text. Please fill in the details manually.';
        setParseError(message);
        toast.warning(message);
      }
    } catch (err) {
      console.error('Parse error:', err);
      setParseError('An unexpected error occurred. Please try again or enter details manually.');
      toast.error('Something went wrong');
    } finally {
      setIsParsing(false);
    }
  }, [setValue]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const text = e.dataTransfer.getData('text/plain');
    if (!text) {
      setParseError('No text content found. Please drag and drop text from your confirmation email or document.');
      return;
    }
    await parseItineraryText(text);
  }, [parseItineraryText]);

  const handlePasteAndScan = useCallback(async () => {
    await parseItineraryText(pastedText);
  }, [pastedText, parseItineraryText]);

  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setPastedText(text);
        await parseItineraryText(text);
      }
    } catch {
      setShowPasteInput(true);
      toast.info('Paste your confirmation text below');
    }
  }, [parseItineraryText]);

  // ============================================================================
  // TRIP CREATION (shared)
  // ============================================================================

  const onSubmit = async (data: TripFormData) => {
    if (!startDate || !endDate) return;

    try {
      const trip = await createTrip.mutateAsync({
        name: data.name,
        destination_city: data.destination_city,
        destination_state: data.destination_state || undefined,
        destination_country: data.destination_country,
        trip_type: data.trip_type,
        transportation_mode: data.transportation_mode,
        destination_type: data.destination_type,
        origin_address: data.origin_address || undefined,
        destination_address: data.destination_address || undefined,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
      } as any);

      if (parsedBookings.length > 0 && trip?.id) {
        const createdCompanions: Map<string, string> = new Map();
        let totalCompanionsCreated = 0;

        for (const booking of parsedBookings) {
          const vendorUrl = booking.booking_type !== 'transport' ? getVendorUrl(booking.vendor_name, booking.booking_type) : null;
          const createdBooking = await createBooking.mutateAsync({
            trip_id: trip.id,
            booking_type: booking.booking_type,
            vendor_name: booking.vendor_name,
            start_datetime: booking.start_datetime,
            end_datetime: booking.end_datetime,
            confirmation_number: booking.confirmation_number,
            total_cost: booking.total_cost,
            address: booking.address,
            airline: booking.airline,
            passenger_name: booking.passenger_name,
            property_name: booking.property_name,
            stay_type: booking.stay_type,
            rental_company: booking.rental_company,
            pickup_location: booking.pickup_location,
            return_location: booking.return_location,
            notes: booking.notes,
            link_url: vendorUrl || undefined,
          });

          if (booking.passenger_name && booking.booking_type === 'flight') {
            const passengers = parsePassengers(booking.passenger_name, booking.airline);
            for (const passenger of passengers) {
              const normalizedName = passenger.name.toLowerCase().trim();
              if (!createdCompanions.has(normalizedName)) {
                try {
                  const companion = await createCompanion.mutateAsync({
                    trip_id: trip.id,
                    name: passenger.name,
                    frequent_flyer_number: passenger.frequent_flyer_number,
                    airline: passenger.airline,
                  });
                  if (companion?.id) {
                    createdCompanions.set(normalizedName, companion.id);
                    totalCompanionsCreated++;
                  }
                } catch (err) {
                  console.error('Failed to create companion:', err);
                }
              }
              const companionId = createdCompanions.get(normalizedName);
              if (companionId && createdBooking?.id) {
                try {
                  await supabase.from('booking_companions').insert({
                    booking_id: createdBooking.id,
                    companion_id: companionId,
                  });
                } catch (err) {
                  console.error('Failed to link companion to booking:', err);
                }
              }
            }
          }
        }

        const companionMsg = totalCompanionsCreated > 0
          ? ` and ${totalCompanionsCreated} companion(s)`
          : '';
        toast.success(`Created trip with ${parsedBookings.length} booking(s)${companionMsg}!`);
      }

      resetAll();
      onOpenChange(false);

      if (trip?.id) {
        navigate(`/trip/${trip.id}`);
      }
    } catch (err) {
      console.error('Failed to create trip:', err);
    }
  };

  /** Quick-create for Drive flow — uses TripFrameResolver + structured locations */
  const handleDriveCreate = async () => {
    // v3.8.4: Require structured destination location
    const destName = driveDestLocation ? driveDestLocation.cityName : driveDestination.trim();
    if (!destName || !startDate || !endDate) return;

    if (driveDestLocation && !isLocationComplete(driveDestLocation)) {
      toast.error('Please select a destination city from the suggestions.');
      return;
    }

    // v2.2.7: Validate frame through resolver before creation
    const frame = resolveTripFrame('drive', [], {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    });

    if (!isFrameResolved(frame)) {
      toast.error('Invalid trip dates. Please check your arrival and return dates.');
      return;
    }

    try {
      const trip = await createTrip.mutateAsync({
        name: `Trip to ${destName}`,
        destination_city: destName,
        destination_state: driveDestLocation?.regionCode || '',
        destination_country: driveDestLocation?.countryCode || 'US',
        trip_type: 'personal',
        transportation_mode: 'drive',
        destination_type: 'unspecified',
        origin_address: driveOriginLocation 
          ? driveOriginLocation.formatted 
          : (driveOrigin || undefined),
        destination_address: driveDestLocation?.formatted || undefined,
        start_date: frame.startDate,
        end_date: frame.endDate,
      } as any);

      resetAll();
      onOpenChange(false);
      if (trip?.id) {
        navigate(`/trip/${trip.id}`);
      }
    } catch (err) {
      console.error('Failed to create drive trip:', err);
    }
  };

  /** Quick-create for Train flow → opens manual form with train mode */
  const handleTrainManual = () => {
    setValue('transportation_mode', 'unspecified');
    setStep('manual-form');
  };

  const handleClose = () => {
    resetAll();
    onOpenChange(false);
  };

  const removeBooking = (index: number) => {
    setParsedBookings(prev => prev.filter((_, i) => i !== index));
  };

  const getBookingTypeLabel = (type: BookingType) => {
    switch (type) {
      case 'flight': return '✈️ Flight';
      case 'stay': return '🏨 Lodging';
      case 'car_rental': return '🚗 Car Rental';
      case 'activity': return '🎯 Activity';
      default: return type;
    }
  };

  // ============================================================================
  // MODE CHOOSER STEP
  // ============================================================================

  const handleModeSelect = (mode: TravelMode) => {
    setTravelMode(mode);
    switch (mode) {
      case 'fly':
        setValue('transportation_mode', 'flight');
        setStep('fly-parse');
        break;
      case 'drive':
        setValue('transportation_mode', 'drive');
        setStep('drive-form');
        break;
      case 'train':
        setStep('train-manual');
        break;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  const dialogMaxWidth = step === 'mode' ? 'sm:max-w-xl' : 'sm:max-w-lg';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={`${dialogMaxWidth} max-h-[90vh] overflow-y-auto`}>

        {/* ── STEP: Mode Chooser ───────────────────────────────── */}
        {step === 'mode' && (
          <div className="py-4 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">How are you traveling?</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Choose how you'll get there so <span className="italic">Real Travel 2 Real Places</span> can set up the trip the right way.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Fly */}
              <button
                onClick={() => handleModeSelect('fly')}
                className="group flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Plane className="w-6 h-6 text-primary" />
                </div>
                <span className="text-lg font-semibold">Fly</span>
                <span className="text-xs text-muted-foreground text-center leading-snug">
                  Best when you have airline confirmations.
                </span>
              </button>

              {/* Drive */}
              <button
                onClick={() => handleModeSelect('drive')}
                className="group flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Car className="w-6 h-6 text-primary" />
                </div>
                <span className="text-lg font-semibold">Drive</span>
                <span className="text-xs text-muted-foreground text-center leading-snug">
                  Best when you're on the road with a car.
                </span>
              </button>

              {/* Train */}
              <button
                onClick={() => handleModeSelect('train')}
                className="group flex flex-col items-center gap-2 p-6 rounded-xl border-2 border-border hover:border-primary/60 hover:bg-primary/5 transition-all duration-200 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <TrainFront className="w-6 h-6 text-primary" />
                </div>
                <span className="text-lg font-semibold">Train</span>
                <span className="text-xs text-muted-foreground text-center leading-snug">
                  Best for rail tickets and passes.
                </span>
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: Fly — Parse-first ──────────────────────────── */}
        {step === 'fly-parse' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('mode')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-bold">Drop your confirmations. We'll build the trip.</h2>
              <p className="text-sm text-muted-foreground">
                Drag in your airline (and optional stay/rental) confirmations. <span className="italic">Real Travel 2 Real Places</span> will read them and create the trip automatically.
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span><span className="italic">Real Travel 2 Real Places</span> reads your confirmations so you don't have to retype details.</span>
            </div>

            {/* Drop Zone */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'relative border-2 border-dashed rounded-lg p-8 transition-all duration-200 text-center',
                isDragging
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                isParsing && 'pointer-events-none opacity-60'
              )}
            >
              {isParsing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Parsing your confirmations...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className={cn(
                    "w-8 h-8 transition-colors",
                    isDragging ? "text-primary" : "text-muted-foreground"
                  )} />
                  <p className="text-sm font-medium">
                    {isDragging ? 'Drop to parse!' : 'Drop emails, PDFs, or screenshots here.'}
                  </p>
                </div>
              )}
            </div>

            {/* Paste alternative */}
            {!showPasteInput && !isParsing && (
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 h-12 sm:h-10"
                onClick={() => setShowPasteInput(true)}
              >
                <ClipboardPaste className="w-5 h-5" />
                <span>Paste Confirmation Text</span>
              </Button>
            )}

            {showPasteInput && (
              <div className="space-y-2">
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your booking confirmation, itinerary, or email text here..."
                  className="min-h-[120px] text-base"
                  autoFocus
                  disabled={isParsing}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => { setPastedText(''); setShowPasteInput(false); }}
                    disabled={isParsing}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="flex-1 flex items-center justify-center gap-2"
                    onClick={handlePasteAndScan}
                    disabled={isParsing || !pastedText.trim()}
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Scan className="w-4 h-4" />
                        Scan & Import
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {parseError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {parseError}
              </div>
            )}

            <div className="pt-2 text-center">
              <button
                onClick={() => {
                  setValue('transportation_mode', 'flight');
                  setStep('manual-form');
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
              >
                Or add trip details manually
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: Drive — Simple frame ───────────────────────── */}
        {step === 'drive-form' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('mode')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Car className="w-5 h-5 text-primary" />
                Drive Trip
              </h2>
              <p className="text-sm text-muted-foreground">
                We'll use this to create your trip frame. You can still add lodging, stops, and expenses later — or drop in confirmations if you already booked a hotel.
              </p>
            </div>

            <div className="space-y-3">
              {/* v3.8.4: Structured destination with LocationInput */}
              <LocationInput
                label="Where are you headed?"
                value={driveDestLocation}
                onChange={(loc) => {
                  setDriveDestLocation(loc);
                  setDriveDestination(loc?.cityName || '');
                }}
                required
                placeholder="Search city..."
              />

              {/* v3.8.4: Structured origin with LocationInput */}
              <LocationInput
                label="Starting from (optional)"
                value={driveOriginLocation}
                onChange={(loc) => {
                  setDriveOriginLocation(loc);
                  setDriveOrigin(loc?.cityName || '');
                }}
                placeholder="Search city..."
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Arrival Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !startDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'MMM d, yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Return Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal',
                          !endDate && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'MMM d, yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => startDate ? date < startDate : false}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleDriveCreate}
                className="flex-1 bg-gradient-ocean hover:opacity-90"
                disabled={createTrip.isPending || (!driveDestLocation && !driveDestination.trim()) || !startDate || !endDate}
              >
                {createTrip.isPending ? 'Creating...' : 'Create Trip'}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: Train — Manual fallback ────────────────────── */}
        {step === 'train-manual' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('mode')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <TrainFront className="w-5 h-5 text-primary" />
                Train Trip
              </h2>
            </div>

            <div className="p-4 rounded-lg bg-muted/50 border border-dashed text-sm text-muted-foreground space-y-2">
              <p>
                Train trips are supported with manual details today. You can still attach confirmations to your trip after creation.
              </p>
            </div>

            <Button
              onClick={handleTrainManual}
              className="w-full bg-gradient-ocean hover:opacity-90"
            >
              Add Train Trip Manually
            </Button>

            <Button type="button" variant="outline" onClick={handleClose} className="w-full">
              Cancel
            </Button>
          </div>
        )}

        {/* ── STEP: Manual Form (legacy + post-parse review) ──── */}
        {step === 'manual-form' && (
          <div className="space-y-4">
            {/* Back button only if not coming from parsed result */}
            <button
              onClick={() => setStep(travelMode ? (travelMode === 'fly' ? 'fly-parse' : 'mode') : 'mode')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {/* Tip line for manual form */}
            {parsedBookings.length === 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <Info className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Tip: Next time, drop in your confirmations and we'll build the trip for you automatically.</span>
              </div>
            )}

            {/* Parsed Bookings Preview */}
            {parsedBookings.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  {parsedBookings.length} Booking(s) to Add
                </Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {parsedBookings.map((booking, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span>{getBookingTypeLabel(booking.booking_type)}</span>
                        <span className="text-muted-foreground">•</span>
                        <span className="font-medium">{booking.vendor_name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBooking(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Trip Name</Label>
                <Input id="name" placeholder="Trip name" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="City" {...register('destination_city')} />
                  {errors.destination_city && <p className="text-sm text-destructive">{errors.destination_city.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" placeholder="State" {...register('destination_state')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" placeholder="Country" {...register('destination_country')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trip Type</Label>
                  <Select value={tripType} onValueChange={(value: 'business' | 'personal' | 'mixed') => setValue('trip_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select trip type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Getting There</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={transportationMode === 'flight' ? 'default' : 'outline'}
                      size="sm"
                      className={cn("flex-1", transportationMode === 'flight' && "bg-primary")}
                      onClick={() => setValue('transportation_mode', 'flight')}
                    >
                      <Plane className="w-4 h-4 mr-1" />
                      Flying
                    </Button>
                    <Button
                      type="button"
                      variant={transportationMode === 'drive' ? 'default' : 'outline'}
                      size="sm"
                      className={cn("flex-1", transportationMode === 'drive' && "bg-primary")}
                      onClick={() => setValue('transportation_mode', 'drive')}
                    >
                      <Car className="w-4 h-4 mr-1" />
                      Driving
                    </Button>
                  </div>
                </div>
              </div>

              {/* Destination Type Selector */}
              <div className="space-y-2">
                <Label>Destination Type (for packing suggestions)</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={destinationType === 'beach' ? 'default' : 'outline'}
                    size="sm"
                    className={cn("flex-1", destinationType === 'beach' && "bg-cyan-600 hover:bg-cyan-700")}
                    onClick={() => setValue('destination_type', 'beach')}
                  >
                    <Palmtree className="w-4 h-4 mr-1" />
                    Beach
                  </Button>
                  <Button
                    type="button"
                    variant={destinationType === 'mountain' ? 'default' : 'outline'}
                    size="sm"
                    className={cn("flex-1", destinationType === 'mountain' && "bg-emerald-600 hover:bg-emerald-700")}
                    onClick={() => setValue('destination_type', 'mountain')}
                  >
                    <Mountain className="w-4 h-4 mr-1" />
                    Mountain
                  </Button>
                  <Button
                    type="button"
                    variant={destinationType === 'city' ? 'default' : 'outline'}
                    size="sm"
                    className={cn("flex-1", destinationType === 'city' && "bg-slate-600 hover:bg-slate-700")}
                    onClick={() => setValue('destination_type', 'city')}
                  >
                    <Building2 className="w-4 h-4 mr-1" />
                    City
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Optional: Override auto-detection for packing list recommendations
                </p>
              </div>

              {/* Drive-specific fields */}
              {transportationMode === 'drive' && (
                <div className="space-y-3 p-3 rounded-lg bg-muted/50 border border-dashed">
                  <div className="space-y-2">
                    <Label htmlFor="origin_address">Starting Address (optional)</Label>
                    <Input id="origin_address" placeholder="Starting address" {...register('origin_address')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="destination_address">Destination Address (optional)</Label>
                    <Input id="destination_address" placeholder="Destination address" {...register('destination_address')} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn('w-full justify-start text-left font-normal', !startDate && 'text-muted-foreground')}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn('w-full justify-start text-left font-normal', !endDate && 'text-muted-foreground')}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => startDate ? date < startDate : false}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-ocean hover:opacity-90"
                  disabled={createTrip.isPending || !startDate || !endDate}
                >
                  {createTrip.isPending ? 'Creating...' : parsedBookings.length > 0
                    ? `Create Trip + ${parsedBookings.length} Booking(s)`
                    : 'Create Trip'}
                </Button>
              </div>
            </form>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
