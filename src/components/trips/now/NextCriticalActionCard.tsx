/**
 * v3.8.15: NextCriticalActionCard
 *
 * Shows the earliest upcoming event with countdown + single primary action.
 * v3.8.15: Accepts optional resolvedNextAction from execution intelligence layer.
 * When present, uses it for context labels, countdown, and navigation targets.
 * Falls back to legacy useNextStop when resolvedNextAction is null.
 *
 * Uses canonical next stop engine — no Date() logic.
 */

import { useNextStop, type NextStopEvent } from '@/hooks/useNextStop';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigation, Clock, CheckCircle2, CalendarClock, Sparkles, AlertTriangle, Eye, Car } from 'lucide-react';
import { resolveCanonicalNavigation, openCanonicalNav } from '@/lib/canonicalNavigation';
import { getLocalNowString } from '@/lib/canonicalNextStop';
import { resolveCanonicalLifecycle } from '@/lib/canonicalTimePolicy';
import { useMemo } from 'react';
import type { NextActionCardModel, BufferStatusResult } from '@/lib/execution';
import type { DriveSegment, DriveNavigationTarget } from '@/lib/driveIntelligenceHelper';

interface NextCriticalActionCardProps {
  tripId: string;
  trip: import('@/types/database').Trip;
  /** v3.8.15: Pre-resolved next action from execution intelligence layer */
  resolvedNextAction?: NextActionCardModel | null;
  /** v3.8.17: Buffer status from buffer intelligence layer */
  bufferStatus?: BufferStatusResult | null;
  /** v4.0.3: Active drive segment from driveIntelligence */
  activeDriveSegment?: DriveSegment | null;
  /** v4.0.3: Navigation target for the active drive segment */
  driveNavTarget?: DriveNavigationTarget | null;
}

/**
 * Format "YYYY-MM-DD" to "Feb 11"
 */
function formatDateShort(dateStr: string): string {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = parseInt(dateStr.substring(5, 7), 10);
  const day = parseInt(dateStr.substring(8, 10), 10);
  return `${months[month - 1]} ${day}`;
}

/**
 * Compute a simple countdown string from now to the event.
 */
function computeCountdown(event: NextStopEvent): string {
  const nowStr = getLocalNowString();
  const nowDate = nowStr.substring(0, 10);
  const eventDate = event.eventLocalDate;
  const eventTime = event.eventLocalTime;

  if (eventDate > nowDate) {
    return `${formatDateShort(eventDate)} at ${formatTime12h(eventTime)}`;
  }

  const nowTime = nowStr.substring(11, 16);
  const nowMins = parseInt(nowTime.substring(0, 2)) * 60 + parseInt(nowTime.substring(3, 5));
  const eventMins = parseInt(eventTime.substring(0, 2)) * 60 + parseInt(eventTime.substring(3, 5));
  const diffMins = eventMins - nowMins;

  if (diffMins <= 0) return 'Now';
  if (diffMins < 60) return `In ${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `In ${hours}h ${mins}m` : `In ${hours}h`;
}

function formatTime12h(time: string): string {
  const h = parseInt(time.substring(0, 2));
  const m = time.substring(3, 5);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m} ${ampm}`;
}

/**
 * v3.9.4: Derive context label from canonical event type.
 * No new logic — just maps existing type strings to user-facing labels.
 */
function resolveContextLabel(eventType: string): string | null {
  switch (eventType) {
    case 'flight':
    case 'flight_departure':
      return 'DEPARTURE TODAY';
    case 'hotel_checkin':
      return 'LODGING CHECK-IN';
    case 'hotel_checkout':
      return 'LODGING CHECKOUT';
    case 'rental_pickup':
      return 'RENTAL PICKUP';
    case 'rental_dropoff':
    case 'rental_return':
    case 'car_return':
      return 'RENTAL RETURN';
    case 'parking_end':
    case 'parking_expiration':
      return 'PARKING EXPIRING';
    case 'activity_start':
      return 'ARRIVING SOON';
    case 'transport_departure':
      return 'DRIVE START';
    default:
      return null;
  }
}

/**
 * v3.9.4: Derive raw time microtext from event type + raw time.
 * Copies parsed time string verbatim — no conversion.
 */
function resolveTimeMicrotext(eventType: string, rawTime: string): string {
  switch (eventType) {
    case 'flight':
    case 'flight_departure':
      return `Departs ${rawTime}`;
    case 'hotel_checkin':
      return `Check-in ${rawTime}`;
    case 'hotel_checkout':
      return `Checkout ${rawTime}`;
    case 'rental_pickup':
      return `Pickup ${rawTime}`;
    case 'rental_dropoff':
    case 'rental_return':
    case 'car_return':
      return `Return ${rawTime}`;
    case 'parking_end':
    case 'parking_expiration':
      return `Expires ${rawTime}`;
    case 'activity_start':
      return `Starts ${rawTime}`;
    case 'transport_departure':
      return `Departs ${rawTime}`;
    default:
      return rawTime;
  }
}

