import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Briefcase, MapPin, Clock, Users, Calendar, Trash2, Loader2, Sparkles, Link2, Copy, Check, ExternalLink, QrCode, Download, Mail, Phone, User } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { JobApplicantsModal } from "./JobApplicantsModal";

interface ApplicantProfile {
  id: string;
  candidateId: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  profilePicture?: string;
  appliedDate: string;
  status: string;
  source: 'pipeline' | 'application';
}

interface Job {
  id: string;
  jobTitle: string;
  department: string;
  experience: string;
  skills: string;
  type: string;
  location: string;
  state?: string;
  city?: string;
  board?: string;
  boardExperience?: string;
  salary?: string;
  organisation?: string;
  status: "Open" | "Under Review" | "Closed";
  description?: string;
  requirements?: string;
}

interface JobDetailsDrawerProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit";
  onJobUpdated?: () => void;
  onJobDeleted?: () => void;
  onViewPipeline?: (candidateId: string, jobId: string) => void;
}

export const JobDetailsDrawer = ({ job, open, onOpenChange, mode, onJobUpdated, onJobDeleted, onViewPipeline }: JobDetailsDrawerProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showApplicantsModal, setShowApplicantsModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  
  // Generate shareable job link
  const getJobApplicationLink = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/job/${job?.id}/apply`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getJobApplicationLink());
      setIsCopied(true);
      toast({
        title: "Link copied!",
        description: "Job application link copied to clipboard",
      });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually",
        variant: "destructive",
      });
    }
  };
  
  // Form state
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [jobType, setJobType] = useState("");
  const [location, setLocation] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [board, setBoard] = useState("");
  const [boardExperience, setBoardExperience] = useState("");
  const [salary, setSalary] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [status, setStatus] = useState<"Open" | "Under Review" | "Closed">("Open");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");

  // Reset form when job changes
  useEffect(() => {
    if (job) {
      setJobTitle(job.jobTitle);
      setDepartment(job.department);
      setExperience(job.experience);
      setSkills(job.skills);
      setJobType(job.type);
      setLocation(job.location);
      setState(job.state || "");
      setCity(job.city || "");
      setBoard(job.board || "");
      setBoardExperience(job.boardExperience || "");
      setSalary(job.salary || "");
      setOrganisation(job.organisation || "");
      setStatus(job.status);
      setDescription(job.description || "");
      setRequirements(job.requirements || "");
    }
  }, [job]);

  if (!job) return null;

  const isEditMode = mode === "edit";

  const handleGenerateAI = async () => {
    if (!jobTitle || !jobType || !location || !experience) {
      toast({
        title: "Missing information",
        description: "Please fill in Job Title, Type, Location, and Experience to generate content.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-job-description", {
        body: {
          jobTitle,
          department,
          jobType,
          location,
          experienceRequired: experience,
          skills,
        },
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      if (!data?.description || !data?.requirements || !data?.skills) {
        throw new Error("Invalid response from AI service");
      }

      setDescription(typeof data.description === 'string' ? data.description : String(data.description));
      setRequirements(typeof data.requirements === 'string' ? data.requirements : String(data.requirements));
      setSkills(typeof data.skills === 'string' ? data.skills : String(data.skills));

      toast({
        title: "Content generated!",
        description: "AI has generated description, requirements, and skills.",
      });
    } catch (error: any) {
      console.error("Error generating content:", error);
      toast({
        title: "Failed to generate content",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dbStatus = status === "Open" ? "active" : status === "Closed" ? "closed" : "under_review";
      
      const skillsArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const { error } = await supabase
        .from('jobs')
        .update({ 
          job_title: jobTitle,
          department: department || null,
          experience_required: experience,
          skills: skillsArray,
          job_type: jobType,
          location: location,
          salary_range: salary || null,
          organisation: organisation || null,
          status: dbStatus,
          description: description || null,
          requirements: requirements || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job updated successfully",
      });

      onJobUpdated?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating job:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update job",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', job.id);

      if (error) throw error;

      toast({
        title: "Job deleted",
        description: "The job posting has been removed",
      });

      onJobDeleted?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error deleting job:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete job",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">
            {isEditMode ? "Edit Job" : "Job Details"}
          </SheetTitle>
          <SheetDescription>
            {isEditMode ? "Update job posting information" : "View complete job posting details"}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Job Title */}
          <div className="space-y-2">
            <Label htmlFor="jobTitle">Job Title</Label>
            {isEditMode ? (
              <Input 
                id="jobTitle" 
                value={jobTitle} 
                onChange={(e) => setJobTitle(e.target.value)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-muted-foreground" />
                <p className="text-lg font-semibold">{job.jobTitle}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              {isEditMode ? (
                <Input 
                  id="department" 
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{job.department}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience">Experience</Label>
              {isEditMode ? (
                <Input 
                  id="experience" 
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                />
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{job.experience}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Employment Type</Label>
              {isEditMode ? (
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                    <SelectItem value="Contract">Contract</SelectItem>
                    <SelectItem value="Internship">Internship</SelectItem>
                    <SelectItem value="Remote">Remote</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{job.type}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              {isEditMode ? (
                <Input 
                  id="location" 
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{job.location}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Additional Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              {isEditMode ? (
                <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
              ) : (
                <p className="text-sm">{job.state || job.location || "—"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City/Town</Label>
              {isEditMode ? (
                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
              ) : (
                <p className="text-sm">{job.city || job.location || "—"}</p>
              )}
            </div>

            {(job.board && job.board !== "—") && (
              <div className="space-y-2">
                <Label htmlFor="board">Board</Label>
                {isEditMode ? (
                  <Input id="board" value={board} onChange={(e) => setBoard(e.target.value)} />
                ) : (
                  <p className="text-sm">{job.board}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="salary">Salary</Label>
              {isEditMode ? (
                <Input id="salary" value={salary} onChange={(e) => setSalary(e.target.value)} />
              ) : (
                <p className="text-sm">{job.salary || "—"}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="organisation">Organisation</Label>
              {isEditMode ? (
                <Input id="organisation" value={organisation} onChange={(e) => setOrganisation(e.target.value)} />
              ) : (
                <p className="text-sm">{job.organisation || "—"}</p>
              )}
            </div>
          </div>

          <Separator />

          {/* AI Generate Button - Edit Mode Only */}
          {isEditMode && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateAI}
                disabled={isGenerating || isSaving}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate with AI
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Job Description</Label>
            {isEditMode ? (
              <Textarea 
                id="description" 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe the role and responsibilities..."
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {job.description || "No description available"}
              </p>
            )}
          </div>

          {/* Requirements */}
          <div className="space-y-2">
            <Label htmlFor="requirements">Requirements</Label>
            {isEditMode ? (
              <Textarea 
                id="requirements" 
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                rows={4}
                placeholder="List the qualifications and requirements..."
              />
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {job.requirements || "No requirements specified"}
              </p>
            )}
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label htmlFor="skills">Required Skills</Label>
            {isEditMode ? (
              <Textarea 
                id="skills" 
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                rows={2}
                placeholder="Comma-separated skills (e.g., React, TypeScript, Node.js)"
              />
            ) : (
              <div className="flex flex-wrap gap-2">
                {job.skills.split(',').map((skill, index) => (
                  <Badge key={index} variant="secondary">
                    {skill.trim()}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            {isEditMode ? (
              <Select value={status} onValueChange={(value) => setStatus(value as "Open" | "Under Review" | "Closed")}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="Under Review">Under Review</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant={
                job.status === "Open" ? "default" : 
                job.status === "Under Review" ? "secondary" : 
                "outline"
              }>
                {job.status}
              </Badge>
            )}
          </div>

          {/* Share Job Link & QR Code (View Only) */}
          {!isEditMode && (
            <div className="space-y-4">
              <div className="space-y-3 bg-primary/5 border border-primary/20 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Share Job Link</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this link with candidates to apply for this position
                </p>
                <div className="flex gap-2">
                  <Input 
                    readOnly 
                    value={getJobApplicationLink()} 
                    className="text-xs bg-background"
                  />
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => window.open(getJobApplicationLink(), '_blank')}
                    className="shrink-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* QR Code Section */}
              <div className="space-y-3 bg-muted/30 border border-border p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold text-sm">Job QR Code</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique QR code for this position — candidates can scan to apply directly
                </p>
                <div className="flex flex-col items-center gap-3 py-3">
                  <div className="bg-white p-4 rounded-lg shadow-sm border" id={`qr-${job.id}`}>
                    <QRCodeSVG value={getJobApplicationLink()} size={160} />
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center max-w-[200px] truncate" title={getJobApplicationLink()}>
                    {getJobApplicationLink()}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      const svg = document.querySelector(`#qr-${job.id} svg`);
                      if (!svg) return;
                      const svgData = new XMLSerializer().serializeToString(svg);
                      const canvas = document.createElement("canvas");
                      canvas.width = 320;
                      canvas.height = 320;
                      const ctx = canvas.getContext("2d");
                      const img = new Image();
                      img.onload = () => {
                        ctx?.drawImage(img, 0, 0, 320, 320);
                        const link = document.createElement("a");
                        link.download = `job-qr-${job.id.slice(0, 8)}.png`;
                        link.href = canvas.toDataURL("image/png");
                        link.click();
                      };
                      img.src = "data:image/svg+xml;base64," + btoa(svgData);
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download QR Code
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Separator />
          {!isEditMode && (
            <JobApplicantsList jobId={job.id} />
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            {isEditMode ? (
              <>
                <Button variant="cta" className="flex-1" onClick={handleSave} disabled={isSaving || isDeleting || isGenerating}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isDeleting || isGenerating}>
                  Cancel
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon" disabled={isSaving || isDeleting || isGenerating}>
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="z-[2000]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Job Posting?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{job.jobTitle}" and all associated applications. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <>
                <Button variant="cta" className="flex-1" onClick={() => setShowApplicantsModal(true)}>
                  View Applicants
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>

      {/* Applicants Modal */}
      {job && (
        <JobApplicantsModal
          jobId={job.id}
          jobTitle={job.jobTitle}
          open={showApplicantsModal}
          onOpenChange={setShowApplicantsModal}
          onViewPipeline={onViewPipeline}
        />
      )}
    </Sheet>
  );
};

// Sub-component to show applicant profiles inline in job view
const JobApplicantsList = ({ jobId }: { jobId: string }) => {
  const [applicants, setApplicants] = useState<ApplicantProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchApplicants = async () => {
      setIsLoading(true);
      try {
        const { data: icData } = await supabase
          .from("interview_candidates")
          .select(`
            id, candidate_id, status, applied_at,
            profiles:candidate_id (full_name, email, mobile, location, profile_picture)
          `)
          .eq("job_id", jobId);

        const { data: appData } = await supabase
          .from("applications")
          .select(`
            id, candidate_id, status, applied_date,
            profiles:candidate_id (full_name, email, mobile, location, profile_picture)
          `)
          .eq("job_id", jobId);

        const results: ApplicantProfile[] = [];
        const seenCandidates = new Set<string>();

        (icData || []).forEach((ic: any) => {
          const p = ic.profiles;
          if (p && !seenCandidates.has(ic.candidate_id)) {
            seenCandidates.add(ic.candidate_id);
            results.push({
              id: ic.id, candidateId: ic.candidate_id,
              name: p.full_name || "Unknown", email: p.email || "",
              phone: p.mobile, location: p.location, profilePicture: p.profile_picture,
              appliedDate: ic.applied_at ? new Date(ic.applied_at).toLocaleDateString() : "N/A",
              status: ic.status || "in_pipeline", source: 'pipeline',
            });
          }
        });

        (appData || []).forEach((app: any) => {
          const p = app.profiles;
          if (p && !seenCandidates.has(app.candidate_id)) {
            seenCandidates.add(app.candidate_id);
            results.push({
              id: app.id, candidateId: app.candidate_id,
              name: p.full_name || "Unknown", email: p.email || "",
              phone: p.mobile, location: p.location, profilePicture: p.profile_picture,
              appliedDate: app.applied_date ? new Date(app.applied_date).toLocaleDateString() : "N/A",
              status: app.status || "applied", source: 'application',
            });
          }
        });

        setApplicants(results);
      } catch (err) {
        console.error("Error fetching applicants:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchApplicants();
  }, [jobId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading applicants...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Applied Candidates ({applicants.length})
        </h4>
      </div>
      {applicants.length === 0 ? (
        <div className="text-center py-6 bg-muted/30 rounded-lg border border-border">
          <User className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No candidates have applied yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
          {applicants.map((applicant) => (
            <div key={applicant.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
              <Avatar className="h-10 w-10 shrink-0">
                <AvatarImage src={applicant.profilePicture} alt={applicant.name} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {applicant.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{applicant.name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {applicant.email && (
                    <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" />{applicant.email}</span>
                  )}
                  {applicant.phone && (
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3 shrink-0" />{applicant.phone}</span>
                  )}
                  {applicant.location && (
                    <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3 shrink-0" />{applicant.location}</span>
                  )}
                </div>
              </div>
              <Badge variant={applicant.source === 'pipeline' ? 'default' : 'secondary'} className="shrink-0 text-[10px]">
                {applicant.source === 'pipeline' ? 'In Pipeline' : 'Applied'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
