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
  Database, Upload, Loader2, Trash2, FileText, Calendar,
  Edit, Save, ChevronDown, ChevronUp, ListChecks, ToggleLeft,
  ArrowLeftRight, HelpCircle, FileQuestion, Image, Map, AlignLeft, AlignJustify, Eye
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuestionBankQuestion {
  id: string;
  question_number: number;
  question_text: string;
  question_type: string;
  options?: string[];
  correct_answer: string;
  marks: number;
  source_pdf?: string;
  uploadedAt: Date;
}

interface SectionConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  badgeColor: string;
}

interface QuestionBankProps {
  jobId: string;
  jobTitle: string;
}

const SECTIONS: SectionConfig[] = [
  { key: "mcq", label: "MCQ", icon: <ListChecks className="h-3.5 w-3.5" />, color: "text-blue-600", badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  { key: "fill_blank", label: "Fill in the Blanks", icon: <AlignLeft className="h-3.5 w-3.5" />, color: "text-emerald-600", badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" },
  { key: "true_false", label: "True or False", icon: <ToggleLeft className="h-3.5 w-3.5" />, color: "text-purple-600", badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" },
  { key: "match", label: "Match the Following", icon: <ArrowLeftRight className="h-3.5 w-3.5" />, color: "text-orange-600", badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300" },
  { key: "assertion", label: "Assertion & Reasoning", icon: <HelpCircle className="h-3.5 w-3.5" />, color: "text-rose-600", badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" },
  { key: "short_answer", label: "Short Answers", icon: <AlignLeft className="h-3.5 w-3.5" />, color: "text-cyan-600", badgeColor: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300" },
  { key: "long_answer", label: "Long Answers", icon: <AlignJustify className="h-3.5 w-3.5" />, color: "text-amber-600", badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  { key: "image_base", label: "Image Based", icon: <Image className="h-3.5 w-3.5" />, color: "text-pink-600", badgeColor: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300" },
  { key: "map_base", label: "Map Based", icon: <Map className="h-3.5 w-3.5" />, color: "text-teal-600", badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300" },
];

export const QuestionBankContent = ({ jobId, jobTitle }: QuestionBankProps) => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [sectionQuestions, setSectionQuestions] = useState<Record<string, QuestionBankQuestion[]>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (sectionKey: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExts = [".pdf", ".doc", ".docx"];
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (![
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ].includes(file.type) && !allowedExts.includes(ext)) {
      toast.error("Please upload a PDF or Word file (.pdf, .doc, .docx)");
      return;
    }

    setUploadingSection(sectionKey);
    try {
      const base64 = await fileToBase64(file);
      const sectionLabel = SECTIONS.find(s => s.key === sectionKey)?.label || sectionKey;

      const { data, error } = await supabase.functions.invoke("parse-question-paper", {
        body: {
          pdfBase64: base64,
          fileName: file.name,
          paperType: sectionLabel,
          language: "auto-detect",
        },
      });

      if (error) throw error;

      if (data?.questions?.length) {
        const newQuestions: QuestionBankQuestion[] = data.questions.map((q: any, idx: number) => ({
          id: `qb-${sectionKey}-${Date.now()}-${idx}`,
          question_number: idx + 1,
          question_text: q.question_text,
          question_type: sectionKey,
          options: q.options || undefined,
          correct_answer: q.options?.[0] || "",
          marks: 1,
          source_pdf: file.name,
          uploadedAt: new Date(),
        }));

        setSectionQuestions(prev => ({
          ...prev,
          [sectionKey]: [...newQuestions, ...(prev[sectionKey] || [])],
        }));
        setExpandedSections(prev => new Set([...prev, sectionKey]));
        toast.success(`${newQuestions.length} questions added to ${sectionLabel} from ${file.name}`);
      } else {
        toast.error("No questions detected in the file");
      }
    } catch (err) {
      console.error("File parse error:", err);
      toast.error("Failed to parse file. Please try again.");
    } finally {
      setUploadingSection(null);
      const ref = fileInputRefs.current[sectionKey];
      if (ref) ref.value = "";
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const removeQuestion = (sectionKey: string, qId: string) => {
    setSectionQuestions(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).filter(q => q.id !== qId),
    }));
    toast.success("Question removed");
  };

  const updateQuestion = (sectionKey: string, qId: string, field: string, value: any) => {
    setSectionQuestions(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).map(q => q.id === qId ? { ...q, [field]: value } : q),
    }));
  };

  const updateOption = (sectionKey: string, qId: string, optIdx: number, value: string) => {
    setSectionQuestions(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] || []).map(q => {
        if (q.id !== qId) return q;
        const opts = [...(q.options || [])];
        opts[optIdx] = value;
        return { ...q, options: opts };
      }),
    }));
  };

  const clearSection = (sectionKey: string) => {
    setSectionQuestions(prev => ({ ...prev, [sectionKey]: [] }));
    toast.success("Section cleared");
  };

  const totalQuestions = Object.values(sectionQuestions).reduce((sum, qs) => sum + qs.length, 0);
  const grandTotalMarks = Object.values(sectionQuestions).reduce((sum, qs) => sum + qs.reduce((s, q) => s + (q.marks || 0), 0), 0);
  const [showPreview, setShowPreview] = useState(false);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

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
                Upload PDF/Word per section — AI auto-detects questions
                {totalQuestions > 0 && <span className="ml-1 font-medium">· {totalQuestions} total</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isEnabled ? "default" : "secondary"} className="text-[10px]">
              {isEnabled ? "Enabled" : "Disabled"}
            </Badge>
            <Switch checked={isEnabled} onCheckedChange={(checked) => {
              setIsEnabled(checked);
              toast.success(checked ? "Question Bank enabled" : "Question Bank disabled");
            }} />
          </div>
        </div>

        {!isEnabled && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-[11px] text-muted-foreground">⚠ Question Bank is disabled. Candidates won't see these questions.</p>
          </div>
        )}

        {isEnabled && (
          <div className="space-y-2">
            {SECTIONS.map((section) => {
              const questions = sectionQuestions[section.key] || [];
              const isExpanded = expandedSections.has(section.key);
              const isLoading = uploadingSection === section.key;

              const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);

              return (
                <div key={section.key} className="border rounded-lg overflow-hidden bg-background">
                  {/* Section Header */}
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 bg-muted/60 border-b cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => toggleSection(section.key)}
                  >
                    <span className={section.color}>{section.icon}</span>
                    <p className="text-xs font-semibold text-foreground flex-1">{section.label}</p>
                    {questions.length > 0 && (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                        {totalMarks} Marks
                      </Badge>
                    )}
                    <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${section.badgeColor}`}>
                      {questions.length} Q
                    </Badge>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>

                  {/* Collapsed Preview - show first 3 questions */}
                  {!isExpanded && questions.length > 0 && (
                    <div className="px-3 py-1.5 bg-muted/20 border-b space-y-0.5">
                      {questions.slice(0, 3).map((q, idx) => (
                        <div key={q.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span className="font-medium text-foreground/70 w-5 shrink-0">Q{idx + 1}</span>
                          <span className="truncate flex-1">{q.question_text}</span>
                          <span className="shrink-0 text-amber-600 font-medium">{q.marks}m</span>
                        </div>
                      ))}
                      {questions.length > 3 && (
                        <p className="text-[9px] text-muted-foreground/60 pl-5">+{questions.length - 3} more questions...</p>
                      )}
                    </div>
                  )}

                  {/* Section Body */}
                  {isExpanded && (
                    <div className="px-3 py-2.5 space-y-2">
                      {/* Upload for this section */}
                      <div className="flex items-center gap-2">
                        <input
                          ref={el => { fileInputRefs.current[section.key] = el; }}
                          type="file"
                          accept=".pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) => handleFileUpload(section.key, e)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs h-7"
                          onClick={() => fileInputRefs.current[section.key]?.click()}
                          disabled={isLoading}
                        >
                          {isLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                          {isLoading ? "Detecting..." : `Upload PDF/Word`}
                        </Button>
                        {questions.length > 0 && (
                          <Button variant="ghost" size="sm" className="text-[10px] h-7 text-destructive ml-auto" onClick={() => clearSection(section.key)}>
                            <Trash2 className="h-3 w-3 mr-0.5" /> Clear All
                          </Button>
                        )}
                      </div>

                      {/* No questions */}
                      {questions.length === 0 && (
                        <div className="text-center py-4 border border-dashed rounded-lg">
                          <FileQuestion className="h-6 w-6 mx-auto text-muted-foreground/30 mb-1" />
                          <p className="text-[10px] text-muted-foreground">No {section.label} questions yet. Upload a PDF or Word file.</p>
                        </div>
                      )}

                      {/* Questions List */}
                      {questions.length > 0 && (
                        <Accordion type="multiple" className="space-y-1">
                          {questions.map((q, idx) => (
                            <AccordionItem key={q.id} value={q.id} className="border rounded overflow-hidden">
                              <AccordionTrigger className="px-2.5 py-1.5 hover:no-underline hover:bg-muted/30 text-left">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <Badge variant="outline" className="text-[10px] shrink-0">Q{idx + 1}</Badge>
                                  <p className="text-xs truncate flex-1">{q.question_text || "New question..."}</p>
                                  {q.source_pdf && (
                                    <span className="text-[8px] text-muted-foreground truncate max-w-[100px]" title={q.source_pdf}>
                                      {q.source_pdf}
                                    </span>
                                  )}
                                   <Input
                                     type="number"
                                     value={q.marks}
                                     min={1}
                                     onClick={e => e.stopPropagation()}
                                     onChange={e => {
                                       e.stopPropagation();
                                       updateQuestion(section.key, q.id, "marks", parseInt(e.target.value) || 1);
                                     }}
                                     className="w-14 h-6 text-[10px] text-center shrink-0"
                                   />
                                   <span className="text-[9px] text-muted-foreground shrink-0">mk</span>
                                 </div>
                               </AccordionTrigger>
                              <AccordionContent className="px-2.5 pb-2.5">
                                {editingId === q.id ? (
                                  <div className="space-y-2 pt-1">
                                    <div>
                                      <Label className="text-[10px]">Question</Label>
                                      <Input
                                        value={q.question_text}
                                        onChange={e => updateQuestion(section.key, q.id, "question_text", e.target.value)}
                                        className="text-xs h-8"
                                      />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <Label className="text-[10px]">Marks</Label>
                                        <Input type="number" value={q.marks} onChange={e => updateQuestion(section.key, q.id, "marks", parseInt(e.target.value) || 1)} className="h-8 text-xs" min={1} />
                                      </div>
                                    </div>
                                    {(section.key === "mcq" || q.options?.length) && (
                                      <div className="grid grid-cols-2 gap-1.5">
                                        {(q.options || ["", "", "", ""]).map((opt, oIdx) => (
                                          <div key={oIdx} className="flex items-center gap-1">
                                            <Badge variant="outline" className="text-[9px] w-5 h-5 flex items-center justify-center p-0 shrink-0">
                                              {String.fromCharCode(65 + oIdx)}
                                            </Badge>
                                            <Input value={opt} onChange={e => updateOption(section.key, q.id, oIdx, e.target.value)} className="text-xs h-7" />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <div>
                                      <Label className="text-[10px] text-primary font-semibold">✅ Correct Answer</Label>
                                      <Input
                                        value={q.correct_answer}
                                        onChange={e => updateQuestion(section.key, q.id, "correct_answer", e.target.value)}
                                        className="text-xs h-8"
                                      />
                                    </div>
                                    <div className="flex gap-1.5 pt-1">
                                      <Button size="sm" className="text-[10px] h-6" onClick={() => setEditingId(null)}>
                                        <Save className="h-3 w-3 mr-0.5" /> Done
                                      </Button>
                                      <Button size="sm" variant="ghost" className="text-[10px] h-6 text-destructive" onClick={() => removeQuestion(section.key, q.id)}>
                                        <Trash2 className="h-3 w-3 mr-0.5" /> Delete
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2 pt-1">
                                    <p className="text-xs font-medium">{q.question_text}</p>
                                    {q.options && q.options.length > 0 && (
                                      <div className="grid grid-cols-2 gap-1 ml-1">
                                        {q.options.map((opt, oIdx) => (
                                          <div key={oIdx} className={`text-[10px] px-2 py-0.5 rounded border ${
                                            q.correct_answer?.toUpperCase().startsWith(String.fromCharCode(65 + oIdx))
                                              ? "bg-accent/10 border-accent/40 font-medium"
                                              : "bg-muted/30 border-border"
                                          }`}>
                                            {String.fromCharCode(65 + oIdx)}) {opt}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {section.key === "true_false" && (
                                      <div className="flex gap-2 ml-1">
                                        <span className={`text-[10px] px-2 py-0.5 rounded border ${q.correct_answer?.toLowerCase().includes("true") ? "bg-accent/10 border-accent/40 font-medium" : "bg-muted/30"}`}>True</span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded border ${q.correct_answer?.toLowerCase().includes("false") ? "bg-accent/10 border-accent/40 font-medium" : "bg-muted/30"}`}>False</span>
                                      </div>
                                    )}
                                    <div className="p-1.5 bg-primary/5 rounded border border-primary/15">
                                      <p className="text-[10px] text-primary font-semibold">✅ Answer: {q.correct_answer || "Not set"}</p>
                                    </div>
                                    {q.source_pdf && (
                                      <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                                        <FileText className="h-2.5 w-2.5" /> {q.source_pdf}
                                        {q.uploadedAt && <span className="ml-1">· {formatDate(q.uploadedAt)}</span>}
                                      </p>
                                    )}
                                    <div className="flex gap-1.5 pt-1">
                                      <Button size="sm" variant="outline" className="text-[10px] h-6" onClick={() => setEditingId(q.id)}>
                                        <Edit className="h-3 w-3 mr-0.5" /> Edit
                                      </Button>
                                      <Button size="sm" variant="ghost" className="text-[10px] h-6 text-destructive" onClick={() => removeQuestion(section.key, q.id)}>
                                        <Trash2 className="h-3 w-3 mr-0.5" /> Delete
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Preview Button */}
          {totalQuestions > 0 && (
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                Total: <span className="font-semibold text-foreground">{totalQuestions} Questions</span> · <span className="font-semibold text-amber-600">{grandTotalMarks} Marks</span>
              </p>
              <Button size="sm" className="text-xs h-8 gap-1.5" onClick={() => setShowPreview(true)}>
                <Eye className="h-3.5 w-3.5" /> Preview Question Paper
              </Button>
            </div>
          )}
        </>
        )}

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-3xl max-h-[90vh] p-0">
            <DialogHeader className="px-6 pt-5 pb-3 border-b">
              <DialogTitle className="text-base font-bold">Question Paper Preview</DialogTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{jobTitle}</span>
                <Separator orientation="vertical" className="h-3" />
                <span className="font-medium text-foreground">{totalQuestions} Questions</span>
                <Separator orientation="vertical" className="h-3" />
                <span className="font-medium text-amber-600">{grandTotalMarks} Marks</span>
              </div>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] px-6 py-4">
              <div className="space-y-6">
                {SECTIONS.map((section) => {
                  const questions = sectionQuestions[section.key] || [];
                  if (questions.length === 0) return null;
                  const sectionMarks = questions.reduce((s, q) => s + (q.marks || 0), 0);
                  let globalQ = 0;
                  // count questions before this section
                  for (const sec of SECTIONS) {
                    if (sec.key === section.key) break;
                    globalQ += (sectionQuestions[sec.key] || []).length;
                  }

                  return (
                    <div key={section.key}>
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                        <span className={section.color}>{section.icon}</span>
                        <h3 className="text-sm font-bold text-foreground flex-1">{section.label}</h3>
                        <Badge variant="outline" className="text-[10px]">{questions.length} Q</Badge>
                        <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">{sectionMarks} Marks</Badge>
                      </div>
                      <div className="space-y-3">
                        {questions.map((q, idx) => {
                          const qNum = globalQ + idx + 1;
                          return (
                            <div key={q.id} className="pl-1">
                              <div className="flex gap-2">
                                <span className="text-xs font-semibold text-muted-foreground shrink-0 w-7">{qNum}.</span>
                                <div className="flex-1 space-y-1.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs text-foreground">{q.question_text}</p>
                                    <Badge variant="secondary" className="text-[9px] shrink-0">{q.marks}m</Badge>
                                  </div>
                                  {q.options && q.options.length > 0 && (
                                    <div className="grid grid-cols-2 gap-1 ml-1">
                                      {q.options.map((opt, oIdx) => (
                                        <p key={oIdx} className="text-[11px] text-muted-foreground">
                                          {String.fromCharCode(65 + oIdx)}) {opt}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  {section.key === "true_false" && (
                                    <div className="flex gap-3 ml-1">
                                      <span className="text-[11px] text-muted-foreground">A) True</span>
                                      <span className="text-[11px] text-muted-foreground">B) False</span>
                                    </div>
                                  )}
                                  {(section.key === "short_answer" || section.key === "long_answer") && (
                                    <div className={`border border-dashed rounded mt-1 ${section.key === "long_answer" ? "h-20" : "h-10"}`} />
                                  )}
                                  {section.key === "fill_blank" && (
                                    <div className="border-b border-dashed w-40 mt-1" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
