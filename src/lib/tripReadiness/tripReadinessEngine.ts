/**
 * v3.12.0: Canonical Trip Readiness Engine (Pure, Deterministic)
 *
 * Synthesizes canonical trip state, weather, and drive engine results
 * into a deterministic set of briefing cards. No async, no network I/O.
 *
 * Card types: NEXT_ACTION, WEATHER, TRANSPORT_SUMMARY, DRIVE_READINESS, DATA_FIX
 */

import type { CanonicalTimelineEvent, CanonicalDateRange } from '@/lib/canonicalTripState';
import type { WeatherEngineResult, WeatherMode } from '@/lib/weatherEngine';
import type { DrivePlan } from '@/types/drive';
import type { PlanTier } from '@/utils/planTier';
import { tierIncludesPro } from '@/utils/planTier';
import type { TripActivationIssue } from '@/lib/tripActivation/tripActivation';
import { detectDuplicateCompanions } from '@/lib/travelers/travelerIdentity';

// ============================================================================
// TYPES
// ============================================================================

export type TripReadinessStatus = 'UPCOMING' | 'ACTIVE' | 'PAST';

export type TripReadinessCardType =
  | 'NEXT_ACTION'
  | 'WEATHER'
  | 'TRANSPORT_SUMMARY'
  | 'DRIVE_READINESS'
  | 'DATA_FIX';

export interface TripReadinessCard {
  type: TripReadinessCardType;
  title: string;
  subtitle?: string;
  /** Additional detail lines */
  details?: string[];
  /** Action CTA label */
  actionLabel?: string;
  /** Action target (route or anchor) */
  actionTarget?: string;
  /** Severity for DATA_FIX cards */
  severity?: 'info' | 'warning';
}

export interface TripReadinessBrief {
  tripId: string;
  status: TripReadinessStatus;
  tripWindow: { startDate: string; endDate: string };
  cards: TripReadinessCard[];
}

export interface TripReadinessInput {
  tripId: string;
  /** Trip start/end dates as stored (YYYY-MM-DD) */
  tripStartDate: string;
  tripEndDate: string;
  /** Canonical timeline events (already normalized/sorted) */
  timelineEvents: CanonicalTimelineEvent[];
  /** Canonical date range (computed from confirmations) */
  dateRange: CanonicalDateRange | null;
  /** WeatherEngine result */
  weather: WeatherEngineResult | null;
  /** DrivePlan (null if not a drive trip) */
  drivePlan: DrivePlan | null;
  /** Plan tier */
  planTier: PlanTier;
  /** Transportation mode */
  transportationMode: string;
  /** Whether trip has flights */
  hasFlights: boolean;
  /** Companion names for duplicate detection */
  companionNames?: string[];
  /** User's avg miles per tank */
  avgMilesPerTank?: number | null;
  /** v3.12.3: Activation issues from trip activation orchestrator */
  activationIssues?: TripActivationIssue[];
}

// ============================================================================
// STATUS RESOLVER
// ============================================================================

function resolveStatus(startDate: string, endDate: string): TripReadinessStatus {
  const today = getTodayStr();
  if (today < startDate) return 'UPCOMING';
  if (today > endDate) return 'PAST';
  return 'ACTIVE';
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysDiff(from: string, to: string): number {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  const a = new Date(y1, m1 - 1, d1);
  const b = new Date(y2, m2 - 1, d2);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================================
// TRIP WINDOW DERIVATION
// ============================================================================

function deriveTripWindow(
  dateRange: CanonicalDateRange | null,
  timelineEvents: CanonicalTimelineEvent[],
  fallbackStart: string,
  fallbackEnd: string,
): { startDate: string; endDate: string } {
  // Use canonical date range if available (already confirmation-derived)
  if (dateRange && dateRange.windowSource === 'canonicalTimeline') {
    return { startDate: dateRange.startDateStr, endDate: dateRange.endDateStr };
  }

  // Derive from timeline events directly
  if (timelineEvents.length > 0) {
    const dates = timelineEvents
      .map(e => e.eventLocalDateTime?.substring(0, 10))
      .filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d));

    if (dates.length > 0) {
      dates.sort();
      let start = dates[0];
      let end = dates[dates.length - 1];
      // Anchor dates extend only
      if (fallbackStart < start) start = fallbackStart;
      if (fallbackEnd > end) end = fallbackEnd;
      return { startDate: start, endDate: end };
    }
  }

  return { startDate: fallbackStart, endDate: fallbackEnd };
}

