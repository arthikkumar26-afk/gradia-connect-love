import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft, Plus, Trash2, Save, FileText, Loader2, 
  ChevronDown, ChevronUp, BookOpen, CheckCircle2, Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
}

export const QPMContent = () => {
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobItem | null>(null);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPaper, setEditingPaper] = useState<QuestionPaper | null>(null);
  const [viewingPaper, setViewingPaper] = useState<QuestionPaper | null>(null);

  // Fetch jobs
  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("jobs")
        .select("id, job_title, department, organisation, status, created_at")
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setJobs(data || []);
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
          questions,
        });
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

  const createEmptyQuestion = (num: number): QuestionItem => ({
    question_number: num,
    question_text: "",
    question_type: "multiple_choice",
    options: ["", "", "", ""],
    marks: 1,
    answer_text: "",
    keywords: [],
  });

  const handleAddQuestion = () => {
    if (!editingPaper) return;
    const nextNum = editingPaper.questions.length + 1;
    setEditingPaper({
      ...editingPaper,
      questions: [...editingPaper.questions, createEmptyQuestion(nextNum)],
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
          })
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
          })
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
            <h2 className="text-lg font-semibold text-foreground">Question Paper Management</h2>
            <p className="text-sm text-muted-foreground">Select a job vacancy to manage its question papers</p>
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
          <div className="overflow-x-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary">
                  <TableHead className="text-xs font-semibold text-secondary-foreground whitespace-nowrap">Job Title</TableHead>
                  <TableHead className="text-xs font-semibold text-secondary-foreground whitespace-nowrap">Organisation</TableHead>
                  <TableHead className="text-xs font-semibold text-secondary-foreground whitespace-nowrap">Department</TableHead>
                  <TableHead className="text-xs font-semibold text-secondary-foreground whitespace-nowrap">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-secondary-foreground whitespace-nowrap">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => handleSelectJob(job)}>
                    <TableCell className="text-xs font-medium">{job.job_title}</TableCell>
                    <TableCell className="text-xs">{job.organisation || "—"}</TableCell>
                    <TableCell className="text-xs">{job.department || "—"}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant={job.status === "Open" ? "default" : "secondary"} className="text-[10px]">
                        {job.status || "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={(e) => { e.stopPropagation(); handleSelectJob(job); }}>
                        <BookOpen className="h-3 w-3 mr-1" /> Manage QPM
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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

        {/* Paper Title */}
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
          </CardContent>
        </Card>

        {/* Questions */}
        <div className="space-y-3">
          {editingPaper.questions.map((q, qIndex) => (
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
          ))}
        </div>

        <Button variant="outline" className="w-full" onClick={handleAddQuestion}>
          <Plus className="h-4 w-4 mr-2" /> Add Question
        </Button>
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

        <div className="space-y-3">
          {viewingPaper.questions.map((q, idx) => (
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
        </div>
      </div>
    );
  }

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

      {/* Always show 4 set slots */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {allSets.map(({ setNumber, paper }) => (
          <Card 
            key={setNumber} 
            className={`transition-shadow ${paper ? "hover:shadow-md" : "border-dashed bg-muted/20"}`}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    paper ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {setNumber}
                  </div>
                  <div>
                    <CardTitle className="text-sm">
                      {paper ? paper.title : `Set ${setNumber}`}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {paper 
                        ? `${paper.questions.length} questions` 
                        : "Not created yet"
                      }
                    </p>
                  </div>
                </div>
                {paper && (
                  <Badge variant={paper.is_active ? "default" : "secondary"} className="text-[10px]">
                    {paper.is_active ? "Active" : "Inactive"}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {paper ? (
                <>
                  {paper.description && (
                    <p className="text-xs text-muted-foreground mb-3">{paper.description}</p>
                  )}
                  
                  {/* Question preview */}
                  <div className="space-y-1 mb-3">
                    {paper.questions.slice(0, 3).map((q, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-primary/50 shrink-0" />
                        <span className="truncate">{q.question_text}</span>
                      </div>
                    ))}
                    {paper.questions.length > 3 && (
                      <p className="text-[10px] text-muted-foreground ml-5">+{paper.questions.length - 3} more questions</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="text-xs h-7 flex-1" onClick={() => handleViewPaper(paper)}>
                      <Eye className="h-3 w-3 mr-1" /> View
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs h-7 flex-1" onClick={() => handleEditPaper(paper)}>
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-destructive" onClick={() => handleDeletePaper(paper.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4">
                  <BookOpen className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-xs text-muted-foreground mb-3">Add questions for this set</p>
                  <Button size="sm" variant="outline" onClick={() => handleCreateSet(setNumber)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Create Set {setNumber}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info about how QPM works */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="py-3">
          <p className="text-xs text-muted-foreground">
            <strong>How it works:</strong> Create up to 4 question paper sets. During the interview, AI will randomly pick questions 
            from these sets and present them to the candidate. After the candidate submits answers, AI compares them against 
            your solutions and keywords to determine correct/wrong answers automatically.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
