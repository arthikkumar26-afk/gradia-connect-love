import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, Eye, Pencil, Plus, Loader2, Briefcase, MapPin, Clock, ChevronRight } from "lucide-react";
import { JobDetailsDrawer } from "./JobDetailsDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";

interface Job {
  id: string;
  jobTitle: string;
  department: string;
  experience: string;
  skills: string;
  type: string;
  location: string;
  status: "Open" | "Under Review" | "Closed";
  description?: string;
  requirements?: string;
}

export const JobManagementContent = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit">("view");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [, setSearchParams] = useSearchParams();

  const handleViewPipeline = (candidateId: string, jobId: string) => {
    setSearchParams({ tab: "interview-pipeline", candidateId, jobId });
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedJobs: Job[] = (data || []).map((job) => ({
        id: job.id,
        jobTitle: job.job_title,
        department: job.department || "General",
        experience: job.experience_required || "Not specified",
        skills: job.skills?.join(", ") || "Not specified",
        type: job.job_type || "Full-Time",
        location: job.location || "Remote",
        status: job.status === "active" ? "Open" : job.status === "closed" ? "Closed" : "Under Review",
        description: job.description || "",
        requirements: job.requirements || "",
      }));

      setJobs(formattedJobs);
    } catch (error: any) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Failed to load jobs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewJob = (job: Job) => {
    setSelectedJob(job);
    setDrawerMode("view");
    setDrawerOpen(true);
  };

  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    setDrawerMode("edit");
    setDrawerOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "Under Review":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "Closed":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-primary/20 text-primary border-primary/30";
    }
  };

  const filteredJobs = jobs.filter((job) =>
    job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.skills.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="space-y-6">
        {/* Actions Row */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search job roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
          <Button variant="cta" className="gap-2 w-full sm:w-auto" asChild>
            <Link to="/employer/post-job">
              <Plus className="h-4 w-4" />
              Create Vacancy
            </Link>
          </Button>
        </div>

        {/* Job Cards Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-3">Loading jobs...</p>
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Briefcase className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No Vacancies Found</h3>
              <p className="text-muted-foreground text-sm mb-4">Create your first vacancy to get started</p>
              <Button variant="cta" asChild>
                <Link to="/employer/post-job">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Vacancy
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredJobs.map((job) => (
              <Card
                key={job.id}
                className="group hover:shadow-lg transition-all duration-300 hover:border-primary/30 cursor-pointer overflow-hidden"
                onClick={() => handleViewJob(job)}
              >
                <CardContent className="p-0">
                  {/* Card Header with Icon */}
                  <div className="flex flex-col items-center pt-6 pb-4 px-6">
                    <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Briefcase className="h-7 w-7 text-primary" />
                    </div>
                    <h3 className="text-base font-bold text-center line-clamp-2 mb-1">
                      {job.jobTitle}
                    </h3>
                    <p className="text-xs text-muted-foreground text-center line-clamp-2">
                      {job.department} · {job.experience} experience
                    </p>
                  </div>

                  {/* Tags/Badges */}
                  <div className="flex flex-wrap items-center justify-center gap-2 px-6 pb-4">
                    <Badge variant="outline" className="text-xs font-normal gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-normal gap-1">
                      <Clock className="h-3 w-3" />
                      {job.type}
                    </Badge>
                    <Badge className={`text-xs border ${getStatusColor(job.status)}`}>
                      {job.status}
                    </Badge>
                  </div>

                  {/* Skills preview */}
                  {job.skills && job.skills !== "Not specified" && (
                    <div className="px-6 pb-4">
                      <p className="text-xs text-muted-foreground text-center line-clamp-1">
                        {job.skills}
                      </p>
                    </div>
                  )}

                  {/* Action Footer */}
                  <div className="border-t border-border px-6 py-3 flex items-center justify-between bg-muted/30">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewJob(job);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditJob(job);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1 text-primary hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewJob(job);
                      }}
                    >
                      View Details
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Results count */}
        {!isLoading && filteredJobs.length > 0 && (
          <p className="text-sm text-muted-foreground text-center">
            Showing <span className="font-medium">{filteredJobs.length}</span> of <span className="font-medium">{jobs.length}</span> vacancies
          </p>
        )}
      </div>

      <JobDetailsDrawer
        job={selectedJob}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        onJobUpdated={fetchJobs}
        onJobDeleted={fetchJobs}
        onViewPipeline={handleViewPipeline}
      />
    </>
  );
};
