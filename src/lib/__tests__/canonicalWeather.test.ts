/**
 * v2.2.6: Canonical Weather Intelligence Tests
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeCondition,
  conditionLabel,
  deriveWeatherPills,
  forecastToSnapshots,
  getWeatherForEvent,
  buildTripWeatherRequests,
  type WeatherSnapshot,
} from '../canonicalWeather';

// ============================================================================
// normalizeCondition
// ============================================================================
describe('normalizeCondition', () => {
  it('maps Clear to sunny', () => {
    expect(normalizeCondition('Clear')).toBe('sunny');
  });

  it('maps Partly Cloudy', () => {
    expect(normalizeCondition('Partly Cloudy')).toBe('partly_cloudy');
  });

  it('maps Rainy/Showers to rain', () => {
    expect(normalizeCondition('Rainy')).toBe('rain');
    expect(normalizeCondition('Showers')).toBe('rain');
    expect(normalizeCondition('Drizzle')).toBe('rain');
  });

  it('maps Thunderstorm to rain', () => {
    expect(normalizeCondition('Thunderstorm')).toBe('rain');
  });

  it('maps Snowy to snow', () => {
    expect(normalizeCondition('Snowy')).toBe('snow');
    expect(normalizeCondition('Snow Showers')).toBe('snow');
  });

  it('maps Foggy to cloudy', () => {
    expect(normalizeCondition('Foggy')).toBe('cloudy');
  });

  it('returns unknown for unrecognized', () => {
    expect(normalizeCondition('Xyzzy')).toBe('unknown');
  });
});

// ============================================================================
// deriveWeatherPills
// ============================================================================
describe('deriveWeatherPills', () => {
  const baseSnapshot: WeatherSnapshot = {
    dateISO: '2026-02-11',
    locationId: 'dest::Denver',
    locationType: 'drive',
    high: 72,
    low: 45,
    unit: 'F',
    condition: 'sunny',
  };

  it('always includes a sky condition pill', () => {
    const pills = deriveWeatherPills(baseSnapshot);
    expect(pills.length).toBeGreaterThanOrEqual(1);
    expect(pills[0].type).toBe('condition');
    expect(pills[0].label).toBe('Sunny');
  });

  it('adds Hot pill when high >= 90°F', () => {
    const pills = deriveWeatherPills({ ...baseSnapshot, high: 95 });
    expect(pills.some(p => p.label.includes('Hot'))).toBe(true);
  });

  it('adds Cold pill when high <= 45°F', () => {
    const pills = deriveWeatherPills({ ...baseSnapshot, high: 40 });
    expect(pills.some(p => p.label.includes('Cold'))).toBe(true);
  });

  it('respects Celsius unit for thresholds', () => {
    // 40°F = 4°C, which is < 7°C threshold
    const pills = deriveWeatherPills({ ...baseSnapshot, high: 40 }, 'C');
    expect(pills.some(p => p.label.includes('Cold'))).toBe(true);
  });

  it('returns max 3 pills', () => {
    const pills = deriveWeatherPills({
      ...baseSnapshot,
      high: 95,
      condition: 'rain',
      precipChance: 80,
    });
    expect(pills.length).toBeLessThanOrEqual(3);
  });

  it('does not add precip pill if condition already covers rain', () => {
    const pills = deriveWeatherPills({
      ...baseSnapshot,
      condition: 'rain',
      precipChance: 90,
    });
    // Should have Rain condition pill but NOT a separate precip pill
    const precipPills = pills.filter(p => p.type === 'precipitation');
    expect(precipPills.length).toBe(0);
  });

  it('adds precip pill when condition is sunny but precipChance >= 30%', () => {
    const pills = deriveWeatherPills({
      ...baseSnapshot,
      condition: 'sunny',
      precipChance: 50,
    });
    expect(pills.some(p => p.type === 'precipitation')).toBe(true);
  });
});

// ============================================================================
// Same day, different locations (airport dry / stay rainy)
// ============================================================================
describe('getWeatherForEvent - location specificity', () => {
  const weatherByKey: Record<string, WeatherSnapshot> = {
    '2026-02-11::airport::ATL': {
      dateISO: '2026-02-11',
      locationId: 'airport::ATL',
      locationType: 'airport',
      iataCode: 'ATL',
      high: 55,
      low: 40,
      unit: 'F',
      condition: 'sunny',
    },
    '2026-02-11::dest::Denver': {
      dateISO: '2026-02-11',
      locationId: 'dest::Denver',
      locationType: 'drive',
      city: 'Denver',
      high: 48,
      low: 30,
      unit: 'F',
      condition: 'rain',
      precipChance: 70,
    },
  };

  it('returns airport weather for flight event', () => {
    const weather = getWeatherForEvent(
      {
        bookingType: 'flight',
        datetime: new Date('2026-02-11T06:00:00'),
        departureAirportCode: 'ATL',
      },
      weatherByKey
    );
    expect(weather).not.toBeNull();
    expect(weather!.condition).toBe('sunny');
    expect(weather!.iataCode).toBe('ATL');
  });

  it('returns destination weather for stay event on same day', () => {
    const weather = getWeatherForEvent(
      {
        bookingType: 'stay',
        datetime: new Date('2026-02-11T15:00:00'),
      },
      weatherByKey
    );
    expect(weather).not.toBeNull();
    expect(weather!.condition).toBe('rain');
    expect(weather!.city).toBe('Denver');
  });
});

// ============================================================================
// Multi-day trips with changing conditions
// ============================================================================
describe('forecastToSnapshots - multi-day', () => {
  it('creates snapshots for each forecast day', () => {
    const forecast = [
      { date: '2026-02-11', tempHigh: 55, tempLow: 40, condition: 'Clear', precipitation: 0 },
      { date: '2026-02-12', tempHigh: 48, tempLow: 30, condition: 'Rainy', precipitation: 70 },
      { date: '2026-02-13', tempHigh: 35, tempLow: 20, condition: 'Snowy', precipitation: 90 },
    ];

    const snapshots = forecastToSnapshots(forecast, 'dest::Denver', 'drive', 'Denver', 'CO', 'USA');
    
    expect(Object.keys(snapshots)).toHaveLength(3);
    expect(snapshots['2026-02-11::dest::Denver'].condition).toBe('sunny');
    expect(snapshots['2026-02-12::dest::Denver'].condition).toBe('rain');
    expect(snapshots['2026-02-13::dest::Denver'].condition).toBe('snow');
  });
});

// ============================================================================
// Missing data
// ============================================================================
describe('getWeatherForEvent - missing data', () => {
  it('returns null when no weather data exists', () => {
    const weather = getWeatherForEvent(
      {
        bookingType: 'stay',
        datetime: new Date('2026-03-01T10:00:00'),
      },
      {}
    );
    expect(weather).toBeNull();
  });

  it('returns null for unknown airport', () => {
    const weather = getWeatherForEvent(
      {
        bookingType: 'flight',
        datetime: new Date('2026-02-11T06:00:00'),
        departureAirportCode: 'XYZ',
      },
      { '2026-02-11::dest::Denver': {
        dateISO: '2026-02-11',
        locationId: 'dest::Denver',
        locationType: 'drive',
        high: 50,
        low: 30,
        unit: 'F',
        condition: 'sunny',
      }}
    );
    // Falls back to destination weather
    expect(weather).not.toBeNull();
    expect(weather!.locationId).toBe('dest::Denver');
  });
});

// ============================================================================
// Unit switching (F / C)
// ============================================================================
describe('deriveWeatherPills - unit switching', () => {
  it('shows Fahrenheit label when unit is F', () => {
    const pills = deriveWeatherPills({
      dateISO: '2026-02-11',
      locationId: 'test',
      locationType: 'drive',
      high: 95,
      low: 70,
      unit: 'F',
      condition: 'sunny',
    }, 'F');
    const hotPill = pills.find(p => p.type === 'temperature');
    expect(hotPill).toBeDefined();
    expect(hotPill!.label).toContain('°F');
  });

  it('shows Celsius label when unit is C', () => {
    const pills = deriveWeatherPills({
      dateISO: '2026-02-11',
      locationId: 'test',
      locationType: 'drive',
      high: 95, // 35°C
      low: 70,
      unit: 'F',
      condition: 'sunny',
    }, 'C');
    const hotPill = pills.find(p => p.type === 'temperature');
    expect(hotPill).toBeDefined();
    expect(hotPill!.label).toContain('°C');
  });
});

// ============================================================================
// buildTripWeatherRequests
// ============================================================================
describe('buildTripWeatherRequests', () => {
  it('generates destination requests for each trip day', () => {
    const requests = buildTripWeatherRequests({
      trip: {
        destination_city: 'Denver',
        destination_country: 'USA',
        destination_state: 'CO',
        start_date: '2026-02-11',
        end_date: '2026-02-13',
      },
      timelineEvents: [],
    });

    const destRequests = requests.filter(r => r.locationId.startsWith('dest::'));
    expect(destRequests).toHaveLength(3);
    expect(destRequests.map(r => r.dateISO)).toEqual(['2026-02-11', '2026-02-12', '2026-02-13']);
  });

  it('adds airport requests for flight events', () => {
    const requests = buildTripWeatherRequests({
      trip: {
        destination_city: 'Denver',
        destination_country: 'USA',
        start_date: '2026-02-11',
        end_date: '2026-02-14',
      },
      timelineEvents: [
        {
          bookingType: 'flight',
          datetime: new Date('2026-02-11T06:00:00'),
          departureAirportCode: 'ATL',
          arrivalAirportCode: 'DEN',
        },
      ],
    });

    const airportRequests = requests.filter(r => r.locationType === 'airport');
    expect(airportRequests).toHaveLength(2); // ATL and DEN
    expect(airportRequests.map(r => r.iataCode).sort()).toEqual(['ATL', 'DEN']);
  });
});
