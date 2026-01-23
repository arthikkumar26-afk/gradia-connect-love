import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Brain, 
  Play, 
  Loader2, 
  CheckCircle2, 
  Clock,
  Video,
  Mic,
  AlertCircle,
  RotateCcw,
  Bot
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AIInterviewAgent from "./AIInterviewAgent";

interface AIInterviewSessionProps {
  interviewCandidateId: string;
  jobId: string;
  jobTitle: string;
  candidateName?: string;
  onComplete?: () => void;
}

interface Question {
  id: number;
  question: string;
  category: string;
  difficulty: string;
  expectedDuration: number;
  keyPoints: string[];
}

export const AIInterviewSession = ({
  interviewCandidateId,
  jobId,
  jobTitle,
  candidateName = "Candidate",
  onComplete
}: AIInterviewSessionProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [existingSession, setExistingSession] = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

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
          setExistingSession(data);
          setSessionId(data.id);
          if (data.questions && Array.isArray(data.questions)) {
            setQuestions(data.questions as unknown as Question[]);
          }
        }
      } catch (err) {
        // No existing session
      } finally {
        setIsLoading(false);
      }
    };

    fetchSession();
  }, [interviewCandidateId]);

  // Generate questions
  const generateQuestions = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-interview-questions", {
        body: { jobId, interviewCandidateId, questionCount: 5 }
      });

      if (error) throw error;

      setQuestions(data.questions);
      
      // Fetch the created session
      const { data: session } = await supabase
        .from("ai_interview_sessions")
        .select("*")
        .eq("interview_candidate_id", interviewCandidateId)
        .single();

      if (session) {
        setSessionId(session.id);
        setExistingSession(session);
      }

      toast({
        title: "Questions Generated",
        description: `${data.questions.length} interview questions are ready.`
      });
    } catch (err: any) {
      console.error("Error generating questions:", err);
      toast({
        title: "Generation Failed",
        description: err.message || "Failed to generate interview questions.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle interview completion from AI agent
  const handleAgentComplete = async (transcript: any[], recordings: string[]) => {
    if (!sessionId) return;

    setIsEvaluating(true);
    try {
      const candidateAnswers = transcript
        .filter((t: any) => t.role === "candidate")
        .map((t: any) => t.content);

      const { data, error } = await supabase.functions.invoke("evaluate-ai-interview", {
        body: { sessionId, answers: candidateAnswers, transcripts: candidateAnswers }
      });

      if (error) throw error;

      toast({
        title: "Interview Completed!",
        description: `Your score: ${data.evaluation.overallScore}/100`
      });

      onComplete?.();
    } catch (err: any) {
      console.error("Evaluation error:", err);
      toast({
        title: "Evaluation Error",
        description: err.message || "Failed to evaluate interview.",
        variant: "destructive"
      });
    } finally {
      setIsEvaluating(false);
      setIsInterviewStarted(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (isInterviewStarted && questions.length > 0 && sessionId) {
    return (
      <AIInterviewAgent
        sessionId={sessionId}
        questions={questions}
        jobTitle={jobTitle}
        candidateName={candidateName}
        onComplete={handleAgentComplete}
        onCancel={() => setIsInterviewStarted(false)}
      />
    );
  }

  if (isEvaluating) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h3 className="text-xl font-semibold">Evaluating Your Responses...</h3>
          <p className="text-muted-foreground">AI is analyzing your interview performance</p>
        </CardContent>
      </Card>
    );
  }

  // Show completed state
  if (existingSession?.status === "completed") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <CardTitle>AI Interview Completed</CardTitle>
          </div>
          <CardDescription>
            Your interview for {jobTitle} has been evaluated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold text-primary">
                {existingSession.overall_score || 0}
              </p>
              <p className="text-sm text-muted-foreground">Overall Score</p>
            </div>
            <div className="p-4 bg-muted rounded-lg text-center">
              <p className="text-3xl font-bold">
                {(existingSession.questions as any[])?.length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Questions Answered</p>
            </div>
          </div>

          {existingSession.overall_feedback && (
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">AI Feedback</h4>
              <p className="text-muted-foreground">{existingSession.overall_feedback}</p>
            </div>
          )}

          <Button variant="outline" className="w-full" onClick={() => {
            setExistingSession(null);
            setQuestions([]);
            setSessionId(null);
          }}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Take Another Interview
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <CardTitle>AI Technical Interview</CardTitle>
        </div>
        <CardDescription>
          AI-powered interview for {jobTitle}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <h4 className="font-medium text-blue-900">How it works:</h4>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <Brain className="h-4 w-4 mt-0.5 shrink-0" />
              <span>AI generates technical questions based on the job requirements</span>
            </li>
            <li className="flex items-start gap-2">
              <Mic className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Questions are read aloud - you can also read them on screen</span>
            </li>
            <li className="flex items-start gap-2">
              <Video className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Record your video responses for each question</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>AI evaluates your responses and provides detailed feedback</span>
            </li>
          </ul>
        </div>

        {/* Requirements */}
        <div className="p-4 border rounded-lg space-y-3">
          <h4 className="font-medium">Requirements:</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Video className="h-3 w-3" />
              Camera Access
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Mic className="h-3 w-3" />
              Microphone Access
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              ~15-20 minutes
            </Badge>
          </div>
        </div>

        {/* Questions preview */}
        {questions.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="font-medium">Generated Questions ({questions.length})</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {questions.map((q, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 bg-muted rounded-lg flex items-start gap-3"
                  >
                    <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-sm shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{q.question}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {q.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {q.difficulty}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {questions.length === 0 ? (
            <Button 
              className="flex-1" 
              onClick={generateQuestions}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  Generate Interview Questions
                </>
              )}
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={generateQuestions}
                disabled={isGenerating}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Regenerate
              </Button>
              <Button 
                className="flex-1" 
                onClick={() => setIsInterviewStarted(true)}
              >
                <Play className="mr-2 h-4 w-4" />
                Start Interview
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AIInterviewSession;
