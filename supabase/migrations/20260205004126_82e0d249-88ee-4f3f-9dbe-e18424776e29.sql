-- Enable required extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the lifecycle enforcement job to run daily at 3:00 AM UTC
SELECT cron.schedule(
  'trip-lifecycle-enforcement-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://ipshyjotathcwetqvhxv.supabase.co/functions/v1/trip-lifecycle-enforcement',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret_key', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
