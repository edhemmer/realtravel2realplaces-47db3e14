/**
 * v5.2.1: ProactiveInsightsCard
 *
 * Renders max 3 proactive insights below NextCriticalActionCard.
 * Single-line messages, color-coded by type, no buttons or modals.
 */

import type { ProactiveInsight } from '@/lib/proactiveInsightEngine';
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
    colorClass: 'text-teal-600 dark:text-teal-400',
    bgClass: 'bg-teal-500/8',
    borderClass: 'border-teal-500/20',
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
}

export function ProactiveInsightsCard({ insights }: ProactiveInsightsCardProps) {
  if (insights.length === 0) return null;

  return (
    <div className="space-y-2">
      {insights.map((insight) => {
        const config = TYPE_CONFIG[insight.type];
        const Icon = config.icon;

        return (
          <div
            key={insight.id}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${config.bgClass} ${config.borderClass}`}
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
