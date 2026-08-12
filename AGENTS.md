# RT2RP Agent Directive

Real Travel 2 Real Places (RT2RP) is a production Travel Operating System.

Repository documents control.

Before making architectural, database, AI, UX, workflow, security, infrastructure, provider, native-mobile, reliability, product-positioning, or feature decisions, read in order:

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
13. `docs/12-MARKET-AND-PRODUCT-STANDARD.md`
14. the applicable specification under `specs/`.

## Interpretation Rule

The governing corpus defines product standards and target architecture. It does **not** prove that a capability is currently implemented or authorize a user-facing claim.

Only current implementation, configuration, production evidence, and applicable validation establish whether a capability may be exposed or described to users.

Competitive capabilities in `docs/12-MARKET-AND-PRODUCT-STANDARD.md` are benchmarks, not implementation requirements by default and never proof that RT2RP supports the same capability.

In governing documents:

- **MUST / REQUIRED / NON-NEGOTIABLE** = mandatory rule or release gate.
- **SHOULD** = default approach; deviation requires a documented reason.
- **MAY** = optional behavior, not a product promise.

## Hard-Locked Product Rule

**If RT2RP cannot fully and reliably do something, RT2RP does not mention it to the user.**

Do not add user-facing coming-soon features, placeholder travel data, implied monitoring, implied live data, implied offline capability, or AI claims that exceed verified behavior.

Incomplete or unproven capabilities remain internal and hidden.

## Preservation-First Rule

RT2RP is an existing application with substantial working functionality.

Before replacing code, classify the existing implementation as:

- PRESERVE
- STRENGTHEN
- CONSOLIDATE
- REPLACE
- HIDE/REMOVE

Do not create parallel V2 systems to avoid understanding current implementation.

Do not remove working behavior until replacement is proven and dependent paths are migrated.

## Experience Quality Rule

Do not defer user experience, graphics, accessibility, or perceived speed to a later polish phase.

A user-facing subsystem is incomplete until it is:

- clear under travel-day stress;
- visually deliberate and production-grade;
- responsive on supported mobile/desktop surfaces;
- accessible;
- truthful about live/cached/stale/offline state;
- competitively usable for the problem it claims to solve;
- free of decorative graphics that obscure weak functionality.

Maps, charts, imagery, motion, and haptics must improve orientation, recognition, decision-making, or confidence. They are not decoration quotas.

## Real-Time Rule

`Live`, `real-time`, `monitored`, `automatically updated`, and `alert when changed` are release contracts.

Do not use those terms unless entity matching, freshness, material-change detection, background execution where required, delivery, recovery, observability, and production validation are complete.

## Required Product Direction

Every change should:

- reduce travel complexity;
- improve organization;
- increase preparedness;
- increase confidence;
- reduce manual effort;
- improve truthfulness and reliability;
- strengthen the unified trip;
- reduce unnecessary app-switching or manual reconciliation;
- support pleasure, business, and mixed travel;
- support air, road, rail, and multi-modal travel without mode-specific fragmentation;
- meet the strongest relevant market expectation when RT2RP chooses to expose that capability;
- improve or preserve premium visual/interaction quality.

Do not chase competitor features merely for parity. Build only capabilities that strengthen RT2RP as the operating layer for the complete trip.

If a proposed change does not support these goals, challenge it before implementation.

## Completion Standard

A feature is not complete because a page, API, database field, background job, provider call, prompt, or visual design exists.

It is complete only when the full user outcome works end-to-end, failure behavior is deliberate, security is enforced, dependent surfaces remain consistent, observability is sufficient for risk, applicable tests pass, real-time/offline claims are proven where used, and the resulting experience is visually and competitively credible for the user problem it claims to solve.
