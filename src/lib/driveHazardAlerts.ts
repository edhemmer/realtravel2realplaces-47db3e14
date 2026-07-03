import type { DeviceCoords } from '@/lib/deviceLocation';

export type OfficialDriveHazardSeverity = 'info' | 'warning' | 'critical';

export interface OfficialDriveHazardPoint {
  id: string;
  label: string;
  coords: DeviceCoords;
}

export interface OfficialDriveHazardAlert {
  id: string;
  event: string;
  headline: string;
  areaDesc: string;
  severity: OfficialDriveHazardSeverity;
  urgency?: string;
  certainty?: string;
  instruction?: string;
  description?: string;
  effective?: string;
  expires?: string;
  sourceLabel: string;
  pointLabel: string;
  roadRisk: boolean;
}

export interface RouteWeatherPoint {
  id: string;
  label: string;
  coords: DeviceCoords;
  routeRatio: number;
  targetLocalTime?: string;
}

export interface RouteWeatherRisk {
  id: string;
  pointLabel: string;
  severity: OfficialDriveHazardSeverity;
  condition: 'rain' | 'storm' | 'snow' | 'ice' | 'heat' | 'wind';
  message: string;
  driverDecision?: string;
  packingAction?: string;
  precipitationProbability?: number;
  precipitationAmount?: number;
  targetLocalTime?: string;
}

interface NwsAlertFeature {
  id?: string;
  properties?: {
    id?: string;
    event?: string;
    headline?: string | null;
    areaDesc?: string | null;
    severity?: string | null;
    urgency?: string | null;
    certainty?: string | null;
    instruction?: string | null;
    description?: string | null;
    effective?: string | null;
    expires?: string | null;
    senderName?: string | null;
  };
}

interface NwsAlertsResponse {
  features?: NwsAlertFeature[];
}

const OFFICIAL_ALERT_TIMEOUT_MS = 6500;

const ROAD_RISK_TERMS = [
  'flood',
  'flash flood',
  'river flood',
  'washed out',
  'washout',
  'road closed',
  'road closure',
  'closed road',
  'closure',
  'impassable',
  'debris flow',
  'landslide',
  'mudslide',
  'blizzard',
  'ice storm',
  'icy',
  'ice',
  'freezing rain',
  'winter storm',
  'winter weather',
  'snow',
  'snow squall',
  'dust storm',
  'high wind',
  'wind advisory',
  'red flag',
  'fire weather',
  'wildfire',
  'smoke',
  'dense smoke',
  'excessive heat',
  'extreme heat',
  'heat advisory',
  'tornado',
  'severe thunderstorm',
  'heavy traffic',
  'traffic',
];

const STATE_DOT_ROAD_CONDITION_URLS: Record<string, string> = {
  AL: 'https://algotraffic.com',
  AK: 'https://511.alaska.gov',
  AZ: 'https://az511.gov',
  AR: 'https://www.idrivearkansas.com',
  CA: 'https://quickmap.dot.ca.gov',
  CO: 'https://www.cotrip.org',
  CT: 'https://ctroads.org',
  DE: 'https://deldot.gov',
  FL: 'https://fl511.com',
  GA: 'https://511ga.org',
  HI: 'https://hidot.hawaii.gov/highways/roadwork/',
  IA: 'https://www.511ia.org',
  ID: 'https://511.idaho.gov',
  IL: 'https://www.gettingaroundillinois.com',
  IN: 'https://511in.org',
  KS: 'https://www.kandrive.gov',
  KY: 'https://goky.ky.gov',
  LA: 'https://www.511la.org',
  MA: 'https://mass511.com',
  MD: 'https://chart.maryland.gov',
  ME: 'https://www.511maine.gov',
  MI: 'https://mdotjboss.state.mi.us/MiDrive/map',
  MN: 'https://511mn.org',
  MO: 'https://traveler.modot.org/map',
  MS: 'https://www.mdottraffic.com',
  MT: 'https://www.511mt.net',
  NC: 'https://drivenc.gov',
  ND: 'https://travel.dot.nd.gov',
  NE: 'https://new.511.nebraska.gov',
  NH: 'https://newengland511.org',
  NJ: 'https://511nj.org',
  NM: 'https://nmroads.com',
  NV: 'https://www.nvroads.com',
  NY: 'https://511ny.org',
  OH: 'https://www.ohgo.com',
  OK: 'https://www.oktraffic.org',
  OR: 'https://tripcheck.com',
  PA: 'https://www.511pa.com',
  RI: 'https://www.dot.ri.gov/travel/',
  SC: 'https://www.511sc.org',
  SD: 'https://sd511.org',
  TN: 'https://smartway.tn.gov',
  TX: 'https://drivetexas.org',
  UT: 'https://www.udottraffic.utah.gov',
  VA: 'https://www.511virginia.org',
  VT: 'https://newengland511.org',
  WA: 'https://wsdot.com/travel/real-time/map/',
  WI: 'https://511wi.gov',
  WV: 'https://wv511.org',
  WY: 'https://www.wyoroad.info',
  DC: 'https://trafficview.dc.gov',
};

