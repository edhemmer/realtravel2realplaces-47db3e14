/**
 * v3.9.17: Canonical Flight Display Model
 *
 * Single source of truth for rendering flight information across all surfaces.
 * Produces a structured FlightDisplayModel from booking or timeline data,
 * ensuring IATA codes, local times (no timezone math), and next-day rollover
 * are always correctly represented.
 *
 * NO Date objects. NO timezone math. String-only operations.
 */

import { extractDateOnly, extractTimeHHMM, formatDateOnly } from './canonicalTimePolicy';
import { UNKNOWN_TIME_PLACEHOLDER } from './datetimeIntegrity';
import { hasFlightTime } from './timeDisplay';

// ============================================================================
// TYPES
// ============================================================================

export interface FlightDisplayModel {
  /** Departure IATA code (e.g., "TFS"), null if unavailable */
  depIata: string | null;
  /** Arrival IATA code (e.g., "MXP"), null if unavailable */
  arrIata: string | null;
  /** Departure airport name fallback */
  depName: string | null;
  /** Arrival airport name fallback */
  arrName: string | null;
  /** Formatted departure date (e.g., "Fri, Mar 20") */
  depDate: string | null;
  /** Formatted departure time (e.g., "7:15 AM" or "07:15") */
  depTime: string | null;
  /** Formatted arrival date (e.g., "Sat, Mar 21") */
  arrDate: string | null;
  /** Formatted arrival time (e.g., "11:05 AM" or "11:05") */
  arrTime: string | null;
  /** Whether arrival is on a different date than departure */
  isNextDay: boolean;
  /** Raw departure date (YYYY-MM-DD) for comparison */
  depDateRaw: string | null;
  /** Raw arrival date (YYYY-MM-DD) for comparison */
  arrDateRaw: string | null;
  /** Route display string: "TFS → MXP" or "Tenerife → Milan Malpensa" */
  routeDisplay: string;
  /** Confirmation number */
  confirmationNumber: string | null;
  /** Whether departure has explicit time */
  hasDepTime: boolean;
  /** Whether arrival has explicit time */
  hasArrTime: boolean;
}

// ============================================================================
// IATA VALIDATION
// ============================================================================

const IATA_REGEX = /^[A-Z]{3}$/;

function validateIata(code: string | null | undefined): string | null {
  if (!code) return null;
  const trimmed = code.trim().toUpperCase();
  return IATA_REGEX.test(trimmed) ? trimmed : null;
}

// ============================================================================
// TIME FORMATTING (pure string, no Date)
// ============================================================================

/**
 * Format HH:mm string to 12h or 24h display.
 * Handles midnight (00:xx) correctly as 12:xx AM.
 * Unlike formatLocalTimeDirect, does NOT suppress 00:00 — flights can depart/arrive at midnight.
 */
