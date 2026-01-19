import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  FileText,
  Code,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Video,
  Send,
  Users,
  Link2,
  ExternalLink,
  Download,
  AlertCircle,
  Target,
  Star,
  Play,
  ChevronDown,
  ChevronUp,
  Loader2,
  Bot,
  Zap,
  ArrowRight,
  UserCheck,
  Ban,
  FileSignature
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StageInterviewScheduleModal } from "./StageInterviewScheduleModal";
import { StageRecordingPlayer } from "./StageRecordingPlayer";
import { InterviewProgressTracker } from "./InterviewProgressTracker";
import { useStatusNotification } from "@/hooks/useStatusNotification";

interface InterviewStage {
  id: string;
  name: string;
  stageOrder: number;
  status: 'completed' | 'current' | 'pending' | 'failed';
  score?: number;
  notes?: string;
  scheduledAt?: string;
  completedAt?: string;
  isAiAutomated: boolean;
}

interface CandidateData {
  id: string;
  interviewCandidateId: string;
  name: string;
  email: string;
  phone?: string;
  location?: string;
  experience?: string;
  education?: string;
  resumeUrl?: string;
  profilePicture?: string;
  preferredRole?: string;
  aiScore?: number;
  aiAnalysis?: any;
  skills?: string[];
  status: string;
  appliedAt: string;
  jobId: string;
  jobTitle: string;
  department?: string;
  interviewType?: string;
  currentStageId?: string;
}

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getScoreColor = (score: number | null | undefined) => {
  if (!score) return "text-muted-foreground";
  if (score >= 80) return "text-green-600";
  if (score >= 60) return "text-blue-600";
  if (score >= 40) return "text-yellow-600";
  return "text-red-600";
};

