/**
 * v3.10.7: WeatherEngine — Always-On Weather Intelligence (Never Blank)
 * 
 * SINGLE SOURCE OF TRUTH for weather mode resolution and seasonal normals.
 * Always returns a deterministic result for any trip — never null, never blank.
 * 
 * Modes:
 * - SEASONAL_NORMALS: >14 days out (bundled averages for date window)
 * - FORECAST_BLEND: 8–14 days out (forecast + normals for remaining)
 * - FORECAST_PRIMARY: ≤7 days out (live forecast)
 * 
 * No timezone/date shifting. Trip dates used as stored.
 */

// ============================================================================
// TYPES
// ============================================================================

export type WeatherMode = 'SEASONAL_NORMALS' | 'FORECAST_BLEND' | 'FORECAST_PRIMARY';
export type WeatherUnavailableReason = 'OUT_OF_RANGE' | 'NO_COORDS' | 'PROVIDER_ERROR' | 'UNKNOWN';
export type AnchorType = 'LODGING' | 'FLIGHT_DESTINATION' | 'TRIP_DESTINATION';

/** v3.10.7: Configurable forecast window (days). Trips beyond this use seasonal normals. */
export const FORECAST_WINDOW_DAYS = 14;
export type PrecipTypeHint = 'rain' | 'snow' | 'mixed' | 'unknown';
export type CloudCoverHint = 'mostly_sunny' | 'mixed' | 'mostly_cloudy' | 'unknown';
export type WindHint = 'calm' | 'breezy' | 'windy' | 'unknown';

export interface WeatherDayEnvelope {
  /** YYYY-MM-DD */
  dateISO: string;
  /** High temperature in Fahrenheit */
  typicalHigh: number;
  /** Low temperature in Fahrenheit */
  typicalLow: number;
  /** Precipitation likelihood bucket */
  precipLikelihood: 'unlikely' | 'possible' | 'likely' | 'unknown';
  /** Type of precipitation expected */
  precipTypeHint: PrecipTypeHint;
  /** Cloud cover tendency */
  cloudCoverHint: CloudCoverHint;
  /** Wind tendency */
  windHint: WindHint;
  /** Whether this day is from forecast or normals */
  source: 'forecast' | 'normals';
}

export interface WeatherAnchor {
  anchorType: AnchorType;
  city: string;
  state?: string;
  country: string;
  label: string;
}

export interface WeatherEngineResult {
  weatherMode: WeatherMode;
  anchor: WeatherAnchor;
  windowStart: string;
  windowEnd: string;
  envelope: WeatherDayEnvelope[];
  /** Summary signals for packing consumption */
  summary: WeatherSummary;
  /** v3.10.7: Human-readable location label (e.g., "Milan, Italy") */
  locationLabel: string;
  /** v3.10.7: Reason when mode is effectively seasonal or data is limited */
  reason?: WeatherUnavailableReason;
  /** v3.10.7: ISO timestamp of when forecast was fetched (forecast modes only) */
  asOf?: string;
}

export interface WeatherSummary {
  avgHigh: number;
  avgLow: number;
  hasRain: boolean;
  hasSnow: boolean;
  hasCold: boolean;
  hasHot: boolean;
  precipTypeHint: PrecipTypeHint;
  cloudCoverHint: CloudCoverHint;
  windHint: WindHint;
}

// ============================================================================
// SEASONAL NORMALS DATA (bundled, no network calls)
// ============================================================================

/**
 * Simplified seasonal normals by latitude band and month.
 * Returns typical high/low in Fahrenheit.
 * This is a bundled dataset — no runtime network calls.
 */
interface SeasonalNormal {
  typicalHigh: number;
  typicalLow: number;
  precipLikelihood: 'unlikely' | 'possible' | 'likely';
  precipTypeHint: PrecipTypeHint;
  cloudCoverHint: CloudCoverHint;
}

