
DROP FUNCTION IF EXISTS public.start_mock_interview_session();

CREATE OR REPLACE FUNCTION public.start_mock_interview_session(
  p_interview_type text DEFAULT NULL,
  p_pipeline_type text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_plan text := 'free';
  v_ends timestamptz;
  v_base_limit int;
  v_used int;
  v_paid_extras int;
  v_max int;
  v_period_start timestamptz := date_trunc('month', now());
  v_session_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT plan, ends_at INTO v_plan, v_ends
  FROM public.candidate_subscriptions
  WHERE candidate_id = v_user AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_plan IS NULL OR (v_ends IS NOT NULL AND v_ends <= now()) THEN
    v_plan := 'free';
  END IF;

  v_base_limit := CASE v_plan
    WHEN 'free' THEN 1
    WHEN 'starter' THEN 2
    WHEN 'advance' THEN 5
    WHEN 'pro_accelerator' THEN 15
    WHEN 'elite' THEN 2147483647
    ELSE 1
  END;

  SELECT count(*) INTO v_used
  FROM public.mock_interview_sessions
  WHERE candidate_id = v_user AND created_at >= v_period_start;

  SELECT count(*) INTO v_paid_extras
  FROM public.payment_transactions
  WHERE user_id = v_user
    AND action_key = 'extra_mock_test'
    AND status = 'paid'
    AND created_at >= v_period_start;

  v_max := v_base_limit + COALESCE(v_paid_extras, 0);

  IF v_plan <> 'elite' AND v_used >= v_max THEN
    RAISE EXCEPTION 'Mock test limit reached. Please pay for an extra test to continue.'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.mock_interview_sessions
    (candidate_id, status, current_stage_order, started_at, interview_type, pipeline_type, points_paid)
  VALUES
    (v_user, 'in_progress', 1, now(), p_interview_type, p_pipeline_type, false)
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_mock_interview_session(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.start_mock_interview_session(text, text) TO authenticated;
