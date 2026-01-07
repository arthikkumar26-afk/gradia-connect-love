import { useState } from "react";
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
  ArrowLeft,
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
  Loader2,
  RefreshCw,
  Database
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AIActionPanel } from "./AIActionPanel";
import { useInterviewPipeline, PipelineCandidate, PipelineStage, InterviewStep } from "@/hooks/useInterviewPipeline";

// Stage icon mapping
const stageIcons: Record<string, React.ElementType> = {
  'Resume Screening': Users,
  'AI Phone Interview': Phone,
  'Technical Assessment': Code,
  'HR Round': UserCheck,
  'Final Review': FileCheck,
  'Offer Stage': FileText,
};

const stageColors: Record<string, string> = {
  'Resume Screening': 'bg-blue-500',
  'AI Phone Interview': 'bg-purple-500',
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

// Candidate Detail View Component
const CandidateDetailView = ({ 
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
  const completedSteps = candidate.interviewSteps.filter(s => s.status === "completed").length;
  const progress = (completedSteps / candidate.interviewSteps.length) * 100;

  const getStepIcon = (status: InterviewStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "current":
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            Candidate Profile
            {candidate.aiScore && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Score: {candidate.aiScore}%
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">Interview progress and details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Candidate Info */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="h-20 w-20 mb-4">
                  <AvatarImage src={candidate.avatar} />
                  <AvatarFallback className="bg-accent/10 text-accent text-2xl">
                    {getInitials(candidate.name)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-lg font-semibold text-foreground">{candidate.name}</h3>
                <p className="text-sm text-muted-foreground">{candidate.role}</p>
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < candidate.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap justify-center gap-1 mt-3">
                  {candidate.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{candidate.email}</span>
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
              </div>

              <div className="mt-6 flex gap-2">
                <Button className="flex-1" size="sm">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
                <Button variant="outline" className="flex-1" size="sm">
                  <Video className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
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
                <p className="text-xs text-muted-foreground mt-2">
                  {completedSteps} of {candidate.interviewSteps.length} steps completed
                </p>
              </div>
            </CardContent>
          </Card>

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

        {/* Right Column - Interview Steps */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Interview Stages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
                
                <div className="space-y-4">
                  {candidate.interviewSteps.map((step, index) => (
                    <div key={step.id} className="relative flex gap-4">
                      {/* Step indicator */}
                      <div className="relative z-10 bg-background">
                        {getStepIcon(step.status)}
                      </div>
                      
                      {/* Step content */}
                      <Card className={`flex-1 ${step.status === "current" ? "border-accent ring-1 ring-accent/20" : ""}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-foreground">{step.title}</h4>
                                {step.status === "current" && (
                                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                                    In Progress
                                  </Badge>
                                )}
                                {step.status === "completed" && (
                                  <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
                                    Completed
                                  </Badge>
                                )}
                                {step.status === "failed" && (
                                  <Badge variant="destructive">Failed</Badge>
                                )}
                              </div>
                              
                              {step.date && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  <Calendar className="h-3 w-3 inline mr-1" />
                                  {step.date}
                                  {step.interviewer && ` • ${step.interviewer}`}
                                </p>
                              )}
                              
                              {step.notes && (
                                <p className="text-sm text-muted-foreground mt-2 flex items-start gap-1">
                                  <MessageSquare className="h-3 w-3 mt-1 flex-shrink-0" />
                                  {step.notes}
                                </p>
                              )}
                              
                              {step.score !== undefined && (
                                <div className="flex items-center gap-1 mt-2">
                                  <span className="text-xs text-muted-foreground">Score:</span>
                                  <span className="text-sm font-medium text-foreground">{step.score}/10</span>
                                </div>
                              )}
                            </div>

                            {/* Action buttons */}
                            {step.status === "current" && (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => onUpdateStep(step.id, "failed")}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => onUpdateStep(step.id, "completed")}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Complete
                                </Button>
                              </div>
                            )}
                            {step.status === "pending" && index === candidate.interviewSteps.findIndex(s => s.status === "pending") && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => onUpdateStep(step.id, "current")}
                              >
                                Start
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const CandidateCard = ({ 
  candidate, 
  onMoveNext, 
  onSchedule, 
  onEmail,
  onOpenProfile 
}: { 
  candidate: Candidate; 
  onMoveNext: () => void;
  onSchedule: () => void;
  onEmail: () => void;
  onOpenProfile: () => void;
}) => {
  return (
    <Card 
      className="mb-3 bg-card border border-border hover:shadow-md transition-all cursor-pointer group"
      onClick={onOpenProfile}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
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
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-xs text-muted-foreground truncate">{candidate.role}</p>
            <p className="text-xs text-muted-foreground mt-1">{candidate.appliedDate}</p>
            
            {/* Progress indicator */}
            <div className="mt-2">
              <div className="flex gap-0.5">
                {candidate.interviewSteps.map((step) => (
                  <div 
                    key={step.id}
                    className={`h-1 flex-1 rounded-full ${
                      step.status === "completed" ? "bg-green-500" :
                      step.status === "current" ? "bg-blue-500" :
                      step.status === "failed" ? "bg-destructive" :
                      "bg-muted"
                    }`}
                  />
                ))}
              </div>
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
  onOpenCandidate 
}: { 
  stage: PipelineStage;
  onMoveCandidate: (candidateId: string, fromStage: string, toStage: string) => void;
  onOpenCandidate: (candidate: Candidate) => void;
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
  const { stages, loading, error, refetch, moveCandidate, updateEventStatus } = useInterviewPipeline();
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

  const handleMoveCandidate = async (interviewCandidateId: string, fromStageId: string, direction: string) => {
    const fromStageIndex = stages.findIndex((s) => s.id === fromStageId);
    if (fromStageIndex === -1) return;
    
    const toStageIndex = direction === "next" ? fromStageIndex + 1 : fromStageIndex - 1;
    if (toStageIndex < 0 || toStageIndex >= stages.length) return;
    
    const toStageId = stages[toStageIndex].id;
    await moveCandidate(interviewCandidateId, toStageId);
  };

  const handleOpenCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
  };

  const handleUpdateStep = async (stepId: string, status: InterviewStep["status"]) => {
    if (!selectedCandidate) return;
    
    const dbStatus = status === "current" ? "in_progress" : status;
    await updateEventStatus(selectedCandidate.interviewCandidateId, stepId, dbStatus);
    
    // Refresh selected candidate data
    await refetch();
  };

  const totalCandidates = stages.reduce(
    (acc, stage) => acc + stage.candidates.length,
    0
  );

  // If a candidate is selected, show the detail view
  if (selectedCandidate) {
    return (
      <CandidateDetailView
        candidate={selectedCandidate}
        onBack={() => setSelectedCandidate(null)}
        onUpdateStep={handleUpdateStep}
        onRefresh={refetch}
      />
    );
  }

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

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            Interview Pipeline
            <Badge variant="secondary" className="text-xs">
              <Database className="h-3 w-3 mr-1" />
              Live
            </Badge>
          </h2>
          <p className="text-sm text-muted-foreground">
            Real-time candidate tracking across your hiring process
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

      {/* Pipeline Board */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {stages.map((stage) => (
            <PipelineColumn
              key={stage.id}
              stage={stage}
              onMoveCandidate={handleMoveCandidate}
              onOpenCandidate={handleOpenCandidate}
            />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default InterviewPipelineContent;
