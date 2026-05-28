import { useState, useEffect, useRef } from 'react';
import { useParking, useCreateParking, useUpdateParking, useDeleteParking } from '@/hooks/useParking';
import { useTrip } from '@/hooks/useTrips';
import { Parking, ParkingType, ParkingBilling } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Trash2, CircleParking, MapPin, Clock, AlertTriangle, Pencil, Navigation, LocateFixed } from 'lucide-react';
import { toast } from 'sonner';
import { navigateTo } from '@/lib/canonicalNavigation';
import { ParkingExpirationIndicator } from '@/components/trips/ParkingExpirationIndicator';
import { cn } from '@/lib/utils';
import { UNKNOWN_TIME_PLACEHOLDER } from '@/lib/datetimeIntegrity';
import { extractDatetimeLocalValue, formatLocalTimeDirect, formatLocalDateDirect } from '@/lib/canonicalTimeNormalizer';
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
import { useTripPermission } from '@/pages/TripDetail';

interface ParkingTabProps {
  tripId: string;
  /** v2.0.7: ID of parking record to highlight after drill-through */
  highlightId?: string;
  /** v2.0.7: Callback when highlight has been consumed */
  onHighlightConsumed?: () => void;
}

export function ParkingTab({ tripId, highlightId, onHighlightConsumed }: ParkingTabProps) {
  const { canEdit } = useTripPermission();
  const { data: parkingList = [], isLoading } = useParking(tripId);
  const { data: trip } = useTrip(tripId);
  const createParking = useCreateParking();
  const updateParking = useUpdateParking();
  const deleteParking = useDeleteParking();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingParking, setEditingParking] = useState<Parking | null>(null);
  const [parkingToDelete, setParkingToDelete] = useState<string | null>(null);

  // v2.0.7: Highlight state for drill-through
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // v2.0.7: Handle drill-through highlight
  useEffect(() => {
    if (highlightId && parkingList.length > 0) {
      // Check if the parking record exists
      const parkingExists = parkingList.some(p => p.id === highlightId);
      if (parkingExists) {
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
  }, [highlightId, parkingList, onHighlightConsumed]);

  const [formData, setFormData] = useState({
    parking_type: 'airport' as ParkingType,
    label: '',
    start_datetime: '',
    end_datetime: '',
    billing_type: 'daily' as ParkingBilling,
    address: '',
    level_section_space: '',
    total_cost: '',
    my_share: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [capturingLocation, setCapturingLocation] = useState(false);

  const resetForm = () => {
    setFormData({
      parking_type: 'airport',
      label: '',
      start_datetime: '',
      end_datetime: '',
      billing_type: 'daily',
      address: '',
      level_section_space: '',
      total_cost: '',
      my_share: '',
      latitude: null,
      longitude: null,
    });
    setEditingParking(null);
  };

  const openEditDialog = (parking: Parking) => {
    setEditingParking(parking);
    setFormData({
      parking_type: parking.parking_type,
      label: parking.label,
      // v3.9.7: Prefer local wall-time columns for edit form — exact user-entered values
      start_datetime: parking.start_local_datetime || extractDatetimeLocalValue(parking.start_datetime),
      end_datetime: parking.end_local_datetime || extractDatetimeLocalValue(parking.end_datetime),
      billing_type: parking.billing_type,
      address: parking.address || '',
      level_section_space: parking.level_section_space || '',
      total_cost: parking.total_cost?.toString() || '',
      my_share: parking.my_share?.toString() || '',
      latitude: (parking as any).latitude ?? null,
      longitude: (parking as any).longitude ?? null,
    });
    setDialogOpen(true);
  };

  const captureCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      toast.error('Location is not available on this device');
      return;
    }
    setCapturingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        toast.success('Parking spot saved');
        setCapturingLocation(false);
      },
      (err) => {
        toast.error(err.code === err.PERMISSION_DENIED
          ? 'Allow location access to save your parking spot'
          : 'Could not get your location');
        setCapturingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // v3.9.7: Send datetime-local values directly — digits represent destination-local time.
    // Also persist local wall-time columns for guaranteed correct display.
    const endLocal = formData.end_datetime || undefined;
    const startLocal = formData.start_datetime;
    const parkingData = {
      parking_type: formData.parking_type,
      label: formData.label,
      start_datetime: startLocal,
      end_datetime: endLocal,
      billing_type: formData.billing_type,
      address: formData.address || undefined,
      level_section_space: formData.level_section_space || undefined,
      total_cost: formData.total_cost ? parseFloat(formData.total_cost) : 0,
      my_share: formData.my_share ? parseFloat(formData.my_share) : 0,
      // v3.9.7: Store exact user-entered local times (no conversion)
      end_local_datetime: endLocal,
      start_local_datetime: startLocal,
      // Saved GPS coordinates for "Find my car"
      latitude: formData.latitude,
      longitude: formData.longitude,
    };

    if (editingParking) {
      await updateParking.mutateAsync({
        id: editingParking.id,
        trip_id: tripId,
        ...parkingData,
      });
    } else {
      await createParking.mutateAsync({
        trip_id: tripId,
        ...parkingData,
      });
    }
    
    resetForm();
    setDialogOpen(false);
  };

  const handleDelete = () => {
    if (parkingToDelete) {
      deleteParking.mutate({ id: parkingToDelete, trip_id: tripId });
      setParkingToDelete(null);
    }
  };

  const openInMaps = (parking: Parking) => {
    const lat = (parking as any).latitude as number | null | undefined;
    const lng = (parking as any).longitude as number | null | undefined;
    navigateTo({
      lat: lat ?? undefined,
      lng: lng ?? undefined,
      address: parking.address,
      locationLabel: parking.label,
    });
  };

  const now = new Date();

  // v3.9.7: Use end_local_datetime for status — string comparison, no Date() math
  const getParkingStatus = (parking: Parking) => {
    const endStr = parking.end_local_datetime || parking.end_datetime;
    if (!endStr) return 'active';
    // Build a comparable local ISO string from device "now"
    const pad = (n: number) => String(n).padStart(2, '0');
    const nowLocal = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const endNorm = endStr.substring(0, 16); // YYYY-MM-DDTHH:mm
    if (endNorm <= nowLocal) return 'expired';
    // Check if expiring within 15 minutes — add 15 min to now
    const soon = new Date(now.getTime() + 15 * 60000);
    const soonLocal = `${soon.getFullYear()}-${pad(soon.getMonth()+1)}-${pad(soon.getDate())}T${pad(soon.getHours())}:${pad(soon.getMinutes())}`;
    if (endNorm <= soonLocal) return 'expiring';
    return 'active';
  };

  const totalCost = parkingList.reduce((sum, p) => sum + Number(p.total_cost || 0), 0);

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header v1.3.2 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-semibold">Parking</h3>
        {canEdit && (
          <Button onClick={() => { resetForm(); setDialogOpen(true); }} className="bg-gradient-ocean hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Add Parking
          </Button>
        )}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Parking Cost</CardDescription>
          <CardTitle className="text-2xl">${totalCost.toFixed(2)}</CardTitle>
        </CardHeader>
      </Card>

      {/* Parking List */}
      {parkingList.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {parkingList.map((parking: Parking) => {
            const status = getParkingStatus(parking);
            return (
              <Card 
                key={parking.id} 
                ref={(el) => {
                  if (el) cardRefs.current.set(parking.id, el);
                }}
                className={cn(
                  "transition-all",
                  status === 'expiring' ? 'border-warning' : status === 'expired' ? 'border-muted' : '',
                  highlightedId === parking.id && "ring-2 ring-primary ring-offset-2 shadow-lg"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <CircleParking className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{parking.label}</CardTitle>
                        <CardDescription className="capitalize">{parking.parking_type.replace('_', ' ')}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {status === 'expiring' && (
                        <Badge variant="outline" className="text-warning border-warning">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Expiring Soon
                        </Badge>
                      )}
                      {status === 'expired' && (
                        <Badge variant="secondary">Expired</Badge>
                      )}
                      {canEdit && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(parking)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setParkingToDelete(parking.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {/* v3.9.7: Display from local wall-time columns — no Date() math */}
                    <span>
                      {(() => {
                        const src = parking.start_local_datetime || parking.start_datetime;
                        return formatLocalDateDirect(src) || '--';
                      })()},{' '}
                      {(() => {
                        const src = parking.start_local_datetime || parking.start_datetime;
                        const t = formatLocalTimeDirect(src);
                        return t || <span className="text-destructive font-medium">{UNKNOWN_TIME_PLACEHOLDER}</span>;
                      })()}
                      {(parking.end_local_datetime || parking.end_datetime) && (
                        <>
                          {' - '}
                          {(() => {
                            const src = parking.end_local_datetime || parking.end_datetime;
                            return formatLocalDateDirect(src) || '--';
                          })()},{' '}
                          {(() => {
                            const src = parking.end_local_datetime || parking.end_datetime;
                            const t = formatLocalTimeDirect(src);
                            return t || <span className="text-destructive font-medium">{UNKNOWN_TIME_PLACEHOLDER}</span>;
                          })()}
                        </>
                      )}
                    </span>
                  </div>
                  {/* v2.0.4: Pro-only parking expiration indicator */}
                  <ParkingExpirationIndicator tripId={tripId} parkingId={parking.id} />
                  {parking.level_section_space && (
                    <p className="text-muted-foreground">
                      Location: {parking.level_section_space}
                    </p>
                  )}
                  {parking.total_cost > 0 && (
                    <p className="font-semibold">${Number(parking.total_cost).toFixed(2)}</p>
                  )}
                  {parking.address && (
                    <Button size="sm" variant="outline" onClick={() => openInMaps(parking)}>
                      <MapPin className="w-3 h-3 mr-1" />
                      Open in Maps
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CircleParking className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No parking added</p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }} variant="link" className="mt-2">
              Add parking location
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Parking Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingParking ? 'Edit Parking' : 'Add Parking'}</DialogTitle>
            <DialogDescription>Track your parking locations and expirations</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Parking Type *</Label>
                <Select value={formData.parking_type} onValueChange={(v: ParkingType) => setFormData({ ...formData, parking_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="airport">Airport</SelectItem>
                    <SelectItem value="beach">Beach</SelectItem>
                    <SelectItem value="city_garage">City/Garage</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Billing Type *</Label>
                <Select value={formData.billing_type} onValueChange={(v: ParkingBilling) => setFormData({ ...formData, billing_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="per_trip">Per Trip</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Label/Name *</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="Parking location name"
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

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Address"
              />
            </div>

            <div className="space-y-2">
              <Label>Level/Section/Space</Label>
              <Input
                value={formData.level_section_space}
                onChange={(e) => setFormData({ ...formData, level_section_space: e.target.value })}
                placeholder="Level, Section, Space"
              />
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

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => { resetForm(); setDialogOpen(false); }} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-ocean hover:opacity-90" disabled={createParking.isPending || updateParking.isPending}>
                {createParking.isPending || updateParking.isPending ? 'Saving...' : editingParking ? 'Save Changes' : 'Add Parking'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!parkingToDelete} onOpenChange={() => setParkingToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Parking</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this parking entry? This action cannot be undone.
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