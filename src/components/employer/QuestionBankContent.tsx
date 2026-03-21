import { useState, useRef, useEffect } from "react";
import { Plus, Minus } from "lucide-react";
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
  ArrowLeftRight, HelpCircle, FileQuestion, Image, Map, AlignLeft, AlignJustify, Eye,
  FolderOpen, Download, Clock
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

interface SavedPaper {
  id: string;
  dbPaperId?: string; // ID in interview_question_papers table
  savedAt: Date;
  questionCount: number;
  totalMarks: number;
  sections: { key: string; label: string; questions: QuestionBankQuestion[] }[];
  isActiveForTest?: boolean;
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
  const [isEnabled, setIsEnabled] = useState(false);
  const [enableLoaded, setEnableLoaded] = useState(false);
  const [sectionQuestions, setSectionQuestions] = useState<Record<string, QuestionBankQuestion[]>>({});
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [previewCount, setPreviewCount] = useState<number>(10);
  const [savedPapers, setSavedPapers] = useState<SavedPaper[]>([]);

  // Section-wise paper configurator
  interface PaperSectionEntry {
    questionType: string;
    count: number;
    marksPerQuestion: number;
  }
  interface PaperSection {
    id: string;
    label: string;
    entries: PaperSectionEntry[];
  }
  const [paperSections, setPaperSections] = useState<PaperSection[]>([
    { id: 'sec-1', label: 'Section A', entries: [{ questionType: '', count: 0, marksPerQuestion: 1 }] }
  ]);
  const [showSectionConfig, setShowSectionConfig] = useState(false);

  const addPaperSection = () => {
    const nextLetter = String.fromCharCode(65 + paperSections.length);
    setPaperSections(prev => [...prev, {
      id: `sec-${Date.now()}`,
      label: `Section ${nextLetter}`,
      entries: [{ questionType: '', count: 0, marksPerQuestion: 1 }]
    }]);
  };

  const removePaperSection = (sectionId: string) => {
    setPaperSections(prev => prev.filter(s => s.id !== sectionId));
  };

