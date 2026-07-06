/**
 * MobileBottomNav - Bottom navigation bar for mobile viewports
 * 
 * v5.0.0: Simplified navigation — Today, Timeline, Travel, Places, More
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
  Car,
  Navigation,
  Building2,
} from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { tapHaptic } from '@/lib/native/haptics';

export type TripTab = 
  | 'now'
  | 'today'
  | 'plan'
  | 'flow'
  | 'ops'
  | 'move'
  | 'drive'
  | 'guide'
  | 'airport'
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
  showDrive?: boolean;
}

interface NavItem {
  id: TripTab;
  label: string;
  icon: React.ReactNode;
  requiresBusiness?: boolean;
  requiresPro?: boolean;
}

const MORE_NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Travel',
    items: [
      { id: 'airport', label: 'Airport window', icon: <Building2 className="w-4 h-4" /> },
      { id: 'bookings', label: 'Reservations', icon: <Plane className="w-4 h-4" /> },
      { id: 'weather', label: 'Weather', icon: <CloudSun className="w-4 h-4" /> },
      { id: 'parking', label: 'Parking', icon: <CircleParking className="w-4 h-4" /> },
      { id: 'alerts', label: 'Alerts', icon: <Bell className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Prepare',
    items: [
      { id: 'expenses', label: 'Spend', icon: <DollarSign className="w-4 h-4" /> },
      { id: 'packing', label: 'Pack', icon: <Package className="w-4 h-4" /> },
      { id: 'companions', label: 'Travelers', icon: <Users className="w-4 h-4" /> },
      { id: 'notes', label: 'Safety notes', icon: <StickyNote className="w-4 h-4" /> },
      { id: 'guide', label: 'Guide', icon: <Bell className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Business',
    items: [
      { id: 'report', label: 'Report', icon: <FileText className="w-4 h-4" />, requiresPro: true },
      { id: 'members', label: 'Team access', icon: <Users className="w-4 h-4" /> },
      { id: 'tour', label: 'Work stops', icon: <MapPin className="w-4 h-4" />, requiresBusiness: true },
    ],
  },
];

export function MobileBottomNav({ activeTab, onTabChange, className, showDrive = false }: MobileBottomNavProps) {
  const { canAccessBusinessFeatures, isPro } = useAccess();

  const primaryNavItems: NavItem[] = [
    { id: 'today', label: 'Today', icon: <CalendarDays className="w-5 h-5" /> },
    { id: 'flow', label: 'Timeline', icon: <Route className="w-5 h-5" /> },
    showDrive
      ? { id: 'drive', label: 'Drive', icon: <Car className="w-5 h-5" /> }
      : { id: 'move', label: 'Move', icon: <Navigation className="w-5 h-5" /> },
    { id: 'explore', label: 'Places', icon: <Compass className="w-5 h-5" /> },
  ];
  
  const visiblePrimaryItems = primaryNavItems.filter(item => {
    if (item.requiresBusiness) return canAccessBusinessFeatures;
    return true;
  });

  const itemIsVisible = (item: NavItem) => {
    if (item.id === 'drive') return showDrive;
    if (item.requiresBusiness) return canAccessBusinessFeatures;
    if (item.requiresPro) return isPro;
    return true;
  };

  const visibleMoreGroups = MORE_NAV_GROUPS
    .map((group) => ({ ...group, items: group.items.filter(itemIsVisible) }))
    .filter((group) => group.items.length > 0);

  const visibleMoreItems = visibleMoreGroups.flatMap((group) => group.items);

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
          className="grid h-[64px] gap-1 px-1.5 pb-1.5 pt-1.5"
          style={{ gridTemplateColumns: `repeat(${cellCount}, minmax(0, 1fr))` }}
        >
          {visiblePrimaryItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  void tapHaptic();
                  onTabChange(item.id);
                }}
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
                onClick={() => void tapHaptic()}
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
              className="w-60 mb-3 mr-2 rounded-2xl nav-floating border-0 p-1.5 max-w-[calc(100vw-1rem)]"
              sideOffset={8}
            >
              {visibleMoreGroups.map((group, groupIndex) => (
                <div key={group.label}>
                  {groupIndex > 0 && <DropdownMenuSeparator className="my-1 bg-border/45" />}
                  <DropdownMenuLabel className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                    {group.label}
                  </DropdownMenuLabel>
                  {group.items.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onClick={() => {
                        void tapHaptic();
                        onTabChange(item.id);
                      }}
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
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    </div>
  );
}

