
-- HR <-> Candidate chat
CREATE TABLE IF NOT EXISTS public.hr_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL,
  hr_id UUID NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('candidate','hr')),
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_chat_candidate ON public.hr_chat_messages(candidate_id, created_at DESC);

ALTER TABLE public.hr_chat_messages ENABLE ROW LEVEL SECURITY;

-- Candidates can view their own conversation
CREATE POLICY "Candidates view own chat"
ON public.hr_chat_messages FOR SELECT
TO authenticated
USING (candidate_id = auth.uid() OR public.is_hr_user(auth.uid()) OR public.is_admin_or_owner(auth.uid()));

-- Candidates can send messages as themselves
CREATE POLICY "Candidates send chat"
ON public.hr_chat_messages FOR INSERT
TO authenticated
WITH CHECK (
  (sender_role = 'candidate' AND candidate_id = auth.uid())
  OR (sender_role = 'hr' AND (public.is_hr_user(auth.uid()) OR public.is_admin_or_owner(auth.uid())))
);

-- HR can update read_at; candidates can update their own
CREATE POLICY "Update chat read state"
ON public.hr_chat_messages FOR UPDATE
TO authenticated
USING (candidate_id = auth.uid() OR public.is_hr_user(auth.uid()) OR public.is_admin_or_owner(auth.uid()))
WITH CHECK (candidate_id = auth.uid() OR public.is_hr_user(auth.uid()) OR public.is_admin_or_owner(auth.uid()));

ALTER TABLE public.hr_chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.hr_chat_messages;
