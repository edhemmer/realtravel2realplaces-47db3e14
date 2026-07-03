import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTrip } from '@/hooks/useTrips';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';
import { useParking } from '@/hooks/useParking';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useDeviceLocation } from '@/hooks/useDeviceLocation';
import {
  useDriveRouteWeatherRisks,
  useOfficialDriveHazards,
  useResolvedDriveHazardCoords,
} from '@/hooks/useOfficialDriveHazards';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  AlertTriangle,
  Car,
  CircleDollarSign,
  Clock,
  CloudRain,
  ExternalLink,
  Fuel,
  Gauge,
  LocateFixed,
  Map,
  Navigation,
  ParkingCircle,
  Route,
  Satellite,
  ShieldCheck,
  Timer,
  WifiOff,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  getActiveDriveSegment,
  getNavigationTarget,
  getDriveAlerts,
  getRoutePreview,
  getTollStatus,
  getWeatherRisk,
  getParkingStatusFromRecords,
  getFuelProjection,
  type DriveAlert,
  type DriveAlertType,
  type DriveAlertSeverity,
} from '@/lib/driveIntelligenceHelper';
import { getNextStopFromCanonicalTimeline, getLocalNowString } from '@/lib/canonicalNextStop';
import { resolveCanonicalNavigation, openCanonicalNav } from '@/lib/canonicalNavigation';
import { BrandedPageLoader } from '@/components/ui/premium-loading';
import { isOnline, subscribeToNetworkChanges } from '@/lib/networkStatus';
import { openExternalUrl, openMapSearchResult } from '@/lib/native/nativeNavigation';
import {
  buildGasSearchUrl,
  resolveDriveCockpitModel,
  GAS_SEARCH_ZOOM_FOR_15_MILES,
  type DriveCockpitModel,
} from '@/lib/driveNavigationWindow';
import {
  buildRoadClosureSearchUrl,
  officialHazardDriverGuidance,
  type OfficialDriveHazardAlert,
  type RouteWeatherRisk,
} from '@/lib/driveHazardAlerts';
import { cn } from '@/lib/utils';

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

function DriveWidget({
  icon: Icon,
  label,
  value,
  tone = 'good',
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
  tone?: DriveCockpitModel['roadConditionTone'] | 'good' | 'watch';
}) {
  const toneClass =
    tone === 'danger' ? 'bg-destructive/10 text-destructive border-destructive/20'
    : tone === 'watch' ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20'
    : tone === 'offline' ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20'
    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20';

  return (
    <div className={cn('rounded-xl border p-3', toneClass)}>
      <div className="flex items-center gap-2">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="text-[10px] font-semibold uppercase opacity-80">{label}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-snug">{value}</p>
    </div>
  );
}

function MiniStatus({ icon: Icon, label, value }: { icon: typeof LocateFixed; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-muted/25 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase">{label}</span>
      </div>
      <p className="mt-1 truncate text-xs font-semibold">{value}</p>
    </div>
  );
}

function officialHazardClass(alert: OfficialDriveHazardAlert): string {
  if (alert.severity === 'critical') return 'border-destructive/35 bg-destructive/10 text-destructive';
  if (alert.severity === 'warning') return 'border-orange-500/35 bg-orange-500/10 text-orange-700 dark:text-orange-300';
  return 'border-primary/25 bg-primary/10 text-primary';
}

function routeWeatherClass(risk: RouteWeatherRisk): string {
  if (risk.severity === 'critical') return 'border-destructive/35 bg-destructive/10 text-destructive';
  if (risk.severity === 'warning') return 'border-orange-500/35 bg-orange-500/10 text-orange-700 dark:text-orange-300';
  return 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300';
}

