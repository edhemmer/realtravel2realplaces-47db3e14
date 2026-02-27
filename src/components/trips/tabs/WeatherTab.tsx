/**
 * v4.11.0: Weather Tab — Per-location weather intelligence
 *
 * Shows weather forecasts/seasonal data for every airport and lodging
 * location in the trip. Color-coded by data source:
 *   Emerald = Live forecast (≤7 days)
 *   Sky = Blended forecast + seasonal (8–14 days)
 *   Amber = Seasonal averages (>14 days)
 *
 * Available to all plan tiers.
 */

import { useMemo } from 'react';
import { Trip, Booking } from '@/types/database';
import { useBookings } from '@/hooks/useBookings';
import { useProfileTemperatureUnit } from '@/hooks/useProfileTemperatureUnit';
import { getAirportByCode } from '@/lib/airportData';
import {
  resolveWeather,
  resolveWeatherMode,
  type WeatherEngineInput,
  type WeatherEngineResult,
  type WeatherMode,
  type WeatherDayEnvelope,
} from '@/lib/weatherEngine';
import { useTripWeather } from '@/hooks/useWeather';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Plane,
  Building2,
  MapPin,
  Thermometer,
  Droplets,
  Snowflake,
  Sun,
  Cloud,
  CloudRain,
  Wind,
  CalendarDays,
} from 'lucide-react';

interface WeatherTabProps {
  tripId: string;
  trip: Trip;
}

/** A location we want weather for */
interface WeatherLocation {
  key: string;
  label: string;
  sublabel: string;
  city: string;
  state?: string;
  country: string;
  type: 'airport' | 'lodging' | 'destination';
}

/**
 * Extract unique weather-relevant locations from trip + bookings.
 */
function extractWeatherLocations(trip: Trip, bookings: Booking[]): WeatherLocation[] {
  const locations: WeatherLocation[] = [];
  const seen = new Set<string>();

  // 1. Airports (departure + arrival)
  for (const b of bookings) {
    if (b.booking_type !== 'flight') continue;
    for (const code of [b.departure_airport_code, b.arrival_airport_code]) {
      if (!code) continue;
      const upper = code.toUpperCase();
      if (seen.has(`airport:${upper}`)) continue;

      const airport = getAirportByCode(upper);
      if (airport) {
        locations.push({
          key: `airport:${upper}`,
          label: `${upper} – ${airport.city}`,
          sublabel: airport.name,
          city: airport.city,
          state: airport.state,
          country: airport.country,
          type: 'airport',
        });
        seen.add(`airport:${upper}`);
      }
    }
  }

  // 2. Lodging (stays)
  for (const b of bookings) {
    if (b.booking_type !== 'stay') continue;
    const name = b.property_name || b.vendor_name || 'Lodging';
    const dedup = `stay:${name.toLowerCase()}`;
    if (seen.has(dedup)) continue;

    // Try to extract city from location_summary or address
    const locSummary = b.location_summary || b.address || '';
    locations.push({
      key: dedup,
      label: name,
      sublabel: locSummary.length > 50 ? locSummary.substring(0, 50) + '…' : locSummary || 'Lodging',
      city: locSummary.split(',')[0]?.trim() || trip.destination_city || '',
      state: trip.destination_state || undefined,
      country: trip.destination_country || '',
      type: 'lodging',
    });
    seen.add(dedup);
  }

  // 3. Trip destination (always included as fallback)
  if (trip.destination_city) {
    const destKey = `dest:${trip.destination_city.toLowerCase()}`;
    if (!seen.has(destKey)) {
      locations.push({
        key: destKey,
        label: trip.destination_city,
        sublabel: [trip.destination_state, trip.destination_country].filter(Boolean).join(', '),
        city: trip.destination_city,
        state: trip.destination_state || undefined,
        country: trip.destination_country || '',
        type: 'destination',
      });
    }
  }

  return locations;
}

// ============================================================================
// MODE COLOR HELPERS
// ============================================================================

const MODE_CONFIG: Record<WeatherMode, { label: string; colorClass: string; iconColorClass: string; bgClass: string }> = {
  FORECAST_PRIMARY: {
    label: 'Live Forecast',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    iconColorClass: 'text-emerald-500',
    bgClass: 'bg-emerald-500/10',
  },
  FORECAST_BLEND: {
    label: 'Blended Forecast',
    colorClass: 'text-sky-600 dark:text-sky-400',
    iconColorClass: 'text-sky-500',
    bgClass: 'bg-sky-500/10',
  },
  SEASONAL_NORMALS: {
    label: 'Seasonal Averages',
    colorClass: 'text-amber-600 dark:text-amber-400',
    iconColorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
  },
};

function PrecipIcon({ hint }: { hint: string }) {
  if (hint === 'snow') return <Snowflake className="w-3.5 h-3.5" />;
  if (hint === 'rain') return <CloudRain className="w-3.5 h-3.5" />;
  return <Droplets className="w-3.5 h-3.5" />;
}

function CloudIcon({ hint }: { hint: string }) {
  if (hint === 'mostly_sunny') return <Sun className="w-3.5 h-3.5" />;
  if (hint === 'mostly_cloudy') return <Cloud className="w-3.5 h-3.5" />;
  return <Sun className="w-3.5 h-3.5" />;
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  airport: Plane,
  lodging: Building2,
  destination: MapPin,
};

// ============================================================================
// WEATHER LOCATION CARD (per-location with its own forecast hook)
// ============================================================================

interface WeatherLocationCardProps {
  location: WeatherLocation;
  trip: Trip;
  temperatureUnit: 'fahrenheit' | 'celsius';
}

