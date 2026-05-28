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
import { Plus, MapPin, Calendar, Plane, Car, TrainFront, Route, Trash2, Users, ChevronRight, Radio, UserMinus } from 'lucide-react';
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
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[28px] font-bold leading-[1.15] tracking-tight">My Trips</h1>
              <p className="text-muted-foreground text-sm font-normal opacity-[0.85] mt-1">Manage your travel in one place</p>
            </div>
            {CAN_CREATE_TRIPS && (
              <Button 
                onClick={() => setCreateDialogOpen(true)} 
                className="bg-gradient-ocean hover:opacity-90 transition-opacity h-10 sm:h-12 rounded-xl font-semibold shadow-sm shrink-0"
              >
                <Plus className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">New Trip</span>
                <span className="sm:hidden">New</span>
              </Button>
            )}
          </div>
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
            <h2 className="text-lg font-semibold" />
            <motion.div
              variants={staggerParent(0.06, 0.04)}
              initial="hidden"
              animate="visible"
              className="motion-cinema grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            >
              {sortedTrips.map((trip: Trip) => (
                <motion.div key={trip.id} variants={staggerChild}>
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
                <motion.div key={trip.id} variants={staggerChild}>
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
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Plane className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No trips yet</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  {CAN_CREATE_TRIPS
                    ? 'Your trips will appear here once created. Add your first trip to start tracking bookings, expenses, and travel details in one place.'
                    : 'Your trips will appear here once created on the web. Visit realtravel2realplaces.app from a browser to create your first trip.'}
                </p>
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
        className={`group relative w-full min-w-0 overflow-hidden transition-all duration-base ease-cinema hover:-translate-y-0.5 hover:shadow-elevation-floating ${cardClassName} ${pastTripStyles} ${activeBorder}`}
    >
      {/* Mode accent strip */}
      <div className={`h-[3px] w-full ${modeTheme.gradients.buttonBg}`} />

      {/* Content area — compact on mobile, right padding for action button on desktop */}
      <div className="pr-[68px] sm:pr-[96px]">
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
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400">
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
          <div className="flex items-center justify-between">
            <button
              onClick={handleCardClick}
              className={`flex items-center gap-0.5 text-sm font-medium ${modeTheme.palette.primary} hover:underline`}
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

      {/* Mode action button — absolutely positioned */}
      <button
        onClick={handleCardClick}
        aria-label={`Open trip: ${trip.name}`}
        className={`
          absolute right-4 top-1/2 -translate-y-1/2 sm:right-6
          h-10 w-10 rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl
          flex items-center justify-center
          ${modeTheme.gradients.buttonBg} ${modeTheme.palette.border} border
          shadow-md
          transition-all duration-200
          hover:-translate-y-[calc(50%+2px)] hover:shadow-lg
          active:scale-[0.97]
          focus-visible:outline-none focus-visible:ring-2 ${modeTheme.palette.focus}
        `}
      >
        {React.createElement(MODE_ICONS[tripMode], { className: `w-5 h-5 sm:w-7 sm:h-7 ${modeTheme.palette.icon}` })}
      </button>
    </GlassSurface>
  );
});
