/**
 * v3.10.7: useWeatherEngine — React hook for always-on weather intelligence
 * 
 * NEVER returns blank/null weather. Always returns a deterministic payload:
 * - forecast mode: live weather data (≤14 days out)
 * - seasonal mode: bundled seasonal normals (>14 days out, no API call)
 * - unavailable: still returns envelope with reason
 * 
 * Wraps WeatherEngine to provide weather data for any trip,
 * using live forecast when available and seasonal normals otherwise.
 */

import { useMemo } from 'react';
import { Trip, Booking } from '@/types/database';
import { useTripWeather } from './useWeather';
import { useProfileTemperatureUnit } from './useProfileTemperatureUnit';
import { 
  resolveWeather, 
  resolveWeatherMode,
  FORECAST_WINDOW_DAYS,
  type WeatherEngineResult, 
  type WeatherEngineInput,
  type WeatherMode,
} from '@/lib/weatherEngine';

interface UseWeatherEngineResult {
  /** Full weather engine result — always populated when trip exists */
  weather: WeatherEngineResult | null;
  /** Whether live forecast is still loading */
  isLoading: boolean;
}

/**
 * v3.10.7: Check if trip is within forecast window (should fetch live data)
 */
function isTripWithinForecastWindow(startDate: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [y1, m1, d1] = todayStr.split('-').map(Number);
  const [y2, m2, d2] = startDate.split('-').map(Number);
  const date1 = new Date(y1, m1 - 1, d1);
  const date2 = new Date(y2, m2 - 1, d2);
  const daysOut = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
  return daysOut <= FORECAST_WINDOW_DAYS;
}

/**
 * Always-on weather hook. Returns seasonal normals immediately,
 * then upgrades to forecast data when available and within window.
 */
export function useWeatherEngine(trip: Trip | null, bookings?: Booking[]): UseWeatherEngineResult {
  const { unit: tempUnit } = useProfileTemperatureUnit();

  // v3.10.7: Only fetch live forecast when trip is within forecast window
  const shouldFetchForecast = trip?.start_date ? isTripWithinForecastWindow(trip.start_date) : false;

  // Fetch live forecast (gated — skipped for far-out trips)
  const { tripForecast, isLoading } = useTripWeather(
    shouldFetchForecast ? (trip?.destination_city?.trim() || '') : '',
    shouldFetchForecast ? (trip?.destination_country || '') : '',
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
      const lodging = bookings.find(b => b.booking_type === 'stay');
      if (lodging?.address) {
        lodgingCity = trip.destination_city;
        lodgingState = trip.destination_state || undefined;
        lodgingCountry = trip.destination_country;
      }

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
      forecast: shouldFetchForecast && tripForecast.length > 0 ? tripForecast : undefined,
    };

    return resolveWeather(input);
  }, [trip, bookings, tripForecast, shouldFetchForecast]);

  return { weather, isLoading: shouldFetchForecast ? isLoading : false };
}
