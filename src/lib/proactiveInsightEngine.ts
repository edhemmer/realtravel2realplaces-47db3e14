/**
 * v5.3.0: Proactive Insight Engine
 *
 * Deterministic, phase-aware insight generation using ONLY
 * canonicalTripState and canonicalWeather. No AI, no polling,
 * no persistence, no new data sources.
 *
 * v5.2.2: Adds deterministic action metadata for tap-to-act execution.
 * v5.2.3: Refined message wording for clarity and trust.
 * v5.3.0: Adds predictive forward-awareness for the next 2 eligible events
 *         within 120 minutes, suppressed when a current-state insight of the
 *         same type already exists.
 */

import type { CanonicalTripState, CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import type { WeatherSnapshot } from '@/lib/canonicalWeather';
import { getLocalNowString } from '@/lib/canonicalNextStop';

// ============================================================================
// TYPES
// ============================================================================

export type ProactiveInsightAction =
  | { actionType: 'navigate'; destinationLabel: string }
  | { actionType: 'open_event'; eventId: string }
  | { actionType: 'open_explore' }
  | { actionType: 'open_weather' };

export interface ProactiveInsight {
  id: string;
  type: 'time' | 'weather' | 'logistics' | 'risk';
  priority: 'high' | 'medium' | 'low';
  message: string;
  action?: ProactiveInsightAction;
}

// ============================================================================
// PHASE DETECTION
// ============================================================================

type TripPhase = 'pre-trip' | 'active' | 'post-trip';

function detectPhase(state: CanonicalTripState): TripPhase {
  const today = getLocalNowString().substring(0, 10);
  const start = state.trip.start_date;
  const end = state.trip.end_date;
  if (today > end) return 'post-trip';
  if (today >= start) return 'active';
  return 'pre-trip';
}

// ============================================================================
// EVENT ELIGIBILITY
// ============================================================================

const EXCLUDED_BOOKING_TYPES = new Set(['note', 'placeholder']);

function isEligible(ev: CanonicalTimelineEvent): boolean {
  if (EXCLUDED_BOOKING_TYPES.has(ev.bookingType)) return false;
  if (!ev.eventLocalDateTime) return false;
  const hasLocation = !!(ev.address || ev.departureAirportCode || ev.arrivalAirportCode);
  const requiresArrival = ['flight', 'flight_departure', 'hotel_checkin', 'rental_pickup', 'activity_start', 'transport_departure', 'engagement_start'].includes(ev.eventType);
  return hasLocation || requiresArrival;
}

// ============================================================================
// LOCATION LABEL RESOLVER
// ============================================================================

function resolveLocationLabel(ev: CanonicalTimelineEvent): string | null {
  if (ev.address && ev.address.trim().length > 0) return ev.address;
  if (ev.arrivalAirportCode) return ev.arrivalAirportCode;
  if (ev.departureAirportCode) return ev.departureAirportCode;
  if (ev.title && ev.title.trim().length > 0) return ev.title;
  return null;
}

// ============================================================================
// SAFE TIME PARSING
// ============================================================================

function safeMinutesUntil(eventLocalDateTime: string): number | null {
  if (!eventLocalDateTime || eventLocalDateTime.length < 16) return null;
  const timePart = eventLocalDateTime.substring(11, 16);
  if (!/^\d{2}:\d{2}$/.test(timePart)) return null;

  const nowStr = getLocalNowString();
  const nowDate = nowStr.substring(0, 10);
  const eventDate = eventLocalDateTime.substring(0, 10);
  if (nowDate !== eventDate) return null;

  const nowH = parseInt(nowStr.substring(11, 13), 10);
  const nowM = parseInt(nowStr.substring(14, 16), 10);
  const evH = parseInt(timePart.substring(0, 2), 10);
  const evM = parseInt(timePart.substring(3, 5), 10);

  if (isNaN(nowH) || isNaN(nowM) || isNaN(evH) || isNaN(evM)) return null;

  const diff = (evH * 60 + evM) - (nowH * 60 + nowM);
  return diff >= 0 ? diff : null;
}

// ============================================================================
// RULE FUNCTIONS
// ============================================================================

function timeInsight(eligible: CanonicalTimelineEvent[]): ProactiveInsight | null {
  const todayStr = getLocalNowString().substring(0, 10);

  for (const ev of eligible) {
    if (!ev.eventLocalDateTime) continue;
    if (ev.eventLocalDateTime.substring(0, 10) !== todayStr) continue;

    const mins = safeMinutesUntil(ev.eventLocalDateTime);
    if (mins === null) continue;
    if (mins > 90) continue;

    let priority: ProactiveInsight['priority'];
    let message: string;
    if (mins <= 30) {
      priority = 'high';
      message = 'Leave soon — timing is tight';
    } else if (mins <= 60) {
      priority = 'medium';
      message = `Leave in ~${mins} min — stay on schedule`;
    } else {
      priority = 'low';
      message = 'Next step is coming up — you are on track';
    }

    const locationLabel = resolveLocationLabel(ev);
    const action: ProactiveInsightAction | undefined = locationLabel
      ? { actionType: 'navigate', destinationLabel: locationLabel }
      : undefined;

    return {
      id: `time-${ev.id}`,
      type: 'time',
      priority,
      message,
      action,
    };
  }
  return null;
}

function weatherInsight(weatherByKey: Record<string, WeatherSnapshot>): ProactiveInsight | null {
  const todayStr = getLocalNowString().substring(0, 10);
  const todaySnapshots = Object.values(weatherByKey).filter(
    (w) => w.dateISO === todayStr
  );

  if (todaySnapshots.length === 0) return null;

  const weatherAction: ProactiveInsightAction = { actionType: 'open_weather' };

  const rainy = todaySnapshots.find((w) => (w.precipChance ?? 0) >= 50);
  if (rainy) {
    return {
      id: 'weather-rain',
      type: 'weather',
      priority: 'high',
      message: 'Rain likely later — plan accordingly',
      action: weatherAction,
    };
  }

  const maxHigh = Math.max(...todaySnapshots.map((w) => w.high));
  const minLow = Math.min(...todaySnapshots.map((w) => w.low));
  if (maxHigh - minLow >= 10) {
    return {
      id: 'weather-temp',
      type: 'weather',
      priority: 'medium',
      message: 'Cooler conditions later — bring a layer',
      action: weatherAction,
    };
  }

  const nowStr = getLocalNowString();
  const nowH = parseInt(nowStr.substring(11, 13), 10);
  if (!isNaN(nowH) && nowH >= 16 && nowH <= 18) {
    return {
      id: 'weather-night',
      type: 'weather',
      priority: 'low',
      message: 'It will be darker later — plan accordingly',
      action: weatherAction,
    };
  }

  return null;
}

function logisticsInsights(eligible: CanonicalTimelineEvent[]): ProactiveInsight[] {
  const results: ProactiveInsight[] = [];
  const todayStr = getLocalNowString().substring(0, 10);

  const todayEvents = eligible.filter(
    (ev) =>
      ev.eventLocalDateTime &&
      ev.eventLocalDateTime.substring(0, 10) === todayStr &&
      ev.eventLocalDateTime.length >= 16
  );

  // Schedule density: ≥3 events within 4-hour window
  if (todayEvents.length >= 3) {
    for (let i = 0; i <= todayEvents.length - 3; i++) {
      const startMin = parseMinutes(todayEvents[i].eventLocalDateTime!);
      const endMin = parseMinutes(todayEvents[i + 2].eventLocalDateTime!);
      if (startMin !== null && endMin !== null && endMin - startMin <= 240) {
        let hasOverlap = false;
        for (let j = i; j < i + 2; j++) {
          const a = parseMinutes(todayEvents[j].eventLocalDateTime!);
          const b = parseMinutes(todayEvents[j + 1].eventLocalDateTime!);
          if (a !== null && b !== null && a === b) hasOverlap = true;
        }

        // Action: open the next event in the dense window
        const nextDenseEvent = todayEvents[i];
        const action: ProactiveInsightAction | undefined = nextDenseEvent?.id
          ? { actionType: 'open_event', eventId: nextDenseEvent.id }
          : undefined;

        results.push({
          id: 'logistics-density',
          type: 'logistics',
          priority: hasOverlap ? 'high' : 'medium',
          message: hasOverlap
            ? 'Very tight schedule — delays are more likely'
            : 'Tight schedule — multiple stops are close together',
          action,
        });
        break;
      }
    }
  }

  // Idle gap: gap between eligible events ≥ 3 hours
  for (let i = 0; i < todayEvents.length - 1; i++) {
    const a = parseMinutes(todayEvents[i].eventLocalDateTime!);
    const b = parseMinutes(todayEvents[i + 1].eventLocalDateTime!);
    if (a !== null && b !== null && b - a >= 180) {
      results.push({
        id: 'logistics-gap',
        type: 'logistics',
        priority: 'low',
        message: 'You have a free window — good time to explore',
        action: { actionType: 'open_explore' },
      });
      break;
    }
  }

  return results;
}

function riskInsight(eligible: CanonicalTimelineEvent[]): ProactiveInsight | null {
  const todayStr = getLocalNowString().substring(0, 10);

  for (const ev of eligible) {
    if (!ev.eventLocalDateTime) continue;
    if (ev.eventLocalDateTime.substring(0, 10) < todayStr) continue;

    const missingLocation = !ev.address && !ev.departureAirportCode && !ev.arrivalAirportCode;
    const missingTime = !ev.eventLocalDateTime || ev.eventLocalDateTime.length < 16;

    if (missingLocation || missingTime) {
      const action: ProactiveInsightAction | undefined = ev.id
        ? { actionType: 'open_event', eventId: ev.id }
        : undefined;

      let riskMessage: string;
      if (missingLocation && missingTime) {
        riskMessage = 'Missing key details — review before the next step';
      } else if (missingLocation) {
        riskMessage = 'Missing location details — review before the next step';
      } else {
        riskMessage = 'Missing time details — review before the next step';
      }

      return {
        id: `risk-${ev.id}`,
        type: 'risk',
        priority: 'high',
        message: riskMessage,
        action,
      };
    }
    break;
  }
  return null;
}

// ============================================================================
// HELPERS
// ============================================================================

const priorityOrder: Record<ProactiveInsight['priority'], number> = { high: 0, medium: 1, low: 2 };

function parseMinutes(localDateTime: string): number | null {
  if (!localDateTime || localDateTime.length < 16) return null;
  const h = parseInt(localDateTime.substring(11, 13), 10);
  const m = parseInt(localDateTime.substring(14, 16), 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function safeGapMinutes(a: string, b: string): number | null {
  const aM = parseMinutes(a);
  const bM = parseMinutes(b);
  if (aM === null || bM === null) return null;
  if (a.substring(0, 10) !== b.substring(0, 10)) return null;
  return bM - aM;
}

// ============================================================================
// PREDICTIVE RULES (v5.3.0)
// ============================================================================

function getUpcomingPair(eligible: CanonicalTimelineEvent[]): {
  first: CanonicalTimelineEvent;
  second: CanonicalTimelineEvent;
} | null {
  const todayStr = getLocalNowString().substring(0, 10);
  const upcoming: CanonicalTimelineEvent[] = [];

  for (const ev of eligible) {
    if (!ev.eventLocalDateTime) continue;
    if (ev.eventLocalDateTime.substring(0, 10) !== todayStr) continue;
    const mins = safeMinutesUntil(ev.eventLocalDateTime);
    if (mins === null || mins < 0) continue;
    if (mins > 120) continue;
    upcoming.push(ev);
    if (upcoming.length === 2) break;
  }

  if (upcoming.length < 2) return null;
  return { first: upcoming[0], second: upcoming[1] };
}

function predictiveTimeInsight(eligible: CanonicalTimelineEvent[]): ProactiveInsight | null {
  const pair = getUpcomingPair(eligible);
  if (!pair) return null;
  const gap = safeGapMinutes(pair.first.eventLocalDateTime!, pair.second.eventLocalDateTime!);
  if (gap === null || gap > 30) return null;

  const locationLabel = resolveLocationLabel(pair.first);
  const action: ProactiveInsightAction | undefined = locationLabel
    ? { actionType: 'navigate', destinationLabel: locationLabel }
    : undefined;

  return {
    id: 'pred-time-compression',
    type: 'time',
    priority: 'medium',
    message: 'Upcoming timing looks tight — keep the next steps moving',
    action,
  };
}

function predictiveLogisticsInsight(eligible: CanonicalTimelineEvent[]): ProactiveInsight | null {
  const pair = getUpcomingPair(eligible);
  if (!pair) return null;
  const gap = safeGapMinutes(pair.first.eventLocalDateTime!, pair.second.eventLocalDateTime!);
  if (gap === null || gap > 15) return null;

  const action: ProactiveInsightAction | undefined = pair.first.id
    ? { actionType: 'open_event', eventId: pair.first.id }
    : undefined;

  return {
    id: 'pred-logistics-overlap',
    type: 'logistics',
    priority: 'high',
    message: 'Back-to-back events coming up — delays are more likely',
    action,
  };
}

function predictiveWeatherInsight(weatherByKey: Record<string, WeatherSnapshot>): ProactiveInsight | null {
  const todayStr = getLocalNowString().substring(0, 10);
  const todaySnapshots = Object.values(weatherByKey).filter((w) => w.dateISO === todayStr);
  if (todaySnapshots.length === 0) return null;

  const rainy = todaySnapshots.find((w) => (w.precipChance ?? 0) >= 50);
  const maxHigh = Math.max(...todaySnapshots.map((w) => w.high));
  const minLow = Math.min(...todaySnapshots.map((w) => w.low));
  const hasTempSwing = maxHigh - minLow >= 10;

  if (!rainy && !hasTempSwing) return null;

  return {
    id: 'pred-weather-impact',
    type: 'weather',
    priority: 'medium',
    message: 'Weather may affect upcoming plans — prepare early',
    action: { actionType: 'open_weather' },
  };
}

function predictiveRiskInsight(eligible: CanonicalTimelineEvent[]): ProactiveInsight | null {
  const pair = getUpcomingPair(eligible);
  if (!pair) return null;

  const ev = pair.second;
  const missingLocation = !ev.address && !ev.departureAirportCode && !ev.arrivalAirportCode;
  const missingTime = !ev.eventLocalDateTime || ev.eventLocalDateTime.length < 16;
  if (!missingLocation && !missingTime) return null;

  const action: ProactiveInsightAction | undefined = ev.id
    ? { actionType: 'open_event', eventId: ev.id }
    : undefined;

  return {
    id: `pred-risk-${ev.id}`,
    type: 'risk',
    priority: 'low',
    message: 'An upcoming step is missing details — review it early',
    action,
  };
}

// ============================================================================
// MAIN ENGINE
// ============================================================================

export function computeProactiveInsights(
  state: CanonicalTripState | null
): ProactiveInsight[] {
  if (!state) return [];

  const phase = detectPhase(state);
  if (phase === 'post-trip') return [];

  const eligible = state.timelineEvents.filter(isEligible);

  // ---- Current-state insights ----
  const currentInsights: ProactiveInsight[] = [];

  const weather = weatherInsight(state.weatherByKey);
  if (weather) currentInsights.push(weather);

  const risk = riskInsight(eligible);
  if (risk) currentInsights.push(risk);

  let currentTime: ProactiveInsight | null = null;
  if (phase === 'active') {
    currentTime = timeInsight(eligible);
    if (currentTime) currentInsights.push(currentTime);

    const logistics = logisticsInsights(eligible);
    if (currentTime) {
      logistics.forEach((l) => {
        if (l.priority === 'high') currentInsights.push(l);
      });
    } else {
      currentInsights.push(...logistics);
    }
  }

  // Deduplicate current: one per type, highest priority wins
  const currentByType = new Map<string, ProactiveInsight>();
  for (const insight of currentInsights) {
    const existing = currentByType.get(insight.type);
    if (!existing || priorityOrder[insight.priority] < priorityOrder[existing.priority]) {
      currentByType.set(insight.type, insight);
    }
  }

  // ---- Predictive insights (v5.3.0) — active phase only ----
  const predictive: ProactiveInsight[] = [];

  if (phase === 'active') {
    if (!currentByType.has('time')) {
      const p = predictiveTimeInsight(eligible);
      if (p) predictive.push(p);
    }
    if (!currentByType.has('logistics')) {
      const p = predictiveLogisticsInsight(eligible);
      if (p) predictive.push(p);
    }
    if (!currentByType.has('weather')) {
      const p = predictiveWeatherInsight(state.weatherByKey);
      if (p) predictive.push(p);
    }
    if (!currentByType.has('risk')) {
      const p = predictiveRiskInsight(eligible);
      if (p) predictive.push(p);
    }
  }

  // ---- Merge: current wins per type, then predictive fills gaps ----
  const mergedByType = new Map<string, ProactiveInsight>(currentByType);
  for (const pred of predictive) {
    if (!mergedByType.has(pred.type)) {
      mergedByType.set(pred.type, pred);
    }
  }

  // Sort: priority first, current-state before predictive at same priority
  const currentIds = new Set(Array.from(currentByType.values()).map((i) => i.id));
  const deduped = Array.from(mergedByType.values());
  deduped.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return (currentIds.has(a.id) ? 0 : 1) - (currentIds.has(b.id) ? 0 : 1);
  });
  return deduped.slice(0, 3);
}
