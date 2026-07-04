// Send a push notification to the signed-in user's registered iOS devices.
// APNs credentials are stored only as Supabase Edge Function secrets.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsJsonHeaders, handleCors } from "../_shared/cors.ts";
import { sendApnsToUser } from "../_shared/apns.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Body {
  user_id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "missing auth" }), {
        status: 401,
        headers: corsJsonHeaders(req),
      });
    }

    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: corsJsonHeaders(req),
      });
    }

    const body = (await req.json()) as Partial<Body>;
    if (!body.user_id || !body.title || !body.body) {
      return new Response(JSON.stringify({ error: "user_id, title, body required" }), {
        status: 400,
        headers: corsJsonHeaders(req),
      });
    }

    if (body.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "cannot send push for another user" }), {
        status: 403,
        headers: corsJsonHeaders(req),
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
    const result = await sendApnsToUser({
      admin,
      userId: body.user_id,
      title: body.title,
      body: body.body,
      data: body.data,
    });

    if (!result.configured) {
      return new Response(JSON.stringify({
        error: "APNs not configured",
        missing: result.missing,
      }), {
        status: 503,
        headers: corsJsonHeaders(req),
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: corsJsonHeaders(req),
    });
  } catch (err) {
    console.error("[send-push] error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsJsonHeaders(req),
    });
  }
});
