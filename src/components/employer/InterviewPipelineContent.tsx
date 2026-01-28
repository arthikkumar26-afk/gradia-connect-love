import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Phone,
  Code, 
  UserCheck,
  FileCheck,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Calendar,
  Mail,
  GripVertical,
  Check,
  Clock,
  FileText,
  Star,
  MapPin,
  Briefcase,
  GraduationCap,
  MessageSquare,
  Video,
  XCircle,
  CheckCircle2,
  Sparkles,
  Zap,
  Loader2,
  RefreshCw,
  Database,
  X,
  Trash2,
  Play,
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AIActionPanel } from "./AIActionPanel";
import { InterviewRecordingPlayer } from "./InterviewRecordingPlayer";
import { StageRecordingPlayer } from "./StageRecordingPlayer";
import { StageResultsModal } from "./StageResultsModal";
import { ManualInterviewScheduleModal } from "./ManualInterviewScheduleModal";
import { AIInterviewSession } from "@/components/interview/AIInterviewSession";
import { useInterviewPipeline, PipelineCandidate, PipelineStage, InterviewStep } from "@/hooks/useInterviewPipeline";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Stage icon mapping
const stageIcons: Record<string, React.ElementType> = {
  'Resume Screening': Users,
  'Technical Assessment': Code,
  'HR Round': UserCheck,
  'Viva': Video,
  'Final Review': FileCheck,
  'Offer Stage': FileText,
};

const stageColors: Record<string, string> = {
  'Resume Screening': 'bg-blue-500',
  'Technical Assessment': 'bg-orange-500',
  'HR Round': 'bg-green-500',
  'Viva': 'bg-yellow-500',
  'Final Review': 'bg-cyan-500',
  'Offer Stage': 'bg-emerald-500',
};

type Candidate = PipelineCandidate;

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

const getStageIcon = (title: string): React.ElementType => {
  return stageIcons[title] || Users;
};

const getStageColor = (title: string): string => {
  return stageColors[title] || 'bg-gray-500';
};

