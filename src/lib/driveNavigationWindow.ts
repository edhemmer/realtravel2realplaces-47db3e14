import type { DriveAlert, DriveNavigationTarget, FuelProjection, RoutePreview, WeatherRisk } from '@/lib/driveIntelligenceHelper';
import type { DeviceCoords } from '@/lib/deviceLocation';

export interface DriveCockpitInput {
  navTarget: DriveNavigationTarget | null;
  deviceCoords: DeviceCoords | null;
  routePreview: RoutePreview;
  alerts: DriveAlert[];
  weatherRisk: WeatherRisk;
  fuelProjection: FuelProjection;
  online: boolean;
}

export interface DriveCockpitModel {
  mapEmbedUrl: string | null;
  mapFallbackUrl: string | null;
  gasSearchUrl: string;
  gasSearchQuery: string;
  gasSearchLat?: number;
  gasSearchLng?: number;
  roadConditionLabel: string;
  roadConditionTone: 'good' | 'watch' | 'danger' | 'offline';
  offlineLabel: string;
  routeLabel: string;
  fuelLabel: string;
}

const GAS_SEARCH_ZOOM_FOR_15_MILES = 11;

function encode(value: string): string {
  return encodeURIComponent(value);
}

function buildDestinationQuery(navTarget: DriveNavigationTarget): string {
  if (navTarget.lat != null && navTarget.lng != null) {
    return `${navTarget.lat},${navTarget.lng}`;
  }
  return navTarget.addressString;
}

export function buildDriveMapEmbedUrl(navTarget: DriveNavigationTarget | null): string | null {
  if (!navTarget) return null;
  return `https://www.google.com/maps?output=embed&q=${encode(buildDestinationQuery(navTarget))}`;
}

export function buildDriveMapFallbackUrl(navTarget: DriveNavigationTarget | null): string | null {
  if (!navTarget) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encode(buildDestinationQuery(navTarget))}`;
}

export function buildGasSearchUrl(params: {
  deviceCoords: DeviceCoords | null;
  fallbackCity: string;
  fallbackState?: string | null;
  fallbackCountry: string;
}): string {
  if (params.deviceCoords) {
    return `https://www.google.com/maps/search/${encode('gas station')}/@${params.deviceCoords.lat},${params.deviceCoords.lng},${GAS_SEARCH_ZOOM_FOR_15_MILES}z`;
  }
  const fallback = [params.fallbackCity, params.fallbackState, params.fallbackCountry].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encode(`gas station near ${fallback}`)}`;
}

export function resolveDriveCockpitModel(input: DriveCockpitInput): DriveCockpitModel {
  const criticalAlert = input.alerts.find((alert) => alert.severity === 'critical');
  const warningAlert = input.alerts.find((alert) => alert.severity === 'warning');

  const roadConditionTone: DriveCockpitModel['roadConditionTone'] =
    !input.online ? 'offline'
    : criticalAlert || input.weatherRisk.severity === 'critical' ? 'danger'
    : warningAlert || input.weatherRisk.hasRisk ? 'watch'
    : 'good';

  const roadConditionLabel =
    roadConditionTone === 'offline' ? 'Cached guidance'
    : roadConditionTone === 'danger' ? criticalAlert?.message || input.weatherRisk.message || 'Serious route risk'
    : roadConditionTone === 'watch' ? warningAlert?.message || input.weatherRisk.message || 'Use extra attention'
    : 'Route looks calm';

  const distance = input.routePreview.distanceMiles;
  const duration = input.routePreview.durationMinutes;
  const routeLabel =
    distance != null && duration != null ? `${distance} mi · about ${Math.max(1, Math.round(duration / 60))} hr`
    : distance != null ? `${distance} mi`
    : 'Live route from Maps';

  const fuelLabel =
    input.fuelProjection.fuelStatus === 'REFUEL_RECOMMENDED' ? 'Fuel stop recommended'
    : input.fuelProjection.fuelStatus === 'OK_FOR_SEGMENT' ? 'Fuel range OK'
    : 'Fuel range unknown';

  return {
    mapEmbedUrl: buildDriveMapEmbedUrl(input.navTarget),
    mapFallbackUrl: buildDriveMapFallbackUrl(input.navTarget),
    gasSearchUrl: input.deviceCoords
      ? `https://www.google.com/maps/search/${encode('gas station')}/@${input.deviceCoords.lat},${input.deviceCoords.lng},${GAS_SEARCH_ZOOM_FOR_15_MILES}z`
      : 'https://www.google.com/maps/search/?api=1&query=gas%20station',
    gasSearchQuery: 'gas station',
    gasSearchLat: input.deviceCoords?.lat,
    gasSearchLng: input.deviceCoords?.lng,
    roadConditionLabel,
    roadConditionTone,
    offlineLabel: input.online ? 'Live sync on' : 'Offline cache active',
    routeLabel,
    fuelLabel,
  };
}

export { GAS_SEARCH_ZOOM_FOR_15_MILES };
