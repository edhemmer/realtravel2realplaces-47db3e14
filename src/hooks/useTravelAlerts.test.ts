import { describe, expect, it } from 'vitest';
import { buildFlightDepartureReminder } from './useTravelAlerts';

describe('buildFlightDepartureReminder', () => {
  it('reports departure timing without inventing a leave-now decision', () => {
    const message = buildFlightDepartureReminder('Delta', 95);

    expect(message).toBe(
      'Delta departs in 95 minutes. Check your route and airport timing before leaving.'
    );
    expect(message.toLowerCase()).not.toContain('leave for airport now');
    expect(message.toLowerCase()).not.toContain('leave now');
  });

  it('uses a neutral flight label when no carrier is available', () => {
    expect(buildFlightDepartureReminder(undefined, 42)).toBe(
      'Flight departs in 42 minutes. Check your route and airport timing before leaving.'
    );
  });
});
