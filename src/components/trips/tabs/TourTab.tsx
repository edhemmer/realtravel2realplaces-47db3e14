/**
 * TourTab - Business-tier Stops UI
 * 
 * v3.8.8: Date-grouped layout with CONFIRMED/TBD separation,
 *         deterministic auto-ordering, and manual day lock.
 * 
 * v3.8.5: Smart Import intake pipeline
 * v2.3.2: Business tier bulk import
 * v2.1.25: MANUAL STOPS ONLY
 * v2.1.23: Tour/Booking Separation Enforcement
 * 
 * LAYOUT RULES (v3.8.8):
 * - Stops grouped by date with clear date headers
 * - Within each date: CONFIRMED (has time) first by time asc, TBD after by canonical order
 * - Date headers show "Optimized" (auto) or "Locked" (manual) badge
 * - "Re-optimize" action on locked headers
 * - Stops show time badge (CONFIRMED) or "TBD" badge
 * - Navigate uses lat/lng coordinates when available
 */

import { useState, useCallback, useMemo } from 'react';
import { TourImportModal } from '@/components/trips/TourImportModal';
import { useEngagements, useCreateEngagement, useUpdateEngagement, useDeleteEngagement, Engagement } from '@/hooks/useEngagements';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Plus, MapPin, Clock, Trash2, Pencil, Navigation, Store, Import, RotateCcw, Lock, Sparkles } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useTripPermission } from '@/pages/TripDetail';
import { Trip } from '@/types/database';
import { navigateTo } from '@/lib/canonicalNavigation';
import { computeDayOrder, DayOrderMode, OrderableStop } from '@/lib/drive/dayOrder';

// ============================================================================
// TYPES & HELPERS
// ============================================================================

interface TourTabProps {
  tripId: string;
  trip?: Trip;
  canBulkImport?: boolean;
}

interface StopFormData {
  name: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  address: string;
  store_number: string;
  notes: string;
}

const EMPTY_FORM: StopFormData = {
  name: '',
  date: '',
  start_time: '',
  end_time: '',
  location: '',
  address: '',
  store_number: '',
  notes: '',
};



/** localStorage key for day lock state per trip */
function dayLockStorageKey(tripId: string): string {
  return `rt2rp_day_lock_${tripId}`;
}

interface DayLockState {
  [date: string]: {
    mode: DayOrderMode;
    orderedIds?: string[];
  };
}

function loadDayLockState(tripId: string): DayLockState {
  try {
    const raw = localStorage.getItem(dayLockStorageKey(tripId));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveDayLockState(tripId: string, state: DayLockState): void {
  localStorage.setItem(dayLockStorageKey(tripId), JSON.stringify(state));
}

/** Check if a stop has a confirmed time (non-empty, non-midnight placeholder) */
function hasConfirmedTime(stop: Engagement): boolean {
  if (!stop.start_time) return false;
  const t = stop.start_time.trim();
  // Treat empty or all-zeros as TBD
  return t.length > 0 && t !== '00:00:00' && t !== '00:00';
}

/** Format time for display (HH:MM:SS -> h:mm a) */
function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0);
  return format(d, 'h:mm a');
}

/** Format date for header (YYYY-MM-DD -> "Wed, Feb 15") */
function formatDateHeader(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEEE, MMM d');
  } catch {
    return dateStr;
  }
}