export default function DriveMode() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: trip, isLoading: tripLoading } = useTrip(tripId || '');
  const { state: canonicalState, isLoading: stateLoading, weatherByKey } = useCanonicalTripState(tripId || '', trip || null);
  const { data: parkingList = [] } = useParking(tripId || '');
  const { data: userProfile } = useUserProfile();
  const { coords: deviceCoords, status: locationStatus, isLoading: locationLoading } = useDeviceLocation({
    highAccuracy: true,
    maximumAgeMs: 30000,
    refreshMs: 60000,
  });
  const [now, setNow] = useState(() => new Date());
  const [online, setOnline] = useState(() => isOnline());

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => subscribeToNetworkChanges(setOnline), []);

  const nowLocal = getLocalNowString();

  const activeSegment = useMemo(
    () => getActiveDriveSegment(canonicalState, now, deviceCoords),
    [canonicalState, now, deviceCoords],
  );

  const navTarget = useMemo(
    () => getNavigationTarget(canonicalState, activeSegment),
    [canonicalState, activeSegment],
  );

  const explicitDestinationCoords = useMemo(() => {
    if (navTarget?.lat == null || navTarget.lng == null) return null;
    return { lat: navTarget.lat, lng: navTarget.lng };
  }, [navTarget?.lat, navTarget?.lng]);

  const resolvedDestinationCoords = useResolvedDriveHazardCoords({
    enabled: online,
    explicitCoords: explicitDestinationCoords,
    routeAddress: navTarget?.addressString,
    city: trip?.destination_city,
    state: trip?.destination_state,
    country: trip?.destination_country,
  });

  const officialHazards = useOfficialDriveHazards({
    enabled: online,
    deviceCoords,
    destinationCoords: resolvedDestinationCoords.data ?? explicitDestinationCoords,
  });

  const routePreview = useMemo(
    () => getRoutePreview(canonicalState, activeSegment),
    [canonicalState, activeSegment],
  );

  const plannedDepartureAt = useMemo(() => {
    if (!activeSegment) return now;
    if (activeSegment.dateStr === nowLocal.substring(0, 10) && !activeSegment.timeStr) return now;
    const time = activeSegment.timeStr ?? '05:00';
    const parsed = new Date(`${activeSegment.dateStr}T${time}:00`);
    return Number.isFinite(parsed.getTime()) ? parsed : now;
  }, [activeSegment, now, nowLocal]);

  const routeWeatherRisks = useDriveRouteWeatherRisks({
    enabled: online,
    originCoords: deviceCoords,
    destinationCoords: resolvedDestinationCoords.data ?? explicitDestinationCoords,
    departureAt: plannedDepartureAt,
    durationMinutes: routePreview.durationMinutes,
  });

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

  const officialDriveAlerts = useMemo<DriveAlert[]>(
    () => (officialHazards.data ?? [])
      .filter((alert) => alert.roadRisk || alert.severity !== 'info')
      .slice(0, 2)
      .map((alert) => ({
        type: 'WEATHER',
        severity: alert.severity,
        message: alert.roadRisk
          ? `${alert.event}: ${officialHazardDriverGuidance(alert)}`
          : `${alert.event}: ${alert.headline}`,
      })),
    [officialHazards.data],
  );

  const routeWeatherDriveAlerts = useMemo<DriveAlert[]>(
    () => (routeWeatherRisks.data ?? [])
      .slice(0, 2)
      .map((risk) => ({
        type: 'WEATHER',
        severity: risk.severity,
        message: `${risk.condition.toUpperCase()} route risk: ${risk.message}`,
      })),
    [routeWeatherRisks.data],
  );

  const cockpitAlerts = useMemo(
    () => [...routeWeatherDriveAlerts, ...officialDriveAlerts, ...alerts].slice(0, 4),
    [routeWeatherDriveAlerts, officialDriveAlerts, alerts],
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

  const weatherRisk = useMemo(
    () => getWeatherRisk(canonicalState, activeSegment, weatherByKey),
    [canonicalState, activeSegment, weatherByKey],
  );

  const tollStatus = useMemo(
    () => getTollStatus(canonicalState, activeSegment),
    [canonicalState, activeSegment],
  );

  const cockpit = useMemo(
    () => resolveDriveCockpitModel({
      navTarget,
      deviceCoords,
      originAddress: trip?.origin_address,
      routePreview,
      alerts: cockpitAlerts,
      weatherRisk,
      fuelProjection,
      online,
    }),
    [navTarget, deviceCoords, trip?.origin_address, routePreview, cockpitAlerts, weatherRisk, fuelProjection, online],
  );

  const gasSearchUrl = useMemo(() => {
    if (!trip) return cockpit.gasSearchUrl;
    return buildGasSearchUrl({
      deviceCoords,
      fallbackCity: trip.destination_city,
      fallbackState: trip.destination_state,
      fallbackCountry: trip.destination_country,
    });
  }, [cockpit.gasSearchUrl, deviceCoords, trip]);

  const handleNavigate = () => {
    if (!navTarget) return;
    const result = resolveCanonicalNavigation({
      address: navTarget.addressString,
      lat: navTarget.lat,
      lng: navTarget.lng,
    });
    if (result) openCanonicalNav(result);
  };

  const handleOpenMap = () => {
    if (!cockpit.mapFallbackUrl) return;
    openExternalUrl(cockpit.mapFallbackUrl);
  };

  const handleFindGas = () => {
    openMapSearchResult({
      url: gasSearchUrl,
      query: 'gas station',
      lat: deviceCoords?.lat,
      lng: deviceCoords?.lng,
      zoom: GAS_SEARCH_ZOOM_FOR_15_MILES,
    });
  };

  const handleRoadClosureCheck = () => {
    if (!trip) return;
    openExternalUrl(buildRoadClosureSearchUrl({
      state: trip.destination_state,
      city: trip.destination_city,
      destination: navTarget?.addressString,
    }));
  };

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
        <div className="py-16 text-center">
          <h2 className="mb-2 text-xl font-semibold">Trip not found</h2>
          <Button asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const hasSegment = activeSegment !== null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-card/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-xl">
            <Link to={`/trip/${tripId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{trip.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {format(new Date(`${trip.start_date}T00:00:00`), 'MMM d')} - {format(new Date(`${trip.end_date}T00:00:00`), 'MMM d')}
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'shrink-0 gap-1 text-[10px]',
              online
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
            )}
          >
            {online ? <Satellite className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {cockpit.offlineLabel}
          </Badge>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] md:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        {!hasSegment ? (
          <div className="col-span-full flex flex-col items-center justify-center space-y-3 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Car className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">Drive Mode is standing by</h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              Add or schedule a drive segment to open route options, weather, fuel, and offline road context.
            </p>
            <Button asChild variant="outline" size="sm">
                <Link to={`/trip/${tripId}`}>Return to trip</Link>
            </Button>
          </div>
        ) : (
          <>
            <section className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/85 shadow-elevation-floating backdrop-blur-glass">
                <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(38_92%_55%),hsl(160_60%_42%))]" />
                <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/12 blur-3xl" />
                <div className="relative p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-ocean shadow-glow">
                      <Navigation className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase text-primary">Navigation window</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold leading-tight">{activeSegment.label}</h1>
                        <Badge variant="outline" className="gap-1 border-primary/25 bg-primary/10 text-[10px] text-primary">
                          <Car className="h-3 w-3" />
                          Drive ready
                        </Badge>
                      </div>
                      {navTarget && (
                        <p className="mt-1 break-words text-xs text-muted-foreground">{navTarget.addressString}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <DriveWidget icon={Gauge} label="Route" value={cockpit.routeLabel} />
                    <DriveWidget icon={ShieldCheck} label="Roads" value={cockpit.roadConditionLabel} tone={cockpit.roadConditionTone} />
                    <DriveWidget icon={CloudRain} label="Weather" value={weatherRisk.hasRisk ? weatherRisk.message : 'No drive hazard'} tone={weatherRisk.hasRisk ? 'watch' : 'good'} />
                    <DriveWidget icon={Fuel} label="Fuel" value={cockpit.fuelLabel} tone={fuelProjection.fuelStatus === 'REFUEL_RECOMMENDED' ? 'watch' : 'good'} />
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border/50 bg-card shadow-elevation-raised">
                <div className="relative aspect-[4/3] min-h-[320px] bg-muted md:aspect-[16/11]">
                  {cockpit.mapEmbedUrl ? (
                    <iframe
                      title={`Route map for ${navTarget?.label ?? activeSegment.label}`}
                      src={cockpit.mapEmbedUrl}
                      className="absolute inset-0 h-full w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
                      <Map className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium">Map target missing</p>
                      <p className="max-w-xs text-xs text-muted-foreground">Add an address or destination to this trip leg for embedded navigation.</p>
                    </div>
                  )}
                </div>
                <div className="grid gap-2 border-t border-border/50 p-3 sm:grid-cols-3">
                  <Button onClick={handleNavigate} disabled={!navTarget} className="h-12 rounded-xl font-semibold">
                    <Navigation className="mr-2 h-4 w-4" />
                    Start Drive
                  </Button>
                  <Button onClick={handleOpenMap} disabled={!cockpit.mapFallbackUrl} variant="outline" className="h-12 rounded-xl font-semibold">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Map
                  </Button>
                  <Button onClick={handleFindGas} variant="secondary" className="h-12 rounded-xl font-semibold">
                    <Fuel className="mr-2 h-4 w-4" />
                    Get Gas
                  </Button>
                </div>
              </div>
            </section>

            <aside className="space-y-3">
              {!online && (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200">
                  <div className="flex items-start gap-3">
                    <WifiOff className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Offline drive cache</p>
                      <p className="mt-1 text-xs leading-relaxed opacity-85">
                        Showing the last canonical trip snapshot. Maps handoff may need signal, but your next stop, parking, fuel guidance, and saved trip context remain visible.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-border/50 bg-card/85 p-4 shadow-elevation-raised backdrop-blur-glass">
                <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Driver tools</p>
                <div className="space-y-2">
                  <Button onClick={handleFindGas} variant="outline" className="h-11 w-full justify-start rounded-xl">
                    <Fuel className="mr-2 h-4 w-4 text-primary" />
                    Gas stations within 15 miles
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <MiniStatus icon={LocateFixed} label="Location" value={locationLoading ? 'Locating' : locationStatus === 'granted' ? 'Current' : 'Trip area'} />
                    <MiniStatus icon={Timer} label="Updated" value={format(now, 'h:mm a')} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/50 bg-card/85 p-4 shadow-elevation-raised backdrop-blur-glass">
                <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Route confidence</p>
                <div className="space-y-2">
                  <MiniStatus icon={LocateFixed} label="Origin" value={cockpit.originLabel} />
                  <MiniStatus icon={Route} label="Routing" value={cockpit.routeSourceLabel} />
                  <MiniStatus
                    icon={Satellite}
                    label="Location mode"
                    value={locationStatus === 'granted' ? 'High accuracy refresh' : 'Needs permission'}
                  />
                </div>
                {!deviceCoords && (
                  <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                    Allow location before departure for current-origin routing and nearby gas. Without it, the cockpit uses the saved trip origin or destination.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-border/50 bg-card/85 p-4 shadow-elevation-raised backdrop-blur-glass">
                <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Road intelligence</p>
                {officialHazards.data && officialHazards.data.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {officialHazards.data.slice(0, 3).map((alert) => (
                      <div key={alert.id} className={cn('rounded-xl border px-3 py-2 text-xs', officialHazardClass(alert))}>
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold leading-snug">{alert.event}</p>
                            <p className="mt-0.5 leading-relaxed opacity-90">{alert.headline}</p>
                            <p className="mt-1 text-[10px] font-semibold uppercase opacity-75">
                              {alert.sourceLabel} - {alert.pointLabel} - {alert.areaDesc}
                            </p>
                            {alert.roadRisk && (
                              <p className="mt-2 rounded-lg border border-current/20 px-2 py-1 font-semibold leading-relaxed">
                                Driver action: {officialHazardDriverGuidance(alert)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    <Button onClick={handleRoadClosureCheck} variant="outline" className="h-10 w-full justify-start rounded-xl text-xs font-semibold">
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      Open state DOT road conditions
                    </Button>
                  </div>
                )}
                {routeWeatherRisks.data && routeWeatherRisks.data.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {routeWeatherRisks.data.slice(0, 3).map((risk) => (
                      <div key={risk.id} className={cn('rounded-xl border px-3 py-2 text-xs', routeWeatherClass(risk))}>
                        <div className="flex items-start gap-2">
                          <CloudRain className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-bold leading-snug">Route weather: {risk.pointLabel}</p>
                            <p className="mt-0.5 leading-relaxed opacity-90">{risk.message}</p>
                            {risk.targetLocalTime && (
                              <p className="mt-1 text-[10px] font-semibold uppercase opacity-75">
                                Expected near {format(new Date(risk.targetLocalTime), 'MMM d, h:mm a')}
                              </p>
                            )}
                            {risk.driverDecision && (
                              <p className="mt-2 rounded-lg border border-current/20 px-2 py-1 font-semibold leading-relaxed">
                                Decision: {risk.driverDecision}
                              </p>
                            )}
                            {risk.packingAction && (
                              <p className="mt-2 rounded-lg border border-current/20 px-2 py-1 font-semibold leading-relaxed">
                                Pack/prep: {risk.packingAction}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {routeWeatherRisks.isError && (
                  <p className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                    Route weather could not be verified. Check conditions before loading the vehicle or accepting a detour.
                  </p>
                )}
                {online && !routeWeatherRisks.isLoading && !routeWeatherRisks.isError && routeWeatherRisks.data?.length === 0 && (
                  <p className="mb-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    No sampled route-weather hazards detected for the expected drive window.
                  </p>
                )}
                {officialHazards.isError && (
                  <p className="mb-3 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                    Official weather alerts are unavailable right now. Check road closures before taking low-lying detours.
                  </p>
                )}
                {alerts.length > 0 ? (
                  <div className="space-y-2">
                    {alerts.map((alert, i) => {
                      const Icon = ALERT_ICON[alert.type] ?? AlertTriangle;
                      return (
                        <div key={i} className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs font-medium ${alertColorClass(alert.severity)}`}>
                          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span className="leading-relaxed">{alert.message}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    No deterministic drive alerts right now.
                  </p>
                )}
                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">{tollStatus.message}</p>
              </div>

              {nextStop.nextStop && (
                <div className="rounded-2xl border border-border/50 bg-card/85 p-4 shadow-elevation-raised backdrop-blur-glass">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Next stop</p>
                      <p className="truncate text-sm font-semibold">
                        {nextStop.nextStop.displayName}
                        {nextStop.nextStop.eventLocalTime && (
                          <span className="ml-1 font-normal text-muted-foreground">at {nextStop.nextStop.eventLocalTime}</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {parkingStatus.status !== 'NONE' && (
                <div
                  className={`rounded-2xl border p-4 shadow-elevation-raised ${
                    parkingStatus.status === 'NEAR_EXPIRY'
                      ? 'border-orange-500/40 bg-orange-500/10'
                      : 'border-border/50 bg-card/85'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ParkingCircle
                      className={`h-4 w-4 shrink-0 ${
                        parkingStatus.status === 'NEAR_EXPIRY'
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-primary'
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
                </div>
              )}
            </aside>
          </>
        )}
      </main>
    </div>
  );
}
