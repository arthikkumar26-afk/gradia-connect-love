import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Briefcase, MapPin, Clock, Users, Calendar, Trash2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Job {
  id: string;
  jobTitle: string;
  department: string;
  experience: string;
  skills: string;
  type: string;
  location: string;
  status: "Open" | "Under Review" | "Closed";
}

interface JobDetailsDrawerProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "view" | "edit";
  onJobUpdated?: () => void;
  onJobDeleted?: () => void;
}

export const JobDetailsDrawer = ({ job, open, onOpenChange, mode, onJobUpdated, onJobDeleted }: JobDetailsDrawerProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form state
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [experience, setExperience] = useState("");
  const [skills, setSkills] = useState("");
  const [jobType, setJobType] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<"Open" | "Under Review" | "Closed">("Open");

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
    }
  }, [job]);

  if (!job) return null;

  const isEditMode = mode === "edit";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Map UI status to database status
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

          {/* Skills */}
          <div className="space-y-2">
            <Label htmlFor="skills">Required Skills</Label>
            {isEditMode ? (
              <Textarea 
                id="skills" 
                value={skills}
                onChange={(e) => setSkills(e.target.value)}
                rows={3}
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

          <Separator />

          {/* Additional Details (View Only) */}
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
                <Button variant="cta" className="flex-1" onClick={handleSave} disabled={isSaving || isDeleting}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving || isDeleting}>
                  Cancel
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon" disabled={isSaving || isDeleting}>
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
                <Button variant="cta" className="flex-1">
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
    </Sheet>
  );
};
