/**
 * MobileNavigationRouter — Canonical mobile navigation container
 * 
 * v2.3.x: Mobile Redesign v3 — intent-based bottom navigation
 * v3.5.1: Removed per-entry Explore origin hints — ExploreTab auto-resolves
 */

import { useState, useCallback, useEffect } from 'react';
import { Trip } from '@/types/database';
import { useAccess } from '@/hooks/useAccess';
import { useExploreDiscovery } from '@/hooks/useExploreDiscovery';
import { useCanonicalTripState } from '@/hooks/useCanonicalTripState';
import { useUserProfile } from '@/hooks/useUserProfile';
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
import { ParkingTab } from '@/components/trips/tabs/ParkingTab';
import { PackingTab } from '@/components/trips/tabs/PackingTab';
import { CompanionsTab } from '@/components/trips/tabs/CompanionsTab';
import { MembersTab } from '@/components/trips/tabs/MembersTab';
import { NotesTab } from '@/components/trips/tabs/NotesTab';
import { ExploreTab } from '@/components/trips/tabs/ExploreTab';
import { TripSummaryReportTab } from '@/components/trips/tabs/TripSummaryReportTab';
import type { DrillThroughTarget } from '@/pages/TripDetail';

/**
 * Tabs shown via the "More" menu that get a section header on mobile.
 * Primary tabs (now, plan, explore, expenses) do NOT get a section header.
 */
const MORE_TAB_LABELS: Partial<Record<TripTab, string>> = {
  bookings: 'Bookings',
  tour: 'Tour',
  members: 'Members',
  companions: 'Companions',
  parking: 'Parking',
  packing: 'Packing',
  alerts: 'Alerts',
  report: 'Report',
  notes: 'Notes & Safety',
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
  const { isPro, canAccessBusinessFeatures } = useAccess();
  const { hasDiscovered: hasDiscoveredExplore, markDiscovered: markExploreDiscovered } = useExploreDiscovery();
  const { timelineEvents } = useCanonicalTripState(tripId, trip);
  const { data: userProfile } = useUserProfile();
  const datetimeFormat = (userProfile?.preferred_datetime_format as 'MM/DD/YYYY 12h' | 'DD/MM/YYYY 24h') || 'MM/DD/YYYY 12h';

  const [activeTab, setActiveTabRaw] = useState<TripTab>('now');
  const [planSubView, setPlanSubView] = useState<'timeline' | 'bookings'>('timeline');

  const setActiveTab = useCallback((tab: TripTab) => {
    setActiveTabRaw(tab);
    onActiveTabChange?.(tab);
  }, [onActiveTabChange]);

  // Legacy route protection
  useEffect(() => {
    if (activeTab === 'summary') {
      setActiveTab('now');
    } else if (activeTab === 'timeline') {
      setActiveTab('plan');
      setPlanSubView('timeline');
    }
  }, [activeTab]);

  // Consume external tab changes
  useEffect(() => {
    if (externalTab) {
      if (externalTab === 'summary') {
        setActiveTab('now');
      } else if (externalTab === 'expenses') {
        setActiveTab('expenses');
      } else {
        setActiveTab(externalTab);
      }
      onExternalTabConsumed?.();
    }
  }, [externalTab, onExternalTabConsumed]);

  // v3.5.1: Canonical tab change — no per-entry origin logic
  const handleTabChange = useCallback((tab: TripTab) => {
    if (tab === 'summary') {
      setActiveTab('now');
      return;
    }
    if (tab === 'timeline') {
      setActiveTab('plan');
      setPlanSubView('timeline');
      return;
    }
    setActiveTab(tab);
    
    if (tab === 'explore' && isPro && !hasDiscoveredExplore) {
      markExploreDiscovered();
    }
  }, [isPro, hasDiscoveredExplore, markExploreDiscovered]);

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
            onTimeline={() => { handleTabChange('plan'); setPlanSubView('timeline'); }}
          />
        );
      case 'plan':
        return (
          <div>
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 mb-3">
              <button
                onClick={() => setPlanSubView('timeline')}
                className={`flex-1 text-xs font-semibold py-2 rounded-md transition-colors ${
                  planSubView === 'timeline'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setPlanSubView('bookings')}
                className={`flex-1 text-xs font-semibold py-2 rounded-md transition-colors ${
                  planSubView === 'bookings'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Bookings
              </button>
            </div>
            {planSubView === 'timeline' ? (
              <TripTimeline events={timelineEvents} datetimeFormat={datetimeFormat} />
            ) : (
              <TripBookingsContainer tripId={tripId} trip={trip} />
            )}
          </div>
        );
      case 'explore':
        return <ExploreTab tripId={tripId} trip={trip} />;
      case 'expenses':
        return (
          <TripExpensesContainer
            tripId={tripId} 
            trip={trip} 
            autoOpenAdd={autoOpenExpense} 
            onAutoOpenConsumed={onAutoOpenConsumed} 
          />
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
            onTimeline={() => { handleTabChange('plan'); setPlanSubView('timeline'); }}
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
