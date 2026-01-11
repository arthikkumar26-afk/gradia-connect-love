import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import JobCard from "@/components/ui/JobCard";
import { getFeaturedJobs, Job } from "@/data/sampleJobs";
import { ArrowRight, Briefcase, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FeaturedJob {
  id: string;
  job_title: string;
  location: string | null;
  job_type: string | null;
  salary_range: string | null;
  experience_required: string | null;
  created_at: string | null;
  skills: string[] | null;
  description: string | null;
  employer_id: string;
  employer?: {
    company_name: string | null;
    full_name: string;
  };
}

const FeaturedJobs = () => {
  const [featuredJobs, setFeaturedJobs] = useState<FeaturedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fallbackJobs = getFeaturedJobs();

  useEffect(() => {
    const fetchFeaturedJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select(`
            id,
            job_title,
            location,
            job_type,
            salary_range,
            experience_required,
            created_at,
            skills,
            description,
            employer_id
          `)
          .eq('is_featured', true)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(6);

        if (error) throw error;

        if (data && data.length > 0) {
          // Fetch employer details
          const employerIds = [...new Set(data.map(job => job.employer_id))];
          const { data: employers } = await supabase
            .from('profiles')
            .select('id, company_name, full_name')
            .in('id', employerIds);

          const employerMap = new Map(employers?.map(e => [e.id, e]) || []);

          const jobsWithEmployers = data.map(job => ({
            ...job,
            employer: employerMap.get(job.employer_id)
          }));

          setFeaturedJobs(jobsWithEmployers);
        }
      } catch (error) {
        console.error('Error fetching featured jobs:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFeaturedJobs();
  }, []);

  // Use database jobs if available, otherwise fallback to sample data
  const showDatabaseJobs = featuredJobs.length > 0;

  // Format posted time
  const getPostedTime = (createdAt: string | null) => {
    if (!createdAt) return 'Recently';
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  // Determine job category based on job type or default to software
  const getCategory = (jobType: string | null): "software" | "education" => {
    if (!jobType) return "software";
    const type = jobType.toLowerCase();
    if (type.includes('teacher') || type.includes('education') || type.includes('principal')) {
      return "education";
    }
    return "software";
  };

  return (
    <section className="relative bg-subtle">
      {/* Extended gradient from hero */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-hero" />
      <div className="relative z-10 container mx-auto px-4 pt-24 pb-16">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Briefcase className="h-6 w-6 text-accent" />
            <span className="text-sm font-medium text-accent uppercase tracking-wide">
              Featured Opportunities
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Trending Jobs This Week
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover hand-picked opportunities from our top partner companies. 
            These roles are actively hiring and perfect for your career growth.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {showDatabaseJobs
              ? featuredJobs.map((job) => (
                  <div key={job.id} className="animate-fade-in">
                    <JobCard
                      id={job.id}
                      title={job.job_title}
                      company={job.employer?.company_name || job.employer?.full_name || 'Company'}
                      location={job.location || 'Location not specified'}
                      type={(job.job_type as any) || 'full-time'}
                      category={getCategory(job.job_type)}
                      salary={job.salary_range || undefined}
                      experience={job.experience_required || 'Not specified'}
                      posted={getPostedTime(job.created_at)}
                      description={job.description || 'No description available'}
                      skills={job.skills || []}
                      featured={true}
                    />
                  </div>
                ))
              : fallbackJobs.map((job) => (
                  <div key={job.id} className="animate-fade-in">
                    <JobCard {...job} />
                  </div>
                ))}
          </div>
        )}

        <div className="text-center">
          <Button variant="cta" size="lg" asChild>
            <Link to="/jobs">
              View All Jobs
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedJobs;