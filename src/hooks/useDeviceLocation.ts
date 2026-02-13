/**
 * v2.5.3: React hook for canonical device location
 *
 * Wraps the device location helper for use in components.
 * Requests permission once on mount, caches result for session.
 */

import { useState, useEffect } from 'react';
import {
  getDeviceLocation,
  getCachedDeviceLocation,
  getLocationStatus,
  type DeviceCoords,
  type LocationStatus,
} from '@/lib/deviceLocation';

interface UseDeviceLocationResult {
  coords: DeviceCoords | null;
  status: LocationStatus;
  isLoading: boolean;
}

export function useDeviceLocation(): UseDeviceLocationResult {
  const [coords, setCoords] = useState<DeviceCoords | null>(getCachedDeviceLocation);
  const [status, setStatus] = useState<LocationStatus>(getLocationStatus);

  useEffect(() => {
    // If already resolved, sync state immediately
    const currentStatus = getLocationStatus();
    if (currentStatus === 'granted' || currentStatus === 'denied' || currentStatus === 'unavailable') {
      setCoords(getCachedDeviceLocation());
      setStatus(currentStatus);
      return;
    }

    // Request once
    let cancelled = false;
    getDeviceLocation().then((result) => {
      if (!cancelled) {
        setCoords(result.coords);
        setStatus(result.status);
      }
    });

    return () => { cancelled = true; };
  }, []);

  return {
    coords,
    status,
    isLoading: status === 'idle' || status === 'requesting',
  };
}
