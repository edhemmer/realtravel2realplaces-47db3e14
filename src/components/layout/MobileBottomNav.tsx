/**
 * MobileBottomNav - Bottom navigation bar for mobile viewports
 * 
 * v5.0.0: Simplified navigation — Timeline, Bookings, Explore, Expenses, Packing, More
 * 
 * Surface: bg-card, border-border/60, shadow-lg (no blur/opacity)
 * Active: text-primary font-semibold bg-primary/10
 * Inactive: text-muted-foreground font-medium
 * Icon-label: gap-0.5, text-[9px] leading-none
 * More dropdown: rounded-xl, w-52, h-10 rows, max-w-[calc(100vw-1rem)]
 */

import { cn } from '@/lib/utils';
import { 
  CalendarDays,
  Compass,
  DollarSign,
  Route,
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
  LayoutDashboard,
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
  | 'today'
  | 'plan'
  | 'flow'
  | 'ops'
  | 'move'
  | 'guide'
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
  { id: 'today', label: 'Today', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'ops', label: 'Ops', icon: <LayoutDashboard className="w-5 h-5" /> },
  { id: 'flow', label: 'Flow', icon: <Route className="w-5 h-5" /> },
  { id: 'move', label: 'Move', icon: <Compass className="w-5 h-5" /> },
  { id: 'expenses', label: 'Expenses', icon: <DollarSign className="w-5 h-5" /> },
];

const MORE_NAV_ITEMS: NavItem[] = [
  { id: 'bookings', label: 'Bookings', icon: <Plane className="w-4 h-4" /> },
  { id: 'explore', label: 'Explore', icon: <Compass className="w-4 h-4" /> },
  { id: 'packing', label: 'Packing', icon: <Package className="w-4 h-4" /> },
  { id: 'weather', label: 'Weather', icon: <CloudSun className="w-4 h-4" /> },
  { id: 'guide', label: 'Guide', icon: <Bell className="w-4 h-4" /> },
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

  const cellCount = visiblePrimaryItems.length + 1; // + More

  return (
    <div
      className={cn("fixed inset-x-0 bottom-0 z-50 md:hidden pointer-events-none", className)}
      style={{
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 8px)',
      }}
    >
      <nav
        className="pointer-events-auto mx-3 overflow-hidden rounded-[24px] nav-floating"
      >
        <div
          className="grid h-[66px] gap-0.5 px-1.5 pb-1.5 pt-1.5"
          style={{ gridTemplateColumns: `repeat(${cellCount}, minmax(0, 1fr))` }}
        >
          {visiblePrimaryItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 rounded-[18px]",
                  "transition-all duration-300 ease-cinema touch-manipulation press-scale",
                  isActive
                    ? "nav-pill-active"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/6 active:bg-muted"
                )}
              >
                {isActive && <span className="absolute -top-1 h-1 w-8 rounded-full nav-accent-bar" />}
                <span
                  className={cn(
                    "transition-transform duration-300 ease-cinema",
                    isActive ? "scale-110" : "scale-100"
                  )}
                >
                  {item.icon}
                </span>
                <span
                  className={cn(
                    "max-w-full truncate text-[10px] leading-none",
                    isActive ? "font-semibold" : "font-medium"
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* More menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 rounded-[18px]",
                  "transition-all duration-300 ease-cinema touch-manipulation press-scale",
                  isMoreActive
                    ? "nav-pill-active"
                    : "text-muted-foreground hover:text-foreground hover:bg-primary/6 active:bg-muted"
                )}
              >
                {isMoreActive && <span className="absolute -top-1 h-1 w-8 rounded-full nav-accent-bar" />}
                <MoreHorizontal
                  className={cn(
                    "w-5 h-5 transition-transform duration-300 ease-cinema",
                    isMoreActive && "scale-110"
                  )}
                />
                <span
                  className={cn(
                    "max-w-full truncate text-[10px] leading-none",
                    isMoreActive ? "font-semibold" : "font-medium"
                  )}
                >
                  More
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="top"
              align="end"
              className="w-56 mb-3 mr-2 rounded-2xl nav-floating border-0 p-1.5 max-w-[calc(100vw-1rem)]"
              sideOffset={8}
            >
              {visibleMoreItems.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={cn(
                    "cursor-pointer h-11 gap-3 px-3 rounded-xl text-sm font-medium",
                    "transition-colors duration-200",
                    activeTab === item.id
                      ? "nav-pill-active focus:nav-pill-active"
                      : "hover:bg-muted/70 focus:bg-muted/70"
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
    </div>
  );
}