// ============================================================================
// CARD RESOLVERS
// ============================================================================

function resolveNextActionCard(
  status: TripReadinessStatus,
  timelineEvents: CanonicalTimelineEvent[],
  tripStartDate: string,
): TripReadinessCard {
  const today = getTodayStr();

  if (status === 'PAST') {
    return {
      type: 'NEXT_ACTION',
      title: 'Trip completed',
    };
  }

  if (status === 'ACTIVE') {
    // Find next upcoming event after now
    const upcoming = timelineEvents.find(e => {
      const eventDate = e.eventLocalDateTime?.substring(0, 10);
      return eventDate && eventDate >= today;
    });

    if (upcoming) {
      const timeStr = upcoming.eventLocalDateTime?.substring(11, 16);
      return {
        type: 'NEXT_ACTION',
        title: upcoming.title,
        subtitle: upcoming.subtitle,
        details: timeStr ? [`${timeStr}`] : undefined,
      };
    }

    return {
      type: 'NEXT_ACTION',
      title: 'Trip in progress',
      subtitle: 'Enjoy your trip!',
    };
  }

  // UPCOMING
  const daysOut = daysDiff(today, tripStartDate);

  if (daysOut > 14) {
    return {
      type: 'NEXT_ACTION',
      title: 'Planning mode',
      subtitle: `${daysOut} days until departure`,
    };
  }

  // Within 24 hours or close — show first departure
  const firstEvent = timelineEvents[0];
  if (firstEvent) {
    const timeStr = firstEvent.eventLocalDateTime?.substring(11, 16);
    return {
      type: 'NEXT_ACTION',
      title: firstEvent.title,
      subtitle: daysOut <= 1 ? 'Departing soon' : firstEvent.subtitle,
      details: timeStr ? [`${timeStr}`] : undefined,
    };
  }

  return {
    type: 'NEXT_ACTION',
    title: 'Trip starts soon',
    subtitle: `${daysOut} day${daysOut !== 1 ? 's' : ''} away`,
  };
}

function resolveWeatherCard(weather: WeatherEngineResult | null): TripReadinessCard {
  if (!weather) {
    return {
      type: 'WEATHER',
      title: 'Weather',
      subtitle: 'Add a destination to activate the weather window.',
    };
  }

  const { weatherMode, summary, locationLabel, envelope } = weather;

  if (weatherMode === 'SEASONAL_NORMALS') {
    const month = envelope.length > 0
      ? new Date(envelope[0].dateISO + 'T12:00:00').toLocaleString('en-US', { month: 'long' })
      : '';
    return {
      type: 'WEATHER',
      title: `Weather — ${locationLabel}`,
      subtitle: `Seasonal averages for ${month}`,
      details: [
        `Typical high: ${Math.round(summary.avgHigh)}°F / Low: ${Math.round(summary.avgLow)}°F`,
        summary.hasRain ? 'Rain possible' : summary.hasSnow ? 'Snow possible' : 'Generally dry',
        'Forecast updates closer to travel.',
      ],
    };
  }

  // FORECAST_BLEND or FORECAST_PRIMARY
  return {
    type: 'WEATHER',
    title: `Weather — ${locationLabel}`,
    subtitle: weatherMode === 'FORECAST_PRIMARY' ? 'Live forecast' : 'Forecast + seasonal blend',
    details: [
      `High: ${Math.round(summary.avgHigh)}°F / Low: ${Math.round(summary.avgLow)}°F`,
      summary.hasRain ? 'Rain expected' : summary.hasSnow ? 'Snow expected' : 'Clear conditions expected',
    ],
  };
}

