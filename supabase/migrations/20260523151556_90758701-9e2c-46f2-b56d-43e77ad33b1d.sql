UPDATE auth.users 
SET email = 'info@gradia.world', 
    raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('email', 'info@gradia.world'),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = 'a87f2a0e-2bb2-4858-967f-5990b717851f';

UPDATE public.profiles SET email = 'info@gradia.world', updated_at = now() WHERE id = 'a87f2a0e-2bb2-4858-967f-5990b717851f';