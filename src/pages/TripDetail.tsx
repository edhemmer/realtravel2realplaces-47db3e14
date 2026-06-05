import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTrip } from '@/hooks/useTrips';
import { useTripOwnership } from '@/hooks/useSharedTrips';
import { useExploreDiscovery } from '@/hooks/useExploreDiscovery';
import { useBookings } from '@/hooks/useBookings';
import { useAccess } from '@/hooks/useAccess';
import { useIsMobile } from '@/hooks/use-mobile';
// v2.3.4: Foreground resume refresh for Next Up freshness
import { useForegroundResume } from '@/hooks/useForegroundResume';
import { Layout } from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Calendar, Eye, Users } from 'lucide-react';
import { format } from 'date-fns';
// Patch 2.2.2: Import containers for canonical data flow
import {
  TripSummaryContainer,
  TripBookingsContainer,
  TripTourContainer,
  TripExpensesContainer,
} from '@/containers';
// v2.3.9: Alerts container
import { TripAlertsContainer } from '@/containers/TripAlertsContainer';
// v2.3.x: Canonical mobile navigation router
import { MobileNavigationRouter } from '@/containers/MobileNavigationRouter';
// v2.6.12: Desktop canonical shell
import { DesktopTripShell } from '@/containers/DesktopTripShell';
import { ParkingTab } from '@/components/trips/tabs/ParkingTab';
import { PackingTab } from '@/components/trips/tabs/PackingTab';
import { CompanionsTab } from '@/components/trips/tabs/CompanionsTab';
import { MembersTab } from '@/components/trips/tabs/MembersTab';
import { NotesTab } from '@/components/trips/tabs/NotesTab';
import { ExploreTab } from '@/components/trips/tabs/ExploreTab';
import { WeatherTab } from '@/components/trips/tabs/WeatherTab';
import { TripSummaryReportTab } from '@/components/trips/tabs/TripSummaryReportTab';
import { TravelOpsTab } from '@/components/trips/tabs/TravelOpsTab';
import { TripHeaderWidgets } from '@/components/trips/TripHeaderWidgets';
import { DriveModeEntryCard } from '@/components/trips/DriveModeEntryCard';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';

import { TripStatusHeroBar } from '@/components/trips/TripStatusHeroBar';
import { ProRetentionCountdownCard } from '@/components/trips/ProRetentionCountdownCard';
// v2.3.2: Mobile "Next Up" card
import { MobileNextUpCard } from '@/components/trips/MobileNextUpCard';
// v2.3.5: Mobile "Add Expense" field card
import { MobileAddExpenseCard } from '@/components/trips/MobileAddExpenseCard';
// Patch 2.2.3: Mobile-first layout components
import { TripDetailLayout } from '@/components/layout/TripDetailLayout';
import { type TripTab } from '@/components/layout/MobileBottomNav';
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// v3.9.5: Context to share capability-scoped permissions with child components
interface TripPermissionContextType {
  isOwner: boolean;
  canEdit: boolean;
  /** v3.9.5: Capability-scoped write flags */
  canAddExpenses: boolean;
  canAddLodging: boolean;
  canEditTripMeta: boolean;
  isReadOnlyOverall: boolean;
}

const TripPermissionContext = createContext<TripPermissionContextType>({
  isOwner: true,
  canEdit: true,
  canAddExpenses: true,
  canAddLodging: true,
  canEditTripMeta: true,
  isReadOnlyOverall: false,
});

export const useTripPermission = () => useContext(TripPermissionContext);

// v2.0.7: Types for drill-through navigation
// v2.1.0: Extended to support expenses tab
export type DrillThroughTarget = {
  tab: 'bookings' | 'parking' | 'expenses';
  recordId?: string;
} | null;

/** v2.6.21: Section labels for mobile header — normal casing */
const MOBILE_SECTION_LABELS: Partial<Record<TripTab, string>> = {
  now: 'Today',
  today: 'Today',
  plan: 'Flow',
  flow: 'Flow',
  ops: 'TravelOps',
  explore: 'Explore',
  weather: 'Weather',
  expenses: 'Expenses',
  bookings: 'Bookings',
  tour: 'Tour',
  members: 'Members',
  companions: 'Companions',
  parking: 'Parking',
  packing: 'Packing',
  alerts: 'Alerts',
  report: 'Report',
  notes: 'Notes & Safety',
  move: 'Move',
  guide: 'Guide',
};

