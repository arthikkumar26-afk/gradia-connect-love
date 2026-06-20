UPDATE public.candidate_subscriptions SET status='inactive', updated_at=now()
WHERE candidate_id='d074ae1f-0376-49dc-97a6-7820cd000591' AND plan='free' AND status='active';

UPDATE public.candidate_subscriptions SET status='active', updated_at=now()
WHERE candidate_id='d074ae1f-0376-49dc-97a6-7820cd000591' AND plan='elite'
  AND id=(SELECT id FROM public.candidate_subscriptions
          WHERE candidate_id='d074ae1f-0376-49dc-97a6-7820cd000591' AND plan='elite'
          ORDER BY created_at DESC LIMIT 1);