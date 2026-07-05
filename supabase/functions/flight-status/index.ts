import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJsonHeaders, handleCors } from "../_shared/cors.ts";

const CACHE_MINUTES = 10;
const DAILY_PROVIDER_CALL_LIMIT = 12;

function cleanNoSignal(meta: Record<string, unknown> = {}) {
  return { signal: null, ...meta };
}

function normalizeFlightNumber(flightNumber: string) {
  return flightNumber.replace(/\s/g, "").toUpperCase();
}

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsJsonHeaders(req),
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );

    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsJsonHeaders(req),
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json();
    const { flightNumber, departureDate } = body || {};

    if (
      !flightNumber || typeof flightNumber !== "string" ||
      !departureDate || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate)
    ) {
      return new Response(JSON.stringify({ error: "Invalid input", signal: null }), {
        status: 400,
        headers: corsJsonHeaders(req),
      });
    }

    const normalizedFlight = normalizeFlightNumber(flightNumber);
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: cached, error: cacheError } = await admin
      .from("flight_status_cache")
      .select("response, fetched_at, expires_at")
      .eq("flight_number", normalizedFlight)
      .eq("departure_date", departureDate)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (!cacheError && cached?.response) {
      return new Response(JSON.stringify({
        ...(cached.response as Record<string, unknown>),
        cached: true,
        fetchedAt: cached.fetched_at,
      }), {
        status: 200,
        headers: corsJsonHeaders(req),
      });
    }

    const apiKey = Deno.env.get("FLIGHT_STATUS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify(cleanNoSignal({ providerConfigured: false })), {
        status: 200,
        headers: corsJsonHeaders(req),
      });
    }

    const { data: usage, error: usageError } = await admin.rpc(
      "increment_flight_status_usage",
      {
        p_user_id: userId,
        p_daily_limit: DAILY_PROVIDER_CALL_LIMIT,
      },
    );

    if (usageError) {
      console.error("[flight-status] usage gate failed:", usageError);
      return new Response(JSON.stringify(cleanNoSignal({
        gated: true,
        reason: "usage_check_failed",
      })), {
        status: 200,
        headers: corsJsonHeaders(req),
      });
    }

    if ((usage as any)?.allowed !== true) {
      return new Response(JSON.stringify(cleanNoSignal({
        gated: true,
        reason: "daily_limit",
        limit: (usage as any)?.limit ?? DAILY_PROVIDER_CALL_LIMIT,
      })), {
        status: 200,
        headers: corsJsonHeaders(req),
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const url =
        `https://api.aviationstack.com/v1/flights?access_key=${encodeURIComponent(apiKey)}` +
        `&flight_iata=${encodeURIComponent(normalizedFlight)}` +
        `&flight_date=${encodeURIComponent(departureDate)}`;

      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!resp.ok) {
        return new Response(JSON.stringify(cleanNoSignal({ providerStatus: resp.status })), {
          status: 200,
          headers: corsJsonHeaders(req),
        });
      }

      const data = await resp.json();
      const firstFlight = Array.isArray(data?.data) ? data.data[0] : null;

      if (!firstFlight) {
        const response = cleanNoSignal({ provider: "aviationstack" });
        await cacheFlightStatus(admin, normalizedFlight, departureDate, response);
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: corsJsonHeaders(req),
        });
      }

      const respIata = firstFlight?.flight?.iata?.toUpperCase?.() || "";
      if (respIata !== normalizedFlight) {
        return new Response(JSON.stringify(cleanNoSignal({ provider: "aviationstack" })), {
          status: 200,
          headers: corsJsonHeaders(req),
        });
      }

      const status = firstFlight?.flight_status?.toLowerCase?.() || "";
      let signalType: string | null = null;

      if (status === "cancelled") {
        signalType = "cancellation";
      } else if (firstFlight?.departure?.delay && Number(firstFlight.departure.delay) > 0) {
        signalType = "delay";
      } else if (firstFlight?.departure?.gate && firstFlight?.departure?.estimated_gate) {
        if (firstFlight.departure.gate !== firstFlight.departure.estimated_gate) {
          signalType = "gate_change";
        }
      }

      if (!signalType) {
        const response = cleanNoSignal({ provider: "aviationstack" });
        await cacheFlightStatus(admin, normalizedFlight, departureDate, response);
        return new Response(JSON.stringify(response), {
          status: 200,
          headers: corsJsonHeaders(req),
        });
      }

      const response = {
        signal: {
          type: signalType,
          flightNumber: normalizedFlight,
          confidence: "high",
        },
        provider: "aviationstack",
      };

      await cacheFlightStatus(admin, normalizedFlight, departureDate, response);
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: corsJsonHeaders(req),
      });
    } catch {
      clearTimeout(timeout);
      return new Response(JSON.stringify(cleanNoSignal({
        provider: "aviationstack",
        reason: "provider_error",
      })), {
        status: 200,
        headers: corsJsonHeaders(req),
      });
    }
  } catch {
    return new Response(JSON.stringify(cleanNoSignal()), {
      status: 200,
      headers: corsJsonHeaders(req),
    });
  }
});

async function cacheFlightStatus(
  admin: ReturnType<typeof createClient>,
  flightNumber: string,
  departureDate: string,
  response: Record<string, unknown>,
) {
  const now = Date.now();
  await admin.from("flight_status_cache").upsert({
    flight_number: flightNumber,
    departure_date: departureDate,
    response,
    provider: "aviationstack",
    fetched_at: new Date(now).toISOString(),
    expires_at: new Date(now + CACHE_MINUTES * 60 * 1000).toISOString(),
  });
}
