GRANT SELECT ON public.outsource_projects TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outsource_projects TO authenticated;
GRANT ALL ON public.outsource_projects TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_proposals TO authenticated;
GRANT ALL ON public.project_proposals TO service_role;