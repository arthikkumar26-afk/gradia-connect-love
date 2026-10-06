CREATE TABLE public.subscription_autopay (
 subscription_id uuid PRIMARY KEY REFERENCES public.subscriptions(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 enabled boolean NOT NULL DEFAULT false,
 points_per_renewal integer NOT NULL CHECK (points_per_renewal > 0),
 status text NOT NULL DEFAULT 'disabled' CHECK (status IN ('enabled','disabled','insufficient_funds','superseded')),
 last_renewed_at timestamptz,
 last_transaction_id uuid REFERENCES public.wallet_transactions(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscription_autopay TO authenticated;
GRANT ALL ON public.subscription_autopay TO service_role;
ALTER TABLE public.subscription_autopay ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view their plan autopay" ON public.subscription_autopay FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE FUNCTION public.set_subscription_autopay(p_subscription_id uuid, p_enabled boolean)
RETURNS public.subscription_autopay LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE s public.subscriptions%ROWTYPE; result public.subscription_autopay%ROWTYPE;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Please sign in' USING ERRCODE='42501'; END IF;
 IF p_enabled IS NULL THEN RAISE EXCEPTION 'Autopay choice is required'; END IF;
 SELECT * INTO s FROM public.subscriptions WHERE id=p_subscription_id AND employer_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Subscription not found' USING ERRCODE='42501'; END IF;
 IF p_enabled AND (s.status <> 'active' OR s.currency <> 'PTS' OR s.billing_cycle <> 'points' OR s.ends_at IS NULL OR s.amount <= 0 OR s.amount <> trunc(s.amount) OR s.amount > 2147483647) THEN
  RAISE EXCEPTION 'Autopay requires an active paid wallet-points plan';
 END IF;
 IF p_enabled AND EXISTS (SELECT 1 FROM public.subscriptions WHERE employer_id=s.employer_id AND status='active' AND created_at > s.created_at) THEN
  RAISE EXCEPTION 'Please enable autopay on your latest plan';
 END IF;
 IF p_enabled THEN
  UPDATE public.subscription_autopay SET enabled=false,status='superseded',updated_at=now() WHERE user_id=auth.uid() AND subscription_id<>s.id AND enabled;
  INSERT INTO public.subscription_autopay(subscription_id,user_id,enabled,points_per_renewal,status)
  VALUES(s.id,auth.uid(),true,s.amount::integer,'enabled')
  ON CONFLICT(subscription_id) DO UPDATE SET enabled=true,points_per_renewal=EXCLUDED.points_per_renewal,status='enabled',updated_at=now()
  RETURNING * INTO result;
 ELSE
  UPDATE public.subscription_autopay SET enabled=false,status='disabled',updated_at=now() WHERE subscription_id=s.id RETURNING * INTO result;
 END IF;
 UPDATE public.subscriptions SET auto_renew=p_enabled,updated_at=now() WHERE id=s.id;
 RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.set_subscription_autopay(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_subscription_autopay(uuid,boolean) TO authenticated;

CREATE FUNCTION public.renew_wallet_point_subscriptions()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public
AS $$
DECLARE item record; s public.subscriptions%ROWTYPE; w public.wallets%ROWTYPE; tx uuid; renewed integer:=0; end_date timestamptz;
BEGIN
 FOR item IN SELECT a.subscription_id FROM public.subscription_autopay a JOIN public.subscriptions sub ON sub.id=a.subscription_id WHERE a.enabled AND sub.ends_at<=now() ORDER BY sub.ends_at LIMIT 100
 LOOP
  SELECT * INTO s FROM public.subscriptions WHERE id=item.subscription_id FOR UPDATE SKIP LOCKED;
  IF NOT FOUND THEN CONTINUE; END IF;
  SELECT * INTO item FROM public.subscription_autopay WHERE subscription_id=s.id FOR UPDATE;
  IF NOT FOUND OR NOT item.enabled OR s.ends_at>now() THEN CONTINUE; END IF;
  IF s.status<>'active' OR s.currency<>'PTS' OR s.billing_cycle<>'points' OR s.amount<>item.points_per_renewal OR s.employer_id<>item.user_id OR EXISTS(SELECT 1 FROM public.subscriptions WHERE employer_id=s.employer_id AND status='active' AND created_at>s.created_at) THEN
   UPDATE public.subscription_autopay SET enabled=false,status='superseded',updated_at=now() WHERE subscription_id=s.id;
   UPDATE public.subscriptions SET auto_renew=false,updated_at=now() WHERE id=s.id;
   CONTINUE;
  END IF;
  SELECT * INTO w FROM public.wallets WHERE user_id=s.employer_id FOR UPDATE;
  IF NOT FOUND OR w.points_balance<item.points_per_renewal THEN
   UPDATE public.subscription_autopay SET enabled=false,status='insufficient_funds',updated_at=now() WHERE subscription_id=s.id;
   UPDATE public.subscriptions SET auto_renew=false,updated_at=now() WHERE id=s.id;
   CONTINUE;
  END IF;
  UPDATE public.wallets SET points_balance=points_balance-item.points_per_renewal,updated_at=now() WHERE id=w.id;
  INSERT INTO public.wallet_transactions(wallet_id,transaction_type,category,points,description,reference_id)
  VALUES(w.id,'debit','subscription',item.points_per_renewal,s.plan_name || ' plan — automatic renewal', 'autopay:'||s.id::text||':'||extract(epoch from s.ends_at)::bigint::text) RETURNING id INTO tx;
  end_date:=greatest(s.ends_at,now())+interval '30 days';
  UPDATE public.subscriptions SET started_at=greatest(s.ends_at,now()),ends_at=end_date,auto_renew=true,updated_at=now() WHERE id=s.id;
  UPDATE public.subscription_autopay SET last_renewed_at=now(),last_transaction_id=tx,updated_at=now() WHERE subscription_id=s.id;
  renewed:=renewed+1;
 END LOOP;
 RETURN renewed;
END;
$$;
REVOKE ALL ON FUNCTION public.renew_wallet_point_subscriptions() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.renew_wallet_point_subscriptions() TO service_role;
SELECT cron.schedule('renew-wallet-point-subscriptions','0 * * * *','SELECT public.renew_wallet_point_subscriptions();');