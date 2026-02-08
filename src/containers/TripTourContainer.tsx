/**
 * TripTourContainer - Container component for Trip Tour/Stops tab
 * 
 * Patch 2.3.2: Business Tours Bulk Import & Parsing Engine
 * Patch 2.2.2: Canonical trip containers & bug-fix-at-source architecture
 * 
 * This container:
 * - Fetches tour/stops data through canonical hooks
 * - Handles loading/error/empty states consistently
 * - ENFORCES BUSINESS TIER GATING for bulk import features
 * 
 * CANONICAL HELPERS USED:
 * - useEngagements() for stops list
 * - useAccess() for plan gating (Business tier check)
 * - buildMapsUrl() for stop Maps buttons
 * 
 * PLAN GATING (Patch 2.3.2):
 * - Bulk import is BUSINESS TIER ONLY
 * - canAccessBusinessFeatures controls visibility of import button
 * - Free/Pro users see TourTab without bulk import option
 * 
 * IMPORTANT: Tours are NON-MONETARY stops.
 * They are NEVER included in cost calculations.
 */

import { Trip } from '@/types/database';
import { useEngagements } from '@/hooks/useEngagements';
import { useAccess } from '@/hooks/useAccess';
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
 * Patch 2.3.2: Business tier gating for bulk import
 * - canAccessBusinessFeatures passed to TourTab
 * - Controls visibility of enhanced bulk import dialog
 * 
 * Tours (Engagements) are manual-only and NON-MONETARY.
 */
export function TripTourContainer({ tripId, trip }: TripTourContainerProps) {
  // Canonical data fetching
  const { isLoading, error } = useEngagements(tripId);
  
  // Patch 2.3.2: Business tier access for bulk import
  const { canAccessBusinessFeatures, isLoading: accessLoading } = useAccess();
  
  if (isLoading || accessLoading) {
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
  // Patch 2.3.2: Pass Business access flag to control bulk import visibility
  return (
    <TourTab 
      tripId={tripId}
      trip={trip}
      canBulkImport={canAccessBusinessFeatures}
    />
  );
}
