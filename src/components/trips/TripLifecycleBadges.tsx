import { useMemo } from 'react';
import { Trip, TripState } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Lock, Archive, Moon, CalendarClock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveCanonicalLifecycle, getTodayDateOnly } from '@/lib/canonicalTimePolicy';

interface TripLifecycleBadgesProps {
  trip: Trip;
  isPro: boolean;
  compact?: boolean;
  showPlanBadge?: boolean;
}

/**
 * Shows only persisted trip state and date-derived lifecycle state.
 * Retention/deletion countdowns are intentionally withheld until the backend
 * deletion lifecycle is implemented, observable, and validated end-to-end.
 */
export function TripLifecycleBadges({ trip, isPro, compact = false, showPlanBadge = false }: TripLifecycleBadgesProps) {
  const tripState = (trip.trip_state || 'active') as TripState;
  const today = getTodayDateOnly();

  const lifecycle = useMemo(
    () => resolveCanonicalLifecycle(trip.start_date, trip.end_date, today),
    [trip.start_date, trip.end_date, today]
  );

  const getStatusConfig = () => {
    if (tripState === 'locked') {
      return {
        label: 'Locked',
        icon: <Lock className="w-3 h-3" />,
        className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
        show: true,
      };
    }
    if (tripState === 'closed') {
      return {
        label: 'Closed',
        icon: <Archive className="w-3 h-3" />,
        className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
        show: true,
      };
    }

    switch (lifecycle.phase) {
      case 'COMPLETED':
        return {
          label: 'Inactive',
          icon: <Moon className="w-3 h-3" />,
          className: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
          show: true,
        };
      case 'UPCOMING':
        return {
          label: 'Upcoming',
          icon: <CalendarClock className="w-3 h-3" />,
          className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
          show: true,
        };
      case 'ACTIVE':
        if (lifecycle.substate === 'PRE_TRIP') {
          return {
            label: 'Pre-Trip',
            icon: <Sparkles className="w-3 h-3" />,
            className: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30',
            show: true,
          };
        }
        return {
          label: 'Active',
          icon: null,
          className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
          show: true,
        };
      default:
        return {
          label: 'Active',
          icon: null,
          className: '',
          show: false,
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {showPlanBadge && isPro && (
        <Badge
          className={cn(
            'bg-primary text-primary-foreground border-0 shadow-sm shadow-primary/20 flex items-center gap-1',
            compact && 'text-[10px] px-1.5 py-0'
          )}
        >
          PRO
        </Badge>
      )}

      {statusConfig.show && (
        <Badge
          variant="outline"
          className={cn(
            'flex items-center gap-1 border',
            statusConfig.className,
            compact && 'text-[10px] px-1.5 py-0'
          )}
        >
          {statusConfig.icon}
          {statusConfig.label}
        </Badge>
      )}
    </div>
  );
}

/**
 * Returns styling classes for trip card based only on persisted lifecycle state.
 * The retained isClosedUrgent field stays false for backward compatibility with
 * callers until retention behavior has a proven backend contract.
 */
export function getTripCardLifecycleStyles(
  trip: Trip,
  _isPro: boolean
): { cardClassName: string; isLocked: boolean; isClosedUrgent: boolean } {
  const tripState = (trip.trip_state || 'active') as TripState;
  const isLocked = tripState === 'locked';

  return {
    cardClassName: isLocked ? 'opacity-60' : '',
    isLocked,
    isClosedUrgent: false,
  };
}
