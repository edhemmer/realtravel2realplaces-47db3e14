/**
 * TripHealthChecklist - Pro-only trip data quality analysis
 * v2.1.0: Scans trip data for missing/incomplete fields and provides fix links
 * 
 * This is READ-ONLY analysis - no data is modified or guessed.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, Info, CheckCircle2, 
  Plane, Building2, Car, CircleParking, 
  DollarSign, ArrowRight 
} from 'lucide-react';
import { Trip, Booking, Parking, Expense } from '@/types/database';
import { hasExplicitTime } from '@/lib/datetimeIntegrity';
import type { DrillThroughTarget } from '@/pages/TripDetail';

interface HealthIssue {
  id: string;
  severity: 'warning' | 'info';
  icon: React.ReactNode;
  message: string;
  fixLabel: string;
  target: DrillThroughTarget;
}

interface TripHealthChecklistProps {
  trip: Trip;
  bookings: Booking[];
  parkingList: Parking[];
  expenses: Expense[];
  preferredCurrency?: string | null;
  onNavigate: (target: DrillThroughTarget) => void;
}

/**
 * Analyze trip data for missing or incomplete information
 * All checks are based purely on stored data - no guessing or inference
 */
function analyzeTrip(
  trip: Trip,
  bookings: Booking[],
  parkingList: Parking[],
  expenses: Expense[],
  preferredCurrency?: string | null
): HealthIssue[] {
  const issues: HealthIssue[] = [];

  // ===== FLIGHT CHECKS =====
  const flights = bookings.filter(b => b.booking_type === 'flight');
  flights.forEach(flight => {
    const flightLabel = flight.airline 
      ? `${flight.airline}${flight.confirmation_number ? ` (${flight.confirmation_number})` : ''}`
      : flight.confirmation_number || 'Unnamed flight';

    // Check: missing departure time
    if (!hasExplicitTime(flight.start_datetime)) {
      issues.push({
        id: `flight-time-${flight.id}`,
        severity: 'warning',
        icon: <Plane className="w-4 h-4" />,
        message: `Flight "${flightLabel}" is missing a clear departure time.`,
        fixLabel: 'Edit flight',
        target: { tab: 'bookings', recordId: flight.id },
      });
    }
  });

  // ===== STAY CHECKS =====
  const stays = bookings.filter(b => b.booking_type === 'stay');
  stays.forEach(stay => {
    const stayLabel = stay.property_name || stay.vendor_name || 'Unnamed stay';

    // Check: missing check-in time
    if (!hasExplicitTime(stay.start_datetime)) {
      issues.push({
        id: `stay-checkin-${stay.id}`,
        severity: 'info',
        icon: <Building2 className="w-4 h-4" />,
        message: `Stay at "${stayLabel}" is missing check-in time.`,
        fixLabel: 'Edit stay',
        target: { tab: 'bookings', recordId: stay.id },
      });
    }

    // Check: missing check-out time
    if (stay.end_datetime && !hasExplicitTime(stay.end_datetime)) {
      issues.push({
        id: `stay-checkout-${stay.id}`,
        severity: 'info',
        icon: <Building2 className="w-4 h-4" />,
        message: `Stay at "${stayLabel}" is missing check-out time.`,
        fixLabel: 'Edit stay',
        target: { tab: 'bookings', recordId: stay.id },
      });
    }

    // Check: missing address
    if (!stay.address || stay.address.trim().length < 5) {
      issues.push({
        id: `stay-address-${stay.id}`,
        severity: 'info',
        icon: <Building2 className="w-4 h-4" />,
        message: `Stay at "${stayLabel}" has no address on file.`,
        fixLabel: 'Add address',
        target: { tab: 'bookings', recordId: stay.id },
      });
    }
  });

  // ===== RENTAL CAR CHECKS =====
  const rentals = bookings.filter(b => b.booking_type === 'car_rental');
  rentals.forEach(rental => {
    const rentalLabel = rental.rental_company || rental.vendor_name || rental.confirmation_number || 'Rental car';

    // Check: missing pickup time
    if (!hasExplicitTime(rental.start_datetime)) {
      issues.push({
        id: `rental-pickup-${rental.id}`,
        severity: 'warning',
        icon: <Car className="w-4 h-4" />,
        message: `Rental car "${rentalLabel}" is missing pickup time.`,
        fixLabel: 'Edit rental',
        target: { tab: 'bookings', recordId: rental.id },
      });
    }

    // Check: missing return time
    if (rental.end_datetime && !hasExplicitTime(rental.end_datetime)) {
      issues.push({
        id: `rental-return-${rental.id}`,
        severity: 'warning',
        icon: <Car className="w-4 h-4" />,
        message: `Rental car "${rentalLabel}" is missing return time.`,
        fixLabel: 'Edit rental',
        target: { tab: 'bookings', recordId: rental.id },
      });
    }
  });

  // ===== PARKING CHECKS =====
  parkingList.forEach(parking => {
    const parkingLabel = parking.label || parking.address || 'Unnamed parking';

    // Check: missing end time
    if (!parking.end_datetime) {
      issues.push({
        id: `parking-end-${parking.id}`,
        severity: 'warning',
        icon: <CircleParking className="w-4 h-4" />,
        message: `Parking at "${parkingLabel}" has no end time set.`,
        fixLabel: 'Set end time',
        target: { tab: 'parking', recordId: parking.id },
      });
    }
  });

  // ===== EXPENSE CHECKS (mixed trip purpose) =====
  if (trip.trip_type === 'mixed') {
    const expensesWithoutPurpose = expenses.filter(e => !e.expense_purpose);
    if (expensesWithoutPurpose.length > 0) {
      issues.push({
        id: 'expenses-missing-purpose',
        severity: 'warning',
        icon: <DollarSign className="w-4 h-4" />,
        message: `${expensesWithoutPurpose.length} expense${expensesWithoutPurpose.length > 1 ? 's are' : ' is'} missing business/personal selection.`,
        fixLabel: 'Review expenses',
        target: { tab: 'expenses' },
      });
    }
  }

  // ===== CURRENCY CHECK =====
  // Note: Currency field is not currently stored per-expense/booking in the data model.
  // This check is a placeholder for when multi-currency support is added.
  // For now, we skip this check since all amounts are assumed USD.

  return issues;
}

