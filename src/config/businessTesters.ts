/**
 * Business Tester Overrides Configuration
 * 
 * Patch 2.6.8: Tester Business Overrides
 * 
 * PURPOSE:
 * This file defines a list of trusted tester accounts who receive full Business
 * tier access for testing and feedback purposes, independent of subscription state.
 * 
 * IMPORTANT:
 * - This is a UI-level override only; it does not modify subscription records
 * - This list is separate from future Stripe/billing integration
 * - Testers here get canAccessBusinessFeatures = true in useAccess()
 * 
 * TO ADD A TESTER:
 * Add their email (lowercase) to the BUSINESS_TESTER_EMAILS array below.
 * 
 * TO REMOVE A TESTER:
 * Remove their email from the array.
 */

/**
 * Emails of users who should have Business tier access for testing.
 * All emails are compared case-insensitively.
 */
export const BUSINESS_TESTER_EMAILS: readonly string[] = [
  'edhemmer@gmail.com',    // Owner
  'pieter@example.com',    // Tester - update with actual email
  'bob@example.com',       // Tester - update with actual email
] as const;

/**
 * Check if a given email is in the Business tester list.
 * Comparison is case-insensitive.
 */
export function isBusinessTester(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase();
  return BUSINESS_TESTER_EMAILS.some(
    testerEmail => testerEmail.toLowerCase() === normalizedEmail
  );
}
