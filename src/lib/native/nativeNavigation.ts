/**
 * v1.0.0: Native Navigation Bridge
 *
 * Handles map and external URL launching on iOS native (Capacitor/WKWebView)
 * so navigation opens the native Apple Maps or Google Maps apps instead of
 * a blank/web browser experience.
 *
 * On iOS native:
 *   - Uses maps:// URL scheme for Apple Maps (system scheme, always allowed)
 *   - Falls back to comgooglemaps:// for Google Maps app
 *   - Non-map URLs use Capacitor Browser (SFSafariViewController)
 *
 * On web / Android: keeps existing window.open behaviour.
 */

import { Browser } from '@capacitor/browser';
import { isNativeIOS, isNativePlatform } from './platform';

// ============================================================================
// TYPES
// ============================================================================

export interface NativeMapParams {
  query: string;
  lat?: number;
  lng?: number;
  label?: string;
}

// ============================================================================
// iOS URL SCHEME BUILDERS
// ============================================================================

/**
 * Build an Apple Maps URL scheme for iOS native.
 * docs: https://developer.apple.com/documentation/mapkit/mklaunchoptions
 */
export function buildAppleMapsUrl(params: NativeMapParams): string {
  const { query, lat, lng } = params;
  if (lat != null && lng != null) {
    return `maps://?daddr=${lat},${lng}&q=${encodeURIComponent(query)}`;
  }
  return `maps://?q=${encodeURIComponent(query)}&dirflg=d`;
}

/**
 * Build a Google Maps iOS app URL scheme.
 * docs: https://developers.google.com/maps/documentation/urls/ios-urlscheme
 */
export function buildGoogleMapsAppUrl(params: NativeMapParams): string {
  const { query, lat, lng } = params;
  if (lat != null && lng != null) {
    return `comgooglemaps://?daddr=${lat},${lng}&q=${encodeURIComponent(query)}`;
  }
  return `comgooglemaps://?q=${encodeURIComponent(query)}&directionsmode=driving`;
}

// ============================================================================
// NATIVE OPENERS
// ============================================================================

/**
 * Open a map destination on iOS native using Apple Maps URL scheme.
 * Falls back to Google Maps app scheme, then to Browser.open().
 *
 * PRECONDITION: caller should have already checked isNativeIOS() if they
 * want platform-specific branching; this function is safe on any platform.
 */
export async function openNativeMap(params: NativeMapParams): Promise<void> {
  if (!isNativeIOS()) {
    return;
  }

  // Google Maps first — preferred driver app
  const googleUrl = buildGoogleMapsAppUrl(params);
  try {
    window.location.href = googleUrl;
    // Give iOS a moment to switch apps; if Google Maps isn't installed
    // the scheme silently fails and we fall through.
    await new Promise((r) => setTimeout(r, 500));
    if (document.visibilityState === 'hidden') return;
  } catch {
    // fall through
  }

  // Apple Maps fallback — system scheme, always works on iOS
  const appleUrl = buildAppleMapsUrl(params);
  try {
    window.location.href = appleUrl;
    await new Promise((r) => setTimeout(r, 500));
    if (document.visibilityState === 'hidden') return;
  } catch {
    // fall through
  }

  // Ultimate fallback: in-app browser with web Google Maps
  const webFallback = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(params.query)}`;
  try {
    await Browser.open({ url: webFallback });
  } catch {
    window.open(webFallback, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Open any external URL.
 * On native iOS uses Capacitor Browser (SFSafariViewController).
 * On web uses window.open.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (isNativePlatform()) {
    try {
      await Browser.open({ url });
      return;
    } catch {
      // fall through to window.open
    }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Open a navigation result that may contain coordinates or a query.
 * Single entry point for all "Go" / "Navigate" buttons.
 */
export async function openNavigationResult(result: {
  url: string;
  query: string;
  lat?: number;
  lng?: number;
  label?: string;
}): Promise<void> {
  if (isNativeIOS()) {
    await openNativeMap({
      query: result.query,
      lat: result.lat,
      lng: result.lng,
      label: result.label,
    });
    return;
  }

  // Web + Android: existing behaviour
  const url = result.url;

  // 1) Try breakout from iframe/sandbox environments
  try {
    const topWin = window.top;
    if (topWin && typeof topWin.open === 'function') {
      const opened = topWin.open(url, '_blank', 'noopener,noreferrer');
      if (opened) return;
    }
  } catch {
    // Cross-origin or sandbox — fall through
  }

  // 2) Standard popup
  try {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (opened) return;
  } catch {
    // Popup blocked — fall through
  }

  // 3) Guaranteed fallback
  window.location.assign(url);
}
