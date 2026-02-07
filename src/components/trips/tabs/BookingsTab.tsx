import { useState, useEffect, useRef, useCallback } from 'react';
import { useBookings, useCreateBooking, useUpdateBooking, useDeleteBooking } from '@/hooks/useBookings';
import { useCompanions } from '@/hooks/useCompanions';
import { useBookingCompanionsByTrip, useSetBookingCompanions } from '@/hooks/useBookingCompanions';
import { useTrip, useUpdateTrip } from '@/hooks/useTrips';
import { useTripDateSync, calculateFlightDateRange, calculateNonFlightDateRange } from '@/hooks/useTripDateSync';
import { useCreateExpense } from '@/hooks/useExpenses';
import { useMarkTicketsPurchased } from '@/hooks/useActivityBooking';
import { Booking, BookingType, StayType, TransportModeType, Companion } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Plus, Plane, Building2, Car, PartyPopper, Trash2, Pencil,
  ExternalLink, MapPin, AlertTriangle, Link2, Upload, FileText, Users,
  ClipboardPaste, Loader2, Scan, CircleParking, Ticket, CheckCircle2,
  TrainFront, Bus, TramFront, Ship, Compass
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isBefore, isAfter, startOfDay } from 'date-fns';
import { hasExplicitTime, UNKNOWN_TIME_PLACEHOLDER, parseDatetimeForDisplay } from '@/lib/datetimeIntegrity';
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
import { getVendorUrl } from '@/lib/vendorUrls';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTripPermission } from '@/pages/TripDetail';
import { ManualStepHint, MANUAL_STEP_HINTS } from '@/components/trips/ManualStepHint';
import { CompanionDetailDialog } from '@/components/trips/CompanionDetailDialog';
import { isEmailFile, extractEmailBody } from '@/lib/emailBody';
import { ParseOriginHint, EstimatedHint, ParseOrigin } from '@/components/trips/ParseHint';

// Helper to safely open external URLs in new tab
const openExternalUrl = (url: string | null | undefined) => {
  if (!url) return;
  // Ensure URL has protocol
  const safeUrl = url.startsWith('http://') || url.startsWith('https://') 
    ? url 
    : `https://${url}`;
  window.open(safeUrl, '_blank', 'noopener,noreferrer');
};

interface BookingsTabProps {
  tripId: string;
  /** v2.0.7: ID of booking to highlight after drill-through */
  highlightId?: string;
  /** v2.0.7: Callback when highlight has been consumed */
  onHighlightConsumed?: () => void;
}

