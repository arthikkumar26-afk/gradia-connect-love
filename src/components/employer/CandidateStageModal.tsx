import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar, 
  Clock, 
  Link2, 
  Users, 
  Mail, 
  Loader2, 
  Video,
  FileText,
  Star,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Upload,
  Send,
  Sparkles,
  User,
  Play,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PipelineCandidate, InterviewStep } from '@/hooks/useInterviewPipeline';
import { format } from 'date-fns';

interface ScheduledInterview {
  id: string;
  date: string;
  time: string;
  link: string;
  assessmentEmails: string;
  panelEmails: string;
  createdAt: string;
  status?: string;
}

interface CandidateStageModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: PipelineCandidate | null;
  onUpdateStep: (stepId: string, status: InterviewStep["status"]) => void;
  onRefresh?: () => void;
}

type SidebarTab = 'details' | 'upload-marks' | 'schedule-demo' | 'feedback' | 'documents' | 'offer-letter';

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

export const CandidateStageModal = ({
  isOpen,
  onClose,
  candidate,
  onUpdateStep,
  onRefresh,
}: CandidateStageModalProps) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('schedule-demo');
  const [loading, setLoading] = useState(false);
  const [scheduledInterviews, setScheduledInterviews] = useState<ScheduledInterview[]>([]);
  const [selectedStage, setSelectedStage] = useState<InterviewStep | null>(null);
  const [formData, setFormData] = useState({
    interviewLink: '',
    scheduleDate: '',
    scheduleTime: '',
    panelAttendeeEmails: '',
    assessmentMemberEmails: '',
  });

  // Fetch scheduled interviews for this candidate
  useEffect(() => {
    const fetchScheduledInterviews = async () => {
      if (!candidate?.interviewCandidateId) return;
      
      const { data: events } = await supabase
        .from('interview_events')
        .select(`
          id,
          scheduled_at,
          status,
          created_at,
          interview_invitations (
            meeting_link,
            email_sent_at
          )
        `)
        .eq('interview_candidate_id', candidate.interviewCandidateId)
        .order('scheduled_at', { ascending: false });

      if (events) {
        const interviews: ScheduledInterview[] = events
          .filter(e => e.scheduled_at)
          .map(event => {
            const scheduledDate = new Date(event.scheduled_at!);
            return {
              id: event.id,
              date: format(scheduledDate, 'dd-MM-yyyy'),
              time: format(scheduledDate, 'HH:mm'),
              link: event.interview_invitations?.[0]?.meeting_link || '',
              assessmentEmails: '',
              panelEmails: '',
              createdAt: format(new Date(event.created_at!), 'dd-MM-yyyy'),
              status: event.status,
            };
          });
        setScheduledInterviews(interviews);
      }
    };

    if (isOpen && candidate) {
      fetchScheduledInterviews();
      // Set first pending/current stage as selected
      const currentStep = candidate.interviewSteps.find(s => s.status === 'current' || s.status === 'pending');
      setSelectedStage(currentStep || candidate.interviewSteps[0] || null);
    }
  }, [isOpen, candidate?.interviewCandidateId]);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.scheduleDate || !formData.scheduleTime) {
      toast.error('Please fill in date and time');
      return;
    }

    if (!formData.interviewLink) {
      toast.error('Please provide an interview link');
      return;
    }

    if (!candidate || !selectedStage) {
      toast.error('No candidate or stage selected');
      return;
    }

    setLoading(true);
    try {
      const scheduledAt = new Date(`${formData.scheduleDate}T${formData.scheduleTime}`).toISOString();

      const panelEmails = formData.panelAttendeeEmails
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);
      
      const assessmentEmails = formData.assessmentMemberEmails
        .split(',')
        .map(e => e.trim())
        .filter(e => e.length > 0);

      const { data, error } = await supabase.functions.invoke('send-interview-invitation', {
        body: {
          interviewCandidateId: candidate.interviewCandidateId,
          stageName: selectedStage.title,
          scheduledDate: scheduledAt,
          meetingLink: formData.interviewLink,
          isManualInterview: true,
          panelAttendeeEmails: panelEmails,
          assessmentMemberEmails: assessmentEmails,
        },
      });

      if (error) throw error;

      toast.success(`Interview scheduled and invitation sent to ${candidate.name}`);
      
      // Add to local list
      setScheduledInterviews(prev => [{
        id: Date.now().toString(),
        date: format(new Date(scheduledAt), 'dd-MM-yyyy'),
        time: format(new Date(scheduledAt), 'HH:mm'),
        link: formData.interviewLink,
        assessmentEmails: formData.assessmentMemberEmails,
        panelEmails: formData.panelAttendeeEmails,
        createdAt: format(new Date(), 'dd-MM-yyyy'),
        status: 'scheduled',
      }, ...prev]);
      
      setFormData({
        interviewLink: '',
        scheduleDate: '',
        scheduleTime: '',
        panelAttendeeEmails: '',
        assessmentMemberEmails: '',
      });
      
      onRefresh?.();
    } catch (error: any) {
      console.error('Error scheduling interview:', error);
      toast.error(error.message || 'Failed to schedule interview');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCompleted = (interviewId: string) => {
    setScheduledInterviews(prev => 
      prev.map(i => i.id === interviewId ? { ...i, status: 'completed' } : i)
    );
    toast.success('Demo marked as completed');
  };

  const handleCancelInterview = (interviewId: string) => {
    setScheduledInterviews(prev => 
      prev.map(i => i.id === interviewId ? { ...i, status: 'cancelled' } : i)
    );
    toast.info('Interview cancelled');
  };

  if (!candidate) return null;

  const sidebarItems: { id: SidebarTab; label: string; icon: React.ElementType }[] = [
    { id: 'details', label: 'Details', icon: User },
    { id: 'upload-marks', label: 'Upload Marks', icon: Upload },
    { id: 'schedule-demo', label: 'Schedule Demo', icon: Calendar },
    { id: 'feedback', label: 'Feedback Reports', icon: MessageSquare },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'offer-letter', label: 'Offer Letter Release', icon: Send },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={candidate.avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(candidate.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{candidate.name}</h3>
                    <p className="text-sm text-muted-foreground">{candidate.role}</p>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{candidate.email || 'Not provided'}</span>
                  </div>
                  {candidate.phone && (
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <span>{candidate.phone}</span>
                    </div>
                  )}
                </div>
                {candidate.skills && candidate.skills.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.map((skill, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {candidate.aiScore && (
                  <>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">AI Score</span>
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        <Sparkles className="h-3 w-3 mr-1" />
                        {candidate.aiScore}%
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'schedule-demo':
        return (
          <div className="space-y-4">
            {/* Stage Selection */}
            <div className="space-y-2">
              <Label>Select Panel/Stage</Label>
              <div className="flex items-center gap-2">
                <select
                  className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedStage?.id || ''}
                  onChange={(e) => {
                    const stage = candidate.interviewSteps.find(s => s.id === e.target.value);
                    setSelectedStage(stage || null);
                  }}
                >
                  {candidate.interviewSteps.map(step => (
                    <option key={step.id} value={step.id}>
                      {step.title} ({step.status})
                    </option>
                  ))}
                </select>
                <Button variant="outline" size="sm" className="whitespace-nowrap">
                  <Plus className="h-4 w-4 mr-1" />
                  New Panel Name
                </Button>
              </div>
            </div>

            {/* Schedule Form */}
            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="scheduleDate" className="text-sm flex items-center gap-1">
                    Schedule Date <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="scheduleDate"
                    type="date"
                    value={formData.scheduleDate}
                    onChange={(e) => setFormData({ ...formData, scheduleDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduleTime" className="text-sm flex items-center gap-1">
                    Schedule Time <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="scheduleTime"
                    type="time"
                    value={formData.scheduleTime}
                    onChange={(e) => setFormData({ ...formData, scheduleTime: e.target.value })}
                    required
                    className="h-9"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interviewLink" className="text-sm flex items-center gap-1">
                    Zoom Link <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="interviewLink"
                    type="text"
                    value={formData.interviewLink}
                    onChange={(e) => setFormData({ ...formData, interviewLink: e.target.value })}
                    placeholder="Zoom Link"
                    required
                    className="h-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assessmentMemberEmails" className="text-sm flex items-center gap-1">
                  Assessment Member Email Id (Enter separate with Commas(,)) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="assessmentMemberEmails"
                  type="text"
                  value={formData.assessmentMemberEmails}
                  onChange={(e) => setFormData({ ...formData, assessmentMemberEmails: e.target.value })}
                  placeholder="assessor1@company.com, assessor2@company.com"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="panelAttendeeEmails" className="text-sm">
                  Panel Member Email Id (Enter separate with Commas(,))
                </Label>
                <Input
                  id="panelAttendeeEmails"
                  type="text"
                  value={formData.panelAttendeeEmails}
                  onChange={(e) => setFormData({ ...formData, panelAttendeeEmails: e.target.value })}
                  placeholder="panel1@company.com, panel2@company.com"
                  className="h-9"
                />
              </div>

              <Button type="submit" disabled={loading} className="w-auto">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
            </form>

            {/* Scheduled Interviews History */}
            {scheduledInterviews.length > 0 && (
              <div className="mt-6">
                <div className="rounded-lg border overflow-hidden">
                  {scheduledInterviews.map((interview, index) => (
                    <div key={interview.id} className="border-b last:border-0">
                      {/* Header */}
                      <div className="bg-[#0077B6] text-white p-3 flex justify-between items-center">
                        <span className="font-medium">SCHEDULE - {index + 1}</span>
                        <span className="text-sm">CREATED ON : {interview.createdAt}</span>
                      </div>
                      
                      {/* Content */}
                      <div className="p-4 space-y-3 bg-background">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Date :</span>
                            <span className="font-medium">{interview.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">Time :</span>
                            <span className="font-medium">{interview.time}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Zoom Link :</span>
                          <span className="font-medium">{interview.link || 'Not provided'}</span>
                        </div>

                        {interview.assessmentEmails && (
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground whitespace-nowrap">Assessment Email :</span>
                            <span className="font-medium">{interview.assessmentEmails}</span>
                          </div>
                        )}

                        {interview.panelEmails && (
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground whitespace-nowrap">Panel Members :</span>
                            <span className="font-medium">{interview.panelEmails}</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          {interview.status !== 'completed' && interview.status !== 'cancelled' && (
                            <>
                              <Button 
                                size="sm"
                                onClick={() => handleMarkCompleted(interview.id)}
                              >
                                Demo Completed
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleCancelInterview(interview.id)}
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                          {interview.status === 'completed' && (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                          {interview.status === 'cancelled' && (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Cancelled
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'upload-marks':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">Upload marks and scores for interview rounds.</p>
            <Card>
              <CardContent className="p-4">
                <p className="text-center text-muted-foreground py-8">
                  No marks uploaded yet. Upload evaluation scores after interviews.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 'feedback':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">View and manage feedback reports from interviews.</p>
            <Card>
              <CardContent className="p-4">
                <p className="text-center text-muted-foreground py-8">
                  No feedback reports available yet.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      case 'documents':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">Manage candidate documents.</p>
            <Card>
              <CardContent className="p-4">
                {candidate.resumeUrl ? (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">Resume</p>
                      <p className="text-sm text-muted-foreground">Uploaded document</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <a href={candidate.resumeUrl} target="_blank" rel="noopener noreferrer">
                        View
                      </a>
                    </Button>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No documents uploaded yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 'offer-letter':
        return (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">Generate and send offer letters.</p>
            <Card>
              <CardContent className="p-4">
                <p className="text-center text-muted-foreground py-8">
                  Offer letter functionality will be available once candidate passes all interview stages.
                </p>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={candidate.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {getInitials(candidate.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <span>{candidate.name}</span>
              <p className="text-sm font-normal text-muted-foreground">{candidate.role}</p>
            </div>
            {candidate.aiScore && (
              <Badge className="bg-primary/10 text-primary border-primary/20 ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Score: {candidate.aiScore}%
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r bg-muted/30 shrink-0">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {sidebarItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-left transition-colors ${
                        activeTab === item.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {renderTabContent()}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CandidateStageModal;
