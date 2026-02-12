/**
 * v2.2.6: Canonical Weather Intelligence
 * 
 * SINGLE SOURCE OF TRUTH for all weather logic in the app.
 * No UI code. No direct API calls from components.
 * All weather normalization happens here.
 */

// ============================================================================
// TYPES
// ============================================================================

export type WeatherCondition =
  | 'sunny'
  | 'partly_cloudy'
  | 'cloudy'
  | 'rain'
  | 'snow'
  | 'ice'
  | 'sleet'
  | 'wind'
  | 'unknown';

export interface WeatherSnapshot {
  dateISO: string;
  locationId: string;
  locationType: 'airport' | 'stay' | 'tour' | 'drive';
  city?: string;
  state?: string;
  country?: string;
  lat?: number;
  lng?: number;
  iataCode?: string;
  postalCode?: string;
  high: number;
  low: number;
  /** Temperature unit the high/low are stored in (always Fahrenheit from API) */
  unit: 'F' | 'C';
  condition: WeatherCondition;
  precipChance?: number;
}

export interface WeatherPill {
  label: string;
  type: 'condition' | 'temperature' | 'precipitation';
  severity: 'info' | 'warning' | 'critical';
}

export interface TripWeatherRequest {
  locationId: string;
  locationType: WeatherSnapshot['locationType'];
  city?: string;
  state?: string;
  country?: string;
  iataCode?: string;
  dateISO: string;
}

// ============================================================================
// CONDITION MAPPING
// ============================================================================

/**
 * Map Open-Meteo condition strings to canonical WeatherCondition
 */
export function normalizeCondition(rawCondition: string): WeatherCondition {
  const c = rawCondition.toLowerCase();
  if (c.includes('thunder')) return 'rain';
  if (c.includes('sleet')) return 'sleet';
  if (c.includes('ice') || c.includes('freezing')) return 'ice';
  if (c.includes('snow')) return 'snow';
  if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return 'rain';
  if (c.includes('wind')) return 'wind';
  if (c.includes('clear') || c.includes('sunny')) return 'sunny';
  if (c.includes('partly')) return 'partly_cloudy';
  if (c.includes('cloud') || c.includes('overcast') || c.includes('fog')) return 'cloudy';
  return 'unknown';
}

/**
 * Get a human-friendly label for a WeatherCondition
 */
export function conditionLabel(condition: WeatherCondition): string {
  switch (condition) {
    case 'sunny': return 'Sunny';
    case 'partly_cloudy': return 'Partly Cloudy';
    case 'cloudy': return 'Cloudy';
    case 'rain': return 'Rain';
    case 'snow': return 'Snow';
    case 'ice': return 'Ice';
    case 'sleet': return 'Sleet';
    case 'wind': return 'Windy';
    case 'unknown': return 'Unknown';
  }
}

// ============================================================================
// WEATHER THRESHOLDS
// ============================================================================

/** Cold threshold in Fahrenheit */
const COLD_THRESHOLD_F = 45;
/** Hot threshold in Fahrenheit */
const HOT_THRESHOLD_F = 90;
/** Cold threshold in Celsius */
const COLD_THRESHOLD_C = 7;
/** Hot threshold in Celsius */
const HOT_THRESHOLD_C = 32;
/** Precipitation chance to flag rain/snow */
const PRECIP_THRESHOLD = 30;

// ============================================================================
// PILL DERIVATION
// ============================================================================

/**
 * Derive up to 3 weather pills from a snapshot.
 * 
 * Rules:
 * 1. Always include one sky condition pill
 * 2. Add temperature pill if Hot (≥90°F/32°C) or Cold (≤45°F/7°C)
 * 3. Add precipitation pill if precipChance ≥ 30% or condition is rain/snow/ice
 * Max 3 pills total.
 * 
 * @param snapshot - Weather data for a specific date/location
 * @param displayUnit - User's preferred unit ('F' or 'C')
 */
export function deriveWeatherPills(
  snapshot: WeatherSnapshot,
  displayUnit: 'F' | 'C' = 'F'
): WeatherPill[] {
  const pills: WeatherPill[] = [];

  // 1. Sky condition pill (always present)
  pills.push({
    label: conditionLabel(snapshot.condition),
    type: 'condition',
    severity: snapshot.condition === 'rain' || snapshot.condition === 'snow' || snapshot.condition === 'ice' || snapshot.condition === 'sleet'
      ? 'warning'
      : 'info',
  });

  // 2. Temperature pill
  const highF = snapshot.unit === 'F' ? snapshot.high : snapshot.high * 9 / 5 + 32;
  const coldThreshold = displayUnit === 'C' ? COLD_THRESHOLD_C : COLD_THRESHOLD_F;
  const hotThreshold = displayUnit === 'C' ? HOT_THRESHOLD_C : HOT_THRESHOLD_F;
  const displayHigh = displayUnit === 'C' ? Math.round((highF - 32) * 5 / 9) : Math.round(highF);

  if (displayHigh >= hotThreshold) {
    pills.push({
      label: `Hot ${displayHigh}°${displayUnit}`,
      type: 'temperature',
      severity: 'warning',
    });
  } else if (displayHigh <= coldThreshold) {
    pills.push({
      label: `Cold ${displayHigh}°${displayUnit}`,
      type: 'temperature',
      severity: 'warning',
    });
  }

  // 3. Precipitation pill (only if not already covered by condition)
  if (pills.length < 3) {
    const hasPrecipCondition = ['rain', 'snow', 'ice', 'sleet'].includes(snapshot.condition);
    const hasPrecipChance = (snapshot.precipChance ?? 0) >= PRECIP_THRESHOLD;

    if (hasPrecipChance && !hasPrecipCondition) {
      // Condition pill didn't already cover precipitation
      pills.push({
        label: `${snapshot.precipChance}% precip`,
        type: 'precipitation',
        severity: 'info',
      });
    } else if (hasPrecipCondition && snapshot.condition === 'snow' && pills.length < 3) {
      // Add explicit Snow pill if condition is snow (for packing clarity)
      pills.push({
        label: 'Snow',
        type: 'precipitation',
        severity: 'critical',
      });
    }
  }

  return pills.slice(0, 3);
}

