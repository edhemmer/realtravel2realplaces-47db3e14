/**
 * Dashboard - My Trips listing page
 * 
 * v2.1.28: Performance hardening
 * v3.0.0: Premium polish — framer-motion transitions, skeleton loading, card elevation
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useTrips, useDeleteTrip } from '@/hooks/useTrips';
import { useSharedTrips, SharedTrip } from '@/hooks/useSharedTrips';
import { useRemoveTripMembership } from '@/hooks/useTripMembers';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, MapPin, Calendar, Plane, Car, TrainFront, Route, Trash2, Users, ChevronRight, Radio, UserMinus, Sparkles, Compass, ListChecks, WifiOff, Coins, ShieldCheck, BriefcaseBusiness, Activity } from 'lucide-react';
import { getTripMode, getModeTheme, type TripMode } from '@/lib/modeTheme';
import { useNavigate } from 'react-router-dom';
import { formatTripDateRange } from '@/lib/displayFormats';
import { getTodayDateOnly } from '@/lib/canonicalTimePolicy';
import { Trip } from '@/types/database';
import { CreateTripDialog } from '@/components/trips/CreateTripDialog';
import { TripLifecycleBadges, getTripCardLifecycleStyles } from '@/components/trips/TripLifecycleBadges';
import { useAccess } from '@/hooks/useAccess';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PendingImportsSection } from '@/components/imports/PendingImportsSection';
import { EMAIL_FORWARDING_ENABLED } from '@/lib/featureFlags';
import { PageTransition } from '@/components/ui/page-transition';
import { DashboardSkeleton } from '@/components/ui/premium-loading';
import { motion } from 'framer-motion';
import { canCreateTrips } from '@/lib/native/platform';
import { NowCard } from '@/components/now/NowCard';
import { GlassSurface } from '@/components/ui/glass-surface';
import { sectionRise, staggerParent, staggerChild } from '@/lib/motion/choreography';

const CAN_CREATE_TRIPS = canCreateTrips();

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    data: trips,
    isLoading
  } = useTrips();
  const {
    data: sharedTrips = [],
    isLoading: sharedLoading
  } = useSharedTrips();
  const deleteTrip = useDeleteTrip();
  const removeMembership = useRemoveTripMembership();
  const { isPro } = useAccess();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);
  const [tripToRemove, setTripToRemove] = useState<string | null>(null);

  // v3.8.20: Auto-open create trip dialog; detect onboarding state
  const { shouldShowOnboarding } = useOnboardingStatus();
  
  useEffect(() => {
    // Native iOS build: trip creation is disabled — never auto-open the wizard.
    if (!CAN_CREATE_TRIPS) return;
    const state = location.state as { openCreateTrip?: boolean; isOnboarding?: boolean } | null;
    if (state?.openCreateTrip) {
      setCreateDialogOpen(true);
      setIsOnboarding(!!state.isOnboarding);
      window.history.replaceState({}, document.title);
    } else if (shouldShowOnboarding) {
      // New user who hasn't completed onboarding — auto-open create trip wizard
      setCreateDialogOpen(true);
      setIsOnboarding(true);
    }
  }, [location.state, shouldShowOnboarding]);

  const handleDeleteTrip = useCallback(() => {
    if (tripToDelete) {
      deleteTrip.mutate(tripToDelete);
      setTripToDelete(null);
    }
  }, [tripToDelete, deleteTrip]);

  const handleRemoveMembership = useCallback(() => {
    if (tripToRemove) {
      removeMembership.mutate({ tripId: tripToRemove });
      setTripToRemove(null);
    }
  }, [tripToRemove, removeMembership]);
  
  
  const handleNavigate = useCallback((id: string) => {
    navigate(`/trip/${id}`);
  }, [navigate]);
  
  const handleRequestDelete = useCallback((id: string) => {
    setTripToDelete(id);
  }, []);

  const handleRequestRemove = useCallback((id: string) => {
    setTripToRemove(id);
  }, []);

  // v3.9.3: Canonical active trip resolver — consumption only
  const todayStr = useMemo(() => getTodayDateOnly(), []);
  const activeTrip = useMemo(() => {
    if (!trips || trips.length === 0) return null;
    return trips
      .filter((t: Trip) => todayStr >= t.start_date && todayStr <= t.end_date)
      .sort((a: Trip, b: Trip) => a.start_date < b.start_date ? -1 : 1)[0] ?? null;
  }, [trips, todayStr]);

  // Canonical "what now?" surface — promotes the nearest upcoming trip (≤14d)
  // when no trip is active, so users always get a single decisive next step.
  const nowCardTrip = useMemo(() => {
    if (activeTrip) return activeTrip;
    if (!trips || trips.length === 0) return null;
    return trips
      .filter((t: Trip) => t.start_date > todayStr)
      .sort((a: Trip, b: Trip) => a.start_date < b.start_date ? -1 : 1)[0] ?? null;
  }, [trips, activeTrip, todayStr]);

  // v3.9.3: Elevate active trip to index 0
  const sortedTrips = useMemo(() => {
    if (!trips || trips.length === 0) return [];
    if (!activeTrip) return trips;
    return [activeTrip, ...trips.filter((t: Trip) => t.id !== activeTrip.id)];
  }, [trips, activeTrip]);

  const tripMetrics = useMemo(() => {
    const upcomingCount = sortedTrips.filter((trip: Trip) => trip.start_date > todayStr).length;
    const sharedCount = sharedTrips.length;
    const businessCount = sortedTrips.filter((trip: Trip) => trip.trip_type === 'business').length;

    return [
      {
        label: 'Ready trips',
        value: sortedTrips.length,
        icon: Activity,
        tone: 'text-primary',
        bg: 'bg-primary/10',
      },
      {
        label: 'Upcoming',
        value: upcomingCount,
        icon: Calendar,
        tone: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/12',
      },
      {
        label: 'Shared',
        value: sharedCount,
        icon: Users,
        tone: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/12',
      },
      {
        label: 'Business',
        value: businessCount,
        icon: BriefcaseBusiness,
        tone: 'text-sky-600 dark:text-sky-400',
        bg: 'bg-sky-500/12',
      },
    ];
  }, [sortedTrips, sharedTrips.length, todayStr]);

  if (isLoading || sharedLoading) {
    return (
      <Layout>
        <DashboardSkeleton />
      </Layout>
    );
  }

  const hasTrips = sortedTrips.length > 0 || sharedTrips.length > 0;

  return (
    <Layout>
      <PageTransition className="w-full min-w-0 space-y-4 bg-ambient-wash sm:space-y-6">
        {/* Header */}
        <motion.div
          variants={sectionRise}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0 }}
          className="motion-cinema"
        >
          <GlassSurface elevation="floating" className="overflow-hidden rounded-2xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(38_92%_55%),hsl(160_60%_42%))]" />
            <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -left-12 bottom-0 h-32 w-32 rounded-full bg-amber-400/10 blur-3xl" />
            <div className="relative grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-semibold uppercase text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Real-time travel operations
                </div>
                <h1 className="text-[30px] font-bold leading-[1.08] tracking-tight sm:text-4xl">Travel Operations Home</h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  A premium command layer for every trip: timing, movement, spend, reports, offline context, and the next action before travel chaos has a chance to spread.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {CAN_CREATE_TRIPS && (
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    className="h-11 shrink-0 rounded-xl bg-gradient-ocean px-4 font-semibold shadow-glow transition-opacity hover:opacity-90 sm:h-12"
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    <span>Build Trip</span>
                  </Button>
                )}
              </div>
            </div>
            <div className="relative grid grid-cols-2 gap-2 border-t border-border/40 p-3 sm:grid-cols-4 sm:p-4">
              {tripMetrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.label} className="rounded-xl border border-border/45 bg-card/55 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-muted-foreground">{metric.label}</span>
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${metric.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${metric.tone}`} />
                      </span>
                    </div>
                    <div className="mt-1.5 text-2xl font-bold leading-none">{metric.value}</div>
                  </div>
                );
              })}
            </div>
          </GlassSurface>
        </motion.div>

        {/* Canonical "Now Card" — single source of "what should I do right now?" */}
        {nowCardTrip && <NowCard trip={nowCardTrip} />}

        {/* Pending Email Imports — hidden via feature flag */}
        {EMAIL_FORWARDING_ENABLED && (
          <motion.div
            variants={sectionRise}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.08 }}
            className="motion-cinema"
          >
            <PendingImportsSection />
          </motion.div>
        )}

        {/* My Trips */}
        {sortedTrips.length > 0 && (
          <motion.div
            variants={sectionRise}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.12 }}
            className="motion-cinema space-y-4"
          >
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Managed trips</h2>
                <p className="text-sm text-muted-foreground">Live, upcoming, shared, and archived trip operations in one governed view.</p>
              </div>
            </div>
            <motion.div
              variants={staggerParent(0.06, 0.04)}
              initial="hidden"
              animate="visible"
              className="motion-cinema grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {sortedTrips.map((trip: Trip) => (
                <motion.div key={trip.id} variants={staggerChild} className="min-w-0">
                  <TripCard
                    trip={trip}
                    isPro={isPro}
                    isActive={activeTrip?.id === trip.id}
                    onDelete={handleRequestDelete}
                    onNavigate={handleNavigate}
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* Shared Trips */}
        {sharedTrips.length > 0 && (
          <motion.div
            variants={sectionRise}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.16 }}
            className="motion-cinema space-y-4"
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Shared With Me
            </h2>
            <motion.div
              variants={staggerParent(0.06, 0.04)}
              initial="hidden"
              animate="visible"
              className="motion-cinema grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {sharedTrips.map((trip: SharedTrip) => (
                <motion.div key={trip.id} variants={staggerChild} className="min-w-0">
                  <TripCard
                    trip={trip}
                    isShared
                    isPro={isPro}
                    onDelete={handleRequestDelete}
                    onNavigate={handleNavigate}
                    onRemove={handleRequestRemove}
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* First-Trip Empty State */}
        {!hasTrips && (
          <motion.div
            variants={sectionRise}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.12 }}
            className="motion-cinema"
          >
            <Card className="overflow-hidden border-dashed border-2 bg-card/80 shadow-elevation-raised">
              <CardContent className="flex flex-col items-center justify-center py-14 px-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-ocean flex items-center justify-center mb-4 shadow-glow">
                  <Plane className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Your command center is waiting</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md text-sm leading-relaxed">
                  {CAN_CREATE_TRIPS
                    ? 'Add your first trip to bring Today, Move, Guide, and Flow to life — bookings, timing, and the next step in one calm place.'
                    : 'Create or import trips from the secure web command center. They sync here automatically for mobile operations.'}
                </p>

                {CAN_CREATE_TRIPS && (
                  <div className="w-full max-w-lg grid grid-cols-2 gap-2.5 mb-6 text-left">
                    <div className="rounded-xl bg-card border border-border/60 p-3 flex items-start gap-2.5">
                      <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold">Today</div>
                        <div className="text-[11px] text-muted-foreground leading-snug">What to do next, when to leave.</div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-card border border-border/60 p-3 flex items-start gap-2.5">
                      <Compass className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold">Move</div>
                        <div className="text-[11px] text-muted-foreground leading-snug">Directive transport guidance.</div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-card border border-border/60 p-3 flex items-start gap-2.5">
                      <ListChecks className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold">Guide</div>
                        <div className="text-[11px] text-muted-foreground leading-snug">Alerts that actually matter.</div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-card border border-border/60 p-3 flex items-start gap-2.5">
                      <Route className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-semibold">Flow</div>
                        <div className="text-[11px] text-muted-foreground leading-snug">Your trip on one timeline.</div>
                      </div>
                    </div>
                  </div>
                )}

                {CAN_CREATE_TRIPS && (
                  <Button
                    onClick={() => setCreateDialogOpen(true)}
                    size="lg"
                    className="bg-gradient-ocean hover:opacity-90 h-12 rounded-xl font-semibold shadow-sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Trip
                  </Button>
                )}

                {CAN_CREATE_TRIPS && (
                  <div className="mt-5 flex justify-center flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5"><WifiOff className="w-3 h-3 text-primary/70" />Works offline</span>
                    <span className="flex items-center gap-1.5"><Coins className="w-3 h-3 text-primary/70" />Multi-currency aware</span>
                    <span className="flex items-center gap-1.5"><Users className="w-3 h-3 text-primary/70" />Share with co-travelers</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </PageTransition>

      <CreateTripDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} isOnboarding={isOnboarding} />

      <AlertDialog open={!!tripToDelete} onOpenChange={() => setTripToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this trip? This will also delete all bookings, expenses, and other data associated with it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTrip} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* v3.9.8: Remove shared trip membership confirm */}
      <AlertDialog open={!!tripToRemove} onOpenChange={() => setTripToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from My Trips</AlertDialogTitle>
            <AlertDialogDescription>
              Remove this shared trip from your account? You can be re-invited later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMembership}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

/**
 * TravelModeIcon — Uses canonical getModeTheme() for all mode styling.
 */
const MODE_ICONS: Record<TripMode, React.ComponentType<{ className?: string }>> = {
  fly: Plane,
  drive: Car,
  train: TrainFront,
  unknown: Route,
};

function TravelModeIcon({ mode, isPast }: { mode: TripMode; isPast: boolean }) {
  const theme = getModeTheme(mode);
  const Icon = MODE_ICONS[mode];
  const dimmed = isPast ? 'opacity-50' : '';

  return (
    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${theme.palette.background} ${dimmed}`}>
      <Icon className={`w-4 h-4 ${theme.palette.primary}`} />
    </span>
  );
}

