# Spec 001 — Sharing, Permissions, PII, and Private Records

**Status:** IMPLEMENTATION + VALIDATION

## 1. User outcome

A trip owner can invite another traveler to see the trip and optionally contribute only the exact categories the owner grants. A guest can never gain generic edit authority merely because one scoped contribution flag is enabled. Sensitive traveler identifiers and private financial/record content remain protected by default.

## 2. Product truth

RT2RP may describe sharing only at the scope proven by database enforcement and end-to-end tests.

The current product model exposes these guest choices:

- read-only;
- can add expenses;
- can add lodging.

Those labels are contracts. They do not mean `can edit the trip`.

## 3. Current implementation evidence

- `useTripOwnership()` resolves `canAddExpenses` and `canAddLodging` from `trip_members`.
- The same hook currently also collapses either scoped capability into generic `canEdit = true`; this is a privilege-boundary smell and must not be treated as authoritative security.
- `TripPermissionContext` distributes both generic and scoped flags.
- Expenses explicitly consult `canAddExpenses`, but other older surfaces can still consult generic `canEdit`.
- `BookingsTab` currently consults generic `canEdit`, so the client UI does not yet model `can_stay` as a stay-only capability.
- `get_companions_safe()` is already the canonical read path for traveler/companion display and masks email, phone, TSA PreCheck, and frequent-flyer identifiers for non-owners.
- Phase 2 additionally masks companion notes and `portion_owed` for non-owners because both can contain private or financial context.
- Receipt storage is a private Supabase bucket whose policies scope object access to the authenticated user's top-level folder.
- Current expense capture persists a one-hour signed receipt URL rather than a durable object path. That is a records-durability defect and must be corrected before receipt-retention claims are strengthened.

## 4. Hard permission contract

### Owner

May read/write all trip-owned entities subject to lifecycle locks and other domain rules.

### Read-only guest

May read only guest-safe trip projections. May not insert, update, or delete canonical trip-owned records.

### Expense contributor

May add an expense to the shared trip.

`Can add expenses` does **not** imply:

- edit trip metadata;
- edit/delete other travelers' expenses;
- edit reservations;
- edit companions;
- edit parking/packing/notes/stops;
- change sharing permissions.

Until expense rows have trustworthy authorship (`created_by_user_id`) and an explicit product rule, guest update/delete remains owner-only.

### Lodging contributor

May add a booking only when `booking_type = stay`.

`Can add lodging` does **not** imply:

- add flights, cars, activities, or transport;
- edit/delete existing reservations;
- change trip dates/identity;
- generic `canEdit` authority.

## 5. Database enforcement

Database RLS is authoritative. UI gating is convenience and clarity, never the security boundary.

Phase 2 restrictive policies must bound older permissive policies so:

- trip UPDATE/DELETE is owner-only;
- expense INSERT is owner or guest with `can_expenses`;
- expense UPDATE/DELETE is owner-only until authorship exists;
- booking INSERT is owner, or guest with `can_stay` when the new row is a `stay`;
- booking UPDATE/DELETE is owner-only.

A future capability expansion requires a new spec and explicit database rule. It must not be achieved by reusing generic `canEdit`.

## 6. Client permission model

Target client model:

```ts
{
  isOwner: boolean;
  canEditTripMeta: boolean;
  canAddExpenses: boolean;
  canAddLodging: boolean;
  isReadOnlyOverall: boolean;
}
```

Generic `canEdit` is legacy compatibility only and must be removed from guest authorization decisions.

Before this spec is VALIDATED:

1. inventory every `useTripPermission().canEdit` consumer;
2. map it to a specific capability or owner-only action;
3. update Bookings so a lodging contributor sees an Add Lodging action, not generic reservation editing;
4. update Expenses so a contributor can add but does not receive edit/delete affordances for existing canonical rows;
5. verify trip metadata, companions, notes, parking, packing, stops, reports, and sharing controls are owner-only where no explicit guest capability exists.

## 7. PII contract

### Guest-safe by default

Only information necessary to coordinate the shared trip should be exposed.

