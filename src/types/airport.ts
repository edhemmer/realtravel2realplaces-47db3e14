/**
 * v2.0.3: Airport Data Foundation
 * Internal types for airport context - backend use only
 * No UI components should reference these types directly
 */

/**
 * Airport context object for internal use
 * Populated only from parsed flight confirmations
 */
export interface AirportContext {
  /** IATA airport code (e.g., DEN, LAX, JFK) */
  airport_code: string;
  /** Full airport name when available */
  airport_name: string | null;
  /** City where airport is located */
  city: string | null;
  /** Country where airport is located */
  country: string | null;
  /** Whether landside features are supported (future use) */
  landside_supported: boolean;
  /** Whether airside features are supported (future use) */
  airside_supported: boolean;
}

/**
 * Flight airport data extracted from bookings
 * Used for internal processing only
 */
export interface FlightAirportData {
  departure: AirportContext | null;
  arrival: AirportContext | null;
}

/**
 * Creates an AirportContext with default values
 * @param code - IATA airport code
 * @param name - Optional airport name
 */
export function createAirportContext(
  code: string,
  name?: string | null,
  city?: string | null,
  country?: string | null
): AirportContext {
  return {
    airport_code: code.toUpperCase(),
    airport_name: name || null,
    city: city || null,
    country: country || null,
    landside_supported: false,
    airside_supported: false,
  };
}

/**
 * Validates an IATA airport code format
 * @param code - Code to validate
 * @returns true if valid 3-letter IATA format
 */
export function isValidIATACode(code: string | null | undefined): boolean {
  if (!code) return false;
  return /^[A-Z]{3}$/i.test(code.trim());
}
