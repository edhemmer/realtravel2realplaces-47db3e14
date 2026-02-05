 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type",
 };
 
 Deno.serve(async (req) => {
   // Handle CORS preflight
   if (req.method === "OPTIONS") {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
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
           headers: { ...corsHeaders, "Content-Type": "application/json" },
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
         headers: { ...corsHeaders, "Content-Type": "application/json" },
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
         headers: { ...corsHeaders, "Content-Type": "application/json" },
       }
     );
   }
 });