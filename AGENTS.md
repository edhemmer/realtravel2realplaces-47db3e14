# RT2RP Agent Directive

Before making architectural, database, AI, UX, workflow, security, infrastructure, or feature decisions, read:

- docs/RT2RP_CONSTITUTION.md
- docs/RT2RP_CORPUS.md

Every change should reduce travel complexity, improve organization, increase preparedness, increase confidence, reduce manual effort, and strengthen RT2RP as a Travel Operating System.

If a proposed change does not support those goals, challenge it before implementation.

## Supabase Hibernation and Reactivation

For any Supabase shutdown, backend recreation, project replacement, or reactivation, follow `docs/SUPABASE_REBUILD.md` and use `scripts/rebuild-supabase.sh` for a controlled migration replay. These instructions supplement (never replace) this project's authoritative product and security rules. Before deletion, compare source-controlled migrations with hosted schema and test all policies, triggers, SQL functions, Edge Functions and critical workflows in an isolated environment. Record required secrets and integrations in a secure location outside Git. Never claim full recoverability from file presence alone, and never delete production resources merely to test rebuild tooling.
