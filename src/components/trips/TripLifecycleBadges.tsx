 import { Trip, TripState } from '@/types/database';
 import { Badge } from '@/components/ui/badge';
 import { Lock, Archive, Clock } from 'lucide-react';
 import { differenceInDays, parseISO, startOfDay } from 'date-fns';
 import { cn } from '@/lib/utils';
 
 interface TripLifecycleBadgesProps {
   trip: Trip;
   isPro: boolean;
   compact?: boolean;
   showPlanBadge?: boolean;
 }
 
 export function TripLifecycleBadges({ trip, isPro, compact = false, showPlanBadge = false }: TripLifecycleBadgesProps) {
   const tripState = (trip.trip_state || 'active') as TripState;
   
   // Calculate days until deletion for Pro closed trips
   const today = startOfDay(new Date());
   const tripEndDate = startOfDay(parseISO(trip.end_date));
   const daysSinceEnd = differenceInDays(today, tripEndDate);
   const daysUntilDeletion = 45 - daysSinceEnd;
   
   const isProClosedTrip = isPro && tripState === 'closed';
   const showRetentionBadge = isProClosedTrip && daysUntilDeletion > 0;
   const isUrgent = showRetentionBadge && daysUntilDeletion <= 7;
   const isDeletingTomorrow = showRetentionBadge && daysUntilDeletion <= 1;
 
   const getStatusConfig = () => {
     switch (tripState) {
       case 'active':
         return {
           label: 'Active',
           icon: null,
           className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
           show: true, // Now always show status badge
         };
       case 'locked':
         return {
           label: 'Locked',
           icon: <Lock className="w-3 h-3" />,
           className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
           show: true,
         };
       case 'closed':
         return {
           label: 'Closed',
           icon: <Archive className="w-3 h-3" />,
           className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
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
       {/* Plan Badge - only shown if explicitly requested */}
       {showPlanBadge && isPro && (
         <Badge 
           className={cn(
             'bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-sm shadow-purple-500/20 flex items-center gap-1',
             compact && 'text-[10px] px-1.5 py-0'
           )}
         >
           PRO
         </Badge>
       )}
 
       {/* Status Badge - always shown */}
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
 
       {/* Retention countdown for Pro closed trips */}
       {showRetentionBadge && (
         <Badge 
           variant="outline"
           className={cn(
             'flex items-center gap-1 border text-xs',
             isDeletingTomorrow
               ? 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30 animate-pulse'
               : isUrgent
                 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                 : 'bg-muted/50 text-muted-foreground border-border',
             compact && 'text-[10px] px-1.5 py-0'
           )}
         >
           <Clock className={cn('w-3 h-3', compact && 'w-2.5 h-2.5')} />
           {isDeletingTomorrow ? 'Deleting tomorrow' : `${daysUntilDeletion}d left`}
         </Badge>
       )}
     </div>
   );
 }
 
 /**
  * Returns styling classes for trip card based on lifecycle state
  */
 export function getTripCardLifecycleStyles(
   trip: Trip, 
   isPro: boolean
 ): { cardClassName: string; isLocked: boolean; isClosedUrgent: boolean } {
   const tripState = (trip.trip_state || 'active') as TripState;
   
   const today = startOfDay(new Date());
   const tripEndDate = startOfDay(parseISO(trip.end_date));
   const daysSinceEnd = differenceInDays(today, tripEndDate);
   const daysUntilDeletion = 45 - daysSinceEnd;
   
   const isLocked = tripState === 'locked';
   const isProClosedTrip = isPro && tripState === 'closed';
   const isClosedUrgent = isProClosedTrip && daysUntilDeletion <= 7 && daysUntilDeletion > 0;
   
   let cardClassName = '';
   
   if (isLocked) {
     // Free locked trips: dimmed appearance
     cardClassName = 'opacity-60';
   } else if (isClosedUrgent) {
     // Pro closed trips with urgent deletion: glowing border
     cardClassName = 'ring-2 ring-amber-400/50 dark:ring-amber-500/40';
   }
   
   return { cardClassName, isLocked, isClosedUrgent };
 }