function resolveTransportSummaryCard(
  timelineEvents: CanonicalTimelineEvent[],
  hasFlights: boolean,
  transportationMode: string,
  drivePlan: DrivePlan | null,
): TripReadinessCard | null {
  const details: string[] = [];

  if (hasFlights) {
    const flights = timelineEvents.filter(e => e.bookingType === 'flight');
    if (flights.length > 0) {
      const first = flights[0];
      const last = flights[flights.length - 1];

      const firstRoute = first.departureAirportCode && first.arrivalAirportCode
        ? `${first.departureAirportCode} → ${first.arrivalAirportCode}`
        : first.title;
      const firstTime = first.departureLocalTime?.substring(11, 16) || '';

      details.push(`First flight: ${firstRoute}${firstTime ? ` · ${firstTime}` : ''}`);

      if (flights.length > 1) {
        const lastRoute = last.departureAirportCode && last.arrivalAirportCode
          ? `${last.departureAirportCode} → ${last.arrivalAirportCode}`
          : last.title;
        const lastTime = last.arrivalLocalTime?.substring(11, 16) || '';
        details.push(`Last flight: ${lastRoute}${lastTime ? ` · ${lastTime}` : ''}`);
      }
    }
  }

  if (transportationMode === 'drive' && drivePlan?.routeSummary) {
    const rs = drivePlan.routeSummary;
    const hours = Math.round(rs.durationMinutes / 60);
    details.push(`Drive: ${Math.round(rs.distanceMiles)} mi · ~${hours}h`);
  }

  if (details.length === 0) return null;

  return {
    type: 'TRANSPORT_SUMMARY',
    title: 'Transport',
    details,
  };
}

function resolveDriveReadinessCard(
  planTier: PlanTier,
  transportationMode: string,
  drivePlan: DrivePlan | null,
  avgMilesPerTank: number | null | undefined,
): TripReadinessCard | null {
  // Only for Pro/Business + drive trips
  if (!tierIncludesPro(planTier)) return null;
  if (transportationMode !== 'drive') return null;

  if (!avgMilesPerTank || avgMilesPerTank <= 0) {
    return {
      type: 'DRIVE_READINESS',
      title: 'Drive Readiness',
      subtitle: 'Add vehicle range to enable fuel readiness.',
      actionLabel: 'Add Vehicle Range',
      actionTarget: '/account#vehicle-range',
    };
  }

  const details: string[] = [];

  if (drivePlan?.fuelIntelligence.enabled && drivePlan.fuelPlan) {
    if (drivePlan.fuelPlan.estimatedStops > 0) {
      details.push(`~${drivePlan.fuelPlan.estimatedStops} fuel stop${drivePlan.fuelPlan.estimatedStops !== 1 ? 's' : ''} recommended (${drivePlan.fuelPlan.tripMiles} mi trip).`);
    } else {
      details.push(`No fuel stops needed — within range (${drivePlan.fuelPlan.tripMiles} mi trip).`);
    }
  } else if (drivePlan?.fuelIntelligence.enabled && !drivePlan.fuelPlan) {
    details.push('Fuel readiness enabled. Route distance needed for stop estimates.');
  } else {
    details.push('Fuel readiness enabled.');
  }

  if (drivePlan?.fuelIntelligence.enabled && drivePlan.fuelIntelligence.stopZones.length > 0) {
    const zones = drivePlan.fuelIntelligence.stopZones;
    const areaLabels = zones.map(z => z.areaLabel).filter(Boolean);
    if (areaLabels.length > 0) {
      details.push(`Plan to fuel up ${areaLabels.join(', ')}.`);
    } else {
      details.push(`${zones.length} fuel window${zones.length !== 1 ? 's' : ''} identified.`);
    }
  }

  return {
    type: 'DRIVE_READINESS',
    title: 'Drive Readiness',
    details,
    actionLabel: drivePlan?.fuelPlan ? 'View fuel options' : 'View drive details',
    actionTarget: '#drive-suggestions',
  };
}

