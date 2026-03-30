/**
 * v5.10.2: Movement Execution Helper
 * 
 * Canonical layer that converts a multimodal movement recommendation
 * into executable navigation actions (deep links).
 * 
 * Pure transformation only — no route computation, no API calls,
 * no mode re-ranking. Consumes the decision, produces the action.
 */

// ============================================================================
// TYPES
// ============================================================================

export type ExecutionMode = 'drive' | 'transit' | 'walk';
export type ExecutionProvider = 'google_maps' | 'apple_maps' | 'browser_fallback';
export type PlatformContext = 'ios' | 'android' | 'web';

export interface MovementExecutionInput {
  recommendedMode: ExecutionMode;
  origin?: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number };
  platformContext?: PlatformContext;
  recommendationTimestamp?: string;
}

export interface MovementExecutionResult {
  executionType: ExecutionMode;
  primaryExecutionUrl: string;
  fallbackExecutionUrls: string[];
  preferredProvider: ExecutionProvider;
  isExecutable: boolean;
  reasonIfNotExecutable?: string;
  hasFallback: boolean;
  generatedAt: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes

const GOOGLE_MAPS_TRAVELMODE: Record<ExecutionMode, string> = {
  drive: 'driving',
  transit: 'transit',
  walk: 'walking',
};

// ============================================================================
// PLATFORM DETECTION
// ============================================================================

function detectPlatform(): PlatformContext {
  if (typeof navigator === 'undefined') return 'web';
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'web';
}

// ============================================================================
// VALIDATION
// ============================================================================

function isValidCoord(c: { lat: number; lng: number } | null | undefined): c is { lat: number; lng: number } {
  return c != null && isFinite(c.lat) && isFinite(c.lng) &&
    c.lat >= -90 && c.lat <= 90 && c.lng >= -180 && c.lng <= 180;
}

function validateInput(input: MovementExecutionInput): string | null {
  if (!isValidCoord(input.destination)) return 'missing_or_invalid_destination';
  const validModes: ExecutionMode[] = ['drive', 'transit', 'walk'];
  if (!validModes.includes(input.recommendedMode)) return 'unsupported_execution_mode';
  if (input.recommendationTimestamp) {
    const age = Date.now() - new Date(input.recommendationTimestamp).getTime();
    if (age > STALE_THRESHOLD_MS) return 'stale_recommendation';
  }
  return null;
}

// ============================================================================
// DEEP LINK BUILDERS
// ============================================================================

function buildGoogleMapsUrl(
  mode: ExecutionMode,
  destination: { lat: number; lng: number },
  origin?: { lat: number; lng: number } | null,
): string {
  const dest = `${destination.lat},${destination.lng}`;
  const travelmode = GOOGLE_MAPS_TRAVELMODE[mode];
  let url = `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=${travelmode}`;
  if (isValidCoord(origin)) {
    url += `&origin=${origin.lat},${origin.lng}`;
  }
  return url;
}

function buildAppleMapsUrl(
  mode: ExecutionMode,
  destination: { lat: number; lng: number },
  origin?: { lat: number; lng: number } | null,
): string {
  const dirflg: Record<ExecutionMode, string> = { drive: 'd', transit: 'r', walk: 'w' };
  let url = `https://maps.apple.com/?daddr=${destination.lat},${destination.lng}&dirflg=${dirflg[mode]}`;
  if (isValidCoord(origin)) {
    url += `&saddr=${origin.lat},${origin.lng}`;
  }
  return url;
}

// ============================================================================
// PROVIDER PREFERENCE
// ============================================================================

function selectProvider(platform: PlatformContext): ExecutionProvider {
  if (platform === 'ios') return 'apple_maps';
  return 'google_maps';
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Convert a movement recommendation into an executable navigation action.
 * Pure, synchronous, no network calls.
 */
export function buildMovementExecution(input: MovementExecutionInput): MovementExecutionResult {
  const now = new Date().toISOString();
  const validationError = validateInput(input);

  if (validationError) {
    return {
      executionType: input.recommendedMode || 'drive',
      primaryExecutionUrl: '',
      fallbackExecutionUrls: [],
      preferredProvider: 'google_maps',
      isExecutable: false,
      reasonIfNotExecutable: validationError,
      hasFallback: false,
      generatedAt: now,
    };
  }

  const platform = input.platformContext || detectPlatform();
  const provider = selectProvider(platform);
  const { recommendedMode: mode, destination, origin } = input;

  const googleUrl = buildGoogleMapsUrl(mode, destination, origin);
  const appleUrl = buildAppleMapsUrl(mode, destination, origin);

  let primaryUrl: string;
  const fallbacks: string[] = [];

  if (provider === 'apple_maps') {
    primaryUrl = appleUrl;
    fallbacks.push(googleUrl);
  } else {
    primaryUrl = googleUrl;
    fallbacks.push(appleUrl);
  }

  return {
    executionType: mode,
    primaryExecutionUrl: primaryUrl,
    fallbackExecutionUrls: fallbacks,
    preferredProvider: provider,
    isExecutable: true,
    hasFallback: fallbacks.length > 0,
    generatedAt: now,
  };
}
