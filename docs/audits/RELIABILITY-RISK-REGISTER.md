# RT2RP — Reliability Risk Register

**Status:** AUDIT REQUIRED

## Purpose

Track product failures that could damage traveler trust, produce wrong decisions, lose data, expose private information, or create operational confusion.

This is not a generic bug list.

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

| ID | Risk | Category | User Impact | Likelihood | Severity | Detection | Current Mitigation | Required Action | Owner/Spec | Status |
|---|---|---|---|---|---|---|---|---|---|---|

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

---

## Release Blocking

Open S0 risks block release.

Open S1 risks block the affected capability from being publicly promised unless the risk is eliminated or the capability is hidden.

Repeated S2 failures in a core flow should be treated as architectural, not merely patched indefinitely.

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
- public wording rechecked.

---

## Reliability Principle

A world-class travel tool earns trust by eliminating classes of failure, not by repeatedly repairing symptoms.
