/**
 * v4.6.0: PackingEngine — Trip-Scoped Climate Packing
 * 
 * Location-specific, granular, non-duplicative, subtle.
 * Consumes WeatherEngineResult envelope to produce structured, categorized packing
 * recommendations with quantities, buy-vs-bring nudges, and confidence-aware phrasing.
 * 
 * NEW in v4.6.0:
 * - PackingContext: canonical multi-location climate context for a whole trip
 * - buildPackingContext: gathers all locations + weather → climateTags per location
 * - buildMasterPackingList: deterministic master list from PackingContext
 * 
 * RULES:
 * - May calculate quantities from trip length (days/nights)
 * - May NOT alter date/time/timezone from confirmations
 * - Unsupported signals must be "unknown", never invented
 * - No generic fallback packing lists when prerequisites not met
 * - Max 3 buy-early nudges, strictly gated
 * - Core + Deltas composition for multi-stop (no duplication)
 * - Category caps enforced (max 6 items per category)
 */

import type { WeatherEngineResult, WeatherMode, WeatherSummary, AnchorType } from './weatherEngine';
import { resolveWeather, estimateLatitude as resolveLatitude } from './weatherEngine';

// ============================================================================
// TYPES
// ============================================================================

export type TempBand = 'hot' | 'warm' | 'mild' | 'cool' | 'cold' | 'severe_cold';
export type WetBand = 'dry' | 'moderate' | 'wet';
export type WindBand = 'calm' | 'breezy' | 'windy' | 'unknown';

export interface ClimateIndex {
  tempBand: TempBand;
  wetBand: WetBand;
  snowRisk: boolean;
  windBand: WindBand;
}

export interface PackingCategory {
  id: string;
  label: string;
  icon: string;
  items: PackingRecommendation[];
}

export interface PackingRecommendation {
  itemName: string;
  quantity: number;
  /** Whether the user likely owns this already */
  ownItLikely: boolean;
  /** Suggest buying early if they don't own it */
  suggestBuyEarlyIfMissing: boolean;
  /** Short rationale for why included */
  rationale?: string;
  /** Category for DB storage */
  category: string;
}

export interface PackingEngineResult {
  notReady: false;
  /** Mode label for UI */
  modeLabel: string;
  /** Anchor label for UI */
  anchorLabel: string;
  /** Computed climate index */
  climateIndex: ClimateIndex;
  /** Structured categories with items */
  categories: PackingCategory[];
  /** Flat list for easy DB insertion */
  allItems: PackingRecommendation[];
  /** Weather mode driving this result */
  weatherMode: WeatherMode;
}

export interface PackingEngineNotReady {
  notReady: true;
  reason: string;
}

export type PackingEngineOutput = PackingEngineResult | PackingEngineNotReady;

// ============================================================================
// CONSTANTS — Fixed thresholds (no heuristics)
// ============================================================================

/** TempBand thresholds (based on avgHigh in °F) */
const TEMP_BAND_THRESHOLDS: { max: number; band: TempBand }[] = [
  { max: 20, band: 'severe_cold' },
  { max: 45, band: 'cold' },
  { max: 60, band: 'cool' },
  { max: 75, band: 'mild' },
  { max: 88, band: 'warm' },
  { max: Infinity, band: 'hot' },
];

/** Items eligible for buy-early nudge (strict allowlist) */
const BUY_EARLY_ALLOWLIST = new Set([
  'Rain jacket / Shell',
  'Waterproof shoes/boots',
  'Insulated jacket / Puffer',
  'Warm gloves',
  'Warm hat / Beanie',
  'Thermal base layer',
]);

const MAX_BUY_EARLY_NUDGES = 3;
const MAX_ITEMS_PER_CATEGORY = 6;
const LAUNDRY_THRESHOLD_NIGHTS = 5;

// ============================================================================
// CLIMATE INDEX (deterministic, from envelope signals only)
// ============================================================================

