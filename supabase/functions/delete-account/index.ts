/**
 * delete-account
 *
 * Permanently deletes the authenticated user's account.
 * Storage objects are removed before the auth user so account deletion does
 * not leave private receipt files behind after database rows cascade.
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsJsonHeaders, handleCors } from "../_shared/cors.ts";

const RECEIPT_BUCKET = "receipts";
const LIST_PAGE_SIZE = 100;

async function listStorageFiles(
  admin: ReturnType<typeof createClient>,
  prefix: string,
): Promise<string[]> {
  const files: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await admin.storage
      .from(RECEIPT_BUCKET)
      .list(prefix, { limit: LIST_PAGE_SIZE, offset, sortBy: { column: "name", order: "asc" } });

    if (error) throw error;
    const entries = data ?? [];

    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) {
        files.push(path);
      } else {
        files.push(...await listStorageFiles(admin, path));
      }
    }

    if (entries.length < LIST_PAGE_SIZE) break;
    offset += LIST_PAGE_SIZE;
  }

  return files;
}

async function deleteUserReceiptObjects(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  const files = await listStorageFiles(admin, userId);
  if (files.length === 0) return;

  for (let start = 0; start < files.length; start += 100) {
    const batch = files.slice(start, start + 100);
    const { error } = await admin.storage.from(RECEIPT_BUCKET).remove(batch);
    if (error) throw error;
  }
}


async function assertDelete(
  label: string,
  operation: PromiseLike<{ error: unknown }>,
): Promise<void> {
  const { error } = await operation;
  if (error) {
    console.error(`[delete-account] ${label} failed:`, error);
    throw error;
  }
}

async function deleteUserDatabaseRows(
  admin: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  const { data: ownedTrips, error: tripsLookupError } = await admin
    .from("trips")
    .select("id")
    .eq("user_id", userId);

  if (tripsLookupError) throw tripsLookupError;

  const tripIds = (ownedTrips ?? []).map((row: { id: string }) => row.id);

  let bookingIds: string[] = [];
  if (tripIds.length > 0) {
    const { data: ownedBookings, error: bookingLookupError } = await admin
      .from("bookings")
      .select("id")
      .in("trip_id", tripIds);

    if (bookingLookupError) throw bookingLookupError;
    bookingIds = (ownedBookings ?? []).map((row: { id: string }) => row.id);
  }

  // Child/junction rows first. Do not rely on every historical foreign key
  // having ON DELETE CASCADE; older RT2RP schema versions did not consistently
  // attach auth-user cascades.
  if (bookingIds.length > 0) {
    await assertDelete(
      "booking_companions cleanup",
      admin.from("booking_companions").delete().in("booking_id", bookingIds),
    );
  }

  if (tripIds.length > 0) {
    const tripScopedTables = [
      "ticket_reminders",
      "stop_reminders",
      "trip_engagements",
      "engagements",
      "trip_events",
      "trip_notes",
      "parking",
      "packing_items",
      "expenses",
      "companions",
      "bookings",
      "trip_shares",
      "trip_invites",
      "trip_members",
    ] as const;

    for (const table of tripScopedTables) {
      await assertDelete(
        `${table} owned-trip cleanup`,
        admin.from(table).delete().in("trip_id", tripIds),
      );
    }

    await assertDelete(
      "owned trips cleanup",
      admin.from("trips").delete().eq("user_id", userId),
    );
  }

  // References to this user on trips/accounts they do not own.
  await assertDelete(
    "guest memberships cleanup",
    admin.from("trip_members").delete().eq("user_id", userId),
  );
  await assertDelete(
    "shared trip references cleanup",
    admin.from("trip_shares").delete().eq("shared_with_user_id", userId),
  );
  await assertDelete(
    "accepted invite references cleanup",
    admin.from("trip_invites").delete().eq("accepted_by_user_id", userId),
  );
  await assertDelete(
    "invite creator references cleanup",
    admin.from("trip_invites").delete().eq("inviter_user_id", userId),
  );

  // Direct user-owned records.
  const userScopedTables = [
    "device_tokens",
    "email_ingestion_addresses",
    "flight_status_usage",
    "notification_preferences",
    "notifications",
    "pending_imports",
    "places_usage",
    "stop_reminders",
    "support_tickets",
    "ticket_reminders",
    "upgrade_intents",
    "user_roles",
    "profiles",
  ] as const;

  for (const table of userScopedTables) {
    await assertDelete(
      `${table} user cleanup`,
      admin.from(table).delete().eq("user_id", userId),
    );
  }
}

Deno.serve(async (req) => {
  const pre = handleCors(req);
  if (pre) return pre;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsJsonHeaders(req),
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authClient.auth.getClaims(token);

    if (claimsErr || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsJsonHeaders(req),
      });
    }

    const userId = claimsData.claims.sub as string;

    // Revoke every refresh session before destructive cleanup so no new access
    // tokens can be minted while the account is being removed. Existing access
    // JWTs remain valid until their encoded expiry, per Supabase Auth semantics.
    const { error: signOutError } = await authClient.auth.signOut({ scope: "global" });
    if (signOutError) {
      console.error("[delete-account] global sign-out failed:", signOutError);
      return new Response(
        JSON.stringify({ error: "Account session cleanup failed" }),
        { status: 500, headers: corsJsonHeaders(req) },
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    try {
      await deleteUserReceiptObjects(admin, userId);
      await deleteUserDatabaseRows(admin, userId);
    } catch (cleanupErr) {
      console.error("[delete-account] account data cleanup failed:", cleanupErr);
      return new Response(
        JSON.stringify({ error: "Account data cleanup failed" }),
        { status: 500, headers: corsJsonHeaders(req) },
      );
    }

    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
    if (deleteErr) {
      console.error("[delete-account] deleteUser failed:", deleteErr);
      return new Response(
        JSON.stringify({ error: deleteErr.message || "Delete failed" }),
        { status: 500, headers: corsJsonHeaders(req) },
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: corsJsonHeaders(req),
    });
  } catch (err) {
    console.error("[delete-account] error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: corsJsonHeaders(req),
    });
  }
});
