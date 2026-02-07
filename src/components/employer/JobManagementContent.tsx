import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Eye, Pencil, Plus, Loader2, FilePlus2, ArrowRight, ArrowLeft, QrCode, Globe, Send } from "lucide-react";
import { JobDetailsDrawer } from "./JobDetailsDrawer";
import { InlineJobCreationForm } from "./InlineJobCreationForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Job {
  id: string;
  dateTime: string;
  jobTitle: string;
  department: string;
  experience: string;
  skills: string;
  type: string;
  location: string;
  state: string;
  city: string;
  board: string;
  boardExperience: string;
  salary: string;
  organisation: string;
  published: boolean;
  display: string;
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
  const [editingCell, setEditingCell] = useState<{ jobId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState("");
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

      const formattedJobs: Job[] = (data || []).map((job) => {
        // City-to-State mapping for Indian cities
        const cityStateMap: Record<string, string> = {
          "bangalore": "Karnataka", "banglore": "Karnataka", "bengaluru": "Karnataka", "mysore": "Karnataka", "mysuru": "Karnataka", "mangalore": "Karnataka", "hubli": "Karnataka",
          "hyderabad": "Telangana", "warangal": "Telangana", "secunderabad": "Telangana",
          "chennai": "Tamil Nadu", "coimbatore": "Tamil Nadu", "madurai": "Tamil Nadu", "salem": "Tamil Nadu",
          "mumbai": "Maharashtra", "pune": "Maharashtra", "nagpur": "Maharashtra", "nashik": "Maharashtra", "thane": "Maharashtra",
          "delhi": "Delhi", "new delhi": "Delhi", "noida": "Uttar Pradesh", "gurgaon": "Haryana", "gurugram": "Haryana", "faridabad": "Haryana",
          "kolkata": "West Bengal", "howrah": "West Bengal",
          "ahmedabad": "Gujarat", "surat": "Gujarat", "vadodara": "Gujarat", "rajkot": "Gujarat",
          "jaipur": "Rajasthan", "jodhpur": "Rajasthan", "udaipur": "Rajasthan",
          "lucknow": "Uttar Pradesh", "kanpur": "Uttar Pradesh", "varanasi": "Uttar Pradesh", "agra": "Uttar Pradesh",
          "bhopal": "Madhya Pradesh", "indore": "Madhya Pradesh",
          "patna": "Bihar", "ranchi": "Jharkhand",
          "chandigarh": "Chandigarh", "ludhiana": "Punjab", "amritsar": "Punjab",
          "kochi": "Kerala", "thiruvananthapuram": "Kerala", "kozhikode": "Kerala",
          "bhubaneswar": "Odisha", "visakhapatnam": "Andhra Pradesh", "vijayawada": "Andhra Pradesh", "tirupati": "Andhra Pradesh",
          "guwahati": "Assam", "dehradun": "Uttarakhand", "shimla": "Himachal Pradesh",
          "raipur": "Chhattisgarh", "goa": "Goa", "panaji": "Goa",
        };

        const locationParts = (job.location || "").split(",").map(p => p.trim());
        const city = locationParts[0] || "—";
        const cityLower = city.toLowerCase();
        const state = locationParts.length > 1 ? locationParts[1] : (cityStateMap[cityLower] || "—");
        
        // Determine display channels
        const displayChannels: string[] = [];
        if (job.status === "active") displayChannels.push("Website");
        if (job.is_featured) displayChannels.push("Featured");
        if (displayChannels.length === 0) displayChannels.push("Draft");

        return {
          id: job.id,
          dateTime: job.created_at ? new Date(job.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' ' + new Date(job.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : "—",
          jobTitle: job.job_title,
          department: job.department || "General",
          experience: job.experience_required || "Not specified",
          skills: job.skills?.join(", ") || "Not specified",
          type: job.job_type || "Full-Time",
          location: job.location || "Remote",
          state,
          city,
          board: job.department || "Not specified",
          boardExperience: job.experience_required || "—",
          salary: job.salary_range || "—",
          organisation: job.location || "—",
          published: job.status === "active",
          display: displayChannels.join(", "),
          status: job.status === "active" ? "Open" : job.status === "closed" ? "Closed" : "Under Review",
          description: job.description || "",
          requirements: job.requirements || "",
        };
      });

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

  // Map UI field names to database column names
  const fieldToDbColumn: Record<string, string> = {
    jobTitle: "job_title",
    department: "department",
    experience: "experience_required",
    skills: "skills",
    type: "job_type",
    location: "location",
    salary: "salary_range",
    boardExperience: "experience_required",
    organisation: "location",
    board: "department",
    state: "_state",
    city: "_city",
  };

  // Fields that share the same DB column
  const linkedFields: Record<string, string[]> = {
    department: ["department", "board"],
    experience_required: ["experience", "boardExperience"],
    location: ["location", "organisation"],
  };

  const startEditing = (jobId: string, field: string, currentValue: string) => {
    setEditingCell({ jobId, field });
    setEditValue(currentValue === "—" ? "" : currentValue);
  };

  const saveInlineEdit = async () => {
    if (!editingCell) return;
    const { jobId, field } = editingCell;

    const dbColumn = fieldToDbColumn[field];
    if (!dbColumn || dbColumn.startsWith("_")) {
      // Non-directly-editable field (state/city are derived)
      cancelEditing();
      return;
    }

    try {
      const updateValue = field === "skills"
        ? editValue.split(",").map(s => s.trim()).filter(s => s.length > 0)
        : (editValue || null);

      const { error } = await supabase
        .from("jobs")
        .update({ [dbColumn]: updateValue })
        .eq("id", jobId);

      if (error) throw error;

      // Update local state, including linked fields
      const linked = linkedFields[dbColumn] || [field];
      setJobs(prev => prev.map(j => {
        if (j.id !== jobId) return j;
        const updated = { ...j };
        linked.forEach(f => {
          (updated as any)[f] = editValue || "—";
        });
        return updated;
      }));

      toast({ title: "Updated successfully" });
    } catch (error: any) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } finally {
      setEditingCell(null);
      setEditValue("");
    }
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue("");
  };

  const renderEditableCell = (job: Job, field: keyof Job, width: string = "w-24") => {
    const value = String(job[field] || "—");
    if (editingCell?.jobId === job.id && editingCell?.field === field) {
      return (
        <Input
          autoFocus
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveInlineEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveInlineEdit();
            if (e.key === "Escape") cancelEditing();
          }}
          className={`h-7 text-xs ${width}`}
        />
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1 cursor-pointer hover:bg-muted/60 px-1.5 py-0.5 rounded transition-colors group"
        onClick={() => startEditing(job.id, field, value)}
        title="Click to edit"
      >
        <span className="truncate max-w-[120px]">{value}</span>
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </span>
    );
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
          </div>

          {/* Jobs Table */}
          <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <Table className="w-full min-w-[1100px] text-xs">
                <TableHeader>
                  <TableRow className="bg-secondary hover:bg-secondary border-b [&_th]:py-3 [&_th]:px-3 [&_th]:h-11 [&_th]:text-secondary-foreground [&_th]:text-xs [&_th]:uppercase [&_th]:tracking-wide">
                    <TableHead className="font-semibold">Date & Time</TableHead>
                    <TableHead className="font-semibold">Job ID</TableHead>
                    <TableHead className="font-semibold">Designation</TableHead>
                    <TableHead className="font-semibold">Department</TableHead>
                    <TableHead className="font-semibold">Exp.</TableHead>
                    <TableHead className="font-semibold">Skills</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Location</TableHead>
                    <TableHead className="font-semibold">State</TableHead>
                    <TableHead className="font-semibold">City/Town</TableHead>
                    <TableHead className="font-semibold">Board</TableHead>
                    <TableHead className="font-semibold">Board Exp.</TableHead>
                    <TableHead className="font-semibold">Salary</TableHead>
                    <TableHead className="font-semibold">Organisation</TableHead>
                    <TableHead className="font-semibold text-center">QR Code</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={17} className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Loading positions...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredJobs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={17} className="text-center py-8">
                        <p className="text-muted-foreground">No positions found</p>
                        <Button variant="link" asChild className="mt-2">
                          <Link to="/employer/post-job">Create your first position</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredJobs.map((job) => {
                      const jobUrl = `${window.location.origin}/jobs-results?job=${job.id}&apply=true`;
                      return (
                        <TableRow 
                          key={job.id}
                          className="hover:bg-accent/5 transition-colors [&_td]:px-3 [&_td]:py-2.5 cursor-pointer"
                          onClick={() => handleViewJob(job)}
                        >
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{job.dateTime}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{job.id.slice(0, 8)}</code>
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {renderEditableCell(job, "jobTitle", "w-32")}
                          </TableCell>
                          <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {renderEditableCell(job, "department", "w-24")}
                          </TableCell>
                          <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {renderEditableCell(job, "experience", "w-24")}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {renderEditableCell(job, "skills", "w-32")}
                          </TableCell>
                          <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {renderEditableCell(job, "type", "w-24")}
                          </TableCell>
                          <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {renderEditableCell(job, "location", "w-28")}
                          </TableCell>
                          <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {renderEditableCell(job, "state", "w-24")}
                          </TableCell>
                          <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {renderEditableCell(job, "city", "w-24")}
                          </TableCell>
                          <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {renderEditableCell(job, "board", "w-24")}
                          </TableCell>
                          <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {renderEditableCell(job, "boardExperience", "w-24")}
                          </TableCell>
                          <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {renderEditableCell(job, "salary", "w-24")}
                          </TableCell>
                          <TableCell className="whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            {renderEditableCell(job, "organisation", "w-28")}
                          </TableCell>
                          {/* QR Code */}
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <QrCode className="h-4 w-4" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-4" align="center">
                                <div className="flex flex-col items-center gap-2">
                                  <p className="text-xs font-medium text-muted-foreground">Scan to apply</p>
                                  <QRCodeSVG value={jobUrl} size={120} />
                                  <p className="text-[10px] text-muted-foreground max-w-[130px] truncate" title={jobUrl}>{jobUrl}</p>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(job.status)} className="whitespace-nowrap">
                              {job.status}
                            </Badge>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => { e.stopPropagation(); handleViewJob(job); }}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={(e) => { e.stopPropagation(); handleEditJob(job); }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
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

          {/* Create Position Card - always visible */}
          <div className="bg-card rounded-xl border border-border shadow-soft overflow-hidden">
            <div className="flex flex-col items-center justify-center py-7 px-5 text-center">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-4">
                <Plus className="h-7 w-7 text-primary-foreground" />
              </div>

              <h2 className="text-xl font-bold text-foreground mb-1.5">
                Create Position
              </h2>

              <p className="text-muted-foreground text-sm max-w-md mb-4">
                Post a new education position with interview pipeline, requirements, and start receiving applications instantly
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2 mb-5">
                <Badge variant="outline" className="rounded-full px-3.5 py-0.5 text-xs font-medium border-primary/30 text-primary">
                  Job Posting
                </Badge>
                <Badge variant="outline" className="rounded-full px-3.5 py-0.5 text-xs font-medium border-primary/30 text-primary">
                  Pipeline Setup
                </Badge>
                <Badge variant="outline" className="rounded-full px-3.5 py-0.5 text-xs font-medium border-primary/30 text-primary">
                  AI Screening
                </Badge>
              </div>

              <Button
                variant="cta"
                size="lg"
                className="rounded-full px-9 gap-2 text-sm"
                onClick={() => setShowCreateForm(!showCreateForm)}
              >
                {showCreateForm ? "Close" : "Continue"}
                <ArrowRight className={`h-4 w-4 transition-transform ${showCreateForm ? "rotate-90" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Inline Form - appears below the card */}
          {showCreateForm && (
            <InlineJobCreationForm
              onJobCreated={() => {
                setShowCreateForm(false);
                fetchJobs();
              }}
              onCancel={() => setShowCreateForm(false)}
            />
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
