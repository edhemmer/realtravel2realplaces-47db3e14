/**
 * TourTab - Business-tier Stops UI
 * 
 * v2.1.25: MANUAL STOPS ONLY
 * - Tours are NO LONGER auto-generated from Bookings
 * - All stops must be manually added by the user
 * - Removed: "Generate from bookings", "Regenerate from bookings" actions
 * - Removed: Auto-draft useEffect and related logic
 * - Removed: "From flight/stay" source hints
 * 
 * v2.1.23: Tour/Booking Separation Enforcement
 * - Tour stops are non-monetary, independent records
 * - Tours have NO cost fields and are NEVER used in cost calculations
 * 
 * v2.0.9: Bulk stop ingestion + Google Maps integration
 * 
 * Allows Business users to add, view, and edit Stops (work locations) on a trip.
 * Stops are distinct from Stays (lodging) and represent places where work is done.
 */

import { useState, useCallback } from 'react';
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
import { Plus, MapPin, Clock, Trash2, Pencil, X, Info, ListPlus, Navigation } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useTripPermission } from '@/pages/TripDetail';
import { BulkStopsDialog } from '@/components/trips/BulkStopsDialog';
import { Trip } from '@/types/database';

/**
 * v2.1.25: TourTab is now manual-only
 * Tours are NEVER auto-generated from Bookings
 */
interface TourTabProps {
  tripId: string;
  trip?: Trip;
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

export function TourTab({ tripId, trip }: TourTabProps) {
  const { canEdit } = useTripPermission();
  const { data: stops = [], isLoading } = useEngagements(tripId);
  const createStop = useCreateEngagement();
  const updateStop = useUpdateEngagement();
  const deleteStop = useDeleteEngagement();

  // v2.1.25: Removed booking/expense/parking fetching - Tours are manual only
  // No auto-generation from bookings

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<Engagement | null>(null);
  const [stopToDelete, setStopToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<StopFormData>(EMPTY_FORM);

  // Default date for bulk stops (trip start date or today)
  const defaultBulkDate = trip?.start_date || format(new Date(), 'yyyy-MM-dd');

  // Helper message dismissal
  const [helperDismissed, setHelperDismissed] = useState(() => {
    return localStorage.getItem(HELPER_DISMISSED_KEY) === 'true';
  });

  // v2.1.25: Removed auto-draft logic - Tours are manual only

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

  // v2.1.25: Removed handleAutoDraft and handleRegenerate - Tours are manual only

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

  // v2.1.25: Removed getSourceIcon - Tours are manual only, no source hints

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
          {/* v2.1.25: Removed "Regenerate from bookings" - Tours are manual only */}
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
              Stops are work locations and scheduled meetings during your trip.
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Use the Bookings tab for lodging and Stays.
            </p>
            <div className="flex gap-2">
              {/* v2.1.25: Removed "Generate from bookings" - Tours are manual only */}
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
                      {/* v2.1.25: Removed source icons - Tours are manual only */}
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
                      {/* v2.1.25: Removed StopSourceHint - Tours are manual only */}
                    </div>
                    {stop.notes && (
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
