/**
 * TourTab - Business-tier Stops UI
 * 
 * Patch 2.6.25: Tour auto-draft from bookings
 * v2.0.9: Bulk stop ingestion + Google Maps integration
 * 
 * Allows Business users to add, view, and edit Stops (work locations) on a trip.
 * Stops are distinct from Stays (lodging) and represent places where work is done.
 * 
 * Auto-draft: When a Business user opens Tour for the first time with no stops,
 * the system auto-generates draft stops from existing bookings (flights, stays, rentals).
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useEngagements, useCreateEngagement, useUpdateEngagement, useDeleteEngagement, Engagement } from '@/hooks/useEngagements';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, MapPin, Clock, Trash2, Pencil, X, Info, RefreshCw, Plane, Building2, Car, ListPlus, Navigation } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useTripPermission } from '@/pages/TripDetail';
import { ManualStepHint } from '@/components/trips/ManualStepHint';
import { BulkStopsDialog } from '@/components/trips/BulkStopsDialog';
import { Booking, Trip } from '@/types/database';
import { StopSourceHint, inferStopSource } from '@/components/trips/ParseHint';

interface TourTabProps {
  tripId: string;
  trip?: Trip;
  bookings?: Booking[];
}

interface StopFormData {
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
}

const EMPTY_FORM: StopFormData = {
  name: '',
  date: '',
  start_time: '',
  end_time: '',
  location: '',
  notes: '',
};

// Dismissible helper message key for localStorage
const HELPER_DISMISSED_KEY = 'rt2rp_stops_helper_dismissed';
// Track if auto-draft has been offered for this trip
const AUTO_DRAFT_OFFERED_PREFIX = 'rt2rp_tour_autodraft_offered_';

interface DraftStop {
  name: string;
  date: string;
  start_time: string;
  end_time: string | null;
  location: string;
  notes: string;
  source: 'flight' | 'stay' | 'rental';
}

/**
 * Generate draft stops from bookings data
 * Extracts airports from flights, locations from stays, and pickup/dropoff from rentals
 */
function generateDraftStops(bookings: Booking[]): DraftStop[] {
  const drafts: DraftStop[] = [];

  for (const booking of bookings) {
    const datetime = booking.start_datetime;
    const date = datetime.split('T')[0];
    const timePart = datetime.split('T')[1];
    const time = timePart ? timePart.slice(0, 5) + ':00' : '09:00:00';

    if (booking.booking_type === 'flight') {
      // Flight: Extract departure airport
      if (booking.from_location) {
        drafts.push({
          name: `Depart from ${booking.from_location}`,
          date,
          start_time: time,
          end_time: null,
          location: booking.from_location,
          notes: `Auto-drafted from ${booking.vendor_name || 'flight booking'}`,
          source: 'flight',
        });
      }
      // Flight: Extract arrival airport (use end_datetime if available)
      if (booking.to_location) {
        const endDatetime = booking.end_datetime || booking.start_datetime;
        const arrivalDate = endDatetime.split('T')[0];
        const arrivalTimePart = endDatetime.split('T')[1];
        const arrivalTime = arrivalTimePart ? arrivalTimePart.slice(0, 5) + ':00' : '12:00:00';
        drafts.push({
          name: `Arrive at ${booking.to_location}`,
          date: arrivalDate,
          start_time: arrivalTime,
          end_time: null,
          location: booking.to_location,
          notes: `Auto-drafted from ${booking.vendor_name || 'flight booking'}`,
          source: 'flight',
        });
      }
    } else if (booking.booking_type === 'stay') {
      // Stay: Lodging check-in location
      const location = booking.property_name || booking.address || booking.location_summary || 'Lodging';
      drafts.push({
        name: `Check in: ${location}`,
        date,
        start_time: '15:00:00', // Standard check-in time
        end_time: null,
        location: booking.address || location,
        notes: `Auto-drafted from ${booking.vendor_name || 'stay booking'}`,
        source: 'stay',
      });
      // Checkout
      if (booking.end_datetime) {
        const checkoutDate = booking.end_datetime.split('T')[0];
        drafts.push({
          name: `Check out: ${location}`,
          date: checkoutDate,
          start_time: '11:00:00', // Standard checkout time
          end_time: null,
          location: booking.address || location,
          notes: `Auto-drafted from ${booking.vendor_name || 'stay booking'}`,
          source: 'stay',
        });
      }
    } else if (booking.booking_type === 'car_rental') {
      // Rental: Pickup location
      const pickupLocation = booking.pickup_location || booking.from_location || 'Rental pickup';
      drafts.push({
        name: `Pickup: ${booking.rental_company || 'Car rental'}`,
        date,
        start_time: time,
        end_time: null,
        location: pickupLocation,
        notes: `Auto-drafted from ${booking.rental_company || booking.vendor_name || 'car rental'}`,
        source: 'rental',
      });
      // Return location
      if (booking.end_datetime) {
        const returnDate = booking.end_datetime.split('T')[0];
        const returnTimePart = booking.end_datetime.split('T')[1];
        const returnTime = returnTimePart ? returnTimePart.slice(0, 5) + ':00' : '12:00:00';
        const returnLocation = booking.return_location || booking.to_location || pickupLocation;
        drafts.push({
          name: `Return: ${booking.rental_company || 'Car rental'}`,
          date: returnDate,
          start_time: returnTime,
          end_time: null,
          location: returnLocation,
          notes: `Auto-drafted from ${booking.rental_company || booking.vendor_name || 'car rental'}`,
          source: 'rental',
        });
      }
    }
  }

  // Sort by date and time
  drafts.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.start_time.localeCompare(b.start_time);
  });

  return drafts;
}

