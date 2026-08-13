# Phase 2 Sharing / Security Findings

## Implemented

- Guest companion reads now keep notes and per-person amount owed owner-private, in addition to the sensitive identifiers already masked by the existing safe companion RPC.
- Restrictive database policies cap scoped guest writes: expense contributors may add expenses, lodging contributors may add stay bookings, and trip metadata plus existing expense/booking mutation remains owner-managed.
- `specs/001-sharing-permissions-pii-and-private-records.md` defines the full permission, PII, invite, receipt, and five-user validation contract.

## Confirmed strengths

- Companion reads already use a server-side safe RPC rather than raw guest reads.
- Existing code already masks email, phone, TSA/Known Traveler Number, and frequent-flyer identifiers for non-owners.
- Receipt storage is private and object access is scoped to the uploader namespace.
- Invite permission changes use an owner-only server RPC.

## Open client gap

The current client still maps any scoped guest write flag into generic `canEdit = true`. That is not accepted as the final authorization model. Database restrictions now bound the security impact, but the UI must be migrated to capability-specific controls so a guest never sees unrelated edit affordances.

## Open private-record gap

Receipt capture stores a short-lived signed URL as the expense's receipt reference. The product needs a durable object path plus on-demand signing before receipt retention can be treated as dependable.

## Required validation

This phase remains unvalidated until migrations are applied in a controlled environment, cross-user authorization tests pass, client capability cleanup is complete, receipt durability is fixed, and build/lint/test/E2E checks pass.
