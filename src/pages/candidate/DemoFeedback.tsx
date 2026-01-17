import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  CheckCircle2, 
  Loader2, 
  ArrowRight, 
  ArrowLeft,
  Brain,
  Target,
  TrendingUp,
  TrendingDown,
  Star,
  BookOpen,
  Clock,
  Mic,
  Monitor,
  Sparkles,
  Award,
  MessageSquare,
  FileText
} from 'lucide-react';

interface CriteriaScore {
  score: number;
  feedback: string;
}

interface QuestionScores {
  teachingClarity?: CriteriaScore;
  subjectKnowledge?: CriteriaScore;
  presentationSkills?: CriteriaScore;
  timeManagement?: CriteriaScore;
  overallPotential?: CriteriaScore;
}

interface StageResult {
  id: string;
  ai_score: number;
  ai_feedback: string;
  passed: boolean;
  strengths: string[];
  improvements: string[];
  question_scores: QuestionScores;
  completed_at: string;
}

interface ManagementReview {
  id: string;
  reviewer_name: string | null;
  overall_rating: number | null;
  teaching_skills_rating: number | null;
  communication_rating: number | null;
  subject_knowledge_rating: number | null;
  recommendation: string | null;
  feedback_text: string | null;
  strengths: string[] | null;
  areas_for_improvement: string[] | null;
  submitted_at: string | null;
}

