/**
 * TripTourContainer - Container component for Trip Tour/Stops tab
 * 
 * Patch 2.2.2: Canonical trip containers & bug-fix-at-source architecture
 * 
 * This container:
 * - Fetches tour/stops data through canonical hooks
 * - Handles loading/error/empty states consistently
 * 
 * CANONICAL HELPERS USED:
 * - useEngagements() for stops list
 * - buildMapsUrl() for stop Maps buttons
 * 
 * IMPORTANT: Tours are NON-MONETARY stops.
 * They are NEVER included in cost calculations.
 */

import { Trip } from '@/types/database';
import { useEngagements } from '@/hooks/useEngagements';
import { TripSectionLoading, TripSectionError } from '@/components/trips/TripSectionStates';
import { TourTab } from '@/components/trips/tabs/TourTab';

interface TripTourContainerProps {
  tripId: string;
  trip?: Trip;
}

/**
 * Container that wires canonical hooks to TourTab
 * 
 * TourTab internally uses:
 * - useEngagements() for stops data
 * - buildMapsUrl() for Maps navigation
 * 
 * Tours (Engagements) are manual-only and NON-MONETARY.
 */
export function TripTourContainer({ tripId, trip }: TripTourContainerProps) {
  // Canonical data fetching
  const { isLoading, error } = useEngagements(tripId);
  
  if (isLoading) {
    return <TripSectionLoading message="Loading tour stops..." />;
  }
  
  if (error) {
    return (
      <TripSectionError 
        message="We couldn't load your tour stops. Please try again."
      />
    );
  }
  
  // Render the presentational view
  // TourTab handles its own data fetching and mutations internally
  return (
    <TourTab 
      tripId={tripId}
      trip={trip}
    />
  );
}
