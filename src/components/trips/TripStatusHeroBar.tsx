import { useState } from 'react';
import { Trip, TripState } from '@/types/database';
import { useAccess } from '@/hooks/useAccess';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock, Archive, Clock, Moon, CalendarCog } from 'lucide-react';
import { differenceInDays, parseISO, startOfDay, isBefore } from 'date-fns';
import { cn } from '@/lib/utils';
import { EditTripDatesDialog } from './EditTripDatesDialog';

interface TripStatusHeroBarProps {
  trip: Trip;
}

/**
 * v2.1.40: Removed PRO badge from trip bar - plan is account-level, not per-trip.
 * Status badge (Active/Inactive/Locked/Closed) remains.
 */
export function TripStatusHeroBar({ trip }: TripStatusHeroBarProps) {
   const { isPro } = useAccess();
   const [editDatesOpen, setEditDatesOpen] = useState(false);
   const tripState = (trip.trip_state || 'active') as TripState;

   // Calculate days until deletion for Pro closed trips
   const today = startOfDay(new Date());
   const tripEndDate = startOfDay(parseISO(trip.end_date));
   const daysSinceEnd = differenceInDays(today, tripEndDate);
   const daysUntilDeletion = 45 - daysSinceEnd;

   // v2.1.7: Display "Inactive" for ACTIVE trips past their end date
   const isPastEndDate = isBefore(tripEndDate, today);
   const isDisplayInactive = tripState === 'active' && isPastEndDate;

   const isProClosedTrip = isPro && tripState === 'closed';
   const showRetentionWarning = isProClosedTrip && daysUntilDeletion > 0;
   const isUrgent = showRetentionWarning && daysUntilDeletion <= 7;
 
   const getStatusConfig = () => {
     // v2.1.7: Check for display-only "Inactive" state first
     if (isDisplayInactive) {
       return {
         label: 'Inactive',
         icon: <Moon className="w-3 h-3" />,
         className: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
       };
     }

     switch (tripState) {
       case 'active':
         return {
           label: 'Active',
           icon: null,
           className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
         };
       case 'locked':
         return {
           label: 'Locked',
           icon: <Lock className="w-3 h-3" />,
           className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
         };
       case 'closed':
         return {
           label: 'Closed',
           icon: <Archive className="w-3 h-3" />,
           className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
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
 
    return (
      <>
      <div className="sticky top-16 z-40 -mx-4 px-4 sm:-mx-0 sm:px-0">
        <div className="bg-card/95 backdrop-blur-md border border-border/50 rounded-lg shadow-sm">
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
    </>
    );
  }