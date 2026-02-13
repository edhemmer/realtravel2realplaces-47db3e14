/**
 * MobileNavigationRouter — Canonical mobile navigation container
 * 
 * v2.3.x: Mobile Redesign v3 — intent-based bottom navigation
 * 
 * This is the SINGLE source of truth for mobile tab state and routing.
 * All mobile navigation flows through this container.
 * 
 * RESPONSIBILITIES:
 * 1. Owns selected tab state for mobile (no per-tab trip fetching)
 * 2. Enforces mobile default entry: NOW if activeTrip, else trip selection
 * 3. Legacy Summary → NOW redirect on mobile
 * 4. Tab switching does not trigger duplicate network calls
 * 
 * ARCHITECTURE:
 * TripDetail (mobile) → MobileNavigationRouter → Tab Content
 * TripDetail (desktop) → existing Tabs component (unchanged)
 * 
 * TAB MAPPING (mobile intent → content):
 * - now     → TripSummaryContainer (primary zone: status, next-up, alerts)
 * - plan    → TripBookingsContainer (chronological planning view)
 * - explore → ExploreTab
 * - money   → TripExpensesContainer
 * - bookings/tour/companions/members/parking/packing/alerts/report/notes → More menu tabs
 */

import { useState, useCallback, useEffect } from 'react';
import { Trip } from '@/types/database';
import { useAccess } from '@/hooks/useAccess';
import { useExploreDiscovery } from '@/hooks/useExploreDiscovery';
import { TripDetailLayout, type TripTab } from '@/components/layout';
import { MobileSectionHeader } from '@/components/trips/MobileSectionHeader';
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
 * Primary tabs (now, plan, explore, money) do NOT get a section header.
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

/** Legacy tabs that should redirect to NOW on mobile */
const LEGACY_REDIRECT_TABS: TripTab[] = ['summary', 'timeline'];

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

  // v3.1.0: timelineEvents no longer needed here — NowCommandCenter handles its own state

  // v2.3.x: Mobile tab state — defaults to 'now'
  const [activeTab, setActiveTabRaw] = useState<TripTab>('now');

  // v2.6.21: Wrap setActiveTab to report changes to parent
  const setActiveTab = useCallback((tab: TripTab) => {
    setActiveTabRaw(tab);
    onActiveTabChange?.(tab);
  }, [onActiveTabChange]);

  // v2.3.x: Legacy route protection — redirect summary/timeline → now
  useEffect(() => {
    if (LEGACY_REDIRECT_TABS.includes(activeTab)) {
      setActiveTab('now');
    }
  }, [activeTab]);

  // v2.3.x: Consume external tab changes (e.g. from MobileAddExpenseCard)
  useEffect(() => {
    if (externalTab) {
      // Map legacy tabs to mobile equivalents
      if (externalTab === 'summary') {
        setActiveTab('now');
      } else if (externalTab === 'expenses') {
        setActiveTab('money');
      } else {
        setActiveTab(externalTab);
      }
      onExternalTabConsumed?.();
    }
  }, [externalTab, onExternalTabConsumed]);

  // v2.3.x: Canonical tab change handler — no duplicate fetching
  const handleTabChange = useCallback((tab: TripTab) => {
    // Redirect legacy tabs
    if (LEGACY_REDIRECT_TABS.includes(tab)) {
      setActiveTab('now');
      return;
    }
    setActiveTab(tab);
    
    // Mark Explore as discovered when switching to that tab
    if (tab === 'explore' && isPro && !hasDiscoveredExplore) {
      markExploreDiscovered();
    }
  }, [isPro, hasDiscoveredExplore, markExploreDiscovered]);

  // v2.6.19: Add Expense from NOW pills — switch to money tab
  const handleNowAddExpense = useCallback(() => {
    setActiveTab('money');
  }, []);

  /** Render content for the active tab */
  const renderTabContent = () => {
    // Show section header for "More" menu tabs
    const sectionLabel = MORE_TAB_LABELS[activeTab];

    return (
      <div className="mt-2">
        {/* v3.1.0: NOW tab content handled entirely by NowCommandCenter */}
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
      // Primary mobile tabs
      case 'now':
        return (
          <NowCommandCenter
            tripId={tripId}
            trip={trip}
            onViewFullTimeline={() => handleTabChange('plan')}
            onAddExpense={handleNowAddExpense}
            onExplore={() => handleTabChange('explore')}
            onParking={() => handleTabChange('parking')}
            onViewAllAlerts={() => handleTabChange('alerts')}
          />
        );
      case 'plan':
        return <TripBookingsContainer tripId={tripId} trip={trip} />;
      case 'explore':
        return <ExploreTab tripId={tripId} trip={trip} />;
      case 'money':
        return (
          <TripExpensesContainer 
            tripId={tripId} 
            trip={trip} 
            autoOpenAdd={autoOpenExpense} 
            onAutoOpenConsumed={onAutoOpenConsumed} 
          />
        );

      // More menu tabs
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

      // Fallback — should not happen due to legacy redirect
      default:
        return (
          <NowCommandCenter
            tripId={tripId}
            trip={trip}
            onViewFullTimeline={() => handleTabChange('plan')}
            onAddExpense={handleNowAddExpense}
            onExplore={() => handleTabChange('explore')}
            onParking={() => handleTabChange('parking')}
            onViewAllAlerts={() => handleTabChange('alerts')}
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
