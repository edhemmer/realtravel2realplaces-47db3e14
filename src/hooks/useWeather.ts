import { useQuery } from '@tanstack/react-query';

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

async function geocodeCity(city: string, country: string, state?: string): Promise<GeocodingResult | null> {
  // Try city + state first for US locations, then fallback to city alone
  const queries = state && country === 'USA' 
    ? [`${city}, ${state}`, city]
    : [`${city}, ${country}`, city];
  
  for (const query of queries) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`;
    
    const response = await fetch(url);
    if (!response.ok) continue;
    
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      // For US locations with state, try to match the state
      if (state && country === 'USA') {
        const match = data.results.find((r: any) => 
          r.admin1?.toLowerCase() === state.toLowerCase() || 
          r.country_code === 'US'
        );
        if (match) {
          return {
            latitude: match.latitude,
            longitude: match.longitude,
            name: match.name,
          };
        }
      }
      // Return first result as fallback
      return {
        latitude: data.results[0].latitude,
        longitude: data.results[0].longitude,
        name: data.results[0].name,
      };
    }
  }
  
  return null;
}

async function fetchWeather(lat: number, lon: number): Promise<WeatherData | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=14&temperature_unit=fahrenheit`;
  
  const response = await fetch(url);
  if (!response.ok) return null;
  
  const data = await response.json();
  
  return {
    current: {
      temperature: Math.round(data.current.temperature_2m),
      condition: weatherCodeToCondition(data.current.weather_code),
      humidity: data.current.relative_humidity_2m,
      windSpeed: Math.round(data.current.wind_speed_10m),
    },
    forecast: data.daily.time.map((date: string, i: number) => ({
      date,
      tempHigh: Math.round(data.daily.temperature_2m_max[i]),
      tempLow: Math.round(data.daily.temperature_2m_min[i]),
      condition: weatherCodeToCondition(data.daily.weather_code[i]),
      precipitation: data.daily.precipitation_probability_max[i] || 0,
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

export function useTripWeather(city: string, country: string, startDate: string, endDate: string, state?: string) {
  const weatherQuery = useWeather(city, country, state);
  
  // Filter forecast to trip dates
  const tripForecast = weatherQuery.data?.forecast.filter(day => {
    return day.date >= startDate && day.date <= endDate;
  }) || [];
  
  // Analyze weather for packing recommendations
  const weatherAnalysis = {
    hasRain: tripForecast.some(d => d.precipitation > 30 || d.condition.includes('Rain') || d.condition.includes('Shower')),
    hasCold: tripForecast.some(d => d.tempLow < 50),
    hasHot: tripForecast.some(d => d.tempHigh > 80),
    hasSnow: tripForecast.some(d => d.condition.includes('Snow')),
    avgHigh: tripForecast.length > 0 
      ? Math.round(tripForecast.reduce((sum, d) => sum + d.tempHigh, 0) / tripForecast.length)
      : null,
    avgLow: tripForecast.length > 0 
      ? Math.round(tripForecast.reduce((sum, d) => sum + d.tempLow, 0) / tripForecast.length)
      : null,
  };
  
  return {
    ...weatherQuery,
    current: weatherQuery.data?.current || null,
    tripForecast,
    weatherAnalysis,
  };
}
