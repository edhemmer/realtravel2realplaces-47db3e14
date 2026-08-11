# RT2RP — Duplicate Truth Map

**Status:** AUDIT REQUIRED

## Purpose

This audit identifies where one travel concept is represented, calculated, fetched, or interpreted in more than one place.

Duplicate truth is a primary cause of fragmentation, stale UI, contradictory states, and hard-to-fix bugs.

Not every duplicate representation is wrong. Cached projections, view models, and persisted event projections may be legitimate when their source, synchronization, and invalidation contracts are explicit. The audit must distinguish **duplicate representation** from **competing authority**.

---

## Audit Targets

Search for duplication in:

- trip state;
- timeline/event generation;
- next-action logic;
- flight parsing/status;
- route/drive logic;
- rail/transport logic;
- active lodging;
- traveler/member access;
- expense totals/splits;
- parking status;
- subscription access;
- time/date formatting and comparisons;
- provider clients;
- AI prompts/capabilities;
- realtime synchronization;
- notification eligibility;
- offline/cache state.

---

## Matrix

| Concept | Canonical Candidate | Duplicate Paths | Authority Type | Sync/Invalidation Contract | Behavior Differences | User Risk | Tests/Evidence | Action |
|---|---|---|---|---|---|---|---|---|

`Authority Type` should identify whether a path is:

- CANONICAL FACT OWNER;
- DERIVED PROJECTION;
- CACHE;
- VIEW MODEL;
- PROVIDER OBSERVATION;
- LEGACY/COMPETING OWNER;
- UNKNOWN.

Action must be:

- KEEP AS CANONICAL;
- KEEP AS DERIVED/CACHE;
- CONSOLIDATE INTO CANONICAL;
- DEPRECATE AFTER MIGRATION;
- REMOVE;
- NEEDS DEEPER AUDIT.

---

## Risk Ranking

### CRITICAL
Can cause wrong travel time/location/status, lost data, unauthorized access, incorrect money, or user action based on false state.

### HIGH
Can cause contradictory screens, stale trip state, duplicate records, or failed user workflow.

### MEDIUM
Causes maintenance burden or confusing UX but does not normally corrupt decisions.

### LOW
Cosmetic/redundant logic with limited product risk.

---

## Consolidation Rule

Do not delete a duplicate path until:

1. all readers are identified;
2. all writers are identified;
3. canonical replacement is tested;
4. production data compatibility is verified;
5. cache/projection synchronization behavior is understood;
6. dependent surfaces have migrated;
7. regression tests pass;
8. old path removal does not break rollback/recovery requirements.

---

## Exit Gate

Every critical/high-risk domain concept has one documented canonical owner, and every retained duplicate representation has an explicit derivation/synchronization contract.

Every competing implementation has a migration plan or documented reason it remains.
