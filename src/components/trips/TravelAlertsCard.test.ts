import { describe, expect, it } from 'vitest';
import { getTravelAlertDisplayCopy } from './TravelAlertsCard';
import type { TravelAlert } from '@/hooks/useTravelAlerts';

const baseAlert: TravelAlert = {
  id: 'weather-1',
  type: 'severe_weather',
  severity: 'critical',
  title: '⚠️ Severe Weather Alert — Chicago',
  message: 'Severe weather expected in Chicago on Aug 14. Check local advisories.',
  timestamp: new Date('2026-08-13T12:00:00Z'),
};

describe('getTravelAlertDisplayCopy', () => {
  it('does not present forecast-derived risk as an official severe-weather alert', () => {
    const display = getTravelAlertDisplayCopy(baseAlert);

    expect(display.title).toBe('⚠️ Forecast Weather Risk — Chicago');
    expect(display.message).toContain('Forecast conditions may be disruptive');
    expect(display.message).toContain('Check current local advisories before acting.');
    expect(display.title).not.toContain('Severe Weather Alert');
  });

  it('leaves non-weather alert copy unchanged', () => {
    const alert: TravelAlert = {
      ...baseAlert,
      type: 'departure_reminder',
      title: 'Flight Departure Soon',
      message: 'Delta departs in 95 minutes.',
    };

    expect(getTravelAlertDisplayCopy(alert)).toEqual({
      title: alert.title,
      message: alert.message,
    });
  });
});
