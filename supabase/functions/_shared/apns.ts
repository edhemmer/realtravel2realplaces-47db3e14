// Shared APNs delivery helper for RT2RP Edge Functions.
// Secrets stay server-side; callers pass an admin Supabase client and user id.

// deno-lint-ignore-file no-explicit-any

interface ApnsDeliveryResult {
  configured: boolean;
  sent: number;
  failed: number;
  pruned: number;
  missing?: string[];
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === "string"
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function importP8Key(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    "pkcs8",
    raw,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

async function makeApnsJwt(keyId: string, teamId: string, p8: string): Promise<string> {
  const header = { alg: "ES256", kid: keyId, typ: "JWT" };
  const payload = { iss: teamId, iat: Math.floor(Date.now() / 1000) };
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const key = await importP8Key(p8);
  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(data),
  );
  return `${data}.${base64url(sig)}`;
}

async function sendToApns(opts: {
  token: string;
  jwt: string;
  bundleId: string;
  host: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<{ ok: boolean; status: number; reason?: string }> {
  const payload = {
    aps: { alert: { title: opts.title, body: opts.body }, sound: "default" },
    ...(opts.data ?? {}),
  };

  const res = await fetch(`https://${opts.host}/3/device/${opts.token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${opts.jwt}`,
      "apns-topic": opts.bundleId,
      "apns-push-type": "alert",
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (res.ok) return { ok: true, status: res.status };

  let reason: string | undefined;
  try {
    const json = await res.json();
    reason = json?.reason;
  } catch {
    // no body
  }
  return { ok: false, status: res.status, reason };
}

export async function sendApnsToUser(opts: {
  admin: any;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}): Promise<ApnsDeliveryResult> {
  const keyId = Deno.env.get("APNS_KEY_ID");
  const teamId = Deno.env.get("APNS_TEAM_ID");
  const bundleId = Deno.env.get("APNS_BUNDLE_ID");
  const privateKey = Deno.env.get("APNS_PRIVATE_KEY");
  const useSandbox = Deno.env.get("APNS_USE_SANDBOX") === "true";

  const missing = [
    !keyId && "APNS_KEY_ID",
    !teamId && "APNS_TEAM_ID",
    !bundleId && "APNS_BUNDLE_ID",
    !privateKey && "APNS_PRIVATE_KEY",
  ].filter(Boolean) as string[];

  if (missing.length > 0) {
    return { configured: false, sent: 0, failed: 0, pruned: 0, missing };
  }

  const { data: tokens, error } = await opts.admin
    .from("device_tokens")
    .select("token, platform")
    .eq("user_id", opts.userId)
    .eq("platform", "ios");

  if (error) throw error;
  if (!tokens?.length) return { configured: true, sent: 0, failed: 0, pruned: 0 };

  const jwt = await makeApnsJwt(keyId!, teamId!, privateKey!);
  const host = useSandbox ? "api.sandbox.push.apple.com" : "api.push.apple.com";

  const stale: string[] = [];
  const results = await Promise.all(tokens.map(async (tokenRow: { token: string }) => {
    const result = await sendToApns({
      token: tokenRow.token,
      jwt,
      bundleId: bundleId!,
      host,
      title: opts.title,
      body: opts.body,
      data: opts.data,
    });

    if (
      !result.ok &&
      (result.status === 410 || result.reason === "BadDeviceToken" || result.reason === "Unregistered")
    ) {
      stale.push(tokenRow.token);
    }
    return result;
  }));

  if (stale.length > 0) {
    await opts.admin.from("device_tokens").delete().in("token", stale);
  }

  const sent = results.filter((result) => result.ok).length;
  return {
    configured: true,
    sent,
    failed: results.length - sent,
    pruned: stale.length,
  };
}
