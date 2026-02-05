 import { Trip, TripState } from '@/types/database';
 import { useIsPro } from '@/hooks/useSubscription';
 import { Badge } from '@/components/ui/badge';
 import { Lock, Archive, Sparkles, Crown, Clock } from 'lucide-react';
 import { differenceInDays, parseISO, startOfDay } from 'date-fns';
 import { cn } from '@/lib/utils';
 
 interface TripStatusHeroBarProps {
   trip: Trip;
 }
 
 export function TripStatusHeroBar({ trip }: TripStatusHeroBarProps) {
   const isPro = useIsPro();
   const tripState = (trip.trip_state || 'active') as TripState;
   
   // Calculate days until deletion for Pro closed trips
   const today = startOfDay(new Date());
   const tripEndDate = startOfDay(parseISO(trip.end_date));
   const daysSinceEnd = differenceInDays(today, tripEndDate);
   const daysUntilDeletion = 45 - daysSinceEnd;
   const isProClosedTrip = isPro && tripState === 'closed';
   const showRetentionWarning = isProClosedTrip && daysUntilDeletion > 0;
   const isUrgent = showRetentionWarning && daysUntilDeletion <= 7;
 
   const getStatusConfig = () => {
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
     <div className="sticky top-16 z-40 -mx-4 px-4 sm:-mx-0 sm:px-0">
       <div className="bg-card/95 backdrop-blur-md border rounded-lg shadow-sm">
         <div className="flex items-center justify-between px-4 py-3">
           {/* Trip name */}
           <h2 className="font-semibold text-lg truncate">{trip.name}</h2>
 
           {/* Plan + Status badges */}
           <div className="flex items-center gap-2">
             {/* Plan Badge */}
             {isPro ? (
               <Badge 
                 className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-md shadow-purple-500/20 flex items-center gap-1"
               >
                 <Crown className="w-3 h-3" />
                 PRO
               </Badge>
             ) : (
               <Badge 
                 variant="outline" 
                 className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-600"
               >
                 FREE
               </Badge>
             )}
 
             {/* Status Badge */}
             <Badge 
               variant="outline"
               className={cn(
                 'flex items-center gap-1 border transition-all duration-300',
                 statusConfig.className,
                 isUrgent && 'animate-pulse'
               )}
             >
               {statusConfig.icon}
               {statusConfig.label}
             </Badge>
           </div>
         </div>
 
         {/* Retention warning line for Pro closed trips */}
         {showRetentionWarning && (
           <div className="px-4 pb-3 -mt-1">
             <div className="flex items-center gap-2 text-sm text-muted-foreground">
               <Clock className="w-3.5 h-3.5" />
               <span>
                 This trip is closed. Data will be retained for{' '}
                 <span className={cn(
                   'font-medium',
                   isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'
                 )}>
                   {daysUntilDeletion} day{daysUntilDeletion !== 1 ? 's' : ''}
                 </span>.
               </span>
             </div>
           </div>
         )}
       </div>
     </div>
   );
 }