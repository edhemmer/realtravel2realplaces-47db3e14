import { useState, useEffect, useCallback } from 'react';

const EXPLORE_DISCOVERED_KEY = 'rt2rp_explore_discovered';

/**
 * Hook to track if user has discovered the Explore feature
 * Uses localStorage to persist across sessions
 * Pro users only - Free users don't see the badge
 */
export function useExploreDiscovery() {
  const [hasDiscovered, setHasDiscovered] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(EXPLORE_DISCOVERED_KEY) === 'true';
  });

  // Mark Explore as discovered
  const markDiscovered = useCallback(() => {
    localStorage.setItem(EXPLORE_DISCOVERED_KEY, 'true');
    setHasDiscovered(true);
  }, []);

  // Reset for testing (not used in production)
  const resetDiscovery = useCallback(() => {
    localStorage.removeItem(EXPLORE_DISCOVERED_KEY);
    setHasDiscovered(false);
  }, []);

  return {
    hasDiscovered,
    markDiscovered,
    resetDiscovery,
  };
}
