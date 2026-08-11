# RT2RP — Duplicate Truth Map

**Status:** AUDIT REQUIRED

## Purpose

This audit identifies where one travel concept is represented, calculated, fetched, or interpreted in more than one place.

Duplicate truth is a primary cause of fragmentation, stale UI, contradictory states, and hard-to-fix bugs.

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

| Concept | Canonical Candidate | Duplicate Paths | Behavior Differences | User Risk | Tests | Action |
|---|---|---|---|---|---|---|

Action must be:

- KEEP AS CANONICAL;
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
5. dependent surfaces have migrated;
6. regression tests pass.

---

## Exit Gate

Every critical/high-risk domain concept has one documented canonical owner and a migration plan for competing implementations.
