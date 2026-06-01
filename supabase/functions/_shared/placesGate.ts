/**
 * Shared auth + per-user daily budget gate for Google Places-backed
 * edge functions (nearby-places, places-photo).
 *
 * - Verifies the caller's JWT via getClaims().
 * - Atomically increments the user's daily counter via the
 *   `increment_places_usage` SECURITY DEFINER RPC (called with service role).
 * - Returns either { ok: true, userId } or a ready-to-return Response
 *   (401 unauthenticated / 429 budget exceeded / 500 server error).
 *
 * Daily caps (enforced in SQL):
 *   Free:  50 searches / 200 photos
 *   Pro:  500 searches / 2000 photos
 */

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "./cors.ts";

export type PlacesUsageKind = "search" | "photo";

type GateOk = { ok: true; userId: string };
type GateFail = { ok: false; response: Response };
export type GateResult = GateOk | GateFail;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function gatePlacesRequest(
  req: Request,
  kind: PlacesUsageKind,
): Promise<GateResult> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      response: jsonResponse({ error: "Unauthorized" }, 401),
    };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("[placesGate] Missing Supabase env vars");
    return {
      ok: false,
      response: jsonResponse({ error: "Server misconfigured" }, 500),
    };
  }

  // Verify JWT
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsErr } =
    await authClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    return {
      ok: false,
      response: jsonResponse({ error: "Unauthorized" }, 401),
    };
  }
  const userId = claimsData.claims.sub as string;

  // Atomic increment + budget check (service role bypasses RLS)
  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await admin.rpc("increment_places_usage", {
    p_user_id: userId,
    p_kind: kind,
  });

  if (error) {
    console.error("[placesGate] increment_places_usage failed:", error);
    // Fail-closed: don't burn quota on unknown errors
    return {
      ok: false,
      response: jsonResponse({ error: "Usage check failed" }, 500),
    };
  }

  const allowed = (data as any)?.allowed === true;
  if (!allowed) {
    return {
      ok: false,
      response: jsonResponse(
        {
          error: "Daily Places budget exceeded",
          kind,
          count: (data as any)?.count,
          limit: (data as any)?.limit,
        },
        429,
      ),
    };
  }

  return { ok: true, userId };
}
