/**
 * Shared card components barrel export
 * 
 * Patch 2.2.3: Mobile-first layout shell & shared cards
 * 
 * These are "dumb" presentational components that receive typed props.
 * They do NOT call domain hooks - all data comes from Trip*Containers.
 */

export { BookingCard, type BookingCardProps, type BookingCardType, type TransportMode } from './BookingCard';
export { TourStopCard, type TourStopCardProps } from './TourStopCard';
export { ExpenseCard, type ExpenseCardProps, type ExpenseCategory, type ExpensePurpose } from './ExpenseCard';
