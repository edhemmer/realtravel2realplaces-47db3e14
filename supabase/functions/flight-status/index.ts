import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJsonHeaders, handleCors } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    // Authenticate caller
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: corsJsonHeaders(req),
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    );
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: corsJsonHeaders(req),
      });
    }

    // Validate input
    const body = await req.json();
    const { flightNumber, departureDate } = body || {};

    if (!flightNumber || typeof flightNumber !== 'string' ||
        !departureDate || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate)) {
      return new Response(JSON.stringify({ error: 'Invalid input', signal: null }), {
        status: 400, headers: corsJsonHeaders(req),
      });
    }

    // Check for API key
    const apiKey = Deno.env.get('FLIGHT_STATUS_API_KEY');
    if (!apiKey) {
      // No provider configured — return clean no-signal
      return new Response(JSON.stringify({ signal: null }), {
        status: 200, headers: corsJsonHeaders(req),
      });
    }

    // Call AviationStack with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      // Normalize flight number: strip spaces, uppercase
      const normalizedFlight = flightNumber.replace(/\s/g, '').toUpperCase();

      const url = `https://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(apiKey)}&flight_iata=${encodeURIComponent(normalizedFlight)}&flight_date=${encodeURIComponent(departureDate)}`;

      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!resp.ok) {
        return new Response(JSON.stringify({ signal: null }), {
          status: 200, headers: corsJsonHeaders(req),
        });
      }

      const data = await resp.json();

      // Validate response structure
      if (!data || !Array.isArray(data.data) || data.data.length === 0) {
        return new Response(JSON.stringify({ signal: null }), {
          status: 200, headers: corsJsonHeaders(req),
        });
      }

      // Use first matching flight
      const flight = data.data[0];

      // Validate flight match — IATA code must match exactly
      const respIata = flight?.flight?.iata?.toUpperCase?.() || '';
      if (respIata !== normalizedFlight) {
        return new Response(JSON.stringify({ signal: null }), {
          status: 200, headers: corsJsonHeaders(req),
        });
      }

      // Extract status
      const status = flight?.flight_status?.toLowerCase?.() || '';

      let signalType: string | null = null;

      if (status === 'cancelled') {
        signalType = 'cancellation';
      } else if (flight?.departure?.delay && Number(flight.departure.delay) > 0) {
        signalType = 'delay';
      } else if (flight?.departure?.gate && flight?.departure?.estimated_gate) {
        // Gate change: if gate differs from estimated gate
        if (flight.departure.gate !== flight.departure.estimated_gate) {
          signalType = 'gate_change';
        }
      }

      if (!signalType) {
        return new Response(JSON.stringify({ signal: null }), {
          status: 200, headers: corsJsonHeaders(req),
        });
      }

      return new Response(JSON.stringify({
        signal: {
          type: signalType,
          flightNumber: normalizedFlight,
          confidence: 'high',
        },
      }), {
        status: 200, headers: corsJsonHeaders(req),
      });

    } catch (fetchErr) {
      clearTimeout(timeout);
      // Network error, timeout, or parse error — fail closed
      return new Response(JSON.stringify({ signal: null }), {
        status: 200, headers: corsJsonHeaders(req),
      });
    }

  } catch {
    return new Response(JSON.stringify({ signal: null }), {
      status: 200, headers: corsJsonHeaders(req),
    });
  }
});
