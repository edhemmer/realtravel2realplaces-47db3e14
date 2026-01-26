import { useState } from 'react';
import { useTrips, useDeleteTrip } from '@/hooks/useTrips';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Calendar, Briefcase, Heart, Sparkles, Plane, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Trip } from '@/types/database';
import { CreateTripDialog } from '@/components/trips/CreateTripDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Dashboard() {
  const { data: trips, isLoading } = useTrips();
  const deleteTrip = useDeleteTrip();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);

  const getTripTypeIcon = (type: string) => {
    switch (type) {
      case 'business': return <Briefcase className="w-4 h-4" />;
      case 'personal': return <Heart className="w-4 h-4" />;
      case 'mixed': return <Sparkles className="w-4 h-4" />;
      default: return <Plane className="w-4 h-4" />;
    }
  };

  const getTripTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'business': return 'secondary';
      case 'personal': return 'default';
      case 'mixed': return 'outline';
      default: return 'default';
    }
  };

  const handleDeleteTrip = () => {
    if (tripToDelete) {
      deleteTrip.mutate(tripToDelete);
      setTripToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My Trips</h1>
            <p className="text-muted-foreground mt-1">Plan and organize your adventures</p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} className="bg-gradient-ocean hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4 mr-2" />
            New Trip
          </Button>
        </div>

        {/* Trips Grid */}
        {trips && trips.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip: Trip, index: number) => (
              <Card key={trip.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{trip.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {trip.destination_city}, {trip.destination_country}
                      </CardDescription>
                    </div>
                    <Badge variant={getTripTypeBadgeVariant(trip.trip_type)} className="flex items-center gap-1 shrink-0">
                      {getTripTypeIcon(trip.trip_type)}
                      {trip.trip_type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {format(new Date(trip.start_date), 'MMM d')} - {format(new Date(trip.end_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="default" size="sm" className="flex-1 bg-gradient-ocean hover:opacity-90">
                      <Link to={`/trip/${trip.id}`}>
                        <Eye className="w-4 h-4 mr-1" />
                        View Trip
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setTripToDelete(trip.id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Plane className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No trips yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first trip to start organizing your travels
              </p>
              <Button onClick={() => setCreateDialogOpen(true)} className="bg-gradient-ocean hover:opacity-90">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Trip
              </Button>
            </CardContent>
          </Card>
        )}
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
    </Layout>
  );
}
