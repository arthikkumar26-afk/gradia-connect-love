import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { MapPin, Clock, ArrowRight, Briefcase, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEmployersTransferredToCandidate } from "@/hooks/useHRTransfers";

interface MatchedJob {
  id: string;
  job_title: string;
  department: string | null;
  description: string | null;
  location: string | null;
  job_type: string | null;
  salary_range: string | null;
  experience_required: string | null;
  skills: string[] | null;
  employer_id: string;
  company_name?: string | null;
}

const Careers = () => {
  const { user, profile } = useAuth();
  const isCandidate = profile?.role === 'candidate';
  const { employerMap: employerMap_t, jobMap } = useEmployersTransferredToCandidate(
    isCandidate ? user?.id : undefined
  );
  const [jobs, setJobs] = useState<MatchedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfileAndJobs = async () => {
      setIsLoading(true);
      try {
        // Get user profile for matching
        let preferredRole = '';
        let preferredLocation = '';
        let skills: string[] = [];
        let interviewType = '';

        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('preferred_role, location, current_state, current_district, segment, category, primary_subject')
            .eq('id', user.id)
            .single();

          if (profile) {
            preferredRole = profile.preferred_role || '';
            preferredLocation = profile.current_state || profile.location || '';
            interviewType = profile.segment || '';
          }
        }

        // Fetch approved jobs
        let query = supabase
          .from('jobs')
          .select('id, job_title, department, description, location, job_type, salary_range, experience_required, skills, employer_id, interview_type')
          .or('status.eq.active,moderation_status.eq.approved')
          .order('created_at', { ascending: false });

        const { data: allJobs, error } = await query.limit(500);

        if (error) throw error;

        if (!allJobs || allJobs.length === 0) {
          setJobs([]);
          return;
        }

        // Score and filter jobs based on profile
        let scoredJobs = allJobs.map(job => {
          let score = 0;

          // Match by preferred role / job title
          if (preferredRole && job.job_title) {
            const roleWords = preferredRole.toLowerCase().split(/\s+/);
            const titleWords = job.job_title.toLowerCase();
            roleWords.forEach(w => {
              if (w.length > 2 && titleWords.includes(w)) score += 10;
            });
          }

          // Match by location
          if (preferredLocation && job.location) {
            if (job.location.toLowerCase().includes(preferredLocation.toLowerCase())) {
              score += 5;
            }
          }

          // Match by interview type / segment
          if (interviewType && job.interview_type) {
            if (job.interview_type.toLowerCase() === interviewType.toLowerCase()) {
              score += 8;
            }
          }

          return { ...job, score };
        });

        // Sort by relevance score
        scoredJobs.sort((a, b) => b.score - a.score);

        // Only show jobs with some relevance if user is logged in, otherwise show all
        const filtered = user
          ? scoredJobs.filter(j => j.score > 0)
          : scoredJobs;

        const topJobs = (filtered.length > 0 ? filtered : scoredJobs).slice(0, 10);

        // Fetch employer names
        const employerIds = [...new Set(topJobs.map(j => j.employer_id))];
        const { data: employers } = await supabase
          .from('profiles')
          .select('id, company_name, full_name')
          .in('id', employerIds);

        const employerMap = new Map(employers?.map(e => [e.id, e.company_name || e.full_name]) || []);

        const mapped = topJobs.map(j => ({
          ...j,
          company_name: employerMap.get(j.employer_id) || 'Company',
        }));
        // Candidates only see HR-transferred employers/jobs
        const visible = isCandidate
          ? mapped.filter(j => employerMap_t[j.employer_id] || jobMap[j.id])
          : mapped;
        setJobs(visible);
      } catch (err) {
        console.error('Error fetching careers:', err);
        setJobs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileAndJobs();
  }, [user]);

  return (
    <>
      <Helmet>
        <title>Open Positions - Gradia Careers</title>
        <meta name="description" content="Explore open positions at Gradia and join our mission to transform hiring. Find roles matched to your skills and experience." />
        <link rel="canonical" href="https://gradiaa.com/careers" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Open Positions - Gradia Careers" />
        <meta property="og:description" content="Explore open positions at Gradia and join our mission to transform hiring. Find roles matched to your skills and experience." />
        <meta property="og:url" content="https://gradia.world/careers" />
        <meta property="og:image" content="https://gradia.world/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Open Positions - Gradia Careers" />
        <meta name="twitter:description" content="Explore open positions at Gradia and join our mission to transform hiring. Find roles matched to your skills and experience." />
        <meta name="twitter:image" content="https://gradia.world/og-image.png" />
      </Helmet>
      <div className="min-h-screen">
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            {user ? 'Positions For You' : 'Join Our Team'}
          </h1>
          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
            {user
              ? 'Job openings matched to your profile and preferences.'
              : 'Help us transform how talent connects with opportunity. Build your career while building the future of hiring.'}
          </p>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Open Positions</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-16 max-w-md mx-auto">
              <Briefcase className="h-16 w-16 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No Vacancies</h3>
              <p className="text-muted-foreground mb-6">
                There are no open positions matching your profile at the moment. Check back soon!
              </p>
              <Button variant="outline" asChild>
                <Link to="/jobs">Browse All Jobs</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-6 max-w-4xl mx-auto">
              {jobs.map((job) => (
                <Card key={job.id} className="hover:shadow-medium transition-all duration-200">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl mb-1">{job.job_title}</CardTitle>
                        <p className="text-sm text-accent font-medium mb-1">{job.company_name}</p>
                        <CardDescription className="line-clamp-2">{job.description || 'No description available'}</CardDescription>
                      </div>
                      {job.department && <Badge variant="secondary">{job.department}</Badge>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {job.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </div>
                        )}
                        {job.job_type && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {job.job_type}
                          </div>
                        )}
                        {job.salary_range && (
                          <Badge variant="outline">{job.salary_range}</Badge>
                        )}
                      </div>
                      <Button variant="outline" asChild>
                        <Link to={`/jobs?search=${encodeURIComponent(job.job_title)}`}>
                          Apply Now
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
    </>
  );
};

export default Careers;