// ============================================================================
// TRIP WEATHER REQUEST BUILDER
// ============================================================================

/**
 * Build weather requests from canonical trip state.
 * Examines bookings to determine which dates/locations need weather data.
 * 
 * @param tripState - Object with trip, bookings, and timeline info
 */
export function buildTripWeatherRequests(tripState: {
  trip: {
    destination_city: string;
    destination_country: string;
    destination_state?: string | null;
    start_date: string;
    end_date: string;
  };
  timelineEvents: Array<{
    bookingType: string;
    datetime: Date;
    eventLocalDateTime?: string;
    departureAirportCode?: string;
    arrivalAirportCode?: string;
    address?: string;
  }>;
}): TripWeatherRequest[] {
  const requests: TripWeatherRequest[] = [];
  const seen = new Set<string>();

  const { trip } = tripState;

  // Generate date range for the trip destination (primary weather)
  const start = new Date(trip.start_date);
  const end = new Date(trip.end_date);
  const destId = `dest::${trip.destination_city}`;

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateISO = d.toISOString().slice(0, 10);
    const key = `${dateISO}::${destId}`;
    if (!seen.has(key)) {
      seen.add(key);
      requests.push({
        locationId: destId,
        locationType: 'drive', // default for destination
        city: trip.destination_city,
        state: trip.destination_state || undefined,
        country: trip.destination_country,
        dateISO,
      });
    }
  }

  // Add airport-specific requests for flight events
  for (const event of tripState.timelineEvents) {
    if (event.bookingType === 'flight') {
      // v2.2.5: Extract date from eventLocalDateTime string — no Date() timezone shifting.
      const dateISO = event.eventLocalDateTime ? event.eventLocalDateTime.substring(0, 10) : null;
      if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) continue;
      
      if (event.departureAirportCode) {
        const locId = `airport::${event.departureAirportCode}`;
        const key = `${dateISO}::${locId}`;
        if (!seen.has(key)) {
          seen.add(key);
          requests.push({
            locationId: locId,
            locationType: 'airport',
            iataCode: event.departureAirportCode,
            dateISO,
          });
        }
      }

      if (event.arrivalAirportCode) {
        const locId = `airport::${event.arrivalAirportCode}`;
        const key = `${dateISO}::${locId}`;
        if (!seen.has(key)) {
          seen.add(key);
          requests.push({
            locationId: locId,
            locationType: 'airport',
            iataCode: event.arrivalAirportCode,
            dateISO,
          });
        }
      }
    }
  }

  return requests;
}

// ============================================================================
// SNAPSHOT CREATION FROM EXISTING WEATHER DATA
// ============================================================================

/**
 * Convert existing forecast data (from useWeather hook) into WeatherSnapshots
 * keyed for canonical lookup.
 * 
 * @param forecastDays - Forecast array from useTripWeather
 * @param locationId - Location identifier
 * @param locationType - Type of location
 * @param city - City name
 * @param state - State/region
 * @param country - Country
 */
export function forecastToSnapshots(
  forecastDays: Array<{
    date: string;
    tempHigh: number;
    tempLow: number;
    condition: string;
    precipitation: number;
  }>,
  locationId: string,
  locationType: WeatherSnapshot['locationType'],
  city?: string,
  state?: string,
  country?: string,
): Record<string, WeatherSnapshot> {
  const result: Record<string, WeatherSnapshot> = {};

  for (const day of forecastDays) {
    const key = `${day.date}::${locationId}`;
    result[key] = {
      dateISO: day.date,
      locationId,
      locationType,
      city,
      state,
      country,
      high: day.tempHigh,
      low: day.tempLow,
      unit: 'F', // Open-Meteo returns Fahrenheit in our config
      condition: normalizeCondition(day.condition),
      precipChance: day.precipitation,
    };
  }

  return result;
}

// ============================================================================
// EVENT WEATHER LOOKUP
// ============================================================================

/**
 * Get weather for a specific canonical timeline event.
 * 
 * @param event - A canonical timeline event
 * @param weatherByKey - The weather lookup map from canonical trip state
 * @returns WeatherSnapshot or null if unavailable
 */
export function getWeatherForEvent(
  event: {
    bookingType: string;
    datetime: Date;
    eventLocalDateTime?: string;
    departureAirportCode?: string;
    arrivalAirportCode?: string;
    address?: string;
  },
  weatherByKey: Record<string, WeatherSnapshot>
): WeatherSnapshot | null {
  // v2.2.5: Extract date from eventLocalDateTime string — no Date() timezone shifting.
  const dateISO = event.eventLocalDateTime
    ? event.eventLocalDateTime.substring(0, 10)
    : event.datetime.toISOString().slice(0, 10);

  // Flights → use airport location
  if (event.bookingType === 'flight' && event.departureAirportCode) {
    const airportKey = `${dateISO}::airport::${event.departureAirportCode}`;
    if (weatherByKey[airportKey]) return weatherByKey[airportKey];
  }

  // Try destination fallback for all event types
  // Look for any key matching the date with a 'dest::' prefix
  for (const key of Object.keys(weatherByKey)) {
    if (key.startsWith(`${dateISO}::dest::`)) {
      return weatherByKey[key];
    }
  }

  return null;
}
