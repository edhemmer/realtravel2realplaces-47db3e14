 /**
  * v2.2.0: Strongly-typed interfaces for AI-parsed data
  * Single source of truth for all parsed booking/receipt/itinerary structures
  */
 
 import { BookingType, StayType, ExpenseCategory, ExpenseSubCategory, ParkingType } from './database';
 
 /**
  * Base parsed data common to all types
  */
 interface ParsedBase {
   vendor_name: string | null;
   total_cost: number | null;
   confirmation_number: string | null;
   notes: string | null;
 }
 
 /**
  * Parsed booking data from AI parser
  */
 export interface ParsedBooking extends ParsedBase {
   is_receipt_only: boolean;
   booking_type: BookingType | 'parking' | 'other' | null;
   start_datetime: string | null;
   end_datetime: string | null;
   receipt_date: string | null;
   address: string | null;
   
   // Flight-specific
   airline: string | null;
   passenger_name: string | null;
   
   // Stay-specific
   property_name: string | null;
   stay_type: StayType | null;
   
   // Car rental-specific
   rental_company: string | null;
   pickup_location: string | null;
   return_location: string | null;
   
   // Parking-specific
   parking_type: ParkingType | null;
 }
 
 /**
  * Parsed receipt data from AI parser
  */
 export interface ParsedReceipt {
   date: string | null;
   category: ExpenseCategory;
   sub_category: ExpenseSubCategory | null;
   description: string | null;
   amount: number | null;
   vendor_name: string | null;
 }
 
 /**
  * Parsed receipt image data with confidence
  */
 export interface ParsedReceiptImage {
   readable: boolean;
   reason?: string;
   data?: {
     date: string | null;
     category: ExpenseCategory;
     sub_category: ExpenseSubCategory | null;
     vendor_name: string | null;
     location?: string | null;
     subtotal?: number | null;
     tax?: number | null;
     tip?: number | null;
     amount: number | null;
     description: string | null;
     confidence: number;
   };
 }
 
 /**
  * Parsed itinerary trip-level data
  */
 export interface ParsedTripInfo {
   trip_name: string | null;
   destination_city: string | null;
   destination_state: string | null;
   destination_country: string | null;
   start_date: string | null;
   end_date: string | null;
   trip_type: 'business' | 'personal' | 'mixed' | null;
 }
 
 /**
  * Parsed itinerary booking item
  */
 export interface ParsedItineraryBooking {
   booking_type: BookingType | null;
   vendor_name: string | null;
   start_datetime: string | null;
   end_datetime: string | null;
   confirmation_number: string | null;
   total_cost: number | null;
   address: string | null;
   airline: string | null;
   passenger_name: string | null;
   property_name: string | null;
   stay_type: StayType | null;
   rental_company: string | null;
   pickup_location: string | null;
   return_location: string | null;
   notes: string | null;
 }
 
 /**
  * Complete parsed itinerary result
  */
 export interface ParsedItinerary {
   trip: ParsedTripInfo;
   bookings: ParsedItineraryBooking[];
 }
 
 /**
  * Type guards for runtime validation
  */
 export function isValidBookingType(type: unknown): type is BookingType {
   return typeof type === 'string' && 
     ['flight', 'stay', 'car_rental', 'activity'].includes(type);
 }
 
 export function isValidExpenseCategory(category: unknown): category is ExpenseCategory {
   return typeof category === 'string' && 
     ['meals', 'transport', 'activity', 'shopping', 'parking', 'other'].includes(category);
 }
 
 /**
  * Safely parse a numeric value, returning null for invalid inputs
  */
 export function safeParseNumber(value: unknown): number | null {
   if (value === null || value === undefined) return null;
   const num = Number(value);
   if (isNaN(num) || !isFinite(num)) return null;
   return num;
 }
 
 /**
  * Safely parse a date string, returning null for invalid inputs
  */
 export function safeParseDateString(value: unknown): string | null {
   if (typeof value !== 'string' || !value.trim()) return null;
   // Basic ISO date validation
   if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return null;
   return value;
 }