/**
 * v3.4.8: Canonical Explore Origin Model
 *
 * Single source of truth for where Explore searches from.
 * All Explore queries MUST use originLatLng from this model.
 */

export type ExploreOriginType = 'DEVICE' | 'STAY' | 'MANUAL';

export type ExploreOriginStatus = 'READY' | 'NEEDS_PERMISSION' | 'NEEDS_STAY' | 'NEEDS_MANUAL';

export interface ExploreOriginLatLng {
  lat: number;
  lng: number;
}

export interface ExploreOrigin {
  originType: ExploreOriginType;
  originLabel: string;
  originLatLng: ExploreOriginLatLng | null;
  originStatus: ExploreOriginStatus;
}

/**
 * Build a DEVICE origin from device coords.
 */
export function buildDeviceOrigin(
  coords: { lat: number; lng: number } | null,
  status: 'granted' | 'denied' | 'unavailable' | 'requesting' | 'idle'
): ExploreOrigin {
  if (coords && status === 'granted') {
    return {
      originType: 'DEVICE',
      originLabel: 'Current location',
      originLatLng: { lat: coords.lat, lng: coords.lng },
      originStatus: 'READY',
    };
  }
  return {
    originType: 'DEVICE',
    originLabel: 'Current location',
    originLatLng: null,
    originStatus: status === 'denied' || status === 'unavailable' ? 'NEEDS_PERMISSION' : 'READY',
  };
}

/**
 * Build a STAY origin from a booking.
 */
export function buildStayOrigin(
  stayName: string,
  address: string | null
): ExploreOrigin {
  // In a real implementation, we'd geocode the address to get lat/lng.
  // For now, we mark as READY if we have an address (mock behavior matches existing).
  return {
    originType: 'STAY',
    originLabel: stayName || 'My stay',
    originLatLng: null, // Would be geocoded in production
    originStatus: 'READY',
  };
}

/**
 * Build a MANUAL origin from user-entered text.
 */
export function buildManualOrigin(locationText: string): ExploreOrigin {
  if (!locationText.trim()) {
    return {
      originType: 'MANUAL',
      originLabel: '',
      originLatLng: null,
      originStatus: 'NEEDS_MANUAL',
    };
  }
  return {
    originType: 'MANUAL',
    originLabel: locationText.trim(),
    originLatLng: null, // Would be geocoded in production
    originStatus: 'READY',
  };
}
