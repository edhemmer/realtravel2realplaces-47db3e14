import { useTripWeather } from '@/hooks/useWeather';
import { useTemperatureUnit } from '@/hooks/useTemperatureUnit';
import { Cloud, Sun, CloudRain, Snowflake, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactWeatherWidgetProps {
  city: string;
  country: string;
  state?: string;
  startDate: string;
  endDate: string;
  className?: string;
}

const getWeatherIcon = (condition: string) => {
  if (condition.includes('Rain') || condition.includes('Shower')) return <CloudRain className="w-4 h-4" />;
  if (condition.includes('Snow')) return <Snowflake className="w-4 h-4" />;
  if (condition.includes('Clear') || condition.includes('Sunny')) return <Sun className="w-4 h-4" />;
  return <Cloud className="w-4 h-4" />;
};

export function CompactWeatherWidget({ 
  city, 
  country, 
  state, 
  startDate, 
  endDate,
  className 
}: CompactWeatherWidgetProps) {
  const { formatTemp } = useTemperatureUnit();
  const { current, tripForecast, weatherAnalysis, isLoading } = useTripWeather(
    city?.trim() || '',
    country || '',
    startDate,
    endDate,
    state || undefined
  );

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-muted-foreground text-sm", className)}>
        <Cloud className="w-4 h-4 animate-pulse" />
        <span>Loading...</span>
      </div>
    );
  }

  // Use current weather if available, otherwise use trip forecast average
  const displayTemp = current?.temperature ?? weatherAnalysis.avgHigh;
  const displayCondition = current?.condition ?? (tripForecast[0]?.condition || 'Unknown');
  const todayForecast = tripForecast[0];

  if (!displayTemp && !todayForecast) {
    return null;
  }

  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-sm",
      className
    )}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <MapPin className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{city}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-primary">{getWeatherIcon(displayCondition)}</span>
        {displayTemp && (
          <span className="font-medium">{formatTemp(displayTemp)}</span>
        )}
        {todayForecast && weatherAnalysis.avgLow && (
          <span className="text-muted-foreground text-xs">
            / {formatTemp(weatherAnalysis.avgLow, false)}
          </span>
        )}
      </div>
    </div>
  );
}
