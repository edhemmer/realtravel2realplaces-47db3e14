/**
 * PlanPill - Displays the user's current subscription plan
 * 
 * Patch 2.6.24: Simple Plan Model (Single Source of Truth)
 * 
 * FEATURES:
 * - Derives plan EXCLUSIVELY from useAccess.tier
 * - useAccess.tier reads directly from profiles.subscription_tier (no overrides)
 * - Automatically updates when subscription queries are invalidated
 * - Shows 5-trip lifetime limit indicator for Free users
 * - Consistent styling across all plan types
 * 
 * DATA FLOW:
 * - useAccess.tier → subscription_tier from DB (single source of truth)
 * - useUserProfile → lifetime_trip_count (for Free trip limit display)
 * - Both queries are invalidated after admin plan changes for reactive updates
 * 
 * USAGE:
 * - Header: Shows plan pill next to app title
 * - Account page: Shows plan in profile section
 * - Wherever plan indication is needed
 */

import { Crown, User, Briefcase } from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import { useUserProfile } from '@/hooks/useUserProfile';
import { cn } from '@/lib/utils';

interface PlanPillProps {
  /** Show the trip limit info for Free users (e.g., "3 of 5") */
  showTripLimit?: boolean;
  /** Compact mode - smaller text */
  compact?: boolean;
  /** Additional className */
  className?: string;
}

export function PlanPill({ showTripLimit = false, compact = false, className }: PlanPillProps) {
  const { tier, isLoading } = useAccess();
  const { data: profile } = useUserProfile();
  
  if (isLoading || !tier) {
    return null;
  }
  
  const lifetimeTripCount = profile?.lifetime_trip_count ?? 0;
  const maxTrips = 5;
  
  // Determine styling based on tier
  const getPillConfig = () => {
    switch (tier) {
      case 'business':
        return {
          label: 'BUSINESS',
          icon: Briefcase,
          className: 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm shadow-amber-500/25',
        };
      case 'pro':
        return {
          label: 'PRO',
          icon: Crown,
          className: 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm shadow-purple-500/25',
        };
      case 'free':
      default:
        return {
          label: 'FREE',
          icon: User,
          className: 'bg-muted text-muted-foreground border border-border',
        };
    }
  };
  
  const config = getPillConfig();
  const Icon = config.icon;
  
  return (
    <span 
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold',
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
        config.className,
        className
      )}
    >
      <Icon className={cn(compact ? 'w-2.5 h-2.5' : 'w-3 h-3')} />
      <span>{config.label}</span>
      {tier === 'free' && showTripLimit && (
        <span className="opacity-80">
          · {lifetimeTripCount}/{maxTrips}
        </span>
      )}
    </span>
  );
}

/**
 * Hook to get plan pill data for custom rendering
 */
export function usePlanPillData() {
  const { tier, isLoading } = useAccess();
  const { data: profile } = useUserProfile();
  
  const lifetimeTripCount = profile?.lifetime_trip_count ?? 0;
  const maxTrips = 5;
  const tripsRemaining = Math.max(0, maxTrips - lifetimeTripCount);
  
  return {
    tier,
    isLoading,
    isFree: tier === 'free',
    isPro: tier === 'pro',
    isBusiness: tier === 'business',
    lifetimeTripCount,
    maxTrips,
    tripsRemaining,
    tripLimitText: `${lifetimeTripCount} of ${maxTrips} trips used`,
    tripLimitShort: `${lifetimeTripCount}/${maxTrips}`,
  };
}