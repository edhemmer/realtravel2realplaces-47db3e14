# RT2RP — Current Implementation Map

**Status:** AUDIT REQUIRED

## Purpose

This document must become the factual map of the current production implementation before preservation-first modernization begins.

Do not fill this from old product documentation alone. Inspect current `origin/main` code, migrations, functions, tests, native code, configuration, and public surfaces.

A file's existence is not proof that its user outcome is active, configured, reachable, reliable, or publicly safe to claim.

---

## Evidence Rules

For material conclusions, record enough evidence to trace the behavior. Evidence may include:

- file/module path;
- migration/table/function name;
- runtime call path;
- environment/config dependency;
- provider/background dependency;
- test name/path;
- production/manual verification result.

Use **UNKNOWN / NOT YET VERIFIED** when evidence is incomplete. Do not fill gaps from assumption.

---

## Audit Sections

### Application Routes and User Surfaces

For each route/surface record:

| Surface | Entry Route | Primary User Outcome | Main Components/Containers | Data Sources | Current Status | Evidence |
|---|---|---|---|---|---|---|

### Canonical / Domain Logic

| Domain Concept | Current Canonical Owner | Other Implementations Found | Tests | Classification | Evidence/Notes |
|---|---|---|---|---|---|

### Data Model

| Entity/Table | Purpose | Owner/User Boundary | Important Relationships | RLS | Main Readers/Writers | Evidence/Notes |
|---|---|---|---|---|---|---|

### Edge Functions / Server Operations

| Function | Purpose | Called By | External Provider/AI | Auth Boundary | Failure Handling | Production Config | Tests/Evidence |
|---|---|---|---|---|---|---|---|

### Providers

| Capability | Provider | Adapter/Function | Source Authority | Freshness | Cache | Failure State | Production Config | User-Facing Claim | Evidence |
|---|---|---|---|---|---|---|---|---|---|

### AI Capabilities

| Capability | Entry Point | Model/Adapter | Structured Schema | Validation | Ambiguity Path | Production Config | Tests/Evals | Evidence |
|---|---|---|---|---|---|---|---|---|

### Native / PWA

| Capability | Web/PWA/iOS | Implementation | Data Dependency | Offline/Background Behavior | Production Config | Verified? | Evidence |
|---|---|---|---|---|---|---|---|

### Background Jobs / Notifications

| Job | Trigger/Schedule | Purpose | Idempotent? | Delivery Path | Observability | Production Config | Verified? | Evidence |
|---|---|---|---|---|---|---|---|---|

### Test Inventory

| Domain | Unit | Integration | Component | E2E | Critical Gaps | Evidence |
|---|---|---|---|---|---|---|

---

## Classification

Every material implementation path must be classified:

- PRESERVE
- STRENGTHEN
- CONSOLIDATE
- REPLACE
- HIDE/REMOVE

Classification requires evidence, not preference.

When evidence is insufficient, record **NEEDS DEEPER AUDIT** rather than forcing a classification.

---

## Exit Gate

This audit is complete only when a developer can trace each major user outcome from UI -> domain -> persistence/provider -> production configuration -> failure behavior -> tests/evidence.

No public capability may be treated as proven solely because it appears in an old feature inventory or product document.