function resolveDataFixCards(
  tripWindow: { startDate: string; endDate: string },
  storedStart: string,
  storedEnd: string,
  companionNames?: string[],
  activationIssues?: TripActivationIssue[],
): TripReadinessCard[] {
  const fixes: TripReadinessCard[] = [];

  // A) Trip window mismatch
  if (tripWindow.startDate !== storedStart || tripWindow.endDate !== storedEnd) {
    fixes.push({
      type: 'DATA_FIX',
      title: 'Trip dates updated',
      subtitle: 'Trip dates updated to match your itinerary.',
      severity: 'info',
    });
  }

  // B) Companion duplicates — v3.12.3: use canonical traveler identity dedup
  if (companionNames && companionNames.length > 1) {
    if (detectDuplicateCompanions(companionNames)) {
      fixes.push({
        type: 'DATA_FIX',
        title: 'Possible duplicate companions',
        subtitle: 'Possible duplicate companions detected. Review.',
        actionLabel: 'Manage Companions',
        actionTarget: '#companions',
        severity: 'warning',
      });
    }
  }

  // C) v3.12.3: Activation issues (airport unresolvable, stay missing address)
  if (activationIssues && activationIssues.length > 0) {
    // Group by code to avoid spam
    const codesSeen = new Set<string>();
    for (const issue of activationIssues) {
      if (codesSeen.has(issue.code)) continue;
      codesSeen.add(issue.code);

      let actionLabel: string | undefined;
      let actionTarget: string | undefined;

      if (issue.code === 'AIRPORT_UNRESOLVABLE') {
        actionLabel = 'Review Bookings';
        actionTarget = '#bookings';
      } else if (issue.code === 'STAY_MISSING_ADDRESS') {
        actionLabel = 'Edit Lodging';
        actionTarget = '#bookings';
      }

      fixes.push({
        type: 'DATA_FIX',
        title: issue.code === 'AIRPORT_UNRESOLVABLE'
          ? 'Airport not resolved'
          : issue.code === 'STAY_MISSING_ADDRESS'
            ? 'Lodging address missing'
            : 'Data issue',
        subtitle: issue.message,
        actionLabel,
        actionTarget,
        severity: 'warning',
      });
    }
  }

  return fixes;
}

// ============================================================================
// MAIN: BUILD TRIP READINESS BRIEF
// ============================================================================

export function buildTripReadinessBrief(input: TripReadinessInput): TripReadinessBrief {
  const {
    tripId,
    tripStartDate,
    tripEndDate,
    timelineEvents,
    dateRange,
    weather,
    drivePlan,
    planTier,
    transportationMode,
    hasFlights,
    companionNames,
    avgMilesPerTank,
    activationIssues,
  } = input;

  // 1. Derive trip window
  const tripWindow = deriveTripWindow(dateRange, timelineEvents, tripStartDate, tripEndDate);

  // 2. Resolve status from derived window
  const status = resolveStatus(tripWindow.startDate, tripWindow.endDate);

  // 3. Build cards in fixed order
  const cards: TripReadinessCard[] = [];

  // Always: NEXT_ACTION
  cards.push(resolveNextActionCard(status, timelineEvents, tripWindow.startDate));

  // Always: WEATHER
  cards.push(resolveWeatherCard(weather));

  // TRANSPORT_SUMMARY (when applicable)
  const transportCard = resolveTransportSummaryCard(timelineEvents, hasFlights, transportationMode, drivePlan);
  if (transportCard) cards.push(transportCard);

  // DRIVE_READINESS (Pro/Business + drive only)
  const driveCard = resolveDriveReadinessCard(planTier, transportationMode, drivePlan, avgMilesPerTank);
  if (driveCard) cards.push(driveCard);

  // DATA_FIX (only when issues detected) — v3.12.3: includes activation issues
  const dataFixes = resolveDataFixCards(tripWindow, tripStartDate, tripEndDate, companionNames, activationIssues);
  cards.push(...dataFixes);

  return {
    tripId,
    status,
    tripWindow,
    cards,
  };
}
