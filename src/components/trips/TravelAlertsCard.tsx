import type { TravelAlert } from '@/hooks/useTravelAlerts';

interface TravelAlertsCardProps {
  alerts: TravelAlert[];
  className?: string;
  maxVisible?: number;
  onViewAllAlerts?: () => void;
}

export interface TravelAlertDisplayCopy {
  title: string;
  message: string;
}

/**
 * Retained for legacy normalization tests and future alert-contract work.
 * Forecast-derived severe-weather objects must never be presented as official
 * severe-weather alerts.
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

/**
 * Traveler-facing alert presentation is withheld until monitoring, freshness,
 * delivery, retry, and recovery behavior are validated end-to-end.
 */
export function TravelAlertsCard(_props: TravelAlertsCardProps) {
  return null;
}
