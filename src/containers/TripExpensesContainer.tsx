/**
 * TripExpensesContainer - Container component for Trip Expenses tab
 * 
 * Patch 2.2.2: Canonical trip containers & bug-fix-at-source architecture
 * 
 * This container:
 * - Fetches expense data through canonical hooks
 * - Uses canonical cost summary from useCanonicalTripState
 * - Handles loading/error/empty states consistently
 * 
 * CANONICAL HELPERS USED:
 * - useExpenses() for expenses list
 * - useBookings() for booking-linked expenses
 * - calculateTripCostSummary() for totals (via canonical state)
 * 
 * IMPORTANT: Only bookings/expenses/parking are included in cost calculations.
 * Tours/Engagements are NEVER included in cost totals.
 */

import { Trip } from '@/types/database';
import { useExpenses, useOfflineExpenseSync } from '@/hooks/useExpenses';
import { useBookings } from '@/hooks/useBookings';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useBookingExpenseSync } from '@/hooks/useBookingExpenseSync';
import { TripSectionLoading, TripSectionError } from '@/components/trips/TripSectionStates';
import { ExpensesTab } from '@/components/trips/tabs/ExpensesTab';
import { ReceiptRecordsPanel } from '@/components/trips/ReceiptRecordsPanel';
import { AppModuleHeader } from '@/components/trips/AppModuleHeader';
import { ModuleOperatingBrief } from '@/components/trips/ModuleOperatingBrief';
import { Camera, CircleDollarSign, ReceiptText } from 'lucide-react';

interface TripExpensesContainerProps {
  tripId: string;
  trip?: Trip;
  /** v2.3.5: Signal to auto-open Add Expense dialog */
  autoOpenAdd?: boolean;
  onAutoOpenConsumed?: () => void;
}

/**
 * Container that wires canonical hooks to ExpensesTab
 * 
 * v4.9.5: Owns the canonical booking→expense retroactive repair via
 * useBookingExpenseSync. This ensures repairs happen at container level,
 * not inside tab components, so all views see consistent data.
 * 
 * Tours are excluded from all cost calculations.
 */
export function TripExpensesContainer({ tripId, trip, autoOpenAdd, onAutoOpenConsumed }: TripExpensesContainerProps) {
  const { data: expenses = [], isLoading: expensesLoading, error: expensesError } = useExpenses(tripId);
  useOfflineExpenseSync(tripId);
  const { data: bookings = [], isLoading: bookingsLoading, error: bookingsError } = useBookings(tripId);
  const { data: userProfile } = useUserProfile();
  const homeCurrency = userProfile?.preferred_currency || 'USD';
  
  useBookingExpenseSync({
    tripId,
    bookings,
    expenses,
    bookingsLoading,
    expensesLoading,
    homeCurrency,
  });
  
  const isLoading = expensesLoading || bookingsLoading;
  const hasError = expensesError || bookingsError;
  const hasQueuedExpenses = expenses.some((expense) => expense.isPendingSync === true);
  const runningTotal = expenses.reduce((sum, expense) => (
    sum + Number(expense.converted_amount ?? expense.my_share ?? expense.amount ?? 0)
  ), 0);
  const lastExpense = [...expenses]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];
  
  if (isLoading) {
    return <TripSectionLoading message="Loading expenses..." />;
  }
  
  if (hasError) {
    return <TripSectionError message="We couldn't load your expenses. Please try again." />;
  }
  
  return (
    <div className="space-y-4">
      <AppModuleHeader
        icon={ReceiptText}
        eyebrow="Spend control"
        title="Spend"
        description="Capture receipts, reconcile booking costs, and keep trip spend report-ready while details are fresh."
        status={hasQueuedExpenses ? 'Offline queue' : `${expenses.length} expenses`}
        statusTone={hasQueuedExpenses ? 'cached' : 'neutral'}
      />
      <ModuleOperatingBrief
        items={[
          {
            icon: CircleDollarSign,
            label: 'Running total',
            value: new Intl.NumberFormat('en-US', { style: 'currency', currency: homeCurrency, maximumFractionDigits: 0 }).format(runningTotal),
            detail: expenses.length > 0 ? `${expenses.length} expenses plus synced booking costs where available.` : 'Capture the first receipt while the detail is fresh.',
            tone: expenses.length > 0 ? 'ready' : 'setup',
          },
          {
            icon: ReceiptText,
            label: 'Last item',
            value: lastExpense?.description || 'None yet',
            detail: lastExpense ? `${lastExpense.date} / ${lastExpense.category}` : 'Receipts, meals, gas, parking, and trip costs stay report-ready.',
            tone: lastExpense ? 'neutral' : 'setup',
          },
          {
            icon: Camera,
            label: 'Capture mode',
            value: hasQueuedExpenses ? 'Offline queue' : 'Photo or manual',
            detail: hasQueuedExpenses ? 'Queued expenses will sync when connection returns.' : 'Use camera upload when available, then verify the parsed fields.',
            tone: hasQueuedExpenses ? 'watch' : 'neutral',
          },
        ]}
      />
      <ReceiptRecordsPanel expenses={expenses} />
      <ExpensesTab tripId={tripId} autoOpenAdd={autoOpenAdd} onAutoOpenConsumed={onAutoOpenConsumed} />
    </div>
  );
}
