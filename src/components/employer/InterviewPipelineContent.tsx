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
  Eye,
  RotateCcw,
  Link2,
  Plus
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
import { DemoRoundOptions } from "./DemoRoundOptions";
import { DemoFeedbackResults } from "./DemoFeedbackResults";
import { AllStagesReviewSummary } from "./AllStagesReviewSummary";
import OfferLetterModal from "./OfferLetterModal";
import { useInterviewPipeline, PipelineCandidate, PipelineStage, InterviewStep } from "@/hooks/useInterviewPipeline";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Stage icon mapping
const stageIcons: Record<string, React.ElementType> = {
  'Interview Guidelines': Mail,
  'CV/Resume': Users,
  'Written Test Slot Booking': Calendar,
  'Written Test': Code,
  'Demo Slot Booking': Calendar,
  'Demo Round': Video,
  'Demo Feedback': MessageSquare,
  'Segment Round Slot Booking': Calendar,
  'Segment Round': Video,
  'Segment Feedback': MessageSquare,
  'Admin & Academic Round Slot Booking': Calendar,
  'Admin & Academic Round': Video,
  'Admin & Academic Feedback': MessageSquare,
  'HR Round Slot Booking': Calendar,
  'HR Round': UserCheck,
  'HR Feedback': MessageSquare,
  'Final Review': FileCheck,
  'Offer Stage': FileText,
};

const stageColors: Record<string, string> = {
  'Interview Guidelines': 'bg-indigo-500',
  'CV/Resume': 'bg-blue-500',
  'Written Test Slot Booking': 'bg-orange-400',
  'Written Test': 'bg-orange-500',
  'Demo Slot Booking': 'bg-purple-500',
  'Demo Round': 'bg-pink-500',
  'Demo Feedback': 'bg-amber-500',
  'Segment Round Slot Booking': 'bg-violet-500',
  'Segment Round': 'bg-fuchsia-500',
  'Segment Feedback': 'bg-rose-500',
  'Admin & Academic Round Slot Booking': 'bg-sky-500',
  'Admin & Academic Round': 'bg-cyan-600',
  'Admin & Academic Feedback': 'bg-lime-600',
  'HR Round Slot Booking': 'bg-teal-500',
  'HR Round': 'bg-green-500',
  'HR Feedback': 'bg-blue-400',
  'Final Review': 'bg-cyan-500',
  'Offer Stage': 'bg-emerald-500',
};

const hiddenPipelineStages = new Set(['AI Phone Interview', 'Segment Round', 'Admin & Academic Round']);

const getVisibleInterviewSteps = (steps: InterviewStep[]) =>
  steps.filter((step) => !hiddenPipelineStages.has(step.title));

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

