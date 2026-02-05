 /**
  * Standardized API response helpers for edge functions
  * Ensures consistent response format across all functions
  */
 
 import { corsHeaders } from "./cors.ts";
 
 export interface ApiResponse<T = Record<string, unknown>> {
   success: boolean;
   data: T;
   message: string;
   is_receipt_only?: boolean;
   readable?: boolean;
   lowConfidence?: boolean;
   retryMessage?: string;
 }
 
 /**
  * Create a standardized JSON response
  */
 export function jsonResponse<T = Record<string, unknown>>(
   body: ApiResponse<T>,
   status = 200
 ): Response {
   return new Response(JSON.stringify(body), {
     status,
     headers: { ...corsHeaders, "Content-Type": "application/json" },
   });
 }
 
 /**
  * Success response helper
  */
 export function successResponse<T = Record<string, unknown>>(
   data: T,
   message: string,
   extras?: Partial<ApiResponse<T>>
 ): Response {
   return jsonResponse({ success: true, data, message, ...extras });
 }
 
 /**
  * Error response helper - returns 200 with success: false
  * (Edge functions always return 200 to avoid parsing issues)
  */
 export function errorResponse(
   message: string,
   data: Record<string, unknown> = {}
 ): Response {
   return jsonResponse({ success: false, data, message });
 }
 
 /**
  * Map AI gateway HTTP errors to user-friendly messages
  */
 export function getAiErrorMessage(status: number): string {
   switch (status) {
     case 429:
       return "AI service is busy. Please wait a moment and try again.";
     case 402:
       return "AI parsing limit reached. Please enter details manually.";
     default:
       return "We couldn't fully parse this. Please review and complete the details manually.";
   }
 }