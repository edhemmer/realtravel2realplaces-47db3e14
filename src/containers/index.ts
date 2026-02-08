/**
 * Trip Containers - Public API
 * 
 * Patch 2.2.2: Canonical trip containers & bug-fix-at-source architecture
 * 
 * This module exports container components that:
 * - Wire canonical hooks to presentational views
 * - Ensure consistent loading/error/empty states
 * - Provide single points of fix for data issues
 * 
 * CONTAINER RESPONSIBILITIES:
 * - Fetch data via canonical hooks only
 * - Handle loading/error/empty states
 * - Pass clean, typed props to views
 * - Do NOT contain business logic (that lives in lib/)
 * 
 * ARCHITECTURE:
 * Route -> Container -> Presentational View
 * 
 * If a bug is found in cost calculation, fix it in lib/expenseCalculations.ts
 * If a bug is found in weather thresholds, fix it in hooks/useWeather.ts
 * All containers automatically get the fix.
 */

export { TripSummaryContainer } from './TripSummaryContainer';
export { TripBookingsContainer } from './TripBookingsContainer';
export { TripTourContainer } from './TripTourContainer';
export { TripExpensesContainer } from './TripExpensesContainer';
export { TripAlertsContainer } from './TripAlertsContainer';
