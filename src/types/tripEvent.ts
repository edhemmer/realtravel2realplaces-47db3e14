// v2.0.2: Pro-only TripEvent types

export type TripEventType =
  | 'flight_departure'
  | 'hotel_checkin'
  | 'hotel_checkout'
  | 'rental_pickup'
  | 'rental_return'
  | 'parking_expiration';

export type EventSourceType = 'booking' | 'parking';

/**
 * TripEvent represents a time-based event derived from bookings or parking.
 * 
 * Rules:
 * - Only created for Pro users
 * - Never guesses dates/times - if datetime is missing, event is not created
 * - Auto-synced when source records are edited or deleted
 */
export interface TripEvent {
  id: string;
  trip_id: string;
  event_type: TripEventType;
  event_datetime: string; // ISO timestamp - never null
  source_type: EventSourceType;
  source_id: string; // ID of the booking or parking record
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
};
