import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  TrendingDown,
  Star,
  AlertTriangle,
  Target,
  Award,
  Video,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface QuestionScore {
  questionId: number;
  score: number;
  feedback: string;
}

interface MockInterviewResultsProps {
  stageName: string;
  overallScore: number;
  passed: boolean;
  passingScore: number;
  feedback: string;
  strengths: string[];
  improvements: string[];
  questionScores?: QuestionScore[];
  questions?: Array<{ id: number; question: string; category: string }>;
  answers?: string[];
  recordingUrl?: string | null;
  onContinue?: () => void;
  onRetry?: () => void;
  isLastStage?: boolean;
}

export const MockInterviewResults = ({
  stageName,
  overallScore,
  passed,
  passingScore,
  feedback,
  strengths,
  improvements,
  questionScores,
  questions,
  answers,
  recordingUrl,
  onContinue,
  onRetry,
  isLastStage
}: MockInterviewResultsProps) => {
  const [showRecording, setShowRecording] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className={passed ? 'border-green-500/50' : 'border-red-500/50'}>
        <CardHeader className="text-center pb-2">
          <div className="flex flex-col items-center gap-3">
            <div className={`h-20 w-20 rounded-full flex items-center justify-center ${
              passed 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : 'bg-red-100 dark:bg-red-900/30'
            }`}>
              {passed ? (
                <Award className="h-10 w-10 text-green-600" />
              ) : (
                <AlertTriangle className="h-10 w-10 text-red-600" />
              )}
            </div>
            <div>
              <CardTitle className={passed ? 'text-green-600' : 'text-red-600'}>
                {passed ? 'Stage Completed!' : 'Stage Not Passed'}
              </CardTitle>
              <CardDescription className="mt-1">{stageName}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Display */}
          <div className="flex flex-col items-center gap-2">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${(overallScore / 100) * 352} 352`}
                  strokeLinecap="round"
                  className={passed ? 'text-green-500' : 'text-red-500'}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{overallScore.toFixed(0)}%</span>
                <span className="text-xs text-muted-foreground">Score</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Passing score: {passingScore}%
            </p>
          </div>

          {/* Recording Button */}
          {recordingUrl && (
            <div className="flex justify-center">
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={() => setShowRecording(true)}
              >
                <Play className="h-4 w-4" />
                View Interview Recording
              </Button>
            </div>
          )}

          {/* Overall Feedback */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-foreground text-center">{feedback}</p>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Improvements */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Strengths (Positives) */}
        <Card className="border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-green-600">
              <TrendingUp className="h-5 w-5" />
              Strengths (What You Did Well)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-3 p-2 rounded-lg bg-green-50 dark:bg-green-900/10">
                  <div className="h-6 w-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-sm text-foreground">{strength}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Areas to Improve (Negatives) */}
        <Card className="border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <TrendingDown className="h-5 w-5" />
              Areas to Improve (Work On These)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {improvements.map((improvement, index) => (
                <li key={index} className="flex items-start gap-3 p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10">
                  <div className="h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                    <Target className="h-4 w-4 text-amber-600" />
                  </div>
                  <span className="text-sm text-foreground">{improvement}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Question-by-Question Breakdown */}
      {questionScores && questionScores.length > 0 && questions && answers && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Question-by-Question Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-[400px]">
              <div className="space-y-4">
                {questionScores.map((qs, index) => {
                  const question = questions.find(q => q.id === qs.questionId) || questions[index];
                  const answer = answers[index];
                  const scorePercent = (qs.score / 100) * 100;

                  return (
                    <div key={index} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <Badge variant="outline" className="mb-2">
                            {question?.category || 'General'}
                          </Badge>
                          <p className="text-sm font-medium">{question?.question || `Question ${index + 1}`}</p>
                        </div>
                        <Badge 
                          variant={qs.score >= 70 ? 'default' : qs.score >= 50 ? 'secondary' : 'destructive'}
                          className="flex-shrink-0"
                        >
                          {qs.score}%
                        </Badge>
                      </div>
                      
                      <Progress value={scorePercent} className="h-1.5 mb-2" />
                      
                      <div className="mt-3 space-y-2">
                        <div className="p-2 rounded bg-muted/50">
                          <p className="text-xs text-muted-foreground mb-1">Your Answer:</p>
                          <p className="text-sm">{answer || 'No answer provided'}</p>
                        </div>
                        <div className="p-2 rounded bg-primary/5">
                          <p className="text-xs text-muted-foreground mb-1">Feedback:</p>
                          <p className="text-sm">{qs.feedback}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        {passed && !isLastStage && onContinue && (
          <Button onClick={onContinue} className="gap-2">
            Continue to Next Stage
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        )}
        {passed && isLastStage && onRetry && (
          <Button onClick={onRetry} variant="outline" className="gap-2">
            Start New Session
          </Button>
        )}
        {!passed && onRetry && (
          <Button onClick={onRetry} className="gap-2">
            Try Again
          </Button>
        )}
      </div>

      {/* Recording Dialog */}
      <Dialog open={showRecording} onOpenChange={setShowRecording}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Interview Recording - {stageName}
            </DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {recordingUrl && (
              <video
                src={recordingUrl}
                controls
                className="w-full h-full"
                autoPlay
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