function formatTimeHHMM(hhmm: string | null, use24h: boolean): string | null {
  if (!hhmm) return null;
  const match = hhmm.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = match[2];

  if (use24h) {
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 || 12;
  return `${h12}:${minutes} ${period}`;
}

// ============================================================================
// MAIN BUILDER
// ============================================================================

export interface BuildFlightDisplayInput {
  departureAirportCode?: string | null;
  arrivalAirportCode?: string | null;
  departureAirportName?: string | null;
  arrivalAirportName?: string | null;
  confirmationNumber?: string | null;
  /** Stored departure datetime (digits = local time) */
  startDatetime?: string | null;
  /** Stored arrival datetime (digits = local time) */
  endDatetime?: string | null;
  /** Pre-resolved departure local time HH:mm (from timeline events) */
  departureLocalTime?: string | null;
  /** Pre-resolved arrival local time HH:mm (from timeline events) */
  arrivalLocalTime?: string | null;
  /** Whether departure has explicit time */
  hasDepartureTime?: boolean;
  /** Whether arrival has explicit time */
  hasArrivalTime?: boolean;
  /** 24h format preference */
  use24h?: boolean;
}

/**
 * Build a canonical FlightDisplayModel from booking or timeline data.
 * All times are extracted as string digits — no timezone math.
 */
export function buildFlightDisplayModel(input: BuildFlightDisplayInput): FlightDisplayModel {
  const use24h = input.use24h ?? false;

  // IATA codes
  const depIata = validateIata(input.departureAirportCode);
  const arrIata = validateIata(input.arrivalAirportCode);
  const depName = input.departureAirportName?.trim() || null;
  const arrName = input.arrivalAirportName?.trim() || null;

  // Route display: always prefer IATA codes
  const depDisplay = depIata || depName || '—';
  const arrDisplay = arrIata || arrName || '—';
  const routeDisplay = (depDisplay !== '—' || arrDisplay !== '—')
    ? `${depDisplay} → ${arrDisplay}`
    : '';

  // Departure date/time
  const depDateRaw = extractDateOnly(input.startDatetime);
  const depDate = depDateRaw ? formatDateOnly(depDateRaw, { includeDayOfWeek: true }) : null;

  // v3.9.39: Use hasFlightTime (does not suppress midnight) instead of hasExplicitTime
  const depHasTime = input.hasDepartureTime ?? hasFlightTime(input.departureLocalTime, input.startDatetime);
  let depTimeStr: string | null = null;
  if (depHasTime) {
    if (input.departureLocalTime) {
      depTimeStr = formatTimeHHMM(input.departureLocalTime, use24h);
    } else {
      const hhmm = extractTimeHHMM(input.startDatetime);
      depTimeStr = formatTimeHHMM(hhmm, use24h);
    }
  }

  // Arrival date/time
  const arrDateRaw = extractDateOnly(input.endDatetime);
  const arrDate = arrDateRaw ? formatDateOnly(arrDateRaw, { includeDayOfWeek: true }) : null;

  // v3.9.39: Use hasFlightTime (does not suppress midnight) instead of hasExplicitTime
  const arrHasTime = input.hasArrivalTime ?? hasFlightTime(input.arrivalLocalTime, input.endDatetime);
  let arrTimeStr: string | null = null;
  if (arrHasTime) {
    if (input.arrivalLocalTime) {
      arrTimeStr = formatTimeHHMM(input.arrivalLocalTime, use24h);
    } else {
      const hhmm = extractTimeHHMM(input.endDatetime);
      arrTimeStr = formatTimeHHMM(hhmm, use24h);
    }
  }

  // Next-day detection: purely from parsed dates
  const isNextDay = !!(depDateRaw && arrDateRaw && arrDateRaw !== depDateRaw);

  return {
    depIata,
    arrIata,
    depName,
    arrName,
    depDate,
    depTime: depTimeStr,
    arrDate,
    arrTime: arrTimeStr,
    isNextDay,
    depDateRaw,
    arrDateRaw,
    routeDisplay,
    confirmationNumber: input.confirmationNumber?.trim() || null,
    hasDepTime: depHasTime,
    hasArrTime: arrHasTime,
  };
}

// ============================================================================
// SUBTITLE LINE BUILDER (for compact display)
// ============================================================================

/**
 * Build a single-line flight subtitle for compact views (timeline, card subtitle).
 * Pattern: TFS → MXP • Dep 7:15 AM • Arr 11:05 AM (+1)
 */
export function buildFlightSubtitleLine(model: FlightDisplayModel): string {
  const parts: string[] = [];

  if (model.routeDisplay) {
    parts.push(model.routeDisplay);
  }

  if (model.confirmationNumber) {
    parts.push(`Conf: ${model.confirmationNumber}`);
  }

  if (model.hasDepTime && model.depTime) {
    parts.push(`Dep ${model.depTime}`);
  }

  if (model.hasArrTime && model.arrTime) {
    const nextDayMarker = model.isNextDay ? ' (+1)' : '';
    parts.push(`Arr ${model.arrTime}${nextDayMarker}`);
  }

  return parts.length > 0 ? parts.join(' • ') : 'Flight details pending';
}
