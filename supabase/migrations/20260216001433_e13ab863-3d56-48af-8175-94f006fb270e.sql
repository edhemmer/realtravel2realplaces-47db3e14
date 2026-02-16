
CREATE OR REPLACE FUNCTION public.auto_create_ingestion_address()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_hash TEXT;
  v_address TEXT;
  v_attempts INT := 0;
BEGIN
  LOOP
    v_hash := substr(encode(gen_random_bytes(8), 'hex'), 1, 12);
    v_address := 'u_' || v_hash || '@ingest.realtravel2realplaces.app';
    
    BEGIN
      INSERT INTO email_ingestion_addresses (user_id, ingestion_hash, ingestion_address)
      VALUES (NEW.user_id, v_hash, v_address);
      EXIT; -- success
    EXCEPTION WHEN unique_violation THEN
      v_attempts := v_attempts + 1;
      IF v_attempts >= 5 THEN
        RAISE EXCEPTION 'Failed to generate unique ingestion hash after 5 attempts';
      END IF;
    END;
  END LOOP;
  
  RETURN NEW;
END;
$function$;