export function BookingsTab({ tripId, highlightId, onHighlightConsumed }: BookingsTabProps) {
  const { canEdit } = useTripPermission();
  const { data: bookings = [], isLoading } = useBookings(tripId);
  const { data: companions = [] } = useCompanions(tripId);
  const { data: trip } = useTrip(tripId);
  const { data: bookingCompanions = [] } = useBookingCompanionsByTrip(tripId);
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const updateTrip = useUpdateTrip();
  const setBookingCompanions = useSetBookingCompanions();
  const createExpense = useCreateExpense();
  const markTicketsPurchased = useMarkTicketsPurchased();
  
  // Hook to sync trip dates when bookings are added
  const { syncTripDates } = useTripDateSync(tripId, bookings, trip, canEdit);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>('flight');
  const [urlAutoFilled, setUrlAutoFilled] = useState(false);
  const [selectedCompanions, setSelectedCompanions] = useState<string[]>([]);
  
  // Parsing state (like Create Trip)
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // v2.1.3: Parsing confidence state
  const [parseSource, setParseSource] = useState<ParseOrigin>(null);
  const [timeIsEstimated, setTimeIsEstimated] = useState(false);
  
  // Companion detail dialog state
  const [selectedCompanion, setSelectedCompanion] = useState<Companion | null>(null);
  const [companionDialogOpen, setCompanionDialogOpen] = useState(false);
  
  // Date warning confirmation state
  const [showDateWarning, setShowDateWarning] = useState(false);
  const [dateWarningMessage, setDateWarningMessage] = useState('');
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // v2.0.7: Highlight state for drill-through
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // v2.0.7: Handle drill-through highlight
  useEffect(() => {
    if (highlightId && bookings.length > 0) {
      // Check if the booking exists
      const bookingExists = bookings.some(b => b.id === highlightId);
      if (bookingExists) {
        setHighlightedId(highlightId);
        
        // Scroll to the card after a brief delay to let render complete
        setTimeout(() => {
          const cardElement = cardRefs.current.get(highlightId);
          if (cardElement) {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);

        // Clear highlight after 2 seconds
        setTimeout(() => {
          setHighlightedId(null);
          onHighlightConsumed?.();
        }, 2000);
      } else {
        // Record doesn't exist, just clear the target
        onHighlightConsumed?.();
      }
    }
  }, [highlightId, bookings, onHighlightConsumed]);
  
  // Form state
  const [formData, setFormData] = useState({
    vendor_name: '',
    start_datetime: '',
    end_datetime: '',
    address: '',
    confirmation_number: '',
    total_cost: '',
    my_share: '',
    link_url: '',
    notes: '',
    passenger_name: '',
    airline: '',
    tsa_precheck_number: '',
    frequent_flyer_number: '',
    stay_type: 'hotel' as StayType,
    property_name: '',
    rental_company: '',
    pickup_location: '',
    return_location: '',
    // Transport-specific
    transport_mode: 'train' as TransportModeType,
    from_location: '',
    to_location: '',
    operator: '',
  });

  // Auto-populate booking link when vendor/airline name changes
  useEffect(() => {
    const nameToCheck = bookingType === 'flight' 
      ? (formData.airline || formData.vendor_name)
      : bookingType === 'car_rental'
      ? (formData.rental_company || formData.vendor_name)
      : formData.vendor_name;
    
    if (nameToCheck && !formData.link_url) {
      const url = getVendorUrl(nameToCheck, bookingType);
      if (url) {
        setFormData(prev => ({ ...prev, link_url: url }));
        setUrlAutoFilled(true);
      }
    }
  }, [formData.vendor_name, formData.airline, formData.rental_company, bookingType, formData.link_url]);

  const resetForm = () => {
    setFormData({
      vendor_name: '',
      start_datetime: '',
      end_datetime: '',
      address: '',
      confirmation_number: '',
      total_cost: '',
      my_share: '',
      link_url: '',
      notes: '',
      passenger_name: '',
      airline: '',
      tsa_precheck_number: '',
      frequent_flyer_number: '',
      stay_type: 'hotel',
      property_name: '',
      rental_company: '',
      transport_mode: 'train',
      from_location: '',
      to_location: '',
      operator: '',
      pickup_location: '',
      return_location: '',
    });
    setBookingType('flight');
    setUrlAutoFilled(false);
    setSelectedCompanions([]);
    setEditingBooking(null);
    // Reset parsing state
    setIsDragging(false);
    setIsParsing(false);
    setShowPasteInput(false);
    setPastedText('');
    // v2.1.3: Reset confidence indicators
    setParseSource(null);
    setTimeIsEstimated(false);
  };

  // Helper to validate parsed dates before applying to form
  const validateBookingDates = (startDatetime: string | null, endDatetime: string | null): { valid: boolean; startDt?: string; endDt?: string } => {
    if (!startDatetime) return { valid: true };
    
    const startDt = new Date(startDatetime).toISOString().slice(0, 16);
    const endDt = endDatetime ? new Date(endDatetime).toISOString().slice(0, 16) : '';
    
    // Check if end is before start (invalid)
    if (endDt && new Date(endDt) < new Date(startDt)) {
      return { valid: false };
    }
    
    return { valid: true, startDt, endDt };
  };

  // Helper to map booking type to expense category
  const getExpenseCategoryFromBookingType = (bookingType: string): 'transport' | 'parking' | 'activity' | 'other' => {
    switch (bookingType) {
      case 'flight':
      case 'car_rental':
        return 'transport';
      case 'parking':
        return 'parking';
      case 'activity':
        return 'activity';
      case 'stay':
      default:
        return 'other';
    }
  };

  // Helper to create expense from receipt-only data
  const createExpenseFromReceipt = async (parsed: {
    vendor_name?: string;
    total_cost?: number;
    receipt_date?: string;
    booking_type?: string;
  }) => {
    const category = getExpenseCategoryFromBookingType(parsed.booking_type || 'other');
    
    // Use receipt_date if available, otherwise use today's date
    const expenseDate = parsed.receipt_date || new Date().toISOString().split('T')[0];
    
    try {
      await createExpense.mutateAsync({
        trip_id: tripId,
        date: expenseDate,
        category,
        description: parsed.vendor_name || 'Receipt upload',
        amount: parsed.total_cost || 0,
        notes: `Created from receipt upload. Vendor: ${parsed.vendor_name || 'Unknown'}`,
      });
      return true;
    } catch (err) {
      console.error('Failed to create expense from receipt:', err);
      return false;
    }
  };

  // Shared parsing logic for both drag-drop and paste (mirrors Create Trip)
  // v2.1.3: Added source parameter for confidence indicators
  const parseBookingText = useCallback(async (text: string, source: ParseOrigin = 'pasted_text') => {
    if (!text.trim()) {
      toast.warning('Please paste your confirmation text first.');
      return;
    }

    setIsParsing(true);
    setParseSource(source);
    toast.info('Parsing booking confirmation...');

    try {
      const { data, error } = await supabase.functions.invoke('parse-booking', {
        body: { text, type: 'booking' },
      });

      // Handle network-level errors
      if (error) {
        console.error('Network error:', error);
        toast.error('Connection error. Please try again.');
        setIsParsing(false);
        return;
      }

      if (data?.success && data?.data) {
        const parsed = data.data;
        
        // Check if this is a receipt-only upload (no service dates)
        if (data.is_receipt_only === true) {
          // Create expense instead of booking
          const expenseCreated = await createExpenseFromReceipt(parsed);
          
          if (expenseCreated) {
            toast.info('Receipt processed successfully!', {
              description: `This was treated as a receipt only. $${parsed.total_cost?.toFixed(2) || '0.00'} expense created for ${parsed.vendor_name || 'Unknown vendor'}. No booking was added to your timeline. To add dates and timeline entries, please upload the full booking confirmation.`,
              duration: 8000,
            });
          } else {
            toast.warning('Could not create expense from receipt. Please add it manually in the Expenses tab.');
          }
          
          setPastedText('');
          setShowPasteInput(false);
          setDialogOpen(false);
          setIsParsing(false);
          return;
        }
        
        // Check if this is a parking confirmation - redirect to Parking tab
        if (parsed.booking_type === 'parking') {
          toast.info('This looks like a parking reservation. Please add it in the Parking tab.', {
            description: `${parsed.vendor_name || 'Parking'} - ${parsed.confirmation_number || ''}`,
            duration: 5000,
          });
          setPastedText('');
          setShowPasteInput(false);
          setDialogOpen(false);
          return;
        }
        
        // Validate dates before applying
        const dateValidation = validateBookingDates(parsed.start_datetime, parsed.end_datetime);
        
        // v2.1.30: Enhanced partial parsing feedback
        // Build a list of what was captured vs what's missing
        const capturedFields: string[] = [];
        const missingFields: string[] = [];
        
        if (parsed.vendor_name) capturedFields.push('vendor');
        else missingFields.push('vendor');
        
        if (parsed.confirmation_number) capturedFields.push('confirmation #');
        else missingFields.push('confirmation #');
        
        if (dateValidation.valid && dateValidation.startDt) capturedFields.push('dates');
        else missingFields.push('dates');
        
        if (parsed.total_cost) capturedFields.push('cost');
        else missingFields.push('cost');
        
        if (!dateValidation.valid) {
          // Dates are invalid (end before start) - don't auto-fill date fields
          const capturedText = capturedFields.length > 0 ? `Found: ${capturedFields.join(', ')}.` : '';
          const missingText = missingFields.length > 0 ? `Missing: ${missingFields.join(', ')}.` : '';
          
          toast.warning("We couldn't fully read this confirmation.", {
            description: `${capturedText} ${missingText} You can still add details manually.`,
            duration: 6000,
          });
          // Still fill other fields that are valid
          setBookingType(parsed.booking_type || 'flight');
          setFormData(prev => ({
            ...prev,
            vendor_name: parsed.vendor_name || '',
            // Leave dates empty for manual entry
            start_datetime: '',
            end_datetime: '',
            confirmation_number: parsed.confirmation_number || '',
            total_cost: parsed.total_cost?.toString() || '',
            address: parsed.address || '',
            airline: parsed.airline || '',
            passenger_name: parsed.passenger_name || '',
            property_name: parsed.property_name || '',
            stay_type: parsed.stay_type || 'hotel',
            rental_company: parsed.rental_company || '',
            pickup_location: parsed.pickup_location || '',
            return_location: parsed.return_location || '',
            notes: parsed.notes || '',
          }));
          setPastedText('');
          setShowPasteInput(false);
          return;
        }
        
        setBookingType(parsed.booking_type || 'flight');
        setFormData(prev => ({
          ...prev,
          vendor_name: parsed.vendor_name || '',
          start_datetime: dateValidation.startDt || '',
          end_datetime: dateValidation.endDt || '',
          confirmation_number: parsed.confirmation_number || '',
          total_cost: parsed.total_cost?.toString() || '',
          address: parsed.address || '',
          airline: parsed.airline || '',
          passenger_name: parsed.passenger_name || '',
          property_name: parsed.property_name || '',
          stay_type: parsed.stay_type || 'hotel',
          rental_company: parsed.rental_company || '',
          pickup_location: parsed.pickup_location || '',
          return_location: parsed.return_location || '',
          notes: parsed.notes || '',
        }));
        // Clear paste input and collapse on success
        setPastedText('');
        setShowPasteInput(false);
        // v2.1.3: Check if time was estimated (defaulted or inferred)
        const hasExplicitTimeInfo = parsed.start_datetime && /T\d{2}:\d{2}/.test(parsed.start_datetime);
        setTimeIsEstimated(!hasExplicitTimeInfo);
        toast.success(data.message || 'Booking parsed! Review and save.', {
          description: 'You can edit times, names, or locations after import.',
          duration: 5000,
        });
      } else {
        // v2.1.30: Show clearer failure message with edit CTA
        toast.warning("We couldn't fully read this confirmation.", {
          description: "You can still add details manually.",
          duration: 5000,
        });
      }
    } catch (err) {
      console.error('Parse error:', err);
      toast.error('Something went wrong. Please enter details manually.');
    } finally {
      setIsParsing(false);
    }
  }, [tripId, createExpense]);

  // Drag-and-drop handlers (mirrors Create Trip)
  const handleDialogDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDialogDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDialogDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // v2.1.2: Check for email files (.eml, .msg) first
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      if (isEmailFile(file.name)) {
        // Extract email body from .eml/.msg file
        setIsParsing(true);
        toast.info('Extracting email content...');
        
        const result = await extractEmailBody(file);
        
        if (!result.success) {
          setIsParsing(false);
          toast.warning(result.error || "This email format couldn't be read automatically. Please open it and copy/paste the confirmation text instead.");
          return;
        }
        
        // Parse the extracted email body text with 'email' source
        await parseBookingText(result.body, 'email');
        return;
      }
      
      // For non-email files, try to read as text
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const text = event.target?.result as string;
          if (text) {
            await parseBookingText(text, 'pasted_text');
          }
        };
        reader.readAsText(file);
        return;
      }
    }

    // Fallback: try to get plain text from drag data
    const text = e.dataTransfer.getData('text/plain');
    if (!text) {
      toast.info('No text content found. Please drag and drop text from your confirmation email, or drop an email file (.eml, .msg).');
      return;
    }

    await parseBookingText(text, 'pasted_text');
  }, [parseBookingText]);

  // Paste handlers (mirrors Create Trip)
  const handlePasteAndScan = useCallback(async () => {
    setParseSource('pasted_text');
    await parseBookingText(pastedText, 'pasted_text');
  }, [pastedText, parseBookingText]);

  const openEditDialog = (booking: Booking) => {
    setEditingBooking(booking);
    setBookingType(booking.booking_type);
    setFormData({
      vendor_name: booking.vendor_name || '',
      start_datetime: booking.start_datetime ? new Date(booking.start_datetime).toISOString().slice(0, 16) : '',
      end_datetime: booking.end_datetime ? new Date(booking.end_datetime).toISOString().slice(0, 16) : '',
      address: booking.address || '',
      confirmation_number: booking.confirmation_number || '',
      total_cost: booking.total_cost?.toString() || '',
      my_share: booking.my_share?.toString() || '',
      link_url: booking.link_url || '',
      notes: booking.notes || '',
      passenger_name: booking.passenger_name || '',
      airline: booking.airline || '',
      tsa_precheck_number: booking.tsa_precheck_number || '',
      frequent_flyer_number: booking.frequent_flyer_number || '',
      stay_type: (booking.stay_type as StayType) || 'hotel',
      property_name: booking.property_name || '',
      rental_company: booking.rental_company || '',
      pickup_location: booking.pickup_location || '',
      return_location: booking.return_location || '',
      transport_mode: (booking as any).transport_mode || 'train',
      from_location: (booking as any).from_location || '',
      to_location: (booking as any).to_location || '',
      operator: (booking as any).operator || '',
    });
    // Load existing companions for this booking
    const existingCompanionIds = bookingCompanions
      .filter(bc => bc.booking_id === booking.id)
      .map(bc => bc.companion_id);
    setSelectedCompanions(existingCompanionIds);
    setDialogOpen(true);
  };

  // Actual save logic (called after validation or confirmation)
  const performSubmit = async () => {
    const bookingData = {
      booking_type: bookingType,
      vendor_name: formData.vendor_name,
      start_datetime: new Date(formData.start_datetime).toISOString(),
      end_datetime: formData.end_datetime ? new Date(formData.end_datetime).toISOString() : null,
      address: formData.address || null,
      confirmation_number: formData.confirmation_number || null,
      total_cost: formData.total_cost ? parseFloat(formData.total_cost) : 0,
      my_share: formData.my_share ? parseFloat(formData.my_share) : 0,
      link_url: formData.link_url || null,
      notes: formData.notes || null,
      passenger_name: formData.passenger_name || null,
      airline: formData.airline || null,
      tsa_precheck_number: formData.tsa_precheck_number || null,
      frequent_flyer_number: formData.frequent_flyer_number || null,
      stay_type: bookingType === 'stay' ? formData.stay_type : null,
      property_name: formData.property_name || null,
      rental_company: formData.rental_company || null,
      pickup_location: formData.pickup_location || null,
      return_location: formData.return_location || null,
      // Transport-specific fields
      transport_mode: bookingType === 'transport' ? formData.transport_mode : null,
      from_location: bookingType === 'transport' ? (formData.from_location || null) : null,
      to_location: bookingType === 'transport' ? (formData.to_location || null) : null,
      operator: bookingType === 'transport' ? (formData.operator || null) : null,
    };

    if (editingBooking) {
      // Update existing booking
      await updateBooking.mutateAsync({
        id: editingBooking.id,
        trip_id: tripId,
        ...bookingData,
      });

      // Update companions
      await setBookingCompanions.mutateAsync({
        bookingId: editingBooking.id,
        companionIds: selectedCompanions,
        tripId,
      });
    } else {
      // Create new booking
      const newBooking = await createBooking.mutateAsync({
        trip_id: tripId,
        ...bookingData,
      });

      // Link selected companions to the new booking
      if (newBooking && selectedCompanions.length > 0) {
        await setBookingCompanions.mutateAsync({
          bookingId: newBooking.id,
          companionIds: selectedCompanions,
          tripId,
        });
      }
      
      // If this is a new flight booking, sync trip dates
      // The useTripDateSync hook will handle this automatically when bookings change,
      // but we can also trigger it explicitly here for immediate feedback
      if (bookingType === 'flight') {
        // The hook will detect the new booking and update dates if needed
        // Give a small delay for the query to refresh, then sync
        setTimeout(() => {
          syncTripDates();
        }, 500);
      }
    }
    
    resetForm();
    setDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validate start/end date order
    if (formData.start_datetime && formData.end_datetime) {
      const startDt = new Date(formData.start_datetime);
      const endDt = new Date(formData.end_datetime);
      
      if (endDt < startDt) {
        toast.error('End date/time cannot be before start date/time. Please correct the dates.');
        return;
      }
    }
    
    // 2. Check if booking dates fall outside trip dates (warning, not blocking)
    if (trip && formData.start_datetime) {
      const tripStart = startOfDay(parseISO(trip.start_date));
      const tripEnd = startOfDay(parseISO(trip.end_date));
      const bookingStart = startOfDay(new Date(formData.start_datetime));
      const bookingEnd = formData.end_datetime 
        ? startOfDay(new Date(formData.end_datetime)) 
        : bookingStart;
      
      const isOutsideTripDates = isBefore(bookingStart, tripStart) || 
                                  isAfter(bookingEnd, tripEnd) ||
                                  isBefore(bookingEnd, tripStart) ||
                                  isAfter(bookingStart, tripEnd);
      
      if (isOutsideTripDates) {
        // Show warning dialog instead of blocking
        setDateWarningMessage(
          `These booking dates (${format(bookingStart, 'MMM d')}${formData.end_datetime ? ` - ${format(bookingEnd, 'MMM d')}` : ''}) are outside the current trip dates (${format(tripStart, 'MMM d')} - ${format(tripEnd, 'MMM d')}). Are you sure this booking belongs to this trip?`
        );
        setPendingSubmit(true);
        setShowDateWarning(true);
        return;
      }
    }
    
    // All validations passed, proceed with save
    await performSubmit();
  };
  
  // Handler for confirming save despite date warning
  const handleConfirmDateWarning = async () => {
    setShowDateWarning(false);
    setPendingSubmit(false);
    await performSubmit();
  };
  
  const handleCancelDateWarning = () => {
    setShowDateWarning(false);
    setPendingSubmit(false);
  };

  // Helper to get companions for a specific booking
  const getCompanionsForBooking = (bookingId: string): Companion[] => {
    const linkedIds = bookingCompanions
      .filter(bc => bc.booking_id === bookingId)
      .map(bc => bc.companion_id);
    return companions.filter(c => linkedIds.includes(c.id));
  };

  const toggleCompanion = (companionId: string) => {
    setSelectedCompanions(prev => 
      prev.includes(companionId)
        ? prev.filter(id => id !== companionId)
        : [...prev, companionId]
    );
  };

  const handleDelete = () => {
    if (bookingToDelete) {
      deleteBooking.mutate({ id: bookingToDelete, trip_id: tripId });
      setBookingToDelete(null);
    }
  };

  const handleVendorChange = (value: string, field: 'vendor_name' | 'airline' | 'rental_company') => {
    // Clear auto-filled URL when user changes vendor
    if (urlAutoFilled) {
      setFormData(prev => ({ ...prev, [field]: value, link_url: '' }));
      setUrlAutoFilled(false);
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const getBookingIcon = (type: string, transportMode?: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-5 h-5" />;
      case 'stay': return <Building2 className="w-5 h-5" />;
      case 'car_rental': return <Car className="w-5 h-5" />;
      case 'transport':
        switch (transportMode) {
          case 'train': return <TrainFront className="w-5 h-5" />;
          case 'bus': return <Bus className="w-5 h-5" />;
          case 'metro': return <TramFront className="w-5 h-5" />;
          case 'ferry': return <Ship className="w-5 h-5" />;
          default: return <TrainFront className="w-5 h-5" />;
        }
      case 'activity': return <Compass className="w-5 h-5" />;
      default: return <PartyPopper className="w-5 h-5" />;
    }
  };

  const getBookingColor = (type: string) => {
    switch (type) {
      case 'flight': return 'bg-sky-500/10 text-sky-600';
      case 'stay': return 'bg-purple-500/10 text-purple-600';
      case 'car_rental': return 'bg-amber-500/10 text-amber-600';
      case 'transport': return 'bg-teal-500/10 text-teal-600';
      case 'activity': return 'bg-rose-500/10 text-rose-600';
      default: return 'bg-rose-500/10 text-rose-600';
    }
  };

  const openInMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
  };

  // Legacy handler for external drop zone (outside dialog)
  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      // Open dialog and trigger parsing
      setDialogOpen(true);
      // Small delay to ensure dialog is open before parsing
      setTimeout(() => parseBookingText(text), 100);
    } else {
      toast.info('Drop email/confirmation text to auto-fill booking details.');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header v1.3.2 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Bookings</h3>
          <p className="text-sm text-muted-foreground">
            {bookings.length === 0 
              ? 'Add flights, stays, transport, car rentals & activities' 
              : `${bookings.length} booking${bookings.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        {canEdit && (
          <Button onClick={() => setDialogOpen(true)} className="bg-gradient-ocean hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Add Booking
          </Button>
        )}
      </div>

      {/* Bookings Grid */}
      {bookings.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {bookings.map((booking: Booking) => (
            <Card 
              key={booking.id} 
              ref={(el) => {
                if (el) cardRefs.current.set(booking.id, el);
              }}
              className={cn(
                "group hover:shadow-md transition-all overflow-hidden",
                highlightedId === booking.id && "ring-2 ring-primary ring-offset-2 shadow-lg"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getBookingColor(booking.booking_type)}`}>
                      {getBookingIcon(booking.booking_type, (booking as any).transport_mode)}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">
                        {booking.booking_type === 'flight' ? booking.airline || booking.vendor_name :
                         booking.booking_type === 'stay' ? booking.property_name || booking.vendor_name :
                         booking.booking_type === 'car_rental' ? booking.rental_company || booking.vendor_name :
                         booking.booking_type === 'transport' ? ((booking as any).operator || booking.vendor_name) :
                         booking.vendor_name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {booking.booking_type === 'transport' ? (
                          <span className="capitalize">{((booking as any).transport_mode || 'transport').replace('_', ' ')}</span>
                        ) : (
                          <span className="capitalize">{booking.booking_type.replace('_', ' ')}</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => openEditDialog(booking)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive transition-opacity"
                        onClick={() => setBookingToDelete(booking.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {/* Transport-specific: From → To display */}
                {booking.booking_type === 'transport' && ((booking as any).from_location || (booking as any).to_location) && (
                  <div className="text-xs">
                    <span className="text-muted-foreground block">Route</span>
                    <span className="font-medium">
                      {(booking as any).from_location || '—'} → {(booking as any).to_location || '—'}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">
                      {booking.booking_type === 'transport' ? 'Departure' : 'Date/Time'}
                    </span>
                    {/* v2.2.0: Use safe datetime parsing to preserve original dates */}
                    {(() => {
                      const startDate = parseDatetimeForDisplay(booking.start_datetime);
                      return startDate ? (
                        <span className="font-medium">
                          {format(startDate, 'MMM d')},{' '}
                          {hasExplicitTime(booking.start_datetime) ? (
                            format(startDate, 'h:mm a')
                          ) : (
                            <span className="text-destructive">{UNKNOWN_TIME_PLACEHOLDER}</span>
                          )}
                        </span>
                      ) : <span className="text-muted-foreground">--</span>;
                    })()}
                  </div>
                  {/* Transport: show arrival time if available */}
                  {booking.booking_type === 'transport' && booking.end_datetime && (
                    <div>
                      <span className="text-muted-foreground block">Arrival</span>
                      {(() => {
                        const endDate = parseDatetimeForDisplay(booking.end_datetime);
                        return endDate ? (
                          <span className="font-medium">
                            {format(endDate, 'MMM d')},{' '}
                            {hasExplicitTime(booking.end_datetime) ? (
                              format(endDate, 'h:mm a')
                            ) : (
                              <span className="text-destructive">{UNKNOWN_TIME_PLACEHOLDER}</span>
                            )}
                          </span>
                        ) : <span className="text-muted-foreground">--</span>;
                      })()}
                    </div>
                  )}
                  {booking.confirmation_number && booking.booking_type !== 'transport' && (
                    <div>
                      <span className="text-muted-foreground block">Confirmation</span>
                      <span className="font-mono font-medium">{booking.confirmation_number}</span>
                    </div>
                  )}
                </div>
                {/* Transport: show reference/ticket number separately */}
                {booking.booking_type === 'transport' && booking.confirmation_number && (
                  <div className="text-xs">
                    <span className="text-muted-foreground block">Reference / Ticket #</span>
                    <span className="font-mono font-medium">{booking.confirmation_number}</span>
                  </div>
                )}
                
                {(booking.total_cost > 0 || booking.my_share > 0) && (
                  <div className="flex gap-4 pt-2 border-t text-xs">
                    {booking.total_cost > 0 && (
                      <div>
                        <span className="text-muted-foreground">Total: </span>
                        <span className="font-medium">${booking.total_cost}</span>
                      </div>
                    )}
                    {booking.my_share > 0 && (
                      <div>
                        <span className="text-muted-foreground">My Share: </span>
                        <span className="font-medium text-primary">${booking.my_share}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Linked Companions */}
                {getCompanionsForBooking(booking.id).length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <Users className="w-3 h-3" />
                      Travelers
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {getCompanionsForBooking(booking.id).map((companion) => (
                        <Badge 
                          key={companion.id} 
                          variant="secondary" 
                          className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                          onClick={() => {
                            setSelectedCompanion(companion);
                            setCompanionDialogOpen(true);
                          }}
                        >
                          {companion.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity ticket status (v2.1.17 / v2.1.19 enhancements) */}
                {booking.booking_type === 'activity' && (
                  <div className="pt-2 border-t space-y-1.5">
                    {/* Ticket status row */}
                    {(booking.ticket_required || booking.advance_recommended) && (
                      <div className="flex items-center gap-2 flex-wrap">
                        {booking.tickets_purchased ? (
                          <>
                            <Badge variant="outline" className="gap-1 text-xs bg-accent">
                              <CheckCircle2 className="w-3 h-3 text-primary" />
                              Tickets purchased
                            </Badge>
                            {/* v2.1.19: Confirmation tip */}
                            <span className="text-xs text-muted-foreground">
                              Keep your confirmation email handy at check-in.
                            </span>
                          </>
                        ) : canEdit ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => markTicketsPurchased.mutate({ bookingId: booking.id, tripId })}
                            disabled={markTicketsPurchased.isPending}
                          >
                            <Ticket className="w-3 h-3" />
                            Mark tickets purchased
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="gap-1 text-xs">
                            <Ticket className="w-3 h-3" />
                            Tickets needed
                          </Badge>
                        )}
                        {booking.booking_url && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1"
                            onClick={() => openExternalUrl(booking.booking_url)}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Book
                          </Button>
                        )}
                      </div>
                    )}
                    {/* v2.1.19: Activity source label */}
                    {booking.activity_source && (
                      <p className="text-xs text-muted-foreground">
                        {booking.activity_source === 'explore' ? 'From Explore' : 
                         booking.activity_source === 'confirmation' ? 'From confirmation' : ''}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {booking.address && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openInMaps(booking.address!)}>
                      <MapPin className="w-3 h-3 mr-1" />
                      Maps
                    </Button>
                  )}
                  {booking.link_url && (
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openExternalUrl(booking.link_url)}>
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card 
          className="border-dashed"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plane className="w-8 h-8 text-primary" />
            </div>
            <h4 className="text-lg font-medium mb-1">No bookings yet</h4>
            <p className="text-muted-foreground text-sm text-center max-w-sm mb-4">
              Add your flights, stays, trains, buses, car rentals, and activities
            </p>
            <div className="flex gap-2">
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Booking
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              <FileText className="w-3 h-3 inline mr-1" />
              Drag & drop email/PDF parsing coming soon
            </p>
          </CardContent>
        </Card>
      )}

      {/* Add Booking Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBooking ? 'Edit Booking' : 'Add Booking'}</DialogTitle>
            <DialogDescription>
              {editingBooking 
                ? 'Update booking details and linked travelers' 
                : 'Drag & drop or paste confirmation text, or fill in manually'}
            </DialogDescription>
          </DialogHeader>

          {/* Parsing Zone - Only show for new bookings (mirrors Create Trip) */}
          {!editingBooking && (
            <div className="space-y-3">
              {/* Drop Zone - Desktop optimized */}
              <div
                ref={dropZoneRef}
                onDragOver={handleDialogDragOver}
                onDragLeave={handleDialogDragLeave}
                onDrop={handleDialogDrop}
                className={cn(
                  'relative border-2 border-dashed rounded-lg p-4 transition-all duration-200 text-center hidden sm:block',
                  isDragging 
                    ? 'border-primary bg-primary/5 scale-[1.02]' 
                    : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                  isParsing && 'pointer-events-none opacity-60'
                )}
              >
                {isParsing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Parsing...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className={cn(
                      "w-6 h-6 transition-colors",
                      isDragging ? "text-primary" : "text-muted-foreground"
                    )} />
                    <p className="text-sm font-medium">
                      {isDragging ? 'Drop to parse!' : 'Drag & drop confirmation'}
                    </p>
                  </div>
                )}
              </div>

              {/* Paste Button - Always visible, mobile-first */}
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

              {/* Paste Input Area */}
              {showPasteInput && (
                <div className="space-y-2">
                  <Textarea
                    ref={textareaRef}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Paste your booking confirmation or email text here..."
                    className="min-h-[100px] text-base"
                    autoFocus
                    disabled={isParsing}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="default"
                      className="flex-1 flex items-center justify-center gap-2"
                      onClick={handlePasteAndScan}
                      disabled={isParsing || !pastedText.trim()}
                    >
                      {isParsing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Scan className="w-4 h-4" />
                      )}
                      <span>{isParsing ? 'Parsing...' : 'Scan & Fill'}</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => { setShowPasteInput(false); setPastedText(''); }}
                      disabled={isParsing}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* v2.1.3: Parsed-from indicator */}
              {parseSource && formData.vendor_name && !showPasteInput && !isParsing && (
                <ParseOriginHint origin={parseSource} />
              )}

              {/* Patch 2.6.7: Contextual education for parsed data review */}
              {formData.vendor_name && !showPasteInput && !isParsing && (
                <ManualStepHint message={MANUAL_STEP_HINTS.parsedDataReview} className="mb-2" />
              )}

              {/* Separator between parsing and manual entry */}
              {!showPasteInput && !isParsing && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or enter manually</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Booking Type</Label>
              <Select value={bookingType} onValueChange={(v: BookingType) => { setBookingType(v); setFormData(prev => ({ ...prev, link_url: '' })); setUrlAutoFilled(false); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flight">✈️ Flight</SelectItem>
                  <SelectItem value="stay">🏨 Stay</SelectItem>
                  <SelectItem value="car_rental">🚗 Car Rental</SelectItem>
                  <SelectItem value="transport">🚆 Transport</SelectItem>
                  <SelectItem value="activity">🎉 Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Common fields */}
            <div className="space-y-2">
              <Label>Vendor Name *</Label>
              <Input
                value={formData.vendor_name}
                onChange={(e) => handleVendorChange(e.target.value, 'vendor_name')}
                placeholder={bookingType === 'flight' ? 'Airline name' : 'Vendor name'}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  Start Date/Time *
                  {/* v2.1.3: Time confidence hint */}
                  {timeIsEstimated && parseSource && formData.start_datetime && (
                    <span className="text-xs text-muted-foreground font-normal">(estimated)</span>
                  )}
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.start_datetime}
                  onChange={(e) => { setFormData({ ...formData, start_datetime: e.target.value }); setTimeIsEstimated(false); }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  End Date/Time
                  {/* v2.1.3: Time confidence hint */}
                  {timeIsEstimated && parseSource && formData.end_datetime && (
                    <span className="text-xs text-muted-foreground font-normal">(estimated)</span>
                  )}
                </Label>
                <Input
                  type="datetime-local"
                  value={formData.end_datetime}
                  onChange={(e) => { setFormData({ ...formData, end_datetime: e.target.value }); setTimeIsEstimated(false); }}
                />
              </div>
            </div>

            {/* Type-specific fields */}
            {bookingType === 'flight' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Airline</Label>
                    <Input
                      value={formData.airline}
                      onChange={(e) => handleVendorChange(e.target.value, 'airline')}
                      placeholder="United, Delta, etc."
                    />
                    {urlAutoFilled && formData.airline && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <Link2 className="w-3 h-3" /> Website auto-filled
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Passenger Name</Label>
                    <Input
                      value={formData.passenger_name}
                      onChange={(e) => setFormData({ ...formData, passenger_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>TSA PreCheck #</Label>
                    <Input
                      value={formData.tsa_precheck_number}
                      onChange={(e) => setFormData({ ...formData, tsa_precheck_number: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Frequent Flyer #</Label>
                    <Input
                      value={formData.frequent_flyer_number}
                      onChange={(e) => setFormData({ ...formData, frequent_flyer_number: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            {bookingType === 'stay' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Stay Type</Label>
                    <Select value={formData.stay_type} onValueChange={(v: StayType) => setFormData({ ...formData, stay_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hotel">Hotel</SelectItem>
                        <SelectItem value="airbnb">Airbnb</SelectItem>
                        <SelectItem value="vrbo">Vrbo</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Property Name</Label>
                    <Input
                      value={formData.property_name}
                      onChange={(e) => setFormData({ ...formData, property_name: e.target.value })}
                      placeholder="Marriott Downtown"
                    />
                  </div>
                </div>
              </>
            )}

            {bookingType === 'car_rental' && (
              <>
                <div className="space-y-2">
                  <Label>Rental Company</Label>
                  <Input
                    value={formData.rental_company}
                    onChange={(e) => handleVendorChange(e.target.value, 'rental_company')}
                    placeholder="Enterprise, Hertz, etc."
                  />
                  {urlAutoFilled && formData.rental_company && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Link2 className="w-3 h-3" /> Website auto-filled
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pickup Location</Label>
                    <Input
                      value={formData.pickup_location}
                      onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Return Location</Label>
                    <Input
                      value={formData.return_location}
                      onChange={(e) => setFormData({ ...formData, return_location: e.target.value })}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Transport-specific fields */}
            {bookingType === 'transport' && (
              <>
                <div className="space-y-2">
                  <Label>Transport Mode *</Label>
                  <Select value={formData.transport_mode} onValueChange={(v: TransportModeType) => setFormData({ ...formData, transport_mode: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="train">🚆 Train</SelectItem>
                      <SelectItem value="bus">🚌 Bus</SelectItem>
                      <SelectItem value="metro">🚇 Metro / Tram</SelectItem>
                      <SelectItem value="ferry">🚢 Ferry</SelectItem>
                      <SelectItem value="other">🚗 Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>From</Label>
                    <Input
                      value={formData.from_location}
                      onChange={(e) => setFormData({ ...formData, from_location: e.target.value })}
                      placeholder="City, station, port..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>To</Label>
                    <Input
                      value={formData.to_location}
                      onChange={(e) => setFormData({ ...formData, to_location: e.target.value })}
                      placeholder="City, station, port..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Operator</Label>
                  <Input
                    value={formData.operator}
                    onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                    placeholder="e.g., SNCB, Eurostar, Deutsche Bahn"
                  />
                </div>
              </>
            )}

            {/* More common fields */}
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Confirmation #</Label>
                <Input
                  value={formData.confirmation_number}
                  onChange={(e) => setFormData({ ...formData, confirmation_number: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Booking Link</Label>
                <div className="relative">
                  <Input
                    type="url"
                    value={formData.link_url}
                    onChange={(e) => { setFormData({ ...formData, link_url: e.target.value }); setUrlAutoFilled(false); }}
                    placeholder="https://..."
                    className={urlAutoFilled ? 'pr-8 border-green-300' : ''}
                  />
                  {urlAutoFilled && (
                    <Link2 className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-600" />
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Total Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.total_cost}
                  onChange={(e) => setFormData({ ...formData, total_cost: e.target.value })}
                  placeholder="0.00"
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

            {/* Companion Selection */}
            {companions.length > 0 && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Who's on this booking?
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {companions.map((companion) => (
                    <div
                      key={companion.id}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`companion-${companion.id}`}
                        checked={selectedCompanions.includes(companion.id)}
                        onCheckedChange={() => toggleCompanion(companion.id)}
                      />
                      <label
                        htmlFor={`companion-${companion.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {companion.name}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select travelers to link them to this booking
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            {/* Upload placeholder */}
            <div 
              className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
            >
              <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Drag & drop confirmation email/PDF
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Coming soon - auto-parse booking details
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-gradient-ocean hover:opacity-90" 
                disabled={createBooking.isPending || updateBooking.isPending}
              >
                {createBooking.isPending || updateBooking.isPending 
                  ? (editingBooking ? 'Saving...' : 'Adding...') 
                  : (editingBooking ? 'Save Changes' : 'Add Booking')
                }
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!bookingToDelete} onOpenChange={() => setBookingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Booking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this booking? This action cannot be undone.
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

      {/* Date Warning Dialog - booking dates outside trip range */}
      <AlertDialog open={showDateWarning} onOpenChange={setShowDateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Booking Dates Outside Trip Range
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dateWarningMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDateWarning}>Review Dates</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDateWarning}>
              Save Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Companion Detail Dialog */}
      <CompanionDetailDialog
        companion={selectedCompanion}
        trip={trip || null}
        open={companionDialogOpen}
        onOpenChange={setCompanionDialogOpen}
        canEdit={canEdit}
      />
    </div>
  );
}
