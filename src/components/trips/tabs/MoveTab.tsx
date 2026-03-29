/**
 * v5.0.0: MOVE Tab
 *
 * Simplified movement/transport view using existing drive engine + canonical state.
 * Shows primary transport option prominently and secondary options below.
 * No new logic — reuses existing DriveModeEntryCard, drive intelligence, and bookings.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Car, Plane, TrainFront, Navigation, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trip, Booking } from '@/types/database';
import { useBookings } from '@/hooks/useBookings';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';
import { getActiveDriveSegment, getNavigationTarget } from '@/lib/driveIntelligenceHelper';
import { resolveCanonicalNavigation, openCanonicalNav } from '@/lib/canonicalNavigation';
import { getLocalNowString } from '@/lib/canonicalNextStop';

interface MoveTabProps {
  tripId: string;
  trip: Trip;
}

function getTransportIcon(type: string) {
  switch (type) {
    case 'flight': return <Plane className="w-5 h-5" />;
    case 'car_rental': return <Car className="w-5 h-5" />;
    case 'transport': return <TrainFront className="w-5 h-5" />;
    default: return <Car className="w-5 h-5" />;
  }
}

function getTransportLabel(type: string) {
  switch (type) {
    case 'flight': return 'Flight';
    case 'car_rental': return 'Car Rental';
    case 'transport': return 'Transport';
    default: return 'Transport';
  }
}

export function MoveTab({ tripId, trip }: MoveTabProps) {
  const { data: bookings = [] } = useBookings(tripId);
  const { state: canonicalState } = useCanonicalTripState(tripId, trip);

  const todayStr = getLocalNowString().substring(0, 10);

  // Active drive segment
  const activeDrive = useMemo(
    () => getActiveDriveSegment(canonicalState, new Date()),
    [canonicalState],
  );
  const driveTarget = useMemo(
    () => activeDrive ? getNavigationTarget(canonicalState, activeDrive) : null,
    [canonicalState, activeDrive],
  );

  // Transport bookings sorted by relevance (today/upcoming first)
  const transportBookings = useMemo(() => {
    return bookings
      .filter(b => b.booking_type === 'flight' || b.booking_type === 'car_rental' || b.booking_type === 'transport')
      .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
  }, [bookings]);

  // Split into primary (today/upcoming) and secondary (past)
  const { primary, secondary } = useMemo(() => {
    const p: Booking[] = [];
    const s: Booking[] = [];
    for (const b of transportBookings) {
      const bDate = b.start_datetime.substring(0, 10);
      if (bDate >= todayStr) {
        p.push(b);
      } else {
        s.push(b);
      }
    }
    return { primary: p, secondary: s };
  }, [transportBookings, todayStr]);

  const isDriveTrip = trip.transportation_mode === 'drive';

  return (
    <div className="space-y-4 pb-20">
      {/* Primary: Drive Mode (if applicable) */}
      {isDriveTrip && activeDrive && (
        <Link
          to={`/trip/${tripId}/drive`}
          className="block"
        >
          <Card className="border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-foreground">Drive Mode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {driveTarget?.label || 'Open navigation for your route'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-primary/60 shrink-0" />
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Primary transport bookings */}
      {primary.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Upcoming
          </h3>
          {primary.map(booking => (
            <Card key={booking.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center shrink-0">
                    {getTransportIcon(booking.booking_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{booking.vendor_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {getTransportLabel(booking.booking_type)}
                      {booking.confirmation_number && ` · ${booking.confirmation_number}`}
                    </p>
                  </div>
                  {booking.address && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg text-xs shrink-0"
                      onClick={() => {
                        const result = resolveCanonicalNavigation({
                          address: booking.address,
                          bookingType: booking.booking_type,
                          departureAirportCode: booking.departure_airport_code || undefined,
                          arrivalAirportCode: booking.arrival_airport_code || undefined,
                          locationLabel: booking.vendor_name,
                        });
                        if (result) openCanonicalNav(result);
                      }}
                    >
                      <Navigation className="w-3 h-3 mr-1" />
                      Go
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Secondary (past) */}
      {secondary.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Past
          </h3>
          {secondary.map(booking => (
            <Card key={booking.id} className="opacity-60">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-muted/40 flex items-center justify-center shrink-0">
                    {getTransportIcon(booking.booking_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{booking.vendor_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {getTransportLabel(booking.booking_type)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {primary.length === 0 && secondary.length === 0 && !activeDrive && (
        <div className="text-center py-12">
          <Car className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No transport bookings yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Add flights, rentals, or drives to see them here.</p>
        </div>
      )}
    </div>
  );
}