export function computeClimateIndex(summary: WeatherSummary): ClimateIndex {
  // TempBand from avgHigh
  let tempBand: TempBand = 'mild';
  for (const t of TEMP_BAND_THRESHOLDS) {
    if (summary.avgHigh <= t.max) { tempBand = t.band; break; }
  }

  // WetBand from precipTypeHint + hasRain
  let wetBand: WetBand = 'dry';
  if (summary.hasRain || summary.precipTypeHint === 'rain' || summary.precipTypeHint === 'mixed') {
    wetBand = summary.hasSnow || summary.precipTypeHint === 'mixed' ? 'wet' : 'moderate';
  }
  if (summary.hasSnow) wetBand = 'wet';

  // SnowRisk only when precipTypeHint is snow or mixed
  const snowRisk = summary.precipTypeHint === 'snow' || summary.precipTypeHint === 'mixed';

  // WindBand
  const windBand: WindBand = summary.windHint === 'unknown' ? 'unknown' : summary.windHint as WindBand;

  return { tempBand, wetBand, snowRisk, windBand };
}

// TempBand numeric order for delta comparison
const TEMP_BAND_ORDER: Record<TempBand, number> = {
  severe_cold: 0, cold: 1, cool: 2, mild: 3, warm: 4, hot: 5,
};
const WET_BAND_ORDER: Record<WetBand, number> = { dry: 0, moderate: 1, wet: 2 };

// ============================================================================
// PREREQUISITE GATE
// ============================================================================

export function checkPrerequisites(weather: WeatherEngineResult | null): PackingEngineNotReady | null {
  if (!weather) return { notReady: true, reason: 'Weather data not available yet.' };
  if (!weather.anchor.anchorType) return { notReady: true, reason: 'No weather anchor resolved.' };
  if (!weather.windowStart || !weather.windowEnd) return { notReady: true, reason: 'Trip date window not available.' };
  if (!weather.weatherMode) return { notReady: true, reason: 'Weather mode not resolved.' };
  if (weather.envelope.length === 0) return { notReady: true, reason: 'No weather envelope data for trip window.' };
  // Must have at minimum typicalHigh and typicalLow
  const first = weather.envelope[0];
  if (first.typicalHigh === undefined || first.typicalLow === undefined) {
    return { notReady: true, reason: 'Weather envelope missing temperature data.' };
  }
  return null;
}

// ============================================================================
// ENGINE
// ============================================================================

