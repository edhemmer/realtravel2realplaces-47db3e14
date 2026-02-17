/**
 * v3.8.13: PackingEngine — Structured Packing Intelligence
 * 
 * Consumes WeatherEngine envelope to produce structured, categorized packing
 * recommendations with quantities, buy-vs-bring nudges, and confidence-aware phrasing.
 * 
 * RULES:
 * - May calculate quantities from trip length (days/nights)
 * - May NOT alter date/time/timezone from confirmations
 * - Unsupported signals must be "unknown", never invented
 */

import type { WeatherEngineResult, WeatherMode, WeatherSummary } from './weatherEngine';

// ============================================================================
// TYPES
// ============================================================================

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
  /** Mode label for UI */
  modeLabel: string;
  /** Anchor label for UI */
  anchorLabel: string;
  /** Structured categories with items */
  categories: PackingCategory[];
  /** Flat list for easy DB insertion */
  allItems: PackingRecommendation[];
  /** Weather mode driving this result */
  weatherMode: WeatherMode;
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
): PackingEngineResult {
  const { summary, weatherMode, anchor } = weather;
  const categories: PackingCategory[] = [];

  // Mode label
  const modeLabel = weatherMode === 'SEASONAL_NORMALS'
    ? 'Typical for this time of year'
    : weatherMode === 'FORECAST_BLEND'
      ? 'Blended forecast + typical'
      : 'Based on forecast';

  const anchorLabel = anchor.label;

  // 1. Clothing Core
  const clothingItems: PackingRecommendation[] = [
    item('T-shirts / Tops', tripNights, 'Clothing'),
    item('Underwear', tripNights, 'Clothing'),
    item('Socks', tripNights, 'Clothing'),
    item('Pants / Shorts', Math.ceil(tripNights / 2), 'Clothing'),
    item('Sleepwear', tripNights <= 4 ? 1 : 2, 'Clothing'),
  ];

  // Adjust for hot weather
  if (summary.hasHot || summary.avgHigh >= 80) {
    clothingItems.push(item('Shorts', Math.ceil(tripNights / 2), 'Clothing'));
    clothingItems.push(item('Light / breathable tops', Math.min(3, tripNights), 'Clothing'));
  }

  categories.push({ id: 'clothing', label: 'Clothing Core', icon: 'shirt', items: clothingItems });

  // 2. Layers & Outerwear
  const layerItems: PackingRecommendation[] = [];
  if (summary.avgHigh < 75) {
    layerItems.push(item('Hoodie / Sweater', 1, 'Layers & Outerwear'));
  }
  if (summary.avgLow < 55 || summary.hasCold) {
    layerItems.push(item('Light jacket', 1, 'Layers & Outerwear'));
  }
  if (summary.hasCold || summary.avgLow < 35) {
    layerItems.push(
      seasonalItem('Warm coat / Puffer', 1, 'Layers & Outerwear', 'Typical cold temperatures', summary, weatherMode)
    );
  }
  if (summary.hasSnow || summary.avgLow < 25) {
    layerItems.push(
      seasonalItem('Thermal base layer', 1, 'Layers & Outerwear', 'Typical cold/snow period', summary, weatherMode)
    );
  }
  if (layerItems.length > 0) {
    categories.push({ id: 'layers', label: 'Layers & Outerwear', icon: 'coat', items: layerItems });
  }

  // 3. Rain & Wet Weather
  if (summary.hasRain || summary.precipTypeHint === 'rain' || summary.precipTypeHint === 'mixed') {
    const rainItems: PackingRecommendation[] = [
      seasonalItem('Rain jacket / Shell', 1, 'Rain & Wet Weather', 'Typical wet period', summary, weatherMode),
      seasonalItem('Compact umbrella', 1, 'Rain & Wet Weather', 'Typical wet period', summary, weatherMode),
    ];
    if (summary.precipTypeHint === 'rain' && summary.avgLow < 50) {
      rainItems.push(
        seasonalItem('Waterproof shoes/boots', 1, 'Rain & Wet Weather', 'Rain + cool temperatures', summary, weatherMode)
      );
    }
    categories.push({ id: 'rain', label: 'Rain & Wet Weather', icon: 'cloud-rain', items: rainItems });
  }

  // 4. Cold / Snow Gear
  if (summary.hasSnow || (summary.precipTypeHint === 'snow' && summary.hasCold)) {
    const snowItems: PackingRecommendation[] = [
      seasonalItem('Insulated / Snow boots', 1, 'Cold / Snow Gear', 'Typical snow period', summary, weatherMode),
      seasonalItem('Warm gloves', 1, 'Cold / Snow Gear', 'Typical cold mornings', summary, weatherMode),
      seasonalItem('Warm hat / Beanie', 1, 'Cold / Snow Gear', 'Typical cold mornings', summary, weatherMode),
      seasonalItem('Scarf / Neck gaiter', 1, 'Cold / Snow Gear', 'Typical cold period', summary, weatherMode),
    ];
    categories.push({ id: 'snow', label: 'Cold / Snow Gear', icon: 'snowflake', items: snowItems });
  }

  // 5. Footwear
  const footwearItems: PackingRecommendation[] = [
    item('Comfortable walking shoes', 1, 'Footwear'),
  ];
  if (tripType === 'business' || tripType === 'mixed') {
    footwearItems.push(item('Dress shoes', 1, 'Footwear'));
  }
  if (summary.hasHot || summary.avgHigh >= 80 || destinationType === 'beach') {
    footwearItems.push(item('Sandals / Flip-flops', 1, 'Footwear'));
  }
  categories.push({ id: 'footwear', label: 'Footwear', icon: 'footprints', items: footwearItems });

  // 6. Accessories
  const accessoryItems: PackingRecommendation[] = [];
  if (summary.hasHot || summary.avgHigh >= 75 || summary.cloudCoverHint === 'mostly_sunny') {
    accessoryItems.push(item('Sunglasses', 1, 'Accessories'));
    accessoryItems.push(item('Sun hat / Cap', 1, 'Accessories'));
  }
  if (summary.hasCold && !summary.hasSnow) {
    // Only add gloves here if not already in snow gear
    accessoryItems.push(
      seasonalItem('Light gloves', 1, 'Accessories', 'Typical cool mornings', summary, weatherMode)
    );
  }
  if (accessoryItems.length > 0) {
    categories.push({ id: 'accessories', label: 'Accessories', icon: 'glasses', items: accessoryItems });
  }

  // 7. Swimwear (only if beach destination or hot climate)
  if (destinationType === 'beach' || (summary.hasHot && summary.avgHigh >= 85)) {
    const swimItems: PackingRecommendation[] = [
      item('Swimsuit', 2, 'Swimwear & Beach'),
      item('Beach towel', 1, 'Swimwear & Beach'),
      item('Sunscreen SPF 30+', 1, 'Swimwear & Beach'),
      item('After-sun lotion', 1, 'Swimwear & Beach'),
    ];
    categories.push({ id: 'swim', label: 'Swimwear & Beach', icon: 'waves', items: swimItems });
  }

  // 8. Toiletries & Health
  const toiletryItems: PackingRecommendation[] = [
    item('Toothbrush & Toothpaste', 1, 'Toiletries & Health'),
    item('Deodorant', 1, 'Toiletries & Health'),
    item('Shampoo / Conditioner', 1, 'Toiletries & Health'),
    item('Face wash / Moisturizer', 1, 'Toiletries & Health'),
    item('Prescription medications', 1, 'Toiletries & Health'),
    item('Basic first aid kit', 1, 'Toiletries & Health'),
  ];
  if (summary.hasHot || summary.avgHigh >= 80) {
    toiletryItems.push(item('Sunscreen SPF 30+', 1, 'Toiletries & Health'));
    toiletryItems.push(item('Lip balm with SPF', 1, 'Toiletries & Health'));
  }
  categories.push({ id: 'toiletries', label: 'Toiletries & Health', icon: 'heart-pulse', items: toiletryItems });

  // 9. Tech & Chargers
  const techItems: PackingRecommendation[] = [
    item('Phone charger', 1, 'Tech & Chargers'),
    item('Portable battery pack', 1, 'Tech & Chargers'),
    item('Headphones / Earbuds', 1, 'Tech & Chargers'),
  ];
  if (tripType === 'business') {
    techItems.push(item('Laptop + charger', 1, 'Tech & Chargers'));
  }
  categories.push({ id: 'tech', label: 'Tech & Chargers', icon: 'zap', items: techItems });

  // 10. Documents & Critical
  const docItems: PackingRecommendation[] = [
    item('ID / Passport', 1, 'Documents & Critical Items'),
    item('Boarding passes / Tickets', 1, 'Documents & Critical Items'),
    item('Travel insurance docs', 1, 'Documents & Critical Items'),
    item('Credit / Debit cards', 1, 'Documents & Critical Items'),
  ];
  if (tripType === 'business') {
    docItems.push(item('Business cards', 1, 'Documents & Critical Items'));
  }
  categories.push({ id: 'documents', label: 'Documents & Critical Items', icon: 'file-text', items: docItems });

  // Business extras
  if (tripType === 'business' || tripType === 'mixed') {
    const bizItems: PackingRecommendation[] = [
      item('Professional attire', Math.min(tripDays, 3), 'Business'),
      item('Dress shirt', Math.min(tripDays, 3), 'Business'),
      item('Belt', 1, 'Business'),
    ];
    categories.push({ id: 'business', label: 'Business', icon: 'briefcase', items: bizItems });
  }

  // Flatten all items
  const allItems = categories.flatMap(c => c.items);

  return { modeLabel, anchorLabel, categories, allItems, weatherMode };
}

// ============================================================================
// HELPERS
// ============================================================================

function item(itemName: string, quantity: number, category: string): PackingRecommendation {
  return {
    itemName,
    quantity,
    ownItLikely: true,
    suggestBuyEarlyIfMissing: false,
    category,
  };
}

function seasonalItem(
  itemName: string,
  quantity: number,
  category: string,
  rationale: string,
  _summary: WeatherSummary,
  weatherMode: WeatherMode
): PackingRecommendation {
  return {
    itemName,
    quantity,
    ownItLikely: false,
    suggestBuyEarlyIfMissing: weatherMode === 'SEASONAL_NORMALS',
    rationale,
    category,
  };
}
