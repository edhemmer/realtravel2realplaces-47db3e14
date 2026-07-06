import { type DragEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CalendarClock,
  Car,
  CheckCircle2,
  CloudSun,
  Compass,
  GripVertical,
  MapPin,
  ParkingCircle,
  Plane,
  ReceiptText,
  Route,
  ShieldCheck,
  Sparkles,
  WalletCards,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Trip, Booking, Expense, Parking } from '@/types/database';
import type { CanonicalTripState } from '@/lib/canonicalTripState';
import { getLocalNowString, getNextStopFromCanonicalTimeline } from '@/lib/canonicalNextStop';
import { conditionLabel, type WeatherSnapshot } from '@/lib/canonicalWeather';
import { isOnline } from '@/lib/networkStatus';
import type { TravelAlert } from '@/hooks/useTravelAlerts';

type DashboardPanelId = 'weather' | 'flight' | 'spend' | 'movement' | 'timeline' | 'places';

const DEFAULT_PANEL_ORDER: DashboardPanelId[] = ['flight', 'weather', 'movement', 'spend', 'timeline', 'places'];

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

function tripPhase(trip: Trip): { label: string; tone: 'setup' | 'active' | 'complete'; detail: string } {
  const today = getLocalNowString().substring(0, 10);
  if (today < trip.start_date) return { label: 'Get ready', tone: 'setup', detail: 'Review plans before travel starts' };
  if (today > trip.end_date) return { label: 'Wrap up', tone: 'complete', detail: 'Finish receipts and trip notes' };
  return { label: 'Travel day', tone: 'active', detail: 'Trip is active now' };
}

function formatDateTime(date?: string, time?: string): string {
  if (!date) return 'Time not set';
  const [, month, day] = date.split('-');
  const dateLabel = month && day ? `${Number(month)}/${Number(day)}` : date;
  return time ? `${dateLabel} at ${time}` : dateLabel;
}

function routeDestinationLabel(trip: Trip): string {
  return trip.destination_address?.trim()
    || [trip.destination_city, trip.destination_state, trip.destination_country].filter(Boolean).join(', ')
    || trip.name
    || 'destination';
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function shortDateTime(value?: string): string {
  if (!value) return 'Time not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function dayLabel(dateISO: string): string {
  const [year, month, day] = dateISO.split('-').map(Number);
  const date = new Date(year, (month || 1) - 1, day || 1);
  if (Number.isNaN(date.getTime())) return dateISO;
  return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(date);
}

function FlightRouteGraphic({ booking }: { booking?: Booking }) {
  if (!booking) {
    return (
      <div className="relative my-5 overflow-hidden rounded-2xl border border-dashed border-border/55 bg-background/35 px-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Flight data</p>
            <p className="mt-1 text-lg font-black tracking-tight text-foreground">Not connected yet</p>
          </div>
          <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/8 text-primary">
            <Plane className="h-4 w-4" />
          </span>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Add or import a flight before relying on airport, gate, or status guidance.
        </p>
      </div>
    );
  }

  const origin = booking.departure_airport_code || 'Origin';
  const destination = booking.arrival_airport_code || 'Destination';

  return (
    <div className="relative my-5 overflow-hidden rounded-2xl border border-border/40 bg-background/45 px-4 py-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.14),transparent_34%),radial-gradient(circle_at_86%_40%,hsl(var(--brand-champagne)/0.12),transparent_35%)]" />
      <div className="relative flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Depart</p>
          <p className="mt-1 text-xl font-black tracking-tight text-foreground">{origin}</p>
        </div>
        <div className="relative h-16 flex-1">
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 320 80" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M12 58 C 92 5, 218 5, 308 58"
              fill="none"
              stroke="hsl(var(--primary) / 0.72)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="6 8"
            />
            <path
              d="M12 58 C 92 5, 218 5, 308 58"
              fill="none"
              stroke="hsl(var(--brand-champagne) / 0.28)"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute left-0 top-[3.15rem] h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_5px_hsl(var(--primary)/0.12)]" />
          <span className="absolute right-0 top-[3.15rem] h-2.5 w-2.5 rounded-full border border-primary bg-background shadow-[0_0_0_5px_hsl(var(--primary)/0.10)]" />
          <span className="absolute left-1/2 top-2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border border-primary/30 bg-card/90 text-primary shadow-sm">
            <Plane className="h-4 w-4 -rotate-3" />
          </span>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Arrive</p>
          <p className="mt-1 text-xl font-black tracking-tight text-foreground">{destination}</p>
        </div>
      </div>
    </div>
  );
}

