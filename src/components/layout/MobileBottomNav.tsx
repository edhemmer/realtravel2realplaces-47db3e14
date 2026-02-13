/**
 * MobileBottomNav - Bottom navigation bar for mobile viewports
 * 
 * Patch 2.2.3: Mobile-first layout shell
 * v2.6.9: More dropdown aligned to card surface system
 * v2.6.10: Bottom nav surface, active-tab, and icon-label spacing normalized
 * 
 * Surface: bg-card, border-border/60, shadow-lg (no blur/opacity)
 * Active: text-primary font-semibold bg-primary/10
 * Inactive: text-muted-foreground font-medium
 * Icon-label: gap-1, text-[10px] leading-none
 * More dropdown: rounded-xl, w-52, h-10 rows, max-w-[calc(100vw-1rem)]
 * 
 * Primary tabs: Summary, Timeline, Expenses, Alerts
 * More menu: Bookings, Tour (Business), Members, Companions, Parking, Packing, Explore, Report (Pro), Notes & Safety
 */

import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Plane, 
  MapPin, 
  Receipt, 
  MoreHorizontal,
  Package,
  CircleParking,
  Users,
  Compass,
  FileText,
  StickyNote,
  Clock,
  Bell
} from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type TripTab = 
  | 'summary' 
  | 'bookings' 
  | 'tour' 
  | 'companions'
  | 'members'
  | 'expenses' 
  | 'parking'
  | 'packing'
  | 'explore'
  | 'report'
  | 'notes'
  | 'timeline'
  | 'alerts';

interface MobileBottomNavProps {
  activeTab: TripTab;
  onTabChange: (tab: TripTab) => void;
  className?: string;
}

interface NavItem {
  id: TripTab;
  label: string;
  icon: React.ReactNode;
  requiresBusiness?: boolean;
  requiresPro?: boolean;
}

const PRIMARY_NAV_ITEMS: NavItem[] = [
  { id: 'summary', label: 'Summary', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'timeline', label: 'Timeline', icon: <Clock className="w-5 h-5" /> },
  { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-5 h-5" /> },
  { id: 'alerts', label: 'Alerts', icon: <Bell className="w-5 h-5" /> },
];

const MORE_NAV_ITEMS: NavItem[] = [
  { id: 'bookings', label: 'Bookings', icon: <Plane className="w-4 h-4" /> },
  { id: 'tour', label: 'Tour', icon: <MapPin className="w-4 h-4" />, requiresBusiness: true },
  { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> },
  { id: 'companions', label: 'Companions', icon: <Users className="w-4 h-4" /> },
  { id: 'parking', label: 'Parking', icon: <CircleParking className="w-4 h-4" /> },
  { id: 'packing', label: 'Packing', icon: <Package className="w-4 h-4" /> },
  { id: 'explore', label: 'Explore', icon: <Compass className="w-4 h-4" /> },
  { id: 'report', label: 'Report', icon: <FileText className="w-4 h-4" />, requiresPro: true },
  { id: 'notes', label: 'Notes & Safety', icon: <StickyNote className="w-4 h-4" /> },
];

export function MobileBottomNav({ activeTab, onTabChange, className }: MobileBottomNavProps) {
  const { canAccessBusinessFeatures, isPro } = useAccess();
  
  // Filter primary items based on access
  const visiblePrimaryItems = PRIMARY_NAV_ITEMS.filter(item => {
    if (item.requiresBusiness) return canAccessBusinessFeatures;
    return true;
  });

  // Filter more items based on access
  const visibleMoreItems = MORE_NAV_ITEMS.filter(item => {
    if (item.requiresBusiness) return canAccessBusinessFeatures;
    if (item.requiresPro) return isPro;
    return true;
  });

  // Check if active tab is in "More" menu
  const isMoreActive = visibleMoreItems.some(item => item.id === activeTab);

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-card border-t border-border/60 shadow-lg",
        "pb-safe",
        className
      )}
    >
      <div className="flex items-center justify-around h-16 px-2 pb-safe">
        {visiblePrimaryItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-lg transition-colors min-w-[56px] min-h-[44px]",
              "touch-manipulation",
              activeTab === item.id
                ? "text-primary font-semibold bg-primary/10"
                : "text-muted-foreground font-medium hover:text-foreground hover:bg-muted/50"
            )}
          >
            {item.icon}
            <span className="text-[10px] leading-none">{item.label}</span>
          </button>
        ))}
        
        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-1.5 px-3 rounded-lg transition-colors min-w-[56px] min-h-[44px]",
                "touch-manipulation",
                isMoreActive
                  ? "text-primary font-semibold bg-primary/10"
                  : "text-muted-foreground font-medium hover:text-foreground hover:bg-muted/50"
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] leading-none">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            side="top" 
            align="end" 
            className="w-52 mb-2 rounded-xl border-border/60 bg-card shadow-lg p-1.5 max-w-[calc(100vw-1rem)]"
            sideOffset={8}
          >
            {visibleMoreItems.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "cursor-pointer h-10 gap-3 px-3 rounded-lg text-sm font-medium",
                  activeTab === item.id && "bg-primary/10 text-primary"
                )}
              >
                <span className="w-4 h-4 shrink-0 flex items-center justify-center">{item.icon}</span>
                <span>{item.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
}
