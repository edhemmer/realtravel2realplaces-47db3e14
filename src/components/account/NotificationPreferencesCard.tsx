/**
 * Notification preferences are intentionally withheld from user exposure.
 *
 * RT2RP has persisted preferences, a canonical reminder generator, and APNs
 * delivery code, but the repository does not prove that generate-notifications
 * is scheduled and executing reliably in production. Showing toggles such as
 * "Get notified" or "Alert before" would therefore promise delivery that has
 * not been validated end-to-end.
 *
 * Re-enable only after the complete chain is proven:
 * preference -> scheduled generator -> notification row -> device delivery or
 * in-app delivery -> retry/failure handling -> observable production evidence.
 */
export function NotificationPreferencesCard() {
  return null;
}
