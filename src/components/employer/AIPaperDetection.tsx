import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload, Brain, FileText, Loader2, CheckCircle2, AlertCircle, Sparkles, Save
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ExtractedQuestion {
  question_number: number;
  question_text: string;
  question_type: string;
  options?: string[];
  marks?: number;
}

interface ExtractedAnswer {
  question_number: number;
  answer_text: string;
  keywords: string[];
}

interface MergedQuestion {
  question_number: number;
  question_text: string;
  question_type: string;
  options: string[] | null;
  marks: number;
  answer_text: string;
  keywords: string[];
}

interface AIPaperDetectionProps {
  jobId: string;
  jobTitle: string;
  existingSets: number[];
  onSaved: () => void;
}

export const AIPaperDetection = ({ jobId, jobTitle, existingSets, onSaved }: AIPaperDetectionProps) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [qpFile, setQpFile] = useState<File | null>(null);
  const [akFile, setAkFile] = useState<File | null>(null);
  const [isParsingQP, setIsParsingQP] = useState(false);
  const [isParsingAK, setIsParsingAK] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<ExtractedQuestion[]>([]);
  const [extractedAnswers, setExtractedAnswers] = useState<ExtractedAnswer[]>([]);
  const [mergedResults, setMergedResults] = useState<MergedQuestion[]>([]);
  const [targetSet, setTargetSet] = useState<string>("");
  const qpInputRef = useRef<HTMLInputElement>(null);
  const akInputRef = useRef<HTMLInputElement>(null);

  const availableSets = [1, 2, 3, 4].filter(s => !existingSets.includes(s));

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleParseQP = async () => {
    if (!qpFile) return;
    setIsParsingQP(true);
    try {
      const base64 = await readFileAsBase64(qpFile);
      const { data, error } = await supabase.functions.invoke("parse-question-paper", {
        body: { pdfBase64: base64, paperType: "question paper" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const questions = data?.questions || [];
      setExtractedQuestions(questions);
      toast.success(`AI detected ${questions.length} questions from the PDF`);

      // Auto-merge if answers already exist
      if (extractedAnswers.length > 0) {
        mergeResults(questions, extractedAnswers);
      }
    } catch (err: any) {
      console.error("QP parse error:", err);
      toast.error(err?.message || "Failed to parse question paper");
    } finally {
      setIsParsingQP(false);
    }
  };

  const handleParseAK = async () => {
    if (!akFile) return;
    setIsParsingAK(true);
    try {
      const base64 = await readFileAsBase64(akFile);

      const { data, error } = await supabase.functions.invoke("parse-answer-key", {
        body: {
          pdfBase64: base64,
          questionCount: extractedQuestions.length || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const answers = data?.answers || [];
      setExtractedAnswers(answers);
      toast.success(`AI detected ${answers.length} answers from the PDF`);

      // Auto-merge if questions already exist
      if (extractedQuestions.length > 0) {
        mergeResults(extractedQuestions, answers);
      }
    } catch (err: any) {
      console.error("AK parse error:", err);
      toast.error(err?.message || "Failed to parse answer key");
    } finally {
      setIsParsingAK(false);
    }
  };

  const mergeResults = (questions: ExtractedQuestion[], answers: ExtractedAnswer[]) => {
    const merged: MergedQuestion[] = questions.map((q) => {
      const matchingAnswer = answers.find(a => a.question_number === q.question_number);
      return {
        question_number: q.question_number,
        question_text: q.question_text,
        question_type: q.question_type || "text",
        options: q.options || null,
        marks: q.marks || 1,
        answer_text: matchingAnswer?.answer_text || "",
        keywords: matchingAnswer?.keywords || [],
      };
    });
    setMergedResults(merged);
  };

  const handleSaveToSet = async () => {
    if (!targetSet || mergedResults.length === 0) {
      toast.error("Please select a target set and ensure questions are extracted");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const setNum = parseInt(targetSet);

      // Create the question paper
      const { data: newPaper, error: paperError } = await supabase
        .from("interview_question_papers")
        .insert({
          title: `Set ${setNum} - ${jobTitle} (AI Detected)`,
          stage_type: "technical_assessment",
          description: "Auto-generated from uploaded PDFs using AI detection",
          is_active: true,
          created_by: user.id,
          job_id: jobId,
          set_number: setNum,
        } as any)
        .select()
        .single();

      if (paperError) throw paperError;

      // Insert each question and its answer key
      for (const q of mergedResults) {
        const { data: newQ, error: qError } = await supabase
          .from("interview_questions")
          .insert({
            paper_id: newPaper.id,
            question_number: q.question_number,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            marks: q.marks,
            display_order: q.question_number,
          })
          .select()
          .single();

        if (qError) throw qError;

        if (q.answer_text) {
          const { error: akError } = await supabase
            .from("interview_answer_keys")
            .insert({
              question_id: newQ.id,
              answer_text: q.answer_text,
              keywords: q.keywords.length > 0
                ? q.keywords
                : q.answer_text.split(/\s+/).filter((w: string) => w.length > 3),
            });
          if (akError) throw akError;
        }
      }

      toast.success(`Saved ${mergedResults.length} questions to Set ${setNum}!`);
      // Reset state
      setQpFile(null);
      setAkFile(null);
      setExtractedQuestions([]);
      setExtractedAnswers([]);
      setMergedResults([]);
      setTargetSet("");
      onSaved();
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || "Failed to save questions");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-2 border-dashed border-accent/40 bg-accent/5">
      <CardContent className="p-4 space-y-4">
        {/* Header with Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
              <Brain className="h-4 w-4 text-accent" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-accent" />
                AI Paper Detection
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Upload Question Paper & Answer Key PDFs — AI will auto-detect questions and answers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isEnabled ? "default" : "secondary"} className="text-[10px]">
              {isEnabled ? "Enabled" : "Disabled"}
            </Badge>
            <Switch checked={isEnabled} onCheckedChange={(checked) => {
              setIsEnabled(checked);
              toast.success(checked ? "AI Paper Detection enabled — detected questions will be shown to candidates" : "AI Paper Detection disabled");
            }} />
          </div>
        </div>

        {!isEnabled && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-[11px] text-muted-foreground">
              ⚠ AI Paper Detection is disabled. Enable it to upload PDFs and show detected questions to candidates.
            </p>
          </div>
        )}

        {isEnabled && (
          <>

        {/* Upload Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* QP Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">📄 Question Paper PDF</Label>
            <input
              ref={qpInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setQpFile(file);
              }}
            />
            <div
              className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-accent/60 hover:bg-accent/5 transition-colors"
              onClick={() => qpInputRef.current?.click()}
            >
              {qpFile ? (
                <div className="flex items-center gap-2 justify-center">
                  <FileText className="h-4 w-4 text-accent" />
                  <span className="text-xs font-medium truncate max-w-[150px]">{qpFile.name}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                </div>
              ) : (
                <div>
                  <Upload className="h-5 w-5 mx-auto text-muted-foreground/50 mb-1" />
                  <p className="text-[10px] text-muted-foreground">Click to upload QP PDF</p>
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-7"
              disabled={!qpFile || isParsingQP}
              onClick={handleParseQP}
            >
              {isParsingQP ? (
                <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Detecting Questions...</>
              ) : (
                <><Brain className="h-3 w-3 mr-1" /> Detect Questions</>
              )}
            </Button>
            {extractedQuestions.length > 0 && (
              <Badge variant="default" className="text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-0.5" /> {extractedQuestions.length} questions detected
              </Badge>
            )}
          </div>

          {/* AK Upload */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">🔑 Answer Key / Solutions PDF</Label>
            <input
              ref={akInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setAkFile(file);
              }}
            />
            <div
              className="border-2 border-dashed rounded-lg p-3 text-center cursor-pointer hover:border-accent/60 hover:bg-accent/5 transition-colors"
              onClick={() => akInputRef.current?.click()}
            >
              {akFile ? (
                <div className="flex items-center gap-2 justify-center">
                  <FileText className="h-4 w-4 text-accent" />
                  <span className="text-xs font-medium truncate max-w-[150px]">{akFile.name}</span>
                  <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                </div>
              ) : (
                <div>
                  <Upload className="h-5 w-5 mx-auto text-muted-foreground/50 mb-1" />
                  <p className="text-[10px] text-muted-foreground">Click to upload Answer Key PDF</p>
                </div>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs h-7"
              disabled={!akFile || isParsingAK}
              onClick={handleParseAK}
            >
              {isParsingAK ? (
                <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Detecting Answers...</>
              ) : (
                <><Brain className="h-3 w-3 mr-1" /> Detect Answers</>
              )}
            </Button>
            {extractedAnswers.length > 0 && (
              <Badge variant="default" className="text-[10px]">
                <CheckCircle2 className="h-3 w-3 mr-0.5" /> {extractedAnswers.length} answers detected
              </Badge>
            )}
          </div>
        </div>

        {/* Merged Results Preview */}
        {mergedResults.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                {mergedResults.length} Questions Matched with Answers
              </h4>
              <div className="flex items-center gap-2">
                <Label className="text-[10px] text-muted-foreground">Save to:</Label>
                <Select value={targetSet} onValueChange={setTargetSet}>
                  <SelectTrigger className="w-[100px] h-7 text-xs">
                    <SelectValue placeholder="Select Set" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSets.map(s => (
                      <SelectItem key={s} value={s.toString()}>Set {s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  className="text-xs h-7"
                  disabled={!targetSet || isSaving}
                  onClick={handleSaveToSet}
                >
                  {isSaving ? (
                    <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Saving...</>
                  ) : (
                    <><Save className="h-3 w-3 mr-1" /> Save to Set</>
                  )}
                </Button>
              </div>
            </div>

            {/* Preview table */}
            <div className="max-h-[300px] overflow-y-auto rounded-lg border bg-background">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-8">#</th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Question</th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-16">Type</th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">Answer</th>
                    <th className="px-2 py-1.5 text-left font-medium text-muted-foreground w-8">✓</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {mergedResults.map((q, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <td className="px-2 py-1.5 font-medium">{q.question_number}</td>
                      <td className="px-2 py-1.5 max-w-[200px] truncate">{q.question_text}</td>
                      <td className="px-2 py-1.5">
                        <Badge variant="outline" className="text-[9px]">
                          {q.question_type === "multiple_choice" ? "MCQ" : q.question_type === "true_false" ? "T/F" : "Text"}
                        </Badge>
                      </td>
                      <td className="px-2 py-1.5 max-w-[150px] truncate text-accent-foreground">
                        {q.answer_text || <span className="text-destructive">Missing</span>}
                      </td>
                      <td className="px-2 py-1.5">
                        {q.answer_text ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-accent" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Status messages when only one is done */}
        {extractedQuestions.length > 0 && extractedAnswers.length === 0 && (
          <div className="flex items-center gap-2 p-2 rounded bg-warning/10 border border-warning/30">
            <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Questions detected! Now upload the <strong>Answer Key PDF</strong> to match answers automatically.
            </p>
          </div>
        )}
        {extractedAnswers.length > 0 && extractedQuestions.length === 0 && (
          <div className="flex items-center gap-2 p-2 rounded bg-warning/10 border border-warning/30">
            <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Answers detected! Now upload the <strong>Question Paper PDF</strong> to match questions automatically.
            </p>
          </div>
        )}
        </>
        )}
      </CardContent>
    </Card>
  );
};
