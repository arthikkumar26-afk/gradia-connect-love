DROP POLICY IF EXISTS "Team members can view their own profile" ON public.team_members;
CREATE POLICY "Team members can view their own profile"
  ON public.team_members
  FOR SELECT
  TO authenticated
  USING (email = ((auth.jwt() ->> 'email')::text));

DROP POLICY IF EXISTS "Team members can create posts" ON public.team_posts;
CREATE POLICY "Team members can create posts"
  ON public.team_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_members.id = team_posts.team_member_id
      AND team_members.email = ((auth.jwt() ->> 'email')::text)
  ));