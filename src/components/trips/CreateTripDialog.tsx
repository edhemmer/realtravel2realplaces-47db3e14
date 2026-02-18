import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useCreateTrip } from '@/hooks/useTrips';
import { useCreateBooking } from '@/hooks/useBookings';
import { useCreateCompanion } from '@/hooks/useCompanions';
import { useCompleteOnboarding } from '@/hooks/useOnboardingStatus';
import { supabase } from '@/integrations/supabase/client';
import { DropzoneIntake } from '@/components/trips/DropzoneIntake';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, FileText, Loader2, X, Check, Plane, Car, Palmtree, Mountain, Building2, ClipboardPaste, Scan, TrainFront, ArrowLeft, Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getVendorUrl } from '@/lib/vendorUrls';
import { BookingType, StayType } from '@/types/database';
// getSuggestedTripDates no longer used here — consumed by buildSuggestedTripMeta
import { resolveTripFrame, validateConfirmationAlignment, isFrameResolved, type TripFrameMode } from '@/lib/tripFrameResolver';
// v3.9.31: Single canonical meta resolver for auto-filling trip identity
import { buildSuggestedTripMeta } from '@/lib/suggestedTripMeta';
import { LocationInput } from '@/components/LocationInput';
import { LocationStructured, isLocationComplete, locationLabel } from '@/lib/location/types';
import { evaluateTripComplexity, type TripComplexityResult } from '@/lib/canonical/tripComplexity';
import type { CanonicalItem } from '@/lib/canonical/canonicalTypes';
// v3.9.9: Canonical import pipeline — single entry point for all booking parsing
import { runCanonicalImportPipeline } from '@/lib/ingestion/canonicalImportPipeline';
// v3.9.28: Receipt cost extraction fallback
import { enrichParsedBookingCost } from '@/lib/costAttribution';

// ============================================================================
// TYPES & HELPERS
// ============================================================================

type TravelMode = 'fly' | 'drive' | 'train' | null;
type WizardStep = 'mode' | 'fly-parse' | 'drive-form' | 'train-manual' | 'manual-form' | 'review-confirm';

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
  /** v3.8.20: When true, wizard is the onboarding experience */
  isOnboarding?: boolean;
}

// ============================================================================
// BATCH PERSISTENCE (sessionStorage — survives stumbles/refreshes)
// ============================================================================

const WIZARD_BATCH_KEY = 'rt2rp_wizard_batch';

function saveWizardBatch(bookings: ParsedBooking[]) {
  try {
    sessionStorage.setItem(WIZARD_BATCH_KEY, JSON.stringify(bookings));
  } catch { /* storage full or unavailable — non-critical */ }
}

