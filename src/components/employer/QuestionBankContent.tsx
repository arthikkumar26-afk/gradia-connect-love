import { useState, useRef } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Database, Upload, Loader2, Trash2, FileText, CheckCircle2,
  BookOpen, Edit, Save, Plus, X, ChevronDown, ChevronUp, Calendar
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuestionBankQuestion {
  id: string;
  question_number: number;
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "text" | "fill_blank";
  options?: string[];
  correct_answer: string;
  category: string;
  marks: number;
  source_pdf?: string;
}

interface UploadedPaper {
  id: string;
  fileName: string;
  uploadedAt: Date;
  questions: QuestionBankQuestion[];
  isEnabled: boolean;
}

interface QuestionBankProps {
  jobId: string;
  jobTitle: string;
}

export const QuestionBankContent = ({ jobId, jobTitle }: QuestionBankProps) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [papers, setPapers] = useState<UploadedPaper[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedPapers, setExpandedPapers] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const typeLabel = (t: string) => {
    switch (t) {
      case "multiple_choice": return "MCQ";
      case "true_false": return "True/False";
      case "text": return "Text";
      case "fill_blank": return "Fill Blank";
      default: return t;
    }
  };

  const typeBadgeColor = (t: string) => {
    switch (t) {
      case "multiple_choice": return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
      case "true_false": return "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300";
      case "text": return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
      case "fill_blank": return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const allowedExts = [".pdf", ".doc", ".docx"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
      toast.error("Please upload a PDF or Word file (.pdf, .doc, .docx)");
      return;
    }

    setIsUploading(true);
    setIsParsing(true);

    try {
      const base64 = await fileToBase64(file);

      const { data, error } = await supabase.functions.invoke("parse-question-paper", {
        body: {
          pdfBase64: base64,
          fileName: file.name,
          paperType: "question_bank",
          language: "auto-detect",
        },
      });

      if (error) throw error;

      if (data?.questions?.length) {
        const newQuestions: QuestionBankQuestion[] = data.questions.map((q: any, idx: number) => ({
          id: `qb-${Date.now()}-${idx}`,
          question_number: idx + 1,
          question_text: q.question_text,
          question_type: q.question_type || "text",
          options: q.options || undefined,
          correct_answer: q.options?.[0] || "",
          category: "General",
          marks: 1,
          source_pdf: file.name,
        }));

        const newPaper: UploadedPaper = {
          id: `paper-${Date.now()}`,
          fileName: file.name,
          uploadedAt: new Date(),
          questions: newQuestions,
          isEnabled: true,
        };

        // Add new paper at the TOP (newest first)
        setPapers(prev => [newPaper, ...prev]);
        setExpandedPapers(prev => new Set([...prev, newPaper.id]));
        toast.success(`${newQuestions.length} questions detected from ${file.name}`);
      } else {
        toast.error("No questions detected in the file");
      }
    } catch (err) {
      console.error("File parse error:", err);
      toast.error("Failed to parse file. Please try again.");
    } finally {
      setIsUploading(false);
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const togglePaperExpand = (paperId: string) => {
    setExpandedPapers(prev => {
      const next = new Set(prev);
      if (next.has(paperId)) next.delete(paperId);
      else next.add(paperId);
      return next;
    });
  };

  const togglePaperEnabled = (paperId: string) => {
    setPapers(prev => prev.map(p =>
      p.id === paperId ? { ...p, isEnabled: !p.isEnabled } : p
    ));
  };

  const removePaper = (paperId: string) => {
    setPapers(prev => prev.filter(p => p.id !== paperId));
    toast.success("Paper removed");
  };

  const updateQuestion = (paperId: string, qId: string, field: string, value: any) => {
    setPapers(prev => prev.map(p => {
      if (p.id !== paperId) return p;
      return {
        ...p,
        questions: p.questions.map(q => q.id === qId ? { ...q, [field]: value } : q),
      };
    }));
  };

  const updateOption = (paperId: string, qId: string, optIdx: number, value: string) => {
    setPapers(prev => prev.map(p => {
      if (p.id !== paperId) return p;
      return {
        ...p,
        questions: p.questions.map(q => {
          if (q.id !== qId) return q;
          const opts = [...(q.options || [])];
          opts[optIdx] = value;
          return { ...q, options: opts };
        }),
      };
    }));
  };

  const removeQuestion = (paperId: string, qId: string) => {
    setPapers(prev => prev.map(p => {
      if (p.id !== paperId) return p;
      return { ...p, questions: p.questions.filter(q => q.id !== qId) };
    }));
    toast.success("Question removed");
  };

  const totalQuestions = papers.reduce((sum, p) => sum + p.questions.length, 0);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className={`border-2 transition-colors ${isEnabled ? "border-primary/30 bg-primary/5" : "border-dashed border-muted-foreground/30"}`}>
      <CardContent className="py-4 px-5 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              <Database className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Question Bank</p>
              <p className="text-xs text-muted-foreground">
                Upload PDF/Word — AI auto-detects questions & answers
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isEnabled ? "default" : "secondary"} className="text-[10px]">
              {isEnabled ? "Enabled" : "Disabled"}
            </Badge>
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => {
                setIsEnabled(checked);
                toast.success(checked ? "Question Bank enabled" : "Question Bank disabled");
              }}
            />
          </div>
        </div>

        {!isEnabled && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-[11px] text-muted-foreground">⚠ Question Bank is disabled. Candidates won't see these questions.</p>
          </div>
        )}

        {isEnabled && (
          <div className="space-y-3">
            {/* Upload Action */}
            <div className="flex items-center gap-2 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isParsing ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5 mr-1" />
                )}
                {isParsing ? "Detecting Questions..." : "Upload PDF/Word"}
              </Button>

              {papers.length > 0 && (
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {papers.length} paper(s) · {totalQuestions} questions total
                </span>
              )}
            </div>

            {/* No papers */}
            {papers.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed rounded-lg">
                <Database className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No papers uploaded yet. Upload a PDF or Word file to auto-detect questions.</p>
              </div>
            )}

            {/* Individual Papers - newest first (already sorted) */}
            {papers.map((paper) => {
              const isExpanded = expandedPapers.has(paper.id);
              const mcqCount = paper.questions.filter(q => q.question_type === "multiple_choice").length;
              const tfCount = paper.questions.filter(q => q.question_type === "true_false").length;
              const textCount = paper.questions.filter(q => q.question_type === "text").length;
              const fbCount = paper.questions.filter(q => q.question_type === "fill_blank").length;

              return (
                <div key={paper.id} className={`border rounded-lg overflow-hidden ${paper.isEnabled ? "border-border" : "border-dashed border-muted-foreground/30 opacity-60"}`}>
                  {/* Paper Header */}
                  <div
                    className="flex items-center gap-2 px-3 py-2 bg-secondary cursor-pointer hover:bg-secondary/80 transition-colors"
                    onClick={() => togglePaperExpand(paper.id)}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{paper.fileName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                          <Calendar className="h-2.5 w-2.5" />
                          {formatDate(paper.uploadedAt)}
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{paper.questions.length} Q</Badge>
                        {mcqCount > 0 && <Badge variant="outline" className={`text-[8px] px-1 py-0 ${typeBadgeColor("multiple_choice")}`}>MCQ:{mcqCount}</Badge>}
                        {tfCount > 0 && <Badge variant="outline" className={`text-[8px] px-1 py-0 ${typeBadgeColor("true_false")}`}>T/F:{tfCount}</Badge>}
                        {textCount > 0 && <Badge variant="outline" className={`text-[8px] px-1 py-0 ${typeBadgeColor("text")}`}>Text:{textCount}</Badge>}
                        {fbCount > 0 && <Badge variant="outline" className={`text-[8px] px-1 py-0 ${typeBadgeColor("fill_blank")}`}>Fill:{fbCount}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <Switch
                        checked={paper.isEnabled}
                        onCheckedChange={() => togglePaperEnabled(paper.id)}
                        className="scale-75"
                      />
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removePaper(paper.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  </div>

                  {/* Paper Questions */}
                  {isExpanded && (
                    <div className="px-3 py-2 space-y-1.5">
                      <Accordion type="multiple" className="space-y-1">
                        {paper.questions.map((q, idx) => (
                          <AccordionItem key={q.id} value={q.id} className="border rounded overflow-hidden">
                            <AccordionTrigger className="px-2.5 py-1.5 hover:no-underline hover:bg-muted/30 text-left">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <Badge variant="outline" className="text-[10px] shrink-0">Q{idx + 1}</Badge>
                                <Badge variant="outline" className={`text-[9px] shrink-0 ${typeBadgeColor(q.question_type)}`}>
                                  {typeLabel(q.question_type)}
                                </Badge>
                                <p className="text-xs truncate flex-1">{q.question_text || "New question..."}</p>
                                <Badge variant="outline" className="text-[9px] shrink-0">{q.marks} mk</Badge>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-2.5 pb-2.5">
                              {editingId === q.id ? (
                                <div className="space-y-2 pt-1">
                                  <div>
                                    <Label className="text-[10px]">Question</Label>
                                    <Input
                                      value={q.question_text}
                                      onChange={e => updateQuestion(paper.id, q.id, "question_text", e.target.value)}
                                      placeholder="Enter the question..."
                                      className="text-xs h-8"
                                    />
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <div>
                                      <Label className="text-[10px]">Type</Label>
                                      <Select value={q.question_type} onValueChange={v => updateQuestion(paper.id, q.id, "question_type", v)}>
                                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="multiple_choice" className="text-xs">MCQ</SelectItem>
                                          <SelectItem value="true_false" className="text-xs">True/False</SelectItem>
                                          <SelectItem value="text" className="text-xs">Text</SelectItem>
                                          <SelectItem value="fill_blank" className="text-xs">Fill Blank</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div>
                                      <Label className="text-[10px]">Marks</Label>
                                      <Input type="number" value={q.marks} onChange={e => updateQuestion(paper.id, q.id, "marks", parseInt(e.target.value) || 1)} className="h-8 text-xs" min={1} />
                                    </div>
                                    <div>
                                      <Label className="text-[10px]">Category</Label>
                                      <Input value={q.category} onChange={e => updateQuestion(paper.id, q.id, "category", e.target.value)} className="h-8 text-xs" />
                                    </div>
                                  </div>
                                  {q.question_type === "multiple_choice" && (
                                    <div className="grid grid-cols-2 gap-1.5">
                                      {(q.options || ["", "", "", ""]).map((opt, oIdx) => (
                                        <div key={oIdx} className="flex items-center gap-1">
                                          <Badge variant="outline" className="text-[9px] w-5 h-5 flex items-center justify-center p-0 shrink-0">
                                            {String.fromCharCode(65 + oIdx)}
                                          </Badge>
                                          <Input
                                            value={opt}
                                            onChange={e => updateOption(paper.id, q.id, oIdx, e.target.value)}
                                            placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                            className="text-xs h-7"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  <div>
                                    <Label className="text-[10px] text-primary font-semibold">✅ Correct Answer</Label>
                                    <Input
                                      value={q.correct_answer}
                                      onChange={e => updateQuestion(paper.id, q.id, "correct_answer", e.target.value)}
                                      placeholder={q.question_type === "multiple_choice" ? "e.g. A" : "Enter answer..."}
                                      className="text-xs h-8"
                                    />
                                  </div>
                                  <div className="flex gap-1.5 pt-1">
                                    <Button size="sm" className="text-[10px] h-6" onClick={() => setEditingId(null)}>
                                      <Save className="h-3 w-3 mr-0.5" /> Done
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-[10px] h-6 text-destructive" onClick={() => removeQuestion(paper.id, q.id)}>
                                      <Trash2 className="h-3 w-3 mr-0.5" /> Delete
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2 pt-1">
                                  <p className="text-xs font-medium">{q.question_text}</p>
                                  {q.question_type === "multiple_choice" && q.options && (
                                    <div className="grid grid-cols-2 gap-1 ml-1">
                                      {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className={`text-[10px] px-2 py-0.5 rounded border ${
                                          q.correct_answer.toUpperCase().startsWith(String.fromCharCode(65 + oIdx))
                                            ? "bg-accent/10 border-accent/40 font-medium"
                                            : "bg-muted/30 border-border"
                                        }`}>
                                          {String.fromCharCode(65 + oIdx)}) {opt}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {q.question_type === "true_false" && (
                                    <div className="flex gap-2 ml-1">
                                      <span className={`text-[10px] px-2 py-0.5 rounded border ${q.correct_answer.toLowerCase().includes("true") ? "bg-accent/10 border-accent/40 font-medium" : "bg-muted/30"}`}>True</span>
                                      <span className={`text-[10px] px-2 py-0.5 rounded border ${q.correct_answer.toLowerCase().includes("false") ? "bg-accent/10 border-accent/40 font-medium" : "bg-muted/30"}`}>False</span>
                                    </div>
                                  )}
                                  <div className="p-1.5 bg-primary/5 rounded border border-primary/15">
                                    <p className="text-[10px] text-primary font-semibold">✅ Answer: {q.correct_answer || "Not set"}</p>
                                  </div>
                                  <div className="flex gap-1.5 pt-1">
                                    <Button size="sm" variant="outline" className="text-[10px] h-6" onClick={() => setEditingId(q.id)}>
                                      <Edit className="h-3 w-3 mr-0.5" /> Edit
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-[10px] h-6 text-destructive" onClick={() => removeQuestion(paper.id, q.id)}>
                                      <Trash2 className="h-3 w-3 mr-0.5" /> Delete
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
