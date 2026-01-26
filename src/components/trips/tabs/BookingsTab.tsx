import { useState } from 'react';
import { useBookings, useCreateBooking, useDeleteBooking } from '@/hooks/useBookings';
import { Booking, BookingType, StayType } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  Plus, Plane, Building2, Car, PartyPopper, Trash2, 
  ExternalLink, MapPin, AlertTriangle 
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
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

interface BookingsTabProps {
  tripId: string;
}

export function BookingsTab({ tripId }: BookingsTabProps) {
  const { data: bookings = [], isLoading } = useBookings(tripId);
  const createBooking = useCreateBooking();
  const deleteBooking = useDeleteBooking();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>('flight');
  
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
  });

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
      pickup_location: '',
      return_location: '',
    });
    setBookingType('flight');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await createBooking.mutateAsync({
      trip_id: tripId,
      booking_type: bookingType,
      vendor_name: formData.vendor_name,
      start_datetime: new Date(formData.start_datetime).toISOString(),
      end_datetime: formData.end_datetime ? new Date(formData.end_datetime).toISOString() : undefined,
      address: formData.address || undefined,
      confirmation_number: formData.confirmation_number || undefined,
      total_cost: formData.total_cost ? parseFloat(formData.total_cost) : 0,
      my_share: formData.my_share ? parseFloat(formData.my_share) : 0,
      link_url: formData.link_url || undefined,
      notes: formData.notes || undefined,
      passenger_name: formData.passenger_name || undefined,
      airline: formData.airline || undefined,
      tsa_precheck_number: formData.tsa_precheck_number || undefined,
      frequent_flyer_number: formData.frequent_flyer_number || undefined,
      stay_type: bookingType === 'stay' ? formData.stay_type : undefined,
      property_name: formData.property_name || undefined,
      rental_company: formData.rental_company || undefined,
      pickup_location: formData.pickup_location || undefined,
      return_location: formData.return_location || undefined,
    });
    
    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (bookingToDelete) {
      deleteBooking.mutate({ id: bookingToDelete, trip_id: tripId });
      setBookingToDelete(null);
    }
  };

  const getBookingIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-5 h-5" />;
      case 'stay': return <Building2 className="w-5 h-5" />;
      case 'car_rental': return <Car className="w-5 h-5" />;
      default: return <PartyPopper className="w-5 h-5" />;
    }
  };

  const openInMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Bookings</h3>
        <Button onClick={() => setDialogOpen(true)} className="bg-gradient-ocean hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Add Booking
        </Button>
      </div>

      {bookings.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {bookings.map((booking: Booking) => (
            <Card key={booking.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {getBookingIcon(booking.booking_type)}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {booking.booking_type === 'flight' ? booking.airline || booking.vendor_name :
                         booking.booking_type === 'stay' ? booking.property_name || booking.vendor_name :
                         booking.vendor_name}
                      </CardTitle>
                      <CardDescription className="capitalize">{booking.booking_type.replace('_', ' ')}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setBookingToDelete(booking.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date/Time</span>
                  <span>{format(parseISO(booking.start_datetime), 'MMM d, yyyy h:mm a')}</span>
                </div>
                {booking.confirmation_number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confirmation</span>
                    <span className="font-mono">{booking.confirmation_number}</span>
                  </div>
                )}
                {booking.total_cost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cost</span>
                    <span>${booking.total_cost}</span>
                  </div>
                )}
                {booking.booking_type === 'flight' && !booking.tsa_precheck_number && (
                  <Badge variant="outline" className="text-warning border-warning">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Missing TSA PreCheck
                  </Badge>
                )}
                <div className="flex gap-2 pt-2">
                  {booking.address && (
                    <Button size="sm" variant="outline" onClick={() => openInMaps(booking.address!)}>
                      <MapPin className="w-3 h-3 mr-1" />
                      Maps
                    </Button>
                  )}
                  {booking.link_url && (
                    <Button size="sm" variant="outline" onClick={() => window.open(booking.link_url, '_blank')}>
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View Booking
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plane className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No bookings yet</p>
            <Button onClick={() => setDialogOpen(true)} variant="link" className="mt-2">
              Add your first booking
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Booking Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Booking</DialogTitle>
            <DialogDescription>Add a flight, stay, car rental, or activity</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Booking Type</Label>
              <Select value={bookingType} onValueChange={(v: BookingType) => setBookingType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flight">Flight</SelectItem>
                  <SelectItem value="stay">Stay</SelectItem>
                  <SelectItem value="car_rental">Car Rental</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Common fields */}
            <div className="space-y-2">
              <Label>Vendor Name *</Label>
              <Input
                value={formData.vendor_name}
                onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                placeholder={bookingType === 'flight' ? 'Airline name' : 'Vendor name'}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date/Time *</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_datetime}
                  onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End Date/Time</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_datetime}
                  onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                      placeholder="United Airlines"
                    />
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
                    onChange={(e) => setFormData({ ...formData, rental_company: e.target.value })}
                    placeholder="Enterprise"
                  />
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

            {/* More common fields */}
            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St, City, Country"
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
                <Input
                  type="url"
                  value={formData.link_url}
                  onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                  placeholder="https://..."
                />
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

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-ocean hover:opacity-90" disabled={createBooking.isPending}>
                {createBooking.isPending ? 'Adding...' : 'Add Booking'}
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
    </div>
  );
}
