import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { US_STATES } from '@/lib/location/usStates';
interface WeatherData {
  current: {
    temperature: number;
    condition: string;
    humidity: number;
    windSpeed: number;
  };
  forecast: Array<{
    date: string;
    tempHigh: number;
    tempLow: number;
    condition: string;
    precipitation: number;
  }>;
}

interface GeocodingResult {
  latitude: number;
  longitude: number;
  name: string;
}

interface OpenMeteoGeocodingCandidate {
  latitude: number;
  longitude: number;
  name: string;
  admin1?: string;
  country?: string;
  country_code?: string;
}

function normalizeLocationToken(value?: string | null): string {
  return (value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isUnitedStates(country: string): boolean {
  const normalized = normalizeLocationToken(country);
  return normalized === 'us' || normalized === 'usa' ||
    normalized === 'unitedstates' || normalized === 'unitedstatesofamerica';
}

function resolveUsState(state?: string): { code: string; name: string } | null {
  const normalized = normalizeLocationToken(state);
  if (!normalized) return null;

  return US_STATES.find((option) =>
    normalizeLocationToken(option.code) === normalized ||
    normalizeLocationToken(option.name) === normalized
  ) ?? null;
}

function selectGeocodingCandidate(
  results: OpenMeteoGeocodingCandidate[],
  country: string,
  state?: string,
): OpenMeteoGeocodingCandidate | null {
  if (results.length === 0) return null;

  if (isUnitedStates(country)) {
    const usResults = results.filter((result) =>
      result.country_code?.toUpperCase() === 'US' ||
      normalizeLocationToken(result.country) === 'unitedstates'
    );

    const resolvedState = resolveUsState(state);
    if (state && !resolvedState) {
      return null;
    }

    if (resolvedState) {
      return usResults.find((result) =>
        normalizeLocationToken(result.admin1) === normalizeLocationToken(resolvedState.name)
      ) ?? null;
    }

    return usResults[0] ?? null;
  }

  const countryToken = normalizeLocationToken(country);
  if (!countryToken) return results[0] ?? null;

  return results.find((result) =>
    normalizeLocationToken(result.country) === countryToken ||
    normalizeLocationToken(result.country_code) === countryToken
  ) ?? null;
}

// Weather code to condition mapping
const weatherCodeToCondition = (code: number): string => {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 57) return 'Drizzle';
  if (code <= 67) return 'Rainy';
  if (code <= 77) return 'Snowy';
  if (code <= 82) return 'Showers';
  if (code <= 86) return 'Snow Showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Unknown';
};

 /**
  * Safely geocode a city with error handling
  * Returns null on any failure (network, invalid response, no results)
  */
 async function geocodeCity(city: string, country: string, state?: string): Promise<GeocodingResult | null> {
   if (!city || typeof city !== 'string') {
     console.warn('[Weather] Invalid city parameter for geocoding');
     return null;
   }
   
  const usState = isUnitedStates(country) ? resolveUsState(state) : null;
  const queries = usState
    ? [`${city}, ${usState.name}`, city]
    : [`${city}, ${country}`, city];

  try {
    for (const query of queries) {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;

      let response: Response;
      try {
        response = await fetch(url);
      } catch (fetchError) {
        console.warn('[Weather] Geocoding fetch failed:', fetchError);
        continue;
      }

      if (!response.ok) {
        console.warn(`[Weather] Geocoding API returned ${response.status}`);
        continue;
      }

      let data: { results?: OpenMeteoGeocodingCandidate[] };
      try {
        data = await response.json();
      } catch (parseError) {
        console.warn('[Weather] Failed to parse geocoding response:', parseError);
        continue;
      }

      const candidate = selectGeocodingCandidate(data.results ?? [], country, state);
      if (candidate) {
        return {
          latitude: candidate.latitude,
          longitude: candidate.longitude,
          name: candidate.name,
        };
      }
    }
  } catch (error) {
    console.error('[Weather] Geocoding error:', error);
  }

  console.warn('[Weather] No unambiguous geocoding match', { city, state, country });
  return null;
}

 /**
  * Fetch weather data with comprehensive error handling
  * Returns null on any failure, never throws
  */
 async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
   if (!isFinite(lat) || !isFinite(lon)) {
     console.warn('[Weather] Invalid coordinates:', { lat, lon });
     return null;
   }
   
   const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=14&temperature_unit=fahrenheit`;
  
   let response: Response;
   try {
     response = await fetch(url);
   } catch (fetchError) {
     console.warn('[Weather] Weather API fetch failed:', fetchError);
     return null;
   }
   
   if (!response.ok) {
     console.warn(`[Weather] Weather API returned ${response.status}`);
     return null;
   }
  
   let data: {
     current?: {
       temperature_2m?: number;
       relative_humidity_2m?: number;
       weather_code?: number;
       wind_speed_10m?: number;
     };
     daily?: {
       time?: string[];
       weather_code?: number[];
       temperature_2m_max?: number[];
       temperature_2m_min?: number[];
       precipitation_probability_max?: number[];
     };
   };
   
   try {
     data = await response.json();
   } catch (parseError) {
     console.warn('[Weather] Failed to parse weather response:', parseError);
     return null;
   }
   
   // Validate required data exists
   if (!data.current || !data.daily || !data.daily.time) {
     console.warn('[Weather] Weather response missing required fields');
     return null;
   }
  
  return {
    current: {
       temperature: Math.round(data.current.temperature_2m ?? 0),
       condition: weatherCodeToCondition(data.current.weather_code ?? 0),
       humidity: data.current.relative_humidity_2m ?? 0,
       windSpeed: Math.round(data.current.wind_speed_10m ?? 0),
    },
     forecast: data.daily.time.map((date, i) => ({
      date,
       tempHigh: Math.round(data.daily?.temperature_2m_max?.[i] ?? 0),
       tempLow: Math.round(data.daily?.temperature_2m_min?.[i] ?? 0),
       condition: weatherCodeToCondition(data.daily?.weather_code?.[i] ?? 0),
       precipitation: data.daily?.precipitation_probability_max?.[i] ?? 0,
    })),
  };
}

export function useWeather(city: string, country: string, state?: string, enabled = true) {
  return useQuery({
    queryKey: ['weather', city, country, state],
    queryFn: async () => {
      const geo = await geocodeCity(city, country, state);
      if (!geo) return null;
      return fetchWeather(geo.latitude, geo.longitude);
    },
    enabled: enabled && !!city,
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Weather thresholds for Cold/Hot labels
 * Applied to daily HIGH temperatures only:
 * - Fahrenheit: Cold < 45°F, Hot > 90°F
 * - Celsius: Cold < 7°C, Hot > 32°C
 */
export const WEATHER_THRESHOLDS = {
  fahrenheit: { cold: 45, hot: 90 },
  celsius: { cold: 7, hot: 32 },
} as const;

/**
 * Maximum number of forecast days to display
 */
export const MAX_FORECAST_DAYS = 7;

/**
 * Determine if a day has rain based on forecast data
 * Rain is indicated when precipitation probability >= 30% OR condition includes rain/shower
 */
export function dayHasRain(precipitation: number, condition: string): boolean {
  return precipitation >= 30 || condition.includes('Rain') || condition.includes('Shower');
}

/**
 * Determine if a day is "Cold" based on its HIGH temperature
 * Threshold depends on user's preferred unit
 */
export function dayIsCold(tempHighF: number, unit: 'fahrenheit' | 'celsius'): boolean {
  const threshold = unit === 'celsius' 
    ? WEATHER_THRESHOLDS.celsius.cold 
    : WEATHER_THRESHOLDS.fahrenheit.cold;
  
  // Convert to user's unit for comparison
  const tempInUnit = unit === 'celsius' 
    ? Math.round((tempHighF - 32) * 5 / 9) 
    : tempHighF;
  
  return tempInUnit < threshold;
}

/**
 * Determine if a day is "Hot" based on its HIGH temperature
 * Threshold depends on user's preferred unit
 */
export function dayIsHot(tempHighF: number, unit: 'fahrenheit' | 'celsius'): boolean {
  const threshold = unit === 'celsius' 
    ? WEATHER_THRESHOLDS.celsius.hot 
    : WEATHER_THRESHOLDS.fahrenheit.hot;
  
  // Convert to user's unit for comparison
  const tempInUnit = unit === 'celsius' 
    ? Math.round((tempHighF - 32) * 5 / 9) 
    : tempHighF;
  
  return tempInUnit > threshold;
}

export function useTripWeather(
  city: string, 
  country: string, 
  startDate: string, 
  endDate: string, 
  state?: string,
  temperatureUnit: 'fahrenheit' | 'celsius' = 'fahrenheit'
) {
  const weatherQuery = useWeather(city, country, state);
  
  // Filter forecast to trip dates only (exact calendar date match)
  // Limit to MAX_FORECAST_DAYS consecutive days
  // Memoize to prevent unnecessary re-renders
  const tripForecast = useMemo(() => {
    const forecast = Array.isArray(weatherQuery.data?.forecast) ? weatherQuery.data.forecast : [];
    return forecast.filter(day => {
      return day.date >= startDate && day.date <= endDate;
    }).slice(0, MAX_FORECAST_DAYS);
  }, [weatherQuery.data?.forecast, startDate, endDate]);
  
  // Analyze weather for packing recommendations and badges
  // Uses correct thresholds based on user's temperature unit preference
  // Memoize to prevent unnecessary re-renders
  const weatherAnalysis = useMemo(() => ({
    // Rain: precipitation >= 30% OR condition includes rain/shower
    hasRain: tripForecast.some(d => dayHasRain(d.precipitation, d.condition)),
    // Cold: at least one day's HIGH < threshold (45°F or 7°C)
    hasCold: tripForecast.some(d => dayIsCold(d.tempHigh, temperatureUnit)),
    // Hot: at least one day's HIGH > threshold (90°F or 32°C)
    hasHot: tripForecast.some(d => dayIsHot(d.tempHigh, temperatureUnit)),
    // Snow: condition contains "Snow"
    hasSnow: tripForecast.some(d => d.condition.includes('Snow')),
    avgHigh: tripForecast.length > 0 
      ? Math.round(tripForecast.reduce((sum, d) => sum + d.tempHigh, 0) / tripForecast.length)
      : null,
    avgLow: tripForecast.length > 0 
      ? Math.round(tripForecast.reduce((sum, d) => sum + d.tempLow, 0) / tripForecast.length)
      : null,
  }), [tripForecast, temperatureUnit]);
  
  // Memoize current to prevent unnecessary re-renders
  const current = useMemo(() => weatherQuery.data?.current || null, [weatherQuery.data?.current]);
  
  return {
    ...weatherQuery,
    current,
    tripForecast,
    weatherAnalysis,
  };
}
