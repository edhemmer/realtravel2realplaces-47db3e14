/**
 * EditImportDialog — Allows user to review and edit parsed fields
 * before filing an email import to a trip.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PendingImport } from '@/hooks/usePendingImports';
import type { Trip } from '@/types/database';

interface EditImportDialogProps {
  pending: PendingImport;
  trips: Trip[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFile: (importId: string, tripId: string, parsedData: Record<string, unknown>) => void;
}

export function EditImportDialog({ pending, trips, open, onOpenChange, onFile }: EditImportDialogProps) {
  const original = pending.parsed_data as Record<string, unknown>;

  const [vendorName, setVendorName] = useState((original.vendor_name as string) || '');
  const [bookingType, setBookingType] = useState((original.booking_type as string) || 'other');
  const [startDatetime, setStartDatetime] = useState((original.start_datetime as string)?.substring(0, 16) || '');
  const [endDatetime, setEndDatetime] = useState((original.end_datetime as string)?.substring(0, 16) || '');
  const [confirmationNumber, setConfirmationNumber] = useState((original.confirmation_number as string) || '');
  const [totalCost, setTotalCost] = useState(original.total_cost ? String(original.total_cost) : '');
  const [tripId, setTripId] = useState('');

  // Auto-match trip
  const startDate = startDatetime?.substring(0, 10);
  const matchingTrip = startDate
    ? trips.find((t) => t.start_date <= startDate && t.end_date >= startDate)
    : null;
  const effectiveTripId = tripId || matchingTrip?.id || '';

  const handleSave = () => {
    if (!effectiveTripId) return;
    const edited: Record<string, unknown> = {
      ...original,
      vendor_name: vendorName || 'Imported Booking',
      booking_type: bookingType,
      start_datetime: startDatetime ? startDatetime + ':00' : null,
      end_datetime: endDatetime ? endDatetime + ':00' : null,
      confirmation_number: confirmationNumber || null,
      total_cost: totalCost ? parseFloat(totalCost) : null,
    };
    onFile(pending.id, effectiveTripId, edited);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Import</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Booking Type</Label>
            <Select value={bookingType} onValueChange={setBookingType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="flight">Flight</SelectItem>
                <SelectItem value="stay">Lodging</SelectItem>
                <SelectItem value="car_rental">Car Rental</SelectItem>
                <SelectItem value="parking">Parking</SelectItem>
                <SelectItem value="activity">Activity</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Vendor / Airline</Label>
            <Input value={vendorName} onChange={(e) => setVendorName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Start Date/Time</Label>
              <Input type="datetime-local" value={startDatetime} onChange={(e) => setStartDatetime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End Date/Time</Label>
              <Input type="datetime-local" value={endDatetime} onChange={(e) => setEndDatetime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Confirmation #</Label>
              <Input value={confirmationNumber} onChange={(e) => setConfirmationNumber(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Total Cost</Label>
              <Input type="number" step="0.01" value={totalCost} onChange={(e) => setTotalCost(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Add to Trip</Label>
            <Select value={effectiveTripId} onValueChange={setTripId}>
              <SelectTrigger><SelectValue placeholder="Select a trip..." /></SelectTrigger>
              <SelectContent>
                {trips.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.destination_city})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="flex-1" disabled={!effectiveTripId || !vendorName} onClick={handleSave}>
            Add to Trip
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
