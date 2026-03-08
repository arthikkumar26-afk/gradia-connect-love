import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft, Plus, Trash2, Save, FileText, Loader2, 
  ChevronDown, ChevronUp, BookOpen, CheckCircle2, Eye, Sparkles
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIPaperDetection } from "./AIPaperDetection";
import { ChapterWiseQA } from "./ChapterWiseQA";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface JobItem {
  id: string;
  job_title: string;
  department: string | null;
  organisation: string | null;
  status: string | null;
  created_at: string | null;
  experience_required: string | null;
  skills: string[] | null;
  job_type: string | null;
  location: string | null;
  salary_range: string | null;
  description: string | null;
  sector_division: string | null;
  category: string | null;
  function_type: string | null;
  segment: string | null;
  designation: string | null;
  subjects: string | null;
}

interface QuestionPaper {
  id: string;
  title: string;
  set_number: number;
  job_id: string;
  is_active: boolean;
  description: string | null;
  stage_type: string;
  questions: QuestionItem[];
}

interface QuestionItem {
  id?: string;
  question_number: number;
  question_text: string;
  question_type: string;
  options: string[] | null;
  marks: number;
  answer_text: string;
  keywords: string[];
  section: string;
}

const SECTIONS = ["A", "B", "C", "D", "E"] as const;

