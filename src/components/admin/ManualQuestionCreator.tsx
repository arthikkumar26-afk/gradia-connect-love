import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, GripVertical, CheckCircle2 } from "lucide-react";

export interface ManualQuestion {
  question_number: number;
  question_text: string;
  question_type: 'mcq' | 'text';
  options: string[];
  correct_answer_index?: number;
  correct_answer_text?: string;
  marks: number;
}

interface ManualQuestionCreatorProps {
  questions: ManualQuestion[];
  onQuestionsChange: (questions: ManualQuestion[]) => void;
}

export default function ManualQuestionCreator({ questions, onQuestionsChange }: ManualQuestionCreatorProps) {
  const [currentQuestion, setCurrentQuestion] = useState<ManualQuestion>({
    question_number: questions.length + 1,
    question_text: '',
    question_type: 'mcq',
    options: ['', '', '', ''],
    correct_answer_index: undefined,
    marks: 1
  });

  const addQuestion = () => {
    if (!currentQuestion.question_text.trim()) {
      return;
    }

    // Validate MCQ has options and correct answer
    if (currentQuestion.question_type === 'mcq') {
      const validOptions = currentQuestion.options.filter(o => o.trim());
      if (validOptions.length < 2) {
        return;
      }
      if (currentQuestion.correct_answer_index === undefined) {
        return;
      }
    }

    const newQuestion: ManualQuestion = {
      ...currentQuestion,
      question_number: questions.length + 1,
      options: currentQuestion.question_type === 'mcq' 
        ? currentQuestion.options.filter(o => o.trim())
        : []
    };

    onQuestionsChange([...questions, newQuestion]);
    
    // Reset form
    setCurrentQuestion({
      question_number: questions.length + 2,
      question_text: '',
      question_type: 'mcq',
      options: ['', '', '', ''],
      correct_answer_index: undefined,
      correct_answer_text: '',
      marks: 1
    });
  };

  const removeQuestion = (index: number) => {
    const updated = questions.filter((_, i) => i !== index).map((q, i) => ({
      ...q,
      question_number: i + 1
    }));
    onQuestionsChange(updated);
  };

  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...currentQuestion.options];
    newOptions[optionIndex] = value;
    setCurrentQuestion({ ...currentQuestion, options: newOptions });
  };

  const addOptionField = () => {
    if (currentQuestion.options.length < 6) {
      setCurrentQuestion({
        ...currentQuestion,
        options: [...currentQuestion.options, '']
      });
    }
  };

  const removeOptionField = (index: number) => {
    if (currentQuestion.options.length > 2) {
      const newOptions = currentQuestion.options.filter((_, i) => i !== index);
      let newCorrectIndex = currentQuestion.correct_answer_index;
      if (newCorrectIndex !== undefined) {
        if (index === newCorrectIndex) {
          newCorrectIndex = undefined;
        } else if (index < newCorrectIndex) {
          newCorrectIndex -= 1;
        }
      }
      setCurrentQuestion({
        ...currentQuestion,
        options: newOptions,
        correct_answer_index: newCorrectIndex
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Question Form */}
      <Card className="border-dashed border-2 border-primary/30 bg-primary/5">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="px-3 py-1">
              Question #{questions.length + 1}
            </Badge>
            <span className="text-sm text-muted-foreground">Add new question</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3 space-y-2">
              <Label>Question Text *</Label>
              <Textarea
                placeholder="Enter your question here..."
                value={currentQuestion.question_text}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, question_text: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={currentQuestion.question_type}
                onValueChange={(v: 'mcq' | 'text') => setCurrentQuestion({ 
                  ...currentQuestion, 
                  question_type: v,
                  correct_answer_index: undefined,
                  correct_answer_text: ''
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="text">Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* MCQ Options */}
          {currentQuestion.question_type === 'mcq' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Answer Options *</Label>
                <span className="text-xs text-muted-foreground">Select the correct answer</span>
              </div>
              <div className="space-y-2">
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium cursor-pointer transition-all ${
                        currentQuestion.correct_answer_index === index
                          ? 'bg-green-500 text-white'
                          : 'bg-muted hover:bg-muted-foreground/20'
                      }`}
                      onClick={() => setCurrentQuestion({ ...currentQuestion, correct_answer_index: index })}
                      title="Click to mark as correct answer"
                    >
                      {String.fromCharCode(65 + index)}
                    </div>
                    <Input
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      className="flex-1"
                    />
                    {currentQuestion.correct_answer_index === index && (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    )}
                    {currentQuestion.options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 text-destructive"
                        onClick={() => removeOptionField(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {currentQuestion.options.length < 6 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addOptionField}
                  className="mt-2"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              )}
            </div>
          )}

          {/* Text Answer */}
          {currentQuestion.question_type === 'text' && (
            <div className="space-y-2">
              <Label>Expected Answer / Keywords</Label>
              <Textarea
                placeholder="Enter the expected answer or keywords for evaluation..."
                value={currentQuestion.correct_answer_text || ''}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, correct_answer_text: e.target.value })}
                className="min-h-[60px]"
              />
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm">Marks:</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={currentQuestion.marks}
                onChange={(e) => setCurrentQuestion({ ...currentQuestion, marks: parseInt(e.target.value) || 1 })}
                className="w-20"
              />
            </div>
            <div className="flex-1" />
            <Button
              onClick={addQuestion}
              disabled={
                !currentQuestion.question_text.trim() ||
                (currentQuestion.question_type === 'mcq' && (
                  currentQuestion.options.filter(o => o.trim()).length < 2 ||
                  currentQuestion.correct_answer_index === undefined
                ))
              }
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Question
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Added Questions List */}
      {questions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Added Questions ({questions.length})
            </Label>
          </div>
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {questions.map((q, index) => (
                <Card key={index} className="bg-muted/30">
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center gap-2 shrink-0">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Badge variant="outline" className="px-2">Q{q.question_number}</Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{q.question_text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {q.question_type.toUpperCase()}
                          </Badge>
                          {q.question_type === 'mcq' && (
                            <span className="text-xs text-muted-foreground">
                              {q.options.length} options • 
                              Answer: {String.fromCharCode(65 + (q.correct_answer_index || 0))}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {q.marks} mark{q.marks > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={() => removeQuestion(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
