// v2.2.5: Canonical TripEvent types (plan-neutral read access)

export type TripEventType =
  | 'flight_departure'
  | 'hotel_checkin'
  | 'hotel_checkout'
  | 'rental_pickup'
  | 'rental_return'
  | 'parking_expiration'
  | 'engagement_start';

export type EventSourceType = 'booking' | 'parking' | 'engagement';

/**
 * TripEvent represents a time-based event derived from bookings, parking, or engagements.
 * 
 * v2.2.5 Rules:
 * - Booking/parking events: created for Pro users via triggers
 * - Engagement events: created for ALL plans via trigger (plan-neutral canonical stream)
 * - Never guesses dates/times - if datetime is missing, event is not created
 * - Auto-synced when source records are edited or deleted
 * - All trip members can READ events regardless of plan tier (RLS: user_has_trip_access)
 */
export interface TripEvent {
  id: string;
  trip_id: string;
  event_type: TripEventType;
  event_datetime: string; // ISO timestamp - never null
  source_type: EventSourceType;
  source_id: string; // ID of the booking, parking, or engagement record
  /** v2.2.5: Display title for engagement events (null for booking/parking) */
  title?: string | null;
  /** v2.2.5: Location summary for engagement events (null for booking/parking) */
  location_summary?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Mapping of event types to their source booking types
 */
export const EVENT_SOURCE_MAPPING: Record<TripEventType, { source: EventSourceType; bookingType?: string }> = {
  flight_departure: { source: 'booking', bookingType: 'flight' },
  hotel_checkin: { source: 'booking', bookingType: 'stay' },
  hotel_checkout: { source: 'booking', bookingType: 'stay' },
  rental_pickup: { source: 'booking', bookingType: 'car_rental' },
  rental_return: { source: 'booking', bookingType: 'car_rental' },
  parking_expiration: { source: 'parking' },
  engagement_start: { source: 'engagement' },
};
