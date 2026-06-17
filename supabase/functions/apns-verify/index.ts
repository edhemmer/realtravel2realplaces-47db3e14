// APNs credentials verification function
// Signs a JWT with the stored .p8 key and pings Apple's APNs server
// to confirm credentials are valid end-to-end.

import { corsJsonHeaders, handleCors } from '../_shared/cors.ts';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';

function b64urlToUint8(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    b64url.length + ((4 - (b64url.length % 4)) % 4),
    '=',
  );
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  return b64urlToUint8(body);
}

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  const checks: Record<string, { ok: boolean; detail: string }> = {};

  const teamId = Deno.env.get('APNS_TEAM_ID') ?? '';
  const keyId = Deno.env.get('APNS_KEY_ID') ?? '';
  const privateKey = Deno.env.get('APNS_PRIVATE_KEY') ?? '';
  const bundleId = Deno.env.get('APNS_BUNDLE_ID') ?? '';
  const useSandboxRaw = Deno.env.get('APNS_USE_SANDBOX') ?? '';

  // 1. Team ID format
  checks.team_id = /^[A-Z0-9]{10}$/.test(teamId)
    ? { ok: true, detail: `${teamId} (10 chars, valid format)` }
    : { ok: false, detail: `Expected 10 uppercase alphanumeric chars, got "${teamId}" (${teamId.length} chars)` };

  // 2. Key ID format
  checks.key_id = /^[A-Z0-9]{10}$/.test(keyId)
    ? { ok: true, detail: `${keyId} (10 chars, valid format)` }
    : { ok: false, detail: `Expected 10 uppercase alphanumeric chars, got "${keyId}" (${keyId.length} chars)` };

  // 3. Bundle ID format
  checks.bundle_id = /^[a-zA-Z0-9.-]+\.[a-zA-Z0-9.-]+$/.test(bundleId)
    ? { ok: true, detail: bundleId }
    : { ok: false, detail: `Invalid bundle ID: "${bundleId}"` };

  // 4. Sandbox flag
  const useSandbox = useSandboxRaw.toLowerCase() === 'true';
  checks.use_sandbox = /^(true|false)$/i.test(useSandboxRaw)
    ? { ok: true, detail: `${useSandbox} (${useSandbox ? 'sandbox/TestFlight' : 'production'})` }
    : { ok: false, detail: `Expected "true" or "false", got "${useSandboxRaw}"` };

  // 5. Private key parses as ES256
  let cryptoKey: CryptoKey | null = null;
  try {
    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      throw new Error('Missing PEM header. Must include -----BEGIN PRIVATE KEY-----');
    }
    const pkcs8 = pemToPkcs8(privateKey);
    cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      pkcs8,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );
    checks.private_key = { ok: true, detail: 'Valid ES256 .p8 key' };
  } catch (e) {
    checks.private_key = { ok: false, detail: `Failed to parse: ${(e as Error).message}` };
  }

  // 6. Live APNs handshake
  if (cryptoKey && checks.team_id.ok && checks.key_id.ok && checks.bundle_id.ok) {
    try {
      const jwt = await create(
        { alg: 'ES256', kid: keyId, typ: 'JWT' },
        { iss: teamId, iat: getNumericDate(0) },
        cryptoKey,
      );

      // Send to a fake device token to verify auth — Apple returns BadDeviceToken
      // (400) for invalid tokens AFTER auth succeeds, or 403 if creds are bad.
      const host = useSandbox ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
      const fakeToken = '0'.repeat(64);
      const res = await fetch(`https://${host}/3/device/${fakeToken}`, {
        method: 'POST',
        headers: {
          'authorization': `bearer ${jwt}`,
          'apns-topic': bundleId,
          'apns-push-type': 'alert',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ aps: { alert: 'test' } }),
      });
      const body = await res.text();

      if (res.status === 400 && body.includes('BadDeviceToken')) {
        checks.apns_handshake = {
          ok: true,
          detail: `✅ Apple accepted credentials (rejected fake token as expected). Host: ${host}`,
        };
      } else if (res.status === 403) {
        checks.apns_handshake = {
          ok: false,
          detail: `❌ Apple rejected credentials (403): ${body}. Check Team ID / Key ID / .p8 key match.`,
        };
      } else {
        checks.apns_handshake = {
          ok: res.status < 500,
          detail: `Status ${res.status}: ${body}`,
        };
      }
    } catch (e) {
      checks.apns_handshake = { ok: false, detail: `Request failed: ${(e as Error).message}` };
    }
  } else {
    checks.apns_handshake = { ok: false, detail: 'Skipped — fix earlier errors first' };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return new Response(
    JSON.stringify({ ok: allOk, checks }, null, 2),
    { status: 200, headers: corsJsonHeaders(req) },
  );
});
