# RT2RP — Promise vs Reality Matrix

**Status:** AUDIT REQUIRED

## Purpose

This is the enforcement document for RT2RP's hard-locked product rule:

**If RT2RP cannot fully and reliably do something, RT2RP does not mention it to the user.**

Every user-facing claim must be traced to evidence.

---

## Claim Inventory

Audit all public/user-facing sources:

- landing page;
- onboarding;
- plans/pricing;
- in-app labels and helper copy;
- empty states;
- notifications;
- AI responses/system prompts;
- Help Center;
- install page;
- App Store metadata/screenshots;
- reports;
- emails;
- product screenshots/demos.

---

## Matrix

| Exact/Normalized Claim | Surface(s) | Expected User Outcome | Complete End-to-End Implementation? | Reliability Evidence | Failure/Truth State | Tests | Decision |
|---|---|---|---|---|---|---|---|

Decision must be one of:

- KEEP — proven and wording accurate;
- NARROW — capability is real but wording exceeds actual behavior;
- HIDE — implementation incomplete/unproven;
- REMOVE — capability/claim should not remain;
- INTERNAL ONLY — roadmap/development capability not user-facing.

---

## Special Claim Categories

Claims containing or implying the following require additional proof:

- live;
- real-time;
- monitors;
- alerts automatically;
- works offline;
- AI-powered/intelligent;
- secure/private;
- automatically imports;
- keeps updated;
- accurate;
- calculates/reports totals;
- shared/collaborative;
- native/background.

---

## Evidence Standard

A source file or database object alone is not sufficient proof.

Evidence should include, as applicable:

- current implementation path;
- production configuration;
- provider/background chain;
- relevant tests;
- manual end-to-end verification;
- failure-path verification;
- stale/offline verification;
- security verification.

---

## Hard Gate

Any user-facing claim that cannot be proven is removed or hidden before the modernization phase adds new promises.