/** Group stops by date */
interface DateGroup {
  date: string;
  confirmed: Engagement[];
  tbd: Engagement[];
  mode: DayOrderMode;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TourTab({ tripId, trip, canBulkImport = false }: TourTabProps) {
  const { canEdit } = useTripPermission();
  const { data: stops = [], isLoading } = useEngagements(tripId);
  const createStop = useCreateEngagement();
  const updateStop = useUpdateEngagement();
  const deleteStop = useDeleteEngagement();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [editingStop, setEditingStop] = useState<Engagement | null>(null);
  const [stopToDelete, setStopToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<StopFormData>(EMPTY_FORM);
  const [dayLockState, setDayLockState] = useState<DayLockState>(() => loadDayLockState(tripId));

  // ========================================================================
  // DATE-GROUPED + ORDERED STOPS (v3.8.8)
  // ========================================================================

  const dateGroups: DateGroup[] = useMemo(() => {
    if (stops.length === 0) return [];

    // Group by date
    const byDate = new Map<string, Engagement[]>();
    stops.forEach((stop, idx) => {
      const existing = byDate.get(stop.date) || [];
      existing.push(stop);
      byDate.set(stop.date, existing);
    });

    // Sort dates chronologically
    const sortedDates = Array.from(byDate.keys()).sort();

    return sortedDates.map(date => {
      const dayStops = byDate.get(date)!;
      const confirmed = dayStops
        .filter(hasConfirmedTime)
        .sort((a, b) => a.start_time.localeCompare(b.start_time));
      const tbd = dayStops.filter(s => !hasConfirmedTime(s));

      // Get day lock state
      const lockInfo = dayLockState[date];
      const mode: DayOrderMode = lockInfo?.mode || 'OPTIMIZED_AUTO';

      if (tbd.length > 1) {
        // Build OrderableStop array for canonical ordering
        const orderableStops: OrderableStop[] = dayStops.map((s, idx) => ({
          id: s.id,
          date: s.date,
          time: hasConfirmedTime(s) ? s.start_time : null,
          location: null, // We don't have LocationStructured in the engagement model yet
          insertionIndex: idx,
        }));

        const result = computeDayOrder(
          orderableStops,
          lockInfo?.mode === 'MANUAL_LOCKED' ? 'cached' : undefined,
          lockInfo?.orderedIds,
          mode
        );

        // Reorder TBD based on result
        const idOrder = result.orderedIds;
        const tbdMap = new Map(tbd.map(s => [s.id, s]));
        const orderedTbd = idOrder
          .filter(id => tbdMap.has(id))
          .map(id => tbdMap.get(id)!);
        // Append any TBD stops not in the order (safety)
        tbd.forEach(s => {
          if (!idOrder.includes(s.id)) orderedTbd.push(s);
        });

        return { date, confirmed, tbd: orderedTbd, mode };
      }

      return { date, confirmed, tbd, mode };
    });
  }, [stops, dayLockState]);

  // ========================================================================
  // DAY LOCK ACTIONS
  // ========================================================================

  const handleReOptimize = useCallback((date: string) => {
    const newState = { ...dayLockState };
    delete newState[date];
    setDayLockState(newState);
    saveDayLockState(tripId, newState);
    toast.success('Day re-optimized');
  }, [dayLockState, tripId]);

  // ========================================================================
  // FORM HANDLERS
  // ========================================================================

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
      start_time: hasConfirmedTime(stop) ? stop.start_time.slice(0, 5) : '',
      end_time: stop.end_time ? stop.end_time.slice(0, 5) : '',
      location: stop.location || '',
      address: stop.address || '',
      store_number: stop.store_number || '',
      notes: stop.notes || '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Stop name is required');
      return;
    }
    if (!formData.date) {
      toast.error('Date is required');
      return;
    }

    // v3.8.8: Time is now optional (TBD stops allowed)
    const startTime = formData.start_time
      ? formData.start_time + ':00'
      : '00:00:00'; // Placeholder for TBD

