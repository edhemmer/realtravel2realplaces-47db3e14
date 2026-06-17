/**
 * POST /inbound-email — Postmark inbound webhook receiver
 *
 * 1. Validate INBOUND_EMAIL_WEBHOOK_SECRET (Bearer or query param)
 * 2. Parse Postmark JSON payload
 * 3. Idempotent upsert into pending_imports (keyed on MessageID)
 * 4. Return 200 quickly; heavy parsing happens later
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("INBOUND_EMAIL_WEBHOOK_SECRET")!;
const INTERNAL_WORKER_SECRET = Deno.env.get("INTERNAL_WORKER_SECRET")!;

function unauthorized(msg = "Unauthorized") {
  return new Response(JSON.stringify({ error: msg }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 1. Validate webhook secret ──────────────────────────────────
  // Postmark sends via query param ?secret=... or custom header X-Webhook-Secret
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  const headerSecret = req.headers.get("x-webhook-secret");

  const providedSecret = querySecret ?? headerSecret;

  if (!providedSecret || providedSecret !== WEBHOOK_SECRET) {
    console.error("inbound-email: invalid or missing webhook secret");
    return unauthorized();
  }

  // ── 2. Parse raw body ───────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    const rawBody = await req.text();
    payload = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 3. Extract Postmark fields ──────────────────────────────────
  const messageId = (payload.MessageID as string) ?? null;
  const from = (payload.FromFull as Record<string, string>)?.Email ??
    (payload.From as string) ?? null;
  const subject = (payload.Subject as string) ?? null;
  const textBody = (payload.TextBody as string) ?? "";
  const htmlBody = (payload.HtmlBody as string) ?? "";
  const toFull = payload.ToFull as Array<Record<string, string>> | undefined;

  // Determine which user this is for via the To address
  const toAddress = toFull?.[0]?.Email ?? (payload.To as string) ?? null;

  if (!toAddress) {
    console.error("inbound-email: no To address found");
    return new Response(JSON.stringify({ error: "No recipient address" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 4. Look up user by ingestion address ────────────────────────
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: ingestionRow, error: lookupError } = await supabase
    .from("email_ingestion_addresses")
    .select("user_id, is_active")
    .eq("ingestion_address", toAddress.toLowerCase().trim())
    .maybeSingle();

  if (lookupError) {
    console.error("inbound-email: lookup error", lookupError.message);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!ingestionRow) {
    console.warn("inbound-email: unknown ingestion address", toAddress);
    // Return 200 so Postmark doesn't retry
    return new Response(
      JSON.stringify({ status: "ignored", reason: "unknown_address" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!ingestionRow.is_active) {
    return new Response(
      JSON.stringify({ status: "ignored", reason: "inactive_address" }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  const userId = ingestionRow.user_id;

  // ── 5. Content hash for idempotency ─────────────────────────────
  // Use MessageID if available, otherwise hash the body
  const contentHash = messageId ??
    await computeHash(textBody || htmlBody || subject || "");

  // Check for duplicate
  const { data: existing } = await supabase
    .from("pending_imports")
    .select("id")
    .eq("user_id", userId)
    .eq("content_hash", contentHash)
    .maybeSingle();

  if (existing) {
    return new Response(
      JSON.stringify({ status: "duplicate", id: existing.id }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // ── 6. Write pending_imports record ─────────────────────────────
  const { data: inserted, error: insertError } = await supabase
    .from("pending_imports")
    .insert({
      user_id: userId,
      parsed_type: "email_inbound",
      status: "pending",
      confidence: 0,
      parsed_data: {
        from,
        subject,
        text_body: textBody,
        html_body: htmlBody,
        to_address: toAddress,
        message_id: messageId,
      },
      provider_message_id: messageId,
      content_hash: contentHash,
      subject,
      sender: from,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("inbound-email: insert error", insertError.message);
    return new Response(JSON.stringify({ error: "Failed to store import" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(
    `inbound-email: created pending_import ${inserted.id} for user ${userId}`,
  );

  // ── 7. Trigger async processing (fire-and-forget) ──────────────
  try {
    const funcUrl = `${SUPABASE_URL}/functions/v1/process-pending-import`;
    fetch(funcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_WORKER_SECRET,
      },
      body: JSON.stringify({ import_id: inserted.id }),
    }).catch((e) => console.error("inbound-email: async trigger failed", e));
  } catch (e) {
    console.error("inbound-email: async trigger error", e);
  }

  return new Response(
    JSON.stringify({ status: "accepted", id: inserted.id }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

/** Simple SHA-256 hex hash for dedup */
async function computeHash(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
