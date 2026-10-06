DROP FUNCTION public.set_subscription_autopay(uuid,boolean);
CREATE FUNCTION public.set_subscription_autopay(p_subscription_id uuid,p_enabled boolean,p_user_id uuid)
RETURNS public.subscription_autopay LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE s public.subscriptions%ROWTYPE; result public.subscription_autopay%ROWTYPE;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
 IF p_enabled IS NULL THEN RAISE EXCEPTION 'Autopay choice is required'; END IF;
 SELECT * INTO s FROM public.subscriptions WHERE id=p_subscription_id AND employer_id=p_user_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Subscription not found' USING ERRCODE='42501'; END IF;
 IF p_enabled AND (s.status<>'active' OR s.currency<>'PTS' OR s.billing_cycle<>'points' OR s.ends_at IS NULL OR s.amount<=0 OR s.amount<>trunc(s.amount) OR s.amount>2147483647) THEN RAISE EXCEPTION 'Autopay requires an active paid wallet-points plan'; END IF;
 IF p_enabled AND EXISTS(SELECT 1 FROM public.subscriptions WHERE employer_id=s.employer_id AND status='active' AND created_at>s.created_at) THEN RAISE EXCEPTION 'Please enable autopay on your latest plan'; END IF;
 IF p_enabled THEN
  UPDATE public.subscription_autopay SET enabled=false,status='superseded',updated_at=now() WHERE user_id=p_user_id AND subscription_id<>s.id AND enabled;
  INSERT INTO public.subscription_autopay(subscription_id,user_id,enabled,points_per_renewal,status) VALUES(s.id,p_user_id,true,s.amount::integer,'enabled') ON CONFLICT(subscription_id) DO UPDATE SET enabled=true,points_per_renewal=EXCLUDED.points_per_renewal,status='enabled',updated_at=now() RETURNING * INTO result;
 ELSE
  UPDATE public.subscription_autopay SET enabled=false,status='disabled',updated_at=now() WHERE subscription_id=s.id RETURNING * INTO result;
 END IF;
 UPDATE public.subscriptions SET auto_renew=p_enabled,updated_at=now() WHERE id=s.id;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.set_subscription_autopay(uuid,boolean,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_subscription_autopay(uuid,boolean,uuid) TO service_role;