/**
 * v3.9.25: TripHeaderWidgets — Uses canonical costs from DesktopTripShell when available.
 * Falls back to own calculation on mobile path.
 */
import { useWeatherEngine } from '@/hooks/useWeatherEngine';
import { useProfileTemperatureUnit } from '@/hooks/useProfileTemperatureUnit';
import { useParking } from '@/hooks/useParking';
import { useExpenses } from '@/hooks/useExpenses';
import { useBookings } from '@/hooks/useBookings';
import { calculateTripCostSummary } from '@/lib/expenseCalculations';
import { formatCurrency, TRIP_TOTAL_LABEL } from '@/lib/displayFormats';
import { useDesktopTripShell } from '@/containers/DesktopTripShell';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Trip, Parking } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Thermometer, DollarSign, CircleParking, Cloud, Sun, CloudRain, Snowflake, CalendarDays 
} from 'lucide-react';
import { parseISO, isAfter, format } from 'date-fns';

interface TripHeaderWidgetsProps {
  trip: Trip;
}

const getWeatherIcon = (precipType: string, cloudCover: string) => {
  if (precipType === 'rain') return <CloudRain className="w-4 h-4" />;
  if (precipType === 'snow' || precipType === 'mixed') return <Snowflake className="w-4 h-4" />;
  if (cloudCover === 'mostly_sunny') return <Sun className="w-4 h-4" />;
  return <Cloud className="w-4 h-4" />;
};

