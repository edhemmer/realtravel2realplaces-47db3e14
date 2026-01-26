import { useState, useEffect } from 'react';
import { useBookings, useCreateBooking, useUpdateBooking, useDeleteBooking } from '@/hooks/useBookings';
import { useCompanions } from '@/hooks/useCompanions';
import { useBookingCompanionsByTrip, useSetBookingCompanions } from '@/hooks/useBookingCompanions';
import { Booking, BookingType, StayType, Companion } from '@/types/database';
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
  ExternalLink, MapPin, AlertTriangle, Link2, Upload, FileText, Users
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
import { getVendorUrl } from '@/lib/vendorUrls';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTripPermission } from '@/pages/TripDetail';

interface BookingsTabProps {
  tripId: string;
}

export function BookingsTab({ tripId }: BookingsTabProps) {
  const { canEdit } = useTripPermission();
  const { data: bookings = [], isLoading } = useBookings(tripId);
  const { data: companions = [] } = useCompanions(tripId);
  const { data: bookingCompanions = [] } = useBookingCompanionsByTrip(tripId);
  const createBooking = useCreateBooking();
  const updateBooking = useUpdateBooking();
  const deleteBooking = useDeleteBooking();
  const setBookingCompanions = useSetBookingCompanions();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [bookingToDelete, setBookingToDelete] = useState<string | null>(null);
  const [bookingType, setBookingType] = useState<BookingType>('flight');
  const [urlAutoFilled, setUrlAutoFilled] = useState(false);
  const [selectedCompanions, setSelectedCompanions] = useState<string[]>([]);
  
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
      pickup_location: '',
      return_location: '',
    });
    setBookingType('flight');
    setUrlAutoFilled(false);
    setSelectedCompanions([]);
    setEditingBooking(null);
  };

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
    });
    // Load existing companions for this booking
    const existingCompanionIds = bookingCompanions
      .filter(bc => bc.booking_id === booking.id)
      .map(bc => bc.companion_id);
    setSelectedCompanions(existingCompanionIds);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
    }
    
    resetForm();
    setDialogOpen(false);
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

  const getBookingIcon = (type: string) => {
    switch (type) {
      case 'flight': return <Plane className="w-5 h-5" />;
      case 'stay': return <Building2 className="w-5 h-5" />;
      case 'car_rental': return <Car className="w-5 h-5" />;
      default: return <PartyPopper className="w-5 h-5" />;
    }
  };

  const getBookingColor = (type: string) => {
    switch (type) {
      case 'flight': return 'bg-sky-500/10 text-sky-600';
      case 'stay': return 'bg-purple-500/10 text-purple-600';
      case 'car_rental': return 'bg-amber-500/10 text-amber-600';
      default: return 'bg-rose-500/10 text-rose-600';
    }
  };

  const openInMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      toast.info('Parsing booking confirmation...');
      try {
        const { data, error } = await supabase.functions.invoke('parse-booking', {
          body: { text, type: 'booking' },
        });
        if (error) throw error;
        if (data?.success && data?.data) {
          const parsed = data.data;
          setBookingType(parsed.booking_type || 'flight');
          setFormData(prev => ({
            ...prev,
            vendor_name: parsed.vendor_name || '',
            start_datetime: parsed.start_datetime ? new Date(parsed.start_datetime).toISOString().slice(0, 16) : '',
            end_datetime: parsed.end_datetime ? new Date(parsed.end_datetime).toISOString().slice(0, 16) : '',
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
          setDialogOpen(true);
          toast.success('Booking parsed! Review and save.');
        }
      } catch (err) {
        console.error('Parse error:', err);
        toast.error('Failed to parse. Please enter manually.');
      }
    } else {
      toast.info('Drop email/confirmation text to auto-fill booking details.');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-semibold">Bookings</h3>
          <p className="text-sm text-muted-foreground">
            {bookings.length === 0 
              ? 'Add flights, hotels, car rentals & activities' 
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
            <Card key={booking.id} className="group hover:shadow-md transition-shadow overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getBookingColor(booking.booking_type)}`}>
                      {getBookingIcon(booking.booking_type)}
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">
                        {booking.booking_type === 'flight' ? booking.airline || booking.vendor_name :
                         booking.booking_type === 'stay' ? booking.property_name || booking.vendor_name :
                         booking.booking_type === 'car_rental' ? booking.rental_company || booking.vendor_name :
                         booking.vendor_name}
                      </CardTitle>
                      <CardDescription className="capitalize text-xs">{booking.booking_type.replace('_', ' ')}</CardDescription>
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
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block">Date/Time</span>
                    <span className="font-medium">{format(parseISO(booking.start_datetime), 'MMM d, h:mm a')}</span>
                  </div>
                  {booking.confirmation_number && (
                    <div>
                      <span className="text-muted-foreground block">Confirmation</span>
                      <span className="font-mono font-medium">{booking.confirmation_number}</span>
                    </div>
                  )}
                </div>
                
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
                        <Badge key={companion.id} variant="secondary" className="text-xs">
                          {companion.name}
                        </Badge>
                      ))}
                    </div>
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
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => window.open(booking.link_url, '_blank')}>
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
              Add your flights, hotels, car rentals, and activities
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
              {editingBooking ? 'Update booking details and linked travelers' : 'Add a flight, stay, car rental, or activity'}
            </DialogDescription>
          </DialogHeader>

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
    </div>
  );
}
