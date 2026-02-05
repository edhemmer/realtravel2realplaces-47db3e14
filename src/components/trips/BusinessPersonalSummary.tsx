 import { Briefcase, Home } from 'lucide-react';
 import { Card, CardContent } from '@/components/ui/card';
 import { ExpensePurposeBreakdown } from '@/lib/expenseCalculations';
 
 interface BusinessPersonalSummaryProps {
   breakdown: ExpensePurposeBreakdown;
 }
 
 /**
  * v2.1.3: Business vs Personal expense summary for mixed trips
  * Shows side-by-side totals for business and personal expenses
  */
 export function BusinessPersonalSummary({ breakdown }: BusinessPersonalSummaryProps) {
   const hasUnassigned = breakdown.unassignedTotal > 0;
   
   return (
     <Card className="bg-muted/30 border-dashed">
       <CardContent className="py-3 px-4">
         <div className="flex flex-wrap items-center gap-4 text-sm">
           {/* Business Total */}
           <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center">
               <Briefcase className="w-3.5 h-3.5 text-violet-600" />
             </div>
             <span className="text-muted-foreground">Business:</span>
             <span className="font-semibold text-violet-700">
               ${breakdown.businessTotal.toFixed(2)}
             </span>
           </div>
           
           {/* Separator */}
           <span className="text-muted-foreground/50">|</span>
           
           {/* Personal Total */}
           <div className="flex items-center gap-2">
             <div className="w-6 h-6 rounded-md bg-emerald-100 flex items-center justify-center">
               <Home className="w-3.5 h-3.5 text-emerald-600" />
             </div>
             <span className="text-muted-foreground">Personal:</span>
             <span className="font-semibold text-emerald-700">
               ${breakdown.personalTotal.toFixed(2)}
             </span>
           </div>
           
           {/* Unassigned (only shown if > 0) */}
           {hasUnassigned && (
             <>
               <span className="text-muted-foreground/50">|</span>
               <div className="flex items-center gap-1">
                 <span className="text-muted-foreground text-xs">Unassigned:</span>
                 <span className="font-medium text-muted-foreground">
                   ${breakdown.unassignedTotal.toFixed(2)}
                 </span>
               </div>
             </>
           )}
         </div>
       </CardContent>
     </Card>
   );
 }