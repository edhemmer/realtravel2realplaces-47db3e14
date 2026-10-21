# RT2RP RPC Access Matrix

**Status:** Phase 31 source/live-evidence classification  
**Purpose:** classify exposed `SECURITY DEFINER` functions before changing production grants.

This matrix separates three contracts:

1. **service-only** — callable only from trusted Edge Function / cron paths using the service role;
2. **authenticated application RPC** — callable by signed-in users because React code invokes it directly and the function enforces owner/admin/member checks;
3. **deferred live verification** — RLS helpers and trigger functions whose grants must not be changed without database-level testing.

## Service-only

| Function | Evidence | Required grant |
| --- | --- | --- |
| `run_trip_lifecycle_enforcement()` | Cron Edge Function is protected by `CRON_SECRET_KEY`; function can lock/delete trip data | `service_role` only |
| `increment_places_usage(uuid,text)` | Called by authenticated Places Edge Function through admin/service client | `service_role` only |
| `increment_flight_status_usage(uuid,integer)` | Called by authenticated flight-status Edge Function through admin/service client | `service_role` only |

## Authenticated application RPCs

| Function | Confirmed caller / guard | Required grant |
| --- | --- | --- |
| `is_admin()` | `useAdminUsers.ts`; role lookup | `authenticated`, `service_role` |
| `admin_get_all_users()` | `useAdminUsers.ts`; function checks `is_admin()` | `authenticated`, `service_role` |
| `admin_update_user_name(uuid,text,text)` | `useAdminUsers.ts`; function checks `is_admin()` | `authenticated`, `service_role` |
| `admin_update_user_tier(uuid,subscription_tier)` | `useAdminUsers.ts`; function checks `is_admin()` | `authenticated`, `service_role` |
| `admin_delete_user(uuid)` | `useAdminUsers.ts`; function checks `is_admin()` | `authenticated`, `service_role` |
| `get_bookings_safe(uuid)` | `useBookings.ts`; function checks trip access | `authenticated`, `service_role` |
| `get_companions_safe(uuid)` | `useCompanions.ts`; function checks trip access | `authenticated`, `service_role` |
| `get_trip_shares_safe(uuid)` | `useTripShares.ts`; function scopes owner/share recipient | `authenticated`, `service_role` |
| `get_my_pending_invites()` | `usePendingTripInvites.ts`; uses `auth.uid()` / signed-in email | `authenticated`, `service_role` |
| `accept_trip_invite(text)` | `AcceptInvite.tsx`; function rejects missing `auth.uid()` | `authenticated`, `service_role` |
| `accept_trip_invite_by_id(uuid)` | `usePendingTripInvites.ts`; checks signed-in user/email | `authenticated`, `service_role` |
| `create_trip_invite(uuid,text,integer)` | `useTripMembers.ts`; owner check in function | `authenticated`, `service_role` |
| `create_trip_invite(uuid,text,integer,boolean,boolean,boolean)` | `useTripMembers.ts`; owner check in function | `authenticated`, `service_role` |

The reviewed SQL for these two groups lives in `docs/audits/RPC-PRIVILEGE-PATCH.sql`. It is **not** a migration file. Supabase project access and CLI generation are still required before production application.

## Deferred live verification

Do not change these grants from source evidence alone:

- `user_has_trip_access(uuid)`
- `user_owns_trip(uuid)`
- other RLS helper functions used inside policies
- `auto_create_trip_owner()`
- `handle_new_user()`
- `increment_lifetime_trip_count()`
- `sync_booking_events()`
- any trigger-only or policy helper not yet catalogued

Reason: RLS policies and trigger execution may depend on role/function privileges differently from direct PostgREST RPC calls. These require a database transaction test using `SET LOCAL ROLE anon/authenticated`, trigger exercises, and Security Advisor verification before privilege changes are committed.

## Production verification sequence

1. Restore RT2RP Supabase project authorization.
2. Run current Security Advisor and export the full `SECURITY DEFINER` catalog with owners/signatures.
3. Generate a migration using `supabase migration new harden_internal_rpc_execute_grants`.
4. Copy in the reviewed patch.
5. Execute in a transaction or preview environment first.
6. Verify the built-in privilege assertions pass.
7. Exercise admin, invite, booking, companion, Places and flight-status call paths.
8. Rerun Security Advisor.
9. Only then evaluate RLS-helper and trigger-function grants.
