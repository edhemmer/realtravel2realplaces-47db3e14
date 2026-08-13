# Phase 2 Sharing Security Notes

This branch hardens guest sharing without broadening product promises.

Implemented:
- stricter guest companion-field masking;
- restrictive database rules for scoped expense and lodging contributions;
- a complete sharing/PII/private-record acceptance spec.

Still required before this work can be considered validated:
- controlled database migration apply;
- cross-user authorization tests;
- client cleanup of generic `canEdit` usage;
- durable receipt-path migration and on-demand signing;
- build, lint, unit and end-to-end checks.
