import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useTrip } from '@/hooks/useTrips';
import { useTripOwnership } from '@/hooks/useSharedTrips';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Calendar, Eye, Users, Compass } from 'lucide-react';
import { format } from 'date-fns';
import { SummaryTab } from '@/components/trips/tabs/SummaryTab';
import { BookingsTab } from '@/components/trips/tabs/BookingsTab';
import { ExpensesTab } from '@/components/trips/tabs/ExpensesTab';
import { ParkingTab } from '@/components/trips/tabs/ParkingTab';
import { PackingTab } from '@/components/trips/tabs/PackingTab';
import { CompanionsTab } from '@/components/trips/tabs/CompanionsTab';
import { NotesTab } from '@/components/trips/tabs/NotesTab';
import { ExploreTab } from '@/components/trips/tabs/ExploreTab';
import { TripHeaderWidgets } from '@/components/trips/TripHeaderWidgets';
import { TripStatusHeroBar } from '@/components/trips/TripStatusHeroBar';
import { ProRetentionCountdownCard } from '@/components/trips/ProRetentionCountdownCard';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Context to share ownership info with child components
interface TripPermissionContextType {
  isOwner: boolean;
  canEdit: boolean;
}

const TripPermissionContext = createContext<TripPermissionContextType>({
  isOwner: true,
  canEdit: true,
});

export const useTripPermission = () => useContext(TripPermissionContext);

// v2.0.7: Types for drill-through navigation
// v2.1.0: Extended to support expenses tab
export type DrillThroughTarget = {
  tab: 'bookings' | 'parking' | 'expenses';
  recordId?: string;
} | null;

export default function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: trip, isLoading } = useTrip(tripId || '');
  const { data: ownership, isLoading: ownershipLoading } = useTripOwnership(tripId || '');
  
  // v2.0.7: Tab and drill-through state
  const [activeTab, setActiveTab] = useState('summary');
  const [drillTarget, setDrillTarget] = useState<DrillThroughTarget>(null);

  // v2.0.7: Handle drill-through navigation from timeline
  const handleDrillThrough = useCallback((target: DrillThroughTarget) => {
    if (!target) return;
    setActiveTab(target.tab);
    setDrillTarget(target);
  }, []);

  // v2.0.7: Clear drill target after it's been consumed
  const clearDrillTarget = useCallback(() => {
    setDrillTarget(null);
  }, []);

  if (isLoading || ownershipLoading) {
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

  const isOwner = ownership?.isOwner ?? false;
  const canEdit = ownership?.canEdit ?? false;

  return (
    <TripPermissionContext.Provider value={{ isOwner, canEdit }}>
      <Layout>
        <div className="space-y-6 animate-fade-in">
          {/* v2.1.6: Trip Status Hero Bar - sticky at top */}
          <TripStatusHeroBar trip={trip} />

          {/* v2.1.6: Pro Retention Countdown Card - shows for Pro closed trips */}
          <ProRetentionCountdownCard trip={trip} />

          {/* Navigation */}
          <div className="flex flex-col gap-4">
            <Button asChild variant="ghost" className="w-fit -ml-2">
              <Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Trips
              </Link>
            </Button>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{trip.name}</h1>
                  {!isOwner && (
                    <Badge variant="outline" className="flex items-center gap-1 bg-primary/5">
                      <Users className="w-3 h-3" />
                      {canEdit ? 'Shared (Edit)' : 'View Only'}
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {trip.destination_city}, {trip.destination_country}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(trip.start_date + 'T00:00:00'), 'MMM d')} - {format(new Date(trip.end_date + 'T00:00:00'), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Read-only banner */}
          {!isOwner && !canEdit && (
            <div className="flex items-center gap-2 p-3 bg-muted/50 border rounded-lg text-sm text-muted-foreground">
              <Eye className="w-4 h-4" />
              <span>You're viewing this trip in read-only mode. Only the trip owner can make changes.</span>
            </div>
          )}

          {/* v1.2.8: Widget container moved below trip header */}
          <TripHeaderWidgets trip={trip} />

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="bookings">Bookings</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="parking">Parking</TabsTrigger>
              <TabsTrigger value="packing">Packing</TabsTrigger>
              <TabsTrigger value="companions">Companions</TabsTrigger>
              <TabsTrigger value="notes">Notes & Safety</TabsTrigger>
              <TabsTrigger value="explore" className="gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                Explore
              </TabsTrigger>
            </TabsList>

            <div className="mt-6">
              <TabsContent value="summary">
                <SummaryTab tripId={trip.id} trip={trip} onDrillThrough={handleDrillThrough} />
              </TabsContent>
              <TabsContent value="bookings">
                <BookingsTab 
                  tripId={trip.id} 
                  highlightId={drillTarget?.tab === 'bookings' ? drillTarget.recordId : undefined}
                  onHighlightConsumed={clearDrillTarget}
                />
              </TabsContent>
              <TabsContent value="expenses">
                <ExpensesTab tripId={trip.id} />
              </TabsContent>
              <TabsContent value="parking">
                <ParkingTab 
                  tripId={trip.id}
                  highlightId={drillTarget?.tab === 'parking' ? drillTarget.recordId : undefined}
                  onHighlightConsumed={clearDrillTarget}
                />
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
              <TabsContent value="explore">
                <ExploreTab tripId={trip.id} trip={trip} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </Layout>
    </TripPermissionContext.Provider>
  );
}
