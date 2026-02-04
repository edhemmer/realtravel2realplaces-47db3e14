/**
 * v2.0.0a: Usage tracking disabled
 * 
 * This hook is intentionally empty. Usage tracking and AI generation
 * limits are removed per 2.0.0a spec. This file is retained to prevent
 * import errors from any existing references.
 */
export function useUsageTracking() {
  return {
    incrementAiUsage: () => {
      // No-op: usage tracking disabled in 2.0.x
    },
    isTracking: false,
  };
}