function loadWizardBatch(): ParsedBooking[] | null {
  try {
    const raw = sessionStorage.getItem(WIZARD_BATCH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch { /* corrupt data — ignore */ }
  return null;
}

function clearWizardBatch() {
  try { sessionStorage.removeItem(WIZARD_BATCH_KEY); } catch {}
}

/**
 * Deterministic booking fingerprint for deduplication.
 * Uses confirmation_number + vendor_name + booking_type + start_datetime.
 */
function bookingFingerprint(b: ParsedBooking): string {
  return [
    (b.confirmation_number || '').trim().toUpperCase(),
    (b.vendor_name || '').trim().toUpperCase(),
    b.booking_type,
    (b.start_datetime || '').substring(0, 16),
  ].join('|');
}

/**
 * Merge new bookings into existing array, deduplicating by fingerprint.
 * Append-only: existing items are never overwritten.
 */
function mergeBookings(existing: ParsedBooking[], incoming: ParsedBooking[]): ParsedBooking[] {
  const seen = new Set(existing.map(bookingFingerprint));
  const merged = [...existing];
  for (const booking of incoming) {
    const fp = bookingFingerprint(booking);
    if (!seen.has(fp)) {
      seen.add(fp);
      merged.push(booking);
    }
  }
  return merged;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CreateTripDialog({ open, onOpenChange, isOnboarding = false }: CreateTripDialogProps) {
  const navigate = useNavigate();
  const createTrip = useCreateTrip();
  const createBooking = useCreateBooking();
  const createCompanion = useCreateCompanion();
  const completeOnboarding = useCompleteOnboarding();

  // Wizard state
  const [step, setStep] = useState<WizardStep>('mode');
  const [travelMode, setTravelMode] = useState<TravelMode>(null);

  // Form state (shared across steps)
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isParsing, setIsParsing] = useState(false);
  const [parsedBookings, setParsedBookings] = useState<ParsedBooking[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [complexityResult, setComplexityResult] = useState<TripComplexityResult | null>(null);

  // Drive flow extra state
  const [driveDestination, setDriveDestination] = useState('');
  const [driveOrigin, setDriveOrigin] = useState('');
  // v3.8.4: Structured location state for Drive flow
  const [driveOriginLocation, setDriveOriginLocation] = useState<LocationStructured | null>(null);
  const [driveDestLocation, setDriveDestLocation] = useState<LocationStructured | null>(null);

  const { register, handleSubmit, setValue, watch, getValues, reset, formState: { errors } } = useForm<TripFormData>({
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
    setComplexityResult(null);
    clearWizardBatch();
  }, [reset]);

  useEffect(() => {
    if (open) {
      // v3.8.23-fix: On open, check for a persisted batch to resume
      const savedBatch = loadWizardBatch();
      if (savedBatch && savedBatch.length > 0) {
        // Resume: load persisted batch, skip to manual-form review
        setParsedBookings(savedBatch);
        setTravelMode('fly');
        setValue('transportation_mode', 'flight');
        setStep('manual-form');
        
        // v3.9.31: Restore ALL meta from batch using canonical resolver
        const meta = buildSuggestedTripMeta(savedBatch, 'fly');
        if (meta.suggestedStart) setStartDate(meta.suggestedStart);
        if (meta.suggestedEnd) setEndDate(meta.suggestedEnd);
        if (meta.suggestedTripName) setValue('name', meta.suggestedTripName);
        if (meta.suggestedDestinationFields.city) setValue('destination_city', meta.suggestedDestinationFields.city);
        if (meta.suggestedDestinationFields.state) setValue('destination_state', meta.suggestedDestinationFields.state || '');
        if (meta.suggestedDestinationFields.country) setValue('destination_country', meta.suggestedDestinationFields.country || '');
        
        toast.info(`Resuming with ${savedBatch.length} booking(s) from your previous session.`);
      } else {
        resetAll();
        // v3.10.1: Onboarding lands on mode selector (Fly/Drive/Train) — no skip
      }
    }
  }, [open, resetAll, setValue, isOnboarding]);

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

        // v3.9.31: Only use per-email AI trip_type hint (non-identity field)
        if (parsed.trip) {
          if (parsed.trip.trip_type) setValue('trip_type', parsed.trip.trip_type);
          if (parsed.bookings?.some((b: any) => b.booking_type === 'flight')) {
            setValue('transportation_mode', 'flight');
          }
        }

        if (parsed.bookings && Array.isArray(parsed.bookings)) {
          // v3.9.28: Enrich each booking's cost from raw text if AI parser missed it
          for (const booking of parsed.bookings) {
            enrichParsedBookingCost(booking, text);
          }
          
          // v3.9.9: Run canonical import pipeline on the batch
          const pipelineResult = runCanonicalImportPipeline(parsed.bookings, text);
          
          // Surface pipeline issues to user
          if (pipelineResult.hasReceipts && pipelineResult.receiptItems.length > 0) {
            toast.info(`${pipelineResult.receiptItems.length} receipt(s) detected and excluded from bookings.`, { duration: 5000 });
          }
          if (pipelineResult.needsAttentionItems.length > 0) {
            toast.warning(`${pipelineResult.needsAttentionItems.length} booking(s) have incomplete fields. Please review.`, { duration: 6000 });
          }

          // v3.9.26: APPEND new bookings with dedup, then derive ALL meta from FULL merged set
          let allMergedBookings: typeof parsedBookings = [];
          setParsedBookings(prev => {
            const merged = mergeBookings(prev, parsed.bookings);
            saveWizardBatch(merged);
            allMergedBookings = merged;
            return merged;
          });

          // v3.9.31: Single canonical meta resolver — dates, name, destination from ONE source
          const frameMode: TripFrameMode = travelMode === 'fly' ? 'fly' : travelMode === 'drive' ? 'drive' : 'train';
          const meta = buildSuggestedTripMeta(allMergedBookings, frameMode);

          // Auto-fill ONLY empty fields — never overwrite user input
          if (meta.suggestedStart && !startDate) {
            setStartDate(meta.suggestedStart);
          }
          if (meta.suggestedEnd && !endDate) {
            setEndDate(meta.suggestedEnd);
          }
          if (meta.suggestedTripName && !getValues('name')) {
            setValue('name', meta.suggestedTripName);
          }
          if (meta.suggestedDestinationFields.city && !getValues('destination_city')) {
            setValue('destination_city', meta.suggestedDestinationFields.city);
          }
          if (meta.suggestedDestinationFields.state && !getValues('destination_state')) {
            setValue('destination_state', meta.suggestedDestinationFields.state);
          }
          if (meta.suggestedDestinationFields.country && !getValues('destination_country')) {
            setValue('destination_country', meta.suggestedDestinationFields.country);
          }
        } else {
          // No bookings parsed — fall back to per-email AI trip metadata for dates only
          if (parsed.trip?.start_date && !startDate) {
            try { setStartDate(parseISO(parsed.trip.start_date)); } catch {}
          }
          if (parsed.trip?.end_date && !endDate) {
            try { setEndDate(parseISO(parsed.trip.end_date)); } catch {}
          }
          // Also try name/destination from AI when no bookings exist
          if (parsed.trip?.trip_name && !getValues('name')) {
            setValue('name', parsed.trip.trip_name);
          }
          if (parsed.trip?.destination_city && !getValues('destination_city')) {
            setValue('destination_city', parsed.trip.destination_city);
          }
          if (parsed.trip?.destination_state && !getValues('destination_state')) {
            setValue('destination_state', parsed.trip.destination_state);
          }
          if (parsed.trip?.destination_country && !getValues('destination_country')) {
            setValue('destination_country', parsed.trip.destination_country);
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

  // ── Dropzone text handler (fed by DropzoneIntake) ──────
  const handleDropzoneText = useCallback(async (text: string) => {
    setParseError('');
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

  /** v3.8.23: Pre-submit gate — checks complexity before timeline build */
  const handlePreSubmit = handleSubmit((data: TripFormData) => {
    if (parsedBookings.length > 0) {
      // Convert parsed bookings to minimal CanonicalItem-compatible objects for evaluation
      const pseudoCanonical: CanonicalItem[] = parsedBookings.map(b => {
        const base = {
          sourceId: '',
          canonicalId: '',
          vendorName: b.vendor_name || '',
          confirmationNumber: b.confirmation_number || null,
          confirmationNumbers: [],
          totalCost: b.total_cost || 0,
          myShare: 0,
          notes: null,
          linkUrl: null,
          rawEvidence: [],
          warnings: [],
          rawStartTime: { dateText: null, timeText: null, datetimeText: null, timezoneText: null },
          rawEndTime: { dateText: null, timeText: null, datetimeText: null, timezoneText: null },
          costAttributionMode: 'NONE' as const,
          bookingCostTotal: null,
          bookingCostBreakdown: [] as Array<{ label: string; amount: number; currency: string }>,
          startDatetime: b.start_datetime || null,
          endDatetime: b.end_datetime || null,
        };
        if (b.booking_type === 'flight') {
          return {
            ...base,
            type: 'flight' as const,
            airline: b.airline || null,
            passengers: [],
            passengerName: b.passenger_name || null,
            dep: { iata: undefined, name: undefined, city: undefined },
            arr: { iata: undefined, name: undefined, city: undefined },
            departureAirportCode: null,
            departureAirportName: null,
            arrivalAirportCode: null,
            arrivalAirportName: null,
            iataConfidence: 'low' as const,
            flightNumber: null,
            departLocalDate: null,
            departLocalTime: null,
            arriveLocalDate: null,
            arriveLocalTime: null,
            departLocalKey: null,
            arriveLocalKey: null,
            arrivalDateDerived: false,
            legCost: null,
            legCostSourceRef: null,
          };
        }
        if (b.booking_type === 'stay') {
          return {
            ...base,
            type: 'stay' as const,
            propertyName: b.property_name || null,
            stayType: (b.stay_type as any) || null,
            address: b.address || null,
          };
        }
        if (b.booking_type === 'car_rental') {
          return {
            ...base,
            type: 'car_rental' as const,
            rentalCompany: b.rental_company || null,
            pickupLocation: b.pickup_location || null,
            returnLocation: b.return_location || null,
            address: b.address || null,
          };
        }
        // activity / transport → activity canonical
        return {
          ...base,
          type: 'activity' as const,
          activitySource: 'confirmation' as const,
          ticketRequired: false,
          advanceRecommended: false,
          ticketsPurchased: false,
          bookingPattern: null,
          bookingUrl: null,
          address: b.address || null,
          locationSummary: null,
        };
      });

      const result = evaluateTripComplexity(pseudoCanonical);
      setComplexityResult(result);

      if (result.band !== 'SIMPLE') {
        // Show review step
        setStep('review-confirm');
        return;
      }
    }
    // SIMPLE or no bookings → auto-build
    onSubmit(data);
  });

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
        // v3.9.10: Verify trip is loadable before routing
        try {
          const { data: verifyTrip, error: verifyError } = await supabase
            .from('trips')
            .select('id')
            .eq('id', trip.id)
            .maybeSingle();

          if (verifyError || !verifyTrip) {
            console.error('[CreateTrip] Trip verification failed:', verifyError);
            toast.error('Trip created, but it couldn\'t be loaded yet. Please try opening it from your dashboard.');
            navigate('/dashboard');
            return;
          }
        } catch (verifyErr) {
          console.error('[CreateTrip] Trip verification exception:', verifyErr);
          toast.error('Trip created, but it couldn\'t be loaded yet. Please try opening it from your dashboard.');
          navigate('/dashboard');
          return;
        }

        // v3.8.20: Mark onboarding complete + route to NOW view
        if (isOnboarding) {
          try { await completeOnboarding.mutateAsync(); } catch {}
          navigate(`/trip/${trip.id}?tab=now`);
        } else {
          navigate(`/trip/${trip.id}`);
        }
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
        // v3.9.10: Verify trip loadable before routing
        try {
          const { data: verifyTrip, error: verifyError } = await supabase
            .from('trips')
            .select('id')
            .eq('id', trip.id)
            .maybeSingle();

          if (verifyError || !verifyTrip) {
            toast.error('Trip created, but it couldn\'t be loaded yet. Please try from your dashboard.');
            navigate('/dashboard');
            return;
          }
        } catch {
          toast.error('Trip created, but it couldn\'t be loaded yet. Please try from your dashboard.');
          navigate('/dashboard');
          return;
        }

        // v3.8.20: Mark onboarding complete + route to NOW view
        if (isOnboarding) {
          try { await completeOnboarding.mutateAsync(); } catch {}
          navigate(`/trip/${trip.id}?tab=now`);
        } else {
          navigate(`/trip/${trip.id}`);
        }
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

  const handleClose = async () => {
    // v3.8.20: Mark onboarding complete even if wizard is closed early
    if (isOnboarding) {
      try { await completeOnboarding.mutateAsync(); } catch {}
    }
    // v3.8.23-fix: Preserve batch in sessionStorage when closing without creating.
    // Only reset in-memory UI state, NOT the persisted batch.
    // The batch will be auto-loaded on next dialog open.
    if (parsedBookings.length > 0) {
      saveWizardBatch(parsedBookings);
    }
    // Reset UI state but don't clear the batch
    reset();
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
    setComplexityResult(null);
    onOpenChange(false);
  };

  const removeBooking = (index: number) => {
    setParsedBookings(prev => {
      const updated = prev.filter((_, i) => i !== index);
      saveWizardBatch(updated); // Persist removal
      return updated;
    });
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
              <h2 className="text-2xl font-bold tracking-tight">
                {isOnboarding ? 'How are you traveling?' : 'How are you traveling?'}
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                {isOnboarding
                  ? "Select your travel mode and we'll set everything up for you."
                  : <>Choose how you'll get there so <span className="italic">Real Travel 2 Real Places</span> can set up the trip the right way.</>
                }
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
                Drag in your airline (and optional lodging/rental) confirmations. <span className="italic">Real Travel 2 Real Places</span> will read them and create the trip automatically.
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <span><span className="italic">Real Travel 2 Real Places</span> reads your confirmations so you don't have to retype details.</span>
            </div>

            {/* Drop Zone — powered by react-dropzone */}
            <DropzoneIntake
              onTextExtracted={handleDropzoneText}
              isParsing={isParsing}
            />

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
            {/* Back button — always shown, routes to previous step */}
            <button
              onClick={() => setStep(travelMode ? (travelMode === 'fly' ? 'fly-parse' : 'mode') : 'mode')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            {/* v3.10.1: Onboarding header — no upload/import language */}
            {isOnboarding && (
              <div className="text-center space-y-1 pb-1">
                <h2 className="text-xl font-bold tracking-tight">Trip Details</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your destination and dates to get started.
                </p>
              </div>
            )}

            {/* Tip line for manual form (non-onboarding only) */}
            {!isOnboarding && parsedBookings.length === 0 && (
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
                  {parsedBookings.length} Booking(s) Detected
                </Label>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {parsedBookings.map((booking, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        <span className="text-foreground">
                          {booking.booking_type === 'flight' && '✈️ Flight detected'}
                          {booking.booking_type === 'stay' && '🏨 Hotel stay recognized'}
                          {booking.booking_type === 'car_rental' && '🚗 Car rental added'}
                          {booking.booking_type === 'activity' && '🎯 Activity found'}
                          {booking.booking_type === 'transport' && '🚂 Transport found'}
                        </span>
                        {booking.vendor_name && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <span className="font-medium">{booking.vendor_name}</span>
                          </>
                        )}
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

            {/* v3.10.1: Removed onboarding-only paste input — confirmations handled via fly-parse step */}

            <form onSubmit={handlePreSubmit} className="space-y-4">
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
                    ? 'Continue'
                    : 'Create Trip'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP: Review & Confirm (MODERATE / COMPLEX) ──────── */}
        {step === 'review-confirm' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('manual-form')}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="space-y-1">
              <h2 className="text-xl font-bold">Review Your Trip</h2>
              <p className="text-sm text-muted-foreground">
                {complexityResult?.band === 'COMPLEX'
                  ? 'This is a complex itinerary. Please confirm the items below before we build your timeline.'
                  : 'We detected multiple segments. Review before building your timeline.'}
              </p>
            </div>

            {complexityResult && (
              <div className="flex flex-wrap gap-1.5">
                {complexityResult.reasons.map((reason, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            )}

            {/* Grouped items by type */}
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {['flight', 'stay', 'car_rental', 'activity', 'transport'].map(type => {
                const items = parsedBookings.filter(b => b.booking_type === type);
                if (items.length === 0) return null;
                const typeLabel = type === 'flight' ? '✈️ Flights'
                  : type === 'stay' ? '🏨 Lodging'
                  : type === 'car_rental' ? '🚗 Car Rentals'
                  : type === 'activity' ? '🎯 Activities'
                  : '🚂 Transport';
                return (
                  <div key={type} className="space-y-1.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{typeLabel}</p>
                    {items.map((booking) => {
                      const idx = parsedBookings.indexOf(booking);
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate font-medium">{booking.vendor_name}</span>
                            {booking.confirmation_number && (
                              <span className="text-xs text-muted-foreground">#{booking.confirmation_number}</span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeBooking(idx)}
                            className="h-6 w-6 p-0 shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmit(onSubmit)()}
                className="flex-1 bg-gradient-ocean hover:opacity-90"
                disabled={createTrip.isPending || parsedBookings.length === 0}
              >
                {createTrip.isPending ? 'Building...' : 'Confirm & Build Timeline'}
              </Button>
            </div>
          </div>
        )}

      </DialogContent>
    </Dialog>
  );
}