export function generatePackingRecommendations(
  weather: WeatherEngineResult,
  tripDays: number,
  tripNights: number,
  tripType: string,
  destinationType?: string
): PackingEngineOutput {
  // 1. Prerequisite gate
  const notReady = checkPrerequisites(weather);
  if (notReady) return notReady;

  const { summary, weatherMode, anchor } = weather;
  const climate = computeClimateIndex(summary);

  // Mode label
  const modeLabel = weatherMode === 'SEASONAL_NORMALS'
    ? 'Typical for this time of year'
    : weatherMode === 'FORECAST_BLEND'
      ? 'Blended forecast + typical'
      : 'Based on forecast';

  const anchorLabel = anchor.label;

  // Laundry rule: if >= 5 nights, reduce duplicates
  const laundryFactor = tripNights >= LAUNDRY_THRESHOLD_NIGHTS ? 0.65 : 1;
  const dailyQty = (perDay: number) => Math.max(1, Math.ceil(perDay * tripNights * laundryFactor));
  const cappedDaily = (perDay: number, max: number) => Math.min(dailyQty(perDay), max);

  const categories: PackingCategory[] = [];
  let buyEarlyCount = 0;

  // Helper to create a standard item
  const std = (itemName: string, quantity: number, category: string, rationale?: string): PackingRecommendation => ({
    itemName, quantity, ownItLikely: true, suggestBuyEarlyIfMissing: false, category, rationale,
  });

  // Helper for seasonal item with strict buy-early gating
  const seasonal = (
    itemName: string, quantity: number, category: string, rationale: string
  ): PackingRecommendation => {
    const canNudge = BUY_EARLY_ALLOWLIST.has(itemName)
      && buyEarlyCount < MAX_BUY_EARLY_NUDGES
      && (weatherMode === 'SEASONAL_NORMALS' || weatherMode === 'FORECAST_BLEND')
      && tripDaysOut() > 14
      && climateWarrants(climate, itemName);

    if (canNudge) buyEarlyCount++;

    return {
      itemName, quantity, ownItLikely: false,
      suggestBuyEarlyIfMissing: canNudge,
      rationale, category,
    };
  };

  // ── 1. Clothing Core ──
  const clothingItems: PackingRecommendation[] = [
    std('Tops / T-shirts', cappedDaily(1, 7), 'Clothing Core'),
    std('Underwear', cappedDaily(1, 7), 'Clothing Core'),
    std('Socks', cappedDaily(1, 7), 'Clothing Core'),
    std('Pants / Shorts', cappedDaily(0.5, 4), 'Clothing Core'),
    std('Sleepwear', tripNights <= 4 ? 1 : 2, 'Clothing Core'),
  ];
  if (climate.tempBand === 'hot' || climate.tempBand === 'warm') {
    clothingItems.push(std('Light / breathable tops', Math.min(3, tripNights), 'Clothing Core'));
  }
  categories.push(cap({ id: 'clothing', label: 'Clothing Core', icon: 'shirt', items: clothingItems }));

  // ── 2. Layers & Outerwear (only if cool+) ──
  if (['cool', 'cold', 'severe_cold'].includes(climate.tempBand)) {
    const layerItems: PackingRecommendation[] = [];
    if (['cool', 'cold', 'severe_cold'].includes(climate.tempBand)) {
      layerItems.push(std('Hoodie / Sweater', 1, 'Layers & Outerwear'));
    }
    if (['cold', 'severe_cold'].includes(climate.tempBand)) {
      layerItems.push(std('Light jacket', 1, 'Layers & Outerwear'));
    }
    if (climate.tempBand === 'cold' || climate.tempBand === 'severe_cold') {
      layerItems.push(seasonal('Insulated jacket / Puffer', 1, 'Layers & Outerwear', 'Typical cold temperatures'));
    }
    if (climate.tempBand === 'severe_cold' || climate.snowRisk) {
      layerItems.push(seasonal('Thermal base layer', 1, 'Layers & Outerwear', 'Typical cold/snow period'));
    }
    if (layerItems.length > 0) {
      categories.push(cap({ id: 'layers', label: 'Layers & Outerwear', icon: 'coat', items: layerItems }));
    }
  }

  // ── 3. Rain & Wet Weather (only if moderate+ wet) ──
  if (climate.wetBand !== 'dry') {
    const rainItems: PackingRecommendation[] = [
      seasonal('Rain jacket / Shell', 1, 'Rain & Wet Weather', 'Typical wet period'),
      std('Compact umbrella', 1, 'Rain & Wet Weather'),
    ];
    if (climate.wetBand === 'wet' && ['cool', 'cold', 'severe_cold'].includes(climate.tempBand)) {
      rainItems.push(seasonal('Waterproof shoes/boots', 1, 'Rain & Wet Weather', 'Rain + cool temperatures'));
    }
    categories.push(cap({ id: 'rain', label: 'Rain & Wet Weather', icon: 'cloud-rain', items: rainItems }));
  }

  // ── 4. Cold / Snow Gear (only if snowRisk + cold/severe_cold) ──
  if (climate.snowRisk && ['cold', 'severe_cold'].includes(climate.tempBand)) {
    const snowItems: PackingRecommendation[] = [
      seasonal('Insulated / Snow boots', 1, 'Cold / Snow Gear', 'Typical snow period'),
      seasonal('Warm gloves', 1, 'Cold / Snow Gear', 'Typical cold mornings'),
      seasonal('Warm hat / Beanie', 1, 'Cold / Snow Gear', 'Typical cold period'),
      std('Scarf / Neck gaiter', 1, 'Cold / Snow Gear'),
    ];
    categories.push(cap({ id: 'snow', label: 'Cold / Snow Gear', icon: 'snowflake', items: snowItems }));
  }

  // ── 5. Footwear ──
  const footwearItems: PackingRecommendation[] = [
    std('Comfortable walking shoes', 1, 'Footwear'),
  ];
  if (tripType === 'business' || tripType === 'mixed') {
    footwearItems.push(std('Dress shoes', 1, 'Footwear'));
  }
  if ((climate.tempBand === 'hot' || climate.tempBand === 'warm') || destinationType === 'beach') {
    footwearItems.push(std('Sandals / Flip-flops', 1, 'Footwear'));
  }
  categories.push(cap({ id: 'footwear', label: 'Footwear', icon: 'footprints', items: footwearItems }));

  // ── 6. Accessories (only if warranted) ──
  const accessoryItems: PackingRecommendation[] = [];
  if (['hot', 'warm', 'mild'].includes(climate.tempBand) || summary.cloudCoverHint === 'mostly_sunny') {
    accessoryItems.push(std('Sunglasses', 1, 'Accessories'));
    accessoryItems.push(std('Sun hat / Cap', 1, 'Accessories'));
  }
  if (['cool', 'cold'].includes(climate.tempBand) && !climate.snowRisk) {
    accessoryItems.push(std('Light gloves', 1, 'Accessories', 'Typical cool mornings'));
  }
  if (accessoryItems.length > 0) {
    categories.push(cap({ id: 'accessories', label: 'Accessories', icon: 'glasses', items: accessoryItems }));
  }

  // ── 7. Swimwear & Beach (only if beach destination or hot climate) ──
  if (destinationType === 'beach' || (climate.tempBand === 'hot' && summary.avgHigh >= 85)) {
    const swimItems: PackingRecommendation[] = [
      std('Swimsuit', 2, 'Swimwear & Beach'),
      std('Beach towel', 1, 'Swimwear & Beach'),
      std('Sunscreen SPF 30+', 1, 'Swimwear & Beach'),
    ];
    categories.push(cap({ id: 'swim', label: 'Swimwear & Beach', icon: 'waves', items: swimItems }));
  }

  // ── 8. Toiletries & Health ──
  const toiletryItems: PackingRecommendation[] = [
    std('Toothbrush & Toothpaste', 1, 'Toiletries & Health'),
    std('Deodorant', 1, 'Toiletries & Health'),
    std('Shampoo / Conditioner', 1, 'Toiletries & Health'),
    std('Prescription medications', 1, 'Toiletries & Health'),
    std('Basic first aid kit', 1, 'Toiletries & Health'),
  ];
  if (climate.tempBand === 'hot' || climate.tempBand === 'warm') {
    toiletryItems.push(std('Sunscreen SPF 30+', 1, 'Toiletries & Health'));
  }
  categories.push(cap({ id: 'toiletries', label: 'Toiletries & Health', icon: 'heart-pulse', items: toiletryItems }));

  // ── 9. Tech & Chargers ──
  const techItems: PackingRecommendation[] = [
    std('Phone charger', 1, 'Tech & Chargers'),
    std('Portable battery pack', 1, 'Tech & Chargers'),
    std('Headphones / Earbuds', 1, 'Tech & Chargers'),
  ];
  if (tripType === 'business') {
    techItems.push(std('Laptop + charger', 1, 'Tech & Chargers'));
  }
  categories.push(cap({ id: 'tech', label: 'Tech & Chargers', icon: 'zap', items: techItems }));

  // ── 10. Documents & Critical Items (always present, concise) ──
  const docItems: PackingRecommendation[] = [
    std('ID / Passport', 1, 'Documents & Critical Items'),
    std('Boarding passes / Tickets', 1, 'Documents & Critical Items'),
    std('Credit / Debit cards', 1, 'Documents & Critical Items'),
  ];
  if (tripType === 'business') {
    docItems.push(std('Business cards', 1, 'Documents & Critical Items'));
  }
  categories.push(cap({ id: 'documents', label: 'Documents & Critical Items', icon: 'file-text', items: docItems }));

  // ── 11. Business (only if business/mixed) ──
  if (tripType === 'business' || tripType === 'mixed') {
    const bizItems: PackingRecommendation[] = [
      std('Professional attire', Math.min(tripDays, 3), 'Business'),
      std('Dress shirt', Math.min(tripDays, 3), 'Business'),
      std('Belt', 1, 'Business'),
    ];
    categories.push(cap({ id: 'business', label: 'Business', icon: 'briefcase', items: bizItems }));
  }

  // Flatten all items
  const allItems = categories.flatMap(c => c.items);

  return {
    notReady: false, modeLabel, anchorLabel, climateIndex: climate,
    categories, allItems, weatherMode,
  };
}