function summarizeWeather(weatherByKey: Record<string, WeatherSnapshot>, trip: Trip): WeatherSnapshot[] {
  const today = getLocalNowString().substring(0, 10);
  const preferredLocation = [trip.destination_city, trip.destination_state, trip.destination_country]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const byDate = new Map<string, WeatherSnapshot>();

  Object.values(weatherByKey)
    .filter((snapshot) => snapshot.dateISO >= today)
    .sort((a, b) => {
      const dateSort = a.dateISO.localeCompare(b.dateISO);
      if (dateSort !== 0) return dateSort;
      const aPreferred = preferredLocation && `${a.city ?? ''} ${a.state ?? ''} ${a.country ?? ''}`.toLowerCase().includes(preferredLocation);
      const bPreferred = preferredLocation && `${b.city ?? ''} ${b.state ?? ''} ${b.country ?? ''}`.toLowerCase().includes(preferredLocation);
      return Number(bPreferred) - Number(aPreferred);
    })
    .forEach((snapshot) => {
      if (!byDate.has(snapshot.dateISO)) byDate.set(snapshot.dateISO, snapshot);
    });

  return Array.from(byDate.values()).slice(0, 5);
}

function operatingScore({
  trip,
  bookings,
  alerts,
  eventCount,
}: {
  trip: Trip;
  bookings: Booking[];
  alerts: TravelAlert[];
  eventCount: number;
}): { score: number; label: string; detail: string } {
  const checks = [
    Boolean(trip.destination_city || trip.destination_address),
    eventCount > 0 || trip.transportation_mode === 'drive',
    bookings.length > 0 || trip.transportation_mode === 'drive',
    trip.transportation_mode === 'drive' ? Boolean(trip.destination_address || trip.destination_city) : true,
    alerts.length === 0,
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const label = score >= 85 ? 'Ready' : score >= 65 ? 'Needs review' : 'Setup needed';
  const detail = score >= 85
    ? 'RT2RP has enough trip context to guide the next move.'
    : score >= 65
      ? 'A few more details will make guidance sharper and more automatic.'
      : 'Add the missing trip records so RT2RP can watch the trip properly.';
  return { score, label, detail };
}

function trustToneClass(tone: 'ready' | 'watch' | 'setup') {
  if (tone === 'ready') return 'border-emerald-500/22 bg-emerald-500/8';
  if (tone === 'watch') return 'border-amber-500/28 bg-amber-500/9';
  return 'border-primary/22 bg-primary/8';
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
  const online = isOnline();
  const weatherForecast = summarizeWeather(canonicalState.weatherByKey, trip);
  const currentWeather = weatherForecast[0];
  const flights = bookings
    .filter((booking) => booking.booking_type === 'flight')
    .sort((a, b) => a.start_datetime.localeCompare(b.start_datetime));
  const nextFlight = flights.find((booking) => booking.start_datetime >= new Date().toISOString()) || flights[0];
  const stays = bookings.filter((booking) => booking.booking_type === 'stay');
  const latestExpense = [...expenses].sort((a, b) => (b.date || b.created_at).localeCompare(a.date || a.created_at))[0];
  const expenseTotal = expenses.reduce((sum, expense) => sum + Number(expense.converted_amount ?? expense.my_share ?? expense.amount ?? 0), 0);
  const storageKey = `rt2rp-command-dashboard:${tripId}`;
  const [panelOrder, setPanelOrder] = useState<DashboardPanelId[]>(DEFAULT_PANEL_ORDER);
  const [draggingPanel, setDraggingPanel] = useState<DashboardPanelId | null>(null);
  const score = operatingScore({
    trip,
    bookings,
    alerts,
    eventCount: canonicalState.timelineEvents.length,
  });
  const hasReliableMovement = isDriveTrip
    ? Boolean(trip.destination_address || trip.destination_city)
    : flights.length > 0 || bookings.some((booking) => booking.booking_type === 'transport' || booking.booking_type === 'car_rental');
  const trustSignals = [
    {
      label: 'Connection',
      value: online ? 'Online' : 'Offline',
      detail: online ? 'Live refresh can run when modules request it.' : 'Using cached trip context until connection returns.',
      icon: online ? CheckCircle2 : WifiOff,
      tone: online ? 'ready' as const : 'watch' as const,
    },
    {
      label: 'Trip records',
      value: bookings.length > 0 || isDriveTrip ? 'Usable' : 'Missing',
      detail: bookings.length > 0 ? `${bookings.length} reservation${bookings.length === 1 ? '' : 's'} connected.` : isDriveTrip ? 'Drive trips can start with route details.' : 'Add reservations before relying on timeline guidance.',
      icon: bookings.length > 0 || isDriveTrip ? CheckCircle2 : AlertTriangle,
      tone: bookings.length > 0 || isDriveTrip ? 'ready' as const : 'setup' as const,
    },
    {
      label: 'Movement',
      value: hasReliableMovement ? 'Ready' : 'Needs route',
      detail: hasReliableMovement ? 'RT2RP has enough movement context to guide the next step.' : 'Add flight, train, car, or drive destination details.',
      icon: hasReliableMovement ? Route : MapPin,
      tone: hasReliableMovement ? 'ready' as const : 'setup' as const,
    },
    {
      label: 'Weather watch',
      value: weatherForecast.length > 0 ? 'Available' : 'Pending',
      detail: weatherForecast.length > 0 ? 'Forecast context is attached to the command board.' : 'Open Weather to refresh trip conditions.',
      icon: CloudSun,
      tone: weatherForecast.length > 0 ? 'ready' as const : 'setup' as const,
    },
    {
      label: 'Alerts',
      value: alerts.length > 0 ? `${alerts.length} active` : 'Clear',
      detail: alerts.length > 0 ? 'Review alerts before you move.' : 'No active alert is blocking the current plan.',
      icon: alerts.length > 0 ? AlertTriangle : ShieldCheck,
      tone: alerts.length > 0 ? 'watch' as const : 'ready' as const,
    },
  ];
  const nextBestAction = primaryAlert
    ? { label: primaryAlert.actionLabel || 'Review alert', href: primaryAlert.actionUrl || `/trip/${tripId}?tab=alerts` }
    : !hasReliableMovement
      ? { label: isDriveTrip ? 'Review route' : 'Add travel record', href: isDriveTrip ? `/trip/${tripId}/drive` : `/trip/${tripId}?tab=bookings` }
      : weatherForecast.length === 0
        ? { label: 'Refresh weather', href: `/trip/${tripId}?tab=weather` }
        : missingExpenses
          ? { label: 'Capture receipt', href: `/trip/${tripId}?tab=expenses&addExpense=1` }
          : { label: 'Open timeline', href: `/trip/${tripId}?tab=flow` };

  const operatingCards = [
    {
      label: 'Right now',
      title: phase.label,
      detail: phase.detail,
      icon: phase.tone === 'active' ? Route : phase.tone === 'complete' ? CheckCircle2 : CalendarClock,
      tone: phase.tone,
    },
    {
      label: 'Next move',
      title: nextStop.nextStop?.displayName || (isDriveTrip ? `Review route to ${routeDestinationLabel(trip)}` : missingBookings ? 'Add your first record' : 'Timeline ready'),
      detail: nextStop.nextStop
        ? formatDateTime(nextStop.nextStop.eventLocalDate, nextStop.nextStop.eventLocalTime)
        : isDriveTrip
          ? 'Driving Mode is ready for route, stops, fuel, and weather review'
          : missingBookings
            ? 'Flights, lodging, drive, train, activity, or work stop'
            : 'No timed action is currently due',
      icon: MapPin,
      tone: nextStop.nextStop || isDriveTrip ? 'active' : 'setup',
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
    active: 'border-primary/25 bg-primary/8',
    setup: 'border-amber-500/25 bg-amber-500/8',
    complete: 'border-border/55 bg-card/68',
  };

  const panelBase = 'rt-command-tile group relative overflow-hidden rounded-2xl border border-border/45 bg-card/74 p-4 text-left shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:border-primary/35 hover:shadow-elevation-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45';
  const drillCue = (
    <span className="mt-4 inline-flex items-center text-xs font-semibold text-primary">
      Open details
      <ArrowRight className="ml-1 h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
    </span>
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as DashboardPanelId[];
      const valid = parsed.filter((id): id is DashboardPanelId => DEFAULT_PANEL_ORDER.includes(id as DashboardPanelId));
      const merged = [...valid, ...DEFAULT_PANEL_ORDER.filter((id) => !valid.includes(id))];
      setPanelOrder(merged);
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(panelOrder));
  }, [panelOrder, storageKey]);

  const panelPosition = (id: DashboardPanelId) => {
    const index = panelOrder.indexOf(id);
    return index === -1 ? DEFAULT_PANEL_ORDER.indexOf(id) : index;
  };

  const movePanel = (target: DashboardPanelId) => {
    if (!draggingPanel || draggingPanel === target) return;
    setPanelOrder((current) => {
      const withoutDragged = current.filter((id) => id !== draggingPanel);
      const targetIndex = withoutDragged.indexOf(target);
      const next = [...withoutDragged];
      next.splice(targetIndex === -1 ? next.length : targetIndex, 0, draggingPanel);
      return next;
    });
  };

  const dragHandlers = (id: DashboardPanelId) => ({
    draggable: true,
    onDragStart: (event: DragEvent<HTMLDivElement>) => {
      setDraggingPanel(id);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', id);
    },
    onDragOver: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    },
    onDrop: (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      movePanel(id);
      setDraggingPanel(null);
    },
    onDragEnd: () => setDraggingPanel(null),
  });

  return (
    <section className="rt-command-panel">
      <div className="rt-panel-body space-y-4">
        {primaryAlert && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-destructive">Needs attention</p>
                  <p className="mt-1 text-sm font-bold text-foreground">{primaryAlert.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{primaryAlert.message}</p>
                </div>
              </div>
              {primaryAlert.actionUrl && (
                <Button asChild size="sm" className="rt-primary-action shrink-0">
                  <Link to={primaryAlert.actionUrl}>{primaryAlert.actionLabel || 'Review'}</Link>
                </Button>
              )}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border/45 bg-card/72 p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="rt-muted-label">60-second trust check</p>
              <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground">What RT2RP can verify right now</h3>
              <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                This board only claims what it can see from your trip records, route context, weather snapshots, alert layer, and connection state.
              </p>
            </div>
            <Button asChild size="sm" className="rt-primary-action h-9 shrink-0 px-4">
              <Link to={nextBestAction.href}>
                {nextBestAction.label}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {trustSignals.map((signal) => {
              const Icon = signal.icon;
              return (
                <div key={signal.label} className={cn('rounded-xl border p-3', trustToneClass(signal.tone))}>
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/45 text-primary">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{signal.label}</p>
                      <p className="mt-0.5 truncate text-sm font-bold text-foreground">{signal.value}</p>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{signal.detail}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rt-command-hero">
          <div className="relative z-10 min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-500 dark:text-brand-champagne">
              Chaos to Clarity
              {!online && (
                <>
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  Offline mode
                </>
              )}
            </div>
            <h2 className="mt-4 max-w-2xl text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              You are in command. RT2RP shows what changed and what needs action.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              The mosaic keeps the trip organized around the next decision: alerts, movement, weather, airport context, lodging, spend, and timeline.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {isDriveTrip && (
                <Button asChild className="rt-primary-action h-10 px-4">
                  <Link to={`/trip/${tripId}/drive`}>
                    <Car className="mr-2 h-4 w-4" />
                    Driving Mode
                  </Link>
                </Button>
              )}
              <Button variant="outline" className="rt-secondary-action h-10 px-4" onClick={onExplore} disabled={!onExplore}>
                <Compass className="mr-2 h-4 w-4" />
                Places nearby
              </Button>
              <Button asChild variant="outline" className="rt-secondary-action h-10 px-4">
                <Link to={`/trip/${tripId}?tab=expenses&addExpense=1`}>
                  <ReceiptText className="mr-2 h-4 w-4" />
                  Add receipt
                </Link>
              </Button>
            </div>
          </div>

          <div className="relative z-10 rounded-2xl border border-border/50 bg-card/72 p-4 shadow-sm backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="rt-muted-label">Trip readiness</p>
                <p className="mt-1 text-3xl font-bold leading-none text-foreground">{score.score}%</p>
              </div>
              <span className={cn('rt-icon-tile', score.score >= 85 ? 'text-emerald-500' : score.score >= 65 ? 'text-amber-500' : 'text-destructive')}>
                <Sparkles className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">{score.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{score.detail}</p>
            {!online && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-muted-foreground">
                <WifiOff className="h-3.5 w-3.5 text-amber-500" />
                <span>Showing cached trip context until connection returns.</span>
              </div>
            )}
          </div>
        </div>

        <div className="rt-dashboard-grid">
          <div
            className={cn('rt-dashboard-tile xl:col-span-4', draggingPanel === 'weather' && 'opacity-65')}
            style={{ order: panelPosition('weather') }}
            {...dragHandlers('weather')}
          >
          <Link
            to={`/trip/${tripId}?tab=weather`}
            className={cn(panelBase, 'block h-full min-h-[178px]')}
            aria-label="Open weather details"
          >
            <span className="rt-dashboard-grip" aria-hidden="true"><GripVertical className="h-3.5 w-3.5" /></span>
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/70 via-amber-400/60 to-transparent" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="rt-muted-label">Weather</p>
                <h3 className="mt-1 text-lg font-bold text-foreground">
                  {currentWeather ? `${conditionLabel(currentWeather.condition)} at ${routeDestinationLabel(trip)}` : 'Forecast not loaded'}
                </h3>
              </div>
              <span className="rt-icon-tile text-primary"><CloudSun className="h-4 w-4" /></span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {currentWeather
                ? `${Math.round(currentWeather.high)}° / ${Math.round(currentWeather.low)}°${currentWeather.unit}${currentWeather.precipChance ? ` · ${currentWeather.precipChance}% precip` : ''}`
                : 'Open Weather to refresh the conditions RT2RP should watch for this trip.'}
            </p>
            <div className="mt-4 grid grid-cols-5 gap-1.5">
              {weatherForecast.length > 0 ? weatherForecast.map((day) => (
                <div key={`${day.dateISO}-${day.locationId}`} className="rounded-xl border border-border/35 bg-background/45 px-2 py-2 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{dayLabel(day.dateISO)}</p>
                  <p className="mt-1 text-sm font-bold text-foreground">{Math.round(day.high)}°</p>
                  <p className="text-[10px] text-muted-foreground">{conditionLabel(day.condition)}</p>
                </div>
              )) : Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="rounded-xl border border-dashed border-border/35 bg-background/35 px-2 py-5" />
              ))}
            </div>
            {drillCue}
          </Link>
          </div>

          <div
            className={cn('rt-dashboard-tile xl:col-span-5 xl:row-span-2', draggingPanel === 'flight' && 'opacity-65')}
            style={{ order: panelPosition('flight') }}
            {...dragHandlers('flight')}
          >
          <button
            type="button"
            onClick={() => nextFlight ? onDrillThrough?.({ tab: 'bookings', recordId: nextFlight.id }) : onDrillThrough?.({ tab: 'bookings' })}
            className={cn(panelBase, 'h-full min-h-[300px] w-full cursor-pointer')}
            aria-label="Open flight details"
          >
            <span className="rt-dashboard-grip" aria-hidden="true"><GripVertical className="h-3.5 w-3.5" /></span>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="rt-muted-label">Flight</p>
                <h3 className="mt-1 text-lg font-bold text-foreground">
                  {nextFlight ? `${nextFlight.departure_airport_code || 'Origin'} to ${nextFlight.arrival_airport_code || 'Destination'}` : 'No flight record'}
                </h3>
              </div>
              <span className="rt-icon-tile text-primary"><Plane className="h-4 w-4" /></span>
            </div>
            <FlightRouteGraphic booking={nextFlight} />
            <p className="text-sm font-semibold text-foreground">
              {nextFlight ? `${nextFlight.airline || nextFlight.vendor_name || 'Flight'}${nextFlight.confirmation_number ? ` · ${nextFlight.confirmation_number}` : ''}` : 'Add flight details once booked.'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {nextFlight ? shortDateTime(nextFlight.start_datetime) : 'Add the flight once booked. RT2RP will attach airport, confirmation, and traveler details here.'}
            </p>
            {drillCue}
          </button>
          </div>

          <div
            className={cn('rt-dashboard-tile xl:col-span-3', draggingPanel === 'spend' && 'opacity-65')}
            style={{ order: panelPosition('spend') }}
            {...dragHandlers('spend')}
          >
          <Link
            to={`/trip/${tripId}?tab=expenses`}
            className={cn(panelBase, 'block h-full min-h-[178px]')}
            aria-label="Open spend details"
          >
            <span className="rt-dashboard-grip" aria-hidden="true"><GripVertical className="h-3.5 w-3.5" /></span>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="rt-muted-label">Spend</p>
                <h3 className="mt-1 text-3xl font-bold leading-none text-foreground">{formatMoney(expenseTotal)}</h3>
              </div>
              <span className="rt-icon-tile text-primary"><WalletCards className="h-4 w-4" /></span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {latestExpense
                ? `Last item: ${latestExpense.description || latestExpense.category} · ${formatMoney(Number(latestExpense.my_share || latestExpense.amount || 0))}`
                : 'No receipts captured yet. RT2RP is ready when the first charge happens.'}
            </p>
            <div className="mt-4 rounded-xl border border-border/35 bg-background/45 px-3 py-3">
              <p className="text-xs text-muted-foreground">{expenses.length} receipt{expenses.length === 1 ? '' : 's'} saved</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{missingExpenses ? 'Ready to capture' : 'Spend is organized'}</p>
            </div>
            {drillCue}
          </Link>
          </div>

          <div
            className={cn('rt-dashboard-tile xl:col-span-4', draggingPanel === 'movement' && 'opacity-65')}
            style={{ order: panelPosition('movement') }}
            {...dragHandlers('movement')}
          >
          <Link
            to={isDriveTrip ? `/trip/${tripId}/drive` : `/trip/${tripId}?tab=ops`}
            className={cn(panelBase, 'block h-full min-h-[200px]')}
            aria-label={isDriveTrip ? 'Open Driving Mode' : 'Open movement details'}
          >
            <span className="rt-dashboard-grip" aria-hidden="true"><GripVertical className="h-3.5 w-3.5" /></span>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="rt-muted-label">{isDriveTrip ? 'Driving' : 'Movement'}</p>
                <h3 className="mt-1 text-lg font-bold text-foreground">{operatingCards[1].title}</h3>
              </div>
              <span className="rt-icon-tile text-primary">{isDriveTrip ? <Car className="h-4 w-4" /> : <Route className="h-4 w-4" />}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{operatingCards[1].detail}</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <span className="rounded-xl border border-border/35 bg-background/45 px-2 py-2 text-center">Route</span>
              <span className="rounded-xl border border-border/35 bg-background/45 px-2 py-2 text-center">Stops</span>
              <span className="rounded-xl border border-border/35 bg-background/45 px-2 py-2 text-center">Watch</span>
            </div>
            {drillCue}
          </Link>
          </div>

          <div
            className={cn('rt-dashboard-tile xl:col-span-5', draggingPanel === 'timeline' && 'opacity-65')}
            style={{ order: panelPosition('timeline') }}
            {...dragHandlers('timeline')}
          >
          <Link
            to={`/trip/${tripId}?tab=flow`}
            className={cn(panelBase, 'block h-full min-h-[200px]')}
            aria-label="Open full timeline"
          >
            <span className="rt-dashboard-grip" aria-hidden="true"><GripVertical className="h-3.5 w-3.5" /></span>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="rt-muted-label">Timeline</p>
                <h3 className="mt-1 text-lg font-bold text-foreground">{canonicalState.timelineEvents.length} operating events</h3>
              </div>
              <span className="rt-icon-tile text-primary"><CalendarClock className="h-4 w-4" /></span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {nextStop.nextStop ? `Next: ${nextStop.nextStop.displayName}` : 'No timed action is currently due.'}
            </p>
            <div className="mt-4 space-y-2">
              {operatingCards.slice(0, 3).map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className={cn('flex items-center gap-2 rounded-xl border px-3 py-2', toneClasses[card.tone])}>
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span className="truncate text-xs font-medium text-foreground">{card.title}</span>
                  </div>
                );
              })}
            </div>
            {drillCue}
          </Link>
          </div>

          <div
            className={cn('rt-dashboard-tile xl:col-span-3', draggingPanel === 'places' && 'opacity-65')}
            style={{ order: panelPosition('places') }}
            {...dragHandlers('places')}
          >
          <button
            type="button"
            onClick={onExplore}
            disabled={!onExplore}
            className={cn(panelBase, 'h-full min-h-[200px] w-full cursor-pointer disabled:pointer-events-none disabled:opacity-70')}
            aria-label="Open nearby arrival details"
          >
            <span className="rt-dashboard-grip" aria-hidden="true"><GripVertical className="h-3.5 w-3.5" /></span>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="rt-muted-label">Arrival</p>
                <h3 className="mt-1 text-lg font-bold text-foreground">{stays.length > 0 ? `${stays.length} stay${stays.length === 1 ? '' : 's'} organized` : 'Local context'}</h3>
              </div>
              <span className="rt-icon-tile text-primary"><Building2 className="h-4 w-4" /></span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Food, services, nearby context, lodging addresses, and useful arrival details stay close when the trip changes.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['Food', 'Services', 'Arrival', 'Maps'].map((label) => (
                <span key={label} className="rounded-full border border-border/40 bg-background/45 px-2.5 py-1 text-xs text-muted-foreground">{label}</span>
              ))}
            </div>
            {drillCue}
          </button>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <div className="rt-kpi-panel p-3">
            <p className="rt-muted-label">Reservations</p>
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
