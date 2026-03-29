/**
 * MobileNavigationRouter — Canonical mobile navigation container
 * 
 * v2.3.x: Mobile Redesign v3 — intent-based bottom navigation
 * v3.5.1: Removed per-entry Explore origin hints — ExploreTab auto-resolves
 * v3.12.4: Explore nearby from timeline sets context + navigates to Explore
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trip } from '@/types/database';
import { useAccess } from '@/hooks/useAccess';
import { useExploreDiscovery } from '@/hooks/useExploreDiscovery';
import { setExploreContext } from '@/lib/explore/exploreContextStore';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isOnline } from '@/lib/networkStatus';
import { getOfflineTimelineWindow } from '@/lib/getOfflineTimelineWindow';
import { WifiOff } from 'lucide-react';
import { TripDetailLayout, type TripTab } from '@/components/layout';
import { MobileSectionHeader } from '@/components/trips/MobileSectionHeader';
import { TripTimeline } from '@/components/trips/TripTimeline';
import {
  TripBookingsContainer,
  TripTourContainer,
  TripExpensesContainer,
  TripAlertsContainer,
} from '@/containers';
import { NowCommandCenter } from '@/containers/NowCommandCenter';
import { MoveTab } from '@/components/trips/tabs/MoveTab';
import { GuideTab } from '@/components/trips/tabs/GuideTab';
import { ParkingTab } from '@/components/trips/tabs/ParkingTab';
import { PackingTab } from '@/components/trips/tabs/PackingTab';
import { CompanionsTab } from '@/components/trips/tabs/CompanionsTab';
import { MembersTab } from '@/components/trips/tabs/MembersTab';
import { NotesTab } from '@/components/trips/tabs/NotesTab';
import { ExploreTab } from '@/components/trips/tabs/ExploreTab';
import { WeatherTab } from '@/components/trips/tabs/WeatherTab';
import { TripSummaryReportTab } from '@/components/trips/tabs/TripSummaryReportTab';
import type { DrillThroughTarget } from '@/pages/TripDetail';

/**
 * Tabs shown via the "More" menu that get a section header on mobile.
 * Primary tabs (now, plan, explore, expenses) do NOT get a section header.
 */
const MORE_TAB_LABELS: Partial<Record<TripTab, string>> = {
  now: 'Now',
  today: 'Today',
  flow: 'Flow',
  move: 'Move',
  guide: 'Guide',
  weather: 'Weather',
  parking: 'Parking',
  tour: 'Tour',
  members: 'Members',
  companions: 'Companions',
  alerts: 'Alerts',
  report: 'Report',
  notes: 'Notes & Safety',
  bookings: 'Bookings',
  explore: 'Explore',
  packing: 'Packing',
};

interface MobileNavigationRouterProps {
  tripId: string;
  trip: Trip;
  /** Drill-through target from timeline links */
  drillTarget: DrillThroughTarget;
  onDrillThrough: (target: DrillThroughTarget) => void;
  clearDrillTarget: () => void;
  /** Signal to auto-open Add Expense dialog */
  autoOpenExpense: boolean;
  onAutoOpenConsumed: () => void;
  /** External tab override (e.g. from MobileAddExpenseCard) */
  externalTab?: TripTab;
  onExternalTabConsumed?: () => void;
  /** v2.6.21: Report active tab to parent for header section title */
  onActiveTabChange?: (tab: TripTab) => void;
}

