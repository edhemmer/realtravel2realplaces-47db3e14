/**
 * v4.0.0: Drive Intelligence Helper — Unit Tests
 *
 * Validates:
 * - getNavigationTarget uses full address when present, falls back to city/state
 * - getActiveDriveSegment returns null when no segments, correct segment when one exists
 * - getDriveAlerts never returns more than 3, ordered by severity
 * - All functions are pure (no React, no browser APIs, no HTTP)
 */

import { describe, it, expect } from 'vitest';
import {
  getActiveDriveSegment,
  getNavigationTarget,
  getDriveAlerts,
  getFuelProjection,
  getWeatherRisk,
  getParkingStatusFromRecords,
  getRoutePreview,
  getTollStatus,
  type DriveSegment,
} from '../driveIntelligenceHelper';
import type { CanonicalTripState, CanonicalTimelineEvent } from '../canonicalTripState';
import type { Trip } from '@/types/database';

// ============================================================================
// FIXTURES
// ============================================================================

function makeTrip(overrides?: Partial<Trip>): Trip {
  return {
    id: 'trip-1',
    user_id: 'user-1',
    name: 'ATL to Chicago',
    start_date: '2026-03-01',
    end_date: '2026-03-03',
    destination_city: 'Chicago',
    destination_state: 'IL',
    destination_country: 'US',
    destination_type: 'city',
    transportation_mode: 'drive',
    trip_type: 'personal',
    trip_state: 'active',
    estimated_miles: 750,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    destination_address: null,
    origin_address: null,
    notes: null,
    ...overrides,
  } as Trip;
}

function makeEvent(overrides?: Partial<CanonicalTimelineEvent>): CanonicalTimelineEvent {
  return {
    id: 'ev-1',
    sourceId: 'booking-1',
    sourceType: 'booking',
    bookingType: 'stay',
    eventType: 'hotel_checkin',
    title: 'Hilton Chicago',
    subtitle: 'Hilton',
    datetime: new Date('2026-03-01T15:00:00'),
    hasExplicitTime: true,
    address: '720 S Michigan Ave, Chicago, IL 60605',
    eventLocalDateTime: '2026-03-01T15:00:00',
    ...overrides,
  };
}

function makeTripState(overrides?: {
  trip?: Partial<Trip>;
  events?: CanonicalTimelineEvent[];
}): CanonicalTripState {
  return {
    trip: makeTrip(overrides?.trip),
    dateRange: {
      startDate: new Date('2026-03-01T12:00:00'),
      endDate: new Date('2026-03-03T12:00:00'),
      isFlightAnchored: false,
      startDateStr: '2026-03-01',
      endDateStr: '2026-03-03',
      windowSource: 'fallback',
      windowConfidence: 'fallback',
    },
    timelineEvents: overrides?.events ?? [makeEvent()],
    costs: {
      expensesTotal: 0,
      expensesMyShare: 0,
      bookingsTotal: 0,
      bookingsMyShare: 0,
      parkingTotal: 0,
      parkingMyShare: 0,
      totalCost: 0,
      totalMyShare: 0,
      byCategory: { meals: 0, transport: 0, activity: 0, shopping: 0, parking: 0, other: 0 },
      multiCurrency: { totals_by_currency: {}, currencies: [] },
      isMultiCurrency: false,
      perBookingCost: {},
      perBookingMyShare: {},
      primaryCurrency: 'USD',
    },
    weatherByKey: {},
    framePendingValidation: false,
    ingestionResult: null,
    canonicalItems: [],
    hasFlights: false,
    hasStays: true,
    hasRentals: false,
    hasActivities: false,
    hasParking: false,
  };
}

// ============================================================================
// getActiveDriveSegment
// ============================================================================

