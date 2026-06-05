/**
 * v5.2.2: ProactiveInsightsCard
 *
 * Renders max 3 proactive insights below NextCriticalActionCard.
 * Single-line messages, color-coded by type. Tappable when action exists.
 */

import { useCallback } from 'react';
import type { ProactiveInsight, ProactiveInsightAction } from '@/lib/proactiveInsightEngine';
import { resolveMapsDestination, openMapsDestination } from '@/lib/mapsDestination';
import { Clock, CloudRain, CalendarClock, AlertTriangle } from 'lucide-react';

const TYPE_CONFIG: Record<ProactiveInsight['type'], {
  icon: typeof Clock;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}> = {
  time: {
    icon: Clock,
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-500/8',
    borderClass: 'border-blue-500/20',
  },
  weather: {
    icon: CloudRain,
    colorClass: 'text-brand-signal-deep dark:text-brand-signal',
    bgClass: 'bg-brand-signal/10',
    borderClass: 'border-brand-signal/20',
  },
  logistics: {
    icon: CalendarClock,
    colorClass: 'text-orange-600 dark:text-orange-400',
    bgClass: 'bg-orange-500/8',
    borderClass: 'border-orange-500/20',
  },
  risk: {
    icon: AlertTriangle,
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-500/8',
    borderClass: 'border-red-500/20',
  },
};

interface ProactiveInsightsCardProps {
  insights: ProactiveInsight[];
  onExplore?: () => void;
  onWeather?: () => void;
  onOpenEvent?: (eventId: string) => void;
}

export function ProactiveInsightsCard({
  insights,
  onExplore,
  onWeather,
  onOpenEvent,
}: ProactiveInsightsCardProps) {
  const handleAction = useCallback((action: ProactiveInsightAction) => {
    switch (action.actionType) {
      case 'navigate': {
        const dest = resolveMapsDestination({
          address: action.destinationLabel,
          locationLabel: action.destinationLabel,
        });
        if (dest) openMapsDestination(dest);
        break;
      }
      case 'open_explore':
        onExplore?.();
        break;
      case 'open_weather':
        onWeather?.();
        break;
      case 'open_event':
        onOpenEvent?.(action.eventId);
        break;
    }
  }, [onExplore, onWeather, onOpenEvent]);

  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      {insights.map((insight) => {
        const config = TYPE_CONFIG[insight.type];
        const Icon = config.icon;
        const isTappable = !!insight.action;

        return (
          <div
            key={insight.id}
            role={isTappable ? 'button' : undefined}
            tabIndex={isTappable ? 0 : undefined}
            onClick={isTappable ? () => handleAction(insight.action!) : undefined}
            onKeyDown={isTappable ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleAction(insight.action!);
              }
            } : undefined}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${config.bgClass} ${config.borderClass} ${
              isTappable ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''
            }`}
          >
            <Icon className={`w-4 h-4 shrink-0 ${config.colorClass}`} />
            <p className="text-xs font-medium text-foreground leading-snug truncate">
              {insight.message}
            </p>
          </div>
        );
      })}
    </div>
  );
}
