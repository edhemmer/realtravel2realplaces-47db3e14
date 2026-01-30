import { useState } from 'react';
import { useParking, useCreateParking, useUpdateParking, useDeleteParking } from '@/hooks/useParking';
import { Parking, ParkingType, ParkingBilling } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Trash2, CircleParking, MapPin, Clock, AlertTriangle, Pencil } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, addMinutes } from 'date-fns';
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
}

export function ParkingTab({ tripId }: ParkingTabProps) {
  const { canEdit } = useTripPermission();
  const { data: parkingList = [], isLoading } = useParking(tripId);
  const createParking = useCreateParking();
  const updateParking = useUpdateParking();
  const deleteParking = useDeleteParking();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingParking, setEditingParking] = useState<Parking | null>(null);
  const [parkingToDelete, setParkingToDelete] = useState<string | null>(null);

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
  });

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
    });
    setEditingParking(null);
  };

  const openEditDialog = (parking: Parking) => {
    setEditingParking(parking);
    setFormData({
      parking_type: parking.parking_type,
      label: parking.label,
      start_datetime: parking.start_datetime ? format(parseISO(parking.start_datetime), "yyyy-MM-dd'T'HH:mm") : '',
      end_datetime: parking.end_datetime ? format(parseISO(parking.end_datetime), "yyyy-MM-dd'T'HH:mm") : '',
      billing_type: parking.billing_type,
      address: parking.address || '',
      level_section_space: parking.level_section_space || '',
      total_cost: parking.total_cost?.toString() || '',
      my_share: parking.my_share?.toString() || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parkingData = {
      parking_type: formData.parking_type,
      label: formData.label,
      start_datetime: new Date(formData.start_datetime).toISOString(),
      end_datetime: formData.end_datetime ? new Date(formData.end_datetime).toISOString() : undefined,
      billing_type: formData.billing_type,
      address: formData.address || undefined,
      level_section_space: formData.level_section_space || undefined,
      total_cost: formData.total_cost ? parseFloat(formData.total_cost) : 0,
      my_share: formData.my_share ? parseFloat(formData.my_share) : 0,
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

  const openInMaps = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank', 'noopener,noreferrer');
  };

  const now = new Date();

  const getParkingStatus = (parking: Parking) => {
    if (!parking.end_datetime) return 'active';
    const endTime = parseISO(parking.end_datetime);
    const alertTime = addMinutes(now, 15);
    
    if (isBefore(endTime, now)) return 'expired';
    if (isBefore(endTime, alertTime)) return 'expiring';
    return 'active';
  };

  const totalCost = parkingList.reduce((sum, p) => sum + Number(p.total_cost || 0), 0);

  if (isLoading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
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
              <Card key={parking.id} className={status === 'expiring' ? 'border-warning' : status === 'expired' ? 'border-muted' : ''}>
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
                    <span>
                      {format(parseISO(parking.start_datetime), 'MMM d, h:mm a')}
                      {parking.end_datetime && ` - ${format(parseISO(parking.end_datetime), 'MMM d, h:mm a')}`}
                    </span>
                  </div>
                  {parking.level_section_space && (
                    <p className="text-muted-foreground">
                      Location: {parking.level_section_space}
                    </p>
                  )}
                  {parking.total_cost > 0 && (
                    <p className="font-semibold">${Number(parking.total_cost).toFixed(2)}</p>
                  )}
                  {parking.address && (
                    <Button size="sm" variant="outline" onClick={() => openInMaps(parking.address!)}>
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