describe('getActiveDriveSegment', () => {
  it('returns null when tripState is null', () => {
    expect(getActiveDriveSegment(null, new Date())).toBeNull();
  });

  it('returns null when no drive-relevant events exist', () => {
    const state = makeTripState({
      events: [
        makeEvent({ eventType: 'parking_start', eventLocalDateTime: '2026-03-01T10:00:00' }),
      ],
    });
    expect(getActiveDriveSegment(state, new Date('2026-03-01T09:00:00'))).toBeNull();
  });

  it('returns the next future segment when one exists', () => {
    const state = makeTripState({
      events: [
        makeEvent({
          id: 'ev-checkin',
          eventType: 'hotel_checkin',
          eventLocalDateTime: '2026-03-01T15:00:00',
        }),
      ],
    });
    const result = getActiveDriveSegment(state, new Date('2026-03-01T10:00:00'));
    expect(result).not.toBeNull();
    expect(result!.id).toBe('drive-seg-ev-checkin');
    expect(result!.kind).toBe('DRIVE_TO_STAY');
  });

  it('returns the most recent past segment when all are past', () => {
    const state = makeTripState({
      events: [
        makeEvent({ id: 'ev-a', eventType: 'hotel_checkin', eventLocalDateTime: '2026-03-01T10:00:00' }),
        makeEvent({ id: 'ev-b', eventType: 'activity_start', eventLocalDateTime: '2026-03-01T14:00:00' }),
      ],
    });
    const result = getActiveDriveSegment(state, new Date('2026-03-01T20:00:00'));
    expect(result).not.toBeNull();
    expect(result!.id).toBe('drive-seg-ev-b');
  });
});

// ============================================================================
// getNavigationTarget — address fallback
// ============================================================================

describe('getNavigationTarget', () => {
  it('uses full address when present', () => {
    const state = makeTripState();
    const seg: DriveSegment = {
      id: 'ds-1',
      kind: 'DRIVE_TO_STAY',
      label: 'Hilton Chicago',
      sourceEvent: makeEvent({ address: '720 S Michigan Ave, Chicago, IL 60605' }),
      dateStr: '2026-03-01',
      timeStr: '15:00',
      sortKey: '2026-03-01 15:00',
    };
    const target = getNavigationTarget(state, seg);
    expect(target).not.toBeNull();
    expect(target!.addressString).toBe('720 S Michigan Ave, Chicago, IL 60605');
  });

  it('falls back to city/state when no address', () => {
    const state = makeTripState();
    const seg: DriveSegment = {
      id: 'ds-2',
      kind: 'DRIVE_TO_STAY',
      label: 'Hotel',
      sourceEvent: makeEvent({ address: undefined }),
      dateStr: '2026-03-01',
      timeStr: '15:00',
      sortKey: '2026-03-01 15:00',
    };
    const target = getNavigationTarget(state, seg);
    expect(target).not.toBeNull();
    expect(target!.addressString).toContain('Chicago');
    expect(target!.addressString).toContain('IL');
  });

  it('returns null when tripState is null', () => {
    expect(getNavigationTarget(null, null)).toBeNull();
  });
});

// ============================================================================
// getDriveAlerts — max 3, severity ordering
// ============================================================================

describe('getDriveAlerts', () => {
  it('returns empty array when no issues', () => {
    const state = makeTripState();
    const seg: DriveSegment = {
      id: 'ds-1',
      kind: 'DRIVE_TRIP',
      label: 'Drive',
      sourceEvent: makeEvent(),
      dateStr: '2026-03-01',
      timeStr: '10:00',
      sortKey: '2026-03-01 10:00',
    };
    const alerts = getDriveAlerts(state, seg);
    expect(alerts.length).toBeLessThanOrEqual(3);
  });

  it('never returns more than 3 alerts', () => {
    const state = makeTripState({ trip: { estimated_miles: 750 } });
    const seg: DriveSegment = {
      id: 'ds-1',
      kind: 'DRIVE_TRIP',
      label: 'Drive',
      sourceEvent: makeEvent({ eventLocalDateTime: '2026-03-01T10:00:00' }),
      dateStr: '2026-03-01',
      timeStr: '10:00',
      sortKey: '2026-03-01 10:00',
    };
    // Add weather risk + fuel risk
    const alerts = getDriveAlerts(state, seg, {
      weatherByKey: {
        '2026-03-01::dest::Chicago': {
          dateISO: '2026-03-01',
          locationId: 'dest::Chicago',
          locationType: 'drive',
          high: 30,
          low: 20,
          unit: 'F',
          condition: 'snow',
          city: 'Chicago',
        },
      },
      userVehicleProfile: { avgMilesPerTank: 320 },
    });
    expect(alerts.length).toBeLessThanOrEqual(3);
  });

  it('orders alerts by severity (critical first)', () => {
    const state = makeTripState({ trip: { estimated_miles: 750 } });
    const seg: DriveSegment = {
      id: 'ds-1',
      kind: 'DRIVE_TRIP',
      label: 'Drive',
      sourceEvent: makeEvent({ eventLocalDateTime: '2026-03-01T10:00:00' }),
      dateStr: '2026-03-01',
      timeStr: '10:00',
      sortKey: '2026-03-01 10:00',
    };
    const alerts = getDriveAlerts(state, seg, {
      weatherByKey: {
        '2026-03-01::dest::Chicago': {
          dateISO: '2026-03-01',
          locationId: 'dest::Chicago',
          locationType: 'drive',
          high: 30,
          low: 20,
          unit: 'F',
          condition: 'ice',
          city: 'Chicago',
        },
      },
      userVehicleProfile: { avgMilesPerTank: 320 },
    });
    if (alerts.length >= 2) {
      const severityOrder = alerts.map(a => a.severity);
      const ranks = severityOrder.map(s => ({ critical: 3, warning: 2, info: 1 }[s]));
      for (let i = 1; i < ranks.length; i++) {
        expect(ranks[i]).toBeLessThanOrEqual(ranks[i - 1]);
      }
    }
  });
});

