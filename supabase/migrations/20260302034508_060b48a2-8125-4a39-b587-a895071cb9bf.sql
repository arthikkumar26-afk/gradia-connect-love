-- Performance indexes for high-traffic queries

-- Profiles: fast lookup by role and email
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles (created_at DESC);

-- Jobs: fast filtering by status, employer, and dates
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs (status);
CREATE INDEX IF NOT EXISTS idx_jobs_employer_id ON public.jobs (employer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_moderation_status ON public.jobs (moderation_status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_status_moderation ON public.jobs (status, moderation_status);

-- Applications: fast lookup by candidate and job
CREATE INDEX IF NOT EXISTS idx_applications_candidate_id ON public.applications (candidate_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications (job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications (status);

-- Interview candidates: fast pipeline queries
CREATE INDEX IF NOT EXISTS idx_interview_candidates_job_id ON public.interview_candidates (job_id);
CREATE INDEX IF NOT EXISTS idx_interview_candidates_candidate_id ON public.interview_candidates (candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_candidates_status ON public.interview_candidates (status);

-- Interview events: fast stage lookups
CREATE INDEX IF NOT EXISTS idx_interview_events_candidate_id ON public.interview_events (interview_candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_events_stage_id ON public.interview_events (stage_id);

-- External jobs: active jobs filtering
CREATE INDEX IF NOT EXISTS idx_external_jobs_is_active ON public.external_jobs (is_active);

-- User roles: fast role checking
CREATE INDEX IF NOT EXISTS idx_user_roles_user_role ON public.user_roles (user_id, role);

-- Slot bookings: candidate and date lookups
CREATE INDEX IF NOT EXISTS idx_slot_bookings_candidate_id ON public.slot_bookings (candidate_id);
CREATE INDEX IF NOT EXISTS idx_slot_bookings_date ON public.slot_bookings (booking_date);

-- Mock interview sessions: candidate lookups
CREATE INDEX IF NOT EXISTS idx_mock_sessions_candidate_id ON public.mock_interview_sessions (candidate_id);
CREATE INDEX IF NOT EXISTS idx_mock_sessions_status ON public.mock_interview_sessions (status);