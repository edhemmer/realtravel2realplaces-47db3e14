# RT2RP — Promise vs Reality Matrix

**Status:** PHASE 0 — INITIAL MAIN CLAIM AUDIT

**Audited branch:** `main`

## Purpose

This enforces the hard-locked rule:

**If RT2RP cannot fully and reliably do something, RT2RP does not mention it to the user.**

Current user-facing claims are compared to current implementation evidence. Unknown/unproven claims do not default to KEEP.

---

## Initial Claim Matrix

| Exact / Normalized Claim | Current Surface | Current Evidence | Reality Assessment | Decision | Required Action |
|---|---|---|---|---|---|
| “offline travel app” / “offline trip details” | Landing SEO/keywords/OG/schema | IndexedDB canonical trip snapshots exist; mobile Timeline uses cached window offline; dedicated weather/Explore caches exist | **PARTLY REAL, BROADER THAN PROVEN** | NARROW | Until full offline packet/security/staleness/account-switch validation exists, describe only explicitly proven cached/offline surfaces. |
| “offline expense capture” | Landing schema | IndexedDB expense queue exists and renders/queues offline records | **REAL FOUNDATION, RELIABILITY DEFECT** | HIDE/NARROW UNTIL FIXED | Durable server-side idempotency must prevent duplicate replay; queue/account lifecycle must be tested. |
| “exactly once” offline expense sync | Source comments / implied behavior | Queue has `clientExpenseId`, but current insert does not persist/use it as durable idempotency key; lock is in-memory | **FALSE GUARANTEE** | REMOVE FROM CLAIMS / FIX IMPLEMENTATION | Add server-enforced unique idempotency key or transactional command; regression-test post-insert interruption/retry. |
| “Today view for next actions and leave-by timing” | Landing schema | `NowCommandCenter`, canonical Today stack, execution windows, next action resolver, buffer/drive logic exist | **SUBSTANTIAL IMPLEMENTATION, END-TO-END ACCURACY UNPROVEN** | NARROW/KEEP ONLY AFTER VALIDATION | Validate representative air/drive/rail/mixed trips, timezone boundaries, stale provider state, and rendered next-action correctness. |
| “Driving Mode for road trips, route context, and next stops” | Landing schema | Dedicated DriveMode route, route provider, drive engines/helpers and Today handoff exist | **REAL** | KEEP SUBJECT TO LIVE WORDING AUDIT | Prove route freshness, fallback, mixed-mode transitions, navigation handoff, and hazard semantics. |
| “Local transit map and routing windows” | Landing schema/SEO | HERE transit function and transit intelligence code exist | **IMPLEMENTED PATH, LIVE/SCOPE UNPROVEN** | NARROW | Do not imply live transit monitoring unless current provider semantics and freshness prove it. |
| “multi-currency travel expenses” | Landing schema | currency/monetary normalization, expense calculations and report surfaces exist | **STRONG CODE FOUNDATION** | KEEP ONLY AFTER RECONCILIATION VALIDATION | Verify exchange semantics, persisted currency, totals and reports on multi-currency scenarios. |
| “trip sharing with scoped permissions” | Landing schema | share/member/companion routes/hooks and Supabase RLS migrations exist | **IMPLEMENTED PATH, SECURITY PROOF INCOMPLETE** | NARROW/UNPROVEN | Complete RLS/permission/PII matrix and multi-user E2E before broad claim. |
| “business and personal trip management” | Landing schema | trip type/business gating, work-stop/tour, expenses/reports exist | **REAL SCOPE** | KEEP WITH PRECISE WORDING | Avoid implying enterprise booking/procurement/approval capabilities. |
| “reports” | Landing SEO/schema | `/reports`, trip report tab and expense/report code exist | **REAL SURFACE, RECONCILIATION UNPROVEN** | KEEP GENERIC; HIDE STRONG ACCURACY CLAIMS | Prove report totals/records reconcile to canonical sources. |
| “live alert” / “Live checked” flight state | `useFlightStatus.describeFlightStatus` | foreground flight-status function returns fresh/cached signal; 10-min backend cache and 5-min client stale time | **FOREGROUND PROVIDER CHECK, NOT MONITORING** | NARROW | Use wording like “checked recently” unless actual observation freshness and successful provider response are explicit; distinguish provider failure from clear result. |
| proactive flight monitoring / automatic flight-change alerts | any marketing/help copy if present | no complete background flight-poll/change-detect/delivery chain proven in initial audit | **UNPROVEN** | HIDE | Only expose after scheduler, quota, identity match, comparison, persistence, push, retry and production evidence exist. |
| realtime collaboration / “stay live” | product copy if present | `RealtimeSyncBridge` subscribes to key Postgres table changes and invalidates React Query | **REAL SYNCHRONIZATION FOUNDATION** | NARROW | Prove subscription state/recovery, RLS and complete relevant table coverage before “real-time collaboration” language. |
| AI assistant answers from trip | in-app assistant | authenticated edge function uses only client-supplied tripContext, explicitly forbids invention | **REAL BOUNDED CAPABILITY** | KEEP WITH BOUNDED WORDING | Do not imply server-verified canonical context/live data. Strengthen server grounding and deterministic timing. |
| automatic booking / itinerary / receipt import | intake/help/marketing surfaces | substantial parse/import functions, staging/review, canonical mappers and tests exist | **REAL IMPLEMENTATION, ACCURACY RATE UNPROVEN** | NARROW | Build representative eval corpus and publish no accuracy/automatic-completeness claim until threshold passes. |
| native iOS experience | install/App Store surfaces | iOS/Capacitor project plus native helpers exist | **REAL PLATFORM FOUNDATION** | KEEP BASIC PLATFORM CLAIM; NARROW ADVANCED CLAIMS | Prove push, deep links, lifecycle, local reminders, offline and visual/native quality on actual device builds. |
| CarPlay | any potential future/public reference | repository contains only `ios/CarPlayScaffold/README.md` in tree | **NOT PROVEN PRODUCT CAPABILITY** | HIDE | No CarPlay claim unless real target/entitlements/UI behavior are implemented and approved. |

