import { describe, expect, it } from 'vitest';
import { getTripSnapshotAgeStatus, TRIP_SNAPSHOT_RECENT_FOR_MS } from './offlineTripCache';

describe('offline trip snapshot age', () => {
  const now = Date.UTC(2026, 7, 13, 12, 0, 0);

  it('marks a recent snapshot as recent', () => {
    expect(getTripSnapshotAgeStatus(now - 15 * 60 * 1000, now)).toEqual({ ageMs: 15 * 60 * 1000, ageStatus: 'recent' });
  });

  it('keeps the six-hour boundary recent', () => {
    expect(getTripSnapshotAgeStatus(now - TRIP_SNAPSHOT_RECENT_FOR_MS, now).ageStatus).toBe('recent');
  });

  it('marks an older snapshot stale', () => {
    expect(getTripSnapshotAgeStatus(now - TRIP_SNAPSHOT_RECENT_FOR_MS - 1, now).ageStatus).toBe('stale');
  });

  it('never reports negative age if device time moves backward', () => {
    expect(getTripSnapshotAgeStatus(now + 60_000, now)).toEqual({ ageMs: 0, ageStatus: 'recent' });
  });
});
