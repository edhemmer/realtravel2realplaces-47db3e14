/**
 * Canonical Reminders Engine
 *
 * Single source of truth for all notification generation logic.
 * The generate-notifications edge function delegates to this engine.
 *
 * Normalized reminder types:
 *   departure | next_stop | ticket_required | expense_nudge |
 *   parking_expiration | lodging_checkin | car_pickup | tour_start | manual
 *
 * Idempotency:
 *   - Record-linked reminders use DB unique index (user_id, type, link_record_id)
 *   - Time-based reminders (expense_nudge) use date-window dedup queries
 *
 * All preferences are evaluated HERE, not in the UI or edge function handler.
 */

// deno-lint-ignore-file no-explicit-any

/** Canonical reminder type enum */
export type ReminderType =
  | "departure"
  | "next_stop"
  | "ticket_required"
  | "expense_nudge"
  | "parking_expiration"
  | "lodging_checkin"
  | "car_pickup"
  | "tour_start"
  | "manual";

/** Shape of a pending reminder to be inserted */
interface PendingReminder {
  user_id: string;
  trip_id: string;
  type: ReminderType;
  title: string;
  message: string;
  link_tab: string;
  link_record_id?: string;
  scheduled_for: string;
}

/** Preferences row shape */
interface UserPrefs {
  user_id: string;
  departure_enabled: boolean;
  departure_hours_before: number;
  expense_nudge_enabled: boolean;
  parking_expiry_enabled: boolean;
  parking_expiry_minutes_before: number;
  stop_reminder_enabled: boolean;
  stop_reminder_minutes_before: number;
  ticket_reminder_enabled: boolean;
  ticket_reminder_days_before: number;
}

/** Trip row shape */
interface ActiveTrip {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date: string;
}

/**
 * Insert a reminder idempotently.
 * Uses upsert with ON CONFLICT on the unique partial index for record-linked reminders.
 * Returns true if a new row was created.
 */