export default function TripDetail() {
  const { tripId } = useParams<{ tripId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: trip, isLoading, isError, error: tripError } = useTrip(tripId || '');
  const { data: ownership, isLoading: ownershipLoading } = useTripOwnership(tripId || '');
  const { data: bookings = [] } = useBookings(tripId || '');
  const { isPro, canAccessBusinessFeatures, tier } = useAccess();
  const { hasDiscovered: hasDiscoveredExplore, markDiscovered: markExploreDiscovered } = useExploreDiscovery();
  // Patch 2.2.3: Mobile detection for bottom nav
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  // v2.3.4: On foreground resume, invalidate trip data so useNextStop re-evaluates
  useForegroundResume(useCallback(() => {
    if (!tripId) return;
    queryClient.invalidateQueries({ queryKey: ['bookings', tripId] });
    queryClient.invalidateQueries({ queryKey: ['expenses', tripId] });
    queryClient.invalidateQueries({ queryKey: ['parking', tripId] });
  }, [tripId, queryClient]));

  // Feed the ⌘K palette's "Recent" group whenever the user lands on a trip.
  useEffect(() => {
    if (!tripId) return;
    void import('@/hooks/useCommandPaletteIndex').then(m => m.rememberRecentTrip(tripId));
  }, [tripId]);

  // v2.0.7: Tab and drill-through state (desktop only — mobile uses MobileNavigationRouter)
  // v4.1.0: Read ?tab= query param so dashboard buttons land on the correct tab
  const initialTab = (searchParams.get('tab') as TripTab) || (isMobile ? 'today' : 'summary');
  const [activeTab, setActiveTab] = useState<TripTab>(initialTab);
  const [drillTarget, setDrillTarget] = useState<DrillThroughTarget>(null);
  // v2.3.5: Signal to auto-open Add Expense dialog on tab switch
  const [autoOpenExpense, setAutoOpenExpense] = useState(searchParams.get('addExpense') === '1' || searchParams.get('tab') === 'expenses');
  // v2.3.x: External tab override for mobile router
  const [mobileExternalTab, setMobileExternalTab] = useState<TripTab | undefined>(
    searchParams.get('tab') ? (searchParams.get('tab') as TripTab) : undefined
  );
  // v2.6.21: Track mobile active tab for header section title
  const [mobileActiveTab, setMobileActiveTab] = useState<TripTab>(initialTab === 'summary' ? 'today' : initialTab);

  // v2.5.0: Determine if trip has flights or is international for Travel Guide context
  const hasFlights = useMemo(() => {
    return bookings.some(b => b.booking_type === 'flight');
  }, [bookings]);

  // v4.0.1: Canonical state for Drive Mode entry card
  const { state: driveModeCanonicalState } = useCanonicalTripState(tripId || '', trip || null);

  const isInternational = useMemo(() => {
    const country = trip?.destination_country?.toLowerCase() || '';
    const isUS = country === 'usa' || country === 'us' || country === 'united states';
    return !isUS && country.length > 0;
  }, [trip?.destination_country]);

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

  // v2.1.29: Desktop tab change handler
  const handleTabChange = useCallback((value: string | TripTab) => {
    setActiveTab(value as TripTab);
    if (value === 'explore' && !hasDiscoveredExplore) {
      markExploreDiscovered();
    }
  }, [hasDiscoveredExplore, markExploreDiscovered]);

  // v2.3.x: Mobile "Add Expense" handler — sets external tab for mobile router
  const handleMobileAddExpense = useCallback(() => {
    if (isMobile) {
      setMobileExternalTab('expenses');
      setAutoOpenExpense(true);
    } else {
      setActiveTab('expenses');
      setAutoOpenExpense(true);
    }
  }, [isMobile]);

  const handleMobileExternalTabConsumed = useCallback(() => {
    setMobileExternalTab(undefined);
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

  // v3.9.10: Error state — handle fetch failures explicitly
  if (isError) {
    const isAuthError = tripError?.message?.includes('JWT') || tripError?.message?.includes('401') || tripError?.message?.includes('403');
    return (
      <Layout>
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">
            {isAuthError ? 'Session expired' : 'We couldn\'t load this trip'}
          </h2>
          <p className="text-muted-foreground mb-4">
            {isAuthError
              ? 'Please sign in again to continue.'
              : 'Something went wrong loading this trip. Please try again.'}
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild variant="outline">
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
            {isAuthError ? (
              <Button asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
            ) : (
              <Button onClick={() => window.location.reload()}>Retry</Button>
            )}
          </div>
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
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const isOwner = ownership?.isOwner ?? false;
  const canEdit = ownership?.canEdit ?? false;
  const canAddExpenses = ownership?.canAddExpenses ?? false;
  const canAddLodging = ownership?.canAddLodging ?? false;
  const canEditTripMeta = ownership?.canEditTripMeta ?? false;
  const isReadOnlyOverall = ownership?.isReadOnlyOverall ?? true;

  // v2.3.x: Shared header content for both mobile and desktop
  const renderTripHeader = () => (
    <div className="space-y-3 md:space-y-6 animate-fade-in pt-safe">
      {/* Back row */}
      <div className="flex flex-col gap-1.5 md:gap-4">
        <Button asChild variant="ghost" className="w-fit -ml-2 h-8 md:h-10 text-xs md:text-sm">
          <Link to="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-1 md:mr-2" />
            Back to Trips
          </Link>
        </Button>
      </div>

      {/* v2.3.x: TripStatusHeroBar */}
      <TripStatusHeroBar trip={trip} />

      {/* Desktop-only: full trip metadata */}
      <div className="hidden md:flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">{trip.name}</h1>
            {!isOwner && (
              <Badge variant="outline" className="flex items-center gap-1 bg-primary/5 text-xs">
                <Users className="w-3 h-3" />
                {canEdit ? 'Shared (Edit)' : 'View Only'}
              </Badge>
            )}
          </div>
          <p className="flex flex-wrap items-center gap-4 text-base text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-4 h-4 shrink-0" />
              {trip.destination_city}, {trip.destination_country}
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4 shrink-0" />
              {format(new Date(trip.start_date + 'T00:00:00'), 'MMM d')} – {format(new Date(trip.end_date + 'T00:00:00'), 'MMM d, yyyy')}
            </span>
          </p>
        </div>
      </div>

      {/* Mobile-only: mode bar + metadata */}
      <div className="md:hidden">
        {/* v2.6.24: Subtle divider */}
        {isMobile && (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-primary px-0.5 mt-4 mb-2.5 select-none">
              {MOBILE_SECTION_LABELS[mobileActiveTab] || 'Now'}
            </p>
          </>
        )}
        <p className="flex flex-wrap items-center gap-1.5 text-[13px] leading-relaxed text-muted-foreground px-0.5">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {trip.destination_city}, {trip.destination_country}
          </span>
          <span className="text-muted-foreground/30">·</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            {format(new Date(trip.start_date + 'T00:00:00'), 'MMM d')} – {format(new Date(trip.end_date + 'T00:00:00'), 'MMM d, yyyy')}
          </span>
        </p>
        {!isOwner && (
          <Badge variant="outline" className="flex items-center gap-1 bg-primary/5 text-[10px] mt-1 w-fit">
            <Users className="w-3 h-3" />
            {canEdit ? 'Shared (Edit)' : 'View Only'}
          </Badge>
        )}
      </div>

      {/* v2.6.13: Primary zone — single-row horizontal scroll on mobile */}
      {/* v2.6.19: MobileNextUpCard and MobileAddExpenseCard moved to NOW execution pills — only ProRetention stays in header */}
      <div className="flex gap-2 overflow-x-auto md:flex-col md:overflow-visible md:space-y-6 md:gap-0 px-0.5 md:px-0 scrollbar-hide pb-1 md:pb-0">
        <div className="shrink-0 md:shrink md:w-full min-w-[280px] md:min-w-0">
          <ProRetentionCountdownCard trip={trip} />
        </div>
        {/* v4.0.1: Drive Mode entry card */}
        <div className="shrink-0 md:shrink md:w-full min-w-[280px] md:min-w-0">
          <DriveModeEntryCard tripId={trip.id} trip={trip} canonicalState={driveModeCanonicalState} />
        </div>
        <div className="hidden md:block shrink-0 md:shrink md:w-full min-w-[280px] md:min-w-0">
          <MobileNextUpCard tripId={trip.id} trip={trip} />
        </div>
        <div className="hidden md:block shrink-0 md:shrink md:w-full min-w-[240px] md:min-w-0">
          <MobileAddExpenseCard onTap={handleMobileAddExpense} />
        </div>
      </div>

      {/* v3.9.5: Capability-scoped banner — only show when truly read-only */}
      {!isOwner && isReadOnlyOverall && (
        <div className="flex items-center gap-2 p-3 bg-muted/50 border rounded-lg text-sm text-muted-foreground">
          <Eye className="w-4 h-4" />
          <span className="text-xs sm:text-sm">You're viewing this trip in read-only mode. Only the trip owner can make changes.</span>
        </div>
      )}
      {/* v3.9.5: Scoped access banner — when guest has some but not all capabilities */}
      {!isOwner && !isReadOnlyOverall && (
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-muted-foreground">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-xs sm:text-sm">
            Limited access: You can {[
              canAddExpenses && 'add expenses',
              canAddLodging && 'add lodging',
            ].filter(Boolean).join(' and ')}.
          </span>
        </div>
      )}

      {/* Widget container — desktop only; mobile renders inside NOW tab via ExecutionZone */}
      <div className="mt-1.5 md:mt-0 hidden md:block">
        <TripHeaderWidgets trip={trip} />
      </div>

    </div>
  );

  return (
    <TripPermissionContext.Provider value={{ isOwner, canEdit, canAddExpenses, canAddLodging, canEditTripMeta, isReadOnlyOverall }}>
      <Layout>
        <ErrorBoundary context="TripDetail">
        {/* v2.3.x: Mobile uses MobileNavigationRouter, desktop uses existing Tabs */}
        {isMobile ? (
          <>
            {renderTripHeader()}
            <MobileNavigationRouter
              tripId={trip.id}
              trip={trip}
              drillTarget={drillTarget}
              onDrillThrough={handleDrillThrough}
              clearDrillTarget={clearDrillTarget}
              autoOpenExpense={autoOpenExpense}
              onAutoOpenConsumed={() => setAutoOpenExpense(false)}
              externalTab={mobileExternalTab}
              onExternalTabConsumed={handleMobileExternalTabConsumed}
              onActiveTabChange={setMobileActiveTab}
            />
          </>
        ) : (
          <TripDetailLayout 
            activeTab={activeTab} 
            onTabChange={handleTabChange}
            showBottomNav={false}
          >
            {renderTripHeader()}

            {/* v2.6.12: DesktopTripShell — canonical state computed once for all tabs */}
            <DesktopTripShell tripId={trip.id} trip={trip}>
              {/* Desktop tab content section */}
              <div className="mt-4 md:mt-0">
                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                  <TabsList className="w-full justify-start overflow-x-auto flex-nowrap hidden md:flex">
                    <TabsTrigger value="summary">Timeline</TabsTrigger>
                    <TabsTrigger value="ops">TravelOps</TabsTrigger>
                    <TabsTrigger value="bookings">Bookings</TabsTrigger>
                    <TabsTrigger value="explore" className="relative">
                      Explore
                      {!hasDiscoveredExplore && (
                        <Badge 
                          variant="secondary" 
                          className="absolute -top-1.5 -right-1.5 h-4 px-1.5 text-[10px] font-semibold bg-primary text-primary-foreground"
                        >
                          New
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="packing">Packing</TabsTrigger>
                    <TabsTrigger value="weather">Weather</TabsTrigger>
                    <TabsTrigger value="parking">Parking</TabsTrigger>
                    {isPro && (
                      <TabsTrigger value="report">Report</TabsTrigger>
                    )}
                    <TabsTrigger value="members">Members</TabsTrigger>
                    <TabsTrigger value="companions">Companions</TabsTrigger>
                    {canAccessBusinessFeatures && (
                      <TabsTrigger value="tour">Tour</TabsTrigger>
                    )}
                    <TabsTrigger value="notes">Notes & Safety</TabsTrigger>
                  </TabsList>

                  <div className="mt-4 sm:mt-6">
                    <TabsContent value="summary">
                      <TripSummaryContainer tripId={trip.id} trip={trip} onDrillThrough={handleDrillThrough} onExploreTab={() => handleTabChange('explore')} />
                    </TabsContent>
                    <TabsContent value="bookings">
                      <TripBookingsContainer 
                        tripId={trip.id}
                        trip={trip}
                        highlightId={drillTarget?.tab === 'bookings' ? drillTarget.recordId : undefined}
                        onHighlightConsumed={clearDrillTarget}
                      />
                    </TabsContent>
                    <TabsContent value="ops">
                      <TravelOpsTab tripId={trip.id} trip={trip} />
                    </TabsContent>
                    <TabsContent value="timeline">
                      <TripBookingsContainer tripId={trip.id} trip={trip} />
                    </TabsContent>
                    {canAccessBusinessFeatures && (
                      <TabsContent value="tour">
                        <TripTourContainer tripId={trip.id} trip={trip} />
                      </TabsContent>
                    )}
                    <TabsContent value="companions">
                      <CompanionsTab tripId={trip.id} />
                    </TabsContent>
                    <TabsContent value="members">
                      <MembersTab tripId={trip.id} />
                    </TabsContent>
                    <TabsContent value="expenses">
                      <TripExpensesContainer tripId={trip.id} trip={trip} autoOpenAdd={autoOpenExpense} onAutoOpenConsumed={() => setAutoOpenExpense(false)} />
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
                    <TabsContent value="explore">
                      <ExploreTab tripId={trip.id} trip={trip} />
                    </TabsContent>
                    <TabsContent value="weather">
                      <WeatherTab tripId={trip.id} trip={trip} />
                    </TabsContent>
                    {isPro && (
                      <TabsContent value="report">
                        <TripSummaryReportTab tripId={trip.id} />
                      </TabsContent>
                    )}
                    <TabsContent value="notes">
                      <NotesTab tripId={trip.id} />
                    </TabsContent>
                    <TabsContent value="alerts">
                      <TripAlertsContainer tripId={trip.id} trip={trip} />
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </DesktopTripShell>
          </TripDetailLayout>
        )}
        </ErrorBoundary>
      </Layout>
    </TripPermissionContext.Provider>
  );
}
