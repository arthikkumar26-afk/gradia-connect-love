import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Clock, Building2, ArrowRight, Briefcase, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ExternalJob {
  id: string;
  company_name: string;
  job_title: string;
  location: string | null;
  job_type: string | null;
  salary_range: string | null;
  experience_required: string | null;
  description: string | null;
  skills: string[];
  apply_url: string;
  company_logo_url: string | null;
  hr_name: string | null;
  hr_contact: string | null;
}

const ExternalJobsSection = () => {
  const [jobs, setJobs] = useState<ExternalJob[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      const { count } = await supabase
        .from("external_jobs")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      setTotalCount(count || 0);

      const { data } = await supabase
        .from("external_jobs")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (data) setJobs(data as ExternalJob[]);
      setLoading(false);
    };
    fetchJobs();
  }, []);

  if (loading || jobs.length === 0) return null;

  const handleApply = () => {
    navigate("/candidate/login?redirect=" + encodeURIComponent("/candidate/dashboard?tab=externaljobs"));
  };

  return (
    <section className="py-16 bg-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            External Job Opportunities
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore exciting career opportunities from top companies across industries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-medium transition-all duration-200 hover:-translate-y-1 flex flex-col">
              <CardContent className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {job.job_type && (
                        <Badge variant="outline" className="text-[10px] capitalize">{job.job_type}</Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-base text-foreground line-clamp-1">{job.job_title}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{job.company_name}</span>
                    </div>
                  </div>
                  {job.company_logo_url && (
                    <img src={job.company_logo_url} alt={job.company_name} className="w-10 h-10 rounded-md object-contain border" />
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mb-3">
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {job.location}
                    </span>
                  )}
                  {job.experience_required && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {job.experience_required}
                    </span>
                  )}
                  {job.salary_range && (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3 w-3" /> {job.salary_range}
                    </span>
                  )}
                </div>

                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {job.skills.slice(0, 3).map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                    {job.skills.length > 3 && (
                      <Badge variant="secondary" className="text-[10px]">+{job.skills.length - 3}</Badge>
                    )}
                  </div>
                )}

                {(job.hr_name || job.hr_contact) && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mb-3 border-t pt-2 select-none">
                    <span className="font-medium text-foreground">HR Contact</span>
                    <span className="text-muted-foreground">-</span>
                    {job.hr_name && (
                      <span className="flex items-center gap-1 blur-[4px]">
                        <User className="h-3 w-3 blur-none" /> {job.hr_name}
                      </span>
                    )}
                    {job.hr_contact && (
                      <span className="flex items-center gap-1 blur-[4px]">
                        <Phone className="h-3 w-3 blur-none" /> {job.hr_contact}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-2">
                  <Button size="sm" className="w-full gap-1.5" onClick={handleApply}>
                    Apply Now <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {totalCount > 6 && (
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" className="gap-2" onClick={handleApply}>
              View More Jobs ({totalCount - 6}+) <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ExternalJobsSection;