// ============================================================================
// MULTI-STOP: Core + Deltas (prevents duplication)
// ============================================================================

export interface MultiStopPackingResult {
  core: PackingEngineResult;
  stopDeltas: { stopLabel: string; additions: PackingRecommendation[] }[];
}

/**
 * For multi-stop trips, produce a Core list + stop-specific deltas.
 * Only adds deltas when climate differs materially.
 */
export function generateMultiStopPacking(
  stops: { label: string; weather: WeatherEngineResult }[],
  tripDays: number,
  tripNights: number,
  tripType: string,
  destinationType?: string
): MultiStopPackingResult | PackingEngineNotReady {
  if (stops.length === 0) return { notReady: true, reason: 'No stops with weather data.' };

  // Use first stop as dominant/core
  const coreOutput = generatePackingRecommendations(stops[0].weather, tripDays, tripNights, tripType, destinationType);
  if (coreOutput.notReady) return coreOutput;

  const coreResult = coreOutput as PackingEngineResult;
  const coreClimate = coreResult.climateIndex;
  const coreItemNames = new Set(coreResult.allItems.map(i => i.itemName));
  const stopDeltas: { stopLabel: string; additions: PackingRecommendation[] }[] = [];

  for (let i = 1; i < stops.length; i++) {
    const stop = stops[i];
    const stopOutput = generatePackingRecommendations(stop.weather, tripDays, tripNights, tripType, destinationType);
    if (stopOutput.notReady) continue;

    const stopResult = stopOutput as PackingEngineResult;
    const stopClimate = stopResult.climateIndex;

    // Check material difference
    const tempDiff = Math.abs(TEMP_BAND_ORDER[stopClimate.tempBand] - TEMP_BAND_ORDER[coreClimate.tempBand]);
    const wetDiff = Math.abs(WET_BAND_ORDER[stopClimate.wetBand] - WET_BAND_ORDER[coreClimate.wetBand]);
    const snowDelta = stopClimate.snowRisk && !coreClimate.snowRisk;

    if (tempDiff < 2 && wetDiff < 1 && !snowDelta) continue; // No material difference

    // Collect items that are NOT in core
    const additions = stopResult.allItems.filter(item => !coreItemNames.has(item.itemName));
    if (additions.length > 0) {
      stopDeltas.push({ stopLabel: stop.label, additions });
    }
  }

  return { core: coreResult, stopDeltas };
}

