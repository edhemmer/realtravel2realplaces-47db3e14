/**
 * v5.10.0: HERE Transit Edge Function Proxy
 *
 * Proxies requests to HERE Public Transit Routing API v8 to fetch
 * real transit routes with schedule data, walking segments, and transfers.
 *
 * Returns normalized response for transitIntelligenceEngine consumption.
 */

import { corsJsonHeaders, handleCors } from '../_shared/cors.ts';

const HERE_TRANSIT_BASE = 'https://transit.router.hereapi.com/v8/routes';

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const HERE_API_KEY = Deno.env.get('HERE_API_KEY');
    if (!HERE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'HERE_API_KEY not configured' }),
        { status: 500, headers: corsJsonHeaders(req) }
      );
    }

    const body = await req.json();
    const { originLat, originLng, destLat, destLng, departureTime, arrivalTime, alternatives } = body;

    if (
      typeof originLat !== 'number' || typeof originLng !== 'number' ||
      typeof destLat !== 'number' || typeof destLng !== 'number'
    ) {
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates' }),
        { status: 400, headers: corsJsonHeaders(req) }
      );
    }

    const url = new URL(HERE_TRANSIT_BASE);
    url.searchParams.set('origin', `${originLat},${originLng}`);
    url.searchParams.set('destination', `${destLat},${destLng}`);
    url.searchParams.set('apikey', HERE_API_KEY);
    url.searchParams.set('return', 'intermediate,travelSummary,fares');

    // HERE Transit v8 requires ISO 8601 (rejects "now"). Always send an
    // explicit timestamp so we get deterministic schedules.
    if (arrivalTime && arrivalTime !== 'now') {
      url.searchParams.set('arrivalTime', arrivalTime);
    } else {
      const dep =
        !departureTime || departureTime === 'now'
          ? new Date().toISOString()
          : departureTime;
      url.searchParams.set('departureTime', dep);
    }

    if (alternatives && typeof alternatives === 'number') {
      url.searchParams.set('alternatives', String(Math.min(alternatives, 3)));
    } else {
      url.searchParams.set('alternatives', '3');
    }

    const res = await fetch(url.toString());

    if (!res.ok) {
      const errText = await res.text();
      console.error(`HERE Transit API failed [${res.status}]: ${errText}`);

      // 400 often means no transit available in this area
      if (res.status === 400) {
        return new Response(
          JSON.stringify({ routes: [], noTransit: true }),
          { status: 200, headers: corsJsonHeaders(req) }
        );
      }

      return new Response(
        JSON.stringify({ error: 'HERE Transit API request failed', status: res.status }),
        { status: 502, headers: corsJsonHeaders(req) }
      );
    }

    const data = await res.json();

    // Normalize HERE response into a slim format
    const routes = (data?.routes || []).map((route: Record<string, unknown>) => {
      const sections = (route.sections || []) as Array<Record<string, unknown>>;

      let totalDurationSec = 0;
      let walkingSec = 0;
      let waitingSec = 0;
      let transitSec = 0;
      let transferCount = 0;
      let departureAt: string | null = null;
      let arrivalAt: string | null = null;
      const legs: Array<Record<string, unknown>> = [];

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const dep = section.departure as Record<string, unknown> | undefined;
        const arr = section.arrival as Record<string, unknown> | undefined;
        const travelSummary = section.travelSummary as Record<string, number> | undefined;
        const transport = section.transport as Record<string, unknown> | undefined;
        const type = section.type as string;

        const sectionDuration = travelSummary?.duration || 0;
        totalDurationSec += sectionDuration;

        if (i === 0 && dep?.time) departureAt = dep.time as string;
        if (i === sections.length - 1 && arr?.time) arrivalAt = arr.time as string;

        if (type === 'pedestrian') {
          walkingSec += sectionDuration;
        } else if (type === 'transit') {
          transitSec += sectionDuration;
          if (i > 0) {
            const prevType = (sections[i - 1] as Record<string, unknown>).type;
            if (prevType === 'pedestrian' || prevType === 'transit') {
              transferCount++;
            }
          }

          legs.push({
            mode: (transport?.mode as string) || 'transit',
            name: (transport?.name as string) || null,
            shortName: (transport?.shortName as string) || null,
            headsign: (transport?.headsign as string) || null,
            departureTime: dep?.time || null,
            arrivalTime: arr?.time || null,
            durationSeconds: sectionDuration,
            intermediateStops: (section.intermediateStops as unknown[])?.length || 0,
          });
        }

        // Estimate waiting as gaps between sections
        if (i > 0 && dep?.time) {
          const prevArr = (sections[i - 1] as Record<string, unknown>).arrival as Record<string, unknown> | undefined;
          if (prevArr?.time) {
            const prevEnd = new Date(prevArr.time as string).getTime();
            const curStart = new Date(dep.time as string).getTime();
            const gap = Math.max(0, (curStart - prevEnd) / 1000);
            waitingSec += gap;
          }
        }
      }

      // First transfer doesn't count (it's the initial boarding)
      transferCount = Math.max(0, transferCount - 1);

      return {
        totalDurationSeconds: totalDurationSec,
        walkingSeconds: walkingSec,
        waitingSeconds: waitingSec,
        transitSeconds: transitSec,
        transferCount,
        departureAt,
        arrivalAt,
        legs,
      };
    });

    return new Response(
      JSON.stringify({ routes, noTransit: false, fetchedAt: Date.now() }),
      { status: 200, headers: corsJsonHeaders(req) }
    );
  } catch (error) {
    console.error('HERE Transit proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsJsonHeaders(req) }
    );
  }
});
