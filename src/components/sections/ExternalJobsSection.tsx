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
        <div className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-bold text-foreground">
            External Job Opportunities
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {jobs.map((job) => (
            <Card key={job.id} className="group hover:shadow-medium transition-all duration-200 hover:-translate-y-1 h-full flex flex-col border border-border">
              <CardContent className="p-3 flex flex-col flex-1 gap-2">
                <div className="flex items-start justify-between gap-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                      {job.company_logo_url ? (
                        <img src={job.company_logo_url} alt={job.company_name} className="w-5 h-5 rounded object-contain" />
                      ) : (
                        <span className="text-sm">💼</span>
                      )}
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">External</Badge>
                      {job.job_type && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{job.job_type}</Badge>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors line-clamp-2 leading-tight">
                      {job.job_title}
                    </h3>
                    <p className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Building2 className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{job.company_name}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate max-w-[80px]">{job.location}</span>
                    </span>
                  )}
                  {job.experience_required && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {job.experience_required}
                    </span>
                  )}
                </div>

                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 flex-1">
                    {job.skills.slice(0, 3).map((s) => (
                      <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0 h-5">{s}</Badge>
                    ))}
                    {job.skills.length > 3 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">+{job.skills.length - 3}</Badge>
                    )}
                  </div>
                )}

                {(job.hr_name || job.hr_contact) && (
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground border-t pt-1.5 select-none">
                    <span className="font-medium text-foreground">HR Contact</span>
                    <span>-</span>
                    {job.hr_name && (
                      <span className="flex items-center gap-0.5 blur-[4px]">
                        <User className="h-2.5 w-2.5 blur-none" /> {job.hr_name}
                      </span>
                    )}
                    {job.hr_contact && (
                      <span className="flex items-center gap-0.5 blur-[4px]">
                        <Phone className="h-2.5 w-2.5 blur-none" /> {job.hr_contact}
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-auto">
                  <Button size="sm" className="w-full h-7 text-xs gap-1" onClick={handleApply}>
                    Apply Now <ArrowRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button variant="outline" size="lg" className="gap-2" onClick={handleApply}>
            View More Jobs <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ExternalJobsSection;