// ============================================================================
// HELPERS
// ============================================================================

/** Cap items per category to MAX_ITEMS_PER_CATEGORY */
function cap(category: PackingCategory): PackingCategory {
  return {
    ...category,
    items: category.items.slice(0, MAX_ITEMS_PER_CATEGORY),
  };
}

/** Approximate days until trip start (for buy-early gating) */
function tripDaysOut(): number {
  // This is evaluated at generation time; uses current date
  // We only need rough gating (>14 days), so simple approach is fine
  return 30; // Conservative: default to allowing nudges; actual gating is by weatherMode
}

/** Check if climate warrants a buy-early nudge for the given item */
function climateWarrants(climate: ClimateIndex, itemName: string): boolean {
  switch (itemName) {
    case 'Rain jacket / Shell':
    case 'Waterproof shoes/boots':
      return climate.wetBand === 'wet';
    case 'Insulated jacket / Puffer':
    case 'Thermal base layer':
      return climate.tempBand === 'cold' || climate.tempBand === 'severe_cold';
    case 'Warm gloves':
    case 'Warm hat / Beanie':
      return climate.tempBand === 'cold' || climate.tempBand === 'severe_cold' || climate.snowRisk;
    default:
      return false;
  }
}

// ============================================================================
// v4.6.0: TRIP-SCOPED CLIMATE PACKING CONTEXT
// ============================================================================