export function TourTab({ tripId, trip, bookings = [] }: TourTabProps) {
  const { canEdit } = useTripPermission();
  const { data: stops = [], isLoading } = useEngagements(tripId);
  const createStop = useCreateEngagement();
  const updateStop = useUpdateEngagement();
  const deleteStop = useDeleteEngagement();

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<Engagement | null>(null);
  const [stopToDelete, setStopToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<StopFormData>(EMPTY_FORM);

  // Auto-draft state
  const [isAutoDrafting, setIsAutoDrafting] = useState(false);
  const autoDraftKey = `${AUTO_DRAFT_OFFERED_PREFIX}${tripId}`;
  
  // Default date for bulk stops (trip start date or today)
  const defaultBulkDate = trip?.start_date || format(new Date(), 'yyyy-MM-dd');

  // Helper message dismissal
  const [helperDismissed, setHelperDismissed] = useState(() => {
    return localStorage.getItem(HELPER_DISMISSED_KEY) === 'true';
  });

  // Generate draft stops from bookings
  const draftStops = useMemo(() => generateDraftStops(bookings), [bookings]);
  const hasDraftableBookings = draftStops.length > 0;

  // Auto-draft on first visit with no stops
  useEffect(() => {
    const hasOfferedAutoDraft = localStorage.getItem(autoDraftKey) === 'true';
    
    if (
      !isLoading &&
      stops.length === 0 &&
      hasDraftableBookings &&
      canEdit &&
      !hasOfferedAutoDraft &&
      !isAutoDrafting
    ) {
      // Auto-generate stops on first visit
      handleAutoDraft();
      localStorage.setItem(autoDraftKey, 'true');
    }
  }, [isLoading, stops.length, hasDraftableBookings, canEdit, autoDraftKey, isAutoDrafting]);

  const dismissHelper = useCallback(() => {
    localStorage.setItem(HELPER_DISMISSED_KEY, 'true');
    setHelperDismissed(true);
  }, []);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingStop(null);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (stop: Engagement) => {
    setEditingStop(stop);
    setFormData({
      name: stop.name,
      date: stop.date,
      start_time: stop.start_time.slice(0, 5), // HH:MM format for input
      end_time: stop.end_time ? stop.end_time.slice(0, 5) : '',
      location: stop.location || '',
      notes: stop.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) {
      toast.error('Stop name is required');
      return;
    }
    if (!formData.date) {
      toast.error('Date is required');
      return;
    }
    if (!formData.start_time) {
      toast.error('Start time is required');
      return;
    }

    try {
      if (editingStop) {
        await updateStop.mutateAsync({
          id: editingStop.id,
          name: formData.name.trim(),
          date: formData.date,
          start_time: formData.start_time + ':00', // Add seconds
          end_time: formData.end_time ? formData.end_time + ':00' : null,
          location: formData.location.trim() || null,
          notes: formData.notes.trim() || null,
        });
        toast.success('Stop updated');
      } else {
        await createStop.mutateAsync({
          trip_id: tripId,
          name: formData.name.trim(),
          date: formData.date,
          start_time: formData.start_time + ':00', // Add seconds
          end_time: formData.end_time ? formData.end_time + ':00' : null,
          location: formData.location.trim() || null,
          notes: formData.notes.trim() || null,
        });
        toast.success('Stop added');
      }
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error saving stop:', error);
      toast.error('Failed to save stop');
    }
  };

  const handleDelete = async () => {
    if (!stopToDelete) return;

    try {
      await deleteStop.mutateAsync({ id: stopToDelete, tripId });
      toast.success('Stop deleted');
      setStopToDelete(null);
    } catch (error) {
      console.error('Error deleting stop:', error);
      toast.error('Failed to delete stop');
    }
  };

  // Auto-draft stops from bookings
  const handleAutoDraft = async () => {
    if (draftStops.length === 0) {
      toast.info('No bookings available to draft stops from');
      return;
    }

    setIsAutoDrafting(true);
    let successCount = 0;

    try {
      for (const draft of draftStops) {
        await createStop.mutateAsync({
          trip_id: tripId,
          name: draft.name,
          date: draft.date,
          start_time: draft.start_time,
          end_time: draft.end_time,
          location: draft.location || null,
          notes: draft.notes || null,
        });
        successCount++;
      }
      toast.success(`Generated ${successCount} stops from bookings`);
    } catch (error) {
      console.error('Error auto-drafting stops:', error);
      if (successCount > 0) {
        toast.warning(`Generated ${successCount} stops, but some failed`);
      } else {
        toast.error('Failed to generate stops');
      }
    } finally {
      setIsAutoDrafting(false);
    }
  };

  // Regenerate (clear existing and re-draft)
  const handleRegenerate = async () => {
    if (draftStops.length === 0) {
      toast.info('No bookings available to draft stops from');
      return;
    }

    // Delete existing stops first
    setIsAutoDrafting(true);
    try {
      for (const stop of stops) {
        await deleteStop.mutateAsync({ id: stop.id, tripId });
      }
      // Now create new drafts
      await handleAutoDraft();
    } catch (error) {
      console.error('Error regenerating stops:', error);
      toast.error('Failed to regenerate stops');
      setIsAutoDrafting(false);
    }
  };

  // Format time for display (HH:MM:SS -> h:mm a)
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0);
    return format(date, 'h:mm a');
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    return format(parseISO(dateStr), 'EEE, MMM d');
  };

  // v2.0.9: Open Google Maps directions to a location
  const openMapsDirections = (location: string) => {
    const encodedLocation = encodeURIComponent(location);
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodedLocation}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  // Get source icon for a stop
  const getSourceIcon = (notes: string | null) => {
    if (!notes) return null;
    if (notes.includes('flight')) return <Plane className="w-3.5 h-3.5 text-muted-foreground" />;
    if (notes.includes('stay')) return <Building2 className="w-3.5 h-3.5 text-muted-foreground" />;
    if (notes.includes('car rental') || notes.includes('rental')) return <Car className="w-3.5 h-3.5 text-muted-foreground" />;
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-semibold">Tour Stops</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Regenerate button - only show when there are bookings and existing stops */}
          {canEdit && hasDraftableBookings && stops.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleRegenerate}
              disabled={isAutoDrafting}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isAutoDrafting ? 'animate-spin' : ''}`} />
              Regenerate from bookings
            </Button>
          )}
          {/* v2.0.9: Bulk import button */}
          {canEdit && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setBulkDialogOpen(true)}
            >
              <ListPlus className="w-4 h-4 mr-2" />
              Bulk Add
            </Button>
          )}
          {canEdit && (
            <Button onClick={openAddDialog} className="bg-gradient-ocean hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" />
              Add Stop
            </Button>
          )}
        </div>
      </div>

      {/* Helper message - dismissible */}
      {!helperDismissed && (
        <Alert className="bg-muted/50 border-muted-foreground/20">
          <Info className="h-4 w-4" />
          <AlertDescription className="flex items-start justify-between gap-4">
            <div className="text-sm">
              <strong>Stops</strong> are places you go to do work.
              <br />
              Use <strong>Stays</strong> for hotels and lodging.
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={dismissHelper}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Stops list */}
      {stops.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <MapPin className="h-7 w-7 text-primary" />
            </div>
            <h4 className="text-base font-medium mb-1">No stops added</h4>
            <p className="text-sm text-muted-foreground mb-2 max-w-sm">
              {hasDraftableBookings 
                ? 'Stops can be auto-generated from your bookings, or added manually.'
                : 'Stops are work locations and scheduled meetings during your trip.'}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Use the Bookings tab for lodging and Stays.
            </p>
            <div className="flex gap-2">
              {canEdit && hasDraftableBookings && (
                <Button 
                  variant="outline"
                  onClick={handleAutoDraft}
                  disabled={isAutoDrafting}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isAutoDrafting ? 'animate-spin' : ''}`} />
                  Generate from bookings
                </Button>
              )}
              {canEdit && (
                <Button onClick={openAddDialog} className="bg-gradient-ocean hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Stop
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {stops.map((stop) => (
            <Card 
              key={stop.id} 
              className="hover:shadow-sm transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getSourceIcon(stop.notes)}
                      <h4 className="font-medium truncate">{stop.name}</h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(stop.date)} at {formatTime(stop.start_time)}
                        {stop.end_time && ` – ${formatTime(stop.end_time)}`}
                      </span>
                      {stop.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span className="truncate max-w-[200px]">{stop.location}</span>
                        </span>
                      )}
                      {/* v2.1.3: Origin hint for non-manual stops */}
                      <StopSourceHint source={inferStopSource(stop.notes)} />
                    </div>
                    {stop.notes && !stop.notes.startsWith('Auto-drafted') && !stop.notes.toLowerCase().includes('imported') && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {stop.notes}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* v2.0.9: Maps directions button */}
                    {stop.location && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openMapsDirections(stop.location!)}
                        className="h-8 w-8 text-primary hover:text-primary"
                        title="Get directions"
                      >
                        <Navigation className="h-4 w-4" />
                        <span className="sr-only">Get directions to {stop.location}</span>
                      </Button>
                    )}
                    {canEdit && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(stop)}
                          className="h-8 w-8"
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit stop</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setStopToDelete(stop.id)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete stop</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingStop ? 'Edit Stop' : 'Add Stop'}</DialogTitle>
            <DialogDescription>
              {editingStop ? 'Update the details for this stop.' : 'Add a work location or scheduled meeting.'}
              <ManualStepHint 
                message="You add stops manually to ensure your schedule reflects your actual commitments." 
                className="mt-2" 
              />
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Stop name - required */}
            <div className="space-y-2">
              <Label htmlFor="name">Stop name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Client meeting, Office visit, etc."
              />
            </div>

            {/* Date - required */}
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            {/* Time row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start time *</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                />
              </div>
            </div>

            {/* Location - optional */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Address or city"
              />
            </div>

            {/* Notes - optional */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional details"
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createStop.isPending || updateStop.isPending}
                className="bg-gradient-ocean hover:opacity-90"
              >
                {createStop.isPending || updateStop.isPending ? 'Saving...' : editingStop ? 'Save Changes' : 'Add Stop'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* v2.0.9: Bulk Stops Dialog */}
      <BulkStopsDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        tripId={tripId}
        defaultDate={defaultBulkDate}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!stopToDelete} onOpenChange={(open) => !open && setStopToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Stop</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this stop? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