    try {
      if (editingStop) {
        await updateStop.mutateAsync({
          id: editingStop.id,
          name: formData.name.trim(),
          date: formData.date,
          start_time: startTime,
          end_time: formData.end_time ? formData.end_time + ':00' : null,
          location: formData.location.trim() || null,
          address: formData.address.trim() || null,
          store_number: formData.store_number.trim() || null,
          notes: formData.notes.trim() || null,
        });
        toast.success('Stop updated');
      } else {
        await createStop.mutateAsync({
          trip_id: tripId,
          name: formData.name.trim(),
          date: formData.date,
          start_time: startTime,
          end_time: formData.end_time ? formData.end_time + ':00' : null,
          location: formData.location.trim() || null,
          address: formData.address.trim() || null,
          store_number: formData.store_number.trim() || null,
          notes: formData.notes.trim() || null,
          origin: 'manual',
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

  /** Navigate using address/location (lat/lng when available in future) */
  const openMapsDirections = (stop: Engagement) => {
    const opened = navigateTo({
      address: stop.address,
      locationLabel: stop.location,
    });
    if (!opened) {
      toast.error('No location available for navigation');
    }
  };

  // ========================================================================
  // RENDER
  // ========================================================================

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <h3 className="text-lg font-semibold">Tour Stops</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportDialogOpen(true)}
            >
              <Import className="w-4 h-4 mr-2" />
              Import
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

      {/* v3.8.8: Date-grouped stops list */}
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
              Use the Lodging section under Bookings.
            </p>
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={() => setImportDialogOpen(true)}
                >
                  <Import className="w-4 h-4 mr-2" />
                  Import Stops
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
        <div className="space-y-3">
          {dateGroups.map((group) => (
            <div key={group.date} className="space-y-1.5">
              {/* Date header — compact single-line */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-foreground">
                    {formatDateHeader(group.date)}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    {group.confirmed.length + group.tbd.length} stop{group.confirmed.length + group.tbd.length !== 1 ? 's' : ''}
                    {group.tbd.length > 0 && (
                      group.mode === 'MANUAL_LOCKED'
                        ? <> · <Lock className="w-2.5 h-2.5 inline-block align-text-top" /> Locked</>
                        : group.tbd.length > 1
                          ? <> · <Sparkles className="w-2.5 h-2.5 inline-block align-text-top text-primary" /> Optimized</>
                          : null
                    )}
                  </span>
                </div>
                {/* Re-optimize action (only when locked) */}
                {canEdit && group.mode === 'MANUAL_LOCKED' && group.tbd.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-foreground px-2"
                    onClick={() => handleReOptimize(group.date)}
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Re-optimize
                  </Button>
                )}
              </div>

              {/* Confirmed stops (has time) */}
              {group.confirmed.length > 0 && (
                <div className="grid gap-2">
                  {group.confirmed.map((stop) => (
                    <StopCard
                      key={stop.id}
                      stop={stop}
                      isConfirmed={true}
                      canEdit={canEdit}
                      onEdit={() => openEditDialog(stop)}
                      onDelete={() => setStopToDelete(stop.id)}
                      onNavigate={() => openMapsDirections(stop)}
                    />
                  ))}
                </div>
              )}

              {/* TBD stops (no time) */}
              {group.tbd.length > 0 && (
                <div className="grid gap-2">
                  {group.tbd.map((stop) => (
                    <StopCard
                      key={stop.id}
                      stop={stop}
                      isConfirmed={false}
                      canEdit={canEdit}
                      onEdit={() => openEditDialog(stop)}
                      onDelete={() => setStopToDelete(stop.id)}
                      onNavigate={() => openMapsDirections(stop)}
                    />
                  ))}
                </div>
              )}

              {/* Subtle separator between date groups */}
              <div className="border-b border-border/50" />
            </div>
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
            <div className="space-y-2">
              <Label htmlFor="name">Stop name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Client meeting, Office visit, etc."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>

            {/* v3.8.8: Time is now optional */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                  placeholder="Leave blank for TBD"
                />
                <p className="text-[10px] text-muted-foreground">Leave blank for TBD</p>
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

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Address or city"
              />
            </div>

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

      <TourImportModal
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        tripId={tripId}
      />

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

// ============================================================================
// STOP CARD SUB-COMPONENT
// ============================================================================

interface StopCardProps {
  stop: Engagement;
  isConfirmed: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onNavigate: () => void;
}

function StopCard({ stop, isConfirmed, canEdit, onEdit, onDelete, onNavigate }: StopCardProps) {
  const displayLocation = stop.address || stop.location;
  const hasLocation = Boolean(displayLocation);

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="py-2 px-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Header: name + badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <h4 className="font-medium text-sm truncate">{stop.name}</h4>
              {/* Time / TBD badge */}
              {isConfirmed ? (
                <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 h-4 gap-0.5 border-primary/30 text-primary">
                  <Clock className="w-2.5 h-2.5" />
                  {formatTime(stop.start_time)}
                  {stop.end_time && ` – ${formatTime(stop.end_time)}`}
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] font-medium px-1.5 py-0 h-4">
                  TBD
                </Badge>
              )}
              {stop.store_number && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium px-1.5 py-0 h-4 bg-muted/50 border-muted-foreground/20 gap-0.5"
                >
                  <Store className="w-2.5 h-2.5" />
                  #{stop.store_number}
                </Badge>
              )}
              {stop.origin === 'parsed' && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">Parsed</Badge>
              )}
            </div>
            {/* Location row */}
            {hasLocation && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate max-w-[220px]">{displayLocation}</span>
              </div>
            )}
            {stop.notes && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                {stop.notes}
              </p>
            )}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-0.5 shrink-0">
            {hasLocation && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onNavigate}
                className="h-7 w-7 text-primary hover:text-primary"
                title="Open in Maps"
              >
                <Navigation className="h-3.5 w-3.5" />
              </Button>
            )}
            {canEdit && (
              <>
                <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only">Edit stop</span>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className="h-7 w-7 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only">Delete stop</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
