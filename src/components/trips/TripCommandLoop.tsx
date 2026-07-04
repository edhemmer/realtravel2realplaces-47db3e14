import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CalendarClock,
  Car,
  CheckCircle2,
  Compass,
  MapPin,
  ParkingCircle,
  ReceiptText,
  Route,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Trip, Booking, Expense, Parking } from '@/types/database';
import type { CanonicalTripState } from '@/lib/canonicalTripState';
import { getLocalNowString, getNextStopFromCanonicalTimeline } from '@/lib/canonicalNextStop';
import type { TravelAlert } from '@/hooks/useTravelAlerts';

interface TripCommandLoopProps {
  tripId: string;
  trip: Trip;
  canonicalState: CanonicalTripState;
  bookings: Booking[];
  expenses: Expense[];
  parkingList: Parking[];
  alerts: TravelAlert[];
  onExplore?: () => void;
  onDrillThrough?: (target: { tab: 'bookings' | 'parking' | 'expenses'; recordId?: string } | null) => void;
}

function tripPhase(trip: Trip): { label: string; tone: 'setup' | 'live' | 'complete'; detail: string } {
  const today = getLocalNowString().substring(0, 10);
  if (today < trip.start_date) return { label: 'Get ready', tone: 'setup', detail: 'Review plans before travel starts' };
  if (today > trip.end_date) return { label: 'Wrap up', tone: 'complete', detail: 'Finish receipts and trip notes' };
  return { label: 'Travel day', tone: 'live', detail: 'Trip is active now' };
}

function formatDateTime(date?: string, time?: string): string {
  if (!date) return 'Time not set';
  const [, month, day] = date.split('-');
  const dateLabel = month && day ? `${Number(month)}/${Number(day)}` : date;
  return time ? `${dateLabel} at ${time}` : dateLabel;
}

export function TripCommandLoop({
  tripId,
  trip,
  canonicalState,
  bookings,
  expenses,
  parkingList,
  alerts,
  onExplore,
  onDrillThrough,
}: TripCommandLoopProps) {
  const nextStop = getNextStopFromCanonicalTimeline(canonicalState);
  const phase = tripPhase(trip);
  const missingBookings = bookings.length === 0;
  const missingExpenses = expenses.length === 0;
  const hasParking = parkingList.length > 0;
  const isDriveTrip = trip.transportation_mode === 'drive';
  const primaryAlert = alerts[0];

  const operatingCards = [
    {
      label: 'Right now',
      title: phase.label,
      detail: phase.detail,
      icon: phase.tone === 'live' ? Route : phase.tone === 'complete' ? CheckCircle2 : CalendarClock,
      tone: phase.tone,
    },
    {
      label: 'Next move',
      title: nextStop.nextStop?.displayName || (missingBookings ? 'Add your first plan' : 'Itinerary ready'),
      detail: nextStop.nextStop
        ? formatDateTime(nextStop.nextStop.eventLocalDate, nextStop.nextStop.eventLocalTime)
        : missingBookings
          ? 'Flights, lodging, drive, train, activity, or work stop'
          : 'No timed action is currently due',
      icon: MapPin,
      tone: nextStop.nextStop ? 'live' : 'setup',
      action: nextStop.nextStop
        ? () => onDrillThrough?.({ tab: nextStop.nextStop!.sourceType === 'parking' ? 'parking' : 'bookings', recordId: nextStop.nextStop!.sourceId })
        : undefined,
    },
    {
      label: 'Heads up',
      title: primaryAlert?.title || 'No urgent issues',
      detail: primaryAlert?.message || 'Weather, timing, and parking look quiet',
      icon: primaryAlert ? AlertTriangle : ShieldCheck,
      tone: primaryAlert ? 'setup' : 'complete',
    },
    {
      label: 'Receipts',
      title: missingExpenses ? 'No receipts yet' : `${expenses.length} saved`,
      detail: missingExpenses ? 'Capture spend while details are fresh' : 'Trip spend is being tracked',
      icon: ReceiptText,
      tone: missingExpenses ? 'setup' : 'complete',
    },
  ] as const;

  const toneClasses = {
    live: 'border-emerald-500/25 bg-emerald-500/8',
    setup: 'border-amber-500/25 bg-amber-500/8',
    complete: 'border-border/55 bg-card/68',
  };

  return (
    <section className="rt-command-panel">
      <div className="rt-panel-body space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="rt-muted-label">Today</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Your trip, organized from any booking source.</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Add reservations, drive plans, receipts, notes, and local context from wherever you booked. RT2RP keeps the next step clear.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isDriveTrip && (
              <Button asChild className="rt-primary-action h-10 px-4">
                <Link to={`/trip/${tripId}/drive`}>
                  <Car className="mr-2 h-4 w-4" />
                  Driving Mode
                </Link>
              </Button>
            )}
            <Button variant="outline" className="rt-secondary-action h-10 px-4" onClick={onExplore}>
              <Compass className="mr-2 h-4 w-4" />
              Explore nearby
            </Button>
            <Button asChild variant="outline" className="rt-secondary-action h-10 px-4">
              <Link to={`/trip/${tripId}?tab=expenses&addExpense=1`}>
                <ReceiptText className="mr-2 h-4 w-4" />
                Add receipt
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {operatingCards.map((card) => {
            const Icon = card.icon;
            return (
              <button
                key={card.label}
                type="button"
                onClick={card.action}
                disabled={!card.action}
                className={cn(
                  'rounded-2xl border p-4 text-left transition-all',
                  toneClasses[card.tone],
                  card.action && 'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-elevation-raised',
                )}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rt-muted-label">{card.label}</span>
                  <span className="rt-icon-tile">
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className="line-clamp-2 text-base font-bold leading-snug text-foreground">{card.title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{card.detail}</p>
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <div className="rt-kpi-panel p-3">
            <p className="rt-muted-label">Itinerary items</p>
            <p className="mt-1 text-lg font-bold">{bookings.length}</p>
          </div>
          <div className="rt-kpi-panel p-3">
            <p className="rt-muted-label">Parking</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-bold">
              {hasParking ? `${parkingList.length} saved` : 'Not saved'}
              <ParkingCircle className="h-4 w-4 text-primary" />
            </p>
          </div>
          <div className="rt-kpi-panel p-3">
            <p className="rt-muted-label">Timeline</p>
            <p className="mt-1 text-lg font-bold">{canonicalState.timelineEvents.length} events</p>
          </div>
        </div>
      </div>
    </section>
  );
}