export function MobileNavigationRouter({
  tripId,
  trip,
  drillTarget,
  onDrillThrough,
  clearDrillTarget,
  autoOpenExpense,
  onAutoOpenConsumed,
  externalTab,
  onExternalTabConsumed,
  onActiveTabChange,
}: MobileNavigationRouterProps) {
  const [searchParams] = useSearchParams();
  const { isPro, canAccessBusinessFeatures } = useAccess();
  const { hasDiscovered: hasDiscoveredExplore, markDiscovered: markExploreDiscovered } = useExploreDiscovery();
  const canonicalState = useCanonicalTripState(tripId, trip);
  const { timelineEvents, state } = canonicalState;
  const { data: userProfile } = useUserProfile();
  // v5.1: Recover auto-open signal from URL in case prop was consumed before mobile mounted
  const urlWantsAddExpense = searchParams.get('addExpense') === '1';
  const [localAutoOpen, setLocalAutoOpen] = useState(urlWantsAddExpense);
  const effectiveAutoOpen = autoOpenExpense || localAutoOpen;
  const handleAutoOpenConsumed = useCallback(() => {
    setLocalAutoOpen(false);
    onAutoOpenConsumed();
  }, [onAutoOpenConsumed]);
  const online = isOnline();
  const displayEvents = useMemo(() => {
    if (online) return timelineEvents;
    return getOfflineTimelineWindow(state);
  }, [online, timelineEvents, state]);
  const datetimeFormat = (userProfile?.preferred_datetime_format as 'MM/DD/YYYY 12h' | 'DD/MM/YYYY 24h') || 'MM/DD/YYYY 12h';

  // v4.1.0: Initialize from externalTab so dashboard ?tab= links land correctly
  const resolveInitialTab = (tab?: TripTab): TripTab => {
    if (!tab) return 'today';
    if (tab === 'summary') return 'today';
    if (tab === 'now') return 'today';
    if (tab === 'plan') return 'flow';
    return tab;
  };
  const [activeTab, setActiveTabRaw] = useState<TripTab>(resolveInitialTab(externalTab));
  const [planSubView] = useState<'timeline' | 'bookings'>('timeline');

  const setActiveTab = useCallback((tab: TripTab) => {
    setActiveTabRaw(tab);
    onActiveTabChange?.(tab);
  }, [onActiveTabChange]);

  // Legacy route protection
  useEffect(() => {
    if (activeTab === 'summary') {
      setActiveTab('today');
    } else if (activeTab === 'timeline') {
      setActiveTab('flow');
    } else if (activeTab === 'plan') {
      setActiveTab('flow');
    } else if (activeTab === 'now') {
      setActiveTab('today');
    }
  }, [activeTab]);

  // Consume external tab changes
  useEffect(() => {
    if (externalTab) {
      if (externalTab === 'summary' || externalTab === 'now') {
        setActiveTab('today');
      } else if (externalTab === 'plan' || externalTab === 'timeline') {
        setActiveTab('flow');
      } else {
        setActiveTab(externalTab);
      }
      onExternalTabConsumed?.();
    }
  }, [externalTab, onExternalTabConsumed]);

  // v3.5.1: Canonical tab change
  const handleTabChange = useCallback((tab: TripTab) => {
    if (tab === 'summary' || tab === 'now') {
      setActiveTab('today');
      return;
    }
    if (tab === 'timeline' || tab === 'plan') {
      setActiveTab('flow');
      return;
    }
    setActiveTab(tab);
    
    if (tab === 'explore' && !hasDiscoveredExplore) {
      markExploreDiscovered();
    }
  }, [hasDiscoveredExplore, markExploreDiscovered]);

  // v3.12.4: Explore nearby from timeline item
  const handleExploreNearby = useCallback((eventId: string) => {
    setExploreContext(tripId, { kind: 'TIMELINE_ITEM', id: eventId });
    handleTabChange('explore');
  }, [tripId, handleTabChange]);

  const renderTabContent = () => {
    const sectionLabel = MORE_TAB_LABELS[activeTab];
    return (
      <div className="mt-2">
        {sectionLabel && (
          <MobileSectionHeader
            sectionTitle={sectionLabel}
            tripName={trip.name}
          />
        )}
        {renderActiveTab()}
      </div>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'now':
        return (
          <NowCommandCenter
            tripId={tripId}
            trip={trip}
            onViewFullTimeline={() => handleTabChange('plan')}
            onParking={() => handleTabChange('parking')}
            onViewAllAlerts={() => handleTabChange('alerts')}
            onAddExpense={() => handleTabChange('expenses')}
            onExplore={() => handleTabChange('explore')}
            onTimeline={() => handleTabChange('plan')}
          />
        );
      case 'plan':
        return (
          <div>
            {!online && displayEvents.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-muted/40 border border-border/30">
                <WifiOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Offline Mode</p>
                  <p className="text-[11px] text-muted-foreground/70">Showing upcoming trip timeline from cached data.</p>
                </div>
              </div>
            )}
            {!online && displayEvents.length === 0 && (
              <div className="flex items-center gap-2 px-3 py-6 rounded-lg bg-muted/30 border border-border/30 justify-center">
                <WifiOff className="w-4 h-4 text-muted-foreground/60" />
                <p className="text-xs text-muted-foreground">Offline — Trip details will appear when a connection is available.</p>
              </div>
            )}
            <TripTimeline events={displayEvents} datetimeFormat={datetimeFormat} onExploreNearby={handleExploreNearby} />
          </div>
        );
      case 'bookings':
        return (
          <TripBookingsContainer 
            tripId={tripId}
            trip={trip}
            highlightId={drillTarget?.tab === 'bookings' ? drillTarget.recordId : undefined}
            onHighlightConsumed={clearDrillTarget}
          />
        );
      case 'explore':
        return <ExploreTab tripId={tripId} trip={trip} />;
      case 'expenses':
        return (
          <TripExpensesContainer
            tripId={tripId} 
            trip={trip} 
            autoOpenAdd={effectiveAutoOpen} 
            onAutoOpenConsumed={handleAutoOpenConsumed} 
          />
        );
      case 'tour':
        return canAccessBusinessFeatures ? <TripTourContainer tripId={tripId} trip={trip} /> : null;
      case 'companions':
        return <CompanionsTab tripId={tripId} />;
      case 'members':
        return <MembersTab tripId={tripId} />;
      case 'parking':
        return (
          <ParkingTab 
            tripId={tripId}
            highlightId={drillTarget?.tab === 'parking' ? drillTarget.recordId : undefined}
            onHighlightConsumed={clearDrillTarget}
          />
        );
      case 'packing':
        return <PackingTab tripId={tripId} />;
      case 'weather':
        return <WeatherTab tripId={tripId} trip={trip} />;
      case 'alerts':
        return <TripAlertsContainer tripId={tripId} trip={trip} />;
      case 'report':
        return isPro ? <TripSummaryReportTab tripId={tripId} /> : null;
      case 'notes':
        return <NotesTab tripId={tripId} />;
      default:
        return (
          <NowCommandCenter
            tripId={tripId}
            trip={trip}
            onViewFullTimeline={() => handleTabChange('plan')}
            onParking={() => handleTabChange('parking')}
            onViewAllAlerts={() => handleTabChange('alerts')}
            onAddExpense={() => handleTabChange('expenses')}
            onExplore={() => handleTabChange('explore')}
            onTimeline={() => handleTabChange('plan')}
          />
        );
    }
  };

  return (
    <TripDetailLayout
      activeTab={activeTab}
      onTabChange={handleTabChange}
      showBottomNav={true}
    >
      {renderTabContent()}
    </TripDetailLayout>
  );
}
