import { useMemo, useState } from 'react';
import { Trip, TripState } from '@/types/database';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Lock,
  Archive,
  Moon,
  CalendarCog,
  CalendarClock,
  Sparkles,
  MapPinned,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditTripDatesDialog } from './EditTripDatesDialog';
import { TripAskDialog } from './TripAskDialog';
import { resolveCanonicalLifecycle } from '@/lib/canonicalTimePolicy';
import { getTripMode, getModeTheme } from '@/lib/modeTheme';

interface TripStatusHeroBarProps {
  trip: Trip;
}

/**
 * Shows only lifecycle state that RT2RP can derive from the trip record.
 * Retention/deletion timing is intentionally absent until a backend retention
 * policy and export path are implemented and verified end-to-end.
 */
export function TripStatusHeroBar({ trip }: TripStatusHeroBarProps) {
  const { state: canonicalState } = useCanonicalTripState(trip.id, trip);
  const [editDatesOpen, setEditDatesOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const tripState = (trip.trip_state || 'active') as TripState;

  const lifecycle = useMemo(
    () => resolveCanonicalLifecycle(trip.start_date, trip.end_date),
    [trip.start_date, trip.end_date]
  );

  const statusConfig = useMemo(() => {
    if (tripState === 'locked') {
      return {
        label: 'Locked',
        icon: <Lock className="w-3 h-3" />,
        className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
      };
    }

    if (tripState === 'closed') {
      return {
        label: 'Closed',
        icon: <Archive className="w-3 h-3" />,
        className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
      };
    }

    if (lifecycle.phase === 'COMPLETED') {
      return {
        label: 'Inactive',
        icon: <Moon className="w-3 h-3" />,
        className: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
      };
    }

    if (lifecycle.phase === 'UPCOMING') {
      return {
        label: 'Upcoming',
        icon: <CalendarClock className="w-3 h-3" />,
        className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
      };
    }

    if (lifecycle.phase === 'ACTIVE' && lifecycle.substate === 'PRE_TRIP') {
      return {
        label: 'Pre-Trip',
        icon: <Sparkles className="w-3 h-3" />,
        className: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
      };
    }

    return {
      label: 'Active',
      icon: null,
      className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    };
  }, [lifecycle.phase, lifecycle.substate, tripState]);

  const modeTheme = getModeTheme(getTripMode(trip));

  return (
    <>
      <div className="rt-trip-status-hero sticky top-16 z-40 -mx-4 px-4 sm:-mx-0 sm:px-0">
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/90 shadow-elevation-raised backdrop-blur-md">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-primary/8 to-transparent" />
          <div className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-amber-400/10 blur-2xl" />
          <div className={`h-[3px] w-full ${modeTheme.gradients.headerBg}`} />

          <div className="relative px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="flex items-start gap-3">
              <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${modeTheme.gradients.buttonBg} shadow-sm`}>
                <MapPinned className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-lg font-bold leading-tight sm:text-xl">{trip.name}</h2>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {trip.destination_city}, {trip.destination_country}
                </p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 rounded-lg px-2 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setEditDatesOpen(true)}
                >
                  <CalendarCog className="w-3.5 h-3.5" />
                  <span>Edit Dates</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 shrink-0 gap-1.5 rounded-lg px-2 text-xs text-primary hover:text-primary/80"
                  onClick={() => setAskOpen(true)}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ask</span>
                </Button>
              </div>

              <Badge
                variant="outline"
                className={cn(
                  'flex shrink-0 items-center gap-1.5 border px-2.5 py-1 transition-all duration-300',
                  statusConfig.className
                )}
              >
                {statusConfig.icon}
                {statusConfig.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <EditTripDatesDialog
        open={editDatesOpen}
        onOpenChange={setEditDatesOpen}
        trip={trip}
      />

      <TripAskDialog
        open={askOpen}
        onOpenChange={setAskOpen}
        trip={trip}
        canonicalState={canonicalState}
      />
    </>
  );
}
