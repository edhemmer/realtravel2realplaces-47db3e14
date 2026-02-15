-- Allow users to insert their own ingestion addresses (for regeneration)
CREATE POLICY "Users can insert their own ingestion address"
ON public.email_ingestion_addresses
FOR INSERT
WITH CHECK (auth.uid() = user_id);