/**
 * v3.9.4: Resolve button variant and classes from event type.
 * Blue = Navigate, Orange = Acknowledge (parking), consistent tokens.
 */
function resolveButtonStyle(eventType: string, hasLocation: boolean): { className: string; label: string } {
  if (!hasLocation) {
    return { className: 'w-full h-12 rounded-xl font-semibold shadow-sm mt-3', label: 'No location available' };
  }
  // Parking expiring → orange acknowledge
  if (eventType === 'parking_end' || eventType === 'parking_expiration') {
    return {
      className: 'w-full h-12 rounded-xl font-semibold shadow-sm mt-3 bg-orange-500 hover:bg-orange-600 text-white active:scale-[0.98]',
      label: 'Navigate',
    };
  }
  // Default → blue navigate (primary token)
  return {
    className: 'w-full h-12 rounded-xl font-semibold shadow-sm mt-3 bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.98]',
    label: 'Navigate',
  };
}

export function NextCriticalActionCard({ tripId, trip, resolvedNextAction, bufferStatus, activeDriveSegment, driveNavTarget }: NextCriticalActionCardProps) {
  const navigate = useNavigate();
  const { state } = useCanonicalTripState(tripId, trip);
  const { nextStop } = useNextStop(state);

  const lifecycle = useMemo(
    () => resolveCanonicalLifecycle(trip.start_date, trip.end_date),
    [trip.start_date, trip.end_date]
  );

  const countdown = useMemo(() => {
    if (!nextStop) return null;
    return computeCountdown(nextStop);
  }, [nextStop]);

  // v3.8.15: If resolvedNextAction is provided and has data, render it
  if (resolvedNextAction) {
    const ra = resolvedNextAction;
    const hasTarget = ra.actionType === 'NAVIGATE' && ra.target;

    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/8 to-background shadow-md">
        <CardContent className="py-5 px-4">
          {/* v3.8.15: Context label from execution resolver */}
          {ra.contextLabel && (
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-1">
              {ra.contextLabel}
            </p>
          )}
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Next Up
            </span>
          </div>
          <p className="text-base font-bold text-foreground truncate leading-snug">
            {ra.title}
          </p>
          {ra.subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {ra.subtitle}
            </p>
          )}
          {/* v3.8.15: Raw time microtext — verbatim from confirmation */}
          {ra.rawTimeText && (
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              {resolveTimeMicrotext(ra.sourceWindow.eventType === 'DEPARTURE' ? 'flight_departure' : 
                ra.sourceWindow.eventType === 'CHECKIN' ? 'hotel_checkin' :
                ra.sourceWindow.eventType === 'CHECKOUT' ? 'hotel_checkout' :
                ra.sourceWindow.eventType === 'PICKUP' ? 'rental_pickup' :
                ra.sourceWindow.eventType === 'RETURN' ? 'rental_dropoff' :
                ra.sourceWindow.eventType === 'EXPIRE' ? 'parking_expiration' :
                'activity_start', ra.rawTimeText)}
            </p>
          )}
          {/* v3.8.15: Countdown from resolver (only when minutesUntil available) */}
          {ra.countdown && (
            <p className="text-sm font-medium text-primary mt-0.5">
              {ra.countdown}
            </p>
          )}
          {/* v3.8.17: Buffer intelligence badge */}
          {bufferStatus && bufferStatus.status !== 'NOT_READY' && (
            <div className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 ${
              bufferStatus.status === 'COMFORTABLE' 
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
                : bufferStatus.status === 'TIGHT'
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                : 'bg-destructive/10 text-destructive'
            }`}>
              {bufferStatus.status === 'HIGH_RISK' && <AlertTriangle className="w-3 h-3" />}
              {bufferStatus.uiLabel}
            </div>
          )}
          {/* v3.8.15: Action button — NAVIGATE or VIEW_DETAILS */}
          {ra.actionType === 'NAVIGATE' && hasTarget ? (
            <Button
              variant="default"
              className="w-full h-12 rounded-xl font-semibold shadow-sm mt-3 bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.98]"
              onClick={() => {
                if (ra.target) {
                  window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ra.target)}`, '_blank');
                }
              }}
            >
              <Navigation className="w-4 h-4" />
              Navigate
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl font-semibold shadow-sm mt-3"
              onClick={() => {
                // VIEW_DETAILS — scroll/navigate to booking detail
              }}
            >
              <Eye className="w-4 h-4" />
              View Details
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // ── Legacy fallback: use nextStop from canonical engine ──

  // v4.0.3: If no nextStop and no resolvedNextAction, but active drive segment exists,
  // show a Drive Mode variant as the primary card.
  if (!nextStop && activeDriveSegment && driveNavTarget) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/8 to-background shadow-md">
        <CardContent className="py-5 px-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-1">
            DRIVE MODE
          </p>
          <div className="flex items-center gap-1.5 mb-1">
            <Car className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              Next Drive
            </span>
          </div>
          <p className="text-base font-bold text-foreground truncate leading-snug">
            Drive to {driveNavTarget.label}
          </p>
          {activeDriveSegment.timeStr && (
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              at {activeDriveSegment.timeStr}
            </p>
          )}
          <Button
            variant="default"
            className="w-full h-12 rounded-xl font-semibold shadow-sm mt-3 bg-primary hover:bg-primary/90 text-primary-foreground active:scale-[0.98]"
            onClick={() => navigate(`/trip/${tripId}/drive`)}
          >
            <Car className="w-4 h-4" />
            Open Drive Mode
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No next stop — choose message based on canonical lifecycle
  if (!nextStop) {
    if (lifecycle.phase === 'COMPLETED') {
      return (
        <Card className="border-border/30 bg-muted/20 shadow-none">
          <CardContent className="py-4 flex flex-col items-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-success" />
            <p className="text-sm font-semibold text-foreground">Trip Complete</p>
            <p className="text-xs text-muted-foreground">No more upcoming events.</p>
          </CardContent>
        </Card>
      );
    }

    if (lifecycle.phase === 'UPCOMING') {
      return (
        <Card className="border-border/30 bg-muted/20 shadow-none">
          <CardContent className="py-4 flex flex-col items-center gap-2">
            <CalendarClock className="w-8 h-8 text-blue-500" />
            <p className="text-sm font-semibold text-foreground">Trip starts in {lifecycle.daysUntilStart} days</p>
            <p className="text-xs text-muted-foreground">Add bookings to build your timeline.</p>
          </CardContent>
        </Card>
      );
    }

    if (lifecycle.substate === 'PRE_TRIP') {
      return (
        <Card className="border-border/30 bg-muted/20 shadow-none">
          <CardContent className="py-4 flex flex-col items-center gap-2">
            <Sparkles className="w-8 h-8 text-primary" />
            <p className="text-sm font-semibold text-foreground">
              {lifecycle.daysUntilStart > 0
                ? `Trip starts in ${lifecycle.daysUntilStart} days`
                : 'Trip starts today'}
            </p>
            <p className="text-xs text-muted-foreground">Add bookings to see your next event.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-border/30 bg-muted/20 shadow-none">
        <CardContent className="py-4 flex flex-col items-center gap-2">
          <CheckCircle2 className="w-8 h-8 text-success" />
          <p className="text-sm font-semibold text-foreground">All caught up</p>
          <p className="text-xs text-muted-foreground">No more events scheduled.</p>
        </CardContent>
      </Card>
    );
  }

  const canonicalNav = resolveCanonicalNavigation({
    address: nextStop.address,
    locationLabel: nextStop.locationLabel,
    bookingType: nextStop.type === 'flight' || nextStop.type === 'flight_departure' ? 'flight' : undefined,
    departureAirportCode: (nextStop as any).departureAirportCode,
    arrivalAirportCode: (nextStop as any).arrivalAirportCode,
  });
  const hasLocation = !!canonicalNav;
  const contextLabel = resolveContextLabel(nextStop.type);
  const timeMicrotext = nextStop.eventLocalTime
    ? resolveTimeMicrotext(nextStop.type, nextStop.eventLocalTime)
    : null;
  const buttonStyle = resolveButtonStyle(nextStop.type, hasLocation);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/8 to-background shadow-md">
      <CardContent className="py-5 px-4">
        {/* v3.9.4: Context label */}
        {contextLabel && (
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 mb-1">
            {contextLabel}
          </p>
        )}
        <div className="flex items-center gap-1.5 mb-1">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            Next Up
          </span>
        </div>
        <p className="text-base font-bold text-foreground truncate leading-snug">
          {nextStop.displayName}
        </p>
        {/* v3.9.4: Raw time microtext — verbatim parsed time */}
        {timeMicrotext && (
          <p className="text-xs font-medium text-muted-foreground mt-0.5">
            {timeMicrotext}
          </p>
        )}
        <p className="text-sm font-medium text-primary mt-0.5">
          {countdown}
        </p>
        {nextStop.locationLabel && (
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {nextStop.locationLabel}
          </p>
        )}
        {/* v3.9.4: Enforced button color consistency */}
        <Button
          variant={hasLocation ? 'default' : 'outline'}
          disabled={!hasLocation}
          className={buttonStyle.className}
          onClick={() => {
            if (canonicalNav) openCanonicalNav(canonicalNav);
          }}
        >
          <Navigation className="w-4 h-4" />
          {buttonStyle.label}
        </Button>
      </CardContent>
    </Card>
  );
}
