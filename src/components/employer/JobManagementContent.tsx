import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Eye, Pencil, Plus, Loader2 } from "lucide-react";
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
    // Navigate to Interview Pipeline tab with the selected candidate
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Open":
        return "default";
      case "Under Review":
        return "secondary";
      case "Closed":
        return "outline";
      default:
        return "default";
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

        {/* Table Card */}
        <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-subtle border-b">
                  <TableHead className="font-semibold">Job Title</TableHead>
                  <TableHead className="font-semibold">Department</TableHead>
                  <TableHead className="font-semibold">Experience</TableHead>
                  <TableHead className="font-semibold">Skills</TableHead>
                  <TableHead className="font-semibold">Type</TableHead>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Loading jobs...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <p className="text-muted-foreground">No jobs found</p>
                      <Button variant="link" asChild className="mt-2">
                        <Link to="/employer/post-job">Create your first vacancy</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredJobs.map((job) => (
                    <TableRow 
                      key={job.id}
                      className="hover:bg-accent/5 transition-colors"
                    >
                      <TableCell className="font-medium">{job.jobTitle}</TableCell>
                      <TableCell>{job.department}</TableCell>
                      <TableCell>{job.experience}</TableCell>
                      <TableCell className="max-w-xs truncate">{job.skills}</TableCell>
                      <TableCell>{job.type}</TableCell>
                      <TableCell>{job.location}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(job.status)} className="whitespace-nowrap">
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleViewJob(job)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => handleEditJob(job)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-medium">{filteredJobs.length}</span> of <span className="font-medium">{jobs.length}</span> jobs
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            </div>
          </div>
        </div>
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