// Send Slot Booking Button Component
const SendSlotBookingButton = ({
  interviewCandidateId,
  stageName,
}: {
  interviewCandidateId: string;
  stageName: string;
}) => {
  const [isSending, setIsSending] = useState(false);

  const handleSendSlotBooking = async () => {
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-slot-booking-email', {
        body: {
          interviewCandidateId,
          stageName,
        },
      });
      if (error) throw error;
      toast.success(`Slot booking email sent for ${stageName}`);
    } catch (err) {
      console.error('Error sending slot booking email:', err);
      toast.error('Failed to send slot booking email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleSendSlotBooking}
      disabled={isSending}
      className="h-6 text-[10px] px-2 border-blue-500 text-blue-600 hover:bg-blue-50"
    >
      {isSending ? (
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
      ) : (
        <Calendar className="h-3 w-3 mr-1" />
      )}
      Book Slot
    </Button>
  );
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
  onScheduleHRRound,
  onSendOfferLetter
}: {
  step: InterviewStep;
  isFirstPending: boolean;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  interviewCandidateId: string;
  onUpdateStep: (stepId: string, status: InterviewStep["status"], skipEmail?: boolean) => void;
  onScheduleHRRound?: (step: InterviewStep) => void;
  onSendOfferLetter?: () => void;
}) => {
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [isMovingNext, setIsMovingNext] = useState(false);
  
  // Check if this is HR Round (manual meeting link only)
  const isHRRound = step.title === 'HR Round';
  const isOfferStage = step.title === 'Offer Stage';

  const handleResendInvitation = async () => {
    setIsSendingInvite(true);
    try {
      // For CV/Resume stage, send ATS results email instead of generic invitation
      if (step.title === 'CV/Resume') {
        const { error } = await supabase.functions.invoke('send-cv-results-email', {
          body: { interviewCandidateId },
        });
        if (error) throw error;
        toast.success('CV/Resume ATS results email resent');
      } else if (step.title === 'Written Test Slot Booking') {
        // For Written Test Slot Booking, send slot booking email
        const { error } = await supabase.functions.invoke('send-slot-booking-email', {
          body: {
            interviewCandidateId,
            stageName: 'Written Test',
          },
        });
        if (error) throw error;
        toast.success('Written Test slot booking email resent');
      } else if (step.title === 'Demo Slot Booking') {
        const { error } = await supabase.functions.invoke('send-slot-booking-email', {
          body: { interviewCandidateId, stageName: 'Demo Round' },
        });
        if (error) throw error;
        toast.success('Demo slot booking email resent');
      } else if (step.title === 'Segment Round Slot Booking') {
        const { error } = await supabase.functions.invoke('send-slot-booking-email', {
          body: { interviewCandidateId, stageName: 'Segment Round' },
        });
        if (error) throw error;
        toast.success('Segment Round slot booking email resent');
      } else if (step.title === 'Admin & Academic Round Slot Booking') {
        const { error } = await supabase.functions.invoke('send-slot-booking-email', {
          body: { interviewCandidateId, stageName: 'Admin & Academic Round' },
        });
        if (error) throw error;
        toast.success('Admin & Academic Round slot booking email resent');
      } else if (step.title === 'HR Round Slot Booking') {
        const { error } = await supabase.functions.invoke('send-slot-booking-email', {
          body: { interviewCandidateId, stageName: 'HR Round' },
        });
        if (error) throw error;
        toast.success('HR slot booking email resent');
      } else {
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
      }
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
      
      // Update local UI state - skipEmail=true since edge function already handles advancement
      onUpdateStep(step.id, "completed", true);

      // Use step.title to determine which emails to send (don't rely on response data matching)
      const nextStageName = data?.currentStage;

      // If advancing from Interview Guidelines, send instruction email and trigger CV analysis
      if (step.title === 'Interview Guidelines') {
        // Send instruction email
        try {
          await supabase.functions.invoke('send-instruction-email', {
            body: { interviewCandidateId }
          });
          console.log('Instruction email sent successfully');
        } catch (instrError) {
          console.error('Error sending instruction email:', instrError);
        }
        toast.success(`✓ Interview Guidelines cleared! Moved to CV/Resume`, {
          description: `Instruction email sent to candidate`,
          duration: 5000,
        });
      } else if (step.title === 'CV/Resume') {
        // Send CV/Resume results email to candidate
        try {
          await supabase.functions.invoke('send-cv-results-email', {
            body: { interviewCandidateId }
          });
          console.log('CV results email sent successfully');
        } catch (cvEmailError) {
          console.error('Error sending CV results email:', cvEmailError);
        }

        try {
          await supabase.functions.invoke('send-slot-booking-email', {
            body: {
              interviewCandidateId,
              stageName: 'Written Test',
            }
          });
          toast.success(`✓ CV/Resume cleared! ATS results & slot booking email sent`, {
            description: `Candidate will receive their CV score and Written Test slot booking link`,
            duration: 5000,
          });
        } catch (slotError) {
          console.error('Error sending slot booking email:', slotError);
          toast.success(`✓ CV/Resume cleared! Moved to Written Test Slot Booking`, {
            description: 'Note: Slot booking email failed to send. You can resend manually.',
            duration: 5000,
          });
        }
      } else if (step.title === 'Written Test Slot Booking') {
        // Written Test Slot Booking → Written Test: Send interview invitation
        toast.success(`✓ Written Test Slot Booking cleared! Moved to Written Test`, {
          description: `Candidate will now take the Written Test`,
          duration: 5000,
        });
      } else if (step.title === 'Written Test') {
        // Determine the next stage dynamically based on what follows Written Test in the pipeline
        const nextStageName = data?.currentStage || 'Demo Round';
        const slotStageName = nextStageName.replace(' Slot Booking', '').replace('Slot Booking', '');
        try {
          await supabase.functions.invoke('send-slot-booking-email', {
            body: {
              interviewCandidateId,
              stageName: slotStageName,
            }
          });
          toast.success(`✓ Written Test cleared! ${slotStageName} slot booking email sent`, {
            description: `Candidate will receive a ${slotStageName} slot booking link`,
            duration: 5000,
          });
        } catch (slotError) {
          console.error('Error sending slot booking email:', slotError);
          toast.success(`✓ Written Test cleared! Moved to next stage`, {
            description: 'Note: Slot booking email failed to send. You can resend manually.',
            duration: 5000,
          });
        }
      } else if (step.title === 'Demo Slot Booking') {
        // Demo Slot Booking → Demo Round (keep existing flow)
        try {
          await supabase.functions.invoke('send-demo-round-emails', {
            body: { interviewCandidateId }
          });
          toast.success(`✓ Demo Slot Booking cleared! Demo Round invitations sent`, {
            description: `Emails sent to candidate and observer`,
            duration: 5000,
          });
        } catch (demoError) {
          console.error(`Error sending Demo Round emails:`, demoError);
          toast.success(`✓ Demo Slot Booking cleared! Moved to Demo Round`, {
            description: `Note: Emails failed to send. You can send manually.`,
            duration: 5000,
          });
        }
      } else if (step.title === 'Segment Round Slot Booking' || step.title === 'Admin & Academic Round Slot Booking') {
        // Segment/Admin Slot Booking → skip round, go directly to feedback
        const feedbackType = step.title === 'Segment Round Slot Booking' ? 'segment' : 'admin_academic';
        const roundName = step.title.replace(' Slot Booking', '');
        try {
          await supabase.functions.invoke('send-demo-feedback-email', {
            body: { interviewCandidateId, feedbackType }
          });
          toast.success(`✓ ${step.title} cleared! Feedback request sent to observers`, {
            description: `Observers will receive an email with a feedback link`,
            duration: 5000,
          });
        } catch (feedbackError) {
          console.error(`Error sending ${roundName} feedback emails:`, feedbackError);
          toast.success(`✓ ${step.title} cleared! Moved to Feedback`, {
            description: 'Note: Feedback email failed to send. You can resend manually.',
            duration: 5000,
          });
        }
      } else if (step.title === 'Demo Round' || step.title === 'Segment Round' || step.title === 'Admin & Academic Round' || step.title === 'HR Round') {
        // Any round → its feedback stage: auto-send feedback request
        const feedbackType = step.title === 'HR Round' ? 'hr' : step.title === 'Segment Round' ? 'segment' : step.title === 'Admin & Academic Round' ? 'admin_academic' : 'demo';
        const feedbackFn = feedbackType === 'hr' ? 'send-hr-feedback-email' : 'send-demo-feedback-email';
        try {
          await supabase.functions.invoke(feedbackFn, {
            body: { interviewCandidateId, feedbackType }
          });
          toast.success(`✓ ${step.title} cleared! Feedback request sent to observers`, {
            description: `Observers will receive an email with a feedback link`,
            duration: 5000,
          });
        } catch (feedbackError) {
          console.error(`Error sending ${step.title} feedback emails:`, feedbackError);
          toast.success(`✓ ${step.title} cleared! Moved to Feedback`, {
            description: 'Note: Feedback email failed to send. You can resend manually.',
            duration: 5000,
          });
        }
      } else if (step.title === 'Demo Feedback' || step.title === 'Segment Feedback' || step.title === 'Admin & Academic Feedback' || step.title === 'HR Feedback') {
        // Feedback → next slot booking or Final Review
        const nextStage = data?.currentStage || 'Final Review';
        if (nextStage.includes('Slot Booking')) {
          const slotRound = nextStage.replace(' Slot Booking', '');
          try {
            await supabase.functions.invoke('send-slot-booking-email', {
              body: { interviewCandidateId, stageName: slotRound }
            });
            toast.success(`✓ ${step.title} cleared! ${slotRound} slot booking email sent`, {
              description: `Candidate will receive a ${slotRound} slot booking link`,
              duration: 5000,
            });
          } catch (slotError) {
            console.error(`Error sending ${slotRound} slot booking email:`, slotError);
            toast.success(`✓ ${step.title} cleared! Moved to ${nextStage}`, {
              description: 'Note: Slot booking email failed to send. You can resend manually.',
              duration: 5000,
            });
          }
        } else {
          toast.success(`✓ ${step.title} cleared! Moved to ${nextStage}`, {
            duration: 5000,
          });
        }
      } else if (step.title === 'HR Round Slot Booking') {
        // HR Round Slot Booking → HR Round (not skipped for Principal pipeline)
        try {
          await supabase.functions.invoke('send-demo-round-emails', {
            body: { interviewCandidateId }
          });
          toast.success(`✓ HR Round Slot Booking cleared! HR Round invitations sent`, {
            description: `Emails sent to candidate and observer`,
            duration: 5000,
          });
        } catch (hrError) {
          console.error('Error sending HR round emails:', hrError);
          toast.success(`✓ HR Round Slot Booking cleared! Moved to HR Round`, {
            description: 'Note: HR round email failed to send. You can resend manually.',
            duration: 5000,
          });
        }
      } else {
        // Show clear success message with current stage cleared and next stage info
        const clearedMessage = `✓ ${step.title} cleared!`;
        const nextStageMessage = data?.currentStage ? ` Moved to ${data.currentStage}` : '';
        toast.success(clearedMessage + nextStageMessage, {
          description: data?.action === 'hired' ? 'Candidate is ready for hire!' : undefined,
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Error moving to next step:', error);
      toast.error('Failed to move to next stage');
    } finally {
      setIsMovingNext(false);
    }
  };

  // Handle moving specifically from Demo Round to Demo Feedback
  const handleMoveToDemoFeedback = async () => {
    setIsMovingNext(true);
    try {
      // First, set the candidate's current stage to Demo Round so the edge function advances correctly
      const { data: demoRoundStage } = await supabase
        .from('interview_stages')
        .select('id, stage_order')
        .eq('name', 'Demo Round')
        .single();

      if (!demoRoundStage) throw new Error('Demo Round stage not found');

      // Set current_stage_id to Demo Round first
      await supabase
        .from('interview_candidates')
        .update({ current_stage_id: demoRoundStage.id })
        .eq('id', interviewCandidateId);

      // Now call the edge function to advance from Demo Round → Demo Feedback
      const { data, error } = await supabase.functions.invoke('process-interview-stage', {
        body: {
          interviewCandidateId,
          action: 'advance',
          feedback: 'Manually advanced from Demo Round to Demo Feedback'
        }
      });

      if (error) throw error;

      // Send feedback request to observers
      try {
        await supabase.functions.invoke('send-demo-feedback-email', {
          body: { interviewCandidateId }
        });
        toast.success(`✓ Demo Round cleared! Feedback request sent to observers`, {
          description: `Observers will receive an email with a feedback link`,
          duration: 5000,
        });
      } catch (feedbackError) {
        console.error('Error sending demo feedback emails:', feedbackError);
        toast.success(`✓ Demo Round cleared! Moved to Demo Feedback`, {
          description: 'Note: Feedback email failed to send. You can resend manually.',
          duration: 5000,
        });
      }
    } catch (error) {
      console.error('Error moving to Demo Feedback:', error);
      toast.error('Failed to move to Demo Feedback');
    } finally {
      setIsMovingNext(false);
    }
  };

  // Handle moving specifically from HR Round to Final Review
  const handleMoveToFinalReview = async () => {
    setIsMovingNext(true);
    try {
      // First, set the candidate's current stage to HR Round so the edge function advances correctly
      const { data: hrRoundStage } = await supabase
        .from('interview_stages')
        .select('id, stage_order')
        .eq('name', 'HR Round')
        .single();

      if (!hrRoundStage) throw new Error('HR Round stage not found');

      // Set current_stage_id to HR Round first
      await supabase
        .from('interview_candidates')
        .update({ current_stage_id: hrRoundStage.id })
        .eq('id', interviewCandidateId);

      // Now call the edge function to advance from HR Round → Final Review
      const { data, error } = await supabase.functions.invoke('process-interview-stage', {
        body: {
          interviewCandidateId,
          action: 'advance',
          feedback: 'Manually advanced from HR Round to Final Review'
        }
      });

      if (error) throw error;

      // Update local UI state
      onUpdateStep(step.id, "completed", true);

      toast.success(`✓ HR Round cleared! Moved to Final Review`, {
        description: 'All stages review summary is now available',
        duration: 5000,
      });
    } catch (error) {
      console.error('Error moving to Final Review:', error);
      toast.error('Failed to move to Final Review');
    } finally {
      setIsMovingNext(false);
    }
  };

  // Completed stage - show resend mail button and Next button for all stages
  if (step.status === "completed") {
    const isDemoRound = step.title === 'Demo Round';
    const isHRRoundCompleted = step.title === 'HR Round';
    
    // Determine the correct handler based on stage
    const getNextHandler = () => {
      if (isDemoRound) return handleMoveToDemoFeedback;
      if (isHRRoundCompleted) return handleMoveToFinalReview;
      return handleMoveToNextStep;
    };

    return (
      <div className="flex gap-1 mt-2">
        {isOfferStage ? (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onSendOfferLetter?.()}
            className="h-6 text-[10px] px-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
          >
            <FileText className="h-3 w-3 mr-1" />
            Send Offer Letter
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
          onClick={getNextHandler()}
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

  // Current or In Progress stage - show action buttons based on stage type
  if (step.status === "current" || step.status === "in_progress" || step.isLive) {
    const isWrittenTestSlotBooking = step.title === 'Written Test Slot Booking';
    const isDemoSlotBooking = step.title === 'Demo Slot Booking';
    const isHRSlotBooking = step.title === 'HR Round Slot Booking';
    const isSlotBookingStage = isWrittenTestSlotBooking || isDemoSlotBooking || isHRSlotBooking;
    
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {/* Offer Stage - Send Offer Letter button */}
        {isOfferStage ? (
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => onSendOfferLetter?.()}
            className="h-6 text-[10px] px-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
          >
            <FileText className="h-3 w-3 mr-1" />
            Send Offer Letter
          </Button>
        ) : isHRRound ? (
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
          <>
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
            {/* Send Slot Booking email for Written Test Slot Booking, Demo Slot Booking, or HR Round Slot Booking */}
            {isSlotBookingStage && (
              <SendSlotBookingButton
                interviewCandidateId={interviewCandidateId}
                stageName={isWrittenTestSlotBooking ? 'Written Test' : isDemoSlotBooking ? 'Demo Round' : isHRSlotBooking ? 'HR Round' : step.title}
              />
            )}
          </>
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
        {!isOfferStage && (
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
        )}
      </div>
    );
  }

  // Pending stages - show resend button for all (except HR Round which shows Schedule Meeting)
  if (step.status === "pending") {
    const isWrittenTestSlotBooking = step.title === 'Written Test Slot Booking';
    const isDemoSlotBooking = step.title === 'Demo Slot Booking';
    const isHRSlotBooking = step.title === 'HR Round Slot Booking';
    const isSlotBookingStage = isWrittenTestSlotBooking || isDemoSlotBooking || isHRSlotBooking;
    
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
          <>
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
            {/* Send Slot Booking email for Written Test Slot Booking, Demo Slot Booking, or HR Slot Booking (pending) */}
            {isSlotBookingStage && isFirstPending && (
              <SendSlotBookingButton
                interviewCandidateId={interviewCandidateId}
                stageName={isWrittenTestSlotBooking ? 'Written Test' : isDemoSlotBooking ? 'Demo Round' : isHRSlotBooking ? 'HR Round' : step.title}
              />
            )}
          </>
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
  const [scheduleTime, setScheduleTime] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendInvitation = async () => {
    if (!meetingLink.trim()) {
      toast.error('Please paste a meeting link');
      return;
    }
    if (!scheduleDate) {
      toast.error('Please select a date');
      return;
    }
    if (!scheduleTime) {
      toast.error('Please select a time');
      return;
    }

    // Combine date and time into ISO string
    const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();

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
          scheduledDate: scheduledDateTime,
        },
      });

      if (error) throw error;
      
      toast.success(`HR Round invitation sent to ${candidateName}`, {
        description: `Meeting scheduled for ${new Date(scheduledDateTime).toLocaleString()}`,
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
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date *
              </label>
              <Input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Time *
              </label>
              <Select value={scheduleTime} onValueChange={setScheduleTime}>
                <SelectTrigger>
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {Array.from({ length: 24 }, (_, hour) => (
                    ['00', '30'].map(minute => {
                      const time = `${hour.toString().padStart(2, '0')}:${minute}`;
                      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                      const ampm = hour < 12 ? 'AM' : 'PM';
                      const displayTime = `${displayHour}:${minute} ${ampm}`;
                      return (
                        <SelectItem key={time} value={time}>
                          {displayTime}
                        </SelectItem>
                      );
                    })
                  )).flat()}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(!scheduleDate || !scheduleTime) && (
            <p className="text-xs text-amber-600">Please select both date and time</p>
          )}
          
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
              disabled={isSending || !meetingLink.trim() || !scheduleDate || !scheduleTime}
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
  getStatusBadge,
  onRefresh
}: {
  interviewSteps: InterviewStep[];
  interviewCandidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  onUpdateStep: (stepId: string, status: InterviewStep["status"], skipEmail?: boolean) => void;
  getStepIcon: (step: InterviewStep) => React.ReactNode;
  getStatusBadge: (step: InterviewStep) => React.ReactNode;
  onRefresh?: () => void;
}) => {
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [resultsModalOpen, setResultsModalOpen] = useState(false);
  const [selectedStageForResults, setSelectedStageForResults] = useState<InterviewStep | null>(null);
  const [hrScheduleModalOpen, setHrScheduleModalOpen] = useState(false);
  const [selectedHRStep, setSelectedHRStep] = useState<InterviewStep | null>(null);
  const [offerLetterModalOpen, setOfferLetterModalOpen] = useState(false);
  const [slotBooking, setSlotBooking] = useState<{ id: string; booking_date: string; booking_time: string; status: string; subject: string | null; updated_at: string; created_at: string; observer_email: string | null; demo_meet_link: string | null; demo_meet_type: string | null; preferred_slots: { date: string; time: string }[] | null } | null>(null);
  const [selectedPreferredSlot, setSelectedPreferredSlot] = useState<number | null>(null);
  const [isConfirmingSlot, setIsConfirmingSlot] = useState(false);
  const [isEditingSlot, setIsEditingSlot] = useState(false);
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [isSavingSlot, setIsSavingSlot] = useState(false);
  const [observerEmail, setObserverEmail] = useState("");
  const [observerEmails, setObserverEmails] = useState<string[]>([]);
  const [isSavingObserver, setIsSavingObserver] = useState(false);

  // Written Test Slot Booking states
  const [writtenTestSlotBooking, setWrittenTestSlotBooking] = useState<{ id: string; booking_date: string; booking_time: string; status: string; subject: string | null; updated_at: string; created_at: string } | null>(null);
  const [isEditingWrittenTestSlot, setIsEditingWrittenTestSlot] = useState(false);
  const [editWrittenTestDate, setEditWrittenTestDate] = useState("");
  const [editWrittenTestTime, setEditWrittenTestTime] = useState("");
  const [isSavingWrittenTestSlot, setIsSavingWrittenTestSlot] = useState(false);

  // HR Round Slot Booking states
  const [hrSlotBooking, setHrSlotBooking] = useState<{ id: string; booking_date: string; booking_time: string; status: string; subject: string | null; updated_at: string; created_at: string; observer_email: string | null; preferred_slots: { date: string; time: string }[] | null } | null>(null);
  const [isEditingHrSlot, setIsEditingHrSlot] = useState(false);
  const [editHrDate, setEditHrDate] = useState("");
  const [editHrTime, setEditHrTime] = useState("");
  const [isSavingHrSlot, setIsSavingHrSlot] = useState(false);
  const [hrObserverEmail, setHrObserverEmail] = useState("");
  const [hrObserverEmails, setHrObserverEmails] = useState<string[]>([]);
  const [isSavingHrObserver, setIsSavingHrObserver] = useState(false);
  const [selectedHrPreferredSlot, setSelectedHrPreferredSlot] = useState<number | null>(null);
  const [isConfirmingHrSlot, setIsConfirmingHrSlot] = useState(false);
  // Segment Round Slot Booking states
  const [segmentSlotBooking, setSegmentSlotBooking] = useState<typeof slotBooking>(null);
  const [segmentObserverEmails, setSegmentObserverEmails] = useState<string[]>([]);
  // Admin & Academic Round Slot Booking states
  const [adminSlotBooking, setAdminSlotBooking] = useState<typeof slotBooking>(null);
  const [adminObserverEmails, setAdminObserverEmails] = useState<string[]>([]);
  // Demo meeting options state
  const [demoMeetType, setDemoMeetType] = useState<'ai_video' | 'google_meet' | 'zoom_meet'>('google_meet');
  const [demoMeetLink, setDemoMeetLink] = useState('');
  // HR meeting options state
  const [hrMeetType, setHrMeetType] = useState<'google_meet' | 'zoom_meet'>('google_meet');
  const [hrMeetLink, setHrMeetLink] = useState('');
  // Fetch slot booking details for this candidate
  useEffect(() => {
    const fetchSlotBooking = async () => {
      try {
        const { data: icData } = await supabase
          .from('interview_candidates')
          .select('candidate_id')
          .eq('id', interviewCandidateId)
          .single();

        if (icData?.candidate_id) {
          const { data: bookings } = await supabase
            .from('slot_bookings')
            .select('id, booking_date, booking_time, status, subject, updated_at, created_at, observer_email, demo_meet_link, demo_meet_type, preferred_slots, booking_type')
            .eq('candidate_id', icData.candidate_id)
            .order('created_at', { ascending: false });

          const demoBooking = bookings?.find(b => 
            b.subject?.toLowerCase().includes('demo') || b.booking_type === 'demo_round' || b.booking_type === 'demo_interview'
          ) || null;
          
          setSlotBooking(demoBooking ? { ...demoBooking, preferred_slots: (demoBooking.preferred_slots as any) || null } : null);
          if (demoBooking?.observer_email) {
            const emails = demoBooking.observer_email.split(',').map((e: string) => e.trim()).filter(Boolean);
            setObserverEmails(emails);
          }

          // Find Written Test slot booking
          const writtenTestBooking = bookings?.find(b => 
            b.subject?.toLowerCase().includes('written test')
          ) || null;
          setWrittenTestSlotBooking(writtenTestBooking);

          // Find Segment Round slot booking
          const segmentBooking = bookings?.find(b => 
            b.subject?.toLowerCase().includes('segment') || b.booking_type === 'segment_round'
          ) || null;
          setSegmentSlotBooking(segmentBooking ? { ...segmentBooking, preferred_slots: (segmentBooking.preferred_slots as any) || null } : null);
          if (segmentBooking?.observer_email) {
            const emails = segmentBooking.observer_email.split(',').map((e: string) => e.trim()).filter(Boolean);
            setSegmentObserverEmails(emails);
          }

          // Find Admin & Academic Round slot booking
          const adminBooking = bookings?.find(b => 
            b.subject?.toLowerCase().includes('admin') || b.booking_type === 'admin_academic_round'
          ) || null;
          setAdminSlotBooking(adminBooking ? { ...adminBooking, preferred_slots: (adminBooking.preferred_slots as any) || null } : null);
          if (adminBooking?.observer_email) {
            const emails = adminBooking.observer_email.split(',').map((e: string) => e.trim()).filter(Boolean);
            setAdminObserverEmails(emails);
          }

          // Find HR Round slot booking
          const hrBooking = bookings?.find(b => 
            b.subject?.toLowerCase().includes('hr') || b.booking_type === 'hr_round'
          ) || null;
          
          setHrSlotBooking(hrBooking ? { ...hrBooking, preferred_slots: (hrBooking.preferred_slots as any) || null } : null);
          if (hrBooking?.observer_email) {
            const emails = hrBooking.observer_email.split(',').map((e: string) => e.trim()).filter(Boolean);
            setHrObserverEmails(emails);
          }
        }
      } catch (err) {
        console.error('Error fetching slot booking:', err);
      }
    };
    fetchSlotBooking();
  }, [interviewCandidateId]);

  const handleEditSlot = () => {
    if (slotBooking) {
      setEditDate(slotBooking.booking_date);
      setEditTime(slotBooking.booking_time);
      setIsEditingSlot(true);
    }
  };

  const handleSaveSlotEdit = async () => {
    if (!slotBooking || !editDate || !editTime) return;
    setIsSavingSlot(true);
    try {
      const { error } = await supabase
        .from('slot_bookings')
        .update({ booking_date: editDate, booking_time: editTime, updated_at: new Date().toISOString() })
        .eq('id', slotBooking.id);

      if (error) throw error;
      setSlotBooking({ ...slotBooking, booking_date: editDate, booking_time: editTime, updated_at: new Date().toISOString() });
      setIsEditingSlot(false);
      toast.success('Slot booking updated');
    } catch (err) {
      console.error('Error updating slot booking:', err);
      toast.error('Failed to update slot booking');
    } finally {
      setIsSavingSlot(false);
    }
  };

  // Confirm a preferred slot for demo booking
  const handleConfirmPreferredSlot = async () => {
    if (!slotBooking || selectedPreferredSlot === null || !slotBooking.preferred_slots) return;
    const chosen = slotBooking.preferred_slots[selectedPreferredSlot];
    if (!chosen) return;

    // Validate meeting link for Google Meet / Zoom
    if ((demoMeetType === 'google_meet' || demoMeetType === 'zoom_meet') && !demoMeetLink.trim()) {
      toast.error('Please enter a meeting link before confirming');
      return;
    }

    setIsConfirmingSlot(true);
    try {
      // Save confirmed slot + meeting link + type
      const { error } = await supabase
        .from('slot_bookings')
        .update({ 
          booking_date: chosen.date, 
          booking_time: chosen.time, 
          status: 'confirmed',
          demo_meet_link: (demoMeetType === 'google_meet' || demoMeetType === 'zoom_meet') ? demoMeetLink.trim() : null,
          demo_meet_type: demoMeetType,
          updated_at: new Date().toISOString() 
        })
        .eq('id', slotBooking.id);

      if (error) throw error;

      setSlotBooking({ ...slotBooking, booking_date: chosen.date, booking_time: chosen.time, status: 'confirmed', demo_meet_link: demoMeetLink.trim(), demo_meet_type: demoMeetType });

      // Auto-advance to Demo Round
      try {
        await supabase.functions.invoke('process-interview-stage', {
          body: {
            interviewCandidateId,
            action: 'advance',
            feedback: `Employer confirmed demo slot: ${chosen.date} at ${chosen.time} via ${demoMeetType}`,
          }
        });
      } catch (advanceErr) {
        console.error('Error auto-advancing:', advanceErr);
      }

      // Send demo round emails with meeting link to candidate AND observers
      try {
        await supabase.functions.invoke('send-demo-round-emails', {
          body: { 
            interviewCandidateId,
            observerEmail: observerEmails.length > 0 ? observerEmails.join(',') : undefined,
            meetLink: (demoMeetType === 'google_meet' || demoMeetType === 'zoom_meet') ? demoMeetLink.trim() : undefined,
            meetType: (demoMeetType === 'google_meet' || demoMeetType === 'zoom_meet') ? 'manual_link' : 'ai_video',
          }
        });
      } catch (emailErr) {
        console.error('Error sending demo emails:', emailErr);
      }

      toast.success(`Demo slot confirmed! Invitations sent`, {
        description: `Meeting link sent to candidate${observerEmails.length > 0 ? ` and ${observerEmails.length} observer(s)` : ''}. Feedback email will follow shortly.`,
        duration: 5000,
      });

      // Auto-advance to Demo Feedback and send feedback email after a short delay
      setTimeout(async () => {
        try {
          // Advance to Demo Feedback
          await supabase.functions.invoke('process-interview-stage', {
            body: {
              interviewCandidateId,
              action: 'advance',
              feedback: 'Auto-advanced to Demo Feedback after demo round invitations sent',
            }
          });
          // Send demo feedback email to observers
          await supabase.functions.invoke('send-demo-feedback-email', {
            body: { interviewCandidateId }
          });
          console.log('Demo feedback email sent to observers');
        } catch (feedbackErr) {
          console.error('Error sending feedback email:', feedbackErr);
        }
      }, 10000); // 10 seconds delay before sending feedback email

      // Trigger pipeline refresh
      window.location.reload();
    } catch (err) {
      console.error('Error confirming slot:', err);
      toast.error('Failed to confirm slot');
    } finally {
      setIsConfirmingSlot(false);
    }
  };

  const handleAddObserverEmail = async () => {
    if (!slotBooking || !observerEmail.trim()) return;
    const email = observerEmail.trim().toLowerCase();
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (observerEmails.includes(email)) {
      toast.error('This email is already added');
      return;
    }
    setIsSavingObserver(true);
    try {
      const updatedEmails = [...observerEmails, email];
      const { error } = await supabase
        .from('slot_bookings')
        .update({ observer_email: updatedEmails.join(','), updated_at: new Date().toISOString() })
        .eq('id', slotBooking.id);

      if (error) throw error;
      setObserverEmails(updatedEmails);
      setSlotBooking({ ...slotBooking, observer_email: updatedEmails.join(','), updated_at: new Date().toISOString() });
      setObserverEmail('');
      toast.success('Observer email added');
    } catch (err) {
      console.error('Error saving observer email:', err);
      toast.error('Failed to save observer email');
    } finally {
      setIsSavingObserver(false);
    }
  };

  const handleRemoveObserverEmail = async (emailToRemove: string) => {
    if (!slotBooking) return;
    setIsSavingObserver(true);
    try {
      const updatedEmails = observerEmails.filter(e => e !== emailToRemove);
      const { error } = await supabase
        .from('slot_bookings')
        .update({ observer_email: updatedEmails.join(',') || null, updated_at: new Date().toISOString() })
        .eq('id', slotBooking.id);

      if (error) throw error;
      setObserverEmails(updatedEmails);
      setSlotBooking({ ...slotBooking, observer_email: updatedEmails.join(',') || null, updated_at: new Date().toISOString() });
      toast.success('Observer email removed');
    } catch (err) {
      console.error('Error removing observer email:', err);
      toast.error('Failed to remove observer email');
    } finally {
      setIsSavingObserver(false);
    }
  };

  const isSlotEdited = slotBooking && slotBooking.updated_at !== slotBooking.created_at;
  const isWrittenTestSlotEdited = writtenTestSlotBooking && writtenTestSlotBooking.updated_at !== writtenTestSlotBooking.created_at;
  const isHrSlotEdited = hrSlotBooking && hrSlotBooking.updated_at !== hrSlotBooking.created_at;

  // Written Test Slot Booking handlers
  const handleEditWrittenTestSlot = () => {
    if (writtenTestSlotBooking) {
      setEditWrittenTestDate(writtenTestSlotBooking.booking_date);
      setEditWrittenTestTime(writtenTestSlotBooking.booking_time);
      setIsEditingWrittenTestSlot(true);
    }
  };

  const handleSaveWrittenTestSlotEdit = async () => {
    if (!writtenTestSlotBooking || !editWrittenTestDate || !editWrittenTestTime) return;
    setIsSavingWrittenTestSlot(true);
    try {
      const { error } = await supabase
        .from('slot_bookings')
        .update({ booking_date: editWrittenTestDate, booking_time: editWrittenTestTime, updated_at: new Date().toISOString() })
        .eq('id', writtenTestSlotBooking.id);
      if (error) throw error;
      setWrittenTestSlotBooking({ ...writtenTestSlotBooking, booking_date: editWrittenTestDate, booking_time: editWrittenTestTime, updated_at: new Date().toISOString() });
      setIsEditingWrittenTestSlot(false);
      toast.success('Written Test slot booking updated');
    } catch (err) {
      console.error('Error updating Written Test slot booking:', err);
      toast.error('Failed to update Written Test slot booking');
    } finally {
      setIsSavingWrittenTestSlot(false);
    }
  };

  // HR Round Slot Booking handlers
  const handleEditHrSlot = () => {
    if (hrSlotBooking) {
      setEditHrDate(hrSlotBooking.booking_date);
      setEditHrTime(hrSlotBooking.booking_time);
      setIsEditingHrSlot(true);
    }
  };

  const handleSaveHrSlotEdit = async () => {
    if (!hrSlotBooking || !editHrDate || !editHrTime) return;
    setIsSavingHrSlot(true);
    try {
      const { error } = await supabase
        .from('slot_bookings')
        .update({ booking_date: editHrDate, booking_time: editHrTime, updated_at: new Date().toISOString() })
        .eq('id', hrSlotBooking.id);
      if (error) throw error;
      setHrSlotBooking({ ...hrSlotBooking, booking_date: editHrDate, booking_time: editHrTime, updated_at: new Date().toISOString() });
      setIsEditingHrSlot(false);
      toast.success('HR slot booking updated');
    } catch (err) {
      console.error('Error updating HR slot booking:', err);
      toast.error('Failed to update HR slot booking');
    } finally {
      setIsSavingHrSlot(false);
    }
  };

  const handleAddHrObserverEmail = async () => {
    if (!hrSlotBooking || !hrObserverEmail.trim()) return;
    const email = hrObserverEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    if (hrObserverEmails.includes(email)) {
      toast.error('This email is already added');
      return;
    }
    setIsSavingHrObserver(true);
    try {
      const updatedEmails = [...hrObserverEmails, email];
      const { error } = await supabase
        .from('slot_bookings')
        .update({ observer_email: updatedEmails.join(','), updated_at: new Date().toISOString() })
        .eq('id', hrSlotBooking.id);
      if (error) throw error;
      setHrObserverEmails(updatedEmails);
      setHrSlotBooking({ ...hrSlotBooking, observer_email: updatedEmails.join(','), updated_at: new Date().toISOString() });
      setHrObserverEmail('');
      toast.success('Observer email added');
    } catch (err) {
      console.error('Error saving HR observer email:', err);
      toast.error('Failed to save observer email');
    } finally {
      setIsSavingHrObserver(false);
    }
  };

  const handleRemoveHrObserverEmail = async (emailToRemove: string) => {
    if (!hrSlotBooking) return;
    setIsSavingHrObserver(true);
    try {
      const updatedEmails = hrObserverEmails.filter(e => e !== emailToRemove);
      const { error } = await supabase
        .from('slot_bookings')
        .update({ observer_email: updatedEmails.join(',') || null, updated_at: new Date().toISOString() })
        .eq('id', hrSlotBooking.id);
      if (error) throw error;
      setHrObserverEmails(updatedEmails);
      setHrSlotBooking({ ...hrSlotBooking, observer_email: updatedEmails.join(',') || null, updated_at: new Date().toISOString() });
      toast.success('Observer email removed');
    } catch (err) {
      console.error('Error removing HR observer email:', err);
      toast.error('Failed to remove observer email');
    } finally {
      setIsSavingHrObserver(false);
    }
  };

  // Confirm a preferred slot for HR booking
  const handleConfirmHrPreferredSlot = async () => {
    if (!hrSlotBooking || selectedHrPreferredSlot === null || !hrSlotBooking.preferred_slots) return;
    const chosen = hrSlotBooking.preferred_slots[selectedHrPreferredSlot];
    if (!chosen) return;

    // Validate meeting link
    if (!hrMeetLink.trim()) {
      toast.error('Please enter a meeting link before confirming');
      return;
    }

    setIsConfirmingHrSlot(true);
    try {
      const { error } = await supabase
        .from('slot_bookings')
        .update({ 
          booking_date: chosen.date, 
          booking_time: chosen.time, 
          status: 'confirmed',
          demo_meet_link: hrMeetLink.trim(),
          demo_meet_type: hrMeetType,
          updated_at: new Date().toISOString() 
        })
        .eq('id', hrSlotBooking.id);
      if (!error) {
        setHrSlotBooking({ ...hrSlotBooking, booking_date: chosen.date, booking_time: chosen.time, status: 'confirmed' });
        setSelectedHrPreferredSlot(null);
        toast.success('HR slot confirmed with meeting link!');

        // Auto-advance to HR Round stage
        try {
          await supabase.functions.invoke('process-interview-stage', {
            body: {
              interviewCandidateId,
              action: 'advance',
              feedback: `Employer confirmed HR slot: ${chosen.date} at ${chosen.time} via ${hrMeetType}`,
            }
          });
        } catch (advErr) {
          console.error('Error advancing to HR Round:', advErr);
        }

        // Send HR round invitation emails to candidate and observers
        try {
          await supabase.functions.invoke('send-hr-round-emails', {
            body: {
              interviewCandidateId,
              observerEmail: hrObserverEmails.length > 0 ? hrObserverEmails.join(',') : undefined,
              meetLink: hrMeetLink.trim(),
              meetType: hrMeetType,
              confirmedDate: chosen.date,
              confirmedTime: chosen.time,
            }
          });
          toast.success('HR Round invitation emails sent!');
        } catch (emailErr) {
          console.error('Error sending HR round emails:', emailErr);
        }

        // Send slot confirmation email
        try {
          await supabase.functions.invoke('send-demo-slot-confirmed', {
            body: {
              interviewCandidateId,
              confirmedDate: chosen.date,
              confirmedTime: chosen.time,
            },
          });
        } catch (emailErr) {
          console.error('Error sending HR slot confirmed email:', emailErr);
        }

        // Auto-advance to HR Feedback after 10 seconds (simulating HR round completion)
        setTimeout(async () => {
          try {
            toast.info('HR Round finishing... advancing to HR Feedback');
            await supabase.functions.invoke('process-interview-stage', {
              body: {
                interviewCandidateId,
                action: 'advance',
                feedback: 'HR Round completed, advancing to HR Feedback',
              }
            });

            // Send HR feedback email to observers
            await supabase.functions.invoke('send-hr-feedback-email', {
              body: { interviewCandidateId }
            });
            toast.success('HR Feedback request sent to observers!');
          } catch (feedbackErr) {
            console.error('Error auto-advancing to HR Feedback:', feedbackErr);
          }
        }, 10000);
      }
    } catch (err) {
      console.error('Error confirming HR slot:', err);
      toast.error('Failed to confirm slot');
    } finally {
      setIsConfirmingHrSlot(false);
    }
  };

  const filteredSteps = getVisibleInterviewSteps(interviewSteps);
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
                
                {/* Written Test Slot Booking Details */}
                {step.title === 'Written Test Slot Booking' && writtenTestSlotBooking && (
                  <div className="mt-2 bg-orange-50 border border-orange-200 rounded-md p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-orange-700">
                        <Calendar className="h-3 w-3" />
                        Slot Booked
                        {isWrittenTestSlotEdited && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-400 text-amber-600 bg-amber-50">
                            Edited
                          </Badge>
                        )}
                      </div>
                      {!isEditingWrittenTestSlot && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[10px] px-1.5 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                          onClick={(e) => { e.stopPropagation(); handleEditWrittenTestSlot(); }}
                        >
                          ✏️ Edit
                        </Button>
                      )}
                    </div>

                    {isEditingWrittenTestSlot ? (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={editWrittenTestDate}
                            onChange={(e) => setEditWrittenTestDate(e.target.value)}
                            className="h-7 text-xs flex-1"
                          />
                          <Input
                            type="time"
                            value={editWrittenTestTime}
                            onChange={(e) => setEditWrittenTestTime(e.target.value)}
                            className="h-7 text-xs w-28"
                          />
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={handleSaveWrittenTestSlotEdit}
                            disabled={isSavingWrittenTestSlot || !editWrittenTestDate || !editWrittenTestTime}
                          >
                            {isSavingWrittenTestSlot ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] px-2"
                            onClick={() => setIsEditingWrittenTestSlot(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-700 border-orange-200">
                          📅 {new Date(writtenTestSlotBooking.booking_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] bg-orange-100 text-orange-700 border-orange-200">
                          🕐 {writtenTestSlotBooking.booking_time}
                        </Badge>
                        <Badge className={`text-[10px] py-0 ${
                          writtenTestSlotBooking.status === 'confirmed' 
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                            : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        }`}>
                          {writtenTestSlotBooking.status === 'confirmed' ? '✓ Confirmed' : writtenTestSlotBooking.status}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Slot Booking Details for Demo/Segment/Admin Slot Booking stages */}
                {(() => {
                  const activeBooking = step.title === 'Segment Round Slot Booking' ? segmentSlotBooking 
                    : step.title === 'Admin & Academic Round Slot Booking' ? adminSlotBooking 
                    : step.title === 'Demo Slot Booking' ? slotBooking : null;
                  const activeObserverEmails = step.title === 'Segment Round Slot Booking' ? segmentObserverEmails
                    : step.title === 'Admin & Academic Round Slot Booking' ? adminObserverEmails
                    : observerEmails;
                  if (!(step.title === 'Demo Slot Booking' || step.title === 'Segment Round Slot Booking' || step.title === 'Admin & Academic Round Slot Booking')) return null;
                  return activeBooking ? (
                  <div className="mt-2 bg-purple-50 border border-purple-200 rounded-md p-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-purple-700">
                      <Calendar className="h-3 w-3" />
                      {slotBooking.preferred_slots && slotBooking.preferred_slots.length > 0 
                        ? `Candidate's Preferred Timings (${slotBooking.preferred_slots.length})`
                        : 'Slot Booked'}
                    </div>

                    {/* If preferred_slots exist, show them for employer to pick */}
                    {slotBooking.preferred_slots && slotBooking.preferred_slots.length > 0 && slotBooking.status !== 'confirmed' ? (
                      <div className="space-y-1.5">
                        {/* Show date once since all slots share the same date */}
                        <div className="flex items-center gap-1.5 text-[10px] text-purple-600 font-medium">
                          📅 {new Date(slotBooking.preferred_slots[0].date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        {slotBooking.preferred_slots.map((slot, i) => {
                          const hour = parseInt(slot.time.split(':')[0]);
                          const minute = slot.time.split(':')[1];
                          const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                          const ampm = hour < 12 ? 'AM' : 'PM';
                          const timeLabel = `${displayHour}:${minute} ${ampm}`;
                          return (
                            <label
                              key={i}
                              className={`flex items-center gap-2 p-2 rounded-md border cursor-pointer transition-colors ${
                                selectedPreferredSlot === i 
                                  ? 'border-purple-500 bg-purple-100' 
                                  : 'border-purple-200 bg-white hover:bg-purple-50'
                              }`}
                              onClick={() => setSelectedPreferredSlot(i)}
                            >
                              <input
                                type="radio"
                                name="preferred-slot"
                                checked={selectedPreferredSlot === i}
                                onChange={() => setSelectedPreferredSlot(i)}
                                className="accent-purple-600"
                              />
                              <Badge variant="outline" className="text-[9px] px-1 py-0 border-purple-400 text-purple-600">
                                Option {i + 1}
                              </Badge>
                              <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">
                                🕐 {timeLabel}
                              </Badge>
                            </label>
                          );
                        })}
                        
                        {/* Meeting Type Selection */}
                        <div className="mt-2 pt-2 border-t border-purple-200 space-y-1.5">
                          <label className="text-[10px] font-medium text-purple-700 flex items-center gap-1">
                            <Video className="h-3 w-3" />
                            Meeting Type
                          </label>
                          <div className="grid grid-cols-3 gap-1">
                            <Button
                              size="sm"
                              variant={demoMeetType === 'ai_video' ? 'default' : 'outline'}
                              className={`h-6 text-[9px] px-1 ${
                                demoMeetType === 'ai_video'
                                  ? 'bg-pink-600 hover:bg-pink-700 text-white'
                                  : 'border-pink-300 text-pink-600 hover:bg-pink-50'
                              }`}
                              onClick={() => setDemoMeetType('ai_video')}
                            >
                              AI Video
                            </Button>
                            <Button
                              size="sm"
                              variant={demoMeetType === 'google_meet' ? 'default' : 'outline'}
                              className={`h-6 text-[9px] px-1 ${
                                demoMeetType === 'google_meet'
                                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                  : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                              }`}
                              onClick={() => setDemoMeetType('google_meet')}
                            >
                              Google Meet
                            </Button>
                            <Button
                              size="sm"
                              variant={demoMeetType === 'zoom_meet' ? 'default' : 'outline'}
                              className={`h-6 text-[9px] px-1 ${
                                demoMeetType === 'zoom_meet'
                                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                  : 'border-purple-300 text-purple-600 hover:bg-purple-50'
                              }`}
                              onClick={() => setDemoMeetType('zoom_meet')}
                            >
                              Zoom
                            </Button>
                          </div>
                          {(demoMeetType === 'google_meet' || demoMeetType === 'zoom_meet') && (
                            <Input
                              type="url"
                              placeholder={demoMeetType === 'google_meet' ? 'Paste Google Meet link' : 'Paste Zoom link'}
                              value={demoMeetLink}
                              onChange={(e) => setDemoMeetLink(e.target.value)}
                              className="h-6 text-[10px] border-purple-200"
                            />
                          )}
                          {demoMeetType === 'ai_video' && (
                            <p className="text-[9px] text-pink-600">Candidate will record demo via AI video platform</p>
                          )}
                        </div>

                        <Button
                          size="sm"
                          className="w-full h-7 text-[10px] bg-purple-600 hover:bg-purple-700 mt-1"
                          onClick={handleConfirmPreferredSlot}
                          disabled={selectedPreferredSlot === null || isConfirmingSlot || ((demoMeetType === 'google_meet' || demoMeetType === 'zoom_meet') && !demoMeetLink.trim())}
                        >
                          {isConfirmingSlot ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Confirming & Sending...
                            </>
                          ) : (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Confirm & Send Invitations
                            </>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Confirmed slot display */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">
                            📅 {new Date(slotBooking.booking_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-700 border-purple-200">
                            🕐 {slotBooking.booking_time}
                          </Badge>
                          <Badge className="text-[10px] py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            ✓ Confirmed
                          </Badge>
                        </div>
                      </>
                    )}

                    {/* Observer Email Input */}
                    <div className="mt-1.5 pt-1.5 border-t border-purple-200 space-y-1">
                      <label className="text-[10px] font-medium text-purple-700 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Observer/Employer Emails
                      </label>
                      <div className="flex gap-1.5">
                        <Input
                          type="email"
                          placeholder="Add email address"
                          value={observerEmail}
                          onChange={(e) => setObserverEmail(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddObserverEmail(); }}}
                          className="h-6 text-[10px] flex-1 border-purple-200"
                        />
                        <Button
                          size="sm"
                          className="h-6 text-[9px] px-2 bg-purple-600 hover:bg-purple-700"
                          onClick={handleAddObserverEmail}
                          disabled={isSavingObserver || !observerEmail.trim()}
                        >
                          {isSavingObserver ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        </Button>
                      </div>
                      {observerEmails.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {observerEmails.map((email) => (
                            <Badge key={email} variant="secondary" className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="h-2.5 w-2.5" />
                              {email}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleRemoveObserverEmail(email); }}
                                className="ml-0.5 hover:text-red-500 transition-colors"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-[9px] text-muted-foreground">
                        These emails will receive notifications when the Demo Round starts
                      </p>
                    </div>
                  </div>
                ) : (step.status === 'completed' || step.status === 'current') && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-md p-2">
                    <div className="flex items-center gap-1.5 text-xs text-amber-700">
                      <Calendar className="h-3 w-3" />
                      No slot booking found — stage was manually advanced
                    </div>
                  </div>
                ))}

                {/* Meeting Round Options - Show for Demo, Segment, Admin & Academic, and HR Rounds */}
                {(step.title === 'Demo Round' || step.title === 'Segment Round' || step.title === 'Admin & Academic Round' || step.title === 'HR Round') && (step.status === 'current' || step.status === 'in_progress' || step.status === 'completed') && (
                  <DemoRoundOptions
                    interviewCandidateId={interviewCandidateId}
                    candidateName={candidateName}
                    observerEmail={slotBooking?.observer_email || observerEmails.join(',') || undefined}
                    existingMeetLink={slotBooking?.demo_meet_link || undefined}
                    existingMeetType={slotBooking?.demo_meet_type || undefined}
                    onUpdate={() => {}}
                  />
                )}

                {/* Feedback Results - Show for Demo, Segment, Admin & Academic, and HR Feedback */}
                {step.title === 'Demo Feedback' && (step.status === 'current' || step.status === 'completed' || step.status === 'in_progress') && (
                  <DemoFeedbackResults
                    interviewCandidateId={interviewCandidateId}
                    feedbackType="demo"
                    onAllSubmitted={onRefresh}
                    stageStatus={step.status}
                  />
                )}
                {step.title === 'Segment Feedback' && (step.status === 'current' || step.status === 'completed' || step.status === 'in_progress') && (
                  <DemoFeedbackResults
                    interviewCandidateId={interviewCandidateId}
                    feedbackType="segment"
                    onAllSubmitted={onRefresh}
                    stageStatus={step.status}
                  />
                )}
                {step.title === 'Admin & Academic Feedback' && (step.status === 'current' || step.status === 'completed' || step.status === 'in_progress') && (
                  <DemoFeedbackResults
                    interviewCandidateId={interviewCandidateId}
                    feedbackType="admin_academic"
                    onAllSubmitted={onRefresh}
                    stageStatus={step.status}
                  />
                )}
                {step.title === 'HR Feedback' && (step.status === 'current' || step.status === 'completed' || step.status === 'in_progress') && (
                  <DemoFeedbackResults
                    interviewCandidateId={interviewCandidateId}
                    feedbackType="hr"
                    onAllSubmitted={onRefresh}
                    stageStatus={step.status}
                  />
                )}

                {/* HR Round Slot Booking Details */}
                {step.title === 'HR Round Slot Booking' && hrSlotBooking && (
                  <div className="mt-2 bg-indigo-50 border border-indigo-200 rounded-md p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-indigo-700">
                        <Calendar className="h-3 w-3" />
                        {hrSlotBooking.preferred_slots && hrSlotBooking.preferred_slots.length > 0 
                          ? `Candidate's Preferred Timings (${hrSlotBooking.preferred_slots.length})`
                          : 'Slot Booked'}
                        {isHrSlotEdited && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-400 text-amber-600 bg-amber-50">
                            Edited
                          </Badge>
                        )}
                      </div>
                      {!isEditingHrSlot && !(hrSlotBooking.preferred_slots && hrSlotBooking.preferred_slots.length > 0 && hrSlotBooking.status !== 'confirmed') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[10px] px-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
                          onClick={(e) => { e.stopPropagation(); handleEditHrSlot(); }}
                        >
                          ✏️ Edit
                        </Button>
                      )}
                    </div>

                    {isEditingHrSlot ? (
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={editHrDate}
                            onChange={(e) => setEditHrDate(e.target.value)}
                            className="h-7 text-xs flex-1"
                          />
                          <Input
                            type="time"
                            value={editHrTime}
                            onChange={(e) => setEditHrTime(e.target.value)}
                            className="h-7 text-xs w-28"
                          />
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="h-6 text-[10px] px-2"
                            onClick={handleSaveHrSlotEdit}
                            disabled={isSavingHrSlot || !editHrDate || !editHrTime}
                          >
                            {isSavingHrSlot ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-[10px] px-2"
                            onClick={() => setIsEditingHrSlot(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* If preferred_slots exist, show them for employer to pick */}
                        {hrSlotBooking.preferred_slots && hrSlotBooking.preferred_slots.length > 0 && hrSlotBooking.status !== 'confirmed' ? (
                          <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
                            {/* Show date once since all slots share the same date */}
                            <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-medium">
                              📅 {new Date(hrSlotBooking.preferred_slots[0].date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            {hrSlotBooking.preferred_slots.map((slot, i) => {
                              const hour = parseInt(slot.time.split(':')[0]);
                              const minute = slot.time.split(':')[1];
                              const displayHour = hour % 12 || 12;
                              const ampm = hour < 12 ? 'AM' : 'PM';
                              const timeLabel = `${displayHour}:${minute} ${ampm}`;
                              return (
                                <label key={i} className={`flex items-center gap-2 p-1.5 rounded border cursor-pointer transition-all ${
                                  selectedHrPreferredSlot === i 
                                    ? 'border-indigo-400 bg-indigo-100 ring-1 ring-indigo-300' 
                                    : 'border-indigo-200 hover:bg-indigo-100/50'
                                }`}>
                                  <input 
                                    type="radio" 
                                    name="hr-preferred-slot" 
                                    checked={selectedHrPreferredSlot === i} 
                                    onChange={() => setSelectedHrPreferredSlot(i)}
                                    className="accent-indigo-600"
                                  />
                                  <Badge variant="outline" className="text-[9px] px-1.5 border-indigo-300 text-indigo-600">
                                    Option {i + 1}
                                  </Badge>
                                  <Badge variant="secondary" className="text-[9px] bg-indigo-100 text-indigo-700 border-indigo-200">
                                    🕐 {timeLabel}
                                  </Badge>
                                </label>
                              );
                            })}
                            
                            {/* HR Meeting Type Selection */}
                            <div className="mt-2 pt-2 border-t border-indigo-200 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                              <label className="text-[10px] font-medium text-indigo-700 flex items-center gap-1">
                                <Video className="h-3 w-3" />
                                Meeting Type
                              </label>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant={hrMeetType === 'google_meet' ? 'default' : 'outline'}
                                  className={`h-6 text-[9px] px-1.5 ${
                                    hrMeetType === 'google_meet'
                                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                      : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                                  }`}
                                  onClick={() => setHrMeetType('google_meet')}
                                >
                                  Google Meet
                                </Button>
                                <Button
                                  size="sm"
                                  variant={hrMeetType === 'zoom_meet' ? 'default' : 'outline'}
                                  className={`h-6 text-[9px] px-1.5 ${
                                    hrMeetType === 'zoom_meet'
                                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                                      : 'border-purple-300 text-purple-600 hover:bg-purple-50'
                                  }`}
                                  onClick={() => setHrMeetType('zoom_meet')}
                                >
                                  Zoom
                                </Button>
                              </div>
                              <Input
                                type="url"
                                placeholder={hrMeetType === 'google_meet' ? 'Paste Google Meet link' : 'Paste Zoom link'}
                                value={hrMeetLink}
                                onChange={(e) => setHrMeetLink(e.target.value)}
                                className="h-6 text-[10px] border-indigo-200"
                              />
                            </div>

                            <Button
                              size="sm"
                              className="h-6 text-[10px] px-3 mt-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={handleConfirmHrPreferredSlot}
                              disabled={selectedHrPreferredSlot === null || isConfirmingHrSlot || !hrMeetLink.trim()}
                            >
                              {isConfirmingHrSlot ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                              Confirm Slot & Send Invitations
                            </Button>
                          </div>
                        ) : hrSlotBooking.preferred_slots && hrSlotBooking.preferred_slots.length > 0 && hrSlotBooking.status === 'confirmed' ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-medium">
                              📅 {new Date(hrSlotBooking.preferred_slots[0].date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            {hrSlotBooking.preferred_slots.map((slot, i) => {
                              const hour = parseInt(slot.time.split(':')[0]);
                              const minute = slot.time.split(':')[1];
                              const displayHour = hour % 12 || 12;
                              const ampm = hour < 12 ? 'AM' : 'PM';
                              const timeLabel = `${displayHour}:${minute} ${ampm}`;
                              const isConfirmed = slot.date === hrSlotBooking.booking_date && slot.time === hrSlotBooking.booking_time;
                              return (
                                <div key={i} className={`flex items-center gap-2 p-1.5 rounded border ${
                                  isConfirmed ? 'border-emerald-300 bg-emerald-50' : 'border-indigo-200 opacity-50'
                                }`}>
                                  <Badge variant="outline" className="text-[9px] px-1.5 border-indigo-300 text-indigo-600">
                                    Option {i + 1}
                                  </Badge>
                                  <Badge variant="secondary" className="text-[9px] bg-indigo-100 text-indigo-700 border-indigo-200">
                                    🕐 {timeLabel}
                                  </Badge>
                                  {isConfirmed && (
                                    <Badge className="ml-auto text-[9px] bg-emerald-100 text-emerald-700 border-emerald-300">
                                      ✓ Confirmed
                                    </Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200">
                              📅 {new Date(hrSlotBooking.booking_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700 border-indigo-200">
                              🕐 {hrSlotBooking.booking_time}
                            </Badge>
                            <Badge className={`text-[10px] py-0 ${
                              hrSlotBooking.status === 'confirmed' 
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            }`}>
                              {hrSlotBooking.status === 'confirmed' ? '✓ Confirmed' : hrSlotBooking.status}
                            </Badge>
                          </div>
                        )}
                        {hrSlotBooking.subject && (
                          <p className="text-[10px] text-muted-foreground">Stage: {hrSlotBooking.subject}</p>
                        )}
                        
                        {/* Observer Email Input - Multiple Emails for HR Round */}
                        <div className="mt-1.5 pt-1.5 border-t border-indigo-200 space-y-1" onClick={(e) => e.stopPropagation()}>
                          <label className="text-[10px] font-medium text-indigo-700 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            Observer/Employer Emails
                          </label>
                          <div className="flex gap-1.5">
                            <Input
                              type="email"
                              placeholder="Add email address"
                              value={hrObserverEmail}
                              onChange={(e) => setHrObserverEmail(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddHrObserverEmail(); }}}
                              className="h-6 text-[10px] flex-1 border-indigo-200"
                            />
                            <Button
                              size="sm"
                              className="h-6 text-[9px] px-2 bg-indigo-600 hover:bg-indigo-700"
                              onClick={handleAddHrObserverEmail}
                              disabled={isSavingHrObserver || !hrObserverEmail.trim()}
                            >
                              {isSavingHrObserver ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                            </Button>
                          </div>
                          {hrObserverEmails.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {hrObserverEmails.map((email) => (
                                <Badge key={email} variant="secondary" className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                                  <CheckCircle2 className="h-2.5 w-2.5" />
                                  {email}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRemoveHrObserverEmail(email); }}
                                    className="ml-0.5 hover:text-red-500 transition-colors"
                                  >
                                    <X className="h-2.5 w-2.5" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                          )}
                          <p className="text-[9px] text-muted-foreground">
                            These emails will receive notifications when the HR Round starts
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* HR Round - Schedule Meeting button is provided via StageActionButtons */}

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
                    onSendOfferLetter={() => setOfferLetterModalOpen(true)}
                  />
                </div>

                {(step.status === "current" || step.status === "completed") && (
                  <StageRecordingPlayer
                    interviewCandidateId={interviewCandidateId}
                    stageId={step.id}
                    stageName={step.title}
                    showLinkForPending={step.status === "current"}
                  />
                )}

                {/* Final Review - Show all stages review summary below action buttons */}
                {step.title === 'Final Review' && (step.status === 'current' || step.status === 'completed' || step.status === 'in_progress') && (
                  <AllStagesReviewSummary interviewCandidateId={interviewCandidateId} />
                )}
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

      {/* Offer Letter Modal */}
      <OfferLetterModal
        isOpen={offerLetterModalOpen}
        onClose={() => setOfferLetterModalOpen(false)}
        placementId={interviewCandidateId}
        candidateName={candidateName}
        candidateEmail={candidateEmail}
        onSuccess={() => {
          setOfferLetterModalOpen(false);
          toast.success('Offer letter sent successfully!');
        }}
      />
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
  onUpdateStep: (stepId: string, status: InterviewStep["status"], skipEmail?: boolean) => void;
  onRefresh?: () => void;
}) => {
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedStageForSchedule, setSelectedStageForSchedule] = useState<InterviewStep | null>(null);
  const [jobInterviewType, setJobInterviewType] = useState<string | null>(null);
  const [showAIInterviewDialog, setShowAIInterviewDialog] = useState(false);
  const [isStartingInterview, setIsStartingInterview] = useState(false);
  const [isRestartingInterview, setIsRestartingInterview] = useState(false);
  
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

  const visibleInterviewSteps = getVisibleInterviewSteps(candidate.interviewSteps);
  const completedSteps = visibleInterviewSteps.filter(s => s.status === "completed").length;
  const progress = visibleInterviewSteps.length > 0 ? (completedSteps / visibleInterviewSteps.length) * 100 : 0;
  const allStagesCompleted = completedSteps === visibleInterviewSteps.length;
  const hasStarted = completedSteps > 0 || visibleInterviewSteps.some(s => s.status === "current" || s.status === "in_progress");

   // Start Interview - triggers full auto pipeline: instruction email → CV results → slot booking
  const handleStartInterview = async () => {
    setIsStartingInterview(true);
    try {
      const instructionStep = candidate.interviewSteps.find(s => s.title === 'Interview Guidelines');
      
      if (!instructionStep) {
        const firstStep = candidate.interviewSteps.find(s => s.status === "current" || s.status === "pending");
        if (!firstStep) {
          toast.error("No pending stages to start");
          return;
        }
        onUpdateStep(firstStep.id, "current", true);
        toast.success(`Interview started for ${firstStep.title}`);
        return;
      }

      // Mark Interview Guidelines as completed
      onUpdateStep(instructionStep.id, "completed", true);

      // Trigger the full post-application pipeline (instruction email → CV results → slot booking)
      // This runs sequentially in the edge function: each email + stage advancement
      const { error: pipelineError } = await supabase.functions.invoke('post-application-pipeline', {
        body: {
          interviewCandidateId: candidate.interviewCandidateId,
        },
      });

      if (pipelineError) throw pipelineError;

      toast.success(`Interview started! Full pipeline triggered for ${candidate.name}`, {
        description: `All stage emails will be sent automatically: Instruction → CV Results → Written Test → Demo → HR → Final Review → Offer`,
        duration: 8000,
      });

      // Refresh data to show updated stages
      onRefresh?.();
    } catch (error) {
      console.error('Error starting interview:', error);
      toast.error('Failed to start interview pipeline');
    } finally {
      setIsStartingInterview(false);
    }
  };

  // Reset Interview - clears all progress so Start Interview begins from first stage
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const handleResetInterview = async () => {
    setIsRestartingInterview(true);
    setShowResetConfirm(false);
    try {
      // Get all stages to find the first one
      const { data: allStages } = await supabase
        .from('interview_stages')
        .select('id, name, stage_order')
        .order('stage_order', { ascending: true });

      if (!allStages || allStages.length === 0) {
        toast.error("No interview stages found");
        return;
      }

      const firstStage = allStages[0];

      // Delete all interview events for this candidate first (before resetting candidate)
      const { data: existingEvents } = await supabase
        .from('interview_events')
        .select('id')
        .eq('interview_candidate_id', candidate.interviewCandidateId);

      if (existingEvents && existingEvents.length > 0) {
        const eventIds = existingEvents.map(e => e.id);

        // Delete interview responses tied to these events
        await supabase
          .from('interview_responses')
          .delete()
          .in('interview_event_id', eventIds);

        // Delete interview invitations tied to these events
        await supabase
          .from('interview_invitations')
          .delete()
          .in('interview_event_id', eventIds);

        // Delete the events themselves
        await supabase
          .from('interview_events')
          .delete()
          .eq('interview_candidate_id', candidate.interviewCandidateId);
      }

      // Clear slot bookings for this candidate
      const { data: candidateData } = await supabase
        .from('interview_candidates')
        .select('candidate_id')
        .eq('id', candidate.interviewCandidateId)
        .single();

      if (candidateData?.candidate_id) {
        await supabase
          .from('slot_bookings')
          .delete()
          .eq('candidate_id', candidateData.candidate_id);
      }

      // Clear AI interview sessions for this candidate
      await supabase
        .from('ai_interview_sessions')
        .delete()
        .eq('interview_candidate_id', candidate.interviewCandidateId);

      // Clear management reviews for this candidate
      await supabase
        .from('management_reviews')
        .delete()
        .eq('interview_candidate_id', candidate.interviewCandidateId);

      // Clear offer letters for this candidate
      await supabase
        .from('offer_letters')
        .delete()
        .eq('interview_candidate_id', candidate.interviewCandidateId);

      // Reset candidate to first stage AND clear all scores/analysis
      const { error: resetError } = await supabase
        .from('interview_candidates')
        .update({
          current_stage_id: firstStage.id,
          ai_score: null,
          ai_analysis: null,
          status: 'active',
          resume_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', candidate.interviewCandidateId);

      if (resetError) throw resetError;

      toast.success('Interview reset successfully!', {
        description: 'All progress cleared. Click "Start Interview" to begin fresh.',
        duration: 4000,
      });

      // Refresh data
      onRefresh?.();
    } catch (error) {
      console.error('Error resetting interview:', error);
      toast.error('Failed to reset interview');
    } finally {
      setIsRestartingInterview(false);
    }
  };



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
                      {completedSteps} of {visibleInterviewSteps.length} steps completed
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
                <CardContent className="space-y-3">
                  {/* Start Interview & Restart Interview Buttons */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleStartInterview}
                      disabled={isStartingInterview || allStagesCompleted}
                    >
                      {isStartingInterview ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 mr-2" />
                          Start Interview
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowResetConfirm(true)}
                      disabled={isRestartingInterview || (!hasStarted && completedSteps === 0)}
                    >
                      {isRestartingInterview ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Reset Confirmation Dialog */}
                  <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset Interview Pipeline?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will clear all interview progress, slot bookings, scores, and results for {candidate.name}. 
                          After reset, click "Start Interview" to begin the process from Interview Guidelines.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleResetInterview}>
                          Yes, Reset
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <ClickableStagesList
                    interviewSteps={candidate.interviewSteps}
                    interviewCandidateId={candidate.interviewCandidateId}
                    candidateName={candidate.name}
                    candidateEmail={candidate.email}
                    jobTitle={candidate.role}
                    onUpdateStep={onUpdateStep}
                    getStepIcon={getStepIcon}
                    getStatusBadge={getStatusBadge}
                    onRefresh={onRefresh}
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
  const visibleInterviewSteps = getVisibleInterviewSteps(candidate.interviewSteps);

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
                {visibleInterviewSteps.map((step) => (
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
  const [sortBy, setSortBy] = useState<string>("newest");

  // Get all candidates from all stages and sort them
  const allCandidates = stages.flatMap(stage => stage.candidates).sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
      case "oldest":
        return new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime();
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "name_desc":
        return b.name.localeCompare(a.name);
      case "score_high":
        return (b.aiScore || 0) - (a.aiScore || 0);
      case "score_low":
        return (a.aiScore || 0) - (b.aiScore || 0);
      default:
        return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
    }
  });

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

  // Sync selectedCandidate with fresh stages data after any refetch
  useEffect(() => {
    if (selectedCandidate) {
      const updatedCandidate = stages
        .flatMap(s => s.candidates)
        .find(c => c.interviewCandidateId === selectedCandidate.interviewCandidateId);
      
      if (updatedCandidate) {
        setSelectedCandidate(updatedCandidate);
      }
    }
  }, [stages]);

  const handleUpdateStep = async (stepId: string, status: InterviewStep["status"], skipEmail?: boolean) => {
    if (!selectedCandidate) return;
    
    const dbStatus = status === "current" ? "in_progress" : status;
    await updateEventStatus(selectedCandidate.interviewCandidateId, stepId, dbStatus, undefined, skipEmail);
    
    // Refresh selected candidate data
    await refetch();
  };

  const deleteCandidateCompletely = async (interviewCandidateId: string, candidateId: string) => {
    // Get interview events for this candidate
    const { data: events } = await supabase
      .from('interview_events')
      .select('id')
      .eq('interview_candidate_id', interviewCandidateId);

    // Delete in dependency order
    if (events?.length) {
      const eventIds = events.map(e => e.id);
      await Promise.all([
        supabase.from('interview_invitations').delete().in('interview_event_id', eventIds),
        supabase.from('interview_responses').delete().in('interview_event_id', eventIds),
      ]);
    }

    // Delete all records referencing interview_candidate
    await Promise.all([
      supabase.from('interview_events').delete().eq('interview_candidate_id', interviewCandidateId),
      supabase.from('ai_interview_sessions').delete().eq('interview_candidate_id', interviewCandidateId),
      supabase.from('management_reviews').delete().eq('interview_candidate_id', interviewCandidateId),
      supabase.from('offer_letters').delete().eq('interview_candidate_id', interviewCandidateId),
      supabase.from('viva_evaluations').delete().eq('interview_candidate_id', interviewCandidateId),
      supabase.from('viva_sessions').delete().eq('interview_candidate_id', interviewCandidateId),
      supabase.from('slot_bookings').delete().eq('candidate_id', candidateId),
    ]);

    // Delete the interview candidate record itself
    const { error } = await supabase
      .from('interview_candidates')
      .delete()
      .eq('id', interviewCandidateId);

    if (error) throw error;
  };

  const handleDeleteCandidate = async () => {
    if (!deleteCandidate) return;
    
    setIsDeleting(true);
    try {
      await deleteCandidateCompletely(deleteCandidate.interviewCandidateId, deleteCandidate.id);
      toast.success('Candidate permanently removed');
      setDeleteCandidate(null);
      refetch();
    } catch (error: any) {
      console.error('Error deleting candidate:', error);
      toast.error(error.message || 'Failed to remove candidate');
    } finally {
      setIsDeleting(false);
    }
  };

  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    
    setIsBulkDeleting(true);
    try {
      const candidatesToDelete = allCandidates.filter(c => selectedIds.has(c.interviewCandidateId));
      
      for (const candidate of candidatesToDelete) {
        await deleteCandidateCompletely(candidate.interviewCandidateId, candidate.id);
      }
      
      toast.success(`${candidatesToDelete.length} candidate(s) permanently removed`);
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      refetch();
    } catch (error: any) {
      console.error('Bulk delete error:', error);
      toast.error(error.message || 'Failed to delete some candidates');
    } finally {
      setIsBulkDeleting(false);
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
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-40 h-9 text-xs">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name_asc">Name A-Z</SelectItem>
              <SelectItem value="name_desc">Name Z-A</SelectItem>
              <SelectItem value="score_high">Score: High to Low</SelectItem>
              <SelectItem value="score_low">Score: Low to High</SelectItem>
            </SelectContent>
          </Select>
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
                  <Button 
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
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

      {/* Single Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCandidate} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Candidate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <span className="font-semibold">{deleteCandidate?.name}</span>? 
              This will remove all interview records, responses, bookings, reviews, and offer letters. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCandidate}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} Candidate{selectedIds.size > 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold">{selectedIds.size} candidate{selectedIds.size > 1 ? 's' : ''}</span> and all their interview records, responses, bookings, reviews, and offer letters from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                `Delete ${selectedIds.size} Candidate${selectedIds.size > 1 ? 's' : ''}`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InterviewPipelineContent;
