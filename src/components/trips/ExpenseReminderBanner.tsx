import { useState, useEffect } from 'react';
import { format, isWithinInterval, parseISO, isToday } from 'date-fns';
import { Trip, Expense } from '@/types/database';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Receipt, X } from 'lucide-react';

interface ExpenseReminderBannerProps {
  trip: Trip;
  expenses: Expense[];
  onAddExpense?: () => void;
}

// Store dismissed reminders in memory (per trip, per day)
const dismissedReminders = new Set<string>();

export function ExpenseReminderBanner({ trip, expenses, onAddExpense }: ExpenseReminderBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const checkReminder = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const todayStr = format(now, 'yyyy-MM-dd');
      const reminderKey = `${trip.id}-${todayStr}`;

      // Only show after 6 PM
      if (currentHour < 18) {
        setShouldShow(false);
        return;
      }

      // Check if already dismissed today
      if (dismissedReminders.has(reminderKey)) {
        setShouldShow(false);
        return;
      }

      // Check if trip is currently in progress
      const tripStart = parseISO(trip.start_date);
      const tripEnd = parseISO(trip.end_date);
      
      // Set time to start and end of day for comparison
      tripStart.setHours(0, 0, 0, 0);
      tripEnd.setHours(23, 59, 59, 999);

      const isInProgress = isWithinInterval(now, {
        start: tripStart,
        end: tripEnd,
      });

      if (!isInProgress) {
        setShouldShow(false);
        return;
      }

      // Check if any expense was recorded today
      const hasExpenseToday = expenses.some(e => e.date === todayStr);

      if (hasExpenseToday) {
        setShouldShow(false);
        return;
      }

      setShouldShow(true);
    };

    checkReminder();
    
    // Re-check every minute
    const interval = setInterval(checkReminder, 60000);
    return () => clearInterval(interval);
  }, [trip, expenses]);

  const handleDismiss = () => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const reminderKey = `${trip.id}-${todayStr}`;
    dismissedReminders.add(reminderKey);
    setIsDismissed(true);
    setShouldShow(false);
  };

  if (!shouldShow || isDismissed) {
    return null;
  }

  return (
    <Alert className="bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800">
      <Receipt className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="flex items-center justify-between flex-wrap gap-2">
        <span className="text-amber-700 dark:text-amber-300 text-sm">
          Have you recorded today's trip expenses?
        </span>
        <div className="flex items-center gap-2">
          {onAddExpense && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-7 text-xs border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
              onClick={onAddExpense}
            >
              Add Expense
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-amber-600 hover:text-amber-800 dark:text-amber-400"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
