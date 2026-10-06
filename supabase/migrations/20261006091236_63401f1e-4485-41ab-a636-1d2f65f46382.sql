DO $$
DECLARE u uuid; sid uuid; wid uuid; balance_before integer; result integer; denied boolean; test_passed boolean:=false;
BEGIN
 BEGIN
  SELECT employer_id INTO u FROM public.subscriptions LIMIT 1;
  IF u IS NULL THEN RAISE EXCEPTION 'No employer available for rollback-only verification'; END IF;
  SELECT id,points_balance INTO wid,balance_before FROM public.wallets WHERE user_id=u FOR UPDATE;
  IF wid IS NULL THEN INSERT INTO public.wallets(user_id,points_balance) VALUES(u,100) RETURNING id INTO wid; ELSE UPDATE public.wallets SET points_balance=100 WHERE id=wid; END IF;
  INSERT INTO public.subscriptions(employer_id,plan_id,plan_name,status,billing_cycle,amount,currency,ends_at,auto_renew,created_at) VALUES(u,'autopay_test','Autopay test','active','points',20,'PTS',now()-interval '1 minute',false,now()+interval '1 minute') RETURNING id INTO sid;
  PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
  PERFORM public.set_subscription_autopay(sid,true,u);
  result:=public.renew_wallet_point_subscriptions();
  IF result<>1 OR (SELECT points_balance FROM public.wallets WHERE id=wid)<>80 OR (SELECT ends_at FROM public.subscriptions WHERE id=sid)<=now() THEN RAISE EXCEPTION 'Successful renewal failed'; END IF;
  PERFORM public.renew_wallet_point_subscriptions();
  IF (SELECT points_balance FROM public.wallets WHERE id=wid)<>80 OR (SELECT count(*) FROM public.wallet_transactions WHERE reference_id LIKE 'autopay:'||sid::text||':%')<>1 THEN RAISE EXCEPTION 'Duplicate-charge prevention failed'; END IF;
  UPDATE public.subscriptions SET ends_at=now()-interval '1 minute' WHERE id=sid;
  UPDATE public.wallets SET points_balance=0 WHERE id=wid;
  PERFORM public.renew_wallet_point_subscriptions();
  IF (SELECT status FROM public.subscription_autopay WHERE subscription_id=sid)<>'insufficient_funds' OR (SELECT points_balance FROM public.wallets WHERE id=wid)<>0 THEN RAISE EXCEPTION 'Insufficient-balance handling failed'; END IF;
  denied:=false;
  BEGIN PERFORM public.set_subscription_autopay(sid,true,gen_random_uuid()); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Ownership validation failed'; END IF;
  PERFORM set_config('request.jwt.claims','{"role":"authenticated"}',true);
  denied:=false;
  BEGIN PERFORM public.set_subscription_autopay(sid,true,u); EXCEPTION WHEN insufficient_privilege THEN denied:=true; END;
  IF NOT denied THEN RAISE EXCEPTION 'Service-role validation failed'; END IF;
  test_passed:=true;
  RAISE EXCEPTION USING ERRCODE='Z0001',MESSAGE='Roll back successful autopay test fixtures';
 EXCEPTION WHEN SQLSTATE 'Z0001' THEN NULL;
 END;
 IF NOT test_passed THEN RAISE EXCEPTION 'Autopay verification did not finish'; END IF;
END;
$$;