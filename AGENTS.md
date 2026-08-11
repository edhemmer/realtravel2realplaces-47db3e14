# RT2RP Agent Directive

Real Travel 2 Real Places (RT2RP) is a production Travel Operating System.

Repository documents control.

Before making architectural, database, AI, UX, workflow, security, infrastructure, provider, native-mobile, reliability, or feature decisions, read in order:

1. `docs/00-START-HERE.md`
2. `docs/01-PRODUCT-CONSTITUTION.md`
3. `docs/02-ENGINEERING-STANDARDS.md`
4. `docs/03-DATA-ARCHITECTURE.md`
5. `docs/04-TRAVEL-DOMAIN-MODEL.md`
6. `docs/05-SYSTEM-ARCHITECTURE.md`
7. `docs/06-AI-ORCHESTRATION.md`
8. `docs/07-UI-UX-SYSTEM.md`
9. `docs/08-LIVE-DATA-AND-PROVIDERS.md`
10. `docs/09-OFFLINE-SYNC-RESILIENCE.md`
11. `docs/10-BUILD-ROADMAP.md`
12. `docs/11-CODEX-MASTER-BUILD-PROMPT.md`
13. the applicable specification under `specs/`.

## Hard-Locked Product Rule

**If RT2RP cannot fully and reliably do something, RT2RP does not mention it to the user.**

Do not add user-facing coming-soon features, placeholder travel data, implied monitoring, implied live data, implied offline capability, or AI claims that exceed verified behavior.

Incomplete capabilities remain internal and hidden.

## Preservation-First Rule

RT2RP is an existing application with substantial working functionality.

Before replacing code, classify the existing implementation as:

- PRESERVE
- STRENGTHEN
- CONSOLIDATE
- REPLACE
- HIDE/REMOVE

Do not create parallel V2 systems to avoid understanding the current implementation.

Do not remove working behavior until the replacement is proven and dependent paths are migrated.

## Required Product Direction

Every change should:

- reduce travel complexity;
- improve organization;
- increase preparedness;
- increase confidence;
- reduce manual effort;
- improve truthfulness and reliability;
- strengthen the unified trip;
- support pleasure, business, and mixed travel;
- support air, road, rail, and multi-modal travel without mode-specific fragmentation.

If a proposed change does not support these goals, challenge it before implementation.

## Completion Standard

A feature is not complete because a page, API, database field, or prompt exists.

It is complete only when the full user outcome works end-to-end, failure behavior is deliberate, security is enforced, dependent surfaces remain consistent, and applicable tests pass.