// Format relative date dynamically at render time
const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return '1 week ago';
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Stage Action Buttons Component
const StageActionButtons = ({
  step,
  isFirstPending,
  candidateName,
  candidateEmail,
  jobTitle,
  interviewCandidateId,
  onUpdateStep,
  onScheduleHRRound
}: {
  step: InterviewStep;
  isFirstPending: boolean;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  interviewCandidateId: string;
  onUpdateStep: (stepId: string, status: InterviewStep["status"]) => void;
  onScheduleHRRound?: (step: InterviewStep) => void;
}) => {
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isMovingNext, setIsMovingNext] = useState(false);
  
  // Check if this is HR Round (manual meeting link only)
  const isHRRound = step.title === 'HR Round';

  const handleResendInvitation = async () => {
    setIsSendingInvite(true);
    try {
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: candidateEmail,
          candidateName,
          jobTitle,
          stageName: step.title,
          type: 'stage_invitation',
          interviewCandidateId,
          stageId: step.id,
        },
      });

      if (error) throw error;
      toast.success(`Invitation resent for ${step.title}`);
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to resend invitation');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleMoveToNextStep = async () => {
    setIsMovingNext(true);
    try {
      // Call the edge function to properly advance the candidate in the database
      const { data, error } = await supabase.functions.invoke('process-interview-stage', {
        body: {
          interviewCandidateId,
          action: 'advance',
          feedback: `Manually advanced from ${step.title}`
        }
      });

      if (error) throw error;
      
      // Update local UI state
      onUpdateStep(step.id, "completed");
      
      // Show clear success message with current stage cleared and next stage info
      const clearedMessage = `✓ ${step.title} cleared!`;
      const nextStageMessage = data?.currentStage ? ` Moved to ${data.currentStage}` : '';
      toast.success(clearedMessage + nextStageMessage, {
        description: data?.action === 'hired' ? 'Candidate is ready for hire!' : undefined,
        duration: 4000,
      });
    } catch (error) {
      console.error('Error moving to next step:', error);
      toast.error('Failed to move to next stage');
    } finally {
      setIsMovingNext(false);
    }
  };

  // Completed stage - show resend mail button only
  if (step.status === "completed") {
    return (
      <div className="flex gap-1 mt-2">
        <Button 
          size="sm" 
          variant="ghost"
          onClick={handleResendInvitation}
          disabled={isSendingInvite}
          className="h-6 text-[10px] px-2"
        >
          {isSendingInvite ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <Mail className="h-3 w-3 mr-1" />
          )}
          Resend
        </Button>
      </div>
    );
  }

  // Current or In Progress stage - show action buttons based on stage type
  if (step.status === "current" || step.status === "in_progress" || step.isLive) {
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {/* HR Round - Manual meeting link scheduling */}
        {isHRRound ? (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onScheduleHRRound?.(step)}
            className="h-6 text-[10px] px-2 border-green-500 text-green-600 hover:bg-green-50"
          >
            <Calendar className="h-3 w-3 mr-1" />
            Schedule Meeting
          </Button>
        ) : (
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleResendInvitation}
            disabled={isSendingInvite}
            className="h-6 text-[10px] px-2"
          >
            {isSendingInvite ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Mail className="h-3 w-3 mr-1" />
            )}
            Resend
          </Button>
        )}
        <Button 
          size="sm" 
          variant="outline"
          onClick={() => onUpdateStep(step.id, "failed")}
          className="text-destructive hover:text-destructive h-6 text-[10px] px-2"
        >
          <XCircle className="h-3 w-3 mr-1" />
          Fail
        </Button>
        <Button 
          size="sm"
          onClick={handleMoveToNextStep}
          disabled={isMovingNext}
          className="h-6 text-[10px] px-2"
        >
          {isMovingNext ? (
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          ) : (
            <ChevronRight className="h-3 w-3 mr-1" />
          )}
          Next
        </Button>
      </div>
    );
  }

  // Pending stages - show resend button for all (except HR Round which shows Schedule Meeting)
  if (step.status === "pending") {
    return (
      <div className="flex gap-1 mt-2">
        {isHRRound && isFirstPending ? (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onScheduleHRRound?.(step)}
            className="h-6 text-[10px] px-2 border-green-500 text-green-600 hover:bg-green-50"
          >
            <Calendar className="h-3 w-3 mr-1" />
            Schedule Meeting
          </Button>
        ) : (
          <Button 
            size="sm" 
            variant="ghost"
            onClick={handleResendInvitation}
            disabled={isSendingInvite}
            className="h-6 text-[10px] px-2"
          >
            {isSendingInvite ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Mail className="h-3 w-3 mr-1" />
            )}
            Resend
          </Button>
        )}
        {isFirstPending && !isHRRound && (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onUpdateStep(step.id, "current")}
            className="h-6 text-[10px] px-2"
          >
            Start
          </Button>
        )}
      </div>
    );
  }

  return null;
};

