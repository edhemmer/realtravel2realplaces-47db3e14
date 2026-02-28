/**
 * v4.0.1: Drive Mode Screen
 *
 * Full-screen execution view optimized for phone-mount driving.
 * All data from driveIntelligenceHelper — no local drive logic.
 */

import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTrip } from '@/hooks/useTrips';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';
import { useParking } from '@/hooks/useParking';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Navigation,
  Fuel,
  CloudRain,
  CircleDollarSign,
  ParkingCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Car,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  getActiveDriveSegment,
  getNavigationTarget,
  getDriveAlerts,
  getParkingStatusFromRecords,
  getFuelProjection,
  type DriveAlert,
  type DriveAlertType,
  type DriveAlertSeverity,
} from '@/lib/driveIntelligenceHelper';
import { getNextStopFromCanonicalTimeline } from '@/lib/canonicalNextStop';
import { getLocalNowString } from '@/lib/canonicalNextStop';
import { resolveCanonicalNavigation, openCanonicalNav } from '@/lib/canonicalNavigation';
import { BrandedPageLoader } from '@/components/ui/premium-loading';

// ============================================================================
// ALERT ICON + COLOR MAPPING
// ============================================================================

const ALERT_ICON: Record<DriveAlertType, typeof Fuel> = {
  TOLL: CircleDollarSign,
  FUEL: Fuel,
  WEATHER: CloudRain,
  TRAFFIC: AlertTriangle,
  PARKING: ParkingCircle,
};

function alertColorClass(severity: DriveAlertSeverity): string {
  switch (severity) {
    case 'critical': return 'bg-destructive/15 text-destructive border-destructive/30';
    case 'warning': return 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30';
    case 'info': return 'bg-primary/10 text-primary border-primary/20';
  }
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function DriveMode() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: trip, isLoading: tripLoading } = useTrip(tripId || '');
  const {
    state: canonicalState,
    isLoading: stateLoading,
    weatherByKey,
  } = useCanonicalTripState(tripId || '', trip || null);
  const { data: parkingList = [] } = useParking(tripId || '');
  const { data: userProfile } = useUserProfile();

  const now = useMemo(() => new Date(), []);
  const nowLocal = getLocalNowString();

  // Drive intelligence
  const activeSegment = useMemo(
    () => getActiveDriveSegment(canonicalState, now),
    [canonicalState, now],
  );

  const navTarget = useMemo(
    () => getNavigationTarget(canonicalState, activeSegment),
    [canonicalState, activeSegment],
  );

  const alerts = useMemo(
    () =>
      getDriveAlerts(canonicalState, activeSegment, {
        weatherByKey,
        userVehicleProfile: userProfile
          ? { avgMilesPerTank: userProfile.avg_miles_per_tank }
          : undefined,
        parkingList,
        nowLocal,
      }),
    [canonicalState, activeSegment, weatherByKey, userProfile, parkingList, nowLocal],
  );

  const parkingStatus = useMemo(
    () => getParkingStatusFromRecords(parkingList, nowLocal),
    [parkingList, nowLocal],
  );

  const nextStop = useMemo(
    () => getNextStopFromCanonicalTimeline(canonicalState, nowLocal),
    [canonicalState, nowLocal],
  );

  const fuelProjection = useMemo(
    () =>
      getFuelProjection(canonicalState, activeSegment, {
        avgMilesPerTank: userProfile?.avg_miles_per_tank ?? undefined,
      }),
    [canonicalState, activeSegment, userProfile],
  );

  // Navigate handler
  const handleNavigate = () => {
    if (!navTarget) return;
    const result = resolveCanonicalNavigation({
      address: navTarget.addressString,
      lat: navTarget.lat,
      lng: navTarget.lng,
    });
    if (result) openCanonicalNav(result);
  };

  // Loading
  if (tripLoading || stateLoading) {
    return (
      <Layout>
        <BrandedPageLoader />
      </Layout>
    );
  }

  if (!trip) {
    return (
      <Layout>
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">Trip not found</h2>
          <Button asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const hasSegment = activeSegment !== null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Compact header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border/60 px-4 py-3 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon" className="shrink-0 h-9 w-9">
          <Link to={`/trip/${tripId}`}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{trip.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {format(new Date(trip.start_date + 'T00:00:00'), 'MMM d')} – {format(new Date(trip.end_date + 'T00:00:00'), 'MMM d')}
          </p>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0 gap-1">
          <Car className="w-3 h-3" />
          Drive
        </Badge>
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 py-5 space-y-4 max-w-lg mx-auto w-full">
        {!hasSegment ? (
          /* No drive segment */
          <div className="flex flex-col items-center justify-center text-center py-16 space-y-3">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <Car className="w-7 h-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">No drive segment detected</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              There's no active or upcoming drive for this trip right now.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to={`/trip/${tripId}`}>Back to Trip</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Primary drive card */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Driving to
                  </p>
                  <h2 className="text-xl font-bold leading-snug mt-0.5 break-words">
                    {activeSegment.label}
                  </h2>
                  {navTarget && (
                    <p className="text-xs text-muted-foreground mt-1 break-words">
                      {navTarget.addressString}
                    </p>
                  )}
                  {fuelProjection.fuelStatus === 'REFUEL_RECOMMENDED' && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1.5 flex items-center gap-1">
                      <Fuel className="w-3 h-3" />
                      {fuelProjection.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Navigate button */}
              <Button
                onClick={handleNavigate}
                disabled={!navTarget}
                className="w-full h-14 text-lg font-semibold gap-2"
                size="lg"
              >
                <Navigation className="w-5 h-5" />
                {navTarget ? 'Start Navigation' : 'Navigation target missing'}
              </Button>
              {!navTarget && (
                <p className="text-xs text-muted-foreground text-center">
                  Check trip details to add a destination address.
                </p>
              )}
            </div>

            {/* Route awareness alerts (max 3) */}
            {alerts.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {alerts.map((alert, i) => {
                  const Icon = ALERT_ICON[alert.type] ?? AlertTriangle;
                  return (
                    <div
                      key={i}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${alertColorClass(alert.severity)}`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[160px]">{alert.message}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Next stop preview */}
            {nextStop.nextStop && (
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Next</p>
                  <p className="text-sm font-medium truncate">
                    {nextStop.nextStop.displayName}
                    {nextStop.nextStop.eventLocalTime && (
                      <span className="text-muted-foreground font-normal ml-1">
                        at {nextStop.nextStop.eventLocalTime}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Parking timer */}
            {parkingStatus.status !== 'NONE' && (
              <div
                className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${
                  parkingStatus.status === 'NEAR_EXPIRY'
                    ? 'border-orange-500/40 bg-orange-500/10'
                    : 'border-border bg-muted/30'
                }`}
              >
                <ParkingCircle
                  className={`w-4 h-4 shrink-0 ${
                    parkingStatus.status === 'NEAR_EXPIRY'
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-muted-foreground'
                  }`}
                />
                <p
                  className={`text-sm ${
                    parkingStatus.status === 'NEAR_EXPIRY'
                      ? 'font-bold text-orange-700 dark:text-orange-300'
                      : 'text-foreground'
                  }`}
                >
                  {parkingStatus.remainingMinutes != null
                    ? `Parking expires in ${parkingStatus.remainingMinutes} min`
                    : 'Parking active'}
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
