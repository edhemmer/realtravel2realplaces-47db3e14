import { FormEvent, useState } from 'react';
import { BedDouble, Plus } from 'lucide-react';
import { useCreateBooking } from '@/hooks/useBookings';
import { normalizeDatetimeForStorage } from '@/lib/datetimeIntegrity';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function GuestAddLodgingCard({ tripId }: { tripId: string }) {
  const createBooking = useCreateBooking();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [address, setAddress] = useState('');
  const [confirmation, setConfirmation] = useState('');

  const clear = () => {
    setName('');
    setCheckIn('');
    setCheckOut('');
    setAddress('');
    setConfirmation('');
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const start = normalizeDatetimeForStorage(checkIn);
    if (!name.trim() || !start) return;

    await createBooking.mutateAsync({
      trip_id: tripId,
      booking_type: 'stay',
      vendor_name: name.trim(),
      property_name: name.trim(),
      stay_type: 'hotel',
      start_datetime: start,
      end_datetime: normalizeDatetimeForStorage(checkOut),
      address: address.trim() || null,
      confirmation_number: confirmation.trim() || null,
    });

    clear();
    setOpen(false);
  };

  return (
    <>
      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold"><BedDouble className="h-4 w-4 text-primary" />Lodging access</p>
            <p className="mt-1 text-sm text-muted-foreground">You can add lodging. The trip owner manages existing reservations.</p>
          </div>
          <Button type="button" onClick={() => setOpen(true)} className="min-h-[44px] shrink-0"><Plus className="mr-2 h-4 w-4" />Add lodging</Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add lodging</DialogTitle><DialogDescription>Add confirmed stay details to the shared trip.</DialogDescription></DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="guest-stay-name">Property name *</Label><Input id="guest-stay-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={160} /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="guest-stay-in">Check-in *</Label><Input id="guest-stay-in" type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="guest-stay-out">Check-out</Label><Input id="guest-stay-out" type="datetime-local" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label htmlFor="guest-stay-address">Address</Label><Input id="guest-stay-address" value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} /></div>
            <div className="space-y-2"><Label htmlFor="guest-stay-confirmation">Confirmation number</Label><Input id="guest-stay-confirmation" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} maxLength={120} /></div>
            <div className="flex gap-3"><Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={createBooking.isPending}>Cancel</Button><Button type="submit" className="flex-1" disabled={createBooking.isPending || !name.trim() || !checkIn}>{createBooking.isPending ? 'Saving…' : 'Save lodging'}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
