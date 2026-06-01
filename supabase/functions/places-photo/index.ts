/**
 * v1.0.0: Places Photo Proxy
 * 
 * Proxies Google Places photos to hide API key from client.
 * Input: ?ref=places/{placeId}/photos/{photoRef}/media
 * Output: Image binary (proxied from Google)
 */

import { corsHeaders, handleCors } from "../_shared/cors.ts";
import { gatePlacesRequest } from "../_shared/placesGate.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Auth + per-user daily photo budget gate
  const gate = await gatePlacesRequest(req, "photo");
  if (!gate.ok) return gate.response;

  try {
    const url = new URL(req.url);
    const ref = url.searchParams.get('ref');

    if (!ref) {
      return new Response('Missing ref parameter', {
        status: 400,
        headers: corsHeaders,
      });
    }

    const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!apiKey) {
      return new Response('Not configured', {
        status: 503,
        headers: corsHeaders,
      });
    }

    const photoUrl = `https://places.googleapis.com/v1/${ref}?maxHeightPx=400&maxWidthPx=400&key=${apiKey}`;

    const response = await fetch(photoUrl);
    if (!response.ok) {
      console.error(`[places-photo] Google error: ${response.status}`);
      return new Response('Photo not available', {
        status: 404,
        headers: corsHeaders,
      });
    }

    const imageData = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // Cache 24h
      },
    });
  } catch (err) {
    console.error('[places-photo] Error:', err);
    return new Response('Error', {
      status: 500,
      headers: corsHeaders,
    });
  }
});
