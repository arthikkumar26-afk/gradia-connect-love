import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Briefcase, 
  GraduationCap, 
  Star, 
  Brain,
  CheckCircle,
  AlertCircle,
  Target,
  Download,
  ExternalLink
} from 'lucide-react';

interface CandidateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: {
    id: string;
    candidate_id: string;
    job_id: string;
    ai_score: number | null;
    ai_analysis: any;
    status: string;
    current_stage_id: string | null;
    applied_at: string;
    resume_url: string | null;
    candidate: {
      id: string;
      full_name: string;
      email: string;
      mobile: string | null;
      location: string | null;
      experience_level: string | null;
      preferred_role: string | null;
      profile_picture: string | null;
    } | null;
    job: {
      job_title: string;
      department: string | null;
    } | null;
    current_stage: {
      name: string;
      stage_order: number;
    } | null;
  } | null;
}

export default function CandidateDetailModal({
  isOpen,
  onClose,
  candidate,
}: CandidateDetailModalProps) {
  if (!candidate) return null;

  const analysis = candidate.ai_analysis;
  const profile = candidate.candidate;

  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-muted-foreground';
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number | null) => {
    if (!score) return 'bg-muted';
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-blue-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRecommendationDetails = (rec: string | undefined) => {
    switch (rec) {
      case 'strong_yes':
        return { label: 'Strong Yes', color: 'bg-green-600 text-white', icon: '⭐' };
      case 'yes':
        return { label: 'Yes', color: 'bg-green-500 text-white', icon: '✓' };
      case 'maybe':
        return { label: 'Maybe', color: 'bg-yellow-500 text-white', icon: '?' };
      default:
        return { label: 'No', color: 'bg-red-500 text-white', icon: '✗' };
    }
  };

  const recommendation = getRecommendationDetails(analysis?.recommendation);

  const formatExperienceLevel = (level: string | null | undefined) => {
    if (!level) return 'Not specified';
    return level.charAt(0).toUpperCase() + level.slice(1).replace('_', ' ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  {profile?.profile_picture ? (
                    <img
                      src={profile.profile_picture}
                      alt={profile.full_name}
                      className="h-16 w-16 rounded-full object-cover border-2 border-primary/20"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary">
                        {profile?.full_name?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                  <div>
                    <DialogTitle className="text-2xl mb-1">{profile?.full_name || 'Unknown Candidate'}</DialogTitle>
                    <p className="text-muted-foreground">{profile?.preferred_role || 'Job Seeker'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {candidate.current_stage?.name || 'Resume Screening'}
                      </Badge>
                      <Badge className={recommendation.color}>
                        {recommendation.icon} {recommendation.label}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* AI Score Circle */}
                <div className="text-center">
                  <div className={`h-20 w-20 rounded-full border-4 ${getScoreBg(candidate.ai_score)} flex items-center justify-center`}>
                    <span className="text-2xl font-bold text-white">
                      {candidate.ai_score || 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">AI Score</p>
                </div>
              </div>
            </DialogHeader>

            <div className="grid md:grid-cols-3 gap-6">
              {/* Left Column - Contact & Basic Info */}
              <div className="space-y-4">
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-primary" />
                    Contact Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${profile?.email}`} className="text-primary hover:underline">
                        {profile?.email || 'N/A'}
                      </a>
                    </div>
                    {profile?.mobile && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${profile.mobile}`} className="text-primary hover:underline">
                          {profile.mobile}
                        </a>
                      </div>
                    )}
                    {profile?.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{profile.location}</span>
                      </div>
                    )}
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Professional Details
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Experience Level:</span>
                      <p className="font-medium">{formatExperienceLevel(profile?.experience_level)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Preferred Role:</span>
                      <p className="font-medium">{profile?.preferred_role || 'Not specified'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Applied For:</span>
                      <p className="font-medium">{candidate.job?.job_title}</p>
                      <p className="text-xs text-muted-foreground">{candidate.job?.department}</p>
                    </div>
                  </div>
                </Card>

                {candidate.resume_url && (
                  <Card className="p-4">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Resume
                    </h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View
                        </a>
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <a href={candidate.resume_url} download>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </Card>
                )}
              </div>

              {/* Right Column - AI Analysis */}
              <div className="md:col-span-2 space-y-4">
                {/* Score Breakdown */}
                {analysis && (
                  <Card className="p-4">
                    <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      AI Analysis Breakdown
                    </h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(analysis.skill_match_score)}`}>
                          {analysis.skill_match_score || 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">Skill Match</p>
                        <Progress value={analysis.skill_match_score || 0} className="h-1 mt-1" />
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(analysis.experience_match_score)}`}>
                          {analysis.experience_match_score || 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">Experience Match</p>
                        <Progress value={analysis.experience_match_score || 0} className="h-1 mt-1" />
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(analysis.location_match_score)}`}>
                          {analysis.location_match_score || 0}%
                        </div>
                        <p className="text-xs text-muted-foreground">Location Match</p>
                        <Progress value={analysis.location_match_score || 0} className="h-1 mt-1" />
                      </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Summary */}
                    {analysis.summary && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-foreground mb-2">Summary</h4>
                        <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                          {analysis.summary}
                        </p>
                      </div>
                    )}
                  </Card>
                )}

                {/* Strengths & Concerns */}
                {analysis && (
                  <div className="grid md:grid-cols-2 gap-4">
                    {analysis.strengths && analysis.strengths.length > 0 && (
                      <Card className="p-4">
                        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Strengths
                        </h3>
                        <ul className="space-y-2">
                          {analysis.strengths.map((strength: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Star className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                              <span>{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}

                    {analysis.concerns && analysis.concerns.length > 0 && (
                      <Card className="p-4">
                        <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-600" />
                          Areas of Concern
                        </h3>
                        <ul className="space-y-2">
                          {analysis.concerns.map((concern: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <AlertCircle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                              <span>{concern}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    )}
                  </div>
                )}

                {/* Interview Focus */}
                {analysis?.suggested_interview_focus && analysis.suggested_interview_focus.length > 0 && (
                  <Card className="p-4">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      Suggested Interview Focus Areas
                    </h3>
                    <ul className="grid md:grid-cols-2 gap-2">
                      {analysis.suggested_interview_focus.map((focus: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm bg-primary/5 p-2 rounded-lg">
                          <Target className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{focus}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Application Timeline */}
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    Application Timeline
                  </h3>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Applied:</span>
                      <p className="font-medium">
                        {new Date(candidate.applied_at).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <Separator orientation="vertical" className="h-8" />
                    <div>
                      <span className="text-muted-foreground">Current Stage:</span>
                      <p className="font-medium">{candidate.current_stage?.name || 'Resume Screening'}</p>
                    </div>
                    <Separator orientation="vertical" className="h-8" />
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant="outline" className="ml-2">
                        {candidate.status}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              {profile?.email && (
                <Button variant="outline" asChild>
                  <a href={`mailto:${profile.email}`}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </a>
                </Button>
              )}
              {profile?.mobile && (
                <Button asChild>
                  <a href={`tel:${profile.mobile}`}>
                    <Phone className="h-4 w-4 mr-2" />
                    Call Candidate
                  </a>
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
