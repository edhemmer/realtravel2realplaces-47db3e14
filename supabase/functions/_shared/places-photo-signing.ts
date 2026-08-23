const encoder = new TextEncoder();

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacHex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toHex(new Uint8Array(signature));
}

export interface SignedPlacesPhoto {
  ref: string;
  expiresAt: number;
  signature: string;
}

/**
 * Sign one Google Places photo resource for short-lived public image delivery.
 * Returns null when the signing secret is unavailable so callers fail closed.
 */
export async function signPlacesPhotoRef(
  ref: string,
  ttlSeconds = 24 * 60 * 60,
): Promise<SignedPlacesPhoto | null> {
  const secret = Deno.env.get('PLACES_PHOTO_SIGNING_SECRET') ?? '';
  if (!secret) return null;

  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = await hmacHex(secret, `${ref}\n${expiresAt}`);
  return { ref, expiresAt, signature };
}

/**
 * Verify a signed photo request. Expiration is part of the signature so callers
 * cannot extend a URL. A small maximum future window prevents effectively
 * permanent URLs even if a signer bug supplies an excessive expiry.
 */
export async function verifyPlacesPhotoSignature(
  ref: string,
  expiresAt: number,
  signature: string,
): Promise<boolean> {
  const secret = Deno.env.get('PLACES_PHOTO_SIGNING_SECRET') ?? '';
  if (!secret || !Number.isFinite(expiresAt) || !signature) return false;

  const now = Math.floor(Date.now() / 1000);
  if (expiresAt <= now || expiresAt > now + 25 * 60 * 60) return false;

  const expected = await hmacHex(secret, `${ref}\n${expiresAt}`);
  return timingSafeEqualHex(expected, signature.toLowerCase());
}