export function TripHealthChecklist({
  trip,
  bookings,
  parkingList,
  expenses,
  preferredCurrency,
  onNavigate,
}: TripHealthChecklistProps) {
  const issues = useMemo(
    () => analyzeTrip(trip, bookings, parkingList, expenses, preferredCurrency),
    [trip, bookings, parkingList, expenses, preferredCurrency]
  );

  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  const getSeverityIcon = (severity: 'warning' | 'info') => {
    return severity === 'warning' 
      ? <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      : <Info className="w-4 h-4 text-primary" />;
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            {issues.length === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
            Trip Health & Gaps
          </span>
          {issues.length === 0 ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
              All clear
            </Badge>
          ) : (
            <div className="flex gap-1">
              {warningCount > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                  {warningCount} warning{warningCount > 1 ? 's' : ''}
                </Badge>
              )}
              {infoCount > 0 && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  {infoCount} info
                </Badge>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            All bookings, parking, and expenses have complete information.
          </p>
        ) : (
          <div className="space-y-2">
            {issues.map(issue => (
              <div
                key={issue.id}
                className="flex items-start gap-3 p-2 rounded-md bg-muted/50 text-sm"
              >
                <div className="mt-0.5 shrink-0">
                  {getSeverityIcon(issue.severity)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-muted-foreground">{issue.icon}</span>
                    <p className="text-foreground truncate">{issue.message}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs shrink-0"
                  onClick={() => onNavigate(issue.target)}
                >
                  {issue.fixLabel}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
