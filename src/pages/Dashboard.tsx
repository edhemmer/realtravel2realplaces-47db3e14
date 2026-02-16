/**
 * Dashboard - My Trips listing page
 * 
 * v2.1.28: Performance hardening
 * v3.0.0: Premium polish — framer-motion transitions, skeleton loading, card elevation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTrips, useDeleteTrip } from '@/hooks/useTrips';
import { useSharedTrips, SharedTrip } from '@/hooks/useSharedTrips';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, MapPin, Calendar, Plane, Trash2, Users, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatTripDateRange } from '@/lib/displayFormats';
import { getTodayDateOnly } from '@/lib/canonicalTimePolicy';
import { Trip } from '@/types/database';
import { CreateTripDialog } from '@/components/trips/CreateTripDialog';
import { TripLifecycleBadges, getTripCardLifecycleStyles } from '@/components/trips/TripLifecycleBadges';
import { useAccess } from '@/hooks/useAccess';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { PendingImportsSection } from '@/components/imports/PendingImportsSection';
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
  const { isPro } = useAccess();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);

  // v2.3.10: Auto-open create trip dialog if routed from WelcomeChoice
  useEffect(() => {
    const state = location.state as { openCreateTrip?: boolean } | null;
    if (state?.openCreateTrip) {
      setCreateDialogOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const handleDeleteTrip = useCallback(() => {
    if (tripToDelete) {
      deleteTrip.mutate(tripToDelete);
      setTripToDelete(null);
    }
  }, [tripToDelete, deleteTrip]);
  
  const handleNavigate = useCallback((id: string) => {
    navigate(`/trip/${id}`);
  }, [navigate]);
  
  const handleRequestDelete = useCallback((id: string) => {
    setTripToDelete(id);
  }, []);

  if (isLoading || sharedLoading) {
    return (
      <Layout>
        <DashboardSkeleton />
      </Layout>
    );
  }

  const hasTrips = trips && trips.length > 0 || sharedTrips.length > 0;

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

        {/* Pending Email Imports */}
        <PendingImportsSection />

        {/* My Trips */}
        {trips && trips.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold" />
            <StaggerContainer className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip: Trip) => (
                <FadeInItem key={trip.id}>
                  <TripCard
                    trip={trip}
                    isPro={isPro}
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

      <CreateTripDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

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
    </Layout>
  );
}

/** 
 * TripCard — Memoized card with premium hover elevation
 */
const TripCard = React.memo(function TripCard({
  trip,
  isShared = false,
  isPro,
  onDelete,
  onNavigate,
}: {
  trip: Trip | SharedTrip;
  isShared?: boolean;
  isPro: boolean;
  onDelete: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const { cardClassName, isLocked } = getTripCardLifecycleStyles(trip as Trip, isPro);
  const tripState = (trip as Trip).trip_state || 'active';
  const todayStr = getTodayDateOnly();
  const isPastTrip = trip.end_date < todayStr;
  const canDelete = isPro && !isShared && tripState === 'active';

  const handleCardClick = useCallback(() => {
    onNavigate(trip.id);
  }, [onNavigate, trip.id]);
  
  const handleDeleteClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(trip.id);
  }, [onDelete, trip.id]);

  const pastTripStyles = isPastTrip ? 'opacity-60' : '';

  return (
    <Card 
      className={`group cursor-pointer transition-all duration-200 overflow-hidden border-border/50 hover:border-primary/20 hover:shadow-lg ${cardClassName} ${pastTripStyles}`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg truncate group-hover:text-primary transition-colors duration-200">
                {trip.name}
              </CardTitle>
              {(trip as Trip).transportation_mode === 'flight' && (
                <Plane className={`w-3.5 h-3.5 shrink-0 ${isPastTrip ? 'text-muted-foreground/50' : 'text-primary/70'}`} />
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
          <div className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all duration-200">
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
        </div>
      </CardContent>
    </Card>
  );
});
