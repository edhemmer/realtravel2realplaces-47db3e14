/**
 * MobileBottomNav - v6.0.0 Ultra-premium bottom navigation
 * 
 * Premium surface with frosted glass, refined spacing, smooth interactions.
 * Active: primary with subtle background tint
 * Inactive: muted with hover feedback
 */

import { cn } from '@/lib/utils';
import { 
  CalendarDays,
  Compass,
  DollarSign,
  MoreHorizontal,
  Plane,
  MapPin,
  Package,
  CircleParking,
  Users,
  FileText,
  StickyNote,
  Bell,
  CloudSun,
} from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type TripTab = 
  | 'now'
  | 'plan'
  | 'summary' 
  | 'bookings' 
  | 'tour' 
  | 'companions'
  | 'members'
  | 'expenses' 
  | 'parking'
  | 'packing'
  | 'explore'
  | 'weather'
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
  { id: 'plan', label: 'Timeline', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'bookings', label: 'Bookings', icon: <Plane className="w-5 h-5" /> },
  { id: 'explore', label: 'Explore', icon: <Compass className="w-5 h-5" /> },
  { id: 'expenses', label: 'Expenses', icon: <DollarSign className="w-5 h-5" /> },
  { id: 'packing', label: 'Packing', icon: <Package className="w-5 h-5" /> },
];

const MORE_NAV_ITEMS: NavItem[] = [
  { id: 'now', label: 'Now', icon: <CalendarDays className="w-4 h-4" /> },
  { id: 'weather', label: 'Weather', icon: <CloudSun className="w-4 h-4" /> },
  { id: 'parking', label: 'Parking', icon: <CircleParking className="w-4 h-4" /> },
  { id: 'report', label: 'Report', icon: <FileText className="w-4 h-4" />, requiresPro: true },
  { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> },
  { id: 'companions', label: 'Companions', icon: <Users className="w-4 h-4" /> },
  { id: 'notes', label: 'Notes & Safety', icon: <StickyNote className="w-4 h-4" /> },
  { id: 'tour', label: 'Tour', icon: <MapPin className="w-4 h-4" />, requiresBusiness: true },
  { id: 'alerts', label: 'Alerts', icon: <Bell className="w-4 h-4" /> },
];

export function MobileBottomNav({ activeTab, onTabChange, className }: MobileBottomNavProps) {
  const { canAccessBusinessFeatures, isPro } = useAccess();
  
  const visiblePrimaryItems = PRIMARY_NAV_ITEMS.filter(item => {
    if (item.requiresBusiness) return canAccessBusinessFeatures;
    return true;
  });

  const visibleMoreItems = MORE_NAV_ITEMS.filter(item => {
    if (item.requiresBusiness) return canAccessBusinessFeatures;
    if (item.requiresPro) return isPro;
    return true;
  });

  const isMoreActive = visibleMoreItems.some(item => item.id === activeTab);

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50",
        "bg-card/90 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80",
        "shadow-nav",
        "pb-safe",
        className
      )}
    >
      <div className="flex items-center justify-around h-[56px] px-1.5">
        {visiblePrimaryItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-1.5 px-2.5 rounded-xl transition-all duration-200 min-w-[50px] min-h-[44px]",
              "touch-manipulation",
              activeTab === item.id
                ? "text-primary font-semibold bg-primary/8"
                : "text-muted-foreground font-medium active:scale-95"
            )}
          >
            {item.icon}
            <span className="text-[10px] leading-none tracking-tight">{item.label}</span>
          </button>
        ))}
        
        {/* More menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 py-1.5 px-2.5 rounded-xl transition-all duration-200 min-w-[50px] min-h-[44px]",
                "touch-manipulation",
                isMoreActive
                  ? "text-primary font-semibold bg-primary/8"
                  : "text-muted-foreground font-medium active:scale-95"
              )}
            >
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-[10px] leading-none tracking-tight">More</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            side="top" 
            align="end" 
            className="w-56 mb-2 rounded-2xl border-border/50 bg-card/95 backdrop-blur-xl shadow-xl p-1.5 max-w-[calc(100vw-1rem)]"
            sideOffset={8}
          >
            {visibleMoreItems.map((item) => (
              <DropdownMenuItem
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "cursor-pointer h-11 gap-3 px-3 rounded-xl text-sm font-medium transition-colors",
                  activeTab === item.id && "bg-primary/8 text-primary"
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