/**
 * Shared CORS headers for Edge Functions.
 *
 * ALLOWED_ORIGINS may contain a comma-separated allow-list. The built-in
 * defaults cover production, preview/dev localhost, and native Capacitor.
 */
const DEFAULT_ALLOWED_ORIGINS = [
  "https://realtravel2realplaces.app",
  "https://www.realtravel2realplaces.app",
  "capacitor://localhost",
  "ionic://localhost",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
];

function allowedOrigins(): string[] {
  const configured = Deno.env.get("ALLOWED_ORIGINS");
  if (!configured) return DEFAULT_ALLOWED_ORIGINS;
  return configured.split(",").map((origin) => origin.trim()).filter(Boolean);
}

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get("Origin") ?? "";
  const allowed = allowedOrigins();
  const allowOrigin = origin && allowed.includes(origin)
    ? origin
    : allowed[0] ?? "https://realtravel2realplaces.app";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret, x-webhook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  };
}

export const corsHeaders = getCorsHeaders();

export function corsJsonHeaders(req: Request): Record<string, string> {
  return {
    ...getCorsHeaders(req),
    "Content-Type": "application/json",
  };
}

/**
 * Handle CORS preflight request.
 */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}
