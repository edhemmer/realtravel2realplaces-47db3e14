/**
 * v2.5.6: Gas Locator Pill for Rental Car Return Day
 *
 * Shows on the rental return calendar day only.
 * Countdown: from 12:00 AM → 0 at booking return time.
 * Click: opens gas stations near the best location anchor.
 * Uses canonical device location helper (v2.5.3).
 *
 * No new reminder systems, no new data fields.
 */

import { useState, useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Fuel, Loader2 } from 'lucide-react';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import { buildGoogleMapsSearchUrl, type LocationContext } from '@/lib/deviceLocation';

interface GasLocatorPillProps {
  /** Rental return datetime string (ISO or local) */
  endDatetime: string | null;
  /** Return location text (airport, address, etc.) */
  returnLocation?: string | null;
  /** Rental address */
  address?: string | null;
  /** Trip city fallback */
  tripCity: string;
  /** Trip state fallback */
  tripState?: string;
  /** Trip country fallback */
  tripCountry: string;
}

/**
 * Extract YYYY-MM-DD from a datetime string without Date() timezone shifting.
 * Handles both "2026-02-15T10:00" and "2026-02-15" formats.
 */
function extractDatePart(dt: string): string {
  return dt.substring(0, 10);
}

/**
 * Extract hours and minutes from a datetime string.
 * Returns { hours, minutes } or null if no time component.
 */
function extractTimeParts(dt: string): { hours: number; minutes: number } | null {
  // Look for "T" separator or space separator
  const tIdx = dt.indexOf('T');
  const spaceIdx = dt.indexOf(' ');
  const sepIdx = tIdx >= 0 ? tIdx : spaceIdx;
  
  if (sepIdx < 0 || dt.length <= sepIdx + 1) return null;
  
  const timePart = dt.substring(sepIdx + 1);
  const [hStr, mStr] = timePart.split(':');
  const hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr || '0', 10);
  
  if (isNaN(hours)) return null;
  return { hours, minutes: isNaN(minutes) ? 0 : minutes };
}

/**
 * Get today's date as YYYY-MM-DD in local timezone.
 */
function getTodayLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get current local time as total minutes since midnight.
 */
function getCurrentMinutesSinceMidnight(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Format minutes into compact "Xh Ym" display.
 */
function formatCountdown(totalMinutes: number): string {
  if (totalMinutes <= 0) return '';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function GasLocatorPill({
  endDatetime,
  returnLocation,
  address,
  tripCity,
  tripState,
  tripCountry,
}: GasLocatorPillProps) {
  const { coords: deviceCoords, isLoading: locationLoading } = useDeviceLocation();
  const [minutesTick, setMinutesTick] = useState(0);

  // Update every minute for countdown
  useEffect(() => {
    const interval = setInterval(() => {
      setMinutesTick(t => t + 1);
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  // Determine if today is the return day
  const returnDateStr = endDatetime ? extractDatePart(endDatetime) : null;
  const todayStr = getTodayLocal();
  const isReturnDay = returnDateStr === todayStr;

  // Calculate countdown
  const countdown = useMemo(() => {
    if (!isReturnDay || !endDatetime) return null;

    const timeParts = extractTimeParts(endDatetime);
    // Default to 12:00 PM if no time
    const returnMinutes = timeParts
      ? timeParts.hours * 60 + timeParts.minutes
      : 12 * 60;

    const currentMinutes = getCurrentMinutesSinceMidnight();
    const remaining = returnMinutes - currentMinutes;

    if (remaining <= 0) return null; // Past return time — hide countdown
    return formatCountdown(remaining);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReturnDay, endDatetime, minutesTick]);

  // Don't render if not return day
  if (!isReturnDay) return null;

  // Build location context for gas station search
  const locationCtx: LocationContext = {
    deviceCoords,
    city: tripCity,
    state: tripState,
    country: tripCountry,
  };

  // Override with return-specific location if no device coords
  const gasSearchCtx: LocationContext = deviceCoords
    ? locationCtx
    : {
        deviceCoords: null,
        city: returnLocation || address || tripCity,
        state: tripState,
        country: tripCountry,
      };

  const handleClick = () => {
    if (locationLoading) return;
    const url = buildGoogleMapsSearchUrl('gas station', gasSearchCtx);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <Badge
      variant="secondary"
      className="cursor-pointer hover:bg-secondary/80 transition-all gap-1.5 text-xs py-1 px-2.5 select-none"
      onClick={handleClick}
      aria-disabled={locationLoading}
    >
      {locationLoading ? (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          Getting location…
        </>
      ) : (
        <>
          <Fuel className="w-3 h-3" />
          Gas Locator{countdown ? ` · ${countdown}` : ''}
        </>
      )}
    </Badge>
  );
}
