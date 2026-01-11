-- Add is_featured column to jobs table for admin moderation
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Add moderation_status column for tracking approval
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS moderation_status text DEFAULT 'pending';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_jobs_is_featured ON public.jobs(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_jobs_moderation_status ON public.jobs(moderation_status);

-- Allow admins/owners to update any job's featured status
CREATE POLICY "Admins can update job featured status"
ON public.jobs
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

-- Allow admins/owners to view all jobs for moderation
CREATE POLICY "Admins can view all jobs"
ON public.jobs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));