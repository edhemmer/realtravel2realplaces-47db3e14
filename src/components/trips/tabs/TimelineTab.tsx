import { Calendar, Clock3, Layers3, WifiOff } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppModuleHeader } from '@/components/trips/AppModuleHeader';
import { ModuleOperatingBrief } from '@/components/trips/ModuleOperatingBrief';
import { TripTimeline } from '@/components/trips/TripTimeline';
import { TripSectionLoading, TripSectionError } from '@/components/trips/TripSectionStates';
import { useDesktopTripShell } from '@/containers/DesktopTripShell';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getOfflineTimelineWindow } from '@/lib/getOfflineTimelineWindow';
import { isOnline } from '@/lib/networkStatus';
import { setExploreContext } from '@/lib/explore/exploreContextStore';
import type { CanonicalTimelineEvent } from '@/lib/canonicalTripState';
import type { DatetimeFormatPreference } from '@/lib/displayFormats';
import type { Trip } from '@/types/database';
import type { DrillThroughTarget } from '@/pages/TripDetail';

interface TimelineTabProps {
  tripId: string;
  trip: Trip;
  onDrillThrough?: (target: DrillThroughTarget) => void;
  onExploreTab?: () => void;
}

export function TimelineTab({ tripId, trip, onDrillThrough, onExploreTab }: TimelineTabProps) {
  const shell = useDesktopTripShell();
  const fallback = useCanonicalTripState(tripId, shell ? null : trip);
  const { data: userProfile } = useUserProfile();
  const online = isOnline();

  const canonicalState = shell?.canonicalState ?? fallback.state;
  const isLoading = shell ? shell.isCanonicalLoading : fallback.isLoading;
  const events = shell?.timelineEvents ?? fallback.timelineEvents;
  const displayEvents = !online && canonicalState ? getOfflineTimelineWindow(canonicalState) : events;
  const datetimeFormat = userProfile?.preferred_datetime_format as DatetimeFormatPreference | undefined;

  const handleEventClick = (event: CanonicalTimelineEvent) => {
    if (!onDrillThrough) return;
    if (event.sourceType === 'parking') {
      onDrillThrough({ tab: 'parking', recordId: event.sourceId });
      return;
    }
    onDrillThrough({ tab: 'bookings', recordId: event.sourceId });
  };

  if (isLoading) {
    return <TripSectionLoading message="Loading trip timeline..." />;
  }

  if (!canonicalState) {
    return <TripSectionError message="We couldn't build the trip timeline. Please try again." />;
  }

  return (
    <div className="space-y-4">
      <AppModuleHeader
        icon={Calendar}
        eyebrow="Timeline"
        title="Trip Timeline"
        description="Saved flights, stays, rentals, drive details, parking, activities, and scheduled places arranged by date and time."
        status={displayEvents.length > 0 ? `${displayEvents.length} events` : 'No events yet'}
        statusTone={displayEvents.length > 0 ? 'neutral' : 'setup'}
      />
      <ModuleOperatingBrief
        items={[
          {
            icon: Layers3,
            label: 'Trip order',
            value: displayEvents.length > 0 ? `${displayEvents.length} saved events` : 'No events yet',
            detail: displayEvents.length > 0 ? 'Tap a timeline row to open its saved source record.' : 'Add reservations, parking, stops, or drive details to populate the timeline.',
            tone: displayEvents.length > 0 ? 'neutral' : 'setup',
          },
          {
            icon: Clock3,
            label: 'Data shown',
            value: online ? 'Loaded trip records' : 'Cached trip records',
            detail: online ? 'The timeline is ordered from the trip records loaded in this session.' : 'Only cached trip events available on this device are shown while offline.',
            tone: online ? 'neutral' : 'watch',
          },
          {
            icon: Calendar,
            label: 'View',
            value: 'Chronological',
            detail: 'Supported saved trip records are grouped into one date-and-time sequence.',
            tone: 'neutral',
          },
        ]}
      />

      <Card className="rt-command-panel">
        <CardHeader className="border-b border-border/35 px-4 py-4 md:px-5">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <Calendar className="h-4 w-4 text-primary" />
            Full itinerary timeline
          </CardTitle>
          <CardDescription className="text-xs">
            Chronological view built from the trip records currently available to the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-5">
          {!online && displayEvents.length > 0 && (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-border/35 bg-muted/35 px-3 py-2">
              <WifiOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs font-medium text-muted-foreground">Offline</p>
                <p className="text-[11px] text-muted-foreground/70">Showing cached trip events available on this device.</p>
              </div>
            </div>
          )}
          <TripTimeline
            events={displayEvents}
            datetimeFormat={datetimeFormat}
            onEventClick={handleEventClick}
            onExploreNearby={onExploreTab ? (eventId) => {
              setExploreContext(tripId, { kind: 'TIMELINE_ITEM', id: eventId });
              onExploreTab();
            } : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
