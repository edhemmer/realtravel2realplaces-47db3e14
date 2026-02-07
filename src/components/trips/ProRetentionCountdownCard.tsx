 import { Trip, TripState } from '@/types/database';
 import { useAccess } from '@/hooks/useAccess';
 import { Button } from '@/components/ui/button';
 import { Card } from '@/components/ui/card';
 import { FileText, Sheet, Trash2, Calendar, Download } from 'lucide-react';
 import { differenceInDays, parseISO, startOfDay } from 'date-fns';
 import { cn } from '@/lib/utils';
 
 interface ProRetentionCountdownCardProps {
   trip: Trip;
 }
 
 export function ProRetentionCountdownCard({ trip }: ProRetentionCountdownCardProps) {
   const { isPro } = useAccess();
   const tripState = (trip.trip_state || 'active') as TripState;
   
   // Calculate days until deletion
   const today = startOfDay(new Date());
   const tripEndDate = startOfDay(parseISO(trip.end_date));
   const daysSinceEnd = differenceInDays(today, tripEndDate);
   const daysUntilDeletion = 45 - daysSinceEnd;
   
   // Only show for Pro closed trips within the 45-day window
   const shouldShow = isPro && tripState === 'closed' && daysUntilDeletion > 0;
   const isUrgent = daysUntilDeletion <= 5;
   
   if (!shouldShow) return null;
 
   const handleExportPDF = () => {
     // Trigger existing export functionality
     window.print();
   };
 
   const handleExportCSV = () => {
     // Placeholder for CSV export - reuses existing functionality
     console.log('Export CSV for trip:', trip.id);
   };
 
   return (
     <Card className={cn(
       'relative overflow-hidden border-2 transition-all duration-500',
       // Glassmorphism effect
       'bg-gradient-to-br from-white/80 via-white/60 to-purple-50/40 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-purple-950/40',
       'backdrop-blur-xl',
       isUrgent 
         ? 'border-amber-400/60 shadow-lg shadow-amber-500/20' 
         : 'border-purple-300/40 dark:border-purple-700/40'
     )}>
       {/* Decorative gradient overlay */}
       <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-pink-500/5 pointer-events-none" />
       
       <div className="relative p-6">
         <div className="flex flex-col sm:flex-row gap-6">
           {/* Left side: Big countdown */}
           <div className="flex flex-col items-center justify-center sm:min-w-[140px]">
             <div className={cn(
               'text-5xl sm:text-6xl font-bold tracking-tight',
               isUrgent 
                 ? 'text-amber-600 dark:text-amber-400' 
                 : 'text-purple-600 dark:text-purple-400'
             )}>
               {daysUntilDeletion}
             </div>
             <div className="text-sm font-medium text-muted-foreground mt-1">
               day{daysUntilDeletion !== 1 ? 's' : ''} left
             </div>
           </div>
 
           {/* Divider */}
           <div className="hidden sm:block w-px bg-border/60" />
 
           {/* Right side: Explanation + Actions */}
           <div className="flex-1 space-y-4">
             <div className="space-y-2">
               <div className="flex items-center gap-2">
                 {isUrgent && (
                   <Trash2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                 )}
                 <h3 className={cn(
                   'font-semibold',
                   isUrgent ? 'text-amber-700 dark:text-amber-300' : 'text-foreground'
                 )}>
                   {isUrgent ? 'Deletion Approaching' : 'Trip Archived'}
                 </h3>
               </div>
               <p className="text-sm text-muted-foreground">
                 This closed Pro trip will be permanently deleted in{' '}
                 <span className="font-medium text-foreground">{daysUntilDeletion} day{daysUntilDeletion !== 1 ? 's' : ''}</span>.
                 {' '}Export your data now to keep a copy.
               </p>
             </div>
 
             {/* Export buttons */}
             <div className="flex flex-wrap gap-2">
               <Button
                 variant="outline"
                 size="sm"
                 onClick={handleExportPDF}
                 className={cn(
                   'border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950',
                   isUrgent && 'border-amber-400 dark:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950'
                 )}
               >
                 <FileText className="w-4 h-4 mr-2" />
                 Export as PDF
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={handleExportCSV}
                 className={cn(
                   'border-purple-300 dark:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950',
                   isUrgent && 'border-amber-400 dark:border-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950'
                 )}
               >
                 <Sheet className="w-4 h-4 mr-2" />
                 Export as CSV
               </Button>
             </div>
           </div>
         </div>
       </div>
 
       {/* Subtle glow effect for urgent state */}
       {isUrgent && (
         <div className="absolute inset-0 rounded-lg ring-2 ring-amber-400/30 ring-inset pointer-events-none animate-pulse" />
       )}
     </Card>
   );
 }