/**
 * generate-notifications - Scheduled edge function
 *
 * Delegates ALL reminder generation to the canonical reminders engine.
 * This handler is responsible only for:
 *   1. Auth / cron verification
 *   2. Loading preferences + active trips
 *   3. Calling the canonical engine per trip
 *
 * Should be invoked via pg_cron on a regular schedule (e.g., every 5 minutes).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { generateRemindersForTrip } from "../_shared/canonical-reminders.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const cronSecret = Deno.env.get("CRON_SECRET_KEY") ?? "";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const authHeader = req.headers.get("Authorization");
    await req.json().catch(() => ({}));
    const isCron =
      cronSecret.length > 0 &&
      authHeader === `Bearer ${cronSecret}`;

    if (!isCron) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date();

    // Load all user preferences
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select(
        "user_id, departure_enabled, departure_hours_before, expense_nudge_enabled, parking_expiry_enabled, parking_expiry_minutes_before, stop_reminder_enabled, stop_reminder_minutes_before, ticket_reminder_enabled, ticket_reminder_days_before"
      );

    if (!prefs || prefs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No users with preferences",
          created: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const prefsMap = new Map<string, (typeof prefs)[0]>();
    for (const p of prefs) prefsMap.set(p.user_id, p);

    // Load active trips
    const { data: activeTrips } = await admin
      .from("trips")
      .select("id, user_id, name, start_date, end_date")
      .eq("trip_state", "active");

    if (!activeTrips || activeTrips.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active trips",
          created: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let totalCreated = 0;

    for (const trip of activeTrips) {
      const userPrefs = prefsMap.get(trip.user_id);
      if (!userPrefs) continue;

      // Delegate to canonical reminders engine
      const count = await generateRemindersForTrip(
        admin,
        trip,
        userPrefs,
        now
      );
      totalCreated += count;
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Generated ${totalCreated} notifications`,
        created: totalCreated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("generate-notifications error:", err);
    return new Response(
      JSON.stringify({ success: false, message: "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
