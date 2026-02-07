import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Eye, Pencil, Plus, Loader2, FilePlus2, ArrowRight, ArrowLeft } from "lucide-react";
import { JobDetailsDrawer } from "./JobDetailsDrawer";
import { InlineJobCreationForm } from "./InlineJobCreationForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Job {
  id: string;
  dateTime: string;
  jobTitle: string;
  department: string;
  experience: string;
  skills: string;
  type: string;
  location: string;
  salaryRange: string;
  board: string;
  boardExperience: string;
  salary: string;
  organisation: string;
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
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
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
        dateTime: job.created_at ? new Date(job.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date(job.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : "—",
        jobTitle: job.job_title,
        department: job.department || "General",
        experience: job.experience_required || "Not specified",
        skills: job.skills?.join(", ") || "Not specified",
        type: job.job_type || "Full-Time",
        location: job.location || "Remote",
        salaryRange: job.salary_range || "Not specified",
        board: job.department || "Not specified",
        boardExperience: job.experience_required || "—",
        salary: job.salary_range || "—",
        organisation: job.location || "—",
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
      case "Open": return "default";
      case "Under Review": return "secondary";
      case "Closed": return "outline";
      default: return "default";
    }
  };

  const filteredJobs = jobs.filter((job) =>
    job.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.skills.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Templates full page view
  if (showTemplates) {
    return (
      <>
        <div className="space-y-6">
          {/* Back button */}
          <Button
            variant="ghost"
            className="gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowTemplates(false)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Positions
          </Button>

          {/* Header row with search, filter, and Create Vacancy */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by designation, department, skills, or Job ID..."
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
                Create Position
              </Link>
            </Button>
          </div>

          {/* Jobs Table */}
          <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <Table className="w-full min-w-[1600px]">
                <TableHeader>
                  <TableRow className="bg-secondary hover:bg-secondary border-b [&_th]:py-4 [&_th]:h-14 [&_th]:text-secondary-foreground">
                    <TableHead className="font-semibold w-[130px]">Date & Time</TableHead>
                    <TableHead className="font-semibold w-[90px]">Job ID</TableHead>
                    <TableHead className="font-semibold w-[130px]">Designation</TableHead>
                    <TableHead className="font-semibold w-[100px]">Department</TableHead>
                    <TableHead className="font-semibold w-[70px]">Exp.</TableHead>
                    <TableHead className="font-semibold w-[150px]">Skills</TableHead>
                    <TableHead className="font-semibold w-[80px]">Type</TableHead>
                    <TableHead className="font-semibold w-[100px]">Location</TableHead>
                    <TableHead className="font-semibold w-[110px]">Salary Range</TableHead>
                    <TableHead className="font-semibold w-[90px]">Board</TableHead>
                    <TableHead className="font-semibold w-[100px]">Board Exp.</TableHead>
                    <TableHead className="font-semibold w-[90px]">Salary</TableHead>
                    <TableHead className="font-semibold w-[110px]">Organisation</TableHead>
                    <TableHead className="font-semibold w-[80px]">Status</TableHead>
                    <TableHead className="font-semibold text-center w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Loading positions...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={15} className="text-center py-8">
                        <p className="text-muted-foreground">No positions found</p>
                        <Button variant="link" asChild className="mt-2">
                          <Link to="/employer/post-job">Create your first position</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredJobs.map((job) => (
                      <TableRow 
                        key={job.id}
                        className="hover:bg-accent/5 transition-colors"
                      >
                        <TableCell>
                          <span className="block truncate max-w-[130px] text-xs text-muted-foreground" title={job.dateTime}>{job.dateTime}</span>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {job.id.slice(0, 8)}
                          </code>
                        </TableCell>
                        <TableCell className="font-medium">
                          <span className="block truncate max-w-[130px]" title={job.jobTitle}>{job.jobTitle}</span>
                        </TableCell>
                        <TableCell>
                          <span className="block truncate max-w-[100px]" title={job.department}>{job.department}</span>
                        </TableCell>
                        <TableCell>{job.experience}</TableCell>
                        <TableCell>
                          <span className="block truncate max-w-[150px]" title={job.skills}>{job.skills}</span>
                        </TableCell>
                        <TableCell>
                          <span className="block truncate max-w-[80px]" title={job.type}>{job.type}</span>
                        </TableCell>
                        <TableCell>
                          <span className="block truncate max-w-[100px]" title={job.location}>{job.location}</span>
                        </TableCell>
                        <TableCell>
                          <span className="block truncate max-w-[110px]" title={job.salaryRange}>{job.salaryRange}</span>
                        </TableCell>
                        <TableCell>
                          <span className="block truncate max-w-[90px]" title={job.board}>{job.board}</span>
                        </TableCell>
                        <TableCell>
                          <span className="block truncate max-w-[100px]" title={job.boardExperience}>{job.boardExperience}</span>
                        </TableCell>
                        <TableCell>
                          <span className="block truncate max-w-[90px]" title={job.salary}>{job.salary}</span>
                        </TableCell>
                        <TableCell>
                          <span className="block truncate max-w-[110px]" title={job.organisation}>{job.organisation}</span>
                        </TableCell>
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
                Showing <span className="font-medium">{filteredJobs.length}</span> of <span className="font-medium">{jobs.length}</span> positions
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

          {/* Create Vacancy Card or Inline Form */}
          {showCreateForm ? (
            <InlineJobCreationForm
              onJobCreated={() => {
                setShowCreateForm(false);
                fetchJobs();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
          ) : (
            <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
              <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-5">
                  <Plus className="h-10 w-10 text-primary-foreground" />
                </div>

                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Create Position
                </h2>

                <p className="text-muted-foreground text-sm max-w-md mb-5">
                  Post a new education position with interview pipeline, requirements, and start receiving applications instantly
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
                  <Badge variant="outline" className="rounded-full px-4 py-1 text-xs font-medium border-primary/30 text-primary">
                    Job Posting
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-4 py-1 text-xs font-medium border-primary/30 text-primary">
                    Pipeline Setup
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-4 py-1 text-xs font-medium border-primary/30 text-primary">
                    AI Screening
                  </Badge>
                </div>

                <Button
                  variant="cta"
                  size="lg"
                  className="rounded-full px-10 gap-2 text-base"
                  onClick={() => setShowCreateForm(true)}
                >
                  Continue
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
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
  }

  // Default hero card view
  return (
    <div className="space-y-6">
      <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
        <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mb-5">
            <FilePlus2 className="h-10 w-10 text-primary-foreground" />
          </div>

          <h2 className="text-2xl font-bold text-foreground mb-2">
            Education Positions
          </h2>

          <p className="text-muted-foreground text-sm max-w-md mb-5">
            Manage all your education sector positions, track applications, and create new openings for quick and consistent hiring
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <Badge variant="outline" className="rounded-full px-4 py-1 text-xs font-medium border-primary/30 text-primary">
              Active Positions
            </Badge>
            <Badge variant="outline" className="rounded-full px-4 py-1 text-xs font-medium border-primary/30 text-primary">
              Quick Posting
            </Badge>
            <Badge variant="outline" className="rounded-full px-4 py-1 text-xs font-medium border-primary/30 text-primary">
              Pipeline Tracking
            </Badge>
          </div>

          <Button
            variant="cta"
            size="lg"
            className="rounded-full px-10 gap-2 text-base"
            onClick={() => setShowTemplates(true)}
          >
            Templates
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
