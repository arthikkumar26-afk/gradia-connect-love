CREATE OR REPLACE FUNCTION public.search_public_jobs(p_query text DEFAULT NULL, p_location text DEFAULT NULL, p_limit int DEFAULT 50)
RETURNS TABLE(id uuid, job_title text, location text, job_type text, salary_range text, experience_required text, created_at timestamptz, skills text[], description text, requirements text, company_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT j.id, j.job_title, j.location, j.job_type, j.salary_range, j.experience_required, j.created_at,
         j.skills, j.description, j.requirements::text,
         COALESCE(NULLIF(p.company_name,''), p.full_name, 'Company')
  FROM jobs j LEFT JOIN profiles p ON p.id = j.employer_id
  WHERE j.status = 'active'
    AND COALESCE(j.moderation_status,'pending') <> 'rejected'
    AND (COALESCE(p_query,'') = '' OR
         j.job_title ILIKE '%'||p_query||'%' OR j.description ILIKE '%'||p_query||'%'
         OR j.requirements::text ILIKE '%'||p_query||'%'
         OR p.company_name ILIKE '%'||p_query||'%' OR p.full_name ILIKE '%'||p_query||'%'
         OR EXISTS (SELECT 1 FROM unnest(j.skills) s WHERE s ILIKE '%'||p_query||'%'))
    AND (COALESCE(p_location,'') = '' OR j.location ILIKE '%'||p_location||'%')
  ORDER BY j.created_at DESC
  LIMIT LEAST(COALESCE(p_limit,50),100);
$$;
GRANT EXECUTE ON FUNCTION public.search_public_jobs(text,text,int) TO anon, authenticated;