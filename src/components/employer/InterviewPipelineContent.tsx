import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  Phone,
  Code, 
  UserCheck,
  FileCheck,
  ChevronRight,
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
  Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ManualInterviewScheduleModal } from "./ManualInterviewScheduleModal";
import { useInterviewPipeline, PipelineCandidate, PipelineStage, InterviewStep } from "@/hooks/useInterviewPipeline";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Stage icon mapping
const stageIcons: Record<string, React.ElementType> = {
  'Resume Screening': Users,
  'Technical Assessment': Code,
  'HR Round': UserCheck,
  'Final Review': FileCheck,
  'Offer Stage': FileText,
};

const stageColors: Record<string, string> = {
  'Resume Screening': 'bg-blue-500',
  'Technical Assessment': 'bg-orange-500',
  'HR Round': 'bg-green-500',
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
                      <span className="text-foreground">{candidate.education}</span>
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
                  <div className="space-y-4">
                    {candidate.interviewSteps
                      .filter(step => step.title !== "AI Phone Interview")
                      .map((step, index, filteredSteps) => {
                        // Find first pending step index
                        const firstPendingIndex = filteredSteps.findIndex(s => s.status === "pending");
                        const isFirstPending = step.status === "pending" && index === firstPendingIndex;
                        
                        // Check if this stage might have a recording (Technical Assessment, etc.)
                        const hasRecordingCapability = step.title === "Technical Assessment" || step.title === "HR Round";
                        
                        return (
                          <div key={step.id} className={`border-b border-border/50 pb-3 last:border-0 last:pb-0 ${step.isLive ? 'bg-red-500/5 -mx-4 px-4 py-2 rounded-lg' : ''}`}>
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">{getStepIcon(step)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h4 className="text-sm font-medium text-foreground truncate">{step.title}</h4>
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
                                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] py-0">
                                        Passed
                                      </Badge>
                                    )}
                                    {step.score < 50 && (
                                      <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] py-0">
                                        Below Threshold
                                      </Badge>
                                    )}
                                  </div>
                                )}
                                
                                {/* Show recording for completed stages OR interview link for current/pending stages */}
                                {(step.status === "completed" || step.status === "current") && hasRecordingCapability && (
                                  <StageRecordingPlayer
                                    interviewCandidateId={candidate.interviewCandidateId}
                                    stageId={step.id}
                                    stageName={step.title}
                                    showLinkForPending={step.status === "current"}
                                  />
                                )}
                                
                                {/* Action buttons for current step */}
                                {step.status === "current" && (
                                  <div className="flex gap-2 mt-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => onUpdateStep(step.id, "failed")}
                                      className="text-destructive hover:text-destructive h-7 text-xs"
                                    >
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Fail
                                    </Button>
                                    <Button 
                                      size="sm"
                                      onClick={() => onUpdateStep(step.id, "completed")}
                                      className="h-7 text-xs"
                                    >
                                      <Check className="h-3 w-3 mr-1" />
                                      Complete
                                    </Button>
                                  </div>
                                )}
                                {isFirstPending && (
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => onUpdateStep(step.id, "current")}
                                    className="mt-2 h-7 text-xs"
                                  >
                                    Start
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* Interview Recording & Results */}
              <InterviewRecordingPlayer 
                interviewCandidateId={candidate.interviewCandidateId} 
              />

              {/* AI Action Panel */}
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
            
            <p className="text-xs text-muted-foreground mt-1">{candidate.appliedDate}</p>
            
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
