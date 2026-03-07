/**
 * v3.10.7: CompactWeatherWidget — Never blank. Uses WeatherEngine for deterministic display.
 * v4.0.4: Offline snapshot fallback.
 */
import { useEffect, useState } from 'react';
import { useWeatherEngine } from '@/hooks/useWeatherEngine';
import { useProfileTemperatureUnit } from '@/hooks/useProfileTemperatureUnit';
import { isOnline } from '@/lib/networkStatus';
import {
  saveWeatherSnapshot,
  loadAllWeatherSnapshots,
  formatSnapshotTimestamp,
  type WeatherSnapshotRecord,
} from '@/lib/weatherSnapshotCache';
import { Cloud, Sun, CloudRain, Snowflake, MapPin, CalendarDays, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Trip } from '@/types/database';

interface CompactWeatherWidgetProps {
  trip: Trip;
  className?: string;
}

const getWeatherIcon = (precipType: string, cloudCover: string) => {
  if (precipType === 'rain') return <CloudRain className="w-4 h-4" />;
  if (precipType === 'snow' || precipType === 'mixed') return <Snowflake className="w-4 h-4" />;
  if (cloudCover === 'mostly_sunny') return <Sun className="w-4 h-4" />;
  return <Cloud className="w-4 h-4" />;
};

export function CompactWeatherWidget({ trip, className }: CompactWeatherWidgetProps) {
  const { formatTemp } = useProfileTemperatureUnit();
  const { weather, isLoading } = useWeatherEngine(trip);
  const online = isOnline();

  // v4.0.4: Save snapshot when online
  useEffect(() => {
    if (online && weather && weather.envelope.length > 0) {
      saveWeatherSnapshot(trip.id, `compact:${trip.destination_city || 'dest'}`, weather);
    }
  }, [online, weather, trip.id, trip.destination_city]);

  // v4.0.4: Load cached snapshot when offline and no weather
  const [offlineSnapshot, setOfflineSnapshot] = useState<WeatherSnapshotRecord | null>(null);
  useEffect(() => {
    if (!online && !weather) {
      loadAllWeatherSnapshots(trip.id).then(snaps => {
        setOfflineSnapshot(snaps[0] ?? null);
      });
    }
  }, [online, weather, trip.id]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground text-sm", className)}>
        <Cloud className="w-4 h-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  // Offline fallback
  if (!weather && offlineSnapshot) {
    const cached = offlineSnapshot.weatherDisplayPayload;
    return (
      <div className={cn(
        "flex items-center gap-3 px-3 py-1.5 rounded-full bg-orange-500/5 border border-orange-500/10 text-sm",
        className
      )}>
        <div className="flex items-center gap-1.5">
          <span className="text-orange-500">
            {getWeatherIcon(cached.summary.precipTypeHint, cached.summary.cloudCoverHint)}
          </span>
          <span className="font-medium">{formatTemp(cached.summary.avgHigh)}</span>
          <span className="text-muted-foreground text-xs">
            / {formatTemp(cached.summary.avgLow, false)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <WifiOff className="w-3 h-3 text-orange-500" />
          <span className="text-orange-600 dark:text-orange-400 font-medium hidden sm:inline">Cached</span>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const { weatherMode, summary, locationLabel } = weather;

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-sm",
      className
    )}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <MapPin className="w-3.5 h-3.5" />
        <span className="hidden sm:inline truncate max-w-[120px]">{trip.destination_city}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-primary">
          {getWeatherIcon(summary.precipTypeHint, summary.cloudCoverHint)}
        </span>
        <span className="font-medium">{formatTemp(summary.avgHigh)}</span>
        <span className="text-muted-foreground text-xs">
          / {formatTemp(summary.avgLow, false)}
        </span>
      </div>
      {weatherMode === 'SEASONAL_NORMALS' && (
        <div className="flex items-center gap-1 text-xs">
          <CalendarDays className="w-3 h-3 text-amber-500" />
          <span className="text-amber-600 dark:text-amber-400 font-medium">Seasonal</span>
        </div>
      )}
      {weatherMode === 'FORECAST_BLEND' && (
        <div className="flex items-center gap-1 text-xs">
          <CalendarDays className="w-3 h-3 text-sky-500" />
          <span className="text-sky-600 dark:text-sky-400 font-medium">Blended</span>
        </div>
      )}
      {weatherMode === 'FORECAST_PRIMARY' && (
        <div className="flex items-center gap-1 text-xs">
          <CalendarDays className="w-3 h-3 text-emerald-500" />
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">Live</span>
        </div>
      )}
    </div>
  );
}
