/**
 * v3.10.4: Edit Trip Dates Dialog
 * 
 * Minimal dialog for correcting trip start/end dates.
 * Works on ANY trip state (active, locked, closed) via update_trip_dates RPC.
 * Reactivates trips when end_date is extended into today/future.
 */

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertTriangle } from 'lucide-react';
import { Trip, Booking } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useBookings } from '@/hooks/useBookings';

interface EditTripDatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: Trip;
}

export function EditTripDatesDialog({ open, onOpenChange, trip }: EditTripDatesDialogProps) {
  const [startDate, setStartDate] = useState(trip.start_date);
  const [endDate, setEndDate] = useState(trip.end_date);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const queryClient = useQueryClient();
  const { data: bookings = [] } = useBookings(trip.id);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setStartDate(trip.start_date);
      setEndDate(trip.end_date);
      setShowConfirm(false);
    }
  }, [open, trip.start_date, trip.end_date]);

  const validationError = useMemo(() => {
    if (!startDate || !endDate) return 'Both dates are required';
    if (endDate < startDate) return 'End date cannot be before start date';
    return null;
  }, [startDate, endDate]);

  // Check if any bookings/events fall outside the new date range
  const outOfRangeItems = useMemo(() => {
    if (!startDate || !endDate) return [];
    const items: string[] = [];
    bookings.forEach((b: Booking) => {
      const bStart = b.start_datetime?.substring(0, 10);
      const bEnd = b.end_datetime?.substring(0, 10);
      if ((bStart && bStart < startDate) || (bEnd && bEnd > endDate) || (bStart && bStart > endDate)) {
        items.push(`${b.vendor_name} (${b.booking_type})`);
      }
    });
    return items;
  }, [startDate, endDate, bookings]);

  const handleSave = async () => {
    // If there are out-of-range items and user hasn't confirmed yet, show warning
    if (outOfRangeItems.length > 0 && !showConfirm) {
      setShowConfirm(true);
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await (supabase.rpc as any)('update_trip_dates', {
        p_trip_id: trip.id,
        p_start_date: startDate,
        p_end_date: endDate,
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success === false) {
        toast.error(result.message || 'Failed to update dates');
        return;
      }

      // Invalidate all trip-related queries for immediate UI update
      queryClient.invalidateQueries({ queryKey: ['trip', trip.id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });

      const newState = result?.new_state;
      if (newState === 'active' && trip.trip_state !== 'active') {
        toast.success('Trip dates updated — trip is now Active!');
      } else {
        toast.success('Trip dates updated successfully');
      }

      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update trip dates');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Edit Trip Dates</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="edit-start-date">Start Date</Label>
            <Input
              id="edit-start-date"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setShowConfirm(false);
              }}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-end-date">End Date</Label>
            <Input
              id="edit-end-date"
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setShowConfirm(false);
              }}
            />
          </div>

          {validationError && (
            <p className="text-sm text-destructive font-medium">{validationError}</p>
          )}

          {showConfirm && outOfRangeItems.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-300">
                    Some items fall outside your new trip dates
                  </p>
                  <p className="text-muted-foreground mt-1">
                    They will not be deleted. Press Save again to confirm.
                  </p>
                  <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                    {outOfRangeItems.slice(0, 5).map((item, i) => (
                      <li key={i}>• {item}</li>
                    ))}
                    {outOfRangeItems.length > 5 && (
                      <li>• ...and {outOfRangeItems.length - 5} more</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!!validationError || saving}
          >
            {saving ? 'Saving...' : showConfirm ? 'Confirm Save' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