function WeatherLocationCard({ location, trip, temperatureUnit }: WeatherLocationCardProps) {
  const mode = resolveWeatherMode(trip.start_date);
  const shouldFetchForecast = mode !== 'SEASONAL_NORMALS';

  const { tripForecast, isLoading } = useTripWeather(
    shouldFetchForecast ? location.city : '',
    shouldFetchForecast ? location.country : '',
    trip.start_date,
    trip.end_date,
    location.state,
    temperatureUnit,
  );

  const weather = useMemo<WeatherEngineResult>(() => {
    const input: WeatherEngineInput = {
      city: location.city,
      state: location.state,
      country: location.country,
      startDate: trip.start_date,
      endDate: trip.end_date,
      forecast: shouldFetchForecast && tripForecast.length > 0 ? tripForecast : undefined,
    };
    return resolveWeather(input);
  }, [location, trip.start_date, trip.end_date, tripForecast, shouldFetchForecast]);

  const modeConfig = MODE_CONFIG[weather.weatherMode];
  const Icon = TYPE_ICONS[location.type] || MapPin;

  const formatTemp = (f: number) => {
    if (temperatureUnit === 'celsius') {
      return `${Math.round((f - 32) * 5 / 9)}°C`;
    }
    return `${f}°F`;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              location.type === 'airport' ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
              : location.type === 'lodging' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
              : 'bg-primary/10 text-primary'
            }`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold truncate">{location.label}</CardTitle>
              <p className="text-xs text-muted-foreground truncate">{location.sublabel}</p>
            </div>
          </div>
          <Badge variant="outline" className={`shrink-0 text-[10px] font-medium ${modeConfig.colorClass} border-current/20`}>
            <CalendarDays className={`w-3 h-3 mr-1 ${modeConfig.iconColorClass}`} />
            {modeConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {/* Summary row */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Thermometer className={`w-4 h-4 ${modeConfig.iconColorClass}`} />
            <span className={`text-lg font-bold ${modeConfig.colorClass}`}>
              {formatTemp(weather.summary.avgHigh)}
            </span>
            <span className="text-sm text-muted-foreground">/</span>
            <span className={`text-sm ${modeConfig.colorClass}`}>
              {formatTemp(weather.summary.avgLow)}
            </span>
          </div>

          {weather.summary.hasRain && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CloudRain className="w-3.5 h-3.5 text-sky-500" />
              <span>Rain likely</span>
            </div>
          )}
          {weather.summary.hasSnow && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Snowflake className="w-3.5 h-3.5 text-blue-400" />
              <span>Snow possible</span>
            </div>
          )}
          {weather.summary.hasHot && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Sun className="w-3.5 h-3.5 text-orange-500" />
              <span>Hot</span>
            </div>
          )}
          {weather.summary.hasCold && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Snowflake className="w-3.5 h-3.5 text-sky-400" />
              <span>Cold</span>
            </div>
          )}
        </div>

        {/* Daily forecast grid */}
        {weather.envelope.length > 0 && (
          <div className="grid grid-cols-7 gap-1">
            {weather.envelope.slice(0, 14).map((day) => (
              <DayCell key={day.dateISO} day={day} formatTemp={formatTemp} mode={weather.weatherMode} />
            ))}
          </div>
        )}

        {/* Loading indicator for live forecast */}
        {isLoading && shouldFetchForecast && (
          <p className={`text-[10px] ${modeConfig.colorClass}`}>
            Fetching live forecast…
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// DAY CELL
// ============================================================================

function DayCell({
  day,
  formatTemp,
  mode,
}: {
  day: WeatherDayEnvelope;
  formatTemp: (f: number) => string;
  mode: WeatherMode;
}) {
  const modeConfig = MODE_CONFIG[mode];
  const dayOfWeek = new Date(day.dateISO + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' });
  const dayNum = day.dateISO.split('-')[2];
  const isFromForecast = day.source === 'forecast';

  return (
    <div className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg text-center ${
      isFromForecast ? 'bg-emerald-500/5' : 'bg-amber-500/5'
    }`}>
      <span className="text-[9px] text-muted-foreground font-medium uppercase">{dayOfWeek}</span>
      <span className="text-[10px] text-muted-foreground">{dayNum}</span>
      <CloudIcon hint={day.cloudCoverHint} />
      <span className={`text-[11px] font-semibold ${
        isFromForecast ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
      }`}>
        {formatTemp(day.typicalHigh)}
      </span>
      <span className="text-[10px] text-muted-foreground">{formatTemp(day.typicalLow)}</span>
      {day.precipLikelihood !== 'unlikely' && (
        <div className="mt-0.5">
          <PrecipIcon hint={day.precipTypeHint} />
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN TAB
// ============================================================================

export function WeatherTab({ tripId, trip }: WeatherTabProps) {
  const { data: bookings = [] } = useBookings(tripId);
  const { unit: temperatureUnit } = useProfileTemperatureUnit();

  const locations = useMemo(() => extractWeatherLocations(trip, bookings), [trip, bookings]);

  if (locations.length === 0) {
    return (
      <Card className="border-dashed border-muted-foreground/20 bg-muted/30">
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-muted">
              <Cloud className="w-8 h-8 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">No weather locations yet</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Add a destination, flights, or lodging to see weather forecasts for each location.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="px-1">
        <h2 className="text-xl font-bold text-foreground tracking-tight">Weather</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Forecasts for every location in your trip
        </p>
        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-2">
          {Object.entries(MODE_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${config.bgClass}`} />
              <span className={`text-[10px] font-medium ${config.colorClass}`}>{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {locations.map((loc) => (
        <WeatherLocationCard
          key={loc.key}
          location={loc}
          trip={trip}
          temperatureUnit={temperatureUnit}
        />
      ))}
    </div>
  );
}
