import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Briefcase, MapPin, Clock, Users, Calendar, Trash2, Loader2, Sparkles, Link2, Copy, Check, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { JobApplicantsModal } from "./JobApplicantsModal";
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
    return `${baseUrl}/jobs-results?job=${job?.id}&apply=true`;
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

          {/* Share Job Link (View Only) */}
          {!isEditMode && (
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
          )}

          <Separator />
          {!isEditMode && (
            <>
              <div className="space-y-3 bg-muted/30 p-4 rounded-lg">
                <h4 className="font-semibold text-sm">Additional Information</h4>
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Applications Received</span>
                    <span className="font-medium">24</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Candidates Shortlisted</span>
                    <span className="font-medium">8</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posted On</span>
                    <span className="font-medium">Jan 15, 2025</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Closing Date</span>
                    <span className="font-medium">Feb 28, 2025</span>
                  </div>
                </div>
              </div>
            </>
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
                  <AlertDialogContent>
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
