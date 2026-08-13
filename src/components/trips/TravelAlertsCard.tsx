/**
 * TravelAlertsCard - Compact banner-style travel alerts
 * v5.0.0: Compressed from full cards to compact banners
 *
 * Promise-standard rule: presentation must not imply an official alert source
 * when the underlying object was derived from ordinary forecast conditions.
 */

import { TravelAlert } from '@/hooks/useTravelAlerts';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Cloud,
  Car,
  Clock,
  Package,
  Plane,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TravelAlertsCardProps {
  alerts: TravelAlert[];
  className?: string;
  maxVisible?: number;
  onViewAllAlerts?: () => void;
}

const alertIcons: Record<TravelAlert['type'], React.ReactNode> = {
  weather_change: <Cloud className="w-3.5 h-3.5" />,
  departure_reminder: <Clock className="w-3.5 h-3.5" />,
  parking_expiry: <Car className="w-3.5 h-3.5" />,
  severe_weather: <AlertTriangle className="w-3.5 h-3.5" />,
  packing_update: <Package className="w-3.5 h-3.5" />,
  flight_disruption: <Plane className="w-3.5 h-3.5" />,
};

const severityStyles: Record<TravelAlert['severity'], string> = {
  critical: 'border-destructive/40 bg-destructive/5 text-destructive',
  warning: 'border-warning/40 bg-warning/5 text-warning',
  info: 'border-primary/40 bg-primary/5 text-primary',
};

export interface TravelAlertDisplayCopy {
  title: string;
  message: string;
}

/**
 * Normalizes legacy alert objects to the evidence level we can defend.
 *
 * `severe_weather` is currently produced from forecast condition/probability
 * checks, not an official severe-weather alert feed. Until an official-alert
 * source is implemented and separately typed, the UI must call it forecast
 * risk and direct the traveler to current local advisories.
 */
export function getTravelAlertDisplayCopy(alert: TravelAlert): TravelAlertDisplayCopy {
  if (alert.type !== 'severe_weather') {
    return { title: alert.title, message: alert.message };
  }

  const citySuffix = alert.title.includes('—')
    ? ` — ${alert.title.split('—').slice(1).join('—').trim()}`
    : '';

  const message = alert.message
    .replace(/^Severe weather expected/i, 'Forecast conditions may be disruptive')
    .replace(/Check local advisories\.?$/i, 'Check current local advisories before acting.');

  return {
    title: `⚠️ Forecast Weather Risk${citySuffix}`,
    message,
  };
}

export function TravelAlertsCard({ alerts, className, maxVisible, onViewAllAlerts }: TravelAlertsCardProps) {
  if (alerts.length === 0) return null;

  const visibleAlerts = maxVisible ? alerts.slice(0, maxVisible) : alerts;
  const hasMore = maxVisible ? alerts.length > maxVisible : false;

  return (
    <div className={cn('space-y-1.5', className)}>
      {visibleAlerts.map((alert) => {
        const display = getTravelAlertDisplayCopy(alert);

        return (
          <div
            key={alert.id}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-lg border text-sm',
              severityStyles[alert.severity]
            )}
          >
            <span className="shrink-0">{alertIcons[alert.type]}</span>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-xs">{display.title}</span>
              <span className="text-muted-foreground text-[11px] ml-1.5">{display.message}</span>
            </div>
            {alert.actionLabel && alert.actionUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px] gap-1 shrink-0"
                onClick={() => {
                  if (alert.actionUrl!.startsWith('/')) {
                    window.location.assign(alert.actionUrl!);
                    return;
                  }
                  const url = alert.actionUrl!.startsWith('http')
                    ? alert.actionUrl!
                    : `https://${alert.actionUrl}`;
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
              >
                {alert.actionLabel}
              </Button>
            )}
          </div>
        );
      })}
      {hasMore && onViewAllAlerts && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs text-primary font-medium"
          onClick={onViewAllAlerts}
        >
          View all {alerts.length} alerts
        </Button>
      )}
    </div>
  );
}
