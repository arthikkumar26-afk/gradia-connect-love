-- Clean up soni94732@gmail.com so the admin can recreate the account fresh
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'soni94732@gmail.com' LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    DELETE FROM public.user_credentials WHERE user_id = v_user_id;
    DELETE FROM public.user_roles WHERE user_id = v_user_id;
    DELETE FROM public.profiles WHERE id = v_user_id;
    DELETE FROM auth.users WHERE id = v_user_id;
  END IF;
END $$;