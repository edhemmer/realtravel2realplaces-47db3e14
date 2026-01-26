import { useParams, Link } from 'react-router-dom';
import { useTrip } from '@/hooks/useTrips';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Calendar, Briefcase, Heart, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { SummaryTab } from '@/components/trips/tabs/SummaryTab';
import { BookingsTab } from '@/components/trips/tabs/BookingsTab';
import { ExpensesTab } from '@/components/trips/tabs/ExpensesTab';
import { ParkingTab } from '@/components/trips/tabs/ParkingTab';
import { PackingTab } from '@/components/trips/tabs/PackingTab';
import { CompanionsTab } from '@/components/trips/tabs/CompanionsTab';
import { NotesTab } from '@/components/trips/tabs/NotesTab';

export default function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>();
  const { data: trip, isLoading } = useTrip(tripId || '');

  const getTripTypeIcon = (type: string) => {
    switch (type) {
      case 'business': return <Briefcase className="w-4 h-4" />;
      case 'personal': return <Heart className="w-4 h-4" />;
      case 'mixed': return <Sparkles className="w-4 h-4" />;
      default: return null;
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

  if (!trip) {
    return (
      <Layout>
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">Trip not found</h2>
          <p className="text-muted-foreground mb-4">This trip doesn't exist or you don't have access.</p>
          <Button asChild>
            <Link to="/">Back to Dashboard</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <Button asChild variant="ghost" className="w-fit -ml-2">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Trips
            </Link>
          </Button>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{trip.name}</h1>
                <Badge variant="secondary" className="flex items-center gap-1">
                  {getTripTypeIcon(trip.trip_type)}
                  {trip.trip_type}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {trip.destination_city}, {trip.destination_country}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(trip.start_date), 'MMM d')} - {format(new Date(trip.end_date), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
            <TabsTrigger value="parking">Parking</TabsTrigger>
            <TabsTrigger value="packing">Packing</TabsTrigger>
            <TabsTrigger value="companions">Companions</TabsTrigger>
            <TabsTrigger value="notes">Notes & Safety</TabsTrigger>
          </TabsList>

          <div className="mt-6">
            <TabsContent value="summary">
              <SummaryTab tripId={trip.id} trip={trip} />
            </TabsContent>
            <TabsContent value="bookings">
              <BookingsTab tripId={trip.id} />
            </TabsContent>
            <TabsContent value="expenses">
              <ExpensesTab tripId={trip.id} />
            </TabsContent>
            <TabsContent value="parking">
              <ParkingTab tripId={trip.id} />
            </TabsContent>
            <TabsContent value="packing">
              <PackingTab tripId={trip.id} />
            </TabsContent>
            <TabsContent value="companions">
              <CompanionsTab tripId={trip.id} />
            </TabsContent>
            <TabsContent value="notes">
              <NotesTab tripId={trip.id} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}
