import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, User, Mail, Phone, MapPin, Calendar, ChevronRight, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Applicant {
  id: string;
  candidateId: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  profilePicture?: string;
  appliedDate: string;
  status: string;
  currentStage?: string;
  stageOrder: number;
  totalStages: number;
  aiScore?: number;
}

interface JobApplicantsModalProps {
  jobId: string;
  jobTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewPipeline?: (candidateId: string, jobId: string) => void;
}

const PIPELINE_STAGES = [
  { order: 1, name: "Resume Screening" },
  { order: 2, name: "Technical Assessment" },
  { order: 3, name: "HR Round" },
  { order: 4, name: "Viva" },
  { order: 5, name: "Final Review" },
  { order: 6, name: "Offer Stage" },
];

export const JobApplicantsModal = ({ 
  jobId, 
  jobTitle, 
  open, 
  onOpenChange,
  onViewPipeline 
}: JobApplicantsModalProps) => {
  const { toast } = useToast();
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open && jobId) {
      fetchApplicants();
    }
  }, [open, jobId]);

  const fetchApplicants = async () => {
    setIsLoading(true);
    try {
      // Get candidates from interview_candidates table (those in the pipeline)
      const { data: interviewCandidates, error: icError } = await supabase
        .from("interview_candidates")
        .select(`
          id,
          candidate_id,
          status,
          ai_score,
          applied_at,
          current_stage_id,
          profiles:candidate_id (
            full_name,
            email,
            mobile,
            location,
            profile_picture
          ),
          interview_stages:current_stage_id (
            name,
            stage_order
          )
        `)
        .eq("job_id", jobId);

      if (icError) throw icError;

      // Also get candidates from applications table (who applied but not in pipeline yet)
      const { data: applications, error: appError } = await supabase
        .from("applications")
        .select(`
          id,
          candidate_id,
          status,
          applied_date,
          profiles:candidate_id (
            full_name,
            email,
            mobile,
            location,
            profile_picture
          )
        `)
        .eq("job_id", jobId);

      if (appError) throw appError;

      const formattedApplicants: Applicant[] = [];

      // Add interview candidates
      (interviewCandidates || []).forEach((ic: any) => {
        const profile = ic.profiles;
        const stage = ic.interview_stages;
        
        if (profile) {
          formattedApplicants.push({
            id: ic.id,
            candidateId: ic.candidate_id,
            name: profile.full_name || "Unknown",
            email: profile.email || "",
            phone: profile.mobile,
            location: profile.location,
            profilePicture: profile.profile_picture,
            appliedDate: ic.applied_at ? new Date(ic.applied_at).toLocaleDateString() : "N/A",
            status: ic.status || "in_pipeline",
            currentStage: stage?.name || "Resume Screening",
            stageOrder: stage?.stage_order || 1,
            totalStages: PIPELINE_STAGES.length,
            aiScore: ic.ai_score,
          });
        }
      });

      // Add application candidates (not yet in pipeline)
      (applications || []).forEach((app: any) => {
        const profile = app.profiles;
        
        // Skip if already in interview candidates
        const alreadyInPipeline = formattedApplicants.some(
          a => a.candidateId === app.candidate_id
        );
        
        if (profile && !alreadyInPipeline) {
          formattedApplicants.push({
            id: app.id,
            candidateId: app.candidate_id,
            name: profile.full_name || "Unknown",
            email: profile.email || "",
            phone: profile.mobile,
            location: profile.location,
            profilePicture: profile.profile_picture,
            appliedDate: app.applied_date ? new Date(app.applied_date).toLocaleDateString() : "N/A",
            status: app.status || "applied",
            currentStage: "Application Received",
            stageOrder: 0,
            totalStages: PIPELINE_STAGES.length,
          });
        }
      });

      // Sort by applied date (newest first)
      formattedApplicants.sort((a, b) => 
        new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime()
      );

      setApplicants(formattedApplicants);
    } catch (error: any) {
      console.error("Error fetching applicants:", error);
      toast({
        title: "Error",
        description: "Failed to load applicants",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string, stageOrder: number) => {
    if (status === "hired") {
      return <Badge className="bg-primary/20 text-primary">Hired</Badge>;
    }
    if (status === "rejected") {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    if (stageOrder === 0) {
      return <Badge variant="secondary">New Application</Badge>;
    }
    return <Badge variant="outline">In Progress</Badge>;
  };

  const getProgressValue = (stageOrder: number) => {
    if (stageOrder === 0) return 5;
    return Math.round((stageOrder / PIPELINE_STAGES.length) * 100);
  };

  const handleViewPipeline = (applicant: Applicant) => {
    if (onViewPipeline) {
      onViewPipeline(applicant.candidateId, jobId);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Applicants for {jobTitle}</DialogTitle>
          <DialogDescription>
            {applicants.length} candidate{applicants.length !== 1 ? 's' : ''} have applied for this position
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-2">Loading applicants...</p>
            </div>
          ) : applicants.length === 0 ? (
            <div className="text-center py-12">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No applicants yet for this job</p>
            </div>
          ) : (
            applicants.map((applicant) => (
              <div 
                key={applicant.id} 
                className="border rounded-lg p-4 hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={applicant.profilePicture} alt={applicant.name} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {applicant.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-foreground">{applicant.name}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            {applicant.email}
                          </span>
                          {applicant.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {applicant.phone}
                            </span>
                          )}
                          {applicant.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {applicant.location}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(applicant.status, applicant.stageOrder)}
                        {applicant.aiScore !== undefined && applicant.aiScore !== null && (
                          <Badge variant="outline" className="bg-accent text-accent-foreground">
                            AI: {applicant.aiScore}%
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Progress Section */}
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          Applied: {applicant.appliedDate}
                        </span>
                        <span className="font-medium text-primary">{applicant.currentStage}</span>
                      </div>
                      <Progress value={getProgressValue(applicant.stageOrder)} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Stage {Math.max(1, applicant.stageOrder)} of {applicant.totalStages}</span>
                        <span>{getProgressValue(applicant.stageOrder)}% complete</span>
                      </div>
                    </div>

                    {/* Actions */}
                    {applicant.stageOrder > 0 && onViewPipeline && (
                      <div className="mt-3 pt-3 border-t">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="gap-1"
                          onClick={() => handleViewPipeline(applicant)}
                        >
                          View Interview Pipeline
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
