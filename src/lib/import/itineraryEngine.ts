/**
 * v3.9.70: Canonical Itinerary Engine
 *
 * Pure aggregation helper that extracts flights, lodgings, and car rentals
 * from an array of ParsedConfirmations into a canonical itinerary structure.
 *
 * RULES:
 * - No side effects — pure aggregation only
 * - No timezone math, no date conversion
 * - Raw strings preserved as-is for display
 * - Reuses existing FlightLeg from types.ts (no type duplication)
 */

import type { ParsedConfirmation, FlightLeg } from './types';

// ============================================================================
// TYPES
// ============================================================================

/** Wraps existing FlightLeg with confirmation-level context */
export interface CanonicalFlightLeg {
  /** The underlying FlightLeg data */
  leg: FlightLeg;
  /** Parent confirmation ID for tracing */
  confirmationId: string;
  /** Confirmation number / booking reference */
  confirmationNumber: string | null;
  /** Vendor / airline name from the confirmation */
  vendorName: string | null;
}

export interface CanonicalLodgingStay {
  /** Source confirmation ID */
  confirmationId: string;
  /** Confirmation / booking reference */
  confirmationNumber: string | null;
  /** Property or hotel name */
  propertyName: string | null;
  /** Vendor name */
  vendorName: string | null;
  /** Address / location */
  address: string | null;
  /** Raw check-in string exactly from confirmation (display-safe) */
  rawCheckInString: string | null;
  /** Raw check-out string exactly from confirmation (display-safe) */
  rawCheckOutString: string | null;
  /** Total cost */
  totalCost: number | null;
  /** Cost currency */
  costCurrency: string | null;
  /** Whether this needs review */
  needsReview: boolean;
}

export interface CanonicalCarRental {
  /** Source confirmation ID */
  confirmationId: string;
  /** Confirmation / booking reference */
  confirmationNumber: string | null;
  /** Vendor / rental company name */
  vendorName: string | null;
  /** Pickup location */
  pickupLocation: string | null;
  /** Dropoff / return location */
  dropoffLocation: string | null;
  /** Raw pickup datetime string exactly from confirmation (display-safe) */
  rawPickupString: string | null;
  /** Raw dropoff datetime string exactly from confirmation (display-safe) */
  rawDropoffString: string | null;
  /** Total cost */
  totalCost: number | null;
  /** Cost currency */
  costCurrency: string | null;
  /** Whether this needs review */
  needsReview: boolean;
}

export interface CanonicalItinerary {
  flights: CanonicalFlightLeg[];
  lodgings: CanonicalLodgingStay[];
  cars: CanonicalCarRental[];
}

// ============================================================================
// CORE
// ============================================================================

/**
 * Build a canonical itinerary from all parsed confirmations.
 * Pure aggregation — no side effects, no date conversion.
 */
export function buildCanonicalItinerary(
  confirmations: ParsedConfirmation[],
): CanonicalItinerary {
  const flights: CanonicalFlightLeg[] = [];
  const lodgings: CanonicalLodgingStay[] = [];
  const cars: CanonicalCarRental[] = [];

  for (const conf of confirmations) {
    switch (conf.type) {
      case 'FLIGHT':
        for (const leg of conf.legs) {
          flights.push({
            leg,
            confirmationId: conf.confirmationId,
            confirmationNumber: conf.confirmationNumber,
            vendorName: conf.vendorName,
          });
        }
        break;

      case 'LODGING':
        lodgings.push({
          confirmationId: conf.confirmationId,
          confirmationNumber: conf.confirmationNumber,
          propertyName: conf.propertyName,
          vendorName: conf.vendorName,
          address: conf.address,
          rawCheckInString: conf.rawStartString,
          rawCheckOutString: conf.rawEndString,
          totalCost: conf.totalCost,
          costCurrency: conf.costCurrency,
          needsReview: conf.needsReview,
        });
        break;

      case 'CAR_RENTAL':
        cars.push({
          confirmationId: conf.confirmationId,
          confirmationNumber: conf.confirmationNumber,
          vendorName: conf.vendorName,
          pickupLocation: conf.address || null,
          dropoffLocation: null, // Not yet in ParsedConfirmation; can extend later
          rawPickupString: conf.rawStartString,
          rawDropoffString: conf.rawEndString,
          totalCost: conf.totalCost,
          costCurrency: conf.costCurrency,
          needsReview: conf.needsReview,
        });
        break;

      default:
        // ACTIVITY, TRANSPORT, OTHER — not yet modeled as canonical itinerary items
        // They still flow through timeline creation via the non-flight path
        break;
    }
  }

  return { flights, lodgings, cars };
}