export const QPMContent = () => {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPaper, setEditingPaper] = useState<QuestionPaper | null>(null);
  const [viewingPaper, setViewingPaper] = useState<QuestionPaper | null>(null);
  const [useAiQuestions, setUseAiQuestions] = useState(false);
  const [isTogglingAi, setIsTogglingAi] = useState(false);
  const [isManualSetsEnabled, setIsManualSetsEnabled] = useState(true);

  // Fetch jobs - with auth state listener for reliability
  useEffect(() => {
    fetchJobs();
    
    // Also listen for auth state changes to refetch if needed
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchJobs();
      }
    });
    
    return () => subscription.unsubscribe();
  }, []);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_title, department, organisation, status, created_at, experience_required, skills, job_type, location, salary_range, description, sector_division, category, function_type, segment, designation, subjects" as any)
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs((data as any as JobItem[]) || []);
    } catch (err) {
      console.error("Error fetching jobs:", err);
      toast.error("Failed to load jobs");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch question papers for selected job
  const fetchPapers = async (jobId: string) => {
    try {
      const query = supabase
        .from("interview_question_papers")
        .select("*") as any;
      const { data: papersData, error: papersError } = await query
        .eq("job_id", jobId)
        .order("set_number", { ascending: true });

      if (papersError) throw papersError;

      const papersWithQuestions: QuestionPaper[] = [];
      
      for (const paper of (papersData || [])) {
        // Fetch questions for this paper
        const { data: questionsData } = await supabase
          .from("interview_questions")
          .select("*")
          .eq("paper_id", paper.id)
          .order("question_number", { ascending: true });

        // Fetch answer keys for each question
        const questions: QuestionItem[] = [];
        for (const q of (questionsData || [])) {
          const { data: answerKey } = await supabase
            .from("interview_answer_keys")
            .select("*")
            .eq("question_id", q.id)
            .maybeSingle();

          questions.push({
            id: q.id,
            question_number: q.question_number,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options as string[] | null,
            marks: q.marks || 1,
            answer_text: answerKey?.answer_text || "",
            keywords: answerKey?.keywords || [],
            section: (q as any).section || "A",
          });
        }

        papersWithQuestions.push({
          id: paper.id,
          title: paper.title,
          set_number: (paper as any).set_number || 1,
          job_id: (paper as any).job_id || jobId,
          is_active: paper.is_active,
          description: paper.description,
          stage_type: paper.stage_type,
          part: (paper as any).part || null,
          topic: (paper as any).topic || null,
          division: (paper as any).division || null,
          questions,
        } as any);
      }

      setPapers(papersWithQuestions);
    } catch (err) {
      console.error("Error fetching papers:", err);
      toast.error("Failed to load question papers");
    }
  };

  const handleSelectJob = (job: JobItem) => {
    setSelectedJob(job);
    setEditingPaper(null);
    setViewingPaper(null);
    fetchPapers(job.id);
    fetchAiQuestionsSetting(job.id);
  };

  const fetchAiQuestionsSetting = async (jobId: string) => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("use_ai_questions" as any)
        .eq("id", jobId)
        .single();

      if (!error && data) {
        setUseAiQuestions((data as any).use_ai_questions || false);
      }
    } catch (err) {
      console.error("Error fetching AI questions setting:", err);
    }
  };

  const handleToggleAiQuestions = async (enabled: boolean) => {
    if (!selectedJob) return;
    setIsTogglingAi(true);
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ use_ai_questions: enabled } as any)
        .eq("id", selectedJob.id);

      if (error) throw error;
      setUseAiQuestions(enabled);
      toast.success(enabled 
        ? "AI Question Papers enabled — AI will generate questions for candidates" 
        : "AI Question Papers disabled — Manual question sets will be used"
      );
    } catch (err) {
      console.error("Error toggling AI questions:", err);
      toast.error("Failed to update setting");
    } finally {
      setIsTogglingAi(false);
    }
  };

  const handleCreateNewSet = () => {
    if (!selectedJob) return;
    
    const existingSets = papers.map(p => p.set_number);
    let nextSet = 1;
    for (let i = 1; i <= 4; i++) {
      if (!existingSets.includes(i)) {
        nextSet = i;
        break;
      }
    }

    if (papers.length >= 4) {
      toast.error("Maximum 4 question paper sets allowed per job");
      return;
    }

    setEditingPaper({
      id: "",
      title: `Set ${nextSet} - ${selectedJob.job_title}`,
      set_number: nextSet,
      job_id: selectedJob.id,
      is_active: true,
      description: null,
      stage_type: "technical_assessment",
      questions: [createEmptyQuestion(1)],
    });
    setViewingPaper(null);
  };

  const createEmptyQuestion = (num: number, section: string = "A"): QuestionItem => ({
    question_number: num,
    question_text: "",
    question_type: "multiple_choice",
    options: ["", "", "", ""],
    marks: 1,
    answer_text: "",
    keywords: [],
    section,
  });

  const handleAddQuestion = (section: string = "A") => {
    if (!editingPaper) return;
    const nextNum = editingPaper.questions.length + 1;
    setEditingPaper({
      ...editingPaper,
      questions: [...editingPaper.questions, createEmptyQuestion(nextNum, section)],
    });
  };

  const handleRemoveQuestion = (index: number) => {
    if (!editingPaper) return;
    const updated = editingPaper.questions.filter((_, i) => i !== index)
      .map((q, i) => ({ ...q, question_number: i + 1 }));
    setEditingPaper({ ...editingPaper, questions: updated });
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    if (!editingPaper) return;
    const updated = [...editingPaper.questions];
    (updated[index] as any)[field] = value;
    
    // If changing to text type, clear options
    if (field === "question_type" && value === "text") {
      updated[index].options = null;
    } else if (field === "question_type" && value === "multiple_choice" && !updated[index].options) {
      updated[index].options = ["", "", "", ""];
    }
    
    setEditingPaper({ ...editingPaper, questions: updated });
  };

  const updateOption = (qIndex: number, oIndex: number, value: string) => {
    if (!editingPaper) return;
    const updated = [...editingPaper.questions];
    if (updated[qIndex].options) {
      const opts = [...updated[qIndex].options!];
      opts[oIndex] = value;
      updated[qIndex].options = opts;
    }
    setEditingPaper({ ...editingPaper, questions: updated });
  };

  const handleSavePaper = async () => {
    if (!editingPaper || !selectedJob) return;
    
    // Validate
    if (!editingPaper.title.trim()) {
      toast.error("Please enter a title for the question paper");
      return;
    }

    const emptyQuestions = editingPaper.questions.filter(q => !q.question_text.trim());
    if (emptyQuestions.length > 0) {
      toast.error("Please fill in all question texts");
      return;
    }

    const missingAnswers = editingPaper.questions.filter(q => !q.answer_text.trim());
    if (missingAnswers.length > 0) {
      toast.error("Please provide answers/solutions for all questions");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let paperId = editingPaper.id;

      if (!paperId) {
        // Create new paper
        const { data: newPaper, error: paperError } = await supabase
          .from("interview_question_papers")
          .insert({
            title: editingPaper.title,
            stage_type: editingPaper.stage_type,
            description: editingPaper.description,
            is_active: editingPaper.is_active,
            created_by: user.id,
            job_id: selectedJob.id,
            set_number: editingPaper.set_number,
            part: (editingPaper as any).part || null,
            topic: (editingPaper as any).topic || null,
            division: (editingPaper as any).division || null,
          } as any)
          .select()
          .single();

        if (paperError) throw paperError;
        paperId = newPaper.id;
      } else {
        // Update existing paper
        const { error: updateError } = await supabase
          .from("interview_question_papers")
          .update({
            title: editingPaper.title,
            description: editingPaper.description,
            is_active: editingPaper.is_active,
            part: (editingPaper as any).part || null,
            topic: (editingPaper as any).topic || null,
            division: (editingPaper as any).division || null,
          } as any)
          .eq("id", paperId);

        if (updateError) throw updateError;

        // Delete existing questions (cascade will handle answer keys)
        await supabase
          .from("interview_questions")
          .delete()
          .eq("paper_id", paperId);
      }

      // Insert questions
      for (const q of editingPaper.questions) {
        const { data: newQuestion, error: qError } = await supabase
          .from("interview_questions")
          .insert({
            paper_id: paperId,
            question_number: q.question_number,
            question_text: q.question_text,
            question_type: q.question_type,
            options: q.options,
            marks: q.marks,
            display_order: q.question_number,
            section: q.section,
          } as any)
          .select()
          .single();

        if (qError) throw qError;

        // Insert answer key
        if (q.answer_text) {
          const { error: akError } = await supabase
            .from("interview_answer_keys")
            .insert({
              question_id: newQuestion.id,
              answer_text: q.answer_text,
              keywords: q.keywords.length > 0 ? q.keywords : q.answer_text.split(/\s+/).filter(w => w.length > 3),
            });

          if (akError) throw akError;
        }
      }

      toast.success(`Question paper "${editingPaper.title}" saved successfully!`);
      setEditingPaper(null);
      fetchPapers(selectedJob.id);
    } catch (err) {
      console.error("Error saving paper:", err);
      toast.error("Failed to save question paper");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditPaper = (paper: QuestionPaper) => {
    setEditingPaper({ ...paper });
    setViewingPaper(null);
  };

  const handleViewPaper = (paper: QuestionPaper) => {
    setViewingPaper(paper);
    setEditingPaper(null);
  };

  const handleDeletePaper = async (paperId: string) => {
    if (!selectedJob) return;
    if (!confirm("Are you sure you want to delete this question paper set?")) return;

    try {
      const { error } = await supabase
        .from("interview_question_papers")
        .delete()
        .eq("id", paperId);

      if (error) throw error;
      toast.success("Question paper deleted");
      fetchPapers(selectedJob.id);
    } catch (err) {
      console.error("Error deleting paper:", err);
      toast.error("Failed to delete question paper");
    }
  };

  // === RENDER: Job Selection ===
  if (!selectedJob) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Smart Assessment</h2>
            <p className="text-sm text-muted-foreground">Select a job vacancy to manage its smart assessments</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : jobs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No job vacancies found. Create a job first to add question papers.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
            <Table className="w-full text-[10px] table-fixed">
              <TableHeader>
                <TableRow className="bg-secondary hover:bg-secondary border-b [&_th]:py-1 [&_th]:px-0.5 [&_th]:h-7 [&_th]:text-secondary-foreground [&_th]:text-[9px] [&_th]:uppercase [&_th]:tracking-wide [&_th]:whitespace-nowrap [&_th]:overflow-hidden [&_th]:text-ellipsis">
                  <TableHead className="font-semibold">Date & Time</TableHead>
                  <TableHead className="font-semibold">Job ID</TableHead>
                  <TableHead className="font-semibold">Sector</TableHead>
                  <TableHead className="font-semibold">Category</TableHead>
                  <TableHead className="font-semibold">Segment</TableHead>
                  <TableHead className="font-semibold">Department</TableHead>
                  <TableHead className="font-semibold">Designation</TableHead>
                  <TableHead className="font-semibold">Subjects</TableHead>
                  <TableHead className="font-semibold">Exp.</TableHead>
                  <TableHead className="font-semibold">Organisation</TableHead>
                  <TableHead className="font-semibold">Salary</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job, index) => {
                  const dateStr = job.created_at 
                    ? new Date(job.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) + " " + new Date(job.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
                    : "—";
                  return (
                    <TableRow key={job.id} className={`cursor-pointer hover:bg-accent/5 transition-colors [&_td]:px-0.5 [&_td]:py-1.5 [&_td]:max-w-[120px] [&_td]:overflow-hidden [&_td]:text-ellipsis ${index % 2 === 0 ? 'bg-background' : 'bg-muted/30'}`} onClick={() => handleSelectJob(job)}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{dateStr}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{job.id.slice(0, 8)}</code>
                      </TableCell>
                      <TableCell className="text-xs capitalize">{job.sector_division?.replace(/_/g, " ") || "—"}</TableCell>
                      <TableCell className="text-xs capitalize">{job.category?.replace(/_/g, " ") || "—"}</TableCell>
                      <TableCell className="text-xs">{job.segment || "—"}</TableCell>
                      <TableCell className="text-xs">{job.department || "—"}</TableCell>
                      <TableCell className="text-xs font-medium whitespace-nowrap">{job.designation || job.job_title || "—"}</TableCell>
                      <TableCell className="text-xs">{job.subjects || "—"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{job.experience_required || "—"}</TableCell>
                      <TableCell className="text-xs">{job.organisation || "—"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{job.salary_range || "—"}</TableCell>
                      <TableCell className="text-xs">
                        <Badge variant={job.status === "active" ? "default" : "secondary"} className="text-[10px]">
                          {job.status || "Draft"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleSelectJob(job)}>
                          <BookOpen className="h-3 w-3 mr-1" /> Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // === RENDER: Question Paper Editor ===
  if (editingPaper) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setEditingPaper(null)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {editingPaper.id ? "Edit" : "Create"} Question Paper - Set {editingPaper.set_number}
              </h2>
              <p className="text-sm text-muted-foreground">{selectedJob.job_title} • {selectedJob.organisation || ""}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingPaper(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSavePaper} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Save Paper
            </Button>
          </div>
        </div>

        {/* Paper Title & Details */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Paper Title</Label>
                <Input 
                  value={editingPaper.title} 
                  onChange={(e) => setEditingPaper({ ...editingPaper, title: e.target.value })}
                  placeholder="e.g. Mathematics Set 1"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Description (optional)</Label>
                <Input 
                  value={editingPaper.description || ""} 
                  onChange={(e) => setEditingPaper({ ...editingPaper, description: e.target.value })}
                  placeholder="Brief description of this paper"
                  className="text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Part</Label>
                <Select 
                  value={(editingPaper as any).part || ""} 
                  onValueChange={(v) => setEditingPaper({ ...editingPaper, part: v } as any)}
                >
                  <SelectTrigger className="text-sm h-9">
                    <SelectValue placeholder="Select Part" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Part 1</SelectItem>
                    <SelectItem value="2">Part 2</SelectItem>
                    <SelectItem value="3">Part 3</SelectItem>
                    <SelectItem value="4">Part 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Topic</Label>
                <Select 
                  value={(editingPaper as any).topic || ""} 
                  onValueChange={(v) => setEditingPaper({ ...editingPaper, topic: v } as any)}
                >
                  <SelectTrigger className="text-sm h-9">
                    <SelectValue placeholder="Select Topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="segment_awareness">Segment Awareness</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Division</Label>
                <Select 
                  value={(editingPaper as any).division || ""} 
                  onValueChange={(v) => setEditingPaper({ ...editingPaper, division: v } as any)}
                >
                  <SelectTrigger className="text-sm h-9">
                    <SelectValue placeholder="Select Division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Division A</SelectItem>
                    <SelectItem value="B">Division B</SelectItem>
                    <SelectItem value="C">Division C</SelectItem>
                    <SelectItem value="D">Division D</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions grouped by Section */}
        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const sectionQuestions = editingPaper.questions
              .map((q, idx) => ({ ...q, _idx: idx }))
              .filter(q => q.section === section);

            return (
              <Card key={section} className="border-2 border-muted">
                <CardHeader className="py-3 px-4 bg-muted/40 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {section}
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">Section {section}</CardTitle>
                        <p className="text-[10px] text-muted-foreground">
                          {sectionQuestions.length} question{sectionQuestions.length !== 1 ? "s" : ""} • {sectionQuestions.reduce((sum, q) => sum + q.marks, 0)} marks
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => handleAddQuestion(section)}>
                      <Plus className="h-3 w-3 mr-1" /> Add to Section {section}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {sectionQuestions.length === 0 ? (
                    <div className="text-center py-4 text-xs text-muted-foreground">
                      No questions in this section yet. Click "Add to Section {section}" above.
                    </div>
                  ) : (
                    sectionQuestions.map((q) => {
                      const qIndex = q._idx;
                      return (
                        <Card key={qIndex} className="border-l-4 border-l-primary/30">
                          <CardContent className="pt-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <Badge variant="outline" className="text-xs">Q{q.question_number}</Badge>
                              <div className="flex items-center gap-2">
                                <Select 
                                  value={q.question_type} 
                                  onValueChange={(v) => updateQuestion(qIndex, "question_type", v)}
                                >
                                  <SelectTrigger className="w-[140px] h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="multiple_choice">MCQ</SelectItem>
                                    <SelectItem value="text">Text Answer</SelectItem>
                                    <SelectItem value="true_false">True/False</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input 
                                  type="number" 
                                  value={q.marks} 
                                  onChange={(e) => updateQuestion(qIndex, "marks", parseInt(e.target.value) || 1)}
                                  className="w-16 h-7 text-xs"
                                  min={1}
                                />
                                <span className="text-xs text-muted-foreground">marks</span>
                                {editingPaper.questions.length > 1 && (
                                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleRemoveQuestion(qIndex)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </div>

                            {/* Question Text */}
                            <div>
                              <Label className="text-xs">Question</Label>
                              <Textarea 
                                value={q.question_text}
                                onChange={(e) => updateQuestion(qIndex, "question_text", e.target.value)}
                                placeholder="Enter the question..."
                                className="text-sm min-h-[60px]"
                              />
                            </div>

                            {/* Options for MCQ */}
                            {q.question_type === "multiple_choice" && q.options && (
                              <div className="grid grid-cols-2 gap-2">
                                {q.options.map((opt, oIndex) => (
                                  <div key={oIndex} className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] w-6 h-6 flex items-center justify-center p-0">
                                      {String.fromCharCode(65 + oIndex)}
                                    </Badge>
                                    <Input 
                                      value={opt}
                                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                      placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                                      className="text-sm h-8"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* True/False Options */}
                            {q.question_type === "true_false" && (
                              <div className="flex gap-4">
                                <Badge variant="outline" className="text-xs">A) True</Badge>
                                <Badge variant="outline" className="text-xs">B) False</Badge>
                              </div>
                            )}

                            {/* Answer / Solution */}
                            <div className="border-t pt-3">
                              <Label className="text-xs text-primary font-semibold">✅ Correct Answer / Solution</Label>
                              <Textarea 
                                value={q.answer_text}
                                onChange={(e) => updateQuestion(qIndex, "answer_text", e.target.value)}
                                placeholder={q.question_type === "multiple_choice" 
                                  ? "e.g. A (or the full answer text)" 
                                  : "Enter the correct answer or solution..."
                                }
                                className="text-sm min-h-[50px] mt-1"
                              />
                            </div>

                            {/* Keywords */}
                            <div>
                              <Label className="text-xs text-muted-foreground">Keywords (comma separated, for AI matching)</Label>
                              <Input 
                                value={q.keywords.join(", ")}
                                onChange={(e) => updateQuestion(qIndex, "keywords", e.target.value.split(",").map(k => k.trim()).filter(Boolean))}
                                placeholder="keyword1, keyword2, keyword3"
                                className="text-sm h-8"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // === RENDER: Viewing a Paper ===
  if (viewingPaper) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setViewingPaper(null)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{viewingPaper.title}</h2>
            <p className="text-sm text-muted-foreground">
              Set {viewingPaper.set_number} • {viewingPaper.questions.length} Questions • {selectedJob.job_title}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const sectionQuestions = viewingPaper.questions.filter(q => q.section === section);
            if (sectionQuestions.length === 0) return null;
            return (
              <Card key={section} className="border-2 border-muted">
                <CardHeader className="py-3 px-4 bg-muted/40 border-b">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      {section}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">Section {section}</CardTitle>
                      <p className="text-[10px] text-muted-foreground">
                        {sectionQuestions.length} question{sectionQuestions.length !== 1 ? "s" : ""} • {sectionQuestions.reduce((sum, q) => sum + q.marks, 0)} marks
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {sectionQuestions.map((q, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <Badge className="text-xs shrink-0">Q{q.question_number}</Badge>
                          <div className="flex-1 space-y-2">
                            <p className="text-sm font-medium">{q.question_text}</p>
                            
                            {q.question_type === "multiple_choice" && q.options && (
                              <div className="grid grid-cols-2 gap-1.5 ml-2">
                                {q.options.map((opt, oIdx) => (
                                  <div key={oIdx} className={`text-xs px-2 py-1 rounded border ${
                                    q.answer_text.toUpperCase().startsWith(String.fromCharCode(65 + oIdx))
                                      ? "bg-green-50 border-green-300 text-green-800 dark:bg-green-950 dark:border-green-700 dark:text-green-300"
                                      : "bg-muted/50"
                                  }`}>
                                    {String.fromCharCode(65 + oIdx)}) {opt}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="mt-2 p-2 bg-primary/5 rounded border border-primary/20">
                              <p className="text-xs font-semibold text-primary">Answer: {q.answer_text}</p>
                              {q.keywords.length > 0 && (
                                <p className="text-[10px] text-muted-foreground mt-1">Keywords: {q.keywords.join(", ")}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px]">{q.marks} mk</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // === RENDER: Viewing a Paper ===
  // === RENDER: Paper Sets for Selected Job (always show 4 slots) ===
  const allSets = [1, 2, 3, 4].map(setNum => {
    const existing = papers.find(p => p.set_number === setNum);
    return { setNumber: setNum, paper: existing || null };
  });

  const handleCreateSet = (setNum: number) => {
    if (!selectedJob) return;
    setEditingPaper({
      id: "",
      title: `Set ${setNum} - ${selectedJob.job_title}`,
      set_number: setNum,
      job_id: selectedJob.id,
      is_active: true,
      description: null,
      stage_type: "technical_assessment",
      questions: [createEmptyQuestion(1)],
    });
    setViewingPaper(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setSelectedJob(null); setPapers([]); }}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Question Papers</h2>
            <p className="text-sm text-muted-foreground">
              {selectedJob.job_title} {selectedJob.organisation ? `• ${selectedJob.organisation}` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* AI Question Papers Toggle */}
      <Card className={`border-2 transition-colors ${useAiQuestions ? "border-primary bg-primary/5" : "border-dashed border-muted-foreground/30"}`}>
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                useAiQuestions ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">AI Question Papers</p>
                <p className="text-xs text-muted-foreground">
                  {useAiQuestions 
                    ? "AI will auto-generate questions for each candidate based on the job profile" 
                    : "Enable to let AI generate questions instead of using manual question sets below"
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isTogglingAi && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
              <Switch 
                checked={useAiQuestions} 
                onCheckedChange={handleToggleAiQuestions}
                disabled={isTogglingAi}
              />
            </div>
          </div>
          {useAiQuestions && (
            <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-xs text-primary font-medium">
                ✨ AI mode is active — When candidates take the Written Test, AI will generate 10 MCQ questions tailored to the job requirements, skills, and candidate profile. Manual question sets below will be ignored.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Question Sets Section */}
      {!useAiQuestions && (
      <Card className={`border-2 transition-colors ${isManualSetsEnabled ? "border-primary/30 bg-primary/5" : "border-dashed border-muted-foreground/30"}`}>
        <CardContent className="py-4 px-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${isManualSetsEnabled ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <BookOpen className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Manual Question Sets (Set 1–4)</p>
                <p className="text-xs text-muted-foreground">
                  {isManualSetsEnabled ? "Create up to 4 question paper sets for candidates" : "Enable to use manual question sets for assessments"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isManualSetsEnabled ? "default" : "secondary"} className="text-[10px]">
                {isManualSetsEnabled ? "Enabled" : "Disabled"}
              </Badge>
              <Switch checked={isManualSetsEnabled} onCheckedChange={(checked) => {
                setIsManualSetsEnabled(checked);
                toast.success(checked ? "Manual question sets enabled — candidates will see these sets" : "Manual question sets disabled — hidden from candidates");
              }} />
            </div>
          </div>
          {!isManualSetsEnabled && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30">
              <p className="text-[11px] text-muted-foreground">⚠ Manual question sets are disabled. Candidates won't see Set 1–4 questions.</p>
            </div>
          )}
          {isManualSetsEnabled && (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {allSets.map(({ setNumber, paper }) => (
          <Card 
            key={setNumber} 
            className={`transition-shadow ${paper ? "hover:shadow-md" : "border-dashed bg-muted/20"}`}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  paper ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {setNumber}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {paper ? paper.title : `Set ${setNumber}`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {paper 
                      ? `${paper.questions.length} questions` 
                      : "Not created yet"
                    }
                  </p>
                </div>
              </div>

              {paper ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={paper.is_active ? "default" : "secondary"} className="text-[10px]">
                      {paper.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Switch
                      checked={paper.is_active}
                      onCheckedChange={async (checked) => {
                        const { error } = await supabase
                          .from("interview_question_papers")
                          .update({ is_active: checked } as any)
                          .eq("id", paper.id);
                        if (error) {
                          toast.error("Failed to update status");
                        } else {
                          toast.success(checked ? `Set ${paper.set_number} enabled` : `Set ${paper.set_number} disabled`);
                          fetchPapers(selectedJob.id);
                        }
                      }}
                    />
                  </div>
                  {!paper.is_active && (
                    <p className="text-[9px] text-warning mb-1.5">⚠ Candidates won't see this set</p>
                  )}

                  <div className="flex gap-1.5 mt-1">
                    <Button variant="outline" size="sm" className="text-[10px] h-6 px-2 flex-1" onClick={() => handleViewPaper(paper)}>
                      <Eye className="h-3 w-3 mr-0.5" /> View
                    </Button>
                    <Button variant="outline" size="sm" className="text-[10px] h-6 px-2 flex-1" onClick={() => handleEditPaper(paper)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-[10px] h-6 px-1 text-destructive" onClick={() => handleDeletePaper(paper.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center pt-1">
                  <BookOpen className="h-5 w-5 mx-auto text-muted-foreground/40 mb-1.5" />
                  <Button size="sm" variant="outline" className="text-[10px] h-6 px-2" onClick={() => handleCreateSet(setNumber)}>
                    <Plus className="h-3 w-3 mr-0.5" /> Create Set {setNumber}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
          )}
        </CardContent>
      </Card>
      )}

      {/* Review Question Papers - Show all created sets inline (only when AI mode is off) */}
      {!useAiQuestions && papers.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            Review Question Papers ({papers.length} set{papers.length > 1 ? "s" : ""} created)
          </h3>
          
          <Accordion type="multiple" className="space-y-2">
            {papers.map((paper) => (
              <AccordionItem key={paper.id} value={paper.id} className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-2 hover:no-underline hover:bg-muted/30">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                      {paper.set_number}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{paper.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {paper.questions.length} questions • {paper.questions.reduce((sum, q) => sum + q.marks, 0)} total marks
                      </p>
                    </div>
                    {paper.is_active ? (
                      <Badge variant="default" className="text-[10px] ml-auto mr-2">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] ml-auto mr-2">Inactive</Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-3">
                  <div className="space-y-2 pt-1">
                    {paper.questions.map((q, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border ${idx % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">Q{q.question_number}</Badge>
                          <div className="flex-1 space-y-1.5">
                            <p className="text-xs font-medium leading-relaxed">{q.question_text}</p>
                            
                            {/* MCQ Options */}
                            {q.question_type === "multiple_choice" && q.options && (
                              <div className="grid grid-cols-2 gap-1 ml-1">
                                {q.options.map((opt, oIdx) => (
                                  <div key={oIdx} className={`text-[10px] px-2 py-0.5 rounded border ${
                                    q.answer_text.toUpperCase().startsWith(String.fromCharCode(65 + oIdx))
                                      ? "bg-accent/10 border-accent/40 text-accent-foreground font-medium"
                                      : "bg-muted/30 border-border"
                                  }`}>
                                    {String.fromCharCode(65 + oIdx)}) {opt}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* True/False */}
                            {q.question_type === "true_false" && (
                              <div className="flex gap-2 ml-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded border ${
                                  q.answer_text.toLowerCase().includes("true") 
                                    ? "bg-accent/10 border-accent/40 font-medium" : "bg-muted/30"
                                }`}>True</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded border ${
                                  q.answer_text.toLowerCase().includes("false") 
                                    ? "bg-accent/10 border-accent/40 font-medium" : "bg-muted/30"
                                }`}>False</span>
                              </div>
                            )}

                            {/* Answer */}
                            <div className="p-1.5 bg-primary/5 rounded border border-primary/15">
                              <p className="text-[10px] text-primary font-semibold">✅ Answer: {q.answer_text}</p>
                              {q.keywords.length > 0 && (
                                <p className="text-[9px] text-muted-foreground mt-0.5">Keywords: {q.keywords.join(", ")}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[9px] shrink-0">{q.marks} mk</Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-2 mt-3 pt-2 border-t">
                    <Button variant="outline" size="sm" className="text-[10px] h-6" onClick={() => handleEditPaper(paper)}>
                      Edit Set {paper.set_number}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-[10px] h-6 text-destructive" onClick={() => handleDeletePaper(paper.id)}>
                      <Trash2 className="h-3 w-3 mr-0.5" /> Delete
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* AI Paper Detection Section (only when AI mode is off) */}
      {!useAiQuestions && (
        <AIPaperDetection
          jobId={selectedJob.id}
          jobTitle={selectedJob.job_title}
          existingSets={papers.map(p => p.set_number)}
          onSaved={() => fetchPapers(selectedJob.id)}
        />
      )}

      {/* Chapter-wise Q&A Section */}
      {!useAiQuestions && (
        <ChapterWiseQA
          jobId={selectedJob.id}
          jobTitle={selectedJob.job_title}
        />
      )}

      {/* Info about how QPM works */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-5 px-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-foreground">📋 How it works</h3>
              <div className="space-y-1.5">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">1. Create</span> — Build up to 4 question paper sets with MCQ, Text, or True/False questions and their solutions.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">2. Interview</span> — During the Technical Assessment round, AI randomly picks one of your question sets and presents it to the candidate.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">3. Evaluate</span> — After submission, AI compares answers against your solutions & keywords to auto-score correct/wrong answers.
                </p>
              </div>
              <p className="text-xs text-muted-foreground/80 pt-1 italic">
                Your question papers are saved permanently and reused for every candidate applying to this job.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
