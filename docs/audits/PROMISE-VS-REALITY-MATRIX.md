# RT2RP — Promise vs Reality Matrix

**Status:** AUDIT REQUIRED

## Purpose

This is the enforcement document for RT2RP's hard-locked product rule:

**If RT2RP cannot fully and reliably do something, RT2RP does not mention it to the user.**

Every user-facing claim must be traced to current evidence.

A source file, UI card, provider client, background function, prompt, test count, or old document is not by itself proof that the user outcome is delivered.

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

Also search for claims implied by controls or status labels even when no explicit marketing sentence exists.

---

## Matrix

| Exact/Normalized Claim | Surface(s) | Expected User Outcome | Implementation Path | Production/Config Evidence | Reliability/Failure Evidence | Tests | Decision | Required Action |
|---|---|---|---|---|---|---|---|---|

Decision must be one of:

- **KEEP** — proven end-to-end and wording accurate;
- **NARROW** — capability is real but wording exceeds actual behavior;
- **HIDE** — implementation incomplete, unproven, or unreliable;
- **REMOVE** — capability/claim should not remain;
- **INTERNAL ONLY** — roadmap/development capability, not user-facing.

Unknown or unverified claims default to **HIDE/INTERNAL ONLY**, not KEEP.

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

Evidence should include, as applicable:

- current implementation path;
- current production configuration;
- provider/background chain;
- current data/schema behavior;
- relevant automated tests;
- manual end-to-end verification;
- failure-path verification;
- stale/offline verification;
- security/permission verification;
- observed production behavior or equivalent controlled validation.

Evidence must prove the **user outcome**, not merely the existence of code.

---

## Wording Standard

A capability may be technically real while the wording is still wrong.

Examples:

- refresh-on-open does not justify "monitored";
- cached data does not justify "live";
- app-shell caching does not justify "works offline";
- AI-assisted extraction does not justify "automatic" if material review is required;
- one supported transportation subtype does not justify a broader mode claim.

Use the narrowest wording that accurately describes validated behavior.

---

## Hard Gate

Any user-facing claim that cannot be proven is removed, hidden, or narrowed before the modernization phase adds new promises.

A claim returns to public surfaces only after the applicable subsystem spec records release evidence and an approved public-exposure decision.