  const addEntryToSection = (sectionId: string) => {
    setPaperSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, entries: [...s.entries, { questionType: '', count: 0, marksPerQuestion: 1 }] } : s
    ));
  };

  const removeEntryFromSection = (sectionId: string, entryIdx: number) => {
    setPaperSections(prev => prev.map(s =>
      s.id === sectionId ? { ...s, entries: s.entries.filter((_, i) => i !== entryIdx) } : s
    ));
  };

  const updateEntry = (sectionId: string, entryIdx: number, field: keyof PaperSectionEntry, value: any) => {
    setPaperSections(prev => prev.map(s =>
      s.id === sectionId ? {
        ...s,
        entries: s.entries.map((e, i) => i === entryIdx ? { ...e, [field]: value } : e)
      } : s
    ));
  };

  const getAvailableCount = (questionType: string) => {
    return (sectionQuestions[questionType] || []).length;
  };

  // Available question types that have questions
  const availableTypes = SECTIONS.filter(s => (sectionQuestions[s.key] || []).length > 0);

  const configTotalQuestions = paperSections.reduce((sum, s) => sum + s.entries.reduce((es, e) => es + e.count, 0), 0);
  const configTotalMarks = paperSections.reduce((sum, s) => sum + s.entries.reduce((es, e) => es + (e.count * e.marksPerQuestion), 0), 0);
  const [viewingSavedPaper, setViewingSavedPaper] = useState<SavedPaper | null>(null);
  const [loadingPapers, setLoadingPapers] = useState(false);

  // Load enabled state from the latest active paper
  useEffect(() => {
    const loadEnabledState = async () => {
      try {
        const { data: activePapers } = await supabase
          .from('interview_question_papers')
          .select('is_active')
          .eq('job_id', jobId)
          .eq('stage_type', 'question_bank')
          .order('created_at', { ascending: false })
          .limit(1);

        if (activePapers && activePapers.length > 0) {
          setIsEnabled(activePapers[0].is_active);
        }
      } catch (err) {
        console.error('Error loading enabled state:', err);
      } finally {
        setEnableLoaded(true);
      }
    };
    loadEnabledState();
  }, [jobId]);

  // Load saved papers from database on mount
  useEffect(() => {
    const loadSavedPapers = async () => {
      setLoadingPapers(true);
      try {
        const { data: papers, error } = await supabase
          .from('interview_question_papers')
          .select(`
            *,
            interview_questions(
              *,
              interview_answer_keys(*)
            )
          `)
          .eq('job_id', jobId)
          .eq('stage_type', 'question_bank')
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (papers && papers.length > 0) {
          const loaded: SavedPaper[] = papers.map((paper: any) => {
            const questions: QuestionBankQuestion[] = (paper.interview_questions || [])
              .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
              .map((q: any) => ({
                id: q.id,
                question_number: q.question_number,
                question_text: q.question_text,
                question_type: q.question_type === 'multiple_choice' ? 'mcq' : q.question_type,
                options: q.options?.options || q.options || [],
                correct_answer: q.interview_answer_keys?.[0]?.answer_text || '',
                marks: q.marks || 1,
                source_pdf: 'Saved Paper',
                uploadedAt: new Date(q.created_at),
              }));

            // Group questions by section
            const sectionMap: Record<string, QuestionBankQuestion[]> = {};
            (paper.interview_questions || []).forEach((q: any, idx: number) => {
              const sectionLabel = q.section || 'General';
              const sectionKey = SECTIONS.find(s => s.label === sectionLabel)?.key || 'mcq';
              if (!sectionMap[sectionKey]) sectionMap[sectionKey] = [];
              sectionMap[sectionKey].push(questions[idx]);
            });

            const sections = Object.entries(sectionMap).map(([key, qs]) => ({
              key,
              label: SECTIONS.find(s => s.key === key)?.label || key,
              questions: qs,
            }));

            return {
              id: paper.id,
              dbPaperId: paper.id,
              savedAt: new Date(paper.created_at),
              questionCount: questions.length,
              totalMarks: questions.reduce((s, q) => s + (q.marks || 0), 0),
              sections,
              isActiveForTest: paper.is_active,
            };
          });

          setSavedPapers(loaded);
        }
      } catch (err) {
        console.error('Error loading saved papers:', err);
      } finally {
        setLoadingPapers(false);
      }
    };

    loadSavedPapers();
  }, [jobId]);
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
        const existingTexts = new Set(
          (sectionQuestions[sectionKey] || []).map(q => q.question_text.trim().toLowerCase())
        );

        const newQuestions: QuestionBankQuestion[] = data.questions
          .filter((q: any) => !existingTexts.has((q.question_text || "").trim().toLowerCase()))
          .reduce((acc: QuestionBankQuestion[], q: any, idx: number) => {
            const text = (q.question_text || "").trim().toLowerCase();
            // Also deduplicate within the new batch
            if (acc.some(a => a.question_text.trim().toLowerCase() === text)) return acc;
            acc.push({
              id: `qb-${sectionKey}-${Date.now()}-${idx}`,
              question_number: idx + 1,
              question_text: q.question_text,
              question_type: sectionKey,
              options: q.options || undefined,
              correct_answer: q.options?.[0] || "",
              marks: 1,
              source_pdf: file.name,
              uploadedAt: new Date(),
            });
            return acc;
          }, []);

        const skipped = data.questions.length - newQuestions.length;

        if (newQuestions.length > 0) {
          setSectionQuestions(prev => ({
            ...prev,
            [sectionKey]: [...newQuestions, ...(prev[sectionKey] || [])],
          }));
          setExpandedSections(prev => new Set([...prev, sectionKey]));
          toast.success(
            `${newQuestions.length} questions added to ${sectionLabel}${skipped > 0 ? ` (${skipped} duplicates removed)` : ""}`
          );
        } else {
          toast.info("All questions were duplicates — nothing new added.");
        }
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

  const formatDateShort = (date: Date) =>
    date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  // Build preview sections from the section configurator
  const buildPreviewSections = () => {
    const shuffle = <T,>(arr: T[]): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    const sections: SavedPaper["sections"] = [];
    paperSections.forEach((ps) => {
      const sectionQuestionsList: QuestionBankQuestion[] = [];
      ps.entries.forEach(entry => {
        if (!entry.questionType || entry.count <= 0) return;
        const allQs = sectionQuestions[entry.questionType] || [];
        const selected = shuffle(allQs).slice(0, entry.count).map(q => ({
          ...q,
          marks: entry.marksPerQuestion,
        }));
        sectionQuestionsList.push(...selected);
      });
      if (sectionQuestionsList.length > 0) {
        sections.push({
          key: ps.id,
          label: ps.label,
          questions: sectionQuestionsList,
        });
      }
    });
    return sections;
  };

  const [currentPreviewSections, setCurrentPreviewSections] = useState<SavedPaper["sections"]>([]);

  const handleOpenPreview = () => {
    if (configTotalQuestions === 0) {
      toast.error("Please configure at least one question in a section");
      return;
    }
    const sections = buildPreviewSections();
    setCurrentPreviewSections(sections);
    setShowPreview(true);
  };

  const [savingPaper, setSavingPaper] = useState(false);

  const handleSavePaper = async () => {
    const sections = currentPreviewSections.length > 0 ? currentPreviewSections : buildPreviewSections();
    const allQs = sections.flatMap(s => s.questions);
    
    setSavingPaper(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Deactivate any existing Question Bank papers for this job
      await supabase
        .from('interview_question_papers')
        .update({ is_active: false })
        .eq('job_id', jobId)
        .eq('stage_type', 'question_bank');

      // 2. Create the question paper in DB with created_by so it shows in Test Papers
      const { data: paperData, error: paperError } = await supabase
        .from('interview_question_papers')
        .insert({
          title: `Question Bank Paper — ${allQs.length} Questions`,
          stage_type: 'question_bank',
          job_id: jobId,
          is_active: true,
          set_number: savedPapers.length + 1,
          created_by: user.id,
        })
        .select()
        .single();

      if (paperError || !paperData) throw paperError || new Error('Failed to create paper');

      // 3. Also disable AI questions for this job since manual paper is now active
      await supabase.from('jobs').update({ use_ai_questions: false }).eq('id', jobId);

      // 3. Insert questions
      const questionsToInsert = allQs.map((q, idx) => ({
        paper_id: paperData.id,
        question_number: idx + 1,
        question_text: q.question_text,
        question_type: q.question_type === 'mcq' ? 'multiple_choice' : q.question_type,
        options: q.options && q.options.length > 0 ? { options: q.options } : null,
        marks: q.marks || 1,
        section: sections.find(s => s.questions.includes(q))?.label || 'General',
        display_order: idx + 1,
      }));

      const { data: insertedQuestions, error: qError } = await supabase
        .from('interview_questions')
        .insert(questionsToInsert)
        .select();

      if (qError) throw qError;

      // 4. Insert answer keys for questions that have correct answers
      if (insertedQuestions) {
        const answerKeys = insertedQuestions
          .map((iq, idx) => {
            const originalQ = allQs[idx];
            if (!originalQ.correct_answer) return null;
            return {
              question_id: iq.id,
              answer_text: originalQ.correct_answer,
              keywords: [originalQ.correct_answer],
            };
          })
          .filter(Boolean);

        if (answerKeys.length > 0) {
          await supabase.from('interview_answer_keys').insert(answerKeys);
        }
      }

      const paper: SavedPaper = {
        id: `paper-${Date.now()}`,
        dbPaperId: paperData.id,
        savedAt: new Date(),
        questionCount: allQs.length,
        totalMarks: allQs.reduce((s, q) => s + (q.marks || 0), 0),
        sections,
        isActiveForTest: true,
      };
      // Mark all previous papers as inactive
      setSavedPapers(prev => [paper, ...prev.map(p => ({ ...p, isActiveForTest: false }))]);
      toast.success(`Paper saved with ${paper.questionCount} questions — will be used in Written Test`);
    } catch (err: any) {
      console.error('Error saving paper to DB:', err);
      toast.error('Failed to save paper: ' + (err.message || 'Unknown error'));
    } finally {
      setSavingPaper(false);
    }
    setShowPreview(false);
  };

  const deleteSavedPaper = async (paperId: string) => {
    const paper = savedPapers.find(p => p.id === paperId);
    if (paper?.dbPaperId) {
      await supabase.from('interview_question_papers').update({ is_active: false }).eq('id', paper.dbPaperId);
    }
    setSavedPapers(prev => prev.filter(p => p.id !== paperId));
    toast.success("Saved paper deleted");
  };

  // Group saved papers by date
  const groupedPapers = savedPapers.reduce<Record<string, SavedPaper[]>>((acc, paper) => {
    const dateKey = formatDateShort(paper.savedAt);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(paper);
    return acc;
  }, {});

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
            <Switch checked={isEnabled} onCheckedChange={async (checked) => {
              setIsEnabled(checked);
              // Persist enable state to all question_bank papers for this job
              try {
                await supabase
                  .from('interview_question_papers')
                  .update({ is_active: checked })
                  .eq('job_id', jobId)
                  .eq('stage_type', 'question_bank');
                
                // Also update use_ai_questions on the job (disable AI when manual papers enabled)
                if (checked) {
                  await supabase.from('jobs').update({ use_ai_questions: false }).eq('id', jobId);
                }
                
                setSavedPapers(prev => prev.map(p => ({ ...p, isActiveForTest: checked })));
                toast.success(checked ? "Question Bank enabled — questions will be shown to candidates" : "Question Bank disabled");
              } catch (err) {
                console.error('Error updating enable state:', err);
                setIsEnabled(!checked); // revert
                toast.error("Failed to update status");
              }
            }} />
          </div>
        </div>

        {!isEnabled && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-[11px] text-muted-foreground">⚠ Question Bank is disabled. Candidates won't see these questions.</p>
          </div>
        )}

        {isEnabled && (
          <>
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

          {/* Section-wise Paper Configurator */}
          {totalQuestions > 0 && (
            <div className="pt-2 border-t space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Total Bank: <span className="font-semibold text-foreground">{totalQuestions} Questions</span> · <span className="font-semibold text-amber-600">{grandTotalMarks} Marks</span>
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 gap-1"
                  onClick={() => setShowSectionConfig(!showSectionConfig)}
                >
                  {showSectionConfig ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {showSectionConfig ? "Hide" : "Configure"} Paper Sections
                </Button>
              </div>

              {showSectionConfig && (
                <div className="space-y-3 p-3 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground">Paper Sections</p>
                    <Button variant="outline" size="sm" className="text-[10px] h-6 gap-1" onClick={addPaperSection}>
                      <Plus className="h-3 w-3" /> Add Section
                    </Button>
                  </div>

                  {paperSections.map((ps, psIdx) => (
                    <div key={ps.id} className="border rounded-lg bg-background overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/60 border-b">
                        <p className="text-xs font-bold text-foreground">{ps.label}</p>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[9px]">
                            {ps.entries.reduce((s, e) => s + e.count, 0)} Q · {ps.entries.reduce((s, e) => s + (e.count * e.marksPerQuestion), 0)} Marks
                          </Badge>
                          {paperSections.length > 1 && (
                            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive" onClick={() => removePaperSection(ps.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="px-3 py-2 space-y-2">
                        {ps.entries.map((entry, eIdx) => (
                          <div key={eIdx} className="flex items-center gap-2 flex-wrap">
                            <select
                              value={entry.questionType}
                              onChange={e => updateEntry(ps.id, eIdx, 'questionType', e.target.value)}
                              className="h-7 text-xs rounded-md border border-input bg-background px-2 min-w-[140px]"
                            >
                              <option value="">Select Type</option>
                              {availableTypes.map(at => (
                                <option key={at.key} value={at.key}>
                                  {at.label} ({(sectionQuestions[at.key] || []).length} available)
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center gap-1">
                              <Label className="text-[10px] text-muted-foreground">Qty:</Label>
                              <Input
                                type="number"
                                value={entry.count}
                                min={0}
                                max={entry.questionType ? getAvailableCount(entry.questionType) : 99}
                                onChange={e => updateEntry(ps.id, eIdx, 'count', Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-14 h-7 text-xs text-center"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <Label className="text-[10px] text-muted-foreground">Marks each:</Label>
                              <Input
                                type="number"
                                value={entry.marksPerQuestion}
                                min={1}
                                onChange={e => updateEntry(ps.id, eIdx, 'marksPerQuestion', Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-14 h-7 text-xs text-center"
                              />
                            </div>
                            {ps.entries.length > 1 && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => removeEntryFromSection(ps.id, eIdx)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" className="text-[10px] h-6 gap-1 text-primary" onClick={() => addEntryToSection(ps.id)}>
                          <Plus className="h-3 w-3" /> Add Question Type
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Config summary + Preview */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <p className="text-xs text-muted-foreground">
                      Paper: <span className="font-semibold text-foreground">{configTotalQuestions} Questions</span> · <span className="font-semibold text-amber-600">{configTotalMarks} Marks</span>
                    </p>
                    <Button size="sm" className="text-xs h-8 gap-1.5" onClick={handleOpenPreview}>
                      <Eye className="h-3.5 w-3.5" /> Preview Question Paper
                    </Button>
                  </div>
                </div>
              )}
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
                <span className="font-medium text-foreground">{currentPreviewSections.reduce((s, sec) => s + sec.questions.length, 0)} Questions</span>
                <Separator orientation="vertical" className="h-3" />
                <span className="font-medium text-amber-600">{currentPreviewSections.reduce((s, sec) => s + sec.questions.reduce((m, q) => m + (q.marks || 0), 0), 0)} Marks</span>
              </div>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] px-6 py-4">
              <div className="space-y-6">
                {(() => {
                  const sectionLetters = "ABCDEFGHIJ".split("");
                  let globalQ = 0;
                  return currentPreviewSections.map((sec, sectionIdx) => {
                    const sectionMarks = sec.questions.reduce((s, q) => s + (q.marks || 0), 0);
                    const letter = sectionLetters[sectionIdx] || `${sectionIdx + 1}`;
                    return (
                      <div key={sec.key}>
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-foreground/20">
                          <h3 className="text-sm font-bold text-foreground flex-1">Section {letter} — {sec.label}</h3>
                          <Badge variant="outline" className="text-[10px]">{sec.questions.length} Q</Badge>
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                            {sectionMarks} Marks
                          </Badge>
                        </div>
                        {/* List the question types in this section */}
                        <p className="text-[10px] text-muted-foreground italic mb-2">
                          {(() => {
                            const types = [...new Set(sec.questions.map(q => q.question_type))];
                            const typeLabels = types.map(t => SECTIONS.find(s => s.key === t)?.label || t).join(', ');
                            return `Contains: ${typeLabels}`;
                          })()}
                        </p>
                        <div className="space-y-3">
                          {sec.questions.map((q) => {
                            globalQ++;
                            return (
                              <div key={q.id} className="pl-1">
                                <div className="flex gap-2">
                                  <span className="text-xs font-semibold text-muted-foreground shrink-0 w-7">{globalQ}.</span>
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
                                    {q.question_type === "true_false" && (
                                      <div className="flex gap-3 ml-1">
                                        <span className="text-[11px] text-muted-foreground">A) True</span>
                                        <span className="text-[11px] text-muted-foreground">B) False</span>
                                      </div>
                                    )}
                                    {(q.question_type === "short_answer" || q.question_type === "long_answer") && (
                                      <div className={`border border-dashed rounded mt-1 ${q.question_type === "long_answer" ? "h-20" : "h-10"}`} />
                                    )}
                                    {q.question_type === "fill_blank" && (
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
                  });
                })()}
              </div>
            </ScrollArea>
            <div className="px-6 py-3 border-t flex justify-end gap-2">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => setShowPreview(false)}>Close</Button>
              <Button size="sm" className="text-xs gap-1.5" onClick={handleSavePaper} disabled={savingPaper}>
                {savingPaper ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {savingPaper ? "Saving to Written Test..." : "Save & Use for Written Test"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* View Saved Paper Dialog */}
        <Dialog open={!!viewingSavedPaper} onOpenChange={(open) => { if (!open) setViewingSavedPaper(null); }}>
          <DialogContent className="max-w-3xl max-h-[90vh] p-0">
            <DialogHeader className="px-6 pt-5 pb-3 border-b">
              <DialogTitle className="text-base font-bold">Saved Paper</DialogTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{jobTitle}</span>
                <Separator orientation="vertical" className="h-3" />
                <span className="font-medium text-foreground">{viewingSavedPaper?.questionCount} Questions</span>
                <Separator orientation="vertical" className="h-3" />
                <span className="font-medium text-amber-600">{viewingSavedPaper?.totalMarks} Marks</span>
                <Separator orientation="vertical" className="h-3" />
                <Clock className="h-3 w-3" />
                <span>{viewingSavedPaper && formatDate(viewingSavedPaper.savedAt)}</span>
              </div>
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] px-6 py-4">
              <div className="space-y-6">
                {(() => {
                  if (!viewingSavedPaper) return null;
                  const sectionLetters = "ABCDEFGHIJ".split("");
                  let globalQ = 0;
                  return viewingSavedPaper.sections.map((sec, sectionIdx) => {
                    const sectionMarks = sec.questions.reduce((s, q) => s + (q.marks || 0), 0);
                    const letter = sectionLetters[sectionIdx] || `${sectionIdx + 1}`;
                    return (
                      <div key={sec.key}>
                        <div className="flex items-center gap-2 mb-3 pb-2 border-b-2 border-foreground/20">
                          <h3 className="text-sm font-bold text-foreground flex-1">Section {letter} — {sec.label}</h3>
                          <Badge variant="outline" className="text-[10px]">{sec.questions.length} Q</Badge>
                          <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300">
                            {sectionMarks} Marks
                          </Badge>
                        </div>
                        <div className="space-y-3">
                          {sec.questions.map((q) => {
                            globalQ++;
                            return (
                              <div key={q.id} className="pl-1">
                                <div className="flex gap-2">
                                  <span className="text-xs font-semibold text-muted-foreground shrink-0 w-7">{globalQ}.</span>
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
                                    {(q.question_type === "short_answer" || q.question_type === "long_answer") && (
                                      <div className={`border border-dashed rounded mt-1 ${q.question_type === "long_answer" ? "h-20" : "h-10"}`} />
                                    )}
                                    {q.question_type === "fill_blank" && (
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
                  });
                })()}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Saved Papers History */}
        {loadingPapers && (
          <div className="mt-4 border-t pt-3 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <p className="text-xs">Loading saved papers...</p>
          </div>
        )}
        {!loadingPapers && savedPapers.length > 0 && (
          <div className="mt-4 border-t pt-3 space-y-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Saved Papers</p>
              <Badge variant="secondary" className="text-[10px]">{savedPapers.length}</Badge>
            </div>
            {Object.entries(groupedPapers).map(([dateKey, papers]) => (
              <div key={dateKey} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <p className="text-[11px] font-semibold text-muted-foreground">{dateKey}</p>
                </div>
                <div className="space-y-1 pl-5">
                  {papers.map((paper, idx) => (
                    <div key={paper.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${paper.isActiveForTest ? 'bg-primary/5 border-primary/30' : 'bg-muted/30 hover:bg-muted/50'}`}>
                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-medium text-foreground truncate">
                            Paper #{savedPapers.length - savedPapers.indexOf(paper)} — {paper.questionCount} Questions
                          </p>
                          {paper.isActiveForTest && (
                            <Badge className="text-[8px] px-1.5 py-0 bg-primary text-primary-foreground">Active for Written Test</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {paper.totalMarks} Marks · {paper.sections.map(s => s.label).join(", ")}
                        </p>
                      </div>
                      <span className="text-[9px] text-muted-foreground shrink-0">
                        {paper.savedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2" onClick={() => setViewingSavedPaper(paper)}>
                        <Eye className="h-3 w-3 mr-0.5" /> View
                      </Button>
                      <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 text-destructive" onClick={() => deleteSavedPaper(paper.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
