# RT2RP — Current Implementation Map

**Status:** AUDIT REQUIRED

## Purpose

This document must become the factual map of the current production implementation before preservation-first modernization begins.

Do not fill this from old product documentation alone. Inspect current `origin/main` code, migrations, functions, tests, native code, configuration, and public surfaces.

---

## Audit Sections

### Application Routes and User Surfaces

For each route/surface record:

| Surface | Entry Route | Primary User Outcome | Main Components/Containers | Data Sources | Current Status | Evidence |
|---|---|---|---|---|---|---|

### Canonical / Domain Logic

| Domain Concept | Current Canonical Owner | Other Implementations Found | Tests | Classification | Notes |
|---|---|---|---|---|---|

### Data Model

| Entity/Table | Purpose | Owner/User Boundary | Important Relationships | RLS | Main Readers/Writers | Notes |
|---|---|---|---|---|---|---|

### Edge Functions / Server Operations

| Function | Purpose | Called By | External Provider/AI | Auth Boundary | Failure Handling | Tests/Evidence |
|---|---|---|---|---|---|---|

### Providers

| Capability | Provider | Adapter/Function | Freshness | Cache | Failure State | User-Facing Claim |
|---|---|---|---|---|---|---|

### AI Capabilities

| Capability | Entry Point | Model/Adapter | Structured Schema | Validation | Ambiguity Path | Tests |
|---|---|---|---|---|---|---|

### Native / PWA

| Capability | Web/PWA/iOS | Implementation | Data Dependency | Offline/Background Behavior | Verified? |
|---|---|---|---|---|---|

### Background Jobs / Notifications

| Job | Trigger/Schedule | Purpose | Idempotent? | Delivery Path | Observability | Verified? |
|---|---|---|---|---|---|---|

### Test Inventory

| Domain | Unit | Integration | Component | E2E | Critical Gaps |
|---|---|---|---|---|---|

---

## Classification

Every material implementation path must be classified:

- PRESERVE
- STRENGTHEN
- CONSOLIDATE
- REPLACE
- HIDE/REMOVE

Classification requires evidence, not preference.

---

## Exit Gate

This audit is complete only when a developer can trace each major user outcome from UI -> domain -> persistence/provider -> failure behavior -> tests.