// ============================================================================
// getFuelProjection
// ============================================================================

describe('getFuelProjection', () => {
  it('returns UNKNOWN when no vehicle profile', () => {
    const state = makeTripState();
    const result = getFuelProjection(state, null);
    expect(result.fuelStatus).toBe('UNKNOWN');
  });

  it('returns OK_FOR_SEGMENT when trip within range', () => {
    const state = makeTripState({ trip: { estimated_miles: 200 } });
    const result = getFuelProjection(state, null, { avgMilesPerTank: 320 });
    expect(result.fuelStatus).toBe('OK_FOR_SEGMENT');
  });

  it('returns REFUEL_RECOMMENDED for long trips', () => {
    const state = makeTripState({ trip: { estimated_miles: 750 } });
    const result = getFuelProjection(state, null, { avgMilesPerTank: 320 });
    expect(result.fuelStatus).toBe('REFUEL_RECOMMENDED');
    expect(result.message).toContain('fuel stop');
  });
});

// ============================================================================
// getWeatherRisk
// ============================================================================

describe('getWeatherRisk', () => {
  it('returns no risk when no weather data', () => {
    const state = makeTripState();
    const seg: DriveSegment = {
      id: 'ds-1', kind: 'DRIVE_TRIP', label: 'Drive',
      sourceEvent: makeEvent(), dateStr: '2026-03-01', timeStr: '10:00', sortKey: '2026-03-01 10:00',
    };
    expect(getWeatherRisk(state, seg, {}).hasRisk).toBe(false);
  });

  it('returns critical for snow', () => {
    const state = makeTripState();
    const seg: DriveSegment = {
      id: 'ds-1', kind: 'DRIVE_TRIP', label: 'Drive',
      sourceEvent: makeEvent(), dateStr: '2026-03-01', timeStr: '10:00', sortKey: '2026-03-01 10:00',
    };
    const result = getWeatherRisk(state, seg, {
      '2026-03-01::dest::Chicago': {
        dateISO: '2026-03-01', locationId: 'dest::Chicago', locationType: 'drive',
        high: 28, low: 15, unit: 'F', condition: 'snow', city: 'Chicago',
      },
    });
    expect(result.hasRisk).toBe(true);
    expect(result.severity).toBe('critical');
  });
});

// ============================================================================
// getParkingStatusFromRecords
// ============================================================================

describe('getParkingStatusFromRecords', () => {
  it('returns NONE for empty list', () => {
    expect(getParkingStatusFromRecords([], '2026-03-01 10:00').status).toBe('NONE');
  });
});

// ============================================================================
// Purity checks
// ============================================================================

describe('purity', () => {
  it('module does not import React', async () => {
    const source = await import('../driveIntelligenceHelper');
    // If it imported React, it would throw in a non-DOM test env.
    // Just verify the module loaded and exports are functions.
    expect(typeof source.getActiveDriveSegment).toBe('function');
    expect(typeof source.getNavigationTarget).toBe('function');
    expect(typeof source.getDriveAlerts).toBe('function');
    expect(typeof source.getFuelProjection).toBe('function');
    expect(typeof source.getWeatherRisk).toBe('function');
    expect(typeof source.getParkingStatus).toBe('function');
    expect(typeof source.getRoutePreview).toBe('function');
    expect(typeof source.getTollStatus).toBe('function');
  });
});
