# Supabase Migration Handoff

Goal: move RealTravel2RealPlaces from Lovable-controlled Supabase/auth hosting to your own Supabase project, while keeping the app buildable during the transition.

## What Is Now App-Owned

- The web app reads Supabase from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Apple web OAuth now uses `supabase.auth.signInWithOAuth({ provider: 'apple' })` directly.
- iOS native Apple sign-in still uses the Apple token and signs into Supabase with `signInWithIdToken`.
- Capacitor should not hardcode provider-hosted sandboxes. Production iOS builds should use bundled assets.
- `.env` is ignored going forward. Use `.env.example` as the template.

## Your Supabase Setup Checklist

1. Create the new Supabase project under your own Supabase subscription.
2. Copy `.env.example` to `.env` locally and fill in:
   - `VITE_SUPABASE_PROJECT_ID`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Update `supabase/config.toml` so `project_id` matches the new Supabase project ref.
4. Link the CLI when ready: `supabase link --project-ref YOUR_PROJECT_REF`.
5. Apply migrations to the new project.
6. Deploy edge functions from `supabase/functions`.
7. Configure Supabase Auth providers:
   - Email/password
   - Apple OAuth for web
   - Apple native token sign-in for iOS bundle ID `com.inlighttai.rt2rp`
8. Add required edge-function secrets in the new project:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - AI provider keys used by parse/assistant functions
   - Maps/place/weather/transit/flight provider keys used by the app
   - APNS keys used by push notification functions
9. Set the same frontend env vars in your deploy host.
10. Build and smoke test: sign up/sign in, create a trip, parse a booking, parse a receipt, generate packing, submit support, and delete account.

## Important Cutover Notes

- Existing users and trips will not automatically move unless you migrate data from the old Supabase project.
- Do not cancel Lovable until the new Supabase project has tables, RLS policies, functions, secrets, auth providers, and production env vars verified.
- If Apple web sign-in fails after cutover, check Supabase Auth provider redirect URLs first.
- If iOS Apple sign-in fails, check the Apple Services ID, App ID, bundle ID, nonce handling, and Supabase Apple provider configuration.
