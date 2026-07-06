/**
 * v5.0.1: GUIDE Tab — Hard Prioritized
 *
 * Displays max 3 items, each a single sentence.
 * Priority: timing risk > transition proximity > weather.
 * Uses ONLY existing canonical data. No AI. No new systems.
 */

import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, CloudSun, AlertTriangle, Thermometer, ListChecks, ShieldCheck } from 'lucide-react';
import { AppModuleHeader } from '@/components/trips/AppModuleHeader';
import { ModuleOperatingBrief } from '@/components/trips/ModuleOperatingBrief';
import { Trip } from '@/types/database';
import { useCanonicalTripState, deriveWeatherPills, type WeatherPill } from '@/hooks/useCanonicalTripState';
import { useBookings } from '@/hooks/useBookings';
import { useParking } from '@/hooks/useParking';
import { useTravelAlerts } from '@/hooks/useTravelAlerts';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getLocalNowString } from '@/lib/canonicalNextStop';
import type { CanonicalTimelineEvent } from '@/lib/canonicalTripState';

interface GuideTabProps {
  tripId: string;
  trip: Trip;
}

interface GuideItem {
  id: string;
  icon: 'timing' | 'weather' | 'alert';
  text: string;
  priority: number; // lower = higher priority
}

export function GuideTab({ tripId, trip }: GuideTabProps) {
  const { timelineEvents, weatherByKey } = useCanonicalTripState(tripId, trip);
  const { data: bookings = [] } = useBookings(tripId);
  const { data: parkingList = [] } = useParking(tripId);
  const { data: userProfile } = useUserProfile();
  const temperatureUnit = (userProfile?.temperature_unit as 'fahrenheit' | 'celsius') || 'fahrenheit';
  const { alerts } = useTravelAlerts(trip, bookings, parkingList, temperatureUnit);

  const nowStr = getLocalNowString();
  const todayStr = nowStr.substring(0, 10);

  // Build prioritized guide items (max 3)
  const guideItems = useMemo((): GuideItem[] => {
    const items: GuideItem[] = [];
    const nowMs = Date.now();

    // 1. Timing risk — upcoming events within 2 hours
    const upcoming = timelineEvents.filter(e => {
      if (!e.eventLocalDateTime) return false;
      const evMs = new Date(e.eventLocalDateTime).getTime();
      const diff = evMs - nowMs;
      return diff > 0 && diff < 2 * 60 * 60 * 1000;
    });

    if (upcoming.length > 0) {
      const next = upcoming[0];
      const diffMin = Math.round((new Date(next.eventLocalDateTime!).getTime() - nowMs) / 60000);

      if (diffMin <= 30) {
        items.push({
          id: 'timing-urgent',
          icon: 'timing',
          text: `You're ${diffMin} minutes away from ${next.title} — best to start heading out now.`,
          priority: 0,
        });
      } else {
        items.push({
          id: 'timing-upcoming',
          icon: 'timing',
          text: `${next.title} is coming up in about ${Math.round(diffMin / 15) * 15} minutes — comfortable but worth keeping in mind.`,
          priority: 1,
        });
      }

      // Schedule compression: multiple events within 3 hours
      const threeHrEvents = timelineEvents.filter(e => {
        if (!e.eventLocalDateTime) return false;
        const diff = new Date(e.eventLocalDateTime).getTime() - nowMs;
        return diff > 0 && diff < 3 * 60 * 60 * 1000;
      });
      if (threeHrEvents.length >= 3) {
        items.push({
          id: 'compression',
          icon: 'timing',
          text: `You have ${threeHrEvents.length} things lined up over the next few hours — staying on pace will keep the day smooth.`,
          priority: 2,
        });
      }
    }

    // 2. Transition proximity — check gaps between consecutive upcoming events
    if (upcoming.length >= 2) {
      const first = new Date(upcoming[0].eventLocalDateTime!).getTime();
      const second = new Date(upcoming[1].eventLocalDateTime!).getTime();
      const gapMin = Math.round((second - first) / 60000);
      if (gapMin <= 30) {
        items.push({
          id: 'transition-tight',
          icon: 'timing',
          text: `There's only ${gapMin} minutes between ${upcoming[0].title} and ${upcoming[1].title} — allow extra time for that transition.`,
          priority: 1,
        });
      }
    }

    // 3. Weather — from first snapshot
    const snapshots = Object.values(weatherByKey);
    if (snapshots.length > 0) {
      const snap = snapshots[0];
      const high = snap.high;
      const low = snap.low;
      if (high !== undefined && low !== undefined && high - low >= 15) {
        items.push({
          id: 'weather-variation',
          icon: 'weather',
          text: `Expect a wide temperature swing today (${low}°–${high}°) — layering will keep you comfortable through the day.`,
          priority: 5,
        });
      } else if (snap.condition && snap.condition.toLowerCase().includes('rain')) {
        items.push({
          id: 'weather-rain',
          icon: 'weather',
          text: `Rain is in the forecast — having an umbrella or rain layer handy will save you later.`,
          priority: 4,
        });
      } else if (high !== undefined && high >= 90) {
        items.push({
          id: 'weather-hot',
          icon: 'weather',
          text: `It's going to be a warm one today (high of ${high}°) — stay hydrated and take shade breaks when you can.`,
          priority: 5,
        });
      } else if (low !== undefined && low <= 40) {
        items.push({
          id: 'weather-cold',
          icon: 'weather',
          text: `Temperatures will dip to ${low}° — dress warmly, especially if you'll be outside later.`,
          priority: 5,
        });
      }
    }

    // 4. Critical alerts (severity-based)
    const critAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'warning');
    if (critAlerts.length > 0) {
      items.push({
        id: `alert-${critAlerts[0].id}`,
        icon: 'alert',
        text: critAlerts[0].message,
        priority: critAlerts[0].severity === 'critical' ? 0 : 3,
      });
    }

    // Sort by priority, take top 3
    items.sort((a, b) => a.priority - b.priority);
    return items.slice(0, 3);
  }, [timelineEvents, weatherByKey, alerts]);

  const getIcon = (type: GuideItem['icon']) => {
    switch (type) {
      case 'timing': return <Clock className="w-4 h-4 text-primary" />;
      case 'weather': return <Thermometer className="w-4 h-4 text-muted-foreground" />;
      case 'alert': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    }
  };

  if (guideItems.length === 0) {
    return (
      <div className="space-y-4 pb-20">
        <AppModuleHeader
          icon={CloudSun}
          eyebrow="Trip guidance"
          title="Guide"
          description="RT2RP watches timing, weather, alerts, and transitions, then tells you what deserves attention."
          status="All clear"
          statusTone="live"
        />
        <ModuleOperatingBrief
          items={[
            {
              icon: ShieldCheck,
              label: 'Current read',
              value: 'No active concerns',
              detail: 'Nothing needs action from the current trip data.',
              tone: 'ready',
            },
            {
              icon: Clock,
              label: 'Timing watch',
              value: `${timelineEvents.length} events`,
              detail: timelineEvents.length > 0 ? 'Upcoming events are watched for tight timing.' : 'Add bookings or stops to create timing guidance.',
              tone: timelineEvents.length > 0 ? 'neutral' : 'setup',
            },
            {
              icon: CloudSun,
              label: 'Weather watch',
              value: Object.keys(weatherByKey).length > 0 ? 'Available' : 'Pending',
              detail: 'Weather appears here when conditions change the plan.',
              tone: Object.keys(weatherByKey).length > 0 ? 'neutral' : 'setup',
            },
          ]}
        />
        <div className="text-center py-8">
        <CloudSun className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Everything looks good — nothing to flag right now.</p>
        <p className="text-xs text-muted-foreground/60 mt-1">All clear. RT2RP surfaces guidance automatically when timing, weather, route, or booking details need attention.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      <AppModuleHeader
        icon={CloudSun}
        eyebrow="Trip guidance"
        title="Guide"
        description="RT2RP prioritizes the few things that matter next, so the trip feels directed instead of noisy."
        status={`${guideItems.length} active`}
        statusTone={guideItems.some(item => item.icon === 'alert') ? 'cached' : 'neutral'}
      />
      <ModuleOperatingBrief
        items={[
          {
            icon: ListChecks,
            label: 'Top guidance',
            value: guideItems[0]?.icon === 'alert' ? 'Alert' : guideItems[0]?.icon === 'timing' ? 'Timing' : 'Weather',
            detail: guideItems[0]?.text || 'No active recommendation.',
            tone: guideItems[0]?.icon === 'alert' ? 'watch' : 'neutral',
          },
          {
            icon: Clock,
            label: 'Timeline watch',
            value: `${timelineEvents.length} events`,
            detail: 'Upcoming events drive timing recommendations.',
            tone: timelineEvents.length > 0 ? 'neutral' : 'setup',
          },
          {
            icon: AlertTriangle,
            label: 'Alert load',
            value: `${alerts.length}`,
            detail: alerts.length > 0 ? 'Alerts are included in the priority stack.' : 'No active alerts from the current trip context.',
            tone: alerts.length > 0 ? 'watch' : 'ready',
          },
        ]}
      />
      {guideItems.map(item => (
        <Card key={item.id}>
          <CardContent className="p-3.5">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center shrink-0 mt-0.5">
                {getIcon(item.icon)}
              </div>
              <p className="text-sm text-foreground leading-relaxed">{item.text}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