async function insertReminder(
  admin: any,
  reminder: PendingReminder
): Promise<boolean> {
  if (reminder.link_record_id) {
    // Record-linked: rely on unique index (user_id, type, link_record_id)
    const { data, error } = await admin
      .from("notifications")
      .upsert(reminder, {
        onConflict: "user_id,type,link_record_id",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      // Duplicate key → already exists, not an error
      if (error.code === "23505") return false;
      console.error("insertReminder error:", error);
      return false;
    }
    return !!data && data.length > 0;
  } else {
    // Non-record (expense_nudge) – caller already did date-window dedup
    const { error } = await admin.from("notifications").insert(reminder);
    if (error) {
      if (error.code === "23505") return false;
      console.error("insertReminder error:", error);
      return false;
    }
    return true;
  }
}

/**
 * Generate all reminders for a single trip based on user preferences.
 * This is the ONLY place reminder logic lives.
 */
export async function generateRemindersForTrip(
  admin: any,
  trip: ActiveTrip,
  prefs: UserPrefs,
  now: Date
): Promise<number> {
  const nowISO = now.toISOString();
  let created = 0;

  // --- DEPARTURE ---
  if (prefs.departure_enabled) {
    const windowEnd = new Date(
      now.getTime() + (prefs.departure_hours_before || 24) * 3600_000
    );
    const { data: flights } = await admin
      .from("bookings")
      .select(
        "id, vendor_name, departure_airport_code, arrival_airport_code"
      )
      .eq("trip_id", trip.id)
      .eq("booking_type", "flight")
      .gte("start_datetime", nowISO)
      .lte("start_datetime", windowEnd.toISOString());

    for (const f of flights ?? []) {
      const route =
        f.departure_airport_code && f.arrival_airport_code
          ? `${f.departure_airport_code} → ${f.arrival_airport_code}`
          : f.vendor_name;
      if (
        await insertReminder(admin, {
          user_id: trip.user_id,
          trip_id: trip.id,
          type: "departure",
          title: "Flight departing soon",
          message: `${route} departs within ${prefs.departure_hours_before || 24}h — ${trip.name}`,
          link_tab: "bookings",
          link_record_id: f.id,
          scheduled_for: nowISO,
        })
      )
        created++;
    }
  }

  // --- PARKING EXPIRATION ---
  if (prefs.parking_expiry_enabled) {
    const mins = prefs.parking_expiry_minutes_before || 15;
    const windowEnd = new Date(now.getTime() + mins * 60_000);
    const { data: parkingList } = await admin
      .from("parking")
      .select("id, label")
      .eq("trip_id", trip.id)
      .not("end_datetime", "is", null)
      .gte("end_datetime", nowISO)
      .lte("end_datetime", windowEnd.toISOString());

    for (const p of parkingList ?? []) {
      if (
        await insertReminder(admin, {
          user_id: trip.user_id,
          trip_id: trip.id,
          type: "parking_expiration",
          title: "Parking expiring soon",
          message: `${p.label} expires within ${mins} min — ${trip.name}`,
          link_tab: "parking",
          link_record_id: p.id,
          scheduled_for: nowISO,
        })
      )
        created++;
    }
  }

  // --- EXPENSE NUDGE (time-based dedup) ---
  if (prefs.expense_nudge_enabled) {
    const tripStart = new Date(trip.start_date + "T00:00:00");
    const tripEnd = new Date(trip.end_date + "T23:59:59");
    if (now >= tripStart && now <= tripEnd) {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const { data: existing } = await admin
        .from("notifications")
        .select("id")
        .eq("user_id", trip.user_id)
        .eq("type", "expense_nudge")
        .eq("trip_id", trip.id)
        .gte("created_at", todayStart.toISOString())
        .limit(1);

      if (!existing || existing.length === 0) {
        if (
          await insertReminder(admin, {
            user_id: trip.user_id,
            trip_id: trip.id,
            type: "expense_nudge",
            title: "Log today's expenses",
            message: `Don't forget to capture your spending for ${trip.name}`,
            link_tab: "expenses",
            scheduled_for: nowISO,
          })
        )
          created++;
      }
    }
  }

  // --- TOUR START / NEXT STOP ---
  if (prefs.stop_reminder_enabled) {
    const mins = prefs.stop_reminder_minutes_before || 60;
    const windowEnd = new Date(now.getTime() + mins * 60_000);
    const { data: engagements } = await admin
      .from("engagements")
      .select("id, name, date, start_time, location")
      .eq("trip_id", trip.id);

    for (const eng of engagements ?? []) {
      const engDatetime = new Date(`${eng.date}T${eng.start_time}`);
      if (engDatetime >= now && engDatetime <= windowEnd) {
        if (
          await insertReminder(admin, {
            user_id: trip.user_id,
            trip_id: trip.id,
            type: "tour_start",
            title: `Stop coming up: ${eng.name}`,
            message: `${eng.name}${eng.location ? ` at ${eng.location}` : ""} — ${trip.name}`,
            link_tab: "tour",
            link_record_id: eng.id,
            scheduled_for: nowISO,
          })
        )
          created++;
      }
    }
  }

  // --- TICKET REQUIRED ---
  if (prefs.ticket_reminder_enabled) {
    const days = prefs.ticket_reminder_days_before || 3;
    const windowEnd = new Date(now.getTime() + days * 86_400_000);
    const { data: activities } = await admin
      .from("bookings")
      .select("id, vendor_name")
      .eq("trip_id", trip.id)
      .eq("booking_type", "activity")
      .eq("ticket_required", true)
      .eq("tickets_purchased", false)
      .gte("start_datetime", nowISO)
      .lte("start_datetime", windowEnd.toISOString());

    for (const a of activities ?? []) {
      if (
        await insertReminder(admin, {
          user_id: trip.user_id,
          trip_id: trip.id,
          type: "ticket_required",
          title: `Buy tickets: ${a.vendor_name}`,
          message: `${a.vendor_name} requires advance tickets — ${trip.name}`,
          link_tab: "bookings",
          link_record_id: a.id,
          scheduled_for: nowISO,
        })
      )
        created++;
    }
  }

  // --- LODGING CHECK-IN ---
  // Derived from stay bookings starting within departure window (reuses departure_hours_before)
  if (prefs.departure_enabled) {
    const hours = prefs.departure_hours_before || 24;
    const windowEnd = new Date(now.getTime() + hours * 3600_000);
    const { data: stays } = await admin
      .from("bookings")
      .select("id, vendor_name, property_name")
      .eq("trip_id", trip.id)
      .eq("booking_type", "stay")
      .gte("start_datetime", nowISO)
      .lte("start_datetime", windowEnd.toISOString());

    for (const s of stays ?? []) {
      if (
        await insertReminder(admin, {
          user_id: trip.user_id,
          trip_id: trip.id,
          type: "lodging_checkin",
          title: "Check-in approaching",
          message: `${s.property_name || s.vendor_name} check-in within ${hours}h — ${trip.name}`,
          link_tab: "bookings",
          link_record_id: s.id,
          scheduled_for: nowISO,
        })
      )
        created++;
    }
  }

  // --- CAR PICKUP ---
  if (prefs.departure_enabled) {
    const hours = prefs.departure_hours_before || 24;
    const windowEnd = new Date(now.getTime() + hours * 3600_000);
    const { data: rentals } = await admin
      .from("bookings")
      .select("id, vendor_name, rental_company")
      .eq("trip_id", trip.id)
      .eq("booking_type", "car_rental")
      .gte("start_datetime", nowISO)
      .lte("start_datetime", windowEnd.toISOString());

    for (const r of rentals ?? []) {
      if (
        await insertReminder(admin, {
          user_id: trip.user_id,
          trip_id: trip.id,
          type: "car_pickup",
          title: "Car pickup approaching",
          message: `${r.rental_company || r.vendor_name} pickup within ${hours}h — ${trip.name}`,
          link_tab: "bookings",
          link_record_id: r.id,
          scheduled_for: nowISO,
        })
      )
        created++;
    }
  }

  return created;
}
