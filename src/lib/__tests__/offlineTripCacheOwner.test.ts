import { afterEach, describe, expect, it } from 'vitest';
import { getOfflineDataOwner, setOfflineDataOwner } from '@/lib/offlineTripCache';

describe('offline cache ownership marker', () => {
  afterEach(() => {
    setOfflineDataOwner(null);
  });

  it('persists the authenticated user boundary across app lifecycles', () => {
    setOfflineDataOwner('user-a');
    expect(getOfflineDataOwner()).toBe('user-a');
  });

  it('removes the owner marker after a successful sign-out cleanup', () => {
    setOfflineDataOwner('user-a');
    setOfflineDataOwner(null);
    expect(getOfflineDataOwner()).toBeNull();
  });
});