export const CandidateFullProfile = () => {
  const navigate = useNavigate();
  const { candidateId } = useParams<{ candidateId: string }>();
  
  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [stages, setStages] = useState<InterviewStage[]>([]);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedStage, setSelectedStage] = useState<InterviewStage | null>(null);
  const [aiActionLoading, setAiActionLoading] = useState<string | null>(null);
  
  const { 
    notifyShortlisted, 
    notifyHired, 
    notifyRejected,
    notifyOfferReceived 
  } = useStatusNotification();

  const fetchCandidateData = async () => {
    if (!candidateId) return;
    
    try {
      setLoading(true);
      
      // Fetch interview candidate with profile and job details
      const { data: interviewCandidate, error: icError } = await supabase
        .from('interview_candidates')
        .select(`
          *,
          candidate:profiles!interview_candidates_candidate_id_fkey(*),
          job:jobs!interview_candidates_job_id_fkey(*)
        `)
        .eq('id', candidateId)
        .single();

      if (icError) throw icError;
      if (!interviewCandidate) throw new Error('Candidate not found');

      const profile = interviewCandidate.candidate;
      const job = interviewCandidate.job;
      const aiAnalysis = interviewCandidate.ai_analysis as any;
      const candidateData = aiAnalysis?.candidate_data;

      // Parse skills from AI analysis or profile
      let skills: string[] = [];
      if (candidateData?.skills) {
        skills = candidateData.skills;
      }

      setCandidate({
        id: profile?.id || interviewCandidate.candidate_id,
        interviewCandidateId: interviewCandidate.id,
        name: candidateData?.full_name || profile?.full_name || 'Unknown',
        email: candidateData?.email || profile?.email || '',
        phone: candidateData?.mobile || profile?.mobile || undefined,
        location: candidateData?.location || profile?.location || undefined,
        experience: candidateData?.experience_level || profile?.experience_level || undefined,
        education: candidateData?.education || undefined,
        resumeUrl: interviewCandidate.resume_url || profile?.resume_url || undefined,
        profilePicture: profile?.profile_picture || undefined,
        preferredRole: candidateData?.preferred_role || profile?.preferred_role || undefined,
        aiScore: interviewCandidate.ai_score || undefined,
        aiAnalysis: aiAnalysis,
        skills,
        status: interviewCandidate.status || 'active',
        appliedAt: interviewCandidate.applied_at || new Date().toISOString(),
        jobId: job?.id || interviewCandidate.job_id,
        jobTitle: job?.job_title || 'Unknown Position',
        department: job?.department || undefined,
        interviewType: job?.interview_type || 'standard',
        currentStageId: interviewCandidate.current_stage_id || undefined,
      });

      // Fetch all interview stages
      const { data: allStages, error: stagesError } = await supabase
        .from('interview_stages')
        .select('*')
        .order('stage_order', { ascending: true });

      if (stagesError) throw stagesError;

      // Fetch interview events for this candidate
      const { data: events, error: eventsError } = await supabase
        .from('interview_events')
        .select('*')
        .eq('interview_candidate_id', interviewCandidate.id);

      if (eventsError) throw eventsError;

      // Build stages with status
      const stagesWithStatus: InterviewStage[] = (allStages || [])
        .filter(stage => stage.name !== 'AI Phone Interview')
        .map(stage => {
          const event = events?.find(e => e.stage_id === stage.id);
          let status: InterviewStage['status'] = 'pending';
          
          if (event) {
            if (event.status === 'passed' || event.status === 'completed') {
              status = 'completed';
            } else if (event.status === 'failed') {
              status = 'failed';
            } else if (event.status === 'in_progress' || event.status === 'pending') {
              status = 'current';
            }
          } else if (interviewCandidate.current_stage_id === stage.id) {
            status = 'current';
          }

          return {
            id: stage.id,
            name: stage.name,
            stageOrder: stage.stage_order,
            status,
            score: event?.ai_score || undefined,
            notes: event?.notes || undefined,
            scheduledAt: event?.scheduled_at || undefined,
            completedAt: event?.completed_at || undefined,
            isAiAutomated: stage.is_ai_automated || false,
          };
        });

      setStages(stagesWithStatus);

      // Auto-expand current stage
      const currentStage = stagesWithStatus.find(s => s.status === 'current');
      if (currentStage) {
        setExpandedStages(new Set([currentStage.id]));
      }
    } catch (error: any) {
      console.error('Error fetching candidate:', error);
      toast.error('Failed to load candidate profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidateData();
  }, [candidateId]);

  const toggleStageExpansion = (stageId: string) => {
    setExpandedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageId)) {
        newSet.delete(stageId);
      } else {
        newSet.add(stageId);
      }
      return newSet;
    });
  };

  const handleScheduleInterview = (stage: InterviewStage) => {
    setSelectedStage(stage);
    setScheduleModalOpen(true);
  };

  const handleSendEmail = async (stage: InterviewStage) => {
    if (!candidate) return;
    
    try {
      toast.loading(`Sending interview invitation for ${stage.name}...`);
      
      // Schedule for 2 days from now if not already scheduled
      const scheduledDate = stage.scheduledAt 
        ? new Date(stage.scheduledAt) 
        : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      
      const { error } = await supabase.functions.invoke('send-interview-invitation', {
        body: {
          interviewCandidateId: candidate.interviewCandidateId,
          stageName: stage.name,
          scheduledDate: scheduledDate.toISOString(),
        }
      });
      
      if (error) throw error;
      
      toast.dismiss();
      toast.success(`Interview invitation sent to ${candidate.email}`);
      fetchCandidateData();
    } catch (error: any) {
      toast.dismiss();
      console.error('Send email error:', error);
      toast.error(error.message || 'Failed to send interview invitation');
    }
  };

  // AI Automation Actions
  const handleAiAutoProgress = async () => {
    if (!candidate) return;
    setAiActionLoading('auto-progress');
    try {
      const { error } = await supabase.functions.invoke('auto-progress-pipeline', {
        body: { candidateId: candidate.interviewCandidateId }
      });
      if (error) throw error;
      toast.success('AI Auto-Progress initiated successfully');
      fetchCandidateData();
    } catch (error: any) {
      console.error('Auto-progress error:', error);
      toast.error('Failed to auto-progress candidate');
    } finally {
      setAiActionLoading(null);
    }
  };

  const handleAiAnalyze = async () => {
    if (!candidate) return;
    setAiActionLoading('analyze');
    try {
      const { error } = await supabase.functions.invoke('analyze-resume', {
        body: { 
          candidateId: candidate.interviewCandidateId,
          resumeUrl: candidate.resumeUrl 
        }
      });
      if (error) throw error;
      toast.success('AI Analysis completed');
      fetchCandidateData();
    } catch (error: any) {
      console.error('AI analyze error:', error);
      toast.error('Failed to analyze candidate');
    } finally {
      setAiActionLoading(null);
    }
  };

  const handleNextStage = async () => {
    if (!candidate) return;
    setAiActionLoading('next-stage');
    try {
      const currentStage = stages.find(s => s.status === 'current');
      const currentIndex = stages.findIndex(s => s.status === 'current');
      const nextStage = stages[currentIndex + 1];

      if (!nextStage) {
        toast.info('Candidate is already at the final stage');
        setAiActionLoading(null);
        return;
      }

      // Update current stage to completed
      if (currentStage) {
        await supabase
          .from('interview_events')
          .update({ status: 'passed', completed_at: new Date().toISOString() })
          .eq('interview_candidate_id', candidate.interviewCandidateId)
          .eq('stage_id', currentStage.id);
      }

      // Update candidate's current stage
      await supabase
        .from('interview_candidates')
        .update({ current_stage_id: nextStage.id })
        .eq('id', candidate.interviewCandidateId);

      // Create new interview event for next stage
      await supabase
        .from('interview_events')
        .insert({
          interview_candidate_id: candidate.interviewCandidateId,
          stage_id: nextStage.id,
          status: 'pending'
        });

      toast.success(`Moved to ${nextStage.name}`);
      fetchCandidateData();
    } catch (error: any) {
      console.error('Next stage error:', error);
      toast.error('Failed to move to next stage');
    } finally {
      setAiActionLoading(null);
    }
  };

  const handleSendInvite = () => {
    const currentStage = stages.find(s => s.status === 'current');
    if (currentStage) {
      setSelectedStage(currentStage);
      setScheduleModalOpen(true);
    } else {
      toast.info('No active stage to send invite for');
    }
  };

  const handleOfferLetter = async () => {
    if (!candidate) return;
    setAiActionLoading('offer');
    try {
      // Send offer notification email
      await notifyOfferReceived(
        candidate.id,
        candidate.jobId,
        undefined, // salary - will be filled in offer letter modal
        undefined  // start date - will be filled in offer letter modal
      );
      navigate(`/employer/candidate/${candidate.interviewCandidateId}?action=offer`);
    } catch (error) {
      console.error('Offer letter error:', error);
    } finally {
      setAiActionLoading(null);
    }
  };

  const handleStatusUpdate = async (newStatus: 'shortlisted' | 'hired' | 'rejected') => {
    if (!candidate) return;
    setAiActionLoading(newStatus);
    try {
      const { error } = await supabase
        .from('interview_candidates')
        .update({ status: newStatus })
        .eq('id', candidate.interviewCandidateId);

      if (error) throw error;

      // Send email notification based on status
      if (newStatus === 'shortlisted') {
        await notifyShortlisted(candidate.id, candidate.jobId);
      } else if (newStatus === 'hired') {
        await notifyHired(candidate.id, candidate.jobId);
      } else if (newStatus === 'rejected') {
        await notifyRejected(candidate.id, candidate.jobId, 'We have decided to move forward with other candidates');
      }

      const statusMessages = {
        shortlisted: 'Candidate shortlisted & email sent',
        hired: 'Candidate hired & congratulations email sent! 🎉',
        rejected: 'Candidate rejected & notification sent'
      };

      toast.success(statusMessages[newStatus]);
      fetchCandidateData();
    } catch (error: any) {
      console.error('Status update error:', error);
      toast.error('Failed to update candidate status');
    } finally {
      setAiActionLoading(null);
    }
  };

  const getScoreLabel = (score: number | undefined) => {
    if (!score) return 'Not Analyzed';
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Fit';
    if (score >= 40) return 'Review Needed';
    return 'Low Match';
  };

  const getScoreBadgeColor = (score: number | undefined) => {
    if (!score) return 'bg-muted text-muted-foreground';
    if (score >= 80) return 'bg-green-500/10 text-green-600 border-green-500/20';
    if (score >= 60) return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
    if (score >= 40) return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
    return 'bg-red-500/10 text-red-600 border-red-500/20';
  };

  const getStageIcon = (status: InterviewStage['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'current':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />;
    }
  };

  const getStageStatusBadge = (status: InterviewStage['status']) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Done</Badge>;
      case 'current':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">In Progress</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Pending</Badge>;
    }
  };

  const completedStages = stages.filter(s => s.status === 'completed').length;
  const progress = stages.length > 0 ? (completedStages / stages.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Candidate not found</p>
        <Button onClick={() => navigate('/employer/dashboard')}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate('/employer/dashboard');
                }
              }}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={candidate.profilePicture} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {getInitials(candidate.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-semibold text-foreground">{candidate.name}</h1>
                    {candidate.aiScore && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        <Sparkles className="h-3 w-3 mr-1" />
                        AI Score: {candidate.aiScore}%
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{candidate.preferredRole || candidate.jobTitle}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => window.open(`mailto:${candidate.email}`)}>
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - AI Automation */}
          <div className="lg:col-span-4 space-y-6">
            {/* AI Automation Panel */}
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Automation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* AI Match Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">AI Match Score</span>
                    <Badge className={getScoreBadgeColor(candidate.aiScore)}>
                      {getScoreLabel(candidate.aiScore)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-foreground">
                      {candidate.aiScore || 0}%
                    </span>
                    <Progress 
                      value={candidate.aiScore || 0} 
                      className="flex-1 h-2"
                    />
                  </div>
                </div>

                {/* AI Auto-Progress Button */}
                <Button 
                  className="w-full bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white"
                  onClick={handleAiAutoProgress}
                  disabled={aiActionLoading === 'auto-progress'}
                >
                  {aiActionLoading === 'auto-progress' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  AI Auto-Progress Pipeline
                </Button>

                {/* Action Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={handleAiAnalyze}
                    disabled={aiActionLoading === 'analyze'}
                  >
                    {aiActionLoading === 'analyze' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Bot className="h-4 w-4 mr-2" />
                    )}
                    AI Analyze
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={handleNextStage}
                    disabled={aiActionLoading === 'next-stage'}
                  >
                    {aiActionLoading === 'next-stage' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Next Stage
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={handleSendInvite}
                  >
                    <Calendar className="h-4 w-4 mr-2" />
                    Send Invite
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={handleOfferLetter}
                  >
                    <FileSignature className="h-4 w-4 mr-2" />
                    Offer Letter
                  </Button>
                </div>

                {/* Status Actions */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                    onClick={() => handleStatusUpdate('shortlisted')}
                    disabled={aiActionLoading === 'shortlisted' || candidate.status === 'shortlisted'}
                  >
                    {aiActionLoading === 'shortlisted' ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Star className="h-4 w-4 mr-1" />
                    )}
                    Shortlist
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 border-green-500/30 text-green-600 hover:bg-green-500/10"
                    onClick={() => handleStatusUpdate('hired')}
                    disabled={aiActionLoading === 'hired' || candidate.status === 'hired'}
                  >
                    {aiActionLoading === 'hired' ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4 mr-1" />
                    )}
                    Hire
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1 border-red-500/30 text-red-600 hover:bg-red-500/10"
                    onClick={() => handleStatusUpdate('rejected')}
                    disabled={aiActionLoading === 'rejected' || candidate.status === 'rejected'}
                  >
                    {aiActionLoading === 'rejected' ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Ban className="h-4 w-4 mr-1" />
                    )}
                    Reject
                  </Button>
                </div>

                {/* Current Stage Info */}
                {stages.find(s => s.status === 'current') && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      Stage: {stages.find(s => s.status === 'current')?.name}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Real-time Interview Progress Tracker */}
            <InterviewProgressTracker 
              interviewCandidateId={candidate.interviewCandidateId}
              candidateName={candidate.name}
            />

            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
                  {candidate.experience || 'entry'} experience
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {candidate.education && (
                  <div className="flex items-start gap-3 text-sm">
                    <GraduationCap className="h-4 w-4 text-muted-foreground mt-0.5" />
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
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      View Resume
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {candidate.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{candidate.email}</span>
                  </div>
                )}
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
              </CardContent>
            </Card>

            {/* Skills */}
            {candidate.skills && candidate.skills.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1.5">
                    {candidate.skills.map((skill, index) => (
                      <Badge key={index} className="bg-accent text-accent-foreground text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Analysis Summary */}
            {candidate.aiAnalysis && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {candidate.aiAnalysis.summary && (
                    <p className="text-sm text-muted-foreground">{candidate.aiAnalysis.summary}</p>
                  )}
                  
                  {candidate.aiAnalysis.strengths && candidate.aiAnalysis.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-600 mb-2">Strengths</p>
                      <ul className="space-y-1">
                        {candidate.aiAnalysis.strengths.slice(0, 4).map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <Star className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {candidate.aiAnalysis.concerns && candidate.aiAnalysis.concerns.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-amber-600 mb-2">Areas of Concern</p>
                      <ul className="space-y-1">
                        {candidate.aiAnalysis.concerns.slice(0, 3).map((c: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column - Interview Stages */}
          <div className="lg:col-span-8 space-y-6">
            {/* Progress Overview */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Interview Stages</CardTitle>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Live
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {completedStages} of {stages.length} stages completed
                  </p>
                </div>

                <Separator className="my-4" />

                {/* Stages List */}
                <div className="space-y-3">
                  {stages.map((stage, index) => (
                    <Collapsible 
                      key={stage.id} 
                      open={expandedStages.has(stage.id)}
                      onOpenChange={() => toggleStageExpansion(stage.id)}
                    >
                      <Card className={`border ${stage.status === 'current' ? 'border-blue-500/50 bg-blue-500/5' : ''}`}>
                        <CollapsibleTrigger asChild>
                          <div className="p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getStageIcon(stage.status)}
                                <div>
                                  <h4 className="font-medium text-foreground">{stage.name}</h4>
                                  {stage.score !== undefined && stage.score > 0 && (
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-muted-foreground">Score: {stage.score}%</span>
                                      {stage.score >= 50 ? (
                                        <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] py-0">
                                          Passed
                                        </Badge>
                                      ) : (
                                        <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[10px] py-0">
                                          Below Threshold
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStageStatusBadge(stage.status)}
                                {expandedStages.has(stage.id) ? (
                                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                )}
                              </div>
                            </div>
                          </div>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <Separator />
                          <div className="p-4 space-y-4 bg-muted/30">
                            {/* Stage Details */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {stage.scheduledAt && (
                                <div>
                                  <span className="text-muted-foreground">Scheduled:</span>
                                  <p className="font-medium">
                                    {new Date(stage.scheduledAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              )}
                              {stage.completedAt && (
                                <div>
                                  <span className="text-muted-foreground">Completed:</span>
                                  <p className="font-medium">
                                    {new Date(stage.completedAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </div>
                              )}
                            </div>

                            {stage.notes && (
                              <div>
                                <span className="text-sm text-muted-foreground">Notes:</span>
                                <p className="text-sm mt-1 bg-background p-2 rounded border">{stage.notes}</p>
                              </div>
                            )}

                            {/* Recording Player for completed stages */}
                            {(stage.status === 'completed' || stage.status === 'current') && (
                              <StageRecordingPlayer
                                interviewCandidateId={candidate.interviewCandidateId}
                                stageId={stage.id}
                                stageName={stage.name}
                                showLinkForPending={stage.status === 'current'}
                              />
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-2 pt-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleScheduleInterview(stage);
                                }}
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Schedule Interview
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendEmail(stage);
                                }}
                              >
                                <Mail className="h-4 w-4 mr-2" />
                                Send Email
                              </Button>
                              {stage.status === 'pending' && (
                                <Button 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleScheduleInterview(stage);
                                  }}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Start Stage
                                </Button>
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {selectedStage && candidate && (
        <StageInterviewScheduleModal
          isOpen={scheduleModalOpen}
          onClose={() => {
            setScheduleModalOpen(false);
            setSelectedStage(null);
          }}
          candidateName={candidate.name}
          candidateEmail={candidate.email}
          jobTitle={candidate.jobTitle}
          interviewCandidateId={candidate.interviewCandidateId}
          stageId={selectedStage.id}
          stageName={selectedStage.name}
          onSuccess={fetchCandidateData}
        />
      )}
    </div>
  );
};

export default CandidateFullProfile;
