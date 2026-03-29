/**
 * v5.2.1: Proactive Insight Engine
 *
 * Deterministic, phase-aware insight generation using ONLY
 * canonicalTripState and canonicalWeather. No AI, no polling,
 * no persistence, no new data sources.
 */

import type { CanonicalTripState, CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import type { WeatherSnapshot } from '@/lib/canonicalWeather';
import { getLocalNowString } from '@/lib/canonicalNextStop';

// ============================================================================
// TYPES
// ============================================================================

export interface ProactiveInsight {
  id: string;
  type: 'time' | 'weather' | 'logistics' | 'risk';
  priority: 'high' | 'medium' | 'low';
  message: string;
  action?: string;
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
  // Must have location or be a type that requires arrival
  const hasLocation = !!(ev.address || ev.departureAirportCode || ev.arrivalAirportCode);
  const requiresArrival = ['flight', 'flight_departure', 'hotel_checkin', 'rental_pickup', 'activity_start', 'transport_departure', 'engagement_start'].includes(ev.eventType);
  return hasLocation || requiresArrival;
}

// ============================================================================
// SAFE TIME PARSING
// ============================================================================

function safeMinutesUntil(eventLocalDateTime: string): number | null {
  // Only parse if we have at least YYYY-MM-DDTHH:mm
  if (!eventLocalDateTime || eventLocalDateTime.length < 16) return null;
  const timePart = eventLocalDateTime.substring(11, 16); // HH:mm
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
  return diff >= 0 ? diff : null; // past events return null
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
    if (mins <= 30) priority = 'high';
    else if (mins <= 60) priority = 'medium';
    else priority = 'low';

    return {
      id: `time-${ev.id}`,
      type: 'time',
      priority,
      message: `Leave in ~${mins} minutes to stay on time`,
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

  // Rain check
  const rainy = todaySnapshots.find((w) => (w.precipChance ?? 0) >= 50);
  if (rainy) {
    return {
      id: 'weather-rain',
      type: 'weather',
      priority: 'high',
      message: 'Rain likely today — consider bringing an umbrella or adjusting plans',
    };
  }

  // Temperature drop check (≥10°F spread)
  const maxHigh = Math.max(...todaySnapshots.map((w) => w.high));
  const minLow = Math.min(...todaySnapshots.map((w) => w.low));
  if (maxHigh - minLow >= 10) {
    return {
      id: 'weather-temp',
      type: 'weather',
      priority: 'medium',
      message: 'Conditions changing later — consider appropriate preparation',
    };
  }

  // Night shift — check if current hour is within 2 hours of sunset proxy (18:00)
  const nowStr = getLocalNowString();
  const nowH = parseInt(nowStr.substring(11, 13), 10);
  if (!isNaN(nowH) && nowH >= 16 && nowH <= 18) {
    return {
      id: 'weather-night',
      type: 'weather',
      priority: 'low',
      message: 'Evening approaching — temperatures will drop, plan for cooler conditions',
    };
  }

  return null;
}

function logisticsInsights(eligible: CanonicalTimelineEvent[]): ProactiveInsight[] {
  const results: ProactiveInsight[] = [];
  const todayStr = getLocalNowString().substring(0, 10);

  // Filter to today's eligible events with parseable times
  const todayEvents = eligible.filter(
    (ev) =>
      ev.eventLocalDateTime &&
      ev.eventLocalDateTime.substring(0, 10) === todayStr &&
      ev.eventLocalDateTime.length >= 16
  );

  // Schedule density: ≥3 events within 4-hour window
  if (todayEvents.length >= 3) {
    // Check for any 4-hour window containing ≥3 events
    for (let i = 0; i <= todayEvents.length - 3; i++) {
      const startMin = parseMinutes(todayEvents[i].eventLocalDateTime!);
      const endMin = parseMinutes(todayEvents[i + 2].eventLocalDateTime!);
      if (startMin !== null && endMin !== null && endMin - startMin <= 240) {
        // Check for overlapping times
        let hasOverlap = false;
        for (let j = i; j < i + 2; j++) {
          const a = parseMinutes(todayEvents[j].eventLocalDateTime!);
          const b = parseMinutes(todayEvents[j + 1].eventLocalDateTime!);
          if (a !== null && b !== null && a === b) hasOverlap = true;
        }
        results.push({
          id: 'logistics-density',
          type: 'logistics',
          priority: hasOverlap ? 'high' : 'medium',
          message: 'Tight schedule — allow buffer or adjust plans',
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
        message: 'You have free time — consider exploring nearby',
      });
      break;
    }
  }

  return results;
}

function riskInsight(eligible: CanonicalTimelineEvent[]): ProactiveInsight | null {
  const todayStr = getLocalNowString().substring(0, 10);

  // Find next upcoming eligible event
  for (const ev of eligible) {
    if (!ev.eventLocalDateTime) continue;
    if (ev.eventLocalDateTime.substring(0, 10) < todayStr) continue;

    const missingLocation = !ev.address && !ev.departureAirportCode && !ev.arrivalAirportCode;
    const missingTime = !ev.eventLocalDateTime || ev.eventLocalDateTime.length < 16;

    if (missingLocation || missingTime) {
      return {
        id: `risk-${ev.id}`,
        type: 'risk',
        priority: 'high',
        message: 'Missing key details — review upcoming step',
      };
    }
    // Only check the next future event
    break;
  }
  return null;
}

// ============================================================================
// HELPERS
// ============================================================================

function parseMinutes(localDateTime: string): number | null {
  if (!localDateTime || localDateTime.length < 16) return null;
  const h = parseInt(localDateTime.substring(11, 13), 10);
  const m = parseInt(localDateTime.substring(14, 16), 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
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

  const allInsights: ProactiveInsight[] = [];

  // Weather + risk available in all phases
  const weather = weatherInsight(state.weatherByKey);
  if (weather) allInsights.push(weather);

  const risk = riskInsight(eligible);
  if (risk) allInsights.push(risk);

  // Time + logistics only for active phase
  if (phase === 'active') {
    const time = timeInsight(eligible);
    if (time) allInsights.push(time);

    const logistics = logisticsInsights(eligible);

    // Dedup: if TIME insight exists, suppress logistics unless HIGH
    if (time) {
      logistics.forEach((l) => {
        if (l.priority === 'high') allInsights.push(l);
      });
    } else {
      allInsights.push(...logistics);
    }
  }

  // Deduplicate: only ONE per type, keep highest priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const byType = new Map<string, ProactiveInsight>();
  for (const insight of allInsights) {
    const existing = byType.get(insight.type);
    if (!existing || priorityOrder[insight.priority] < priorityOrder[existing.priority]) {
      byType.set(insight.type, insight);
    }
  }

  const deduped = Array.from(byType.values());

  // Sort HIGH → MEDIUM → LOW, max 3
  deduped.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  return deduped.slice(0, 3);
}
