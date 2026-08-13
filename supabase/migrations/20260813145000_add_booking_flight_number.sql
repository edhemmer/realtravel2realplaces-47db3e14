-- Phase 10: canonical flight identity
--
-- Flight number and confirmation number are different identifiers. Provider
-- lookups must never infer one from the other. This nullable field establishes
-- a dedicated canonical location for flight number without changing existing
-- records or claiming provider coverage for records that do not have it.

alter table public.bookings
  add column if not exists flight_number text;

comment on column public.bookings.flight_number is
  'Canonical airline flight number (for example DL1234 or B6123). Distinct from confirmation_number; nullable when unknown.';
