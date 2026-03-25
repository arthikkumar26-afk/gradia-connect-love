
CREATE TABLE public.employer_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employer_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'slot_booking',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  candidate_name TEXT,
  job_title TEXT,
  booking_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employer_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can view own notifications"
  ON public.employer_notifications
  FOR SELECT
  TO authenticated
  USING (employer_id = auth.uid());

CREATE POLICY "Employers can update own notifications"
  ON public.employer_notifications
  FOR UPDATE
  TO authenticated
  USING (employer_id = auth.uid());

CREATE POLICY "Service role can insert notifications"
  ON public.employer_notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.employer_notifications;
