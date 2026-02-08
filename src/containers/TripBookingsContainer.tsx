/**
 * TripBookingsContainer - Container component for Trip Bookings tab
 * 
 * Patch 2.2.2: Canonical trip containers & bug-fix-at-source architecture
 * 
 * This container:
 * - Fetches booking data through canonical hooks
 * - Provides normalized per-booking costs for display
 * - Handles loading/error/empty states consistently
 * 
 * CANONICAL HELPERS USED:
 * - useBookings() for bookings data
 * - normalizeFlightBookingCosts() for per-booking costs (Frontier-style)
 * - useCompanions() for traveler display
 */

import { Trip } from '@/types/database';
import { useBookings } from '@/hooks/useBookings';
import { TripSectionLoading, TripSectionError } from '@/components/trips/TripSectionStates';
import { BookingsTab } from '@/components/trips/tabs/BookingsTab';

interface TripBookingsContainerProps {
  tripId: string;
  trip?: Trip;
  /** v2.0.7: ID of booking to highlight after drill-through */
  highlightId?: string;
  /** v2.0.7: Callback when highlight has been consumed */
  onHighlightConsumed?: () => void;
}

/**
 * Container that wires canonical hooks to BookingsTab
 * 
 * BookingsTab internally uses:
 * - normalizeFlightBookingCosts() for per-booking costs
 * - getDisplayCostForBooking logic for Frontier-style display
 */
export function TripBookingsContainer({ 
  tripId, 
  trip,
  highlightId, 
  onHighlightConsumed 
}: TripBookingsContainerProps) {
  // Canonical data fetching
  const { isLoading, error } = useBookings(tripId);
  
  if (isLoading) {
    return <TripSectionLoading message="Loading bookings..." />;
  }
  
  if (error) {
    return (
      <TripSectionError 
        message="We couldn't load your bookings. Please try again."
      />
    );
  }
  
  // Render the presentational view
  // BookingsTab handles its own data fetching and mutations internally
  return (
    <BookingsTab 
      tripId={tripId}
      highlightId={highlightId}
      onHighlightConsumed={onHighlightConsumed}
    />
  );
}
