/**
 * v3.8.13: useWeatherEngine — React hook for always-on weather intelligence
 * 
 * Wraps WeatherEngine to provide weather data for any trip,
 * using live forecast when available and seasonal normals otherwise.
 */

import { useMemo } from 'react';
import { Trip, Booking } from '@/types/database';
import { useTripWeather } from './useWeather';
import { useProfileTemperatureUnit } from './useProfileTemperatureUnit';
import { resolveWeather, type WeatherEngineResult, type WeatherEngineInput } from '@/lib/weatherEngine';

interface UseWeatherEngineResult {
  /** Full weather engine result — always populated when trip exists */
  weather: WeatherEngineResult | null;
  /** Whether live forecast is still loading */
  isLoading: boolean;
}

/**
 * Always-on weather hook. Returns seasonal normals immediately,
 * then upgrades to forecast data when available.
 */
export function useWeatherEngine(trip: Trip | null, bookings?: Booking[]): UseWeatherEngineResult {
  const { unit: tempUnit } = useProfileTemperatureUnit();

  // Fetch live forecast (may return empty for far-out trips)
  const { tripForecast, isLoading } = useTripWeather(
    trip?.destination_city?.trim() || '',
    trip?.destination_country || '',
    trip?.start_date || '',
    trip?.end_date || '',
    trip?.destination_state || undefined,
    tempUnit
  );

  const weather = useMemo(() => {
    if (!trip) return null;

    // Resolve anchors from bookings
    let lodgingCity: string | undefined;
    let lodgingState: string | undefined;
    let lodgingCountry: string | undefined;
    let flightArrivalCity: string | undefined;
    let flightArrivalState: string | undefined;
    let flightArrivalCountry: string | undefined;

    if (bookings) {
      // Find lodging booking for anchor
      const lodging = bookings.find(b => b.booking_type === 'stay');
      if (lodging?.address) {
        // Use trip destination as lodging anchor (address is too granular for weather)
        lodgingCity = trip.destination_city;
        lodgingState = trip.destination_state || undefined;
        lodgingCountry = trip.destination_country;
      }

      // Find flight arrival for anchor
      if (!lodgingCity) {
        const flight = bookings.find(b => b.booking_type === 'flight' && b.arrival_airport_code);
        if (flight) {
          flightArrivalCity = trip.destination_city;
          flightArrivalState = trip.destination_state || undefined;
          flightArrivalCountry = trip.destination_country;
        }
      }
    }

    const input: WeatherEngineInput = {
      city: trip.destination_city,
      state: trip.destination_state || undefined,
      country: trip.destination_country,
      startDate: trip.start_date,
      endDate: trip.end_date,
      lodgingCity,
      lodgingState,
      lodgingCountry,
      flightArrivalCity,
      flightArrivalState,
      flightArrivalCountry,
      forecast: tripForecast.length > 0 ? tripForecast : undefined,
    };

    return resolveWeather(input);
  }, [trip, bookings, tripForecast]);

  return { weather, isLoading };
}
