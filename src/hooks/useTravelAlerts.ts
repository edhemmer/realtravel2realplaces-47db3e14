import { useMemo, useEffect, useState } from 'react';
import { useTripWeather } from './useWeather';
import { Booking, Parking, Trip } from '@/types/database';
import { parseISO, addMinutes, isBefore, isAfter, differenceInMinutes, format, differenceInDays } from 'date-fns';

export interface TravelAlert {
  id: string;
  type: 'weather_change' | 'departure_reminder' | 'parking_expiry' | 'severe_weather' | 'packing_update';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionLabel?: string;
  actionUrl?: string;
  relatedId?: string;
  timestamp: Date;
}

interface PreviousWeather {
  hasRain: boolean;
  hasCold: boolean;
  hasHot: boolean;
  hasSnow: boolean;
  avgHigh: number | null;
  avgLow: number | null;
  fetchedAt: number;
}

const WEATHER_CACHE_KEY = 'trip_weather_cache';
const WEATHER_CACHE_DURATION = 1000 * 60 * 60 * 6; // 6 hours

function getWeatherCache(tripId: string): PreviousWeather | null {
  try {
    const cache = localStorage.getItem(`${WEATHER_CACHE_KEY}_${tripId}`);
    if (!cache) return null;
    const parsed = JSON.parse(cache);
    if (Date.now() - parsed.fetchedAt > WEATHER_CACHE_DURATION * 4) {
      // Cache is too old, remove it
      localStorage.removeItem(`${WEATHER_CACHE_KEY}_${tripId}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setWeatherCache(tripId: string, weather: PreviousWeather) {
  try {
    localStorage.setItem(`${WEATHER_CACHE_KEY}_${tripId}`, JSON.stringify(weather));
  } catch {
    // Ignore storage errors
  }
}

export function useTravelAlerts(
  trip: Trip | null,
  bookings: Booking[],
  parkingList: Parking[],
  temperatureUnit: 'fahrenheit' | 'celsius' = 'fahrenheit'
) {
  const [weatherAlerts, setWeatherAlerts] = useState<TravelAlert[]>([]);
  
  const { tripForecast, weatherAnalysis, isLoading: weatherLoading } = useTripWeather(
    trip?.destination_city || '',
    trip?.destination_country || '',
    trip?.start_date || '',
    trip?.end_date || '',
    trip?.destination_state || undefined,
    temperatureUnit
  );

  const now = new Date();
  const tripId = trip?.id;

  // Create stable dependency keys for weather data
  const weatherAnalysisKey = JSON.stringify({
    hasRain: weatherAnalysis.hasRain,
    hasCold: weatherAnalysis.hasCold,
    hasHot: weatherAnalysis.hasHot,
    hasSnow: weatherAnalysis.hasSnow,
    avgHigh: weatherAnalysis.avgHigh,
    avgLow: weatherAnalysis.avgLow,
  });
  const tripForecastKey = JSON.stringify(tripForecast.map(d => d.date));

  // Weather change detection
  useEffect(() => {
    if (!tripId || weatherLoading || !weatherAnalysis.avgHigh) return;

    const previousWeather = getWeatherCache(tripId);
    const currentWeather: PreviousWeather = {
      ...weatherAnalysis,
      fetchedAt: Date.now(),
    };

    const alerts: TravelAlert[] = [];

    if (previousWeather && Date.now() - previousWeather.fetchedAt > WEATHER_CACHE_DURATION) {
      // Check for significant weather changes
      const changes: string[] = [];

      if (!previousWeather.hasRain && currentWeather.hasRain) {
        changes.push('Rain now expected');
      }
      if (!previousWeather.hasSnow && currentWeather.hasSnow) {
        changes.push('Snow now expected');
      }
      if (!previousWeather.hasCold && currentWeather.hasCold) {
        changes.push('Cold temperatures now expected');
      }
      if (!previousWeather.hasHot && currentWeather.hasHot) {
        changes.push('Hot temperatures now expected');
      }
      
      // Check for significant temperature swings (>10°F)
      if (previousWeather.avgHigh && currentWeather.avgHigh) {
        const tempDiff = Math.abs(currentWeather.avgHigh - previousWeather.avgHigh);
        if (tempDiff >= 10) {
          changes.push(`Temperature changed by ${tempDiff}°F`);
        }
      }

      if (changes.length > 0) {
        alerts.push({
          id: `weather-change-${Date.now()}`,
          type: 'packing_update',
          severity: 'warning',
          title: '🌤️ Weather Forecast Updated',
          message: `${changes.join(', ')}. Consider reviewing your packing list.`,
          timestamp: new Date(),
        });
      }
    }

    // Check for severe weather in forecast
    const severeConditions = tripForecast.filter(day => 
      day.condition.includes('Thunderstorm') || 
      day.condition.includes('Snow') && day.precipitation > 70
    );

    if (severeConditions.length > 0) {
      alerts.push({
        id: `severe-weather-${Date.now()}`,
        type: 'severe_weather',
        severity: 'critical',
        title: '⚠️ Severe Weather Alert',
        message: `Severe weather expected on ${severeConditions.map(d => format(parseISO(d.date), 'MMM d')).join(', ')}. Check local advisories.`,
        timestamp: new Date(),
      });
    }

    setWeatherAlerts(alerts);
    setWeatherCache(tripId, currentWeather);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, weatherAnalysisKey, tripForecastKey, weatherLoading]);

  // Departure and pickup reminders
  const departureAlerts = useMemo(() => {
    const alerts: TravelAlert[] = [];
    
    bookings.forEach(booking => {
      const startTime = parseISO(booking.start_datetime);
      const endTime = booking.end_datetime ? parseISO(booking.end_datetime) : null;
      
      // 30 minutes before departure alert
      const alertTime30 = addMinutes(startTime, -30);
      const alertTime60 = addMinutes(startTime, -60);
      const minutesUntilDeparture = differenceInMinutes(startTime, now);
      
      if (booking.booking_type === 'flight') {
        // For flights, show alert 2 hours before
        const alertTime2hr = addMinutes(startTime, -120);
        if (isAfter(now, alertTime2hr) && isBefore(now, startTime)) {
          alerts.push({
            id: `departure-${booking.id}`,
            type: 'departure_reminder',
            severity: minutesUntilDeparture <= 60 ? 'critical' : 'warning',
            title: '✈️ Flight Departure Soon',
            message: `${booking.airline || booking.vendor_name} departs in ${minutesUntilDeparture} minutes. Leave for airport now!`,
            actionLabel: booking.address ? 'Open Maps' : undefined,
            actionUrl: booking.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.address)}` : undefined,
            relatedId: booking.id,
            timestamp: now,
          });
        }
      } else if (booking.booking_type === 'car_rental') {
        // Pickup reminder
        if (isAfter(now, alertTime30) && isBefore(now, startTime)) {
          alerts.push({
            id: `pickup-${booking.id}`,
            type: 'departure_reminder',
            severity: 'warning',
            title: '🚗 Car Pickup in 30 min',
            message: `Pick up your rental from ${booking.rental_company || booking.vendor_name}${booking.pickup_location ? ` at ${booking.pickup_location}` : ''}`,
            actionLabel: booking.pickup_location ? 'Open Maps' : undefined,
            actionUrl: booking.pickup_location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.pickup_location)}` : undefined,
            relatedId: booking.id,
            timestamp: now,
          });
        }
        
        // Return reminder
        if (endTime) {
          const returnAlert30 = addMinutes(endTime, -30);
          const returnAlert60 = addMinutes(endTime, -60);
          const minutesUntilReturn = differenceInMinutes(endTime, now);
          
          if (isAfter(now, returnAlert60) && isBefore(now, endTime)) {
            alerts.push({
              id: `return-${booking.id}`,
              type: 'departure_reminder',
              severity: minutesUntilReturn <= 30 ? 'critical' : 'warning',
              title: '🚗 Car Return Due',
              message: `Return rental car to ${booking.rental_company || booking.vendor_name} in ${minutesUntilReturn} minutes${booking.return_location ? ` at ${booking.return_location}` : ''}`,
              actionLabel: booking.return_location ? 'Open Maps' : undefined,
              actionUrl: booking.return_location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.return_location)}` : undefined,
              relatedId: booking.id,
              timestamp: now,
            });
          }
        }
      } else if (booking.booking_type === 'stay') {
        // Check-in reminder (30 min before)
        if (isAfter(now, alertTime30) && isBefore(now, startTime)) {
          alerts.push({
            id: `checkin-${booking.id}`,
            type: 'departure_reminder',
            severity: 'info',
            title: '🏨 Check-in Time',
            message: `Check-in at ${booking.property_name || booking.vendor_name} in ${minutesUntilDeparture} minutes`,
            actionLabel: booking.address ? 'Open Maps' : undefined,
            actionUrl: booking.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.address)}` : undefined,
            relatedId: booking.id,
            timestamp: now,
          });
        }
        
        // Check-out reminder
        if (endTime) {
          const checkoutAlert60 = addMinutes(endTime, -60);
          const minutesUntilCheckout = differenceInMinutes(endTime, now);
          
          if (isAfter(now, checkoutAlert60) && isBefore(now, endTime)) {
            alerts.push({
              id: `checkout-${booking.id}`,
              type: 'departure_reminder',
              severity: minutesUntilCheckout <= 30 ? 'warning' : 'info',
              title: '🏨 Check-out Reminder',
              message: `Check-out from ${booking.property_name || booking.vendor_name} in ${minutesUntilCheckout} minutes`,
              relatedId: booking.id,
              timestamp: now,
            });
          }
        }
      } else if (booking.booking_type === 'activity') {
        // Activity start reminder
        if (isAfter(now, alertTime30) && isBefore(now, startTime)) {
          alerts.push({
            id: `activity-${booking.id}`,
            type: 'departure_reminder',
            severity: 'info',
            title: '🎯 Activity Starting Soon',
            message: `${booking.vendor_name} starts in ${minutesUntilDeparture} minutes`,
            actionLabel: booking.address ? 'Open Maps' : undefined,
            actionUrl: booking.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.address)}` : undefined,
            relatedId: booking.id,
            timestamp: now,
          });
        }
      }
    });

    return alerts;
  }, [bookings, now]);

  // Parking expiration alerts (15 min and 30 min before)
  const parkingAlerts = useMemo(() => {
    const alerts: TravelAlert[] = [];

    parkingList.forEach(parking => {
      if (!parking.end_datetime) return;
      
      const expirationTime = parseISO(parking.end_datetime);
      const alert15 = addMinutes(expirationTime, -15);
      const alert30 = addMinutes(expirationTime, -30);
      const minutesUntilExpiry = differenceInMinutes(expirationTime, now);
      
      if (isAfter(now, alert30) && isBefore(now, expirationTime)) {
        alerts.push({
          id: `parking-${parking.id}`,
          type: 'parking_expiry',
          severity: minutesUntilExpiry <= 15 ? 'critical' : 'warning',
          title: minutesUntilExpiry <= 15 ? '🚨 Parking Expiring NOW!' : '🅿️ Parking Expiring Soon',
          message: `${parking.label} expires in ${minutesUntilExpiry} minutes${parking.level_section_space ? ` (${parking.level_section_space})` : ''}`,
          actionLabel: parking.address ? 'Open Maps' : undefined,
          actionUrl: parking.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parking.address)}` : undefined,
          relatedId: parking.id,
          timestamp: now,
        });
      }
    });

    return alerts;
  }, [parkingList, now]);

  // Check if trip is coming up (within 7 days) for packing reminder
  const tripPreparationAlerts = useMemo(() => {
    const alerts: TravelAlert[] = [];
    
    if (!trip) return alerts;
    
    const tripStart = parseISO(trip.start_date);
    const daysUntilTrip = differenceInDays(tripStart, now);
    
    if (daysUntilTrip > 0 && daysUntilTrip <= 7) {
      // Check weather changes that would affect packing
      if (weatherAnalysis.hasRain || weatherAnalysis.hasSnow) {
        alerts.push({
          id: `prep-weather-${trip.id}`,
          type: 'packing_update',
          severity: 'info',
          title: `📦 Pack for Weather (${daysUntilTrip} days until trip)`,
          message: `${weatherAnalysis.hasRain ? 'Rain gear recommended. ' : ''}${weatherAnalysis.hasSnow ? 'Snow gear recommended. ' : ''}Review your packing list.`,
          timestamp: now,
        });
      }
    }
    
    return alerts;
  }, [trip, weatherAnalysis, now]);

  // Combine all alerts and sort by severity
  const allAlerts = useMemo(() => {
    const combined = [
      ...weatherAlerts,
      ...departureAlerts,
      ...parkingAlerts,
      ...tripPreparationAlerts,
    ];

    // Sort by severity (critical first, then warning, then info)
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return combined.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [weatherAlerts, departureAlerts, parkingAlerts, tripPreparationAlerts]);

  return {
    alerts: allAlerts,
    hasAlerts: allAlerts.length > 0,
    criticalCount: allAlerts.filter(a => a.severity === 'critical').length,
    warningCount: allAlerts.filter(a => a.severity === 'warning').length,
    weatherLoading,
  };
}
