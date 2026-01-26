import { useState, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useCreateTrip } from '@/hooks/useTrips';
import { useCreateBooking } from '@/hooks/useBookings';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Upload, FileText, Loader2, X, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { getVendorUrl } from '@/lib/vendorUrls';
import { BookingType, StayType } from '@/types/database';

const tripSchema = z.object({
  name: z.string().min(1, 'Trip name is required').max(100),
  destination_city: z.string().min(1, 'City is required').max(100),
  destination_state: z.string().max(100).optional(),
  destination_country: z.string().min(1, 'Country is required').max(100),
  trip_type: z.enum(['business', 'personal', 'mixed']),
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

export function CreateTripDialog({ open, onOpenChange }: CreateTripDialogProps) {
  const navigate = useNavigate();
  const createTrip = useCreateTrip();
  const createBooking = useCreateBooking();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedBookings, setParsedBookings] = useState<ParsedBooking[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<TripFormData>({
    resolver: zodResolver(tripSchema),
    defaultValues: {
      trip_type: 'personal',
    },
  });

  const tripType = watch('trip_type');

  const resetAll = () => {
    reset();
    setStartDate(undefined);
    setEndDate(undefined);
    setParsedBookings([]);
    setParseError(null);
  };

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
    setParseError(null);

    const text = e.dataTransfer.getData('text/plain');
    if (!text) {
      setParseError('No text content found. Please drag and drop text from your confirmation email or document.');
      return;
    }

    setIsParsing(true);
    toast.info('Parsing itinerary...');

    try {
      const { data, error } = await supabase.functions.invoke('parse-itinerary', {
        body: { text },
      });

      if (error) throw error;

      if (data?.success && data?.data) {
        const parsed = data.data;
        
        // Fill in trip details
        if (parsed.trip) {
          if (parsed.trip.trip_name) setValue('name', parsed.trip.trip_name);
          if (parsed.trip.destination_city) setValue('destination_city', parsed.trip.destination_city);
          if (parsed.trip.destination_state) setValue('destination_state', parsed.trip.destination_state);
          if (parsed.trip.destination_country) setValue('destination_country', parsed.trip.destination_country);
          if (parsed.trip.trip_type) setValue('trip_type', parsed.trip.trip_type);
          if (parsed.trip.start_date) {
            try {
              setStartDate(parseISO(parsed.trip.start_date));
            } catch {}
          }
          if (parsed.trip.end_date) {
            try {
              setEndDate(parseISO(parsed.trip.end_date));
            } catch {}
          }
        }

        // Store parsed bookings
        if (parsed.bookings && Array.isArray(parsed.bookings)) {
          setParsedBookings(parsed.bookings);
        }

        toast.success(`Parsed ${parsed.bookings?.length || 0} booking(s) from itinerary`);
      } else {
        throw new Error(data?.error || 'Failed to parse itinerary');
      }
    } catch (err) {
      console.error('Parse error:', err);
      setParseError(err instanceof Error ? err.message : 'Failed to parse itinerary');
      toast.error('Failed to parse itinerary');
    } finally {
      setIsParsing(false);
    }
  }, [setValue]);

  const onSubmit = async (data: TripFormData) => {
    if (!startDate || !endDate) return;

    try {
      const trip = await createTrip.mutateAsync({
        name: data.name,
        destination_city: data.destination_city,
        destination_state: data.destination_state || undefined,
        destination_country: data.destination_country,
        trip_type: data.trip_type,
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
      });

      // Create bookings if any were parsed
      if (parsedBookings.length > 0 && trip?.id) {
        for (const booking of parsedBookings) {
          const vendorUrl = getVendorUrl(booking.vendor_name, booking.booking_type);
          await createBooking.mutateAsync({
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
        }
        toast.success(`Created trip with ${parsedBookings.length} booking(s)!`);
      }

      resetAll();
      onOpenChange(false);
      
      // Navigate to the new trip
      if (trip?.id) {
        navigate(`/trip/${trip.id}`);
      }
    } catch (err) {
      console.error('Failed to create trip:', err);
    }
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
      case 'stay': return '🏨 Stay';
      case 'car_rental': return '🚗 Car Rental';
      case 'activity': return '🎯 Activity';
      default: return type;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Trip</DialogTitle>
          <DialogDescription>
            Drag & drop itineraries or confirmations, or fill in the details manually
          </DialogDescription>
        </DialogHeader>

        {/* Drop Zone */}
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 text-center',
            isDragging 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
            isParsing && 'pointer-events-none opacity-60'
          )}
        >
          {isParsing ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Parsing your itinerary...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className={cn(
                "w-8 h-8 transition-colors",
                isDragging ? "text-primary" : "text-muted-foreground"
              )} />
              <p className="text-sm font-medium">
                {isDragging ? 'Drop to parse!' : 'Drag & drop itinerary or confirmation'}
              </p>
              <p className="text-xs text-muted-foreground">
                Drop text from emails or documents to auto-fill trip details
              </p>
            </div>
          )}
        </div>

        {parseError && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {parseError}
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
            <Input
              id="name"
              placeholder="Summer Vacation 2024"
              {...register('name')}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Orlando"
                {...register('destination_city')}
              />
              {errors.destination_city && <p className="text-sm text-destructive">{errors.destination_city.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                placeholder="FL"
                {...register('destination_state')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                placeholder="USA"
                {...register('destination_country')}
              />
              {errors.destination_country && <p className="text-sm text-destructive">{errors.destination_country.message}</p>}
            </div>
          </div>

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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
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
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h--4 w-4" />
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
      </DialogContent>
    </Dialog>
  );
}