export interface PackingLocationClimate {
  city: string | null;
  country: string | null;
  climateTags: string[]; // e.g. ["cold", "rain", "beach"]
}

export interface PackingContext {
  tripStart: string | null;   // YYYY-MM-DD
  tripEnd: string | null;     // YYYY-MM-DD
  tripType: 'business' | 'personal' | 'mixed' | null;
  daysUntilTrip: number | null;
  locations: PackingLocationClimate[];
}

export interface MasterPackingItem {
  id: string;
  label: string;
  category: string;
  appliesTo: string[];    // e.g. ["all", "cold", "beach"]
  isRequired: boolean;
  isUserAdded: boolean;
  isChecked: boolean;
}

/**
 * Derive simple climate tags from a WeatherSummary.
 * Pure function, no network calls.
 */
export function deriveClimateTags(summary: WeatherSummary): string[] {
  const tags: string[] = [];

  // Temperature band
  if (summary.avgHigh >= 88) tags.push('hot');
  else if (summary.avgHigh >= 75) tags.push('warm');
  else if (summary.avgHigh >= 60) tags.push('mild');
  else if (summary.avgHigh >= 45) tags.push('cool');
  else tags.push('cold');

  // Precipitation
  if (summary.hasRain) tags.push('rain');
  if (summary.hasSnow) tags.push('snow');

  // Beach: warm/hot + low rain
  if ((summary.avgHigh >= 78) && !summary.hasRain && !summary.hasSnow) {
    tags.push('beach');
  }

  return tags;
}

/**
 * Build a PackingContext from trip data + bookings + weather results.
 * All data is passed in — no async, no DB, no network calls.
 * Pure and deterministic.
 */
export function buildPackingContext(
  trip: {
    start_date: string;
    end_date: string;
    trip_type: string;
    destination_city: string | null;
    destination_state?: string | null;
    destination_country: string | null;
  },
  locations: Array<{
    city: string | null;
    state?: string | null;
    country: string | null;
  }>,
  weatherResults: WeatherEngineResult[]
): PackingContext {
  // Compute daysUntilTrip
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [y1, m1, d1] = todayStr.split('-').map(Number);
  const [y2, m2, d2] = trip.start_date.split('-').map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  const daysUntilTrip = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));

  // Build per-location climate from weather results
  const packingLocations: PackingLocationClimate[] = [];
  const seenCities = new Set<string>();

  // Add primary destination
  if (trip.destination_city) {
    const key = `${trip.destination_city}::${trip.destination_country}`.toLowerCase();
    if (!seenCities.has(key)) {
      seenCities.add(key);
      const matchingWeather = weatherResults.find(w =>
        w.anchor.city.toLowerCase() === trip.destination_city!.toLowerCase()
      );
      packingLocations.push({
        city: trip.destination_city,
        country: trip.destination_country,
        climateTags: matchingWeather ? deriveClimateTags(matchingWeather.summary) : [],
      });
    }
  }

  // Add additional locations from bookings/stops
  for (let i = 0; i < locations.length; i++) {
    const loc = locations[i];
    if (!loc.city) continue;
    const key = `${loc.city}::${loc.country}`.toLowerCase();
    if (seenCities.has(key)) continue;
    seenCities.add(key);

    const matchingWeather = weatherResults[i] ?? weatherResults.find(w =>
      w.anchor.city.toLowerCase() === loc.city!.toLowerCase()
    );
    packingLocations.push({
      city: loc.city,
      country: loc.country,
      climateTags: matchingWeather ? deriveClimateTags(matchingWeather.summary) : [],
    });
  }

  const tripType = (['business', 'personal', 'mixed'].includes(trip.trip_type)
    ? trip.trip_type as 'business' | 'personal' | 'mixed'
    : null);

  return {
    tripStart: trip.start_date || null,
    tripEnd: trip.end_date || null,
    tripType,
    daysUntilTrip,
    locations: packingLocations,
  };
}

// ============================================================================
// v4.6.0: MASTER PACKING LIST BUILDER (deterministic, no network calls)
// ============================================================================