// Monthly normals by climate zone (approximated by latitude bands)
// Zones: tropical (0-23°), subtropical (23-35°), temperate (35-55°), continental (55-66°), polar (66+°)
const SEASONAL_NORMALS_BY_ZONE: Record<string, SeasonalNormal[]> = {
  // Index 0=Jan, 11=Dec
  tropical: [
    { typicalHigh: 86, typicalLow: 72, precipLikelihood: 'likely', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 87, typicalLow: 72, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 88, typicalLow: 73, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 89, typicalLow: 74, precipLikelihood: 'likely', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 89, typicalLow: 75, precipLikelihood: 'likely', precipTypeHint: 'rain', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 88, typicalLow: 75, precipLikelihood: 'likely', precipTypeHint: 'rain', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 88, typicalLow: 74, precipLikelihood: 'likely', precipTypeHint: 'rain', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 88, typicalLow: 74, precipLikelihood: 'likely', precipTypeHint: 'rain', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 88, typicalLow: 74, precipLikelihood: 'likely', precipTypeHint: 'rain', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 87, typicalLow: 74, precipLikelihood: 'likely', precipTypeHint: 'rain', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 86, typicalLow: 73, precipLikelihood: 'likely', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 85, typicalLow: 72, precipLikelihood: 'likely', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
  ],
  subtropical: [
    { typicalHigh: 62, typicalLow: 42, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 65, typicalLow: 44, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 72, typicalLow: 50, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 79, typicalLow: 57, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mostly_sunny' },
    { typicalHigh: 85, typicalLow: 65, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mostly_sunny' },
    { typicalHigh: 90, typicalLow: 72, precipLikelihood: 'likely', precipTypeHint: 'rain', cloudCoverHint: 'mostly_sunny' },
    { typicalHigh: 92, typicalLow: 75, precipLikelihood: 'likely', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 92, typicalLow: 75, precipLikelihood: 'likely', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 88, typicalLow: 70, precipLikelihood: 'likely', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 80, typicalLow: 60, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mostly_sunny' },
    { typicalHigh: 70, typicalLow: 50, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 63, typicalLow: 43, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
  ],
  temperate: [
    { typicalHigh: 40, typicalLow: 25, precipLikelihood: 'possible', precipTypeHint: 'snow', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 43, typicalLow: 27, precipLikelihood: 'possible', precipTypeHint: 'mixed', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 52, typicalLow: 33, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 63, typicalLow: 42, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 73, typicalLow: 52, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mostly_sunny' },
    { typicalHigh: 82, typicalLow: 62, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mostly_sunny' },
    { typicalHigh: 86, typicalLow: 67, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mostly_sunny' },
    { typicalHigh: 84, typicalLow: 65, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mostly_sunny' },
    { typicalHigh: 77, typicalLow: 58, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mostly_sunny' },
    { typicalHigh: 65, typicalLow: 47, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 52, typicalLow: 37, precipLikelihood: 'possible', precipTypeHint: 'mixed', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 42, typicalLow: 28, precipLikelihood: 'possible', precipTypeHint: 'snow', cloudCoverHint: 'mostly_cloudy' },
  ],
  continental: [
    { typicalHigh: 28, typicalLow: 12, precipLikelihood: 'possible', precipTypeHint: 'snow', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 32, typicalLow: 15, precipLikelihood: 'possible', precipTypeHint: 'snow', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 42, typicalLow: 24, precipLikelihood: 'possible', precipTypeHint: 'mixed', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 55, typicalLow: 35, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 65, typicalLow: 45, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 75, typicalLow: 55, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mostly_sunny' },
    { typicalHigh: 80, typicalLow: 60, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mostly_sunny' },
    { typicalHigh: 78, typicalLow: 58, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mostly_sunny' },
    { typicalHigh: 68, typicalLow: 48, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 55, typicalLow: 38, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 40, typicalLow: 28, precipLikelihood: 'possible', precipTypeHint: 'snow', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 30, typicalLow: 15, precipLikelihood: 'possible', precipTypeHint: 'snow', cloudCoverHint: 'mostly_cloudy' },
  ],
  polar: [
    { typicalHigh: 15, typicalLow: -5, precipLikelihood: 'possible', precipTypeHint: 'snow', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 18, typicalLow: -2, precipLikelihood: 'possible', precipTypeHint: 'snow', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 28, typicalLow: 8, precipLikelihood: 'possible', precipTypeHint: 'snow', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 40, typicalLow: 22, precipLikelihood: 'possible', precipTypeHint: 'mixed', cloudCoverHint: 'mixed' },
    { typicalHigh: 52, typicalLow: 35, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 62, typicalLow: 45, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 66, typicalLow: 50, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mixed' },
    { typicalHigh: 63, typicalLow: 47, precipLikelihood: 'likely', precipTypeHint: 'rain', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 52, typicalLow: 38, precipLikelihood: 'possible', precipTypeHint: 'rain', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 40, typicalLow: 28, precipLikelihood: 'possible', precipTypeHint: 'mixed', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 25, typicalLow: 10, precipLikelihood: 'possible', precipTypeHint: 'snow', cloudCoverHint: 'mostly_cloudy' },
    { typicalHigh: 18, typicalLow: 0, precipLikelihood: 'possible', precipTypeHint: 'snow', cloudCoverHint: 'mostly_cloudy' },
  ],
};

// Approximate latitude lookup by country/region for climate zone resolution
const LATITUDE_OVERRIDES: Record<string, number> = {
  // Countries
  'iceland': 64, 'norway': 60, 'sweden': 59, 'finland': 61,
  'canada': 50, 'russia': 55, 'uk': 52, 'united kingdom': 52, 'england': 52,
  'germany': 51, 'france': 47, 'italy': 43, 'spain': 40, 'portugal': 39,
  'greece': 38, 'turkey': 39, 'japan': 36, 'south korea': 37, 'china': 35,
  'india': 22, 'thailand': 15, 'vietnam': 16, 'indonesia': -5, 'singapore': 1,
  'australia': -27, 'new zealand': -41, 'south africa': -30, 'brazil': -15,
  'mexico': 23, 'colombia': 5, 'argentina': -34, 'chile': -33, 'peru': -12,
  'egypt': 27, 'morocco': 32, 'kenya': -1, 'nigeria': 9,
  'uae': 24, 'united arab emirates': 24, 'dubai': 25, 'qatar': 25, 'saudi arabia': 24,
  'usa': 39, 'united states': 39, 'us': 39,
  // US States
  'florida': 28, 'fl': 28, 'texas': 31, 'tx': 31, 'california': 36, 'ca': 36,
  'new york': 41, 'ny': 41, 'illinois': 40, 'il': 40, 'colorado': 39, 'co': 39,
  'arizona': 34, 'az': 34, 'hawaii': 21, 'hi': 21, 'alaska': 64, 'ak': 64,
  'minnesota': 46, 'mn': 46, 'wisconsin': 44, 'wi': 44, 'michigan': 44, 'mi': 44,
  'maine': 45, 'me': 45, 'montana': 47, 'mt': 47, 'washington': 47, 'wa': 47,
  'oregon': 44, 'or': 44, 'georgia': 33, 'ga': 33, 'tennessee': 36, 'tn': 36,
  'north carolina': 35, 'nc': 35, 'virginia': 37, 'va': 37, 'ohio': 40, 'oh': 40,
  'massachusetts': 42, 'ma': 42, 'pennsylvania': 41, 'pa': 41,
  'louisiana': 31, 'la': 31, 'mississippi': 33, 'ms': 33, 'alabama': 33, 'al': 33,
  'south carolina': 34, 'sc': 34, 'nevada': 39, 'nv': 39, 'utah': 39, 'ut': 39,
  'new mexico': 35, 'nm': 35, 'idaho': 44, 'id': 44, 'wyoming': 43, 'wy': 43,
  'vermont': 44, 'vt': 44, 'new hampshire': 44, 'nh': 44, 'connecticut': 42, 'ct': 42,
};

export function estimateLatitude(city: string, state?: string, country?: string): number {
  // Try state first (more specific for US)
  if (state) {
    const lat = LATITUDE_OVERRIDES[state.toLowerCase()];
    if (lat !== undefined) return lat;
  }
  // Try country
  if (country) {
    const lat = LATITUDE_OVERRIDES[country.toLowerCase()];
    if (lat !== undefined) return lat;
  }
  // Try city name in overrides
  if (city) {
    const lat = LATITUDE_OVERRIDES[city.toLowerCase()];
    if (lat !== undefined) return lat;
  }
  // Default to temperate
  return 40;
}

export function getClimateZone(latitude: number): string {
  const absLat = Math.abs(latitude);
  if (absLat < 23) return 'tropical';
  if (absLat < 35) return 'subtropical';
  if (absLat < 55) return 'temperate';
  if (absLat < 66) return 'continental';
  return 'polar';
}

// ============================================================================
// CORE ENGINE
// ============================================================================

/**
 * Calculate the number of days from today to a date string (YYYY-MM-DD).
 * Positive = future, negative = past.
 */
function daysFromNow(dateStr: string): number {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  // Simple lexicographic date difference
  const [y1, m1, d1] = todayStr.split('-').map(Number);
  const [y2, m2, d2] = dateStr.split('-').map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  return Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Generate date strings between start and end (inclusive).
 */
function generateDateRange(startStr: string, endStr: string): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const start = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    dates.push(iso);
  }
  return dates;
}

/**
 * Get seasonal normal for a specific date based on climate zone.
 */
function getSeasonalNormal(dateISO: string, zone: string): SeasonalNormal {
  const month = parseInt(dateISO.substring(5, 7), 10) - 1; // 0-indexed
  const normals = SEASONAL_NORMALS_BY_ZONE[zone];
  if (!normals || month < 0 || month > 11) {
    return SEASONAL_NORMALS_BY_ZONE.temperate[0];
  }
  return normals[month];
}

/**
 * Convert a SeasonalNormal to a WeatherDayEnvelope.
 */
function normalToEnvelope(dateISO: string, normal: SeasonalNormal): WeatherDayEnvelope {
  return {
    dateISO,
    typicalHigh: normal.typicalHigh,
    typicalLow: normal.typicalLow,
    precipLikelihood: normal.precipLikelihood,
    precipTypeHint: normal.precipTypeHint,
    cloudCoverHint: normal.cloudCoverHint,
    windHint: 'unknown',
    source: 'normals',
  };
}

/**
 * Convert forecast data to envelope format.
 */
function forecastToEnvelope(forecast: {
  date: string;
  tempHigh: number;
  tempLow: number;
  condition: string;
  precipitation: number;
}): WeatherDayEnvelope {
  const condLower = forecast.condition.toLowerCase();
  let precipTypeHint: PrecipTypeHint = 'unknown';
  if (condLower.includes('snow')) precipTypeHint = 'snow';
  else if (condLower.includes('sleet') || condLower.includes('ice')) precipTypeHint = 'mixed';
  else if (condLower.includes('rain') || condLower.includes('shower') || condLower.includes('drizzle') || condLower.includes('thunder')) precipTypeHint = 'rain';

  let cloudCoverHint: CloudCoverHint = 'unknown';
  if (condLower.includes('clear') || condLower.includes('sunny')) cloudCoverHint = 'mostly_sunny';
  else if (condLower.includes('partly')) cloudCoverHint = 'mixed';
  else if (condLower.includes('cloud') || condLower.includes('overcast') || condLower.includes('fog')) cloudCoverHint = 'mostly_cloudy';

  let precipLikelihood: 'unlikely' | 'possible' | 'likely' = 'unlikely';
  if (forecast.precipitation >= 60) precipLikelihood = 'likely';
  else if (forecast.precipitation >= 30) precipLikelihood = 'possible';

  return {
    dateISO: forecast.date,
    typicalHigh: forecast.tempHigh,
    typicalLow: forecast.tempLow,
    precipLikelihood,
    precipTypeHint,
    cloudCoverHint,
    windHint: 'unknown',
    source: 'forecast',
  };
}

/**
 * Compute summary from envelope.
 */
function computeSummary(envelope: WeatherDayEnvelope[]): WeatherSummary {
  if (envelope.length === 0) {
    return {
      avgHigh: 70, avgLow: 50, hasRain: false, hasSnow: false,
      hasCold: false, hasHot: false,
      precipTypeHint: 'unknown', cloudCoverHint: 'unknown', windHint: 'unknown',
    };
  }

  const avgHigh = Math.round(envelope.reduce((s, d) => s + d.typicalHigh, 0) / envelope.length);
  const avgLow = Math.round(envelope.reduce((s, d) => s + d.typicalLow, 0) / envelope.length);
  const hasRain = envelope.some(d => d.precipTypeHint === 'rain' && d.precipLikelihood !== 'unlikely');
  const hasSnow = envelope.some(d => (d.precipTypeHint === 'snow' || d.precipTypeHint === 'mixed') && d.precipLikelihood !== 'unlikely');
  const hasCold = envelope.some(d => d.typicalHigh <= 45);
  const hasHot = envelope.some(d => d.typicalHigh >= 90);

  // Aggregate dominant signals
  const precipCounts: Record<PrecipTypeHint, number> = { rain: 0, snow: 0, mixed: 0, unknown: 0 };
  const cloudCounts: Record<CloudCoverHint, number> = { mostly_sunny: 0, mixed: 0, mostly_cloudy: 0, unknown: 0 };
  envelope.forEach(d => {
    precipCounts[d.precipTypeHint]++;
    cloudCounts[d.cloudCoverHint]++;
  });

  const precipTypeHint = (Object.entries(precipCounts) as [PrecipTypeHint, number][])
    .sort((a, b) => b[1] - a[1])[0][0];
  const cloudCoverHint = (Object.entries(cloudCounts) as [CloudCoverHint, number][])
    .sort((a, b) => b[1] - a[1])[0][0];

  return { avgHigh, avgLow, hasRain, hasSnow, hasCold, hasHot, precipTypeHint, cloudCoverHint, windHint: 'unknown' };
}

// ============================================================================
// RESOLVE WEATHER MODE
// ============================================================================

export function resolveWeatherMode(startDate: string): WeatherMode {
  const daysOut = daysFromNow(startDate);
  if (daysOut > 14) return 'SEASONAL_NORMALS';
  if (daysOut >= 8) return 'FORECAST_BLEND';
  return 'FORECAST_PRIMARY';
}

// ============================================================================
// MAIN ENGINE FUNCTION
// ============================================================================

export interface WeatherEngineInput {
  /** Trip destination city */
  city: string;
  state?: string;
  country: string;
  /** Trip date range */
  startDate: string;
  endDate: string;
  /** Lodging address (if available, more specific anchor) */
  lodgingCity?: string;
  lodgingState?: string;
  lodgingCountry?: string;
  /** Flight arrival city (if no lodging) */
  flightArrivalCity?: string;
  flightArrivalState?: string;
  flightArrivalCountry?: string;
  /** Live forecast data from existing weather API (if available) */
  forecast?: Array<{
    date: string;
    tempHigh: number;
    tempLow: number;
    condition: string;
    precipitation: number;
  }>;
}

/**
 * Resolve weather for a trip. Always returns a result — never null/empty.
 */
export function resolveWeather(input: WeatherEngineInput): WeatherEngineResult {
  const mode = resolveWeatherMode(input.startDate);

  // Resolve anchor (priority: lodging > flight arrival > trip destination)
  let anchor: WeatherAnchor;
  if (input.lodgingCity) {
    anchor = {
      anchorType: 'LODGING',
      city: input.lodgingCity,
      state: input.lodgingState,
      country: input.lodgingCountry || input.country,
      label: 'Based near your lodging',
    };
  } else if (input.flightArrivalCity) {
    anchor = {
      anchorType: 'FLIGHT_DESTINATION',
      city: input.flightArrivalCity,
      state: input.flightArrivalState,
      country: input.flightArrivalCountry || input.country,
      label: 'Based near arrival airport',
    };
  } else {
    anchor = {
      anchorType: 'TRIP_DESTINATION',
      city: input.city,
      state: input.state,
      country: input.country,
      label: `Based on ${input.city}`,
    };
  }

  const lat = estimateLatitude(anchor.city, anchor.state, anchor.country);
  const zone = getClimateZone(lat);
  const tripDates = generateDateRange(input.startDate, input.endDate);

  // Build envelope based on mode
  const envelope: WeatherDayEnvelope[] = [];
  const forecastByDate = new Map<string, typeof input.forecast extends (infer T)[] ? T : never>();
  if (input.forecast) {
    input.forecast.forEach(f => forecastByDate.set(f.date, f));
  }

  for (const dateISO of tripDates) {
    const forecastDay = forecastByDate.get(dateISO);

    if (mode === 'FORECAST_PRIMARY' && forecastDay) {
      envelope.push(forecastToEnvelope(forecastDay));
    } else if (mode === 'FORECAST_BLEND' && forecastDay) {
      envelope.push(forecastToEnvelope(forecastDay));
    } else {
      // Seasonal normals for this date
      const normal = getSeasonalNormal(dateISO, zone);
      envelope.push(normalToEnvelope(dateISO, normal));
    }
  }

  // v3.10.7: Build location label
  const locationLabel = [anchor.city, anchor.state, anchor.country]
    .filter(Boolean)
    .join(', ');

  // v3.10.7: Determine reason for seasonal mode
  const reason: WeatherUnavailableReason | undefined = 
    mode === 'SEASONAL_NORMALS' ? 'OUT_OF_RANGE' : undefined;

  // v3.10.7: asOf for forecast modes
  const asOf = (mode === 'FORECAST_PRIMARY' || mode === 'FORECAST_BLEND') && input.forecast && input.forecast.length > 0
    ? new Date().toISOString()
    : undefined;

  return {
    weatherMode: mode,
    anchor,
    windowStart: input.startDate,
    windowEnd: input.endDate,
    envelope,
    summary: computeSummary(envelope),
    locationLabel,
    reason,
    asOf,
  };
}