---

## Immediate Claim Risks

### P0/P1: Financial reliability wording

The current offline expense implementation contains a durable-idempotency gap. No user-facing wording should imply exactly-once sync or bulletproof offline financial capture until fixed and tested.

### P1: Offline breadth

The product has real offline infrastructure, but broad phrases such as `offline travel app` or `offline trip details` imply a complete critical-trip offline experience. Current evidence proves portions of that outcome, not the whole promise.

### P1: Live/real-time semantics

The flight provider path is a foreground, gated, cached signal check. It must not be described as background monitoring. The client currently labels fresh no-signal responses `Live checked`, which is too strong if the backend returned a null signal due to an unrecognized failure state.

### P1: Permissions/security

Sharing and scoped-permission code exists, but security claims remain incomplete until the RLS matrix and cross-user tests are verified.

---

## Claim Wording Rules for Current Main

Until corresponding specs are validated:

- use **saved/cached** rather than **offline** for isolated cached surfaces unless the complete offline user outcome is proven;
- use **checked/updated** rather than **monitored** for foreground provider requests;
- use **can import with review** rather than **automatically organizes everything** unless accuracy/deduplication thresholds are proven;
- use **share/manage access** only to the scope proven by RLS and role tests;
- use **travel expense tracking/reporting** rather than accounting-grade language unless reconciliation evidence exists;
- never use `live`, `real-time`, `automatic`, `secure`, `accurate`, or `offline` as generic marketing adjectives detached from the validated subsystem contract.

---

## Remaining Claim Inventory Required

This initial pass inspected the landing page and several core in-app/provider surfaces. Phase 0 still requires exact claim extraction from:

- Landing component copy beyond page-level SEO/schema;
- `Plans.tsx` and pricing components;
- `HelpCenter.tsx`;
- `InstallApp.tsx`;
- onboarding;
- notification preference labels;
- account email-import copy;
- App Store/readiness metadata and screenshots;
- reports/export copy;
- AI empty/error/help states;
- emails/companion summaries.

Any unverified claim discovered there defaults to **HIDE / NARROW** until supported by release evidence.

---

## Hard Gate

A public claim is retained only when the **user outcome** is proven, not merely because the supporting code exists.

A claim can return or broaden only after the applicable subsystem spec records:

1. current implementation evidence;
2. acceptance tests;
3. production/configuration proof;
4. failure/recovery evidence;
5. competitive quality evidence where relevant;
6. approved public exposure wording.