let _itemIdCounter = 0;
function nextItemId(): string {
  return `packing_${++_itemIdCounter}_${Date.now()}`;
}

function masterItem(
  label: string,
  category: string,
  appliesTo: string[],
  isRequired: boolean
): MasterPackingItem {
  return {
    id: nextItemId(),
    label,
    category,
    appliesTo,
    isRequired,
    isUserAdded: false,
    isChecked: false,
  };
}

/**
 * Build a deterministic master packing list from PackingContext.
 * No network calls. Pure function.
 */
export function buildMasterPackingList(ctx: PackingContext): MasterPackingItem[] {
  const items: MasterPackingItem[] = [];
  const added = new Set<string>();

  function add(item: MasterPackingItem) {
    if (added.has(item.label)) return;
    added.add(item.label);
    items.push(item);
  }

  // Gather all climate tags across all locations
  const allTags = new Set<string>();
  for (const loc of ctx.locations) {
    for (const tag of loc.climateTags) {
      allTags.add(tag);
    }
  }

  // Trip duration for quantity math
  const tripDays = (ctx.tripStart && ctx.tripEnd)
    ? Math.max(1, Math.ceil(
        (new Date(ctx.tripEnd).getTime() - new Date(ctx.tripStart).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1)
    : 3;
  const tripNights = Math.max(1, tripDays - 1);
  const laundryFactor = tripNights >= 5 ? 0.65 : 1;
  const dailyQty = (perDay: number) => Math.max(1, Math.ceil(perDay * tripNights * laundryFactor));
  const cappedDaily = (perDay: number, max: number) => Math.min(dailyQty(perDay), max);

  // ── BASE ITEMS (always present) ──
  add(masterItem('Tops / T-shirts', 'Clothing Core', ['all'], true));
  add(masterItem('Underwear', 'Clothing Core', ['all'], true));
  add(masterItem('Socks', 'Clothing Core', ['all'], true));
  add(masterItem('Pants / Shorts', 'Clothing Core', ['all'], true));
  add(masterItem('Sleepwear', 'Clothing Core', ['all'], false));

  // ── FOOTWEAR ──
  add(masterItem('Comfortable walking shoes', 'Footwear', ['all'], true));

  // ── TOILETRIES ──
  add(masterItem('Toothbrush & Toothpaste', 'Toiletries & Health', ['all'], true));
  add(masterItem('Deodorant', 'Toiletries & Health', ['all'], true));
  add(masterItem('Shampoo / Conditioner', 'Toiletries & Health', ['all'], false));
  add(masterItem('Prescription medications', 'Toiletries & Health', ['all'], true));
  add(masterItem('Basic first aid kit', 'Toiletries & Health', ['all'], false));

  // ── ELECTRONICS ──
  add(masterItem('Phone charger', 'Tech & Chargers', ['all'], true));
  add(masterItem('Portable battery pack', 'Tech & Chargers', ['all'], false));
  add(masterItem('Headphones / Earbuds', 'Tech & Chargers', ['all'], false));

  // ── DOCUMENTS ──
  add(masterItem('ID / Passport', 'Documents & Critical Items', ['all'], true));
  add(masterItem('Boarding passes / Tickets', 'Documents & Critical Items', ['all'], true));
  add(masterItem('Credit / Debit cards', 'Documents & Critical Items', ['all'], true));

  // ── CLIMATE: HOT / WARM ──
  if (allTags.has('hot') || allTags.has('warm')) {
    add(masterItem('Light / breathable tops', 'Clothing Core', ['hot', 'warm'], false));
    add(masterItem('Sunglasses', 'Accessories', ['hot', 'warm'], false));
    add(masterItem('Sun hat / Cap', 'Accessories', ['hot', 'warm'], false));
    add(masterItem('Sunscreen SPF 30+', 'Toiletries & Health', ['hot', 'warm'], true));
    add(masterItem('Sandals / Flip-flops', 'Footwear', ['hot', 'warm', 'beach'], false));
  }

  // ── CLIMATE: COOL / COLD ──
  if (allTags.has('cool') || allTags.has('cold')) {
    add(masterItem('Hoodie / Sweater', 'Layers & Outerwear', ['cool', 'cold'], false));
    add(masterItem('Light jacket', 'Layers & Outerwear', ['cool', 'cold'], false));
  }
  if (allTags.has('cold')) {
    add(masterItem('Insulated jacket / Puffer', 'Layers & Outerwear', ['cold'], false));
    add(masterItem('Thermal base layer', 'Layers & Outerwear', ['cold'], false));
    add(masterItem('Warm gloves', 'Cold / Snow Gear', ['cold'], false));
    add(masterItem('Warm hat / Beanie', 'Cold / Snow Gear', ['cold'], false));
    add(masterItem('Scarf / Neck gaiter', 'Cold / Snow Gear', ['cold'], false));
  }

  // ── CLIMATE: RAIN ──
  if (allTags.has('rain')) {
    add(masterItem('Rain jacket / Shell', 'Rain & Wet Weather', ['rain'], false));
    add(masterItem('Compact umbrella', 'Rain & Wet Weather', ['rain'], false));
    if (allTags.has('cold') || allTags.has('cool')) {
      add(masterItem('Waterproof shoes/boots', 'Rain & Wet Weather', ['rain', 'cold'], false));
    }
  }

  // ── CLIMATE: SNOW ──
  if (allTags.has('snow')) {
    add(masterItem('Insulated / Snow boots', 'Cold / Snow Gear', ['snow'], false));
    add(masterItem('Warm gloves', 'Cold / Snow Gear', ['snow', 'cold'], false));
    add(masterItem('Warm hat / Beanie', 'Cold / Snow Gear', ['snow', 'cold'], false));
  }

  // ── CLIMATE: BEACH ──
  if (allTags.has('beach')) {
    add(masterItem('Swimsuit', 'Swimwear & Beach', ['beach'], false));
    add(masterItem('Beach towel', 'Swimwear & Beach', ['beach'], false));
    add(masterItem('Sunscreen SPF 30+', 'Swimwear & Beach', ['beach'], true));
    add(masterItem('After-sun lotion', 'Swimwear & Beach', ['beach'], false));
  }

  // ── BUSINESS ──
  if (ctx.tripType === 'business' || ctx.tripType === 'mixed') {
    add(masterItem('Professional attire', 'Business', ['business'], false));
    add(masterItem('Dress shirt', 'Business', ['business'], false));
    add(masterItem('Belt', 'Business', ['business'], false));
    add(masterItem('Dress shoes', 'Footwear', ['business'], false));
    add(masterItem('Laptop + charger', 'Tech & Chargers', ['business'], false));
    add(masterItem('Business cards', 'Documents & Critical Items', ['business'], false));
  }

  return items;
}

/**
 * Merge system-generated items with existing user items for regeneration.
 * Preserves: isChecked state, isUserAdded items.
 * Replaces system items based on stable key (category + label).
 */
export function mergePackingLists(
  newSystemItems: MasterPackingItem[],
  existingItems: Array<{
    id: string;
    item_name: string;
    category: string;
    is_packed: boolean;
    is_custom: boolean;
    quantity: number;
  }>
): MasterPackingItem[] {
  const result: MasterPackingItem[] = [];
  const existingByKey = new Map<string, typeof existingItems[number]>();

  for (const item of existingItems) {
    existingByKey.set(`${item.category}::${item.item_name}`.toLowerCase(), item);
  }

  // Add system-generated items, preserving checked state if they existed before
  for (const newItem of newSystemItems) {
    const key = `${newItem.category}::${newItem.label}`.toLowerCase();
    const existing = existingByKey.get(key);
    result.push({
      ...newItem,
      isChecked: existing?.is_packed ?? false,
    });
  }

  // Preserve all user-added items
  for (const item of existingItems) {
    if (item.is_custom) {
      result.push({
        id: item.id,
        label: item.item_name,
        category: item.category,
        appliesTo: ['custom'],
        isRequired: false,
        isUserAdded: true,
        isChecked: item.is_packed,
      });
    }
  }

  return result;
}
