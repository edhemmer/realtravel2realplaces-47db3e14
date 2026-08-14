/**
 * PlanPill - Displays the user's current persisted plan tier.
 *
 * Trip-limit counts are intentionally not shown here until the frontend limit
 * and deployed database creation policy are verified to use the same contract.
 */

import { Crown, User, Briefcase } from 'lucide-react';
import { useAccess } from '@/hooks/useAccess';
import { cn } from '@/lib/utils';

interface PlanPillProps {
  /** Retained for caller compatibility; trip limits are not currently exposed. */
  showTripLimit?: boolean;
  compact?: boolean;
  className?: string;
}

export function PlanPill({ compact = false, className }: PlanPillProps) {
  const { tier, isLoading } = useAccess();

  if (isLoading || !tier) {
    return null;
  }

  const getPillConfig = () => {
    switch (tier) {
      case 'business':
        return {
          label: 'BUSINESS',
          icon: Briefcase,
          className: 'bg-secondary text-secondary-foreground shadow-sm',
        };
      case 'pro':
        return {
          label: 'PRO',
          icon: Crown,
          className: 'bg-primary text-primary-foreground shadow-sm shadow-primary/20',
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
    </span>
  );
}

/**
 * Hook to expose persisted tier state for custom rendering.
 * Limit/remaining values are deliberately omitted until the database contract
 * is reconciled with the frontend configuration.
 */
export function usePlanPillData() {
  const { tier, isLoading } = useAccess();

  return {
    tier,
    isLoading,
    isFree: tier === 'free',
    isPro: tier === 'pro',
    isBusiness: tier === 'business',
  };
}
