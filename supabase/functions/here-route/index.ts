/**
 * v5.9.2: HERE Route Edge Function Proxy
 *
 * Proxies requests to HERE Routing API v8 to fetch:
 * - baseline travel time (no traffic)
 * - live travel time (with traffic)
 *
 * Returns a normalized response for trafficIntelligenceEngine consumption.
 */

import { corsJsonHeaders, handleCors } from '../_shared/cors.ts';
import { validateAuth } from '../_shared/auth.ts';

const HERE_API_BASE = 'https://router.hereapi.com/v8/routes';

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const auth = await validateAuth(req);
    if (!auth.success) return auth.errorResponse!;

    const HERE_API_KEY = Deno.env.get('HERE_API_KEY');
    if (!HERE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'HERE_API_KEY not configured' }),
        { status: 500, headers: corsJsonHeaders(req) }
      );
    }

    const body = await req.json();
    const { originLat, originLng, destLat, destLng, departureTime } = body;

    if (
      typeof originLat !== 'number' || typeof originLng !== 'number' ||
      typeof destLat !== 'number' || typeof destLng !== 'number'
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: corsJsonHeaders(req) }
      );
    }

    const origin = `${originLat},${originLng}`;
    const dest = `${destLat},${destLng}`;

    // Fetch live (with traffic) and baseline (no traffic) in parallel
    const liveUrl = new URL(HERE_API_BASE);
    liveUrl.searchParams.set('transportMode', 'car');
    liveUrl.searchParams.set('origin', origin);
    liveUrl.searchParams.set('destination', dest);
    liveUrl.searchParams.set('return', 'summary');
    liveUrl.searchParams.set('apikey', HERE_API_KEY);
    // HERE Routing API v8 requires ISO 8601 timestamp or the literal "any".
    // "now" is NOT accepted (returns 400 E605001). Map "now"/empty -> current ISO.
    const liveDeparture =
      !departureTime || departureTime === 'now'
        ? new Date().toISOString()
        : departureTime;
    liveUrl.searchParams.set('departureTime', liveDeparture);

    const baselineUrl = new URL(HERE_API_BASE);
    baselineUrl.searchParams.set('transportMode', 'car');
    baselineUrl.searchParams.set('origin', origin);
    baselineUrl.searchParams.set('destination', dest);
    baselineUrl.searchParams.set('return', 'summary');
    baselineUrl.searchParams.set('apikey', HERE_API_KEY);
    // "any" = no traffic consideration → baseline travel time
    baselineUrl.searchParams.set('departureTime', 'any');

    const [liveRes, baselineRes] = await Promise.all([
      fetch(liveUrl.toString()),
      fetch(baselineUrl.toString()),
    ]);

    if (!liveRes.ok) {
      const errText = await liveRes.text();
      console.error(`HERE live route failed [${liveRes.status}]: ${errText}`);
      return new Response(
        JSON.stringify({ error: 'HERE API request failed', status: liveRes.status }),
        { status: 502, headers: corsJsonHeaders(req) }
      );
    }

    const liveData = await liveRes.json();
    const baselineData = baselineRes.ok ? await baselineRes.json() : null;

    // Extract summary from HERE response
    const liveSection = liveData?.routes?.[0]?.sections?.[0]?.summary;
    const baselineSection = baselineData?.routes?.[0]?.sections?.[0]?.summary;

    if (!liveSection) {
      return new Response(
        JSON.stringify({ error: 'No route found' }),
        { status: 404, headers: corsJsonHeaders(req) }
      );
    }

    // HERE returns duration in seconds, length in meters
    const liveDurationSec = liveSection.duration || 0;
    const liveLengthMeters = liveSection.length || 0;
    const baselineDurationSec = baselineSection?.baseDuration || baselineSection?.duration || liveDurationSec;

    // Check for incidents via typicalDuration if available
    const typicalDurationSec = liveSection.typicalDuration || null;

    const result = {
      liveTravelTimeSeconds: liveDurationSec,
      baselineTravelTimeSeconds: baselineDurationSec,
      distanceMeters: liveLengthMeters,
      typicalTravelTimeSeconds: typicalDurationSec,
      hasIncident: typicalDurationSec
        ? (liveDurationSec - typicalDurationSec) > 300
        : (liveDurationSec - baselineDurationSec) > 600,
      fetchedAt: Date.now(),
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: corsJsonHeaders(req) }
    );
  } catch (error) {
    console.error('HERE route proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsJsonHeaders(req) }
    );
  }
});
