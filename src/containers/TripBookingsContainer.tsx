/**
 * TripBookingsContainer - Container component for Trip Bookings tab
 * 
 * Patch 2.2.2: Canonical trip containers & bug-fix-at-source architecture
 */

import { Trip } from '@/types/database';
import { useBookings } from '@/hooks/useBookings';
import { TripSectionLoading, TripSectionError } from '@/components/trips/TripSectionStates';
import { BookingsTab } from '@/components/trips/tabs/BookingsTab';
import { GuestAddLodgingCard } from '@/components/trips/GuestAddLodgingCard';
import { useFlightAirportRepair } from '@/hooks/useFlightAirportRepair';
import { AppModuleHeader } from '@/components/trips/AppModuleHeader';
import { ModuleOperatingBrief } from '@/components/trips/ModuleOperatingBrief';
import { useTripPermission } from '@/pages/TripDetail';
import { CalendarClock, Plane, ScanLine, ShieldCheck } from 'lucide-react';

interface TripBookingsContainerProps {
  tripId: string;
  trip?: Trip;
  highlightId?: string;
  onHighlightConsumed?: () => void;
}

export function TripBookingsContainer({ 
  tripId, 
  trip,
  highlightId, 
  onHighlightConsumed 
}: TripBookingsContainerProps) {
  const { data: bookings = [], isLoading, error } = useBookings(tripId);
  const { isOwner, canAddLodging } = useTripPermission();
  
  useFlightAirportRepair(tripId, trip?.end_date, bookings, isOwner);
  
  if (isLoading) {
    return <TripSectionLoading message="Loading bookings..." />;
  }
  
  if (error) {
    return <TripSectionError message="We couldn't load your bookings. Please try again." />;
  }
  
  return (
    <div className="space-y-4">
      <AppModuleHeader
        icon={Plane}
        eyebrow="Trip records"
        title="Reservations"
        description="Flights, lodging, rentals, transport, and activities become one operating record for the trip."
        status={bookings.length > 0 ? `${bookings.length} records` : 'Setup needed'}
        statusTone={bookings.length > 0 ? 'neutral' : 'setup'}
      />
      <ModuleOperatingBrief
        items={[
          {
            icon: ShieldCheck,
            label: 'Source of truth',
            value: bookings.length > 0 ? `${bookings.length} trip records` : 'No records yet',
            detail: bookings.length > 0 ? 'These records feed timeline, airport, weather, spend, and movement.' : 'Import or add the first reservation to start the operating timeline.',
            tone: bookings.length > 0 ? 'ready' : 'setup',
          },
          {
            icon: CalendarClock,
            label: 'Timeline impact',
            value: bookings.length > 0 ? 'Auto-linked' : 'Waiting',
            detail: 'Flights, stays, rentals, transport, and activities become timed trip steps.',
            tone: bookings.length > 0 ? 'ready' : 'neutral',
          },
          {
            icon: ScanLine,
            label: 'Fast capture',
            value: 'Paste, upload, or manual',
            detail: 'Use confirmation parsing when possible, then review the fields before saving.',
            tone: 'neutral',
          },
        ]}
      />
      {!isOwner && canAddLodging && <GuestAddLodgingCard tripId={tripId} />}
      <BookingsTab
        tripId={tripId}
        highlightId={highlightId}
        onHighlightConsumed={onHighlightConsumed}
      />
    </div>
  );
}