/** 
 * TripCard — Memoized card with premium hover elevation
 */
const TripCard = React.memo(function TripCard({
  trip,
  isShared = false,
  isPro,
  isActive = false,
  onDelete,
  onNavigate,
  onRemove,
}: {
  trip: Trip | SharedTrip;
  isShared?: boolean;
  isPro: boolean;
  isActive?: boolean;
  onDelete: (id: string) => void;
  onNavigate: (id: string) => void;
  onRemove?: (id: string) => void;
}) {
  const { cardClassName, isLocked } = getTripCardLifecycleStyles(trip as Trip, isPro);
  const tripState = (trip as Trip).trip_state || 'active';
  const todayStr = getTodayDateOnly();
  const isPastTrip = trip.end_date < todayStr;
  const canDelete = isPro && !isShared && tripState === 'active';
  const tripMode = getTripMode(trip as Trip);
  const modeTheme = getModeTheme(tripMode);

  const handleCardClick = useCallback(() => {
    onNavigate(trip.id);
  }, [onNavigate, trip.id]);
  
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(trip.id);
  }, [onDelete, trip.id]);

  const handleRemoveClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove?.(trip.id);
  }, [onRemove, trip.id]);

  const pastTripStyles = isPastTrip ? 'opacity-60' : '';
  const activeBorder = isActive ? 'border-success/50 ring-1 ring-success/20' : '';

    return (
    <GlassSurface
      elevation="raised"
        className={`group relative w-full min-w-0 max-w-full overflow-hidden rounded-2xl transition-all duration-base ease-cinema hover:-translate-y-0.5 hover:shadow-elevation-floating ${cardClassName} ${pastTripStyles} ${activeBorder}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary/6 to-transparent" />
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-amber-400/10 blur-2xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-16 w-28 bg-[radial-gradient(circle_at_0%_100%,hsl(160_60%_42%/0.12),transparent_65%)]" />
      {/* Mode accent strip */}
      <div className={`h-[3px] w-full ${modeTheme.gradients.buttonBg}`} />

      {/* Content area — reserves room for the absolute action button on the right */}
      <div className="relative pr-[56px] sm:pr-[96px]">
        <CardHeader className="px-4 pb-1 pt-4 sm:px-5 sm:pb-2 sm:pt-5">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                <TravelModeIcon mode={tripMode} isPast={isPastTrip} />
                <CardTitle className="min-w-0 truncate text-[16px] font-semibold leading-[1.3] sm:text-[18px]">
                  {trip.name}
                </CardTitle>
                <div className="flex items-center gap-1.5 ml-1 shrink-0">
                  {isActive && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-brand-signal/15 text-brand-signal-deep dark:text-brand-signal">
                      <Radio className="w-2.5 h-2.5" />
                      Live
                    </span>
                  )}
                </div>
              </div>
              <CardDescription className="mt-1 flex min-w-0 items-center gap-1 text-sm font-normal opacity-80">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="min-w-0 truncate">{trip.destination_city}, {trip.destination_country}</span>
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {isShared && (
                <span className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground">
                  <Users className="w-3 h-3" />
                  Shared
                </span>
              )}
              <TripLifecycleBadges trip={trip as Trip} isPro={isPro} compact />
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 sm:pt-2">
          <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground opacity-75 mb-2 sm:mb-3">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatTripDateRange(trip.start_date, trip.end_date)}</span>
          </div>
          <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[10px] font-semibold uppercase text-muted-foreground/70">
            <span className="h-1.5 rounded-full bg-primary/25" />
            <span>{isActive ? 'Live now' : isPastTrip ? 'Archived flow' : 'Ready flow'}</span>
            <span className="h-1.5 rounded-full bg-amber-400/30" />
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={handleCardClick}
              className={`flex items-center gap-1 rounded-lg px-0.5 text-sm font-semibold ${modeTheme.palette.primary} hover:underline`}
            >
              View Trip
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            {canDelete && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDeleteClick} 
                className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-7 w-7 p-0"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            {isShared && onRemove && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRemoveClick} 
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 h-7 w-7 p-0"
              >
                <UserMinus className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </div>

      {/* Mode action button — sized to stay fully inside the card on narrow mobile widths */}
      <button
        onClick={handleCardClick}
        aria-label={`Open trip: ${trip.name}`}
        className={`
          absolute right-3 top-1/2 -translate-y-1/2 sm:right-6
          h-9 w-9 rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl
          flex items-center justify-center
          ${modeTheme.gradients.buttonBg} ${modeTheme.palette.border} border
          shadow-md
          transition-all duration-200
          hover:-translate-y-[calc(50%+2px)] hover:shadow-lg
          active:scale-[0.97]
          focus-visible:outline-none focus-visible:ring-2 ${modeTheme.palette.focus}
        `}
      >
        {React.createElement(MODE_ICONS[tripMode], { className: `w-4 h-4 sm:w-7 sm:h-7 ${modeTheme.palette.icon}` })}
      </button>
    </GlassSurface>
  );
});
