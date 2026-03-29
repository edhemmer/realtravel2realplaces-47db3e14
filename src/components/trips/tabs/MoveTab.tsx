/**
 * v5.0.1: MOVE Tab — Decision-Driven
 *
 * Shows exactly 2 options: primary (dominant) + secondary (alternative).
 * Uses existing bookings + drive intelligence only. No new logic layers.
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

function getTransportIcon(type: string, size: 'lg' | 'sm' = 'lg') {
  const cls = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';
  switch (type) {
    case 'flight': return <Plane className={cls} />;
    case 'car_rental': return <Car className={cls} />;
    case 'transport': return <TrainFront className={cls} />;
    default: return <Car className={cls} />;
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

interface MoveOption {
  kind: 'drive' | 'booking';
  label: string;
  reason: string;
  booking?: Booking;
  isDrive?: boolean;
}

export function MoveTab({ tripId, trip }: MoveTabProps) {
  const { data: bookings = [] } = useBookings(tripId);
  const { state: canonicalState } = useCanonicalTripState(tripId, trip);

  const todayStr = getLocalNowString().substring(0, 10);

  const activeDrive = useMemo(
    () => getActiveDriveSegment(canonicalState, new Date()),
    [canonicalState],
  );
  const driveTarget = useMemo(
    () => activeDrive ? getNavigationTarget(canonicalState, activeDrive) : null,
    [canonicalState, activeDrive],
  );

  // Derive exactly primary + secondary option
  const { primary, secondary } = useMemo((): { primary: MoveOption | null; secondary: MoveOption | null } => {
    const isDriveTrip = trip.transportation_mode === 'drive';

    // Upcoming transport bookings (sorted chronologically)
    const upcoming = bookings
      .filter(b =>
        (b.booking_type === 'flight' || b.booking_type === 'car_rental' || b.booking_type === 'transport') &&
        b.start_datetime.substring(0, 10) >= todayStr
      )
      .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));

    const nextBooking = upcoming[0] || null;
    const altBooking = upcoming[1] || null;

    // If drive trip with active segment → drive is primary
    if (isDriveTrip && activeDrive) {
      const p: MoveOption = {
        kind: 'drive',
        label: 'Drive Mode',
        reason: driveTarget?.label ? `Your fastest option right now — head to ${driveTarget.label}` : 'Your most direct option for the current leg',
        isDrive: true,
      };
      const s: MoveOption | null = nextBooking ? {
        kind: 'booking',
        label: `${getTransportLabel(nextBooking.booking_type)}: ${nextBooking.vendor_name}`,
        reason: nextBooking.confirmation_number ? `Confirmation ${nextBooking.confirmation_number} — a scheduled alternative` : 'A scheduled alternative if plans change',
        booking: nextBooking,
      } : null;
      return { primary: p, secondary: s };
    }

    // Otherwise next booking is primary
    if (nextBooking) {
      const p: MoveOption = {
        kind: 'booking',
        label: `${getTransportLabel(nextBooking.booking_type)}: ${nextBooking.vendor_name}`,
        reason: nextBooking.confirmation_number ? `Confirmation ${nextBooking.confirmation_number} — your scheduled transport` : 'Your next scheduled transport option',
        booking: nextBooking,
      };
      let s: MoveOption | null = null;
      if (isDriveTrip && activeDrive) {
        s = { kind: 'drive', label: 'Drive Mode', reason: driveTarget?.label ? `Drive to ${driveTarget.label} instead — avoids the booking logistics` : 'Drive yourself if you prefer flexibility over the scheduled option', isDrive: true };
      } else if (altBooking) {
        s = {
          kind: 'booking',
          label: `${getTransportLabel(altBooking.booking_type)}: ${altBooking.vendor_name}`,
          reason: altBooking.confirmation_number ? `Confirmation ${altBooking.confirmation_number} — a backup if timing shifts` : 'Available as a backup if your plans change',
          booking: altBooking,
        };
      }
      return { primary: p, secondary: s };
    }

    // Drive-only fallback
    if (isDriveTrip && activeDrive) {
      return {
        primary: { kind: 'drive', label: 'Drive Mode', reason: driveTarget?.label ? `Head to ${driveTarget.label} — your only transport option right now` : 'Your only transport option for this leg', isDrive: true },
        secondary: null,
      };
    }

    return { primary: null, secondary: null };
  }, [trip, bookings, todayStr, activeDrive, driveTarget]);

  if (!primary) {
    return (
      <div className="text-center py-12 pb-20">
        <Car className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No transport options to show yet.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Once you add flights, rentals, or set up a drive, your options will appear here.</p>
      </div>
    );
  }

  const renderOption = (opt: MoveOption, isPrimary: boolean) => {
    if (opt.isDrive) {
      return (
        <Link to={`/trip/${tripId}/drive`} className="block">
          <Card className={isPrimary ? 'border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors' : 'opacity-70'}>
            <CardContent className={isPrimary ? 'p-5' : 'p-3.5'}>
              <div className="flex items-center gap-3">
                <div className={`rounded-full bg-primary/10 flex items-center justify-center shrink-0 ${isPrimary ? 'w-11 h-11' : 'w-8 h-8'}`}>
                  <Car className={`text-primary ${isPrimary ? 'w-5 h-5' : 'w-4 h-4'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-foreground ${isPrimary ? 'text-base' : 'text-sm'}`}>{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.reason}</p>
                </div>
                <ChevronRight className={`text-primary/60 shrink-0 ${isPrimary ? 'w-5 h-5' : 'w-4 h-4'}`} />
              </div>
            </CardContent>
          </Card>
        </Link>
      );
    }

    const booking = opt.booking!;
    return (
      <Card className={isPrimary ? '' : 'opacity-70'}>
        <CardContent className={isPrimary ? 'p-5' : 'p-3.5'}>
          <div className="flex items-center gap-3">
            <div className={`rounded-full bg-muted/60 flex items-center justify-center shrink-0 ${isPrimary ? 'w-11 h-11' : 'w-8 h-8'}`}>
              {getTransportIcon(booking.booking_type, isPrimary ? 'lg' : 'sm')}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate ${isPrimary ? 'text-base' : 'text-sm'}`}>{opt.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{opt.reason}</p>
            </div>
            {isPrimary && (booking.address || booking.departure_airport_code) && (
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
    );
  };

  return (
    <div className="space-y-3 pb-20">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Primary
      </h3>
      {renderOption(primary, true)}

      {secondary && (
        <>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mt-4">
            Alternative
          </h3>
          {renderOption(secondary, false)}
        </>
      )}
    </div>
  );
}