export function TripHeaderWidgets({ trip }: TripHeaderWidgetsProps) {
  const { formatTemp } = useProfileTemperatureUnit();
  const { data: userProfile } = useUserProfile();
  const homeCurrency = userProfile?.preferred_currency || 'USD';
  
  // v3.9.25: Consume shell context first (desktop path) to avoid redundant computation
  const shell = useDesktopTripShell();
  
  // Fallback hooks — only needed on mobile path (React Query deduplicates anyway)
  const { data: bookings = [] } = useBookings(trip.id);
  const { data: parkingList = [] } = useParking(trip.id);
  const { data: expenses = [] } = useExpenses(trip.id);
  const { weather, isLoading: weatherLoading } = useWeatherEngine(trip, bookings);

  // v3.9.25: Use shell costs when available, otherwise compute locally
  const costSummary = shell
    ? shell.canonicalState?.costs ?? calculateTripCostSummary(expenses, bookings, parkingList, homeCurrency)
    : calculateTripCostSummary(expenses, bookings, parkingList, homeCurrency);
  
  const totalCost = Number.isFinite(costSummary.totalCost) ? costSummary.totalCost : 0;
  const bookingsTotal = Number.isFinite(costSummary.bookingsTotal) ? costSummary.bookingsTotal : 0;
  const expensesTotal = Number.isFinite(costSummary.expensesTotal) ? costSummary.expensesTotal : 0;

  // Parking status — use shell data when available
  const effectiveParkingList = shell ? shell.parkingList : parkingList;
  const now = new Date();
  const upcomingParking = effectiveParkingList
    .filter((p: Parking) => p.end_datetime && isAfter(parseISO(p.end_datetime), now))
    .sort((a: Parking, b: Parking) => parseISO(a.end_datetime!).getTime() - parseISO(b.end_datetime!).getTime())[0];

  // v3.10.7: Render weather content based on engine mode
  const renderWeatherContent = () => {
    if (weatherLoading) {
      return <p className="text-sm text-muted-foreground">Loading...</p>;
    }
    if (!weather) {
      return <p className="text-sm text-muted-foreground">Weather will appear once your destination is available.</p>;
    }

    const { weatherMode, summary, envelope } = weather;

    if (weatherMode === 'SEASONAL_NORMALS') {
      const monthName = envelope.length > 0
        ? new Date(envelope[0].dateISO + 'T12:00:00').toLocaleDateString('en-US', { month: 'long' })
        : '';
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-amber-600 dark:text-amber-400 font-medium">Seasonal averages for {monthName}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">{formatTemp(summary.avgHigh)}</span>
            <span className="text-sm text-muted-foreground">/ {formatTemp(summary.avgLow, false)}</span>
            <span className="text-primary">
              {getWeatherIcon(summary.precipTypeHint, summary.cloudCoverHint)}
            </span>
          </div>
          <div className="flex gap-1 flex-wrap">
            {summary.hasCold && <Badge variant="outline" className="text-xs">❄️ Cold</Badge>}
            {summary.hasHot && <Badge variant="outline" className="text-xs">☀️ Hot</Badge>}
            {summary.hasRain && <Badge variant="outline" className="text-xs">🌧️ Rain likely</Badge>}
            {summary.hasSnow && <Badge variant="outline" className="text-xs">🌨️ Snow possible</Badge>}
          </div>
        </div>
      );
    }

    if (envelope.length === 0) {
      const fallbackMonth = new Date(weather.windowStart + 'T12:00:00').toLocaleDateString('en-US', { month: 'long' });
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <CalendarDays className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-amber-600 dark:text-amber-400 font-medium">Seasonal averages for {fallbackMonth}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold">{formatTemp(summary.avgHigh)}</span>
            <span className="text-sm text-muted-foreground">/ {formatTemp(summary.avgLow, false)}</span>
            <span className="text-primary">
              {getWeatherIcon(summary.precipTypeHint, summary.cloudCoverHint)}
            </span>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold">{formatTemp(summary.avgHigh)}</span>
          <div className="flex gap-1">
            {summary.hasHot && <Badge variant="outline" className="text-xs">☀️ Hot</Badge>}
            {summary.hasCold && <Badge variant="outline" className="text-xs">❄️ Cold</Badge>}
            {summary.hasRain && <Badge variant="outline" className="text-xs">🌧️ Rain</Badge>}
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {envelope.slice(0, 7).map((day) => {
            const dayDate = new Date(day.dateISO + 'T12:00:00');
            return (
              <div key={day.dateISO} className="flex flex-col items-center p-1.5 min-w-[2.5rem] rounded bg-background/50 text-center">
                <span className="text-[9px] text-muted-foreground">
                  {dayDate.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className="text-[9px] font-medium text-foreground/70">
                  {dayDate.getDate()}
                </span>
                {getWeatherIcon(day.precipTypeHint, day.cloudCoverHint)}
                <span className="text-[10px] font-medium">{formatTemp(day.typicalHigh, false)}</span>
              </div>
            );
          })}
        </div>
        {weatherMode === 'FORECAST_BLEND' && (
          <p className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">Blended forecast + seasonal averages</p>
        )}
        {weatherMode === 'FORECAST_PRIMARY' && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Live forecast</p>
        )}
      </div>
    );
  };

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {/* Weather Widget */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5 shadow-sm">
        <CardHeader className="pb-1.5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-primary" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderWeatherContent()}
        </CardContent>
      </Card>

      {/* Cost Summary Widget */}
      <Card className="shadow-sm">
        <CardHeader className="pb-1.5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            {TRIP_TOTAL_LABEL}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* v4.4.x: Multi-currency safe display */}
            {costSummary.isMultiCurrency ? (
              <div className="space-y-1">
                {costSummary.multiCurrency.currencies.map(curr => (
                  <div key={curr} className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{curr}</span>
                    <span className="text-sm font-bold tabular-nums">{formatCurrency(costSummary.multiCurrency.totals_by_currency[curr], curr)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-lg font-bold tabular-nums">{formatCurrency(totalCost)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-[11px] text-muted-foreground/80 tabular-nums">
              <span>Bookings: {formatCurrency(bookingsTotal)}</span>
              <span>Expenses: {formatCurrency(expensesTotal)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parking Activity Widget */}
      <Card className="shadow-sm">
        <CardHeader className="pb-1.5">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <CircleParking className="w-4 h-4 text-primary" />
            Parking
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingParking ? (
            <div className="space-y-1">
              <p className="font-medium text-sm">{upcomingParking.label}</p>
              <p className="text-xs text-muted-foreground">
                {upcomingParking.end_datetime && (
                  <>Expires: {format(parseISO(upcomingParking.end_datetime), 'MMM d, h:mm a')}</>
                )}
              </p>
              {upcomingParking.level_section_space && (
                <p className="text-xs text-muted-foreground">
                  Location: {upcomingParking.level_section_space}
                </p>
              )}
            </div>
          ) : effectiveParkingList.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {effectiveParkingList.length} parking location{effectiveParkingList.length !== 1 ? 's' : ''} tracked
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No active parking</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}