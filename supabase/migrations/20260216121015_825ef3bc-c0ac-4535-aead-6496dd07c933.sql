
-- Allow admins/owners to view all candidate subscriptions
CREATE POLICY "Admins can view all candidate subscriptions"
ON public.candidate_subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Allow admins/owners to insert candidate subscriptions
CREATE POLICY "Admins can insert candidate subscriptions"
ON public.candidate_subscriptions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Allow admins/owners to update candidate subscriptions
CREATE POLICY "Admins can update candidate subscriptions"
ON public.candidate_subscriptions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Allow admins/owners to delete candidate subscriptions
CREATE POLICY "Admins can delete candidate subscriptions"
ON public.candidate_subscriptions
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));
