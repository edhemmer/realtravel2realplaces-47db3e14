/**
 * Patch 2.1.17: Types for Explore feature attractions
 */

export interface AttractionBookingInfo {
  ticketRequired: boolean;
  advanceRecommended: boolean;
  bookingPattern: 'first-come' | 'time-slot' | 'lottery' | 'unknown';
  officialBookingUrl?: string;
  notes?: string;
}

export interface AttractionSuggestion {
  id: string;
  name: string;
  shortDescription: string;
  category: string;
  thumbnailUrl: string | null;
  priceLevel: 'free' | '$' | '$$' | '$$$' | 'unknown';
  bookingInfo: AttractionBookingInfo;
  locationSummary: string;
  websiteUrl?: string;
}

export type ReminderOption = '30_days' | '14_days' | '7_days' | 'custom';

export interface TicketReminderCreate {
  bookingId: string;
  tripId: string;
  reminderDate: string; // YYYY-MM-DD format
}

export interface ActivityBookingFromExplore {
  tripId: string;
  attractionId: string;
  attractionName: string;
  date: string;
  startTime?: string;
  notes?: string;
  ticketRequired: boolean;
  advanceRecommended: boolean;
  bookingPattern: string;
  bookingUrl?: string;
  locationSummary: string;
  reminders: string[]; // Array of dates in YYYY-MM-DD format
}
