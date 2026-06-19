
ALTER TABLE public.subscription_activation_logs
  ADD COLUMN IF NOT EXISTS actor_user_id uuid,
  ADD COLUMN IF NOT EXISTS actor_email text,
  ADD COLUMN IF NOT EXISTS previous_plan text;

CREATE INDEX IF NOT EXISTS idx_sub_act_logs_actor
  ON public.subscription_activation_logs(actor_user_id);

DROP POLICY IF EXISTS "Admins can insert activation logs" ON public.subscription_activation_logs;
CREATE POLICY "Admins can insert activation logs"
  ON public.subscription_activation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'owner'::app_role)
  );
