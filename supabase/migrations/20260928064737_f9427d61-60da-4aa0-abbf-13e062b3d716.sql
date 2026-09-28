DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'auth'
  LOOP
    EXECUTE format('GRANT ALL ON auth.%I TO supabase_auth_admin', t);
  END LOOP;
END $$;
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin;