/**
 * Feature Flags — Centralized feature toggles
 * 
 * Use these flags to conditionally show/hide features across the app.
 * This allows clean reversibility without deleting code.
 */

/** Email forwarding / import functionality — tabled temporarily for cost & API reasons */
export const EMAIL_FORWARDING_ENABLED = false;

/** AI/provider-backed packing generation — internal until fallback, provider and regression validation pass */
export const PACKING_GENERATION_ENABLED = false;
