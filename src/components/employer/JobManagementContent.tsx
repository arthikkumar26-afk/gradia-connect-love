import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, Eye, Pencil, Plus, Loader2, Briefcase, MapPin, Clock, ArrowRight } from "lucide-react";
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
        return "bg-success/10 text-success border-success/20";
      case "Under Review":
        return "bg-warning/10 text-warning border-warning/20";
      case "Closed":
        return "bg-muted text-muted-foreground border-border";
      default:
        return "bg-muted text-muted-foreground border-border";
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
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <Briefcase className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">No vacancies found</h3>
            <p className="text-muted-foreground text-sm mb-4">Create your first vacancy to get started</p>
            <Button variant="cta" asChild>
              <Link to="/employer/post-job">
                <Plus className="h-4 w-4 mr-2" />
                Create Vacancy
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredJobs.map((job) => (
              <Card
                key={job.id}
                className="group relative overflow-hidden border border-border hover:border-accent/40 transition-all duration-300 hover:shadow-lg cursor-pointer"
                onClick={() => handleViewJob(job)}
              >
                <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                  {/* Icon */}
                  <div className="h-14 w-14 rounded-full bg-accent/15 flex items-center justify-center group-hover:bg-accent/25 transition-colors">
                    <Briefcase className="h-7 w-7 text-accent" />
                  </div>

                  {/* Title */}
                  <h3 className="text-lg font-bold text-foreground leading-tight line-clamp-2">
                    {job.jobTitle}
                  </h3>

                  {/* Description / Department */}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {job.description
                      ? job.description.substring(0, 100) + (job.description.length > 100 ? "..." : "")
                      : `${job.department} department`}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Badge variant="outline" className="text-xs font-medium gap-1">
                      <MapPin className="h-3 w-3" />
                      {job.location}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-medium gap-1">
                      <Clock className="h-3 w-3" />
                      {job.type}
                    </Badge>
                    <Badge className={`text-xs font-medium border ${getStatusColor(job.status)}`}>
                      {job.status}
                    </Badge>
                  </div>

                  {/* Continue Button */}
                  <Button
                    variant="cta"
                    className="w-full gap-2 mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewJob(job);
                    }}
                  >
                    View Details
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>

                {/* Edit icon floating */}
                <button
                  className="absolute top-3 right-3 h-8 w-8 rounded-full bg-card border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditJob(job);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </Card>
            ))}
          </div>
        )}

        {/* Count */}
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
