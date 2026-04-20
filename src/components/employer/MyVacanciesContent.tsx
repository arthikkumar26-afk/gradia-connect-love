import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Users, MapPin, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface VacancyRow {
  id: string;
  job_title: string;
  location: string | null;
  status: string | null;
  job_type: string | null;
  created_at: string | null;
  applicationCount: number;
}

export const MyVacanciesContent = () => {
  const { user } = useAuth();
  const [vacancies, setVacancies] = useState<VacancyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      setLoading(true);
      const { data: jobs, error } = await supabase
        .from("jobs")
        .select("id, job_title, location, status, job_type, created_at")
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false });

      if (error || !jobs) {
        setVacancies([]);
        setLoading(false);
        return;
      }

      const ids = jobs.map((j) => j.id);
      const counts: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: apps } = await supabase
          .from("applications")
          .select("job_id")
          .in("job_id", ids);
        (apps || []).forEach((a: any) => {
          counts[a.job_id] = (counts[a.job_id] || 0) + 1;
        });
      }

      setVacancies(
        jobs.map((j) => ({ ...j, applicationCount: counts[j.id] || 0 }))
      );
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const total = vacancies.reduce((s, v) => s + v.applicationCount, 0);
  const withApps = vacancies.filter((v) => v.applicationCount > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Vacancies</h2>
          <p className="text-sm text-muted-foreground">
            Track CVs/resumes received per vacancy
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{vacancies.length}</p>
              <p className="text-xs text-muted-foreground">Total Vacancies</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <FileText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{total}</p>
              <p className="text-xs text-muted-foreground">Total CVs Received</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{withApps.length}</p>
              <p className="text-xs text-muted-foreground">Vacancies with Applicants</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vacancies & CVs Received</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : vacancies.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No vacancies posted yet.
            </p>
          ) : (
            <div className="space-y-2">
              {vacancies.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Briefcase className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {v.job_title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {v.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {v.location}
                          </span>
                        )}
                        {v.job_type && <span>• {v.job_type}</span>}
                        <Badge
                          variant={v.status === "active" ? "default" : "secondary"}
                          className="ml-1"
                        >
                          {v.status || "unknown"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge
                      variant={v.applicationCount > 0 ? "default" : "outline"}
                      className="text-sm px-3 py-1"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      {v.applicationCount} {v.applicationCount === 1 ? "CV" : "CVs"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