export default function DemoFeedback() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');

  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<StageResult | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [managementReviews, setManagementReviews] = useState<ManagementReview[]>([]);

  useEffect(() => {
    loadFeedbackData();
  }, [sessionId, user]);

  const loadFeedbackData = async () => {
    if (!sessionId || !user) {
      setIsLoading(false);
      return;
    }

    try {
      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      setProfile(profileData);

      // Load demo round result (stage 4)
      const { data: resultData, error } = await supabase
        .from('mock_interview_stage_results')
        .select('*')
        .eq('session_id', sessionId)
        .eq('stage_order', 4)
        .maybeSingle();

      if (error) throw error;

      if (resultData) {
        setResult({
          ...resultData,
          question_scores: resultData.question_scores as QuestionScores || {},
          strengths: resultData.strengths || [],
          improvements: resultData.improvements || []
        });
      }

      // Load management reviews
      const { data: reviewsData } = await supabase
        .from('management_reviews')
        .select('*')
        .eq('session_id', sessionId)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false });

      if (reviewsData) {
        setManagementReviews(reviewsData as ManagementReview[]);
      }
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast.error('Failed to load feedback data');
    } finally {
      setIsLoading(false);
    }
  };

  const completeStageAndProceed = async () => {
    if (!sessionId) return;
    
    setIsCompleting(true);
    try {
      // Create stage result for Demo Feedback review
      await supabase
        .from('mock_interview_stage_results')
        .insert({
          session_id: sessionId,
          stage_name: 'Demo Feedback',
          stage_order: 5,
          ai_score: 100,
          ai_feedback: 'Candidate reviewed demo feedback and acknowledged areas for improvement.',
          passed: true,
          completed_at: new Date().toISOString()
        });

      // Update session to next stage
      await supabase
        .from('mock_interview_sessions')
        .update({ current_stage_order: 6 })
        .eq('id', sessionId);

      // Send next stage email
      await supabase.functions.invoke('send-mock-interview-invitation', {
        body: {
          candidateEmail: profile?.email,
          candidateName: profile?.full_name || 'Candidate',
          sessionId,
          stageOrder: 6,
          stageName: 'HR Documents',
          stageDescription: 'Submit required documents for verification and final review.',
          appUrl: window.location.origin
        }
      });

      toast.success('Proceeding to HR Documents stage!');
      navigate('/candidate/dashboard');
    } catch (error) {
      console.error('Error completing stage:', error);
      toast.error('Failed to proceed to next stage');
    } finally {
      setIsCompleting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 65) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100 border-green-200';
    if (score >= 65) return 'bg-amber-100 border-amber-200';
    return 'bg-red-100 border-red-200';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 65) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const criteriaIcons: Record<string, React.ReactNode> = {
    teachingClarity: <BookOpen className="h-5 w-5" />,
    subjectKnowledge: <Brain className="h-5 w-5" />,
    presentationSkills: <Monitor className="h-5 w-5" />,
    timeManagement: <Clock className="h-5 w-5" />,
    overallPotential: <Sparkles className="h-5 w-5" />
  };

  const criteriaLabels: Record<string, string> = {
    teachingClarity: 'Teaching Clarity',
    subjectKnowledge: 'Subject Knowledge',
    presentationSkills: 'Presentation Skills',
    timeManagement: 'Time Management',
    overallPotential: 'Overall Potential'
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your feedback...</p>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/30">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Feedback Available</h2>
            <p className="text-muted-foreground mb-4">
              Please complete the Demo Round first to view your feedback.
            </p>
            <Button onClick={() => navigate('/candidate/dashboard')}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Award className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Demo Round Feedback</h1>
          <p className="text-muted-foreground">
            Review your AI evaluation and detailed feedback from your teaching demonstration
          </p>
        </div>

        {/* Overall Score Card */}
        <Card className={`mb-6 border-2 ${getScoreBg(result.ai_score)}`}>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h2 className="text-lg font-medium text-muted-foreground mb-1">Overall Score</h2>
                <div className={`text-5xl font-bold ${getScoreColor(result.ai_score)}`}>
                  {result.ai_score}%
                </div>
                <Badge 
                  variant={result.passed ? 'default' : 'destructive'}
                  className="mt-2"
                >
                  {result.passed ? '✓ Passed' : '✗ Below Threshold'}
                </Badge>
              </div>
              
              <div className="flex-1 max-w-md w-full">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Score Progress</span>
                    <span className="font-medium">{result.ai_score}/100</span>
                  </div>
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${getProgressColor(result.ai_score)} transition-all duration-1000`}
                      style={{ width: `${result.ai_score}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Minimum passing score: 65%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Criteria Breakdown */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Criteria Breakdown
            </CardTitle>
            <CardDescription>
              Detailed scores and feedback for each evaluation criteria
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {result.question_scores && Object.entries(result.question_scores).map(([key, value]) => (
              <div key={key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {criteriaIcons[key] || <Star className="h-5 w-5" />}
                    </div>
                    <span className="font-medium">{criteriaLabels[key] || key}</span>
                  </div>
                  <div className={`text-xl font-bold ${getScoreColor(value.score)}`}>
                    {value.score}%
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${getProgressColor(value.score)} transition-all duration-500`}
                    style={{ width: `${value.score}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground pl-12">
                  {value.feedback}
                </p>
                <Separator className="mt-4" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Strengths & Improvements */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Strengths */}
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-700">
                <TrendingUp className="h-5 w-5" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {result.strengths?.length > 0 ? (
                  result.strengths.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-green-800">{strength}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-muted-foreground">
                    No specific strengths recorded. Continue practicing to build your skills!
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          {/* Areas for Improvement */}
          <Card className="border-amber-200 bg-amber-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-700">
                <TrendingDown className="h-5 w-5" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {result.improvements?.length > 0 ? (
                  result.improvements.map((improvement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Target className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-amber-800">{improvement}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-muted-foreground">
                    Great job! Keep up the good work.
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Overall Feedback */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              AI Evaluation Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {result.ai_feedback}
            </p>
          </CardContent>
        </Card>

        {/* Management Team Reviews */}
        {managementReviews.length > 0 && (
          <Card className="mb-8 border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Management Team Reviews
              </CardTitle>
              <CardDescription>
                Feedback from our review team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {managementReviews.map((review, index) => (
                <div key={review.id} className={index > 0 ? 'pt-6 border-t' : ''}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="font-semibold text-primary">
                          {review.reviewer_name?.charAt(0) || 'R'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{review.reviewer_name || 'Reviewer'}</p>
                        <p className="text-xs text-muted-foreground">
                          {review.submitted_at && new Date(review.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {review.recommendation && (
                      <Badge className={
                        review.recommendation === 'strongly_recommend' ? 'bg-green-500' :
                        review.recommendation === 'recommend' ? 'bg-blue-500' :
                        review.recommendation === 'needs_improvement' ? 'bg-orange-500' : 'bg-red-500'
                      }>
                        {review.recommendation.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                  
                  {review.overall_rating && (
                    <div className="flex items-center gap-1 mb-3">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star key={star} className={`h-5 w-5 ${star <= review.overall_rating! ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                      ))}
                      <span className="ml-2 text-sm font-medium">{review.overall_rating}/5</span>
                    </div>
                  )}
                  
                  {review.feedback_text && (
                    <p className="text-muted-foreground mb-4">{review.feedback_text}</p>
                  )}
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {review.strengths && review.strengths.length > 0 && (
                      <div className="bg-green-50 p-3 rounded-lg">
                        <p className="font-medium text-green-700 mb-2 flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" /> Strengths
                        </p>
                        <ul className="space-y-1">
                          {review.strengths.map((s, i) => (
                            <li key={i} className="text-sm text-green-800 flex items-start gap-1">
                              <CheckCircle2 className="h-3 w-3 mt-1 flex-shrink-0" /> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {review.areas_for_improvement && review.areas_for_improvement.length > 0 && (
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <p className="font-medium text-orange-700 mb-2 flex items-center gap-1">
                          <TrendingDown className="h-4 w-4" /> Areas to Improve
                        </p>
                        <ul className="space-y-1">
                          {review.areas_for_improvement.map((s, i) => (
                            <li key={i} className="text-sm text-orange-800 flex items-start gap-1">
                              <Target className="h-3 w-3 mt-1 flex-shrink-0" /> {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate('/candidate/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <Button 
            onClick={completeStageAndProceed}
            disabled={isCompleting}
            className="gap-2"
            size="lg"
          >
            {isCompleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Acknowledge & Proceed to HR Documents
          </Button>
        </div>
      </div>
    </div>
  );
}
