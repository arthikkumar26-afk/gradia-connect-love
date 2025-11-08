import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { AIEvaluation, ScreeningQuestion } from '@/contexts/EmployerContext';
import { Brain, CheckCircle, XCircle, Sparkles } from 'lucide-react';

interface ScreeningTestSectionProps {
  placementId: string;
  evaluation?: AIEvaluation;
  onComplete: (evaluation: AIEvaluation) => void;
}

const SCREENING_QUESTIONS: ScreeningQuestion[] = [
  {
    id: '1',
    question: 'What is the primary purpose of React Hooks?',
    type: 'mcq',
    options: [
      'To replace class components entirely',
      'To allow state and lifecycle features in function components',
      'To improve performance',
      'To handle routing',
    ],
    correctAnswer: 'To allow state and lifecycle features in function components',
  },
  {
    id: '2',
    question: 'Explain the concept of virtual DOM in React.',
    type: 'text',
  },
  {
    id: '3',
    question: 'Which of the following is NOT a valid React lifecycle method?',
    type: 'mcq',
    options: [
      'componentDidMount',
      'componentWillReceiveProps',
      'componentDidRender',
      'componentWillUnmount',
    ],
    correctAnswer: 'componentDidRender',
  },
  {
    id: '4',
    question: 'What is the difference between controlled and uncontrolled components?',
    type: 'text',
  },
  {
    id: '5',
    question: 'What is the purpose of keys in React lists?',
    type: 'mcq',
    options: [
      'To improve SEO',
      'To help React identify which items have changed',
      'To style list items',
      'To sort the list',
    ],
    correctAnswer: 'To help React identify which items have changed',
  },
];

export default function ScreeningTestSection({
  placementId,
  evaluation,
  onComplete,
}: ScreeningTestSectionProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(!!evaluation);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Simulate AI evaluation
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Calculate score based on MCQ answers
      let correctCount = 0;
      let totalMcq = 0;
      SCREENING_QUESTIONS.forEach((q) => {
        if (q.type === 'mcq' && q.correctAnswer) {
          totalMcq++;
          if (answers[q.id] === q.correctAnswer) {
            correctCount++;
          }
        }
      });

      // Base score from MCQ (60% weight)
      const mcqScore = (correctCount / totalMcq) * 60;
      
      // Simulated text evaluation (40% weight)
      const textScore = Math.floor(Math.random() * 20) + 20; // 20-40 points
      
      const totalScore = Math.round(mcqScore + textScore);

      const newEvaluation: AIEvaluation = {
        id: `eval_${Date.now()}`,
        score: totalScore,
        rationale: `The candidate demonstrated ${
          totalScore >= 80 ? 'excellent' : totalScore >= 60 ? 'good' : 'moderate'
        } understanding of React fundamentals. MCQ answers were ${
          correctCount === totalMcq ? 'perfect' : `${correctCount}/${totalMcq} correct`
        }. Text responses showed ${
          totalScore >= 80 ? 'strong' : totalScore >= 60 ? 'adequate' : 'basic'
        } comprehension of advanced concepts.`,
        evaluatedAt: new Date().toISOString(),
        questions: SCREENING_QUESTIONS,
        answers: Object.values(answers),
      };

      onComplete(newEvaluation);
      setShowResults(true);
    } finally {
      setLoading(false);
    }
  };

  const allQuestionsAnswered = SCREENING_QUESTIONS.every((q) => answers[q.id]);

  if (showResults && evaluation) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">AI Evaluation Results</h3>
        </div>

        <div className="bg-gradient-to-br from-primary/10 to-blue-500/10 p-6 rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Overall Score</p>
              <div className="flex items-center gap-3">
                <p className="text-4xl font-bold text-primary">{evaluation.score}/100</p>
                <Badge
                  className={
                    evaluation.score >= 80
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                      : evaluation.score >= 60
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                  }
                >
                  {evaluation.score >= 80 ? 'Excellent' : evaluation.score >= 60 ? 'Good' : 'Average'}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-center w-24 h-24 rounded-full bg-background">
              <div className="relative w-20 h-20">
                <svg className="transform -rotate-90" width="80" height="80">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-muted"
                  />
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${(evaluation.score / 100) * 226} 226`}
                    className="text-primary"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground font-medium mb-2">AI Analysis:</p>
            <p className="text-sm text-foreground">{evaluation.rationale}</p>
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-xs text-muted-foreground">
            Evaluated on {new Date(evaluation.evaluatedAt).toLocaleString()}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Screening Test</h3>
      </div>

      <div className="space-y-6">
        {SCREENING_QUESTIONS.map((question, index) => (
          <div key={question.id} className="space-y-3 pb-6 border-b last:border-0">
            <Label className="text-base font-medium">
              {index + 1}. {question.question}
            </Label>

            {question.type === 'mcq' && question.options ? (
              <RadioGroup
                value={answers[question.id] || ''}
                onValueChange={(value) => handleAnswerChange(question.id, value)}
              >
                {question.options.map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                    <Label
                      htmlFor={`${question.id}-${option}`}
                      className="font-normal cursor-pointer"
                    >
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            ) : (
              <Textarea
                placeholder="Type your answer here..."
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                rows={4}
              />
            )}
          </div>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!allQuestionsAnswered || loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Brain className="w-4 h-4 mr-2 animate-pulse" />
            AI is Evaluating...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            Submit for AI Evaluation
          </>
        )}
      </Button>
    </Card>
  );
}
