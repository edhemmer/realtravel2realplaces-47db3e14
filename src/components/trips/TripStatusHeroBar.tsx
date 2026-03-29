import { useState, useMemo } from 'react';
import { Trip, TripState } from '@/types/database';
import { useAccess } from '@/hooks/useAccess';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Archive, Clock, Moon, CalendarCog, CalendarClock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditTripDatesDialog } from './EditTripDatesDialog';
import { TripAskDialog } from './TripAskDialog';
import { resolveCanonicalLifecycle, daysBetween, getTodayDateOnly } from '@/lib/canonicalTimePolicy';
import { getTripMode, getModeTheme } from '@/lib/modeTheme';

interface TripStatusHeroBarProps {
  trip: Trip;
}

/**
 * v4.0.0: Uses canonical lifecycle resolver for status badge.
 */
export function TripStatusHeroBar({ trip }: TripStatusHeroBarProps) {
   const { isPro } = useAccess();
   const { state: canonicalState } = useCanonicalTripState(trip.id, trip);
   const [editDatesOpen, setEditDatesOpen] = useState(false);
   const [askOpen, setAskOpen] = useState(false);
   const tripState = (trip.trip_state || 'active') as TripState;

   const lifecycle = useMemo(
     () => resolveCanonicalLifecycle(trip.start_date, trip.end_date),
     [trip.start_date, trip.end_date]
   );

   // Calculate days until deletion for Pro closed trips
   const today = getTodayDateOnly();
   const daysSinceEnd = daysBetween(trip.end_date, today);
   const daysUntilDeletion = 45 - daysSinceEnd;

   const isProClosedTrip = isPro && tripState === 'closed';
   const showRetentionWarning = isProClosedTrip && daysUntilDeletion > 0;
   const isUrgent = showRetentionWarning && daysUntilDeletion <= 7;
 
   const getStatusConfig = () => {
     // Server-side locked/closed states take precedence
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

     // Use canonical lifecycle for active trips
     switch (lifecycle.phase) {
       case 'COMPLETED':
         return {
           label: 'Inactive',
           icon: <Moon className="w-3 h-3" />,
           className: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
         };
       case 'UPCOMING':
         return {
           label: 'Upcoming',
           icon: <CalendarClock className="w-3 h-3" />,
           className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
         };
       case 'ACTIVE':
         if (lifecycle.substate === 'PRE_TRIP') {
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
       default:
         return {
           label: 'Active',
           icon: null,
           className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
         };
     }
   };
 
   const statusConfig = getStatusConfig();
 
    const modeTheme = getModeTheme(getTripMode(trip));

    return (
      <>
      <div className="sticky top-16 z-40 -mx-4 px-4 sm:-mx-0 sm:px-0">
        <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-lg shadow-sm overflow-hidden">
          {/* Mode accent strip */}
          <div className={`h-[3px] w-full ${modeTheme.gradients.headerBg}`} />
          <div className="flex items-center justify-between gap-4 px-5 py-3.5">
            {/* Trip name - primary focal point */}
             <h2 className="font-bold text-xl truncate flex-1">{trip.name}</h2>
  
             {/* v3.10.4: Edit Trip Dates — always available */}
             <Button
               variant="ghost"
               size="sm"
               className="shrink-0 text-xs gap-1.5 text-muted-foreground hover:text-foreground h-8"
               onClick={() => setEditDatesOpen(true)}
             >
               <CalendarCog className="w-3.5 h-3.5" />
               <span className="hidden sm:inline">Edit Dates</span>
              </Button>

             {/* v5.2.0: Ask AI assistant */}
             <Button
               variant="ghost"
               size="sm"
               className="shrink-0 text-xs gap-1.5 text-primary hover:text-primary/80 h-8"
               onClick={() => setAskOpen(true)}
             >
               <Sparkles className="w-3.5 h-3.5" />
               <span className="hidden sm:inline">Ask</span>
             </Button>

             {/* Status Badge */}
             <Badge 
               variant="outline"
               className={cn(
                 'flex items-center gap-1.5 border transition-all duration-300 shrink-0 px-3 py-1',
                 statusConfig.className,
                 isUrgent && 'animate-pulse'
               )}
             >
               {statusConfig.icon}
               {statusConfig.label}
             </Badge>
           </div>
  
           {/* Retention warning line for Pro closed trips */}
           {showRetentionWarning && (
            <div className="px-5 pb-3 -mt-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Data retained for{' '}
                  <span className={cn(
                    'font-medium',
                    isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                  )}>
                    {daysUntilDeletion} day{daysUntilDeletion !== 1 ? 's' : ''}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* v3.10.4: Edit Trip Dates dialog */}
      <EditTripDatesDialog
        open={editDatesOpen}
        onOpenChange={setEditDatesOpen}
        trip={trip}
      />

      {/* v5.2.0: AI Trip Assistant dialog */}
      <TripAskDialog
        open={askOpen}
        onOpenChange={setAskOpen}
        trip={trip}
        canonicalState={canonicalState}
      />
    </>
    );
  }