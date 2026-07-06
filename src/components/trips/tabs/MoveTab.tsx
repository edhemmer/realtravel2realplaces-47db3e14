/**
 * MOVE Tab - Decision-driven movement surface.
 *
 * Shows the dominant movement option plus one useful alternative.
 * Driving trips stay accessible before departure so users can review routes,
 * stops, fuel, weather, and alerts before the trip starts.
 */

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Car, Plane, TrainFront, Navigation, ChevronRight, Route, ShieldCheck, Clock3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppModuleHeader } from '@/components/trips/AppModuleHeader';
import { ModuleOperatingBrief } from '@/components/trips/ModuleOperatingBrief';
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

interface MoveOption {
  kind: 'drive' | 'booking';
  label: string;
  reason: string;
  booking?: Booking;
  isDrive?: boolean;
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
    case 'car_rental': return 'Car rental';
    case 'transport': return 'Transport';
    default: return 'Transport';
  }
}

function bookingStartDateToken(booking: Booking): string {
  return (booking.start_datetime || booking.end_datetime || '').substring(0, 10);
}

function compareBookingStart(a: Booking, b: Booking): number {
  const aDate = a.start_datetime || a.end_datetime || '';
  const bDate = b.start_datetime || b.end_datetime || '';
  return aDate.localeCompare(bDate);
}

function routeDestinationLabel(trip: Trip): string {
  return trip.destination_address?.trim()
    || [trip.destination_city, trip.destination_state, trip.destination_country].filter(Boolean).join(', ')
    || trip.name
    || 'your destination';
}

function bookingOption(booking: Booking, role: 'primary' | 'alternative'): MoveOption {
  const confirmation = booking.confirmation_number
    ? `Confirmation ${booking.confirmation_number}`
    : null;

  return {
    kind: 'booking',
    label: `${getTransportLabel(booking.booking_type)}: ${booking.vendor_name}`,
    reason: confirmation
      ? `${confirmation} - ${role === 'primary' ? 'your scheduled transport' : 'available if timing shifts'}`
      : role === 'primary' ? 'Your next scheduled transport option' : 'Available as a backup if plans change',
    booking,
  };
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

  const { primary, secondary } = useMemo((): { primary: MoveOption | null; secondary: MoveOption | null } => {
    const isDriveTrip = trip.transportation_mode === 'drive';
    const upcoming = bookings
      .filter((booking) =>
        (booking.booking_type === 'flight' || booking.booking_type === 'car_rental' || booking.booking_type === 'transport') &&
        bookingStartDateToken(booking) >= todayStr
      )
      .sort(compareBookingStart);

    const nextBooking = upcoming[0] || null;
    const altBooking = upcoming[1] || null;

    if (isDriveTrip) {
      const driveOption: MoveOption = {
        kind: 'drive',
        label: 'Driving Mode',
        reason: driveTarget?.label
          ? `Your route window is ready - head to ${driveTarget.label}`
          : `Review route options, stops, fuel, weather, and alerts for ${routeDestinationLabel(trip)}`,
        isDrive: true,
      };

      return {
        primary: driveOption,
        secondary: nextBooking ? bookingOption(nextBooking, 'alternative') : null,
      };
    }

    if (nextBooking) {
      return {
        primary: bookingOption(nextBooking, 'primary'),
        secondary: altBooking ? bookingOption(altBooking, 'alternative') : null,
      };
    }

    return { primary: null, secondary: null };
  }, [activeDrive, bookings, driveTarget, todayStr, trip]);

  if (!primary) {
    return (
      <div className="space-y-4 pb-20">
        <AppModuleHeader
          icon={Navigation}
          eyebrow="Movement"
          title="Move"
          description="One place for how you physically get to the next stop: flight, driving, train, rental, transit, or map handoff."
          status="Setup needed"
          statusTone="setup"
        />
        <div className="py-12 text-center">
          <Car className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-foreground">No movement plan yet.</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Add a flight, rental, rail, or drive plan to turn this into your movement command surface.</p>
        </div>
      </div>
    );
  }

  const renderOption = (opt: MoveOption, isPrimary: boolean) => {
    if (opt.isDrive) {
      return (
        <Link to={`/trip/${tripId}/drive`} className="block">
          <Card className={isPrimary ? 'border-primary/20 bg-primary/5 transition-colors hover:bg-primary/10' : 'opacity-70'}>
            <CardContent className={isPrimary ? 'p-5' : 'p-3.5'}>
              <div className="flex items-center gap-3">
                <div className={`flex shrink-0 items-center justify-center rounded-full bg-primary/10 ${isPrimary ? 'h-11 w-11' : 'h-8 w-8'}`}>
                  <Car className={`text-primary ${isPrimary ? 'h-5 w-5' : 'h-4 w-4'}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold text-foreground ${isPrimary ? 'text-base' : 'text-sm'}`}>{opt.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{opt.reason}</p>
                </div>
                <ChevronRight className={`shrink-0 text-primary/60 ${isPrimary ? 'h-5 w-5' : 'h-4 w-4'}`} />
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
            <div className={`flex shrink-0 items-center justify-center rounded-full bg-muted/60 ${isPrimary ? 'h-11 w-11' : 'h-8 w-8'}`}>
              {getTransportIcon(booking.booking_type, isPrimary ? 'lg' : 'sm')}
            </div>
            <div className="min-w-0 flex-1">
              <p className={`truncate font-semibold ${isPrimary ? 'text-base' : 'text-sm'}`}>{opt.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{opt.reason}</p>
            </div>
            {isPrimary && (booking.address || booking.departure_airport_code) && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 shrink-0 rounded-lg text-xs"
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
                <Navigation className="mr-1 h-3 w-3" />
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
      <AppModuleHeader
        icon={Navigation}
        eyebrow="Movement"
        title={trip.transportation_mode === 'drive' ? 'Driving Mode' : 'Move'}
        description={trip.transportation_mode === 'drive'
          ? 'Review the route, stops, fuel, road conditions, weather, and navigation before the drive starts.'
          : 'The next movement decision and useful backup options for this trip.'}
        status={primary.isDrive ? 'Drive ready' : 'Trip movement'}
        statusTone={primary.isDrive ? 'live' : 'neutral'}
      />
      <ModuleOperatingBrief
        items={[
          {
            icon: Route,
            label: 'Primary move',
            value: primary.label,
            detail: primary.reason,
            tone: 'ready',
          },
          {
            icon: Clock3,
            label: 'Backup',
            value: secondary?.label || 'No backup yet',
            detail: secondary?.reason || 'Add another transport record when timing or plans may shift.',
            tone: secondary ? 'neutral' : 'setup',
          },
          {
            icon: ShieldCheck,
            label: 'Trust check',
            value: primary.isDrive ? 'Route review' : 'Record-backed',
            detail: primary.isDrive ? 'Driving opens the full cockpit for route options and conditions.' : 'This movement item comes from your saved reservation data.',
            tone: 'neutral',
          },
        ]}
        primaryAction={primary.isDrive ? {
          label: 'Open Driving Mode',
          href: `/trip/${tripId}/drive`,
          icon: <Car className="h-4 w-4" />,
        } : undefined}
      />
      <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Primary</h3>
      {renderOption(primary, true)}

      {secondary && (
        <>
          <h3 className="mt-4 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Alternative
          </h3>
          {renderOption(secondary, false)}
        </>
      )}
    </div>
  );
}
