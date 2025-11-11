-- Create team_members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  position TEXT,
  department TEXT,
  work_status TEXT DEFAULT 'active' CHECK (work_status IN ('active', 'on_leave', 'busy', 'offline')),
  profile_picture TEXT,
  joined_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(employer_id, email)
);

-- Create team_posts table for tracking uploads and activities
CREATE TABLE public.team_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  employer_id UUID NOT NULL,
  post_type TEXT NOT NULL CHECK (post_type IN ('upload', 'status', 'announcement', 'task')),
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_posts ENABLE ROW LEVEL SECURITY;

-- RLS policies for team_members
CREATE POLICY "Employers can manage their team members"
  ON public.team_members
  FOR ALL
  USING (auth.uid() = employer_id);

CREATE POLICY "Team members can view their own profile"
  ON public.team_members
  FOR SELECT
  USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- RLS policies for team_posts
CREATE POLICY "Employers can manage posts for their team"
  ON public.team_posts
  FOR ALL
  USING (auth.uid() = employer_id);

CREATE POLICY "Team members can create posts"
  ON public.team_posts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_members 
      WHERE id = team_posts.team_member_id 
      AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_team_members_employer ON public.team_members(employer_id);
CREATE INDEX idx_team_posts_member ON public.team_posts(team_member_id);
CREATE INDEX idx_team_posts_employer ON public.team_posts(employer_id);

-- Trigger for updated_at
CREATE TRIGGER update_team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_team_posts_updated_at
  BEFORE UPDATE ON public.team_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();