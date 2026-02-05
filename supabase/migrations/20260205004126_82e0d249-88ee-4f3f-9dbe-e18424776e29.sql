-- Enable required extensions for cron scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the lifecycle enforcement job to run daily at 3:00 AM UTC
SELECT cron.schedule(
  'trip-lifecycle-enforcement-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://tlrviwlfckiahhfmeilv.supabase.co/functions/v1/trip-lifecycle-enforcement',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRscnZpd2xmY2tpYWhoZm1laWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0MzI4NDEsImV4cCI6MjA4NTAwODg0MX0.-2FrPdsU_qyc9XCg2gQux0VsA8RLQlS1CfEm-BrMVdA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);