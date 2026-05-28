// Send a push notification to all device tokens for a given user.
// Currently supports APNs (iOS) via token-based auth (.p8 key).
// FCM (Android) can be added later.
//
// Required secrets:
//   APNS_KEY_ID       — 10-char Key ID from Apple Developer
//   APNS_TEAM_ID      — 10-char Team ID
//   APNS_BUNDLE_ID    — e.g. app.lovable.a314579f7aa3c49b7b1788640b495f1f7
//   APNS_PRIVATE_KEY  — full contents of AuthKey_XXX.p8 (PEM)
//   APNS_USE_SANDBOX  — "true" for dev (sandbox.push.apple.com), "false" for prod
//
// Body: { user_id: uuid, title: string, body: string, data?: object }

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface Body {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

function base64url(input: ArrayBuffer | string): string {
  const bytes = typeof input === 'string'
    ? new TextEncoder().encode(input)
    : new Uint8Array(input);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function importP8Key(pem: string): Promise<CryptoKey> {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return await crypto.subtle.importKey(
    'pkcs8',
    raw,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
}

async function makeApnsJwt(keyId: string, teamId: string, p8: string): Promise<string> {
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const payload = { iss: teamId, iat: Math.floor(Date.now() / 1000) };
  const data = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const key = await importP8Key(p8);
  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
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
    aps: { alert: { title: opts.title, body: opts.body }, sound: 'default' },
    ...(opts.data ?? {}),
  };
  const res = await fetch(`https://${opts.host}/3/device/${opts.token}`, {
    method: 'POST',
    headers: {
      authorization: `bearer ${opts.jwt}`,
      'apns-topic': opts.bundleId,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (res.ok) return { ok: true, status: res.status };
  let reason: string | undefined;
  try {
    const json = await res.json();
    reason = json?.reason;
  } catch { /* no body */ }
  return { ok: false, status: res.status, reason };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'missing auth' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the caller is a valid Supabase user (defense in depth).
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as Partial<Body>;
    if (!body.user_id || !body.title || !body.body) {
      return new Response(JSON.stringify({ error: 'user_id, title, body required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const { data: tokens, error: tokErr } = await admin
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', body.user_id);
    if (tokErr) throw tokErr;

    const iosTokens = (tokens ?? []).filter((t) => t.platform === 'ios');
    if (iosTokens.length === 0) {
      return new Response(JSON.stringify({ sent: 0, note: 'no ios device tokens' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const KEY_ID = Deno.env.get('APNS_KEY_ID');
    const TEAM_ID = Deno.env.get('APNS_TEAM_ID');
    const BUNDLE_ID = Deno.env.get('APNS_BUNDLE_ID');
    const P8 = Deno.env.get('APNS_PRIVATE_KEY');
    const SANDBOX = Deno.env.get('APNS_USE_SANDBOX') === 'true';
    if (!KEY_ID || !TEAM_ID || !BUNDLE_ID || !P8) {
      return new Response(JSON.stringify({
        error: 'APNs not configured',
        missing: [
          !KEY_ID && 'APNS_KEY_ID',
          !TEAM_ID && 'APNS_TEAM_ID',
          !BUNDLE_ID && 'APNS_BUNDLE_ID',
          !P8 && 'APNS_PRIVATE_KEY',
        ].filter(Boolean),
      }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = await makeApnsJwt(KEY_ID, TEAM_ID, P8);
    const host = SANDBOX ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';

    const stale: string[] = [];
    const results = await Promise.all(iosTokens.map(async (t) => {
      const r = await sendToApns({
        token: t.token, jwt, bundleId: BUNDLE_ID, host,
        title: body.title!, body: body.body!, data: body.data,
      });
      // 410 Gone or BadDeviceToken -> token is stale, remove it
      if (!r.ok && (r.status === 410 || r.reason === 'BadDeviceToken' || r.reason === 'Unregistered')) {
        stale.push(t.token);
      }
      return r;
    }));

    if (stale.length > 0) {
      await admin.from('device_tokens').delete().in('token', stale);
    }

    const sent = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({ sent, failed: results.length - sent, pruned: stale.length }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[send-push] error', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
