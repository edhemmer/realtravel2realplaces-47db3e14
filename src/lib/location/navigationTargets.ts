/**
 * v3.12.2: Canonical Navigation Target Builder
 * 
 * The ONLY allowed way to build map links in the app.
 * Converts a LocationRef into a navigation target with
 * the best available precision.
 */

import type { LocationRef } from './locationTypes';

// ============================================================================
// TYPES
// ============================================================================

export type NavTargetKind = 'COORDS' | 'ADDRESS' | 'QUERY';

export interface NavTarget {
  /** How precise the target is */
  kind: NavTargetKind;
  /** URL-ready value (coords string, encoded address, or search query) */
  value: string;
  /** Human-readable label for display */
  label: string;
}

// ============================================================================
// BUILDER
// ============================================================================

/**
 * Build a navigation target from a LocationRef.
 * Returns null if no usable location data exists.
 * 
 * Precision cascade:
 *   COORDS → ADDRESS → QUERY
 */
export function buildNavTarget(ref: LocationRef | null | undefined): NavTarget | null {
  if (!ref) return null;

  // 1. Coordinates available → most precise
  if (ref.lat != null && ref.lng != null) {
    return {
      kind: 'COORDS',
      value: `${ref.lat},${ref.lng}`,
      label: ref.label,
    };
  }

  // 2. Full address available
  if (ref.address && ref.address.trim().length > 0) {
    return {
      kind: 'ADDRESS',
      value: ref.address.trim(),
      label: ref.label,
    };
  }

  // 3. Query from label/iata
  if (ref.kind === 'AIRPORT' && ref.iata) {
    return {
      kind: 'QUERY',
      value: `${ref.iata} Airport`,
      label: ref.label,
    };
  }

  if (ref.label && ref.label.trim().length > 0) {
    // Build a richer query with city context
    const parts = [ref.label.trim()];
    if (ref.city && !ref.label.includes(ref.city)) parts.push(ref.city);
    if (ref.state && !ref.label.includes(ref.state)) parts.push(ref.state);
    return {
      kind: 'QUERY',
      value: parts.join(', '),
      label: ref.label,
    };
  }

  return null;
}

// ============================================================================
// MAPS URL BUILDERS
// ============================================================================

/**
 * Build a Google Maps directions URL from a NavTarget.
 */
export function buildMapsUrl(target: NavTarget): string {
  if (target.kind === 'COORDS') {
    return `https://www.google.com/maps/dir/?api=1&destination=${target.value}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target.value)}`;
}

/**
 * Open Google Maps in a new tab for a NavTarget.
 */
export function openNavTarget(target: NavTarget): void {
  const url = buildMapsUrl(target);

  // 1) Try breakout from iframe/sandbox environments
  try {
    const topWin = window.top;
    if (topWin && typeof topWin.open === 'function') {
      const opened = topWin.open(url, '_blank', 'noopener,noreferrer');
      if (opened) return;
    }
  } catch {
    // Cross-origin or sandbox access may throw; fall through.
  }

  // 2) Fallback to current window popup
  try {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened) return;
  } catch {
    // Popup may be blocked; fall through.
  }

  // 3) Guaranteed fallback so click always does something
  window.location.assign(url);
}

/**
 * Build a Google Maps search URL from a NavTarget.
 */
export function buildMapsSearchUrl(target: NavTarget): string {
  if (target.kind === 'COORDS') {
    return `https://www.google.com/maps/search/?api=1&query=${target.value}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target.value)}`;
}
