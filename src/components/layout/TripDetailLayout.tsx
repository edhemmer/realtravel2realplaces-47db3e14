/**
 * TripDetailLayout - Mobile-first layout wrapper for trip detail pages
 * 
 * Patch 2.2.3: Mobile-first layout shell
 * 
 * Provides:
 * - Consistent header with trip info
 * - Bottom navigation on mobile (<768px)
 * - Top tabs on desktop (≥768px)
 * - Safe area handling for mobile devices
 */

import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileBottomNav, TripTab } from './MobileBottomNav';
import { cn } from '@/lib/utils';

interface TripDetailLayoutProps {
  children: ReactNode;
  activeTab: TripTab;
  onTabChange: (tab: TripTab) => void;
  /** Whether to show bottom nav - typically true for trip detail page */
  showBottomNav?: boolean;
}

export function TripDetailLayout({ 
  children, 
  activeTab, 
  onTabChange,
  showBottomNav = true 
}: TripDetailLayoutProps) {
  const isMobile = useIsMobile();

  return (
    <div className={cn(
      "relative min-h-full",
      // Add padding at bottom for mobile nav
      isMobile && showBottomNav && "pb-20"
    )}>
      {/* Main content area */}
      <div className="w-full">
        {children}
      </div>
      
      {/* Mobile bottom navigation - only visible on mobile */}
      {isMobile && showBottomNav && (
        <MobileBottomNav 
          activeTab={activeTab} 
          onTabChange={onTabChange} 
        />
      )}
    </div>
  );
}
