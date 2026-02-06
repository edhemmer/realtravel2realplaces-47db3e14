import { useTripWeather } from '@/hooks/useWeather';
import { useTemperatureUnit } from '@/hooks/useTemperatureUnit';
import { useParking } from '@/hooks/useParking';
import { useExpenses } from '@/hooks/useExpenses';
import { useBookings } from '@/hooks/useBookings';
import { calculateTripCostSummary } from '@/lib/expenseCalculations';
import { Trip, Parking } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Thermometer, DollarSign, CircleParking, Cloud, Sun, CloudRain, Snowflake 
} from 'lucide-react';
import { parseISO, isAfter, format } from 'date-fns';

interface TripHeaderWidgetsProps {
  trip: Trip;
}

const getWeatherIcon = (condition: string) => {
  if (condition.includes('Rain') || condition.includes('Shower')) return <CloudRain className="w-4 h-4" />;
  if (condition.includes('Snow')) return <Snowflake className="w-4 h-4" />;
  if (condition.includes('Clear') || condition.includes('Sunny')) return <Sun className="w-4 h-4" />;
  return <Cloud className="w-4 h-4" />;
};

export function TripHeaderWidgets({ trip }: TripHeaderWidgetsProps) {
  const { formatTemp } = useTemperatureUnit();
  const { tripForecast, weatherAnalysis, isLoading: weatherLoading } = useTripWeather(
    trip.destination_city?.trim() || '',
    trip.destination_country || '',
    trip.start_date,
    trip.end_date,
    trip.destination_state || undefined
  );

  const { data: bookings = [] } = useBookings(trip.id);
  const { data: parkingList = [] } = useParking(trip.id);
  const { data: expenses = [] } = useExpenses(trip.id);

  // Calculate costs with defensive guards (v2.1.30)
  const costSummary = calculateTripCostSummary(expenses, bookings, parkingList);
  // Guard against NaN/undefined with fallback to 0
  const totalCost = Number.isFinite(costSummary.totalCost) ? costSummary.totalCost : 0;
  const bookingsTotal = Number.isFinite(costSummary.bookingsTotal) ? costSummary.bookingsTotal : 0;
  const expensesTotal = Number.isFinite(costSummary.expensesTotal) ? costSummary.expensesTotal : 0;

  // Parking status
  const now = new Date();
  const upcomingParking = parkingList
    .filter((p: Parking) => p.end_datetime && isAfter(parseISO(p.end_datetime), now))
    .sort((a: Parking, b: Parking) => parseISO(a.end_datetime!).getTime() - parseISO(b.end_datetime!).getTime())[0];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Weather Widget */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-primary" />
            Weather
          </CardTitle>
        </CardHeader>
        <CardContent>
          {weatherLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : tripForecast.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {weatherAnalysis.avgHigh && (
                  <span className="text-lg font-bold">{formatTemp(weatherAnalysis.avgHigh)}</span>
                )}
                <div className="flex gap-1">
                  {weatherAnalysis.hasHot && <Badge variant="outline" className="text-xs">☀️ Hot</Badge>}
                  {weatherAnalysis.hasCold && <Badge variant="outline" className="text-xs">❄️ Cold</Badge>}
                  {weatherAnalysis.hasRain && <Badge variant="outline" className="text-xs">🌧️ Rain</Badge>}
                </div>
              </div>
              <div className="flex gap-1 overflow-x-auto">
                {tripForecast.slice(0, 5).map((day) => (
                  <div key={day.date} className="flex flex-col items-center p-1.5 min-w-[2.5rem] rounded bg-background/50 text-center">
                    <span className="text-[9px] text-muted-foreground">
                      {new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    {getWeatherIcon(day.condition)}
                    <span className="text-[10px] font-medium">{formatTemp(day.tempHigh, false)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No forecast available</p>
          )}
        </CardContent>
      </Card>

      {/* Cost Summary Widget */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Cost Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Trip Cost</span>
              <span className="text-xl font-bold">${totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>Bookings: ${bookingsTotal.toFixed(2)}</span>
              <span>Expenses: ${expensesTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Parking Activity Widget */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
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
          ) : parkingList.length > 0 ? (
            <p className="text-sm text-muted-foreground">
              {parkingList.length} parking location{parkingList.length !== 1 ? 's' : ''} tracked
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No active parking</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
