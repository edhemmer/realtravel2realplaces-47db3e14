/**
 * v3.10.7: CompactWeatherWidget — Never blank. Uses WeatherEngine for deterministic display.
 */
import { useWeatherEngine } from '@/hooks/useWeatherEngine';
import { useProfileTemperatureUnit } from '@/hooks/useProfileTemperatureUnit';
import { Cloud, Sun, CloudRain, Snowflake, MapPin, CalendarDays } from 'lucide-react';
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

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground text-sm", className)}>
        <Cloud className="w-4 h-4 animate-pulse" />
        <span>Loading...</span>
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
        <div className="flex items-center gap-1 text-muted-foreground text-xs">
          <CalendarDays className="w-3 h-3" />
          <span>Seasonal</span>
        </div>
      )}
    </div>
  );
}
