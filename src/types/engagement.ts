/**
 * Engagement Type Definition
 * 
 * Part of Patch 2.3.0: Engagement Backend Foundation
 * 
 * Engagements are the internal data model for Business-tier "Stops".
 * A Stop represents a scheduled activity or event within a Trip.
 */

export interface Engagement {
  /** Unique identifier */
  id: string;
  
  /** Reference to the parent Trip */
  trip_id: string;
  
  /** Display name for the engagement/stop */
  name: string;
  
  /** Date of the engagement (ISO format: YYYY-MM-DD) */
  date: string;
  
  /** Start time (format: HH:MM:SS) */
  start_time: string;
  
  /** Optional end time (format: HH:MM:SS) */
  end_time: string | null;
  
  /** Location description or address */
  location: string | null;
  
  /** External reference ID (e.g., booking confirmation, ticket number) */
  reference_id: string | null;
  
  /** Free-form notes */
  notes: string | null;
  
  /** Timestamp when record was created */
  created_at: string;
  
  /** Timestamp when record was last updated */
  updated_at: string;
}

/**
 * Extended Expense type with optional Engagement association
 * 
 * Note: This extends the base Expense type with engagement_id
 * which was added in Patch 2.3.0
 */
export interface ExpenseWithEngagement {
  /** All base Expense fields plus: */
  engagement_id: string | null;
}
