import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsJsonHeaders, handleCors } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const preflight = handleCors(req);
  if (preflight) return preflight;

  try {
    // v3.8.11: Authenticate scheduled job via CRON_SECRET_KEY
    const cronSecret = Deno.env.get("CRON_SECRET_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Unauthorized",
          data: null,
        }),
        {
          status: 401,
          headers: corsJsonHeaders(req),
        }
      );
    }

    // Use service role key for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Call the database function that handles all lifecycle enforcement
    const { data, error } = await supabase.rpc("run_trip_lifecycle_enforcement");

    if (error) {
      console.error("Lifecycle enforcement error:", error);
      return new Response(
        JSON.stringify({
          success: false,
          message: error.message,
          data: null,
        }),
        {
          status: 200,
          headers: corsJsonHeaders(req),
        }
      );
    }

    console.log("Lifecycle enforcement completed:", data);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Trip lifecycle enforcement completed",
        data: data,
      }),
      {
        status: 200,
        headers: corsJsonHeaders(req),
      }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        message: err instanceof Error ? err.message : "Unknown error",
        data: null,
      }),
      {
        status: 200,
        headers: corsJsonHeaders(req),
      }
    );
  }
});
