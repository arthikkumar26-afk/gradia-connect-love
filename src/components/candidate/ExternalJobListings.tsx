import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin, Clock, Building2, Loader2, IndianRupee, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
}

const ExternalJobListings = () => {
  const [jobs, setJobs] = useState<ExternalJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      const { data } = await supabase
        .from("external_jobs")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (data) setJobs(data as ExternalJob[]);
      setLoading(false);
    };
    fetchJobs();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">External Job Listings</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Browse job openings from external companies. Clicking "Apply" will take you to the company's application page.
        </p>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No external job listings available at the moment.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <Card key={job.id} className="hover:shadow-md transition-shadow h-full flex flex-col">
              <CardContent className="p-4 flex flex-col flex-1 gap-3">
                <div className="flex items-start gap-3">
                  {job.company_logo_url ? (
                    <img src={job.company_logo_url} alt={job.company_name} className="h-10 w-10 rounded-lg object-contain border border-border" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm leading-tight line-clamp-2">{job.job_title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{job.company_name}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">External</Badge>
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {job.location && (
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>
                  )}
                  {job.experience_required && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{job.experience_required}</span>
                  )}
                  {job.salary_range && (
                    <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{job.salary_range}</span>
                  )}
                  {job.job_type && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{job.job_type.replace("-", " ")}</Badge>
                  )}
                </div>

                {job.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{job.description}</p>
                )}

                {job.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {job.skills.slice(0, 4).map(s => (
                      <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">{s}</Badge>
                    ))}
                    {job.skills.length > 4 && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">+{job.skills.length - 4}</Badge>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-2">
                  <Button
                    size="sm"
                    className="w-full gap-2 text-xs"
                    onClick={() => window.open(job.apply_url, "_blank", "noopener,noreferrer")}
                  >
                    Apply on Company Site
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExternalJobListings;
