/**
 * generate-notifications - Scheduled edge function to create in-app notifications
 *
 * Scans active trips and generates notifications based on user preferences:
 * - Departure reminders (X hours before flight)
 * - Expense logging nudges (daily during active trips)
 * - Parking expiration alerts (X minutes before)
 * - Tour stop reminders (X minutes before)
 *
 * Should be invoked via pg_cron on a regular schedule (e.g., every 5 minutes).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const cronSecret = Deno.env.get("CRON_SECRET_KEY") ?? "";

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    // Verify cron secret
    const authHeader = req.headers.get("Authorization");
    const body = await req.json().catch(() => ({}));
    const isCron = authHeader === `Bearer ${cronSecret}` ||
      (authHeader?.startsWith("Bearer ") && cronSecret === "");

    // Allow anon key for cron invocations via pg_net
    if (!isCron && !authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, message: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const now = new Date();
    const nowISO = now.toISOString();

    let created = 0;

    // 1. DEPARTURE REMINDERS
    // Find flights departing within user's configured window that haven't been notified yet
    const { data: prefs } = await admin
      .from("notification_preferences")
      .select("user_id, departure_enabled, departure_hours_before, expense_nudge_enabled, parking_expiry_enabled, parking_expiry_minutes_before, stop_reminder_enabled, stop_reminder_minutes_before");

    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No users with preferences", created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a map of user preferences
    const prefsMap = new Map<string, typeof prefs[0]>();
    for (const p of prefs) {
      prefsMap.set(p.user_id, p);
    }

    // Get active trips with their owners
    const { data: activeTrips } = await admin
      .from("trips")
      .select("id, user_id, name, start_date, end_date, trip_state")
      .eq("trip_state", "active");

    if (!activeTrips || activeTrips.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "No active trips", created: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const trip of activeTrips) {
      const userPrefs = prefsMap.get(trip.user_id);
      if (!userPrefs) continue;

      // --- DEPARTURE REMINDERS ---
      if (userPrefs.departure_enabled) {
        const hoursWindow = userPrefs.departure_hours_before || 24;
        const windowEnd = new Date(now.getTime() + hoursWindow * 60 * 60 * 1000);

        const { data: flights } = await admin
          .from("bookings")
          .select("id, vendor_name, start_datetime, airline, departure_airport_code, arrival_airport_code")
          .eq("trip_id", trip.id)
          .eq("booking_type", "flight")
          .gte("start_datetime", nowISO)
          .lte("start_datetime", windowEnd.toISOString());

        if (flights) {
          for (const flight of flights) {
            // Check if notification already exists for this flight
            const { data: existing } = await admin
              .from("notifications")
              .select("id")
              .eq("user_id", trip.user_id)
              .eq("type", "departure")
              .eq("link_record_id", flight.id)
              .limit(1);

            if (!existing || existing.length === 0) {
              const route = flight.departure_airport_code && flight.arrival_airport_code
                ? `${flight.departure_airport_code} → ${flight.arrival_airport_code}`
                : flight.vendor_name;

              await admin.from("notifications").insert({
                user_id: trip.user_id,
                trip_id: trip.id,
                type: "departure",
                title: `Flight departing soon`,
                message: `${route} departs within ${hoursWindow}h — ${trip.name}`,
                link_tab: "bookings",
                link_record_id: flight.id,
                scheduled_for: nowISO,
              });
              created++;
            }
          }
        }
      }

      // --- PARKING EXPIRATION ---
      if (userPrefs.parking_expiry_enabled) {
        const minutesWindow = userPrefs.parking_expiry_minutes_before || 15;
        const windowEnd = new Date(now.getTime() + minutesWindow * 60 * 1000);

        const { data: parkingList } = await admin
          .from("parking")
          .select("id, label, end_datetime")
          .eq("trip_id", trip.id)
          .not("end_datetime", "is", null)
          .gte("end_datetime", nowISO)
          .lte("end_datetime", windowEnd.toISOString());

        if (parkingList) {
          for (const parking of parkingList) {
            const { data: existing } = await admin
              .from("notifications")
              .select("id")
              .eq("user_id", trip.user_id)
              .eq("type", "parking_expiry")
              .eq("link_record_id", parking.id)
              .limit(1);

            if (!existing || existing.length === 0) {
              await admin.from("notifications").insert({
                user_id: trip.user_id,
                trip_id: trip.id,
                type: "parking_expiry",
                title: `Parking expiring soon`,
                message: `${parking.label} expires within ${minutesWindow} min — ${trip.name}`,
                link_tab: "parking",
                link_record_id: parking.id,
                scheduled_for: nowISO,
              });
              created++;
            }
          }
        }
      }

      // --- EXPENSE NUDGE ---
      if (userPrefs.expense_nudge_enabled) {
        const tripStart = new Date(trip.start_date + "T00:00:00");
        const tripEnd = new Date(trip.end_date + "T23:59:59");

        if (now >= tripStart && now <= tripEnd) {
          // Only one nudge per day
          const todayStart = new Date(now);
          todayStart.setHours(0, 0, 0, 0);

          const { data: existingNudge } = await admin
            .from("notifications")
            .select("id")
            .eq("user_id", trip.user_id)
            .eq("type", "expense_nudge")
            .eq("trip_id", trip.id)
            .gte("created_at", todayStart.toISOString())
            .limit(1);

          if (!existingNudge || existingNudge.length === 0) {
            await admin.from("notifications").insert({
              user_id: trip.user_id,
              trip_id: trip.id,
              type: "expense_nudge",
              title: `Log today's expenses`,
              message: `Don't forget to capture your spending for ${trip.name}`,
              link_tab: "expenses",
              scheduled_for: nowISO,
            });
            created++;
          }
        }
      }

      // --- STOP REMINDERS ---
      if (userPrefs.stop_reminder_enabled) {
        const minutesWindow = userPrefs.stop_reminder_minutes_before || 60;
        const windowEnd = new Date(now.getTime() + minutesWindow * 60 * 1000);

        const { data: engagements } = await admin
          .from("engagements")
          .select("id, name, date, start_time, location")
          .eq("trip_id", trip.id);

        if (engagements) {
          for (const eng of engagements) {
            // Combine date + time
            const engDatetime = new Date(`${eng.date}T${eng.start_time}`);
            if (engDatetime >= now && engDatetime <= windowEnd) {
              const { data: existing } = await admin
                .from("notifications")
                .select("id")
                .eq("user_id", trip.user_id)
                .eq("type", "stop_reminder")
                .eq("link_record_id", eng.id)
                .limit(1);

              if (!existing || existing.length === 0) {
                await admin.from("notifications").insert({
                  user_id: trip.user_id,
                  trip_id: trip.id,
                  type: "stop_reminder",
                  title: `Stop coming up: ${eng.name}`,
                  message: `${eng.name}${eng.location ? ` at ${eng.location}` : ""} — ${trip.name}`,
                  link_tab: "tour",
                  link_record_id: eng.id,
                  scheduled_for: nowISO,
                });
                created++;
              }
            }
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: `Generated ${created} notifications`, created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-notifications error:", err);
    return new Response(JSON.stringify({ success: false, message: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
