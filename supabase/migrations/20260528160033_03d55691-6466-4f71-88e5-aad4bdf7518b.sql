-- Create Apple reviewer auth user (idempotent)
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'applereviewer@inlightai.com';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id, 'authenticated', 'authenticated',
      'applereviewer@inlightai.com',
      crypt('apple', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"display_name":"Apple Reviewer"}'::jsonb,
      now(), now(), '', '', '', ''
    );

    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'applereviewer@inlightai.com', 'email_verified', true),
      'email', v_user_id::text, now(), now(), now()
    );
  ELSE
    UPDATE auth.users
      SET encrypted_password = crypt('apple', gen_salt('bf')),
          email_confirmed_at = COALESCE(email_confirmed_at, now()),
          updated_at = now()
      WHERE id = v_user_id;
  END IF;

  -- Upsert profile to business tier
  INSERT INTO public.profiles (user_id, display_name, subscription_tier, subscription_started_at)
  VALUES (v_user_id, 'Apple Reviewer', 'business', now())
  ON CONFLICT (user_id) DO UPDATE
    SET subscription_tier = 'business',
        subscription_started_at = COALESCE(public.profiles.subscription_started_at, now()),
        updated_at = now();
END $$;