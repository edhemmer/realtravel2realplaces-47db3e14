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
import { Plus, MapPin, Calendar, Plane, Car, TrainFront, Route, Trash2, Users, ChevronRight, DollarSign, Compass, Radio, UserMinus } from 'lucide-react';
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
import { PageTransition, StaggerContainer, FadeInItem } from '@/components/ui/page-transition';
import { DashboardSkeleton } from '@/components/ui/premium-loading';
import { motion } from 'framer-motion';

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
      <PageTransition className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-bold text-4xl tracking-tight">My Trips</h1>
            <p className="text-muted-foreground mt-1">Manage your travel in one place</p>
          </div>
          <Button 
            onClick={() => setCreateDialogOpen(true)} 
            className="bg-gradient-ocean hover:opacity-90 transition-opacity h-12 rounded-xl font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Trip
          </Button>
        </div>

        {/* v3.9.3: Active Trip Execution Card */}
        {activeTrip && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-primary/30 bg-primary/5 md:hidden">
              <CardContent className="py-4 px-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Radio className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Active Trip</p>
                      <p className="font-semibold truncate">{activeTrip.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {activeTrip.destination_city}, {activeTrip.destination_country}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-success hover:bg-success/90 text-white h-9 rounded-lg font-semibold shadow-sm active:scale-[0.98]"
                      onClick={() => navigate(`/trip/${activeTrip.id}?tab=expenses`)}
                    >
                      <DollarSign className="w-3.5 h-3.5 mr-1" />
                      Add Expense
                    </Button>
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 rounded-lg font-semibold shadow-sm active:scale-[0.98]"
                      onClick={() => navigate(`/trip/${activeTrip.id}?tab=explore`)}
                    >
                      <Compass className="w-3.5 h-3.5 mr-1" />
                      Explore
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-lg font-semibold active:scale-[0.98]"
                      onClick={() => navigate(`/trip/${activeTrip.id}?tab=now`)}
                    >
                      Open NOW
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Pending Email Imports — hidden via feature flag */}
        {EMAIL_FORWARDING_ENABLED && <PendingImportsSection />}

        {/* My Trips */}
        {sortedTrips.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold" />
            <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedTrips.map((trip: Trip) => (
                <FadeInItem key={trip.id}>
                  <TripCard
                    trip={trip}
                    isPro={isPro}
                    isActive={activeTrip?.id === trip.id}
                    onDelete={handleRequestDelete}
                    onNavigate={handleNavigate}
                  />
                </FadeInItem>
              ))}
            </StaggerContainer>
          </div>
        )}

        {/* Shared Trips */}
        {sharedTrips.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Shared With Me
            </h2>
            <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sharedTrips.map((trip: SharedTrip) => (
                <FadeInItem key={trip.id}>
                  <TripCard
                    trip={trip}
                    isShared
                    isPro={isPro}
                    onDelete={handleRequestDelete}
                    onNavigate={handleNavigate}
                    onRemove={handleRequestRemove}
                  />
                </FadeInItem>
              ))}
            </StaggerContainer>
          </div>
        )}

        {/* First-Trip Empty State */}
        {!hasTrips && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
          >
            <Card className="border-dashed border-2">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Plane className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No trips yet</h3>
                <p className="text-muted-foreground text-center mb-6 max-w-md">
                  Your trips will appear here once created. Add your first trip to start
                  tracking bookings, expenses, and travel details in one place.
                </p>
                <Button 
                  onClick={() => setCreateDialogOpen(true)} 
                  size="lg" 
                  className="bg-gradient-ocean hover:opacity-90 h-12 rounded-xl font-semibold shadow-sm"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Trip
                </Button>
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
    <Card 
      className={`group relative transition-all duration-200 overflow-hidden border-border/50 hover:shadow-lg ${cardClassName} ${pastTripStyles} ${activeBorder}`}
    >
      {/* Mode accent strip */}
      <div className={`h-[3px] w-full ${modeTheme.gradients.buttonBg}`} />

      {/* Content area with right padding to protect from absolute button */}
      <div className="pr-[80px] sm:pr-[88px]">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <TravelModeIcon mode={tripMode} isPast={isPastTrip} />
                <CardTitle className="text-lg truncate">
                  {trip.name}
                </CardTitle>
                {isActive && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 shrink-0">
                    <Radio className="w-2.5 h-2.5" />
                    Live
                  </span>
                )}
              </div>
              <CardDescription className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {trip.destination_city}, {trip.destination_country}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isShared && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-muted text-muted-foreground">
                  <Users className="w-3 h-3" />
                  Shared
                </span>
              )}
              <TripLifecycleBadges trip={trip as Trip} isPro={isPro} compact />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
            <Calendar className="w-4 h-4" />
            <span>{formatTripDateRange(trip.start_date, trip.end_date)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-1 text-sm font-medium ${modeTheme.palette.primary}`}>
              View Trip
              <ChevronRight className="w-4 h-4" />
            </div>
            {canDelete && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleDeleteClick} 
                className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            {isShared && onRemove && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleRemoveClick} 
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <UserMinus className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </div>

      {/* Mode action button — absolutely positioned in right whitespace */}
      <button
        onClick={handleCardClick}
        aria-label={`Open trip: ${trip.name}`}
        className={`
          absolute right-8 top-1/2 -translate-y-1/2
          w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-2xl
          flex items-center justify-center
          ${modeTheme.gradients.buttonBg} ${modeTheme.palette.border} border
          shadow-md
          transition-all duration-200
          hover:-translate-y-[calc(50%+2px)] hover:shadow-lg
          active:scale-[0.97]
          focus-visible:outline-none focus-visible:ring-2 ${modeTheme.palette.focus}
        `}
      >
        {React.createElement(MODE_ICONS[tripMode], { className: `w-7 h-7 ${modeTheme.palette.icon}` })}
      </button>
    </Card>
  );
});
