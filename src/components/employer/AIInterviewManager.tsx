import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  Play, 
  Loader2, 
  CheckCircle2, 
  Clock,
  Send,
  RefreshCw,
  Eye,
  BarChart3,
  Star,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIInterviewManagerProps {
  interviewCandidateId: string;
  jobId: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  onRefresh?: () => void;
}

interface AISession {
  id: string;
  status: string;
  overall_score: number | null;
  overall_feedback: string | null;
  questions: any[];
  answers: any[];
  ai_evaluations: any[];
  created_at: string;
  completed_at: string | null;
}

export const AIInterviewManager = ({
  interviewCandidateId,
  jobId,
  candidateName,
  candidateEmail,
  jobTitle,
  onRefresh
}: AIInterviewManagerProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<AISession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Fetch existing session
  useEffect(() => {
    const fetchSession = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("ai_interview_sessions")
          .select("*")
          .eq("interview_candidate_id", interviewCandidateId)
          .single();

        if (data && !error) {
          setSession(data as AISession);
        }
      } catch (err) {
        // No session exists
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [interviewCandidateId]);

  // Generate questions for candidate
  const handleGenerateQuestions = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-interview-questions", {
        body: { jobId, interviewCandidateId, questionCount: 5 }
      });

      if (error) throw error;

      toast({
        title: "Questions Generated",
        description: `${data.questions.length} interview questions created for ${candidateName}`
      });

      // Refetch session
      const { data: newSession } = await supabase
        .from("ai_interview_sessions")
        .select("*")
        .eq("interview_candidate_id", interviewCandidateId)
        .single();

      if (newSession) {
        setSession(newSession as AISession);
      }

      onRefresh?.();
    } catch (err: any) {
      console.error("Error generating questions:", err);
      toast({
        title: "Generation Failed",
        description: err.message || "Failed to generate interview questions",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Send interview invite to candidate
  const handleSendInvite = async () => {
    setIsSendingInvite(true);
    try {
      // Call existing notification function
      await supabase.functions.invoke("send-notification-email", {
        body: {
          to: candidateEmail,
          subject: `AI Technical Interview Invitation - ${jobTitle}`,
          html: `
            <h2>Hello ${candidateName},</h2>
            <p>You have been invited to complete an AI-powered technical interview for the <strong>${jobTitle}</strong> position.</p>
            <p>Please log in to your dashboard to start the interview. The AI will ask you technical questions and you'll record your video responses.</p>
            <p><strong>Tips for the interview:</strong></p>
            <ul>
              <li>Find a quiet place with good lighting</li>
              <li>Ensure your camera and microphone are working</li>
              <li>Take your time to think before answering</li>
              <li>Speak clearly and concisely</li>
            </ul>
            <p>Good luck!</p>
          `
        }
      });

      toast({
        title: "Invitation Sent",
        description: `Interview invitation sent to ${candidateEmail}`
      });
    } catch (err: any) {
      console.error("Error sending invite:", err);
      toast({
        title: "Failed to Send",
        description: err.message || "Could not send invitation email",
        variant: "destructive"
      });
    } finally {
      setIsSendingInvite(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // No session yet
  if (!session) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">AI Technical Interview</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Generate AI-powered technical interview questions for this candidate.
          </p>
          <Button 
            onClick={handleGenerateQuestions}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Generate Interview Questions
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Session exists - show status
  const questionsCount = (session.questions as any[])?.length || 0;
  const answersCount = (session.answers as any[])?.length || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">AI Technical Interview</CardTitle>
          </div>
          <Badge 
            variant={
              session.status === "completed" ? "default" : 
              session.status === "in_progress" ? "secondary" : 
              "outline"
            }
          >
            {session.status === "completed" ? (
              <><CheckCircle2 className="mr-1 h-3 w-3" /> Completed</>
            ) : session.status === "in_progress" ? (
              <><Clock className="mr-1 h-3 w-3" /> In Progress</>
            ) : (
              <>Pending</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Questions info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Questions Generated</span>
          <span className="font-medium">{questionsCount}</span>
        </div>

        {session.status === "completed" ? (
          <>
            {/* Score display */}
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Overall Score</span>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span className="text-2xl font-bold">{session.overall_score || 0}</span>
                  <span className="text-muted-foreground">/100</span>
                </div>
              </div>
              <Progress value={session.overall_score || 0} className="h-2" />
            </div>

            {/* Feedback */}
            {session.overall_feedback && (
              <div className="p-3 border rounded-lg">
                <p className="text-sm font-medium mb-1">AI Feedback</p>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {session.overall_feedback}
                </p>
              </div>
            )}

            {/* Answers count */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Questions Answered</span>
              <span className="font-medium">{answersCount}/{questionsCount}</span>
            </div>
          </>
        ) : (
          <>
            {/* Pending/In Progress state */}
            <div className="space-y-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSendInvite}
                disabled={isSendingInvite}
                className="w-full"
              >
                {isSendingInvite ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Interview Invitation
                  </>
                )}
              </Button>

              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleGenerateQuestions}
                disabled={isGenerating}
                className="w-full"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                Regenerate Questions
              </Button>
            </div>
          </>
        )}

        <Separator />

        {/* View details link */}
        <Button variant="ghost" size="sm" className="w-full">
          <Eye className="mr-2 h-4 w-4" />
          View Full Details
        </Button>
      </CardContent>
    </Card>
  );
};

export default AIInterviewManager;
