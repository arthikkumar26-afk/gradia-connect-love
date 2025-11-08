import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Placement, Job, Candidate, Client } from '@/contexts/EmployerContext';
import { ChevronLeft, CheckCircle, Circle, Calendar, FileText, Upload, Check, X, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ScheduleMeetingModal from './ScheduleMeetingModal';
import BGVSection from './BGVSection';
import OfferLetterModal from './OfferLetterModal';
import CommentSection from './CommentSection';
import ScreeningTestSection from './ScreeningTestSection';
import RejectionReasonModal from './RejectionReasonModal';
import { useToast } from '@/hooks/use-toast';
import { mockUpdatePlacementStage, mockRejectPlacement, mockAddPlacementComment, mockSubmitAIEvaluation } from '@/utils/mockApi';

interface PlacementDetailProps {
  placement: Placement;
  job: Job;
  candidate: Candidate;
  client: Client;
  onBack: () => void;
  onUpdate: (placement: Placement) => void;
}

const PLACEMENT_STAGES = [
  'Shortlisted',
  'Screening Test',
  'Panel Interview',
  'Feedback',
  'BGV',
  'Confirmation',
  'Offer Letter',
] as const;

export default function PlacementDetail({
  placement,
  job,
  candidate,
  client,
  onBack,
  onUpdate,
}: PlacementDetailProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [documentsOpen, setDocumentsOpen] = useState(false);

  const currentStageIndex = PLACEMENT_STAGES.indexOf(placement.stage as any);
  const progress = placement.stage === 'Rejected' 
    ? 100 
    : placement.stage === 'Hired'
    ? 100
    : ((currentStageIndex + 1) / PLACEMENT_STAGES.length) * 100;

  const handleMoveToNextStage = async () => {
    const nextIndex = currentStageIndex + 1;
    if (nextIndex < PLACEMENT_STAGES.length) {
      const nextStage = PLACEMENT_STAGES[nextIndex];
      try {
        const updated = await mockUpdatePlacementStage(placement.id, nextStage, 'Moving to next stage');
        onUpdate(updated);
        toast({ title: 'Success', description: `Moved to ${nextStage}` });
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to update stage', variant: 'destructive' });
      }
    }
  };

  const handleReject = () => {
    setShowRejectionModal(true);
  };

  const handleConfirmRejection = async (reason: string, comments: string) => {
    try {
      const updated = await mockRejectPlacement(placement.id, reason, comments);
      onUpdate(updated);
      toast({ 
        title: 'Candidate Rejected', 
        description: 'Reason recorded successfully.',
        variant: 'destructive' 
      });
      setShowRejectionModal(false);
      
      // Redirect to learning platform
      setTimeout(() => {
        navigate(`/learning-platform?reason=${encodeURIComponent(reason)}`);
      }, 1500);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to reject placement', variant: 'destructive' });
    }
  };

  const handleAddComment = async (text: string) => {
    try {
      const updated = await mockAddPlacementComment(
        placement.id,
        text,
        'Employer Name',
        'employer',
        placement.stage
      );
      onUpdate(updated);
      toast({ title: 'Comment Posted' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to post comment', variant: 'destructive' });
    }
  };

  const handleAIEvaluation = async (evaluation: any) => {
    try {
      const updated = await mockSubmitAIEvaluation(placement.id, evaluation);
      onUpdate(updated);
      toast({ 
        title: 'AI Evaluation Complete', 
        description: `Score: ${evaluation.score}/100` 
      });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save evaluation', variant: 'destructive' });
    }
  };

  const getStageColor = (stage: string) => {
    if (placement.stage === 'Hired') return 'text-green-600';
    if (placement.stage === 'Rejected') return 'text-red-600';
    const stageIndex = PLACEMENT_STAGES.indexOf(stage as any);
    if (stageIndex < currentStageIndex) return 'text-green-600';
    if (stageIndex === currentStageIndex) return 'text-primary';
    return 'text-muted-foreground';
  };

  const isStageComplete = (stage: string) => {
    const stageIndex = PLACEMENT_STAGES.indexOf(stage as any);
    return stageIndex < currentStageIndex;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-foreground">{candidate.name}</h2>
          <p className="text-muted-foreground">{job.title} • {client.name}</p>
        </div>
        <Badge
          className={
            placement.stage === 'Hired'
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
              : placement.stage === 'Rejected'
              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
          }
        >
          {placement.stage}
        </Badge>
      </div>

      {/* Progress Bar - Always visible */}
      <Card className="p-6">
        <h3 className="font-semibold text-foreground mb-4">Placement Progress</h3>
        <Progress value={progress} className="mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {PLACEMENT_STAGES.map((stage) => (
            <div key={stage} className="flex flex-col items-center text-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                  isStageComplete(stage)
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : stage === placement.stage
                    ? 'bg-primary'
                    : 'bg-muted'
                }`}
              >
                {isStageComplete(stage) ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : stage === placement.stage ? (
                  <Circle className="w-5 h-5 text-primary-foreground fill-current" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <span className={`text-xs font-medium ${getStageColor(stage)}`}>{stage}</span>
            </div>
          ))}
        </div>
        {placement.stage === 'Rejected' && placement.rejectionReason && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm font-medium text-red-800 dark:text-red-400">
              Rejection Reason: {placement.rejectionReason}
            </p>
            {placement.rejectionComments && (
              <p className="text-sm text-muted-foreground mt-1">{placement.rejectionComments}</p>
            )}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Candidate Info */}
        <Card className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Candidate Information</h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{candidate.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Experience</p>
              <p className="text-sm font-medium">{candidate.experience}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Skills</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {candidate.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            {candidate.resumeUrl && (
              <Button variant="outline" className="w-full mt-4" asChild>
                <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="w-4 h-4 mr-2" />
                  View Resume
                </a>
              </Button>
            )}
          </div>
        </Card>

        {/* Right Column - Timeline & Actions */}
        <Card className="lg:col-span-2 p-6">
          <h3 className="font-semibold text-foreground mb-4">Timeline & Actions</h3>
          
          {/* Timeline */}
          <div className="space-y-4 mb-6">
            {placement.timeline.map((event) => (
              <div key={event.id} className="flex gap-3 pb-3 border-b last:border-0">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-sm text-foreground">{event.stage}</p>
                    <p className="text-xs text-muted-foreground">{event.date}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.notes}</p>
                  {event.completedBy && (
                    <p className="text-xs text-muted-foreground mt-1">By {event.completedBy}</p>
                  )}
                  <Badge variant="outline" className="mt-2 text-xs">
                    {event.eventType.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Comments Section */}
          <CommentSection
            comments={placement.comments || []}
            currentStage={placement.stage}
            onAddComment={handleAddComment}
            userRole="employer"
          />

          {/* Stage-specific Actions */}
          {placement.stage === 'Screening Test' && (
            <div className="border-t pt-6">
              <ScreeningTestSection
                placementId={placement.id}
                evaluation={placement.aiEvaluation}
                onComplete={handleAIEvaluation}
              />
            </div>
          )}

          {placement.stage === 'Panel Interview' && !placement.meeting && (
            <div className="border-t pt-6">
              <Button onClick={() => setShowMeetingModal(true)} className="w-full">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
            </div>
          )}

          {placement.stage === 'Panel Interview' && placement.meeting && (
            <div className="border-t pt-6">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg mb-4">
                <p className="text-sm font-medium text-green-800 dark:text-green-400 mb-2">
                  Meeting Scheduled
                </p>
                <p className="text-sm text-muted-foreground">
                  {placement.meeting.date} at {placement.meeting.time} ({placement.meeting.timezone})
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Participants: {placement.meeting.participants.join(', ')}
                </p>
              </div>
            </div>
          )}

          {placement.stage === 'BGV' && (
            <div className="border-t pt-6">
              <BGVSection placement={placement} onUpdate={onUpdate} />
            </div>
          )}

          {placement.stage === 'Confirmation' && placement.bgvDocuments && placement.bgvDocuments.length > 0 && (
            <div className="border-t pt-6">
              <Collapsible open={documentsOpen} onOpenChange={setDocumentsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    <span>BGV Documents ({placement.bgvDocuments.length})</span>
                    {documentsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-3">
                  {placement.bgvDocuments.map((doc) => (
                    <Card key={doc.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge
                              className={
                                doc.status === 'verified'
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                  : doc.status === 'rejected'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                                  : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                              }
                            >
                              {doc.status}
                            </Badge>
                            {doc.verifiedAt && (
                              <span className="text-xs text-muted-foreground">
                                {new Date(doc.verifiedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}

          {placement.stage === 'Offer Letter' && !placement.offerLetter && (
            <div className="border-t pt-6">
              <Button onClick={() => setShowOfferModal(true)} className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Generate Offer Letter
              </Button>
            </div>
          )}

          {placement.offerLetter && (
            <div className="border-t pt-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-400 mb-2">
                  Offer Letter Sent
                </p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>Salary: {placement.offerLetter.salary}</p>
                  <p>Joining Date: {placement.offerLetter.joiningDate}</p>
                  <p>Probation: {placement.offerLetter.probationPeriod}</p>
                  {placement.offerLetter.candidateResponse && (
                    <Badge
                      className={
                        placement.offerLetter.candidateResponse === 'accepted'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 mt-2'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 mt-2'
                      }
                    >
                      {placement.offerLetter.candidateResponse.toUpperCase()}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* General Actions */}
          {placement.stage !== 'Hired' && placement.stage !== 'Rejected' && (
            <div className="border-t pt-6 space-y-3">
              {currentStageIndex < PLACEMENT_STAGES.length - 1 && (
                <Button onClick={handleMoveToNextStage} className="w-full">
                  <Check className="w-4 h-4 mr-2" />
                  Move to {PLACEMENT_STAGES[currentStageIndex + 1]}
                </Button>
              )}
              <Button onClick={handleReject} variant="destructive" className="w-full">
                <X className="w-4 h-4 mr-2" />
                Reject Placement
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <ScheduleMeetingModal
        isOpen={showMeetingModal}
        onClose={() => setShowMeetingModal(false)}
        placementId={placement.id}
        onSuccess={(updated) => {
          setShowMeetingModal(false);
          onUpdate(updated);
        }}
      />

      <OfferLetterModal
        isOpen={showOfferModal}
        onClose={() => setShowOfferModal(false)}
        placementId={placement.id}
        candidateName={candidate.name}
        onSuccess={(updated) => {
          setShowOfferModal(false);
          onUpdate(updated);
        }}
      />

      <RejectionReasonModal
        isOpen={showRejectionModal}
        onClose={() => setShowRejectionModal(false)}
        onConfirm={handleConfirmRejection}
        candidateName={candidate.name}
        stage={placement.stage}
      />
    </div>
  );
}
