import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, MapPin, Clock, Users, DollarSign, Calendar } from "lucide-react";
import { useState } from "react";
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
}

export const JobDetailsDrawer = ({ job, open, onOpenChange, mode }: JobDetailsDrawerProps) => {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState(job?.status || "Open");

  if (!job) return null;

  const isEditMode = mode === "edit";

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Map UI status to database status
      const dbStatus = status === "Open" ? "active" : status === "Closed" ? "closed" : "under_review";
      
      const { error } = await supabase
        .from('jobs')
        .update({ status: dbStatus })
        .eq('id', job.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Job status updated successfully",
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error updating job:", error);
      toast({
        title: "Error",
        description: "Failed to update job status",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
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
              <Input id="jobTitle" defaultValue={job.jobTitle} />
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
                <Input id="department" defaultValue={job.department} />
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
                <Input id="experience" defaultValue={job.experience} />
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
                <Input id="type" defaultValue={job.type} />
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
                <Input id="location" defaultValue={job.location} />
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
                defaultValue={job.skills}
                rows={3}
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
                <Button variant="cta" className="flex-1" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={isSaving}>
                  Cancel
                </Button>
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
