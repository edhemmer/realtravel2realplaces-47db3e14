import { useState, useEffect } from 'react';
import { useTrips, useDeleteTrip } from '@/hooks/useTrips';
import { useSharedTrips, SharedTrip } from '@/hooks/useSharedTrips';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
 import { Plus, MapPin, Calendar, Plane, Trash2, Users, ChevronRight } from 'lucide-react';
 import { Link, useNavigate } from 'react-router-dom';
import { format, isBefore, startOfDay, parseISO } from 'date-fns';
import { Trip } from '@/types/database';
import { CreateTripDialog } from '@/components/trips/CreateTripDialog';
import { TripLifecycleBadges, getTripCardLifecycleStyles } from '@/components/trips/TripLifecycleBadges';
import { useAccess } from '@/hooks/useAccess';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { hasCompletedOnboarding } from './Onboarding';

export default function Dashboard() {
  const navigate = useNavigate();
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

  // Patch 2.4.2: Redirect to onboarding for first-time users
  useEffect(() => {
    if (!isLoading && !sharedLoading && !hasCompletedOnboarding()) {
      navigate('/onboarding');
    }
  }, [isLoading, sharedLoading, navigate]);

  const handleDeleteTrip = () => {
    if (tripToDelete) {
      deleteTrip.mutate(tripToDelete);
      setTripToDelete(null);
    }
  };
  if (isLoading || sharedLoading) {
    return <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>;
  }
  const TripCard = ({
    trip,
    isShared = false,
    index
  }: {
    trip: Trip | SharedTrip;
    isShared?: boolean;
    index: number;
  }) => {
    // v2.1.6: Get lifecycle-based styling
    const { cardClassName, isLocked } = getTripCardLifecycleStyles(trip as Trip, isPro);
    const tripState = (trip as Trip).trip_state || 'active';
    
     // v2.1.7: Hide delete for Free users
     const canDelete = isPro && !isShared && tripState === 'active';

     const handleCardClick = () => {
       navigate(`/trip/${trip.id}`);
     };

    return (
      <Card 
        key={trip.id} 
         className={`group cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 overflow-hidden animate-fade-in ${cardClassName}`}
        style={{
          animationDelay: `${index * 50}ms`
        }}
         onClick={handleCardClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
               <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
                 {trip.name}
               </CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" />
                {trip.destination_city}, {trip.destination_country}
              </CardDescription>
            </div>
             {/* v2.1.7: Status-only badges (no plan pills) */}
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
            <span>
              {format(new Date(trip.start_date), 'MMM d')} - {format(new Date(trip.end_date), 'MMM d, yyyy')}
            </span>
          </div>
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-1 text-sm text-primary font-medium group-hover:gap-2 transition-all">
               View Trip
               <ChevronRight className="w-4 h-4" />
             </div>
             {/* v2.1.7: Only show delete for Pro users */}
             {canDelete && (
               <Button 
                 variant="ghost" 
                 size="sm" 
                 onClick={(e) => {
                   e.stopPropagation();
                   setTripToDelete(trip.id);
                 }} 
                 className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
               >
                 <Trash2 className="w-4 h-4" />
               </Button>
             )}
          </div>
        </CardContent>
      </Card>
    );
  };
  const hasTrips = trips && trips.length > 0 || sharedTrips.length > 0;
  return <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header - Patch 2.6.1: Terminology consistency */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-bold text-4xl">My Trips</h1>
            <p className="text-muted-foreground mt-1">Manage your travel in one place</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-gradient-ocean hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4 mr-2" />
            New Trip
          </Button>
        </div>

        {/* My Trips */}
        {trips && trips.length > 0 && <div className="space-y-4">
            <h2 className="text-lg font-semibold">
        </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip: Trip, index: number) => <TripCard key={trip.id} trip={trip} index={index} />)}
            </div>
          </div>}

        {/* Shared Trips */}
        {sharedTrips.length > 0 && <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Shared With Me
            </h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sharedTrips.map((trip: SharedTrip, index: number) => <TripCard key={trip.id} trip={trip} isShared index={index} />)}
            </div>
          </div>}

        {/* First-Trip Empty State - v2.1.29, Patch 2.6.1 improved copy */}
        {!hasTrips && <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Plane className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No trips yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Your trips will appear here once created. Add your first trip to start 
                tracking bookings, expenses, and travel details in one place.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} size="lg" className="bg-gradient-ocean hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Trip
              </Button>
            </CardContent>
          </Card>}
      </div>

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
    </Layout>;
}