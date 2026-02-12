
ALTER TABLE public.notification_preferences
  ADD COLUMN ticket_reminder_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN ticket_reminder_days_before integer NOT NULL DEFAULT 3;
