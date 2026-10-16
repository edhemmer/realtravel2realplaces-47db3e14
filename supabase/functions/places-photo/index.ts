/**
 * Places Photo Proxy
 *
 * Proxies Google Places photos without exposing the provider key.
 * Public image delivery is authorized by a short-lived HMAC signature minted
 * by the authenticated nearby-places function.
 */

import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { verifyPlacesPhotoSignature } from "../_shared/places-photo-signing.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get('ref') ?? '';
    const expiresAt = Number(url.searchParams.get('exp') ?? '');
    const signature = url.searchParams.get('sig') ?? '';

    if (!ref || !/^places\/[^/]+\/photos\/[^/]+\/media$/.test(ref)) {
      return new Response('Invalid ref parameter', {
        status: 400,
        headers: getCorsHeaders(req),
      });
    }

    const authorized = await verifyPlacesPhotoSignature(ref, expiresAt, signature);
    if (!authorized) {
      return new Response('Unauthorized', {
        status: 401,
        headers: getCorsHeaders(req),
      });
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return new Response('Not configured', {
        status: 503,
        headers: getCorsHeaders(req),
      });
    }

    const photoUrl = `https://places.googleapis.com/v1/${ref}?maxHeightPx=400&maxWidthPx=400&key=${apiKey}`;
    const response = await fetch(photoUrl);

    if (!response.ok) {
      console.error(`[places-photo] Google error: ${response.status}`);
      return new Response('Photo not available', {
        status: 404,
        headers: getCorsHeaders(req),
      });
    }

    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const now = Math.floor(Date.now() / 1000);
    const remainingTtl = Math.max(0, expiresAt - now);

    return new Response(imageData, {
      headers: {
        ...getCorsHeaders(req),
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${Math.min(remainingTtl, 86400)}`,
      },
    });
  } catch (err) {
    console.error('[places-photo] Error:', err);
    return new Response('Error', {
      status: 500,
      headers: getCorsHeaders(req),
    });
  }
});
