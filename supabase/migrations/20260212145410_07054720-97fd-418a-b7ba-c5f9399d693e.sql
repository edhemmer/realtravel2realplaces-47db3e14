
-- Idempotent unique constraint: prevent duplicate notifications per user/type/record
-- For record-linked notifications (departure, parking, stop, ticket): unique on (user_id, type, link_record_id)
-- For non-record notifications (expense_nudge): dedup is time-based in code
CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_type_record
  ON public.notifications (user_id, type, link_record_id)
  WHERE link_record_id IS NOT NULL;
