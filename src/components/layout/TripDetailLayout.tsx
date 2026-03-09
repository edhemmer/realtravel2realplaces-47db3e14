/**
 * TripDetailLayout - v6.0.0 Premium mobile-first layout wrapper
 */

import { ReactNode } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileBottomNav, TripTab } from './MobileBottomNav';
import { BackToTopButton } from '@/components/trips/BackToTopButton';
import { cn } from '@/lib/utils';

interface TripDetailLayoutProps {
  children: ReactNode;
  activeTab: TripTab;
  onTabChange: (tab: TripTab) => void;
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
      isMobile && showBottomNav && "pb-[calc(5rem+env(safe-area-inset-bottom,0px))]"
    )}>
      {/* Main content area */}
      <div className="w-full">
        {children}
      </div>
      
      {/* Mobile bottom navigation */}
      {isMobile && showBottomNav && (
        <>
          <BackToTopButton />
          <MobileBottomNav 
            activeTab={activeTab} 
            onTabChange={onTabChange} 
          />
        </>
      )}
    </div>
  );
}