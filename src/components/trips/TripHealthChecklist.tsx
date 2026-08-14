import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Info,
  CheckCircle2,
  Plane,
  Building2,
  Car,
  CircleParking,
  DollarSign,
  ArrowRight,
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
 * Review only fields RT2RP can verify from saved records.
 * This is not a travel-readiness certification and does not infer missing
 * real-world information outside the data stored in RT2RP.
 */
function analyzeTrip(
  trip: Trip,
  bookings: Booking[],
  parkingList: Parking[],
  expenses: Expense[],
  preferredCurrency?: string | null,
): HealthIssue[] {
  void preferredCurrency;
  const issues: HealthIssue[] = [];

  if (trip.transportation_mode === 'drive') {
    if (!trip.origin_address && !trip.destination_address) {
      issues.push({
        id: 'drive-addresses-missing',
        severity: 'warning',
        icon: <Car className="w-4 h-4" />,
        message: 'No full route address is saved for this drive trip.',
        fixLabel: 'Edit trip',
        target: null,
      });
    } else if (!trip.origin_address || !trip.destination_address) {
      issues.push({
        id: 'drive-address-partial',
        severity: 'info',
        icon: <Car className="w-4 h-4" />,
        message: 'Only one full route address is saved for this drive trip.',
        fixLabel: 'Edit trip',
        target: null,
      });
    }
  }

  if (bookings.length === 0 && trip.transportation_mode !== 'drive') {
    issues.push({
      id: 'no-records',
      severity: 'warning',
      icon: <Info className="w-4 h-4" />,
      message: 'No reservations or timed records are attached to this trip yet.',
      fixLabel: 'Add record',
      target: { tab: 'bookings' },
    });
  }

  const flights = bookings.filter((booking) => booking.booking_type === 'flight');
  flights.forEach((flight) => {
    const flightLabel = flight.airline
      ? `${flight.airline}${flight.confirmation_number ? ` (${flight.confirmation_number})` : ''}`
      : flight.confirmation_number || 'Unnamed flight';

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

  const stays = bookings.filter((booking) => booking.booking_type === 'stay');
  stays.forEach((stay) => {
    const stayLabel = stay.property_name || stay.vendor_name || 'Unnamed lodging';

    if (!hasExplicitTime(stay.start_datetime)) {
      issues.push({
        id: `stay-checkin-${stay.id}`,
        severity: 'info',
        icon: <Building2 className="w-4 h-4" />,
        message: `Lodging at "${stayLabel}" is missing check-in time.`,
        fixLabel: 'Edit lodging',
        target: { tab: 'bookings', recordId: stay.id },
      });
    }

    if (stay.end_datetime && !hasExplicitTime(stay.end_datetime)) {
      issues.push({
        id: `stay-checkout-${stay.id}`,
        severity: 'info',
        icon: <Building2 className="w-4 h-4" />,
        message: `Lodging at "${stayLabel}" is missing check-out time.`,
        fixLabel: 'Edit lodging',
        target: { tab: 'bookings', recordId: stay.id },
      });
    }

    if (!stay.address || stay.address.trim().length < 5) {
      issues.push({
        id: `stay-address-${stay.id}`,
        severity: 'info',
        icon: <Building2 className="w-4 h-4" />,
        message: `Lodging at "${stayLabel}" has no address on file.`,
        fixLabel: 'Add address',
        target: { tab: 'bookings', recordId: stay.id },
      });
    }
  });

  const rentals = bookings.filter((booking) => booking.booking_type === 'car_rental');
  rentals.forEach((rental) => {
    const rentalLabel = rental.rental_company || rental.vendor_name || rental.confirmation_number || 'Rental car';

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

  parkingList.forEach((parking) => {
    const parkingLabel = parking.label || parking.address || 'Unnamed parking';

    if (!parking.end_datetime) {
      issues.push({
        id: `parking-end-${parking.id}`,
        severity: 'warning',
        icon: <CircleParking className="w-4 h-4" />,
        message: `Parking at "${parkingLabel}" has no end time saved.`,
        fixLabel: 'Set end time',
        target: { tab: 'parking', recordId: parking.id },
      });
    }
  });

  if (trip.trip_type === 'mixed') {
    const expensesWithoutPurpose = expenses.filter((expense) => !expense.expense_purpose);
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
    [trip, bookings, parkingList, expenses, preferredCurrency],
  );

  const warningCount = issues.filter((issue) => issue.severity === 'warning').length;
  const infoCount = issues.filter((issue) => issue.severity === 'info').length;

  const getSeverityIcon = (severity: 'warning' | 'info') =>
    severity === 'warning'
      ? <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      : <Info className="w-4 h-4 text-primary" />;

  return (
    <Card className="overflow-hidden border-border/45 bg-card/70 shadow-elevation-raised">
      <CardHeader className="border-b border-border/35 pb-3">
        <CardTitle className="flex items-center justify-between gap-3 text-base">
          <span className="flex items-center gap-2">
            {issues.length === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            )}
            Saved trip data review
          </span>

          {issues.length === 0 ? (
            <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
              No missing fields found
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
          <p className="text-sm leading-relaxed text-muted-foreground">
            No missing fields were found in the saved-record checks RT2RP can verify here. This does not certify overall trip readiness.
          </p>
        ) : (
          <div className="space-y-2">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="flex items-start gap-3 rounded-xl border border-border/45 bg-background/55 p-3 text-sm"
              >
                <div className="mt-0.5 shrink-0">{getSeverityIcon(issue.severity)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-muted-foreground">{issue.icon}</span>
                    <p className="leading-relaxed text-foreground">{issue.message}</p>
                  </div>
                </div>
                {issue.target && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 shrink-0 rounded-lg px-2 text-xs"
                    onClick={() => onNavigate(issue.target)}
                  >
                    {issue.fixLabel}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
