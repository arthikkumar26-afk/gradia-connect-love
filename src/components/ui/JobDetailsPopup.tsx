import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  MapPin, 
  Clock, 
  Building2, 
  DollarSign,
  ArrowRight,
  X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface JobDetailsPopupProps {
  job: {
    id: string;
    title: string;
    company: string;
    location: string;
    type: string;
    category: "software" | "education";
    salary?: string;
    experience: string;
    description: string;
    skills: string[];
    requirements?: string | string[];
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const JobDetailsPopup = ({ job, open, onOpenChange }: JobDetailsPopupProps) => {
  const navigate = useNavigate();
  const { isAuthenticated, profile } = useAuth();
  const { toast } = useToast();

  if (!job) return null;

  const handleApplyNow = () => {
    onOpenChange(false);
    
    // Check if user is authenticated as candidate
    if (isAuthenticated && profile?.role === 'candidate') {
      navigate(`/jobs-results?job=${job.id}&apply=true`);
    } else if (isAuthenticated && profile?.role !== 'candidate') {
      // User is logged in but not as a candidate (e.g., employer)
      toast({
        title: "Candidates Only",
        description: "Only candidates can apply for jobs. Please log in with a candidate account.",
        variant: "destructive",
      });
    } else {
      // Not authenticated - redirect to candidate login with return URL
      navigate(`/candidate/login?redirect=/jobs-results?job=${job.id}&apply=true`);
    }
  };

  const getTypeLabel = (type: string) => {
    return type.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Parse requirements if it's a string or array
  const parseRequirements = (requirements?: string | string[]): string[] => {
    if (!requirements) return [];
    if (Array.isArray(requirements)) return requirements;
    // Split by newlines, commas, or semicolons
    return requirements
      .split(/[\n,;]+/)
      .map(r => r.trim())
      .filter(r => r.length > 0);
  };

  const requirementsList = parseRequirements(job.requirements);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl font-semibold">{job.title}</DialogTitle>
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <Building2 className="h-4 w-4" />
                <span>{job.company}</span>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Key Details */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{job.location}</span>
            </div>
            {job.salary && (
              <div className="flex items-center gap-2 text-accent font-semibold">
                <DollarSign className="h-4 w-4" />
                <span>{job.salary}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{job.experience}</span>
            </div>
            <Badge variant="default" className="text-xs">
              {getTypeLabel(job.type)}
            </Badge>
          </div>

          <Separator />

          {/* Job Description */}
          <div>
            <h4 className="font-semibold mb-2">Job Description</h4>
            <p className="text-sm text-muted-foreground">
              {job.description || "No description provided"}
            </p>
          </div>

          {/* Required Skills */}
          {job.skills && job.skills.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Required Skills</h4>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Requirements */}
          {requirementsList.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Requirements</h4>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                {requirementsList.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApplyNow} className="gap-2">
            Apply Now
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JobDetailsPopup;
