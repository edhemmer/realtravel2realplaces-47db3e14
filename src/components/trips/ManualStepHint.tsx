/**
 * ManualStepHint - Contextual Education Component
 * 
 * Patch 2.6.7: Provides brief, contextual explanations for intentionally
 * manual steps in the application. Helps users understand that manual input
 * is a deliberate design choice for accuracy, not a missing feature.
 * 
 * Uses calm, professional, non-defensive language.
 */

import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManualStepHintProps {
  /** The hint message to display */
  message: string;
  /** Additional CSS classes */
  className?: string;
  /** Variant for different visual weights */
  variant?: 'inline' | 'block';
}

export function ManualStepHint({ 
  message, 
  className,
  variant = 'inline' 
}: ManualStepHintProps) {
  if (variant === 'block') {
    return (
      <div className={cn(
        "flex items-start gap-2 p-3 rounded-md bg-muted/50 border border-muted-foreground/10",
        className
      )}>
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          {message}
        </p>
      </div>
    );
  }

  return (
    <p className={cn(
      "flex items-center gap-1.5 text-xs text-muted-foreground",
      className
    )}>
      <Info className="h-3 w-3 shrink-0" />
      <span>{message}</span>
    </p>
  );
}

/**
 * Pre-defined hint messages for common manual steps.
 * Centralized for consistency across the app.
 */
export const MANUAL_STEP_HINTS = {
  // Expense-related
  expenseReview: "This step is manual to ensure accuracy when receipt details vary.",
  expensePurpose: "You classify expenses to ensure accurate reporting for your needs.",
  
  // Booking-related
  parsedDataReview: "Please review parsed details—RT2RP avoids guessing so you stay in control.",
  bookingCost: "Costs are entered manually to ensure your records match your actual expenses.",
  
  // Stop/Engagement assignment
  stopAssignment: "Assign expenses to stops manually for precise location-based tracking.",
  
  // Mileage & Drive
  mileageEntry: "Enter mileage manually for accurate reimbursement records.",
  gasExpense: "Track gas expenses manually to ensure each fill-up is accurately recorded.",
  
  // Companions
  companionShare: "Split amounts manually—travel sharing arrangements vary widely.",
  
  // General
  manualAccuracy: "Manual entry helps avoid assumptions and improves accuracy.",
} as const;
