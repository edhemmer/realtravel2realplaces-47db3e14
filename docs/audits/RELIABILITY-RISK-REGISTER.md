# RT2RP — Reliability Risk Register

**Status:** AUDIT REQUIRED

## Purpose

Track product failures that could damage traveler trust, produce wrong decisions, lose data, expose private information, or create operational confusion.

This is not a generic bug list. It is the risk-control record for production behavior that can materially affect a traveler.

---

## Risk Categories

- Authentication/session
- Authorization/RLS/privacy
- Data integrity
- Time/timezone
- Money/expense reconciliation
- Import/deduplication
- Timeline/current-state derivation
- Provider freshness/outage
- Notifications/background jobs
- Offline/reconnect
- Native app lifecycle/deep links
- AI extraction/hallucination
- PWA/cache/update
- Performance/availability
- Accessibility/critical interaction

---

## Register

| ID | Risk | Category | User Impact | Likelihood | Severity | Detection | Current Mitigation | Required Action | Owner/Spec | Status | Closure Evidence |
|---|---|---|---|---|---|---|---|---|---|---|---|

---

## Likelihood

Use evidence where available; otherwise mark **UNKNOWN** rather than inventing precision.

- **L1 — Rare:** requires unusual conditions or no known production occurrence.
- **L2 — Uncommon:** plausible but limited conditions/exposure.
- **L3 — Possible:** credible recurring conditions or incomplete controls.
- **L4 — Likely:** observed repeatedly or expected under normal usage.
- **L5 — Frequent:** common/reproducible in normal usage.
- **UNKNOWN:** insufficient evidence; requires investigation.

Unknown likelihood does not reduce severity.

---

## Severity

### S0 — Trust/Safety Critical
Potential unauthorized exposure, destructive data loss, or materially dangerous/wrong travel instruction.

### S1 — Trip-Critical
Can cause missed travel, wrong time/location/status, inaccessible critical trip data, or significant financial error.

### S2 — Major
Breaks an important workflow or creates contradictory state with a reasonable workaround.

### S3 — Moderate
Meaningful friction or degraded capability with low risk of wrong action.

### S4 — Minor
Cosmetic or low-impact issue.

Severity is based on credible user impact, not implementation effort.

---

## Status Values

Use one of:

- OPEN
- INVESTIGATING
- MITIGATING
- VALIDATING
- ACCEPTED INTERNAL RISK
- CLOSED

`ACCEPTED INTERNAL RISK` is not permitted to justify exposing a capability whose user-facing promise would violate the hard-locked product rule.

---

## Release Blocking

Open S0 risks block release.

Open S1 risks block the affected capability from being publicly promised or exposed unless the failure path itself prevents the risky outcome and that mitigation is validated.

Repeated S2 failures in a core flow should be treated as architectural, not merely patched indefinitely.

Any risk that can cause false live state, wrong travel time/location, unauthorized data exposure, silent data loss, or materially incorrect financial output must be evaluated before the affected capability is considered validated.

---

## Required Evidence for Closure

A risk is not closed because code changed.

Closure should include, as applicable:

- root cause identified;
- fix implemented;
- regression test added;
- dependent surfaces verified;
- production configuration verified;
- failure/recovery behavior verified;
- migration/backfill verified where relevant;
- public wording rechecked;
- observed validation evidence recorded.

If evidence is incomplete, use `VALIDATING`, not `CLOSED`.

---

## Risk Acceptance

Risk acceptance is allowed only for bounded internal/operational risk that does not make a public product promise misleading or expose unacceptable security/data-integrity risk.

Accepted risk must record:

- rationale;
- affected scope;
- compensating control;
- owner;
- review/retirement condition.

---

## Reliability Principle

A dependable travel tool earns trust by eliminating classes of failure, not by repeatedly repairing symptoms.
