 /**
  * Shared authentication utilities for edge functions
  */
 
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
 import { errorResponse } from "./response.ts";
 
 import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
 
 export interface AuthResult {
   success: boolean;
   user?: { id: string; email?: string };
   // deno-lint-ignore no-explicit-any
   client?: SupabaseClient<any, "public", any>;
   errorResponse?: Response;
 }
 
 /**
  * Validate authorization header and return authenticated user
  * Returns error response if auth fails
  */
 export async function validateAuth(req: Request): Promise<AuthResult> {
   const authHeader = req.headers.get('Authorization');
   
   if (!authHeader?.startsWith('Bearer ')) {
     return {
       success: false,
       errorResponse: errorResponse("Please sign in to use this feature."),
     };
   }
 
   const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
   const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
   
   const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
     global: { headers: { Authorization: authHeader } }
   });
 
   const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
   
   if (authError || !user) {
     console.error("Auth validation failed:", authError?.message);
     return {
       success: false,
       errorResponse: errorResponse("Your session has expired. Please sign in again."),
     };
   }
 
   return {
     success: true,
     user: { id: user.id, email: user.email },
     client: supabaseClient,
   };
 }