// HR Round Schedule Modal Component
const HRRoundScheduleModal = ({
  isOpen,
  onClose,
  step,
  candidateName,
  candidateEmail,
  jobTitle,
  interviewCandidateId,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  step: InterviewStep;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  interviewCandidateId: string;
  onSuccess: () => void;
}) => {
  const [meetingLink, setMeetingLink] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendInvitation = async () => {
    if (!meetingLink.trim()) {
      toast.error('Please paste a meeting link');
      return;
    }
    if (!scheduleDate) {
      toast.error('Please select date and time');
      return;
    }

    setIsSending(true);
    try {
      // Send invitation email with meeting link
      const { error } = await supabase.functions.invoke('send-notification-email', {
        body: {
          to: candidateEmail,
          candidateName,
          jobTitle,
          stageName: step.title,
          type: 'hr_round_invitation',
          interviewCandidateId,
          stageId: step.id,
          meetingLink,
          scheduledDate: scheduleDate,
        },
      });

      if (error) throw error;
      
      toast.success(`HR Round invitation sent to ${candidateName}`, {
        description: `Meeting scheduled for ${new Date(scheduleDate).toLocaleString()}`,
        duration: 4000,
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error sending HR round invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule HR Round Meeting
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Candidate: <span className="font-medium text-foreground">{candidateName}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Email: <span className="font-medium text-foreground">{candidateEmail}</span>
            </p>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Meeting Date & Time *</label>
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className={!scheduleDate ? "border-amber-300" : ""}
            />
            {!scheduleDate && (
              <p className="text-xs text-amber-600">Please select both date and time</p>
            )}
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Meeting Link *</label>
            <Input
              placeholder="Paste your Zoom, Google Meet, or Teams link"
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
              className={!meetingLink.trim() ? "border-amber-300" : ""}
            />
            <p className="text-xs text-muted-foreground">
              Supports Google Meet, Zoom, Microsoft Teams, or any video call link
            </p>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendInvitation}
              disabled={isSending || !meetingLink.trim() || !scheduleDate}
            >
              {isSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Clickable Stages List Component - Shows expandable stage details with recordings
const ClickableStagesList = ({
  interviewSteps,
  interviewCandidateId,
  candidateName,
  candidateEmail,
  jobTitle,
  onUpdateStep,
  getStepIcon,
  getStatusBadge
}: {
  interviewSteps: InterviewStep[];
  interviewCandidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  onUpdateStep: (stepId: string, status: InterviewStep["status"]) => void;
  getStepIcon: (step: InterviewStep) => React.ReactNode;
  getStatusBadge: (step: InterviewStep) => React.ReactNode;
}) => {
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [selectedStageForResults, setSelectedStageForResults] = useState<InterviewStep | null>(null);
  const [hrScheduleModalOpen, setHrScheduleModalOpen] = useState(false);
  const [selectedHRStep, setSelectedHRStep] = useState<InterviewStep | null>(null);
  
  const filteredSteps = interviewSteps.filter(step => step.title !== "AI Phone Interview");
  const firstPendingIndex = filteredSteps.findIndex(s => s.status === "pending");

  const handleStageClick = (step: InterviewStep) => {
    // Only allow expansion for completed stages
    if (step.status === "completed") {
      setExpandedStageId(expandedStageId === step.id ? null : step.id);
    }
  };

  const handleViewResults = (step: InterviewStep, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStageForResults(step);
    setResultsModalOpen(true);
  };

  const handleScheduleHRRound = (step: InterviewStep) => {
    setSelectedHRStep(step);
    setHrScheduleModalOpen(true);
  };

  return (
    <div className="space-y-3">
      {filteredSteps.map((step, index) => {
        const isFirstPending = step.status === "pending" && index === firstPendingIndex;
        const isExpanded = expandedStageId === step.id;
        const isClickable = step.status === "completed";
        
        return (
          <div 
            key={step.id} 
            className={`border rounded-lg overflow-hidden transition-all ${
              step.isLive ? 'bg-destructive/5 border-destructive/30' : 'border-border'
            } ${isClickable ? 'cursor-pointer hover:border-primary/50 hover:bg-accent/30' : ''}`}
          >
            {/* Stage Header - Clickable for completed stages */}
            <div 
              className={`flex items-start gap-3 p-3 ${isClickable ? 'cursor-pointer' : ''}`}
              onClick={() => handleStageClick(step)}
            >
              <div className="mt-0.5">{getStepIcon(step)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-foreground truncate">{step.title}</h4>
                    {isClickable && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 hover:bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStageClick(step);
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    )}
                  </div>
                  {getStatusBadge(step)}
                </div>
                {step.date && (
                  <p className="text-xs text-muted-foreground">
                    {step.date}
                    {step.interviewer && ` • ${step.interviewer}`}
                  </p>
                )}
                {step.notes && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{step.notes}</p>
                )}
                {step.score !== undefined && step.score > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs font-medium text-primary">Score: {step.score}%</p>
                    {step.score >= 50 && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] py-0">
                        Passed
                      </Badge>
                    )}
                    {step.score < 50 && (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] py-0">
                        Below Threshold
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Show interview link for current stages (not expanded content) */}
                {step.status === "current" && (
                  <StageRecordingPlayer
                    interviewCandidateId={interviewCandidateId}
                    stageId={step.id}
                    stageName={step.title}
                    showLinkForPending={true}
                  />
                )}
                
                {/* Action buttons for all stages */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {/* View Results button for completed stages */}
                  {step.status === "completed" && (
                    <Button
                      size="sm"
                      variant="default"
                      className="h-6 text-[10px] px-2"
                      onClick={(e) => handleViewResults(step, e)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View Results
                    </Button>
                  )}
                  <StageActionButtons
                    step={step}
                    isFirstPending={isFirstPending}
                    candidateName={candidateName}
                    candidateEmail={candidateEmail}
                    jobTitle={jobTitle}
                    interviewCandidateId={interviewCandidateId}
                    onUpdateStep={onUpdateStep}
                    onScheduleHRRound={handleScheduleHRRound}
                  />
                </div>
              </div>
            </div>
            
            {/* Expanded Content - Shows recording and Q&A for completed stages */}
            {isExpanded && step.status === "completed" && (
              <div className="border-t bg-muted/30 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Play className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Stage Results</span>
                </div>
                <StageRecordingPlayer
                  interviewCandidateId={interviewCandidateId}
                  stageId={step.id}
                  stageName={step.title}
                  showLinkForPending={false}
                />
              </div>
            )}
          </div>
        );
      })}
      
      {/* Stage Results Modal */}
      {selectedStageForResults && (
        <StageResultsModal
          isOpen={resultsModalOpen}
          onClose={() => {
            setResultsModalOpen(false);
            setSelectedStageForResults(null);
          }}
          interviewCandidateId={interviewCandidateId}
          stageId={selectedStageForResults.id}
          stageName={selectedStageForResults.title}
          candidateName={candidateName}
        />
      )}
      
      {/* HR Round Schedule Modal */}
      {selectedHRStep && (
        <HRRoundScheduleModal
          isOpen={hrScheduleModalOpen}
          onClose={() => {
            setHrScheduleModalOpen(false);
            setSelectedHRStep(null);
          }}
          step={selectedHRStep}
          candidateName={candidateName}
          candidateEmail={candidateEmail}
          jobTitle={jobTitle}
          interviewCandidateId={interviewCandidateId}
          onSuccess={() => onUpdateStep(selectedHRStep.id, "current")}
        />
      )}
    </div>
  );
};

// Candidate Profile Inline Component (replaces pipeline content when selected)
const CandidateProfileInline = ({
  candidate, 
  onBack,
  onUpdateStep,
  onRefresh
}: { 
  candidate: Candidate;
  onBack: () => void;
  onUpdateStep: (stepId: string, status: InterviewStep["status"]) => void;
  onRefresh?: () => void;
}) => {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedStageForSchedule, setSelectedStageForSchedule] = useState<InterviewStep | null>(null);
  const [jobInterviewType, setJobInterviewType] = useState<string | null>(null);
  const [showAIInterviewDialog, setShowAIInterviewDialog] = useState(false);
  
  // Fetch job interview type
  useEffect(() => {
    const fetchJobType = async () => {
      if (!candidate?.jobId) return;
      const { data } = await supabase
        .from('jobs')
        .select('interview_type')
        .eq('id', candidate.jobId)
        .single();
      setJobInterviewType(data?.interview_type || null);
    };
    if (candidate) {
      fetchJobType();
    }
  }, [candidate?.jobId]);

  const completedSteps = candidate.interviewSteps.filter(s => s.status === "completed").length;
  const progress = (completedSteps / candidate.interviewSteps.length) * 100;

  const getStepIcon = (step: InterviewStep) => {
    // Show live pulsing indicator for active interviews
    if (step.isLive || step.status === "in_progress") {
      return (
        <div className="relative">
          <div className="h-4 w-4 rounded-full bg-red-500 animate-pulse" />
          <div className="absolute inset-0 h-4 w-4 rounded-full bg-red-500 animate-ping opacity-75" />
        </div>
      );
    }
    
    switch (step.status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "current":
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />;
    }
  };
  
  const getStatusBadge = (step: InterviewStep) => {
    if (step.isLive || step.status === "in_progress") {
      return (
        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs shrink-0 animate-pulse">
          <span className="relative flex h-2 w-2 mr-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          LIVE
        </Badge>
      );
    }
    
    if (step.status === "current") {
      return (
        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-xs shrink-0">
          In Progress
        </Badge>
      );
    }
    
    if (step.status === "completed") {
      return (
        <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-xs shrink-0">
          Done
        </Badge>
      );
    }
    
    if (step.status === "failed") {
      return <Badge variant="destructive" className="text-xs shrink-0">Failed</Badge>;
    }
    
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ChevronRight className="h-4 w-4 rotate-180" />
          Back to Pipeline
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <Avatar className="h-12 w-12">
            <AvatarImage src={candidate.avatar} />
            <AvatarFallback className="bg-accent/10 text-accent">
              {getInitials(candidate.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-lg font-semibold">{candidate.name}</span>
              {candidate.aiScore && (
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Score: {candidate.aiScore}%
                </Badge>
              )}
              {candidate.autoProgressed && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  <Zap className="h-3 w-3 mr-1" />
                  Auto-Progressed
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{candidate.role}</p>
          </div>
        </div>
        <Button onClick={onRefresh} variant="ghost" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column - Contact & Skills */}
            <div className="space-y-4">
              {/* Contact Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{candidate.email || 'Not provided'}</span>
                  </div>
                  {candidate.phone && (
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{candidate.phone}</span>
                    </div>
                  )}
                  {candidate.location && (
                    <div className="flex items-center gap-3 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{candidate.location}</span>
                    </div>
                  )}
                  {candidate.experience && (
                    <div className="flex items-center gap-3 text-sm">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{candidate.experience} experience</span>
                    </div>
                  )}
                  {candidate.education && (
                    <div className="flex items-center gap-3 text-sm">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">
                        {typeof candidate.education === 'object' 
                          ? ((candidate.education as any).education_level || (candidate.education as any).specialization || 'Education details available')
                          : candidate.education}
                      </span>
                    </div>
                  )}
                  {candidate.resumeUrl && (
                    <div className="flex items-center gap-3 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <a 
                        href={candidate.resumeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View Resume
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Skills */}
              {candidate.skills && candidate.skills.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Skills
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Action Panel - moved below Skills */}
              <AIActionPanel
                candidateId={candidate.id}
                candidateName={candidate.name}
                candidateEmail={candidate.email}
                jobId={candidate.jobId}
                jobTitle={candidate.role}
                interviewCandidateId={candidate.interviewCandidateId}
                currentStage={candidate.currentStage}
                aiScore={candidate.aiScore}
                resumeUrl={candidate.resumeUrl}
                onRefresh={onRefresh}
              />

              {/* AI Analysis */}
              {candidate.aiAnalysis && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      AI Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {candidate.aiAnalysis.summary && (
                      <p className="text-sm text-muted-foreground">{candidate.aiAnalysis.summary}</p>
                    )}
                    {candidate.aiAnalysis.strengths && candidate.aiAnalysis.strengths.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-600 mb-1">Strengths</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {candidate.aiAnalysis.strengths.slice(0, 3).map((s, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {candidate.aiAnalysis.concerns && candidate.aiAnalysis.concerns.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-amber-600 mb-1">Concerns</p>
                        <ul className="text-xs text-muted-foreground space-y-0.5">
                          {candidate.aiAnalysis.concerns.slice(0, 2).map((c, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <XCircle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                              {c}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button className="flex-1" size="sm">
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                  <Button variant="outline" className="flex-1" size="sm">
                    <Video className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                </div>
                
                {/* Manual Interview Scheduling for Education jobs */}
                {jobInterviewType === 'education' && (
                  <Button 
                    variant="default" 
                    size="sm"
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    onClick={() => {
                      const currentStep = candidate.interviewSteps.find(s => s.status === 'current' || s.status === 'pending');
                      setSelectedStageForSchedule(currentStep || null);
                      setShowScheduleModal(true);
                    }}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Manual Panel Interview
                  </Button>
                )}
              </div>
            </div>

            {/* Right Column - Interview Progress */}
            <div className="space-y-4">
              {/* Progress Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Interview Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Completion</span>
                      <span className="font-medium text-foreground">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {completedSteps} of {candidate.interviewSteps.length} steps completed
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Interview Stages with Live Updates */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span>Interview Stages</span>
                    <Badge variant="outline" className="text-xs font-normal bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      <span className="relative flex h-2 w-2 mr-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                      Live
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ClickableStagesList
                    interviewSteps={candidate.interviewSteps}
                    interviewCandidateId={candidate.interviewCandidateId}
                    candidateName={candidate.name}
                    candidateEmail={candidate.email}
                    jobTitle={candidate.role}
                    onUpdateStep={onUpdateStep}
                    getStepIcon={getStepIcon}
                    getStatusBadge={getStatusBadge}
                  />
                </CardContent>
              </Card>

              {/* Interview Recording & Results */}
              <InterviewRecordingPlayer 
                interviewCandidateId={candidate.interviewCandidateId} 
              />
            </div>
          </div>
      
      {/* Manual Interview Schedule Modal */}
      <ManualInterviewScheduleModal
        isOpen={showScheduleModal}
        onClose={() => {
          setShowScheduleModal(false);
          setSelectedStageForSchedule(null);
        }}
        candidateName={candidate.name}
        candidateEmail={candidate.email}
        jobTitle={candidate.role}
        interviewCandidateId={candidate.interviewCandidateId}
        stageName={selectedStageForSchedule?.title || 'Panel Interview'}
        onSuccess={onRefresh}
      />

      {/* AI Technical Interview Dialog */}
      <Dialog open={showAIInterviewDialog} onOpenChange={setShowAIInterviewDialog}>
        <DialogContent className="max-w-6xl h-[90vh] p-0">
          <AIInterviewSession
            interviewCandidateId={candidate.interviewCandidateId}
            jobId={candidate.jobId}
            jobTitle={candidate.role}
            candidateName={candidate.name}
            onComplete={() => {
              setShowAIInterviewDialog(false);
              onRefresh?.();
              // Mark the AI Technical Interview stage as completed
              const aiStage = candidate.interviewSteps.find(s => s.title === "AI Technical Interview");
              if (aiStage) {
                onUpdateStep(aiStage.id, "completed");
              }
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const CandidateCard = ({ 
  candidate, 
  onMoveNext, 
  onSchedule, 
  onEmail,
  onOpenProfile,
  onDelete,
  isSelected,
  onToggleSelect
}: { 
  candidate: Candidate; 
  onMoveNext: () => void;
  onSchedule: () => void;
  onEmail: () => void;
  onOpenProfile: () => void;
  onDelete?: () => void;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) => {
  return (
    <Card 
      className={`mb-3 bg-card border transition-all cursor-pointer group ${
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:shadow-md'
      }`}
      onClick={onOpenProfile}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div 
            className="mt-0.5"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
          >
            <Checkbox 
              checked={isSelected} 
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
          </div>
          <Avatar className="h-10 w-10">
            <AvatarImage src={candidate.avatar} />
            <AvatarFallback className="bg-accent/10 text-accent text-sm">
              {getInitials(candidate.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-foreground text-sm truncate">
                {candidate.name}
              </h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSchedule(); }}>
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Interview
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEmail(); }}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMoveNext(); }}>
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Move to Next Stage
                  </DropdownMenuItem>
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Candidate
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-xs text-muted-foreground truncate">{candidate.role}</p>
            
            {/* Auto-progression badge */}
            {candidate.autoProgressed && (
              <Badge className="mt-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                <Zap className="h-3 w-3 mr-1" />
                AI Auto-Progressed
              </Badge>
            )}
            
            <p className="text-xs text-muted-foreground mt-1">{formatRelativeDate(candidate.appliedDate)}</p>
            
            {/* Progress indicator with live status */}
            <div className="mt-2">
              <div className="flex gap-0.5">
                {candidate.interviewSteps
                  .filter(step => step.title !== "AI Phone Interview")
                  .map((step) => (
                  <div 
                    key={step.id}
                    className={`h-1.5 flex-1 rounded-full transition-all ${
                      step.status === "completed" ? "bg-green-500" :
                      step.isLive || step.status === "in_progress" ? "bg-red-500 animate-pulse" :
                      step.status === "current" ? "bg-blue-500" :
                      step.status === "failed" ? "bg-destructive" :
                      "bg-muted"
                    }`}
                    title={`${step.title}: ${step.isLive ? 'LIVE' : step.status}`}
                  />
                ))}
              </div>
              {candidate.interviewSteps.some(s => s.isLive || s.status === "in_progress") && (
                <p className="text-[10px] text-red-500 font-medium mt-1 flex items-center gap-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                  </span>
                  Candidate is in live interview
                </p>
              )}
            </div>
            
            <div className="flex flex-wrap gap-1 mt-2">
              {candidate.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const PipelineColumn = ({ 
  stage, 
  onMoveCandidate,
  onOpenCandidate,
  onDeleteCandidate
}: { 
  stage: PipelineStage;
  onMoveCandidate: (candidateId: string, fromStage: string, toStage: string) => void;
  onOpenCandidate: (candidate: Candidate) => void;
  onDeleteCandidate: (candidate: Candidate) => void;
}) => {
  const Icon = getStageIcon(stage.title);
  const color = getStageColor(stage.title);

  return (
    <div className="flex-shrink-0 w-72">
      <Card className="bg-muted/30 border-border h-full">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${color}`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-sm font-semibold text-foreground">
                {stage.title}
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              {stage.candidates.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <ScrollArea className="h-[calc(100vh-320px)]">
            {stage.candidates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No candidates
              </div>
            ) : (
              stage.candidates.map((candidate) => (
                <CandidateCard
                  key={candidate.interviewCandidateId}
                  candidate={candidate}
                  onMoveNext={() => onMoveCandidate(candidate.interviewCandidateId, stage.id, "next")}
                  onSchedule={() => console.log("Schedule interview for", candidate.name)}
                  onEmail={() => console.log("Send email to", candidate.email)}
                  onOpenProfile={() => onOpenCandidate(candidate)}
                  onDelete={() => onDeleteCandidate(candidate)}
                />
              ))
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export const InterviewPipelineContent = () => {
  const navigate = useNavigate();
  const { stages, loading, error, refetch, moveCandidate, updateEventStatus } = useInterviewPipeline();
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTargetStage, setBulkTargetStage] = useState<string>("");
  const [isBulkMoving, setIsBulkMoving] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<Candidate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Get all candidates from all stages
  const allCandidates = stages.flatMap(stage => stage.candidates);

  const handleToggleSelect = (candidateId: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === allCandidates.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allCandidates.map(c => c.interviewCandidateId)));
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkMove = async () => {
    if (!bulkTargetStage || selectedIds.size === 0) return;
    
    setIsBulkMoving(true);
    try {
      // Move all selected candidates to the target stage
      const promises = Array.from(selectedIds).map(id => 
        moveCandidate(id, bulkTargetStage)
      );
      await Promise.all(promises);
      setSelectedIds(new Set());
      setBulkTargetStage("");
    } catch (error) {
      console.error("Bulk move failed:", error);
    } finally {
      setIsBulkMoving(false);
    }
  };

  const handleMoveCandidate = async (interviewCandidateId: string, fromStageId: string, direction: string) => {
    const fromStageIndex = stages.findIndex((s) => s.id === fromStageId);
    if (fromStageIndex === -1) return;
    
    const toStageIndex = direction === "next" ? fromStageIndex + 1 : fromStageIndex - 1;
    if (toStageIndex < 0 || toStageIndex >= stages.length) return;
    
    const toStageId = stages[toStageIndex].id;
    await moveCandidate(interviewCandidateId, toStageId);
  };

  const handleOpenCandidate = (candidate: Candidate) => {
    // Open candidate profile in modal instead of navigating
    setSelectedCandidate(candidate);
  };

  const handleUpdateStep = async (stepId: string, status: InterviewStep["status"]) => {
    if (!selectedCandidate) return;
    
    const dbStatus = status === "current" ? "in_progress" : status;
    await updateEventStatus(selectedCandidate.interviewCandidateId, stepId, dbStatus);
    
    // Refresh selected candidate data
    await refetch();
  };

  const handleDeleteCandidate = async () => {
    if (!deleteCandidate) return;
    
    setIsDeleting(true);
    try {
      // Get interview events for this candidate
      const { data: events } = await supabase
        .from('interview_events')
        .select('id')
        .eq('interview_candidate_id', deleteCandidate.interviewCandidateId);
      
      // Delete interview responses first
      if (events?.length) {
        await supabase
          .from('interview_responses')
          .delete()
          .in('interview_event_id', events.map(e => e.id));
      }
      
      // Delete interview events
      await supabase
        .from('interview_events')
        .delete()
        .eq('interview_candidate_id', deleteCandidate.interviewCandidateId);
      
      // Delete the interview candidate record
      const { error } = await supabase
        .from('interview_candidates')
        .delete()
        .eq('id', deleteCandidate.interviewCandidateId);
      
      if (error) throw error;
      
      toast.success('Candidate removed from pipeline');
      setDeleteCandidate(null);
      refetch();
    } catch (error: any) {
      console.error('Error deleting candidate:', error);
      toast.error(error.message || 'Failed to remove candidate');
    } finally {
      setIsDeleting(false);
    }
  };

  const totalCandidates = stages.reduce(
    (acc, stage) => acc + stage.candidates.length,
    0
  );

  const filteredStages = stages.filter(s => s.title !== "AI Phone Interview");

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading pipeline data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center">
          <Database className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium text-foreground">Failed to load pipeline</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Empty state
  if (stages.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4 text-center">
          <Users className="h-12 w-12 text-muted-foreground" />
          <div>
            <p className="text-lg font-medium text-foreground">No pipeline stages</p>
            <p className="text-sm text-muted-foreground">Configure interview stages to get started</p>
          </div>
        </div>
      </div>
    );
  }

  // If a candidate is selected, show their profile inline
  if (selectedCandidate) {
    return (
      <CandidateProfileInline
        candidate={selectedCandidate}
        onBack={() => setSelectedCandidate(null)}
        onUpdateStep={handleUpdateStep}
        onRefresh={refetch}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            Interview Pipeline
            <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
              <span className="relative flex h-2 w-2 mr-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              Live Connected
            </Badge>
            {allCandidates.some(c => c.interviewSteps.some(s => s.isLive || s.status === "in_progress")) && (
              <Badge className="text-xs bg-red-500/10 text-red-500 border-red-500/20 animate-pulse">
                <span className="relative flex h-2 w-2 mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                </span>
                Active Interview
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">
            Track candidates through your hiring process • Auto-updates enabled
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button onClick={refetch} variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <div className="text-right">
            <p className="text-2xl font-bold text-foreground">{totalCandidates}</p>
            <p className="text-xs text-muted-foreground">Total Candidates</p>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Checkbox 
                  checked={selectedIds.size === allCandidates.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium text-foreground">
                  {selectedIds.size} candidate{selectedIds.size > 1 ? 's' : ''} selected
                </span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearSelection}
                  className="text-muted-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Select value={bulkTargetStage} onValueChange={setBulkTargetStage}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Move to stage..." />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStages.map((stage) => (
                      <SelectItem key={stage.id} value={stage.id}>
                        {stage.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button 
                  onClick={handleBulkMove} 
                  disabled={!bulkTargetStage || isBulkMoving}
                  size="sm"
                >
                  {isBulkMoving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Moving...
                    </>
                  ) : (
                    <>
                      <ChevronRight className="h-4 w-4 mr-2" />
                      Move Selected
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Candidates Grid */}
      {allCandidates.length === 0 ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4 text-center">
            <Users className="h-12 w-12 text-muted-foreground" />
            <div>
              <p className="text-lg font-medium text-foreground">No candidates yet</p>
              <p className="text-sm text-muted-foreground">Candidates will appear here when they apply</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.interviewCandidateId}
              candidate={candidate}
              onMoveNext={() => {}}
              onSchedule={() => console.log("Schedule interview for", candidate.name)}
              onEmail={() => console.log("Send email to", candidate.email)}
              onOpenProfile={() => handleOpenCandidate(candidate)}
              onDelete={() => setDeleteCandidate(candidate)}
              isSelected={selectedIds.has(candidate.interviewCandidateId)}
              onToggleSelect={() => handleToggleSelect(candidate.interviewCandidateId)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCandidate} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deleteCandidate?.name} from the interview pipeline? 
              This will delete all interview records and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCandidate}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InterviewPipelineContent;
