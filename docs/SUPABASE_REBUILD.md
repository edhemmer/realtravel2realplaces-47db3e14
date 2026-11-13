# Supabase rebuild and retirement runbook

This project keeps its database migration files in `supabase/migrations/`, Edge Functions in `supabase/functions/`, and CLI configuration in `supabase/config.toml`.

## Rebuild from source
1. Clone the repository; install Docker and a compatible Supabase CLI.
2. Run `bash scripts/rebuild-supabase.sh test` to create/reset a **disposable local database** and replay the checked-in migrations. This resets only the local linked database, not production.
3. If the test succeeds, verify SQL procedures, triggers, RLS policies, extensions, storage buckets, and each critical application workflow. Migration replay alone is not a full functional test.
4. When resuming work later, create a fresh Supabase project, authenticate the CLI, then run `bash scripts/rebuild-supabase.sh deploy NEW_PROJECT_REF`.
5. Recreate Supabase secrets outside Git, Auth configuration (URLs/redirects, OAuth, SMTP), storage rules, scheduled jobs, webhooks, service integrations and frontend/deployment environment variables. Smoke-test login, data writes, permissions and Edge Functions.

## Mandatory retirement checklist
- [ ] All migrations replay in a clean local Supabase database.
- [ ] Database schema and security policies compared with the existing hosted instance; any drift captured as migrations.
- [ ] Edge Functions deploy to a fresh **test** project and work with required settings.
- [ ] Required secrets/integrations recorded securely outside the repository (never commit live keys).
- [ ] All remaining data, Auth identities, uploads, and in-project files are explicitly disposable or backed up.
- [ ] All websites/integrations still using this project's URL are identified; after deletion they will stop working until reconfigured.
- [ ] Full rebuild smoke test passes.
- [ ] The paid organization's branching and billing status checked and downgraded separately.

**Do not treat presence of the folders as proof of rebuild readiness.** This runbook does not back up records or credentials. A fresh project has a different project reference, URL, keys, and potentially changed Auth user IDs. Do not delete a hosted project until the above checklist is complete.