Currently acceptable guest-facing companion fields include:

- display name;
- airline/flight context when needed for shared execution;
- seat context when needed for shared execution.

### Owner-private by default

- email;
- phone;
- TSA / Known Traveler Number;
- frequent-flyer identifiers;
- free-form companion notes;
- per-person amount owed unless a dedicated settlement-sharing model explicitly authorizes it.

The masking decision belongs on the server in `get_companions_safe()`, not in React.

## 8. Receipts and private documents

A receipt is a durable private record, not a temporary image URL.

Required model:

```text
expense
  receipt_storage_path  -> durable private object identifier

view receipt
  -> verify current user can access trip/record
  -> mint short-lived signed URL
  -> render
```

Never use a short-lived signed URL as the canonical stored receipt identifier.

Existing rows containing signed URLs require migration/recovery analysis; do not silently discard them.

## 9. Invitation security

Invite creation/update/revoke/accept/decline remains server-controlled through audited RPCs.

Requirements:

- owner-only invite creation and permission changes;
- token cannot grant a different trip or permission set than the server record;
- expiry enforced server-side;
- revoked/accepted/expired tokens cannot be replayed;
- invite email matching semantics are explicit and tested;
- acceptance creates exactly one membership;
- a user cannot alter their own membership capabilities;
- self-removal cannot affect owner membership or another user.

## 10. Failure states

Permission denial must fail closed and be understandable.

The product must not display an enabled control that predictably fails because the user lacks the required capability. Server denial remains mandatory as defense in depth, but UI and database must agree.

## 11. Required security matrix

Test at minimum with Owner A, read-only Guest B, expense Guest C, lodging Guest D, unrelated User E.

| Operation | A | B | C | D | E |
|---|---:|---:|---:|---:|---:|
| View shared trip | allow | allow | allow | allow | deny |
| Update trip metadata | allow | deny | deny | deny | deny |
| Add expense | allow | deny | allow | deny | deny |
| Update/delete existing expense | allow | deny | deny | deny | deny |
| Add stay | allow | deny | deny | allow | deny |
| Add flight/car/activity | allow | deny | deny | deny | deny |
| Update/delete existing booking | allow | deny | deny | deny | deny |
| Read owner-private companion PII | allow | deny | deny | deny | deny |
| Change permissions/invites | allow | deny | deny | deny | deny |

## 12. Storage tests

For receipts:

- user can upload only within their own storage namespace;
- unrelated user cannot list/read/delete object;
- trip access alone does not expose raw bucket contents;
- authorized receipt viewing uses a fresh signed URL minted at access time;
- expired signed URL can be refreshed from durable path without losing the receipt;
- sign-out/account switch removes cached private receipt representations.

## 13. Migration compatibility

Do not remove legacy `trip_shares` until all accepted shares are inventoried and migrated to `trip_members` with explicit scoped capabilities.

Legacy `edit` must not silently become unlimited modern edit authority. Map it intentionally or require owner review.

## 14. Observability

Record enough structured information to detect repeated permission denials, invite failures, and receipt-signing failures without logging sensitive payloads or tokens.

Never log:

- invite plaintext token;
- receipt image/body;
- TSA/frequent-flyer identifier;
- email/phone beyond already-approved privacy-safe operational metadata.

## 15. Acceptance gate

This subsystem is VALIDATED only when:

1. restrictive database rules are applied in a controlled Supabase environment;
2. every generic client `canEdit` consumer has been classified and corrected;
3. the five-user security matrix passes directly against the database and through the UI;
4. `get_companions_safe()` returns no owner-private field to guests;
5. invite replay/expiry/revoke tests pass;
6. receipts persist durable storage paths and re-sign on access;
7. browser/iOS tests verify guest UX shows only allowed actions;
8. public wording is rechecked against the proven result.

## 16. Exposure decision

**Current:** NARROW / INTERNAL VALIDATION.

Do not advertise broad `scoped permissions`, `private sharing`, or durable receipt access beyond what has passed the acceptance gate. Basic trip invitation can remain described only at its proven scope.
