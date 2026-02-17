/**
 * v3.8.12: Canonical Item Validator
 * 
 * Hard validation rules applied AFTER normalization.
 * Produces structured warnings/errors for items that need user attention.
 * Does NOT modify items — only flags issues.
 */

import type { CanonicalItem, CanonicalWarning } from './canonicalTypes';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationResult {
  /** Whether the item passed all hard validations */
  isValid: boolean;
  /** Validation warnings (item can still be used but needs review) */
  warnings: CanonicalWarning[];
  /** Validation errors (item is incomplete or corrupted) */
  errors: CanonicalWarning[];
}

// ============================================================================
// VALIDATORS PER CONCEPT
// ============================================================================

function validateFlight(item: Extract<CanonicalItem, { type: 'flight' }>): ValidationResult {
  const warnings: CanonicalWarning[] = [];
  const errors: CanonicalWarning[] = [];

  if (!item.startDatetime) {
    errors.push({ code: 'MISSING_START_DATETIME', field: 'startDatetime', message: 'Flight is missing departure datetime' });
  }

  if (!item.departureAirportCode) {
    warnings.push({
      code: 'MISSING_DEPARTURE_IATA',
      field: 'departureAirportCode',
      message: item.departureAirportName
        ? `Departure airport name "${item.departureAirportName}" could not be resolved to an IATA code`
        : 'Departure airport code is missing',
    });
  }

  if (!item.arrivalAirportCode) {
    warnings.push({
      code: 'MISSING_ARRIVAL_IATA',
      field: 'arrivalAirportCode',
      message: item.arrivalAirportName
        ? `Arrival airport name "${item.arrivalAirportName}" could not be resolved to an IATA code`
        : 'Arrival airport code is missing',
    });
  }

  // Flag contamination warnings carried over from normalization
  if (item.rawEvidence.length > 0) {
    warnings.push({
      code: 'FIELD_CONTAMINATION_DETECTED',
      field: 'rawEvidence',
      message: `${item.rawEvidence.length} field(s) had contaminated values moved to rawEvidence`,
    });
  }

  return { isValid: errors.length === 0, warnings, errors };
}

function validateLodging(item: Extract<CanonicalItem, { type: 'stay' }>): ValidationResult {
  const warnings: CanonicalWarning[] = [];
  const errors: CanonicalWarning[] = [];

  if (!item.startDatetime) {
    errors.push({ code: 'MISSING_START_DATETIME', field: 'startDatetime', message: 'Lodging is missing check-in datetime' });
  }
  if (!item.endDatetime) {
    warnings.push({ code: 'MISSING_END_DATETIME', field: 'endDatetime', message: 'Lodging is missing check-out datetime' });
  }
  if (!item.propertyName && !item.vendorName) {
    warnings.push({ code: 'MISSING_PROPERTY_NAME', field: 'propertyName', message: 'Lodging property name is missing' });
  }

  if (item.rawEvidence.length > 0) {
    warnings.push({ code: 'FIELD_CONTAMINATION_DETECTED', field: 'rawEvidence', message: `${item.rawEvidence.length} field(s) had contaminated values` });
  }

  return { isValid: errors.length === 0, warnings, errors };
}

function validateCarRental(item: Extract<CanonicalItem, { type: 'car_rental' }>): ValidationResult {
  const warnings: CanonicalWarning[] = [];
  const errors: CanonicalWarning[] = [];

  if (!item.startDatetime) {
    errors.push({ code: 'MISSING_START_DATETIME', field: 'startDatetime', message: 'Car rental is missing pickup datetime' });
  }
  if (!item.pickupLocation) {
    warnings.push({ code: 'MISSING_PICKUP_LOCATION', field: 'pickupLocation', message: 'Car rental pickup location is missing' });
  }

  if (item.rawEvidence.length > 0) {
    warnings.push({ code: 'FIELD_CONTAMINATION_DETECTED', field: 'rawEvidence', message: `${item.rawEvidence.length} field(s) had contaminated values` });
  }

  return { isValid: errors.length === 0, warnings, errors };
}

function validateGeneric(item: CanonicalItem): ValidationResult {
  const warnings: CanonicalWarning[] = [];
  const errors: CanonicalWarning[] = [];

  if ('startDatetime' in item && !item.startDatetime) {
    warnings.push({ code: 'MISSING_START_DATETIME', field: 'startDatetime', message: 'Start datetime is missing' });
  }

  if ('rawEvidence' in item && item.rawEvidence.length > 0) {
    warnings.push({ code: 'FIELD_CONTAMINATION_DETECTED', field: 'rawEvidence', message: `${item.rawEvidence.length} field(s) had contaminated values` });
  }

  return { isValid: errors.length === 0, warnings, errors };
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Validate a canonical item and return structured results.
 * Does NOT modify the item.
 */
export function validateCanonicalItem(item: CanonicalItem): ValidationResult {
  switch (item.type) {
    case 'flight': return validateFlight(item);
    case 'stay': return validateLodging(item);
    case 'car_rental': return validateCarRental(item);
    default: return validateGeneric(item);
  }
}

/**
 * Validate all items and return a summary.
 */
export function validateCanonicalItems(items: CanonicalItem[]): {
  allValid: boolean;
  results: Array<{ item: CanonicalItem; validation: ValidationResult }>;
  totalWarnings: number;
  totalErrors: number;
} {
  const results = items.map(item => ({
    item,
    validation: validateCanonicalItem(item),
  }));

  const totalWarnings = results.reduce((sum, r) => sum + r.validation.warnings.length, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.validation.errors.length, 0);

  return {
    allValid: totalErrors === 0,
    results,
    totalWarnings,
    totalErrors,
  };
}
