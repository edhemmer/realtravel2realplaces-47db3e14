/**
 * v5.0.0: GUIDE Tab
 *
 * Light guidance view using ONLY existing data:
 * - Timing awareness (upcoming transitions from canonical timeline)
 * - Weather awareness (from canonicalWeather via useCanonicalTripState)
 * - Basic alerts (from useTravelAlerts)
 *
 * No AI. No new systems. No integrations.
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, CloudSun, AlertTriangle, CheckCircle2, Thermometer } from 'lucide-react';
import { Trip } from '@/types/database';
import { useCanonicalTripState, deriveWeatherPills, type WeatherPill } from '@/hooks/useCanonicalTripState';
import { useBookings } from '@/hooks/useBookings';
import { useParking } from '@/hooks/useParking';
import { useTravelAlerts, type TravelAlert } from '@/hooks/useTravelAlerts';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getLocalNowString } from '@/lib/canonicalNextStop';
import type { CanonicalTimelineEvent } from '@/lib/canonicalTripState';

interface GuideTabProps {
  tripId: string;
  trip: Trip;
}

/** Get upcoming transitions (next 3 events from now) */
function getUpcomingTransitions(events: CanonicalTimelineEvent[], nowStr: string): CanonicalTimelineEvent[] {
  return events
    .filter(e => e.eventLocalDateTime && e.eventLocalDateTime >= nowStr)
    .slice(0, 3);
}

function getTransitionLabel(event: CanonicalTimelineEvent): string {
  switch (event.bookingType) {
    case 'flight': return 'Flight';
    case 'stay': return event.eventType === 'hotel_checkout' ? 'Check-out' : 'Check-in';
    case 'car_rental': return event.eventType === 'rental_return' ? 'Return Rental' : 'Pick Up Rental';
    case 'activity': return 'Activity';
    case 'transport': return 'Transport';
    default: return 'Event';
  }
}

export function GuideTab({ tripId, trip }: GuideTabProps) {
  const { timelineEvents, weatherByKey, state } = useCanonicalTripState(tripId, trip);
  const { data: bookings = [] } = useBookings(tripId);
  const { data: parkingList = [] } = useParking(tripId);
  const { data: userProfile } = useUserProfile();
  const temperatureUnit = (userProfile?.temperature_unit as 'fahrenheit' | 'celsius') || 'fahrenheit';
  const { alerts } = useTravelAlerts(trip, bookings, parkingList, temperatureUnit);

  const nowStr = getLocalNowString();

  // Upcoming transitions
  const transitions = useMemo(
    () => getUpcomingTransitions(timelineEvents, nowStr),
    [timelineEvents, nowStr],
  );

  // Weather pills
  const weatherPills = useMemo(
    () => deriveWeatherPills(weatherByKey),
    [weatherByKey],
  );

  // Active alerts (max 3)
  const activeAlerts = useMemo(
    () => alerts.slice(0, 3),
    [alerts],
  );

  const todayStr = nowStr.substring(0, 10);
  const isTripActive = todayStr >= trip.start_date && todayStr <= trip.end_date;

  return (
    <div className="space-y-4 pb-20">
      {/* Status */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
              isTripActive ? 'bg-success/10' : 'bg-muted/60'
            }`}>
              <CheckCircle2 className={`w-5 h-5 ${isTripActive ? 'text-success' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {isTripActive ? 'Trip Active' : todayStr < trip.start_date ? 'Upcoming Trip' : 'Trip Completed'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {trip.destination_city}, {trip.destination_country}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timing Awareness — Upcoming Transitions */}
      {transitions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Coming Up
          </h3>
          {transitions.map(event => {
            const timeStr = event.eventLocalDateTime?.substring(11, 16) || '';
            const dateStr = event.eventLocalDateTime?.substring(0, 10) || '';
            const isToday = dateStr === todayStr;
            return (
              <Card key={event.id}>
                <CardContent className="p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {getTransitionLabel(event)}
                      </p>
                      <p className="text-sm font-medium truncate mt-0.5">{event.title}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {timeStr && (
                        <p className="text-sm font-semibold tabular-nums">{timeStr}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        {isToday ? 'Today' : dateStr}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Weather Awareness */}
      {weatherPills.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Weather
          </h3>
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3">
                {weatherPills.slice(0, 5).map((pill, i) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                    <Thermometer className="w-3.5 h-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">{pill.label}</p>
                      <p className="text-[11px] text-muted-foreground">{pill.summary}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {activeAlerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Alerts
          </h3>
          {activeAlerts.map(alert => (
            <Card key={alert.id} className={
              alert.severity === 'critical' ? 'border-destructive/30' : 
              alert.severity === 'warning' ? 'border-orange-400/30' : ''
            }>
              <CardContent className="p-3.5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${
                    alert.severity === 'critical' ? 'text-destructive' : 
                    alert.severity === 'warning' ? 'text-orange-500' : 'text-muted-foreground'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No weather, no alerts, no transitions */}
      {transitions.length === 0 && weatherPills.length === 0 && activeAlerts.length === 0 && (
        <div className="text-center py-12">
          <CloudSun className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No guidance available yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Add bookings to get timing and weather guidance.</p>
        </div>
      )}
    </div>
  );
}
