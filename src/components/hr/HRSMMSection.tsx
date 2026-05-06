import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Building2, Briefcase, Share2, ArrowLeft } from "lucide-react";
import FlyerGenerator from "@/components/hr/FlyerGenerator";

interface Employer {
  id: string;
  full_name: string | null;
  email: string | null;
  company_name?: string | null;
}
interface Job {
  id: string;
  job_title: string;
  location: string | null;
  experience_required: string | null;
  salary_range: string | null;
  skills: string | string[] | null;
  status: string | null;
  employer_id: string;
  created_at: string;
}

const HRSMMSection = () => {
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [{ data: emps }, { data: js }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email, company_name").eq("role", "employer").order("created_at", { ascending: false }),
        supabase.from("jobs").select("id, job_title, location, experience_required, salary_range, skills, status, employer_id, created_at").order("created_at", { ascending: false }),
      ]);
      setEmployers(emps || []);
      setJobs((js || []) as Job[]);
      setLoading(false);
    })();
  }, []);

  const employerJobs = useMemo(() => {
    if (!selectedEmployer) return [];
    return jobs.filter(j => j.employer_id === selectedEmployer.id);
  }, [jobs, selectedEmployer]);

  const filteredEmployers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employers;
    return employers.filter(e =>
      [e.full_name, e.email, e.company_name].filter(Boolean).join(" ").toLowerCase().includes(q),
    );
  }, [employers, search]);

  const skillsToString = (s: Job["skills"]) => Array.isArray(s) ? s.join(", ") : (s || "");

  // View 3: flyer for a job
  if (selectedJob && selectedEmployer) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" /> Flyer · {selectedJob.job_title}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{selectedEmployer.company_name || selectedEmployer.full_name} · {selectedJob.location || "—"}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedJob(null)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to vacancies
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <FlyerGenerator
            job_title={selectedJob.job_title}
            company_name={selectedEmployer.company_name || selectedEmployer.full_name || undefined}
            location={selectedJob.location || undefined}
            experience={selectedJob.experience_required || undefined}
            salary={selectedJob.salary_range || undefined}
            skills={skillsToString(selectedJob.skills)}
          />
        </CardContent>
      </Card>
    );
  }

  // View 2: vacancies of an employer
  if (selectedEmployer) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> {selectedEmployer.company_name || selectedEmployer.full_name}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{employerJobs.length} vacancy(ies) — pick one to generate a flyer</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSelectedEmployer(null)}>
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back to employers
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {employerJobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No vacancies posted by this employer.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {employerJobs.map(j => (
                <button
                  key={j.id}
                  onClick={() => setSelectedJob(j)}
                  className="border border-border rounded-md p-3 text-left hover:border-primary/50 hover:bg-muted/40 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{j.job_title}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{j.location || "—"} · {j.experience_required || "—"}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{j.status || "draft"}</Badge>
                  </div>
                  <div className="mt-2 text-[11px] text-primary flex items-center gap-1">
                    <Share2 className="h-3 w-3" /> Generate AI flyer
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // View 1: employers list
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2 shrink-0">
            <Share2 className="h-4 w-4 text-primary" /> SMM · AI Flyers
          </CardTitle>
          <div className="relative flex-1 max-w-md mx-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employers…" className="pl-8 h-9" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Pick an employer → choose one of their vacancies → generate &amp; download an AI hiring flyer for social media.</p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading employers…</p>
        ) : filteredEmployers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No employers found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {filteredEmployers.map(e => {
              const count = jobs.filter(j => j.employer_id === e.id).length;
              return (
                <button
                  key={e.id}
                  onClick={() => setSelectedEmployer(e)}
                  className="border border-border rounded-md p-3 text-left hover:border-primary/50 hover:bg-muted/40 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{e.company_name || e.full_name || "Untitled employer"}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{e.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />{count}
                    </Badge>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HRSMMSection;
