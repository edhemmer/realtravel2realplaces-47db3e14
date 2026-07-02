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
  type DeviceLocationOptions,
  type LocationStatus,
} from '@/lib/deviceLocation';

interface UseDeviceLocationResult {
  coords: DeviceCoords | null;
  status: LocationStatus;
  isLoading: boolean;
}

interface UseDeviceLocationOptions extends DeviceLocationOptions {
  refreshMs?: number;
}

export function useDeviceLocation(options: UseDeviceLocationOptions = {}): UseDeviceLocationResult {
  const [coords, setCoords] = useState<DeviceCoords | null>(getCachedDeviceLocation);
  const [status, setStatus] = useState<LocationStatus>(getLocationStatus);

  useEffect(() => {
    // If already resolved, sync state immediately
    const currentStatus = getLocationStatus();
    if (!options.forceRefresh && (currentStatus === 'granted' || currentStatus === 'denied' || currentStatus === 'unavailable')) {
      setCoords(getCachedDeviceLocation());
      setStatus(currentStatus);
      return;
    }

    // Request once
    let cancelled = false;
    getDeviceLocation(options).then((result) => {
      if (!cancelled) {
        setCoords(result.coords);
        setStatus(result.status);
      }
    });

    return () => { cancelled = true; };
  }, [options.forceRefresh, options.highAccuracy, options.maximumAgeMs, options.timeoutMs]);

  useEffect(() => {
    if (!options.refreshMs || options.refreshMs <= 0) return;

    let cancelled = false;
    const interval = window.setInterval(() => {
      getDeviceLocation({ ...options, forceRefresh: true }).then((result) => {
        if (!cancelled) {
          setCoords(result.coords);
          setStatus(result.status);
        }
      });
    }, options.refreshMs);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [options.highAccuracy, options.maximumAgeMs, options.refreshMs, options.timeoutMs]);

  return {
    coords,
    status,
    isLoading: status === 'idle' || status === 'requesting',
  };
}