const STATE_NAME_TO_ABBR: Record<string, string> = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  iowa: 'IA',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  massachusetts: 'MA',
  maryland: 'MD',
  maine: 'ME',
  michigan: 'MI',
  minnesota: 'MN',
  missouri: 'MO',
  mississippi: 'MS',
  montana: 'MT',
  northcarolina: 'NC',
  northdakota: 'ND',
  nebraska: 'NE',
  newhampshire: 'NH',
  newjersey: 'NJ',
  newmexico: 'NM',
  nevada: 'NV',
  newyork: 'NY',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  rhodeisland: 'RI',
  southcarolina: 'SC',
  southdakota: 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  virginia: 'VA',
  vermont: 'VT',
  washington: 'WA',
  wisconsin: 'WI',
  westvirginia: 'WV',
  wyoming: 'WY',
  districtofcolumbia: 'DC',
};

function weatherCodeCondition(code: number): RouteWeatherRisk['condition'] | null {
  if (code >= 95) return 'storm';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return 'snow';
  return null;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function toLocalIsoMinute(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function nearestHourlyIndexes(times: string[] | undefined, targetLocalTime?: string): number[] {
  if (!times?.length) return [0, 1, 2, 3, 4, 5, 6, 7];
  if (!targetLocalTime) return times.slice(0, 8).map((_, index) => index);

  const targetMs = new Date(targetLocalTime).getTime();
  if (!Number.isFinite(targetMs)) return times.slice(0, 8).map((_, index) => index);

  return times
    .map((time, index) => ({ index, delta: Math.abs(new Date(time).getTime() - targetMs) }))
    .filter((item) => Number.isFinite(item.delta))
    .sort((a, b) => a.delta - b.delta)
    .slice(0, 4)
    .map((item) => item.index);
}

function normalizeStateKey(state?: string | null): string | null {
  if (!state) return null;
  const trimmed = state.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  const compact = trimmed.toLowerCase().replace(/[^a-z]/g, '');
  return STATE_NAME_TO_ABBR[compact] ?? null;
}

function normalizeSeverity(value?: string | null): OfficialDriveHazardSeverity {
  const normalized = value?.toLowerCase();
  if (normalized === 'extreme' || normalized === 'severe') return 'critical';
  if (normalized === 'moderate') return 'warning';
  return 'info';
}

function hasRoadRisk(alert: Pick<OfficialDriveHazardAlert, 'event' | 'headline' | 'description' | 'instruction'>): boolean {
  const haystack = [alert.event, alert.headline, alert.description, alert.instruction].join(' ').toLowerCase();
  return ROAD_RISK_TERMS.some((term) => haystack.includes(term));
}

function dedupeAlerts(alerts: OfficialDriveHazardAlert[]): OfficialDriveHazardAlert[] {
  const seen = new Set<string>();
  const deduped: OfficialDriveHazardAlert[] = [];
  for (const alert of alerts) {
    const key = `${alert.event}|${alert.areaDesc}|${alert.expires || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(alert);
  }
  return deduped;
}

function alertRank(alert: OfficialDriveHazardAlert): number {
  const severityRank = alert.severity === 'critical' ? 30 : alert.severity === 'warning' ? 20 : 10;
  return severityRank + (alert.roadRisk ? 5 : 0);
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), OFFICIAL_ALERT_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/geo+json',
      },
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchNwsAlertsForPoint(point: OfficialDriveHazardPoint): Promise<OfficialDriveHazardAlert[]> {
  const lat = Number(point.coords.lat.toFixed(4));
  const lon = Number(point.coords.lng.toFixed(4));
  const url = `https://api.weather.gov/alerts/active?point=${lat},${lon}`;
  const response = await fetchWithTimeout(url);

  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`NWS alerts unavailable (${response.status})`);

  const data = (await response.json()) as NwsAlertsResponse;
  const features = Array.isArray(data.features) ? data.features : [];

  return features
    .map((feature): OfficialDriveHazardAlert | null => {
      const props = feature.properties;
      if (!props?.event) return null;

      const alert: OfficialDriveHazardAlert = {
        id: props.id || feature.id || `${point.id}-${props.event}-${props.expires || 'active'}`,
        event: props.event,
        headline: props.headline || props.event,
        areaDesc: props.areaDesc || 'Current travel area',
        severity: normalizeSeverity(props.severity),
        urgency: props.urgency || undefined,
        certainty: props.certainty || undefined,
        instruction: props.instruction || undefined,
        description: props.description || undefined,
        effective: props.effective || undefined,
        expires: props.expires || undefined,
        sourceLabel: props.senderName || 'National Weather Service',
        pointLabel: point.label,
        roadRisk: false,
      };

      return { ...alert, roadRisk: hasRoadRisk(alert) };
    })
    .filter((alert): alert is OfficialDriveHazardAlert => Boolean(alert));
}

export async function fetchOfficialDriveHazards(points: OfficialDriveHazardPoint[]): Promise<OfficialDriveHazardAlert[]> {
  if (points.length === 0) return [];
  const results = await Promise.allSettled(points.map(fetchNwsAlertsForPoint));
  const alerts = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  return dedupeAlerts(alerts).sort((a, b) => alertRank(b) - alertRank(a));
}

export function buildRoadClosureSearchUrl(params: {
  state?: string | null;
  city?: string | null;
  destination?: string | null;
}): string {
  const stateKey = normalizeStateKey(params.state);
  if (stateKey && STATE_DOT_ROAD_CONDITION_URLS[stateKey]) {
    return STATE_DOT_ROAD_CONDITION_URLS[stateKey];
  }
  const location = [params.city, params.state].filter(Boolean).join(' ') || params.destination || 'near me';
  const query = `${location} state DOT 511 official road closures flood`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

export function officialHazardDriverGuidance(alert: Pick<OfficialDriveHazardAlert, 'event' | 'headline' | 'description' | 'instruction'>): string {
  const haystack = [alert.event, alert.headline, alert.description, alert.instruction].join(' ').toLowerCase();
  if (haystack.includes('flood') || haystack.includes('washed out') || haystack.includes('washout')) {
    return 'Avoid low-lying secondary-road reroutes until closures and water crossings are checked.';
  }
  if (haystack.includes('snow') || haystack.includes('ice') || haystack.includes('freezing rain') || haystack.includes('blizzard')) {
    return 'Expect traction issues, closures, and slower alternate routes. Verify road conditions before departure.';
  }
  if (haystack.includes('wildfire') || haystack.includes('smoke') || haystack.includes('red flag') || haystack.includes('fire weather')) {
    return 'Check fire, smoke, and road-closure updates before entering the area.';
  }
  if (haystack.includes('wind') || haystack.includes('dust')) {
    return 'High-profile vehicles and open roads may be unsafe. Check closures and delay guidance.';
  }
  if (haystack.includes('heat')) {
    return 'Plan fuel, water, and backup stops. Avoid getting stuck without supplies.';
  }
  if (haystack.includes('road') || haystack.includes('closure') || haystack.includes('traffic')) {
    return 'Verify road closures and alternate routes before accepting a detour.';
  }
  return 'Check official road conditions before taking unfamiliar alternate routes.';
}

export function buildOfficialAlertPoints(params: {
  deviceCoords?: DeviceCoords | null;
  destinationCoords?: DeviceCoords | null;
}): OfficialDriveHazardPoint[] {
  const points: OfficialDriveHazardPoint[] = [];
  if (params.deviceCoords) {
    points.push({ id: 'current-location', label: 'Current area', coords: params.deviceCoords });
  }
  if (params.destinationCoords) {
    const duplicateCurrent = params.deviceCoords
      && Math.abs(params.deviceCoords.lat - params.destinationCoords.lat) < 0.02
      && Math.abs(params.deviceCoords.lng - params.destinationCoords.lng) < 0.02;
    if (!duplicateCurrent) {
      points.push({ id: 'destination', label: 'Destination area', coords: params.destinationCoords });
    }
  }
  return points;
}

export function buildRouteWeatherPoints(params: {
  originCoords?: DeviceCoords | null;
  destinationCoords?: DeviceCoords | null;
  departureAt?: Date | null;
  durationMinutes?: number | null;
}): RouteWeatherPoint[] {
  const origin = params.originCoords;
  const destination = params.destinationCoords;
  if (!origin || !destination) {
    return origin ? [{ id: 'current', label: 'Current area', coords: origin, routeRatio: 0 }] : [];
  }

  const targetTimeForRatio = (ratio: number): string | undefined => {
    if (!params.departureAt || !Number.isFinite(params.departureAt.getTime())) return undefined;
    const duration = params.durationMinutes && params.durationMinutes > 0 ? params.durationMinutes : 360;
    return toLocalIsoMinute(addMinutes(params.departureAt, Math.round(duration * ratio)));
  };

  const points: RouteWeatherPoint[] = [
    { id: 'origin', label: 'Current area', coords: origin, routeRatio: 0, targetLocalTime: targetTimeForRatio(0) },
  ];

  const samples = [
    { id: 'route-25', label: 'First route segment', ratio: 0.25 },
    { id: 'route-50', label: 'Mid-route', ratio: 0.5 },
    { id: 'route-75', label: 'Late route segment', ratio: 0.75 },
  ];

  for (const sample of samples) {
    points.push({
      id: sample.id,
      label: sample.label,
      routeRatio: sample.ratio,
      targetLocalTime: targetTimeForRatio(sample.ratio),
      coords: {
        lat: origin.lat + (destination.lat - origin.lat) * sample.ratio,
        lng: origin.lng + (destination.lng - origin.lng) * sample.ratio,
      },
    });
  }

  points.push({ id: 'destination', label: 'Destination area', coords: destination, routeRatio: 1, targetLocalTime: targetTimeForRatio(1) });
  return points;
}

async function fetchRouteWeatherPointRisk(point: RouteWeatherPoint): Promise<RouteWeatherRisk | null> {
  const lat = Number(point.coords.lat.toFixed(4));
  const lon = Number(point.coords.lng.toFixed(4));
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=weather_code,precipitation,rain,showers,snowfall,wind_speed_10m,temperature_2m&hourly=weather_code,precipitation_probability,precipitation,wind_speed_10m,temperature_2m&forecast_days=2&timezone=auto&temperature_unit=fahrenheit`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) return null;

  const data = await response.json() as {
    current?: {
      weather_code?: number;
      precipitation?: number;
      rain?: number;
      showers?: number;
      snowfall?: number;
      wind_speed_10m?: number;
      temperature_2m?: number;
    };
    hourly?: {
      time?: string[];
      weather_code?: number[];
      precipitation_probability?: number[];
      precipitation?: number[];
      wind_speed_10m?: number[];
      temperature_2m?: number[];
    };
  };

  const currentCode = data.current?.weather_code ?? 0;
  const currentCondition = weatherCodeCondition(currentCode);
  const indexes = nearestHourlyIndexes(data.hourly?.time, point.targetLocalTime);
  const nextCodes = indexes.map((index) => data.hourly?.weather_code?.[index]).filter((value): value is number => Number.isFinite(value));
  const nextProbabilities = indexes.map((index) => data.hourly?.precipitation_probability?.[index]).filter((value): value is number => Number.isFinite(value));
  const nextAmounts = indexes.map((index) => data.hourly?.precipitation?.[index]).filter((value): value is number => Number.isFinite(value));
  const nextWind = indexes.map((index) => data.hourly?.wind_speed_10m?.[index]).filter((value): value is number => Number.isFinite(value));
  const nextTemps = indexes.map((index) => data.hourly?.temperature_2m?.[index]).filter((value): value is number => Number.isFinite(value));

  const maxPrecipProbability = Math.max(0, ...nextProbabilities.filter(Number.isFinite));
  const maxPrecipAmount = Math.max(0, data.current?.precipitation ?? 0, data.current?.rain ?? 0, data.current?.showers ?? 0, ...nextAmounts.filter(Number.isFinite));
  const worstCodeCondition = nextCodes.map(weatherCodeCondition).find(Boolean) ?? null;
  const maxWind = Math.max(0, data.current?.wind_speed_10m ?? 0, ...nextWind.filter(Number.isFinite));
  const maxTemp = Math.max(data.current?.temperature_2m ?? 0, ...nextTemps.filter(Number.isFinite));

  const condition = currentCondition ?? worstCodeCondition;
  if (condition === 'storm') {
    return {
      id: `${point.id}-storm`,
      pointLabel: point.label,
      severity: 'critical',
      condition: 'storm',
      message: `Storm risk along ${point.label.toLowerCase()}.`,
      driverDecision: 'Consider delaying departure until this route segment clears.',
      packingAction: 'Cover luggage and keep rain gear accessible before departure.',
      precipitationProbability: maxPrecipProbability,
      precipitationAmount: maxPrecipAmount,
      targetLocalTime: point.targetLocalTime,
    };
  }

  if (condition === 'rain' || maxPrecipProbability >= 45 || maxPrecipAmount > 0.05) {
    return {
      id: `${point.id}-rain`,
      pointLabel: point.label,
      severity: maxPrecipProbability >= 70 || maxPrecipAmount > 0.2 ? 'warning' : 'info',
      condition: 'rain',
      message: `Rain likely along ${point.label.toLowerCase()}${maxPrecipProbability ? ` (${maxPrecipProbability}% chance)` : ''}.`,
      driverDecision: maxPrecipProbability >= 70 || maxPrecipAmount > 0.2
        ? 'Consider leaving later or checking an alternate route before departure.'
        : 'Prep for rain before loading and recheck conditions before departure.',
      packingAction: 'Pack the car/truck for rain: cover soft bags, protect electronics, and keep jackets up front.',
      precipitationProbability: maxPrecipProbability,
      precipitationAmount: maxPrecipAmount,
      targetLocalTime: point.targetLocalTime,
    };
  }

  if (condition === 'snow') {
    return {
      id: `${point.id}-snow`,
      pointLabel: point.label,
      severity: 'critical',
      condition: 'snow',
      message: `Snow or wintry precipitation possible along ${point.label.toLowerCase()}.`,
      driverDecision: 'Consider delaying departure or choosing a safer travel window.',
      packingAction: 'Keep cold-weather gear, scraper, blanket, and traction plan accessible.',
      precipitationProbability: maxPrecipProbability,
      precipitationAmount: maxPrecipAmount,
      targetLocalTime: point.targetLocalTime,
    };
  }

  if (maxWind >= 35) {
    return {
      id: `${point.id}-wind`,
      pointLabel: point.label,
      severity: maxWind >= 45 ? 'critical' : 'warning',
      condition: 'wind',
      message: `High wind possible along ${point.label.toLowerCase()} (${Math.round(maxWind)} mph).`,
      driverDecision: maxWind >= 45 ? 'Consider delaying departure, especially with a truck, trailer, or roof cargo.' : 'Check advisories before departure.',
      packingAction: 'Secure roof cargo and check advisories for high-profile vehicles.',
      targetLocalTime: point.targetLocalTime,
    };
  }

  if (maxTemp >= 95) {
    return {
      id: `${point.id}-heat`,
      pointLabel: point.label,
      severity: maxTemp >= 105 ? 'critical' : 'warning',
      condition: 'heat',
      message: `High heat expected along ${point.label.toLowerCase()} (${Math.round(maxTemp)}F).`,
      driverDecision: 'Avoid being stranded without supplies; consider cooler travel hours.',
      packingAction: 'Carry water, protect medications/electronics, and plan fuel stops conservatively.',
      targetLocalTime: point.targetLocalTime,
    };
  }

  return null;
}

export async function fetchRouteWeatherRisks(points: RouteWeatherPoint[]): Promise<RouteWeatherRisk[]> {
  if (points.length === 0) return [];
  const results = await Promise.allSettled(points.map(fetchRouteWeatherPointRisk));
  const risks = results.flatMap((result) => (result.status === 'fulfilled' && result.value ? [result.value] : []));
  const seen = new Set<string>();
  return risks.filter((risk) => {
    const key = `${risk.condition}|${risk.pointLabel}|${risk.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
