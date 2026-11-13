#!/usr/bin/env bash
# Rebuild Supabase using tracked SQL migrations and Edge Function sources.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
[[ -f supabase/config.toml && -d supabase/migrations && -d supabase/functions ]] || { echo "Missing Supabase project files" >&2; exit 1; }
command -v supabase >/dev/null || { echo "Supabase CLI required" >&2; exit 1; }
case "${1:-}" in
  test)
    echo "Starting disposable local Supabase services; migration reset DESTROYS local test data."
    supabase start
    supabase db reset --local
    echo "SQL replay succeeded. Verify expected schema, RLS and application behavior separately."
    ;;
  deploy)
    [[ -n "${2:-}" ]] || { echo "Usage: $0 deploy NEW_PROJECT_REF" >&2; exit 2; }
    echo "Target: $2"
    echo "Does not restore records, users, files, secrets, Auth providers, webhooks or app configuration."
    read -r -p "Type DEPLOY to link and apply database migrations: " confirm
    [[ "$confirm" == DEPLOY ]] || exit 3
    supabase link --project-ref "$2"
    supabase db push
    supabase functions deploy
    echo "Commands finished; configure secrets/Auth/integrations and perform an end-to-end smoke test."
    ;;
  *)
    echo "Usage: bash scripts/rebuild-supabase.sh test | deploy NEW_PROJECT_REF"
    exit 2
    ;;
esac
