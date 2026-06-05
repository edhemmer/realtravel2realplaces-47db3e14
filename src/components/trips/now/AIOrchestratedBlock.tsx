/**
 * v5.5.0: AIOrchestratedBlock
 *
 * Primary NOW experience — renders AI orchestration output as the dominant
 * visual and functional block. Focus → Summary → Guidance → Actions.
 */

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Clock, CloudRain, CalendarClock, AlertTriangle, Compass, MapPin, Eye, DollarSign } from 'lucide-react';
import type {
  AIOrchestratedContext,
  AIOrchestratedGuidanceItem,
  AIOrchestratedAction,
} from '@/lib/ai/aiOrchestrationEngine';

const GUIDANCE_ICON: Record<AIOrchestratedGuidanceItem['type'], typeof Clock> = {
  time: Clock,
  weather: CloudRain,
  logistics: CalendarClock,
  risk: AlertTriangle,
  expense: DollarSign,
  explore: Compass,
  general: Eye,
};

const GUIDANCE_COLOR: Record<AIOrchestratedGuidanceItem['type'], string> = {
  time: 'text-blue-600 dark:text-blue-400',
  weather: 'text-brand-signal-deep dark:text-brand-signal',
  logistics: 'text-orange-600 dark:text-orange-400',
  risk: 'text-red-600 dark:text-red-400',
  expense: 'text-emerald-600 dark:text-emerald-400',
  explore: 'text-violet-600 dark:text-violet-400',
  general: 'text-muted-foreground',
};

interface AIOrchestratedBlockProps {
  context: AIOrchestratedContext;
  onAction: (action: AIOrchestratedAction) => void;
}

export function AIOrchestratedBlock({ context, onAction }: AIOrchestratedBlockProps) {
  const handleAction = useCallback(
    (action: AIOrchestratedAction) => onAction(action),
    [onAction],
  );

  return (
    <div className="space-y-3">
      {/* Primary Focus — largest text on screen */}
      <div>
        <p className="text-lg font-bold text-foreground leading-tight tracking-tight">
          {context.primaryFocus}
        </p>
        <p className="text-sm text-muted-foreground leading-snug mt-0.5">
          {context.summary}
        </p>
      </div>

      {/* Prioritized Guidance — max 3, scannable rows */}
      {context.prioritizedGuidance.length > 0 && (
        <div className="space-y-1.5">
          {context.prioritizedGuidance.map((item) => {
            const Icon = GUIDANCE_ICON[item.type] || Eye;
            const colorClass = GUIDANCE_COLOR[item.type] || 'text-muted-foreground';

            return (
              <div
                key={item.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/50 border border-border/50"
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />
                <span className="text-xs font-medium text-foreground leading-snug truncate">
                  {item.message}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Recommended Actions — full tap targets */}
      {context.recommendedActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {context.recommendedActions.map((action) => (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              className="text-xs font-semibold"
              onClick={() => handleAction(action)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
