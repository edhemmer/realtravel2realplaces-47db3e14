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
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    try {
      await deleteUserReceiptObjects(admin, userId);
    } catch (storageErr) {
      console.error("[delete-account] receipt cleanup failed:", storageErr);
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
