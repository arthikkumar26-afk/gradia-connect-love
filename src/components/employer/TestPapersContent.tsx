import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  FileText, Briefcase, Link2, CheckCircle2, Loader2,
  Eye, BookOpen, Hash, Award, Unlink, AlertCircle,
  ListChecks, AlignLeft, ToggleLeft, ArrowLeftRight,
  HelpCircle, AlignJustify, Image, Map, Settings2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuestionPaper {
  id: string;
  title: string;
  stage_type: string;
  is_active: boolean;
  job_id: string | null;
  set_number: number | null;
  created_at: string;
  description: string | null;
  question_count: number;
  assigned_jobs: { job_id: string; job_title: string; section_config?: Record<string, number> }[];
}

interface Job {
  id: string;
  job_title: string;
  status: string | null;
  department: string | null;
  use_ai_questions: boolean;
}

interface SectionCount {
  key: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  total: number;
  selected: number;
}

const SECTION_META: { key: string; label: string; icon: React.ReactNode; color: string }[] = [
  { key: "MCQ", label: "MCQ", icon: <ListChecks className="h-3.5 w-3.5" />, color: "text-blue-600" },
  { key: "Fill in the Blanks", label: "Fill in the Blanks", icon: <AlignLeft className="h-3.5 w-3.5" />, color: "text-emerald-600" },
  { key: "True or False", label: "True or False", icon: <ToggleLeft className="h-3.5 w-3.5" />, color: "text-purple-600" },
  { key: "Match the Following", label: "Match the Following", icon: <ArrowLeftRight className="h-3.5 w-3.5" />, color: "text-orange-600" },
  { key: "Assertion & Reasoning", label: "Assertion & Reasoning", icon: <HelpCircle className="h-3.5 w-3.5" />, color: "text-rose-600" },
  { key: "Short Answers", label: "Short Answers", icon: <AlignLeft className="h-3.5 w-3.5" />, color: "text-cyan-600" },
  { key: "Long Answers", label: "Long Answers", icon: <AlignJustify className="h-3.5 w-3.5" />, color: "text-amber-600" },
  { key: "Image Based", label: "Image Based", icon: <Image className="h-3.5 w-3.5" />, color: "text-pink-600" },
  { key: "Map Based", label: "Map Based", icon: <Map className="h-3.5 w-3.5" />, color: "text-teal-600" },
];

export const TestPapersContent = () => {
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedJobForAssign, setSelectedJobForAssign] = useState<string>("");
  const [assignDialogPaper, setAssignDialogPaper] = useState<QuestionPaper | null>(null);
  const [previewPaper, setPreviewPaper] = useState<QuestionPaper | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sectionCounts, setSectionCounts] = useState<SectionCount[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch papers created by this user OR question_bank papers linked to their jobs
      const { data: papersData, error: papersError } = await supabase
        .from("interview_question_papers")
        .select("id, title, stage_type, is_active, job_id, set_number, created_at, description")
        .or(`created_by.eq.${user.id},stage_type.eq.question_bank`)
        .order("created_at", { ascending: false });

      if (papersError) throw papersError;

      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("id, job_title, status, department, use_ai_questions")
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;
      const allJobs = (jobsData as any[]) || [];
      setJobs(allJobs);

      const papersWithData: QuestionPaper[] = [];
      for (const paper of (papersData || [])) {
        const { count } = await supabase
          .from("interview_questions")
          .select("id", { count: "exact", head: true })
          .eq("paper_id", paper.id);

        const { data: assignmentsData } = await supabase
          .from("test_paper_assignments")
          .select("job_id, section_config")
          .eq("paper_id", paper.id);

        const assignedJobs: { job_id: string; job_title: string; section_config?: Record<string, number> }[] = [];

        if (paper.job_id) {
          const job = allJobs.find(j => j.id === paper.job_id);
          if (job) assignedJobs.push({ job_id: job.id, job_title: job.job_title });
        }

        for (const assignment of (assignmentsData || [])) {
          if (!assignedJobs.some(a => a.job_id === assignment.job_id)) {
            const job = allJobs.find(j => j.id === assignment.job_id);
            if (job) assignedJobs.push({
              job_id: job.id,
              job_title: job.job_title,
              section_config: assignment.section_config as Record<string, number> | undefined,
            });
          }
        }

        papersWithData.push({
          ...paper,
          question_count: count || 0,
          assigned_jobs: assignedJobs,
        });
      }

      setPapers(papersWithData);
    } catch (err) {
      console.error("Error fetching test papers:", err);
      toast.error("Failed to load test papers");
    } finally {
      setLoading(false);
    }
  };

  const fetchSectionCounts = async (paperId: string) => {
    setLoadingSections(true);
    try {
      const { data: questions, error } = await supabase
        .from("interview_questions")
        .select("section")
        .eq("paper_id", paperId);

      if (error) throw error;

      const countMap: Record<string, number> = {};
      (questions || []).forEach(q => {
        const sec = q.section || "General";
        countMap[sec] = (countMap[sec] || 0) + 1;
      });

      const sections: SectionCount[] = SECTION_META
        .filter(s => (countMap[s.key] || 0) > 0)
        .map(s => ({
          key: s.key,
          label: s.label,
          icon: s.icon,
          color: s.color,
          total: countMap[s.key] || 0,
          selected: countMap[s.key] || 0, // default: all questions selected
        }));

      // Add any sections not in SECTION_META (like "General")
      Object.keys(countMap).forEach(key => {
        if (!sections.find(s => s.key === key)) {
          sections.push({
            key,
            label: key,
            icon: <FileText className="h-3.5 w-3.5" />,
            color: "text-muted-foreground",
            total: countMap[key],
            selected: countMap[key],
          });
        }
      });

      setSectionCounts(sections);
    } catch (err) {
      console.error("Error fetching section counts:", err);
    } finally {
      setLoadingSections(false);
    }
  };

  const handleOpenAssignDialog = (paper: QuestionPaper) => {
    setAssignDialogPaper(paper);
    setSelectedJobForAssign("");
    fetchSectionCounts(paper.id);
  };

  const handleSectionCountChange = (sectionKey: string, value: string) => {
    const num = parseInt(value) || 0;
    setSectionCounts(prev =>
      prev.map(s => s.key === sectionKey ? { ...s, selected: Math.min(Math.max(0, num), s.total) } : s)
    );
  };

  const totalSelectedQuestions = sectionCounts.reduce((sum, s) => sum + s.selected, 0);

  const handleAssignToJob = async () => {
    if (!assignDialogPaper || !selectedJobForAssign) return;

    if (assignDialogPaper.assigned_jobs.some(a => a.job_id === selectedJobForAssign)) {
      toast.error("This paper is already assigned to that vacancy");
      return;
    }

    if (totalSelectedQuestions === 0) {
      toast.error("Please select at least 1 question from any section");
      return;
    }

    setAssigning(assignDialogPaper.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Build section_config
      const sectionConfig: Record<string, number> = {};
      sectionCounts.forEach(s => {
        if (s.selected > 0) sectionConfig[s.key] = s.selected;
      });

      const { error } = await supabase
        .from("test_paper_assignments")
        .insert({
          paper_id: assignDialogPaper.id,
          job_id: selectedJobForAssign,
          assigned_by: user?.id,
          section_config: sectionConfig,
        } as any);

      if (error) throw error;

      const targetJob = jobs.find(j => j.id === selectedJobForAssign);
      if (targetJob?.use_ai_questions) {
        await supabase
          .from("jobs")
          .update({ use_ai_questions: false } as any)
          .eq("id", selectedJobForAssign);
      }

      toast.success(`Paper assigned to "${targetJob?.job_title}" with ${totalSelectedQuestions} questions!`);
      setAssignDialogPaper(null);
      setSelectedJobForAssign("");
      setSectionCounts([]);
      fetchData();
    } catch (err: any) {
      console.error("Error assigning paper:", err);
      if (err?.code === '23505') {
        toast.error("This paper is already assigned to that vacancy");
      } else {
        toast.error("Failed to assign paper");
      }
    } finally {
      setAssigning(null);
    }
  };

  const handleUnassignFromJob = async (paperId: string, jobId: string) => {
    try {
      const { error } = await supabase
        .from("test_paper_assignments")
        .delete()
        .eq("paper_id", paperId)
        .eq("job_id", jobId);

      if (error) throw error;

      const paper = papers.find(p => p.id === paperId);
      if (paper?.job_id === jobId) {
        await supabase
          .from("interview_question_papers")
          .update({ job_id: null } as any)
          .eq("id", paperId);
      }

      toast.success("Paper unassigned from vacancy");
      fetchData();
    } catch (err) {
      console.error("Error unassigning paper:", err);
      toast.error("Failed to unassign paper");
    }
  };

  const handlePreview = async (paper: QuestionPaper) => {
    setPreviewPaper(paper);
    setLoadingPreview(true);
    try {
      const { data, error } = await supabase
        .from("interview_questions")
        .select("question_number, question_text, question_type, options, marks, section")
        .eq("paper_id", paper.id)
        .order("question_number", { ascending: true });

      if (error) throw error;
      setPreviewQuestions(data || []);
    } catch (err) {
      console.error("Error loading preview:", err);
      toast.error("Failed to load questions");
    } finally {
      setLoadingPreview(false);
    }
  };

  const getStageTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      technical_assessment: "Manual Set",
      question_bank: "Question Bank",
      ai_detected: "AI Detected",
      chapter_wise: "Chapter-wise",
    };
    return map[type] || type;
  };

  const formatSectionConfig = (config?: Record<string, number>) => {
    if (!config) return null;
    return Object.entries(config)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}: ${v}Q`)
      .join(", ");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading test papers...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Test Papers
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          View all question papers created in Smart Assessment and assign them to vacancy positions for the Written Test. You can assign the same paper to multiple vacancies.
        </p>
      </div>

      {papers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">No Test Papers Yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Create question papers in <strong>Smart Assessment</strong> first. They will appear here for you to assign to vacancies.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {papers.map((paper) => (
            <Card key={paper.id} className="border-border hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {paper.title}
                      </h3>
                      <Badge variant="secondary" className="text-[10px] shrink-0">
                        {getStageTypeLabel(paper.stage_type)}
                      </Badge>
                      {paper.is_active ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px] shrink-0">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          Inactive
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {paper.question_count} questions
                      </span>
                      {paper.set_number && (
                        <span className="flex items-center gap-1">
                          <Award className="h-3 w-3" />
                          Set {paper.set_number}
                        </span>
                      )}
                      <span>
                        {new Date(paper.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {paper.assigned_jobs.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {paper.assigned_jobs.map((aj) => (
                          <div key={aj.job_id} className="flex items-center gap-2 flex-wrap">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                            <span className="text-xs font-medium text-emerald-600">
                              Assigned to: {aj.job_title}
                            </span>
                            {aj.section_config && (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {formatSectionConfig(aj.section_config)}
                              </span>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1.5 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleUnassignFromJob(paper.id, aj.job_id)}
                            >
                              <Unlink className="h-3 w-3 mr-0.5" />
                              Unassign
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-2">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs text-amber-600">Not assigned to any vacancy</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handlePreview(paper)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Preview
                    </Button>

                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={() => handleOpenAssignDialog(paper)}
                    >
                      <Link2 className="h-3.5 w-3.5 mr-1" />
                      Assign to Vacancy
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Dialog with Section Config */}
      <Dialog open={!!assignDialogPaper} onOpenChange={(open) => { if (!open) { setAssignDialogPaper(null); setSelectedJobForAssign(""); setSectionCounts([]); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Briefcase className="h-4 w-4 text-primary" />
              Assign Paper to Vacancy
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Paper:</p>
              <p className="text-sm font-medium text-foreground">{assignDialogPaper?.title}</p>
              <p className="text-xs text-muted-foreground">{assignDialogPaper?.question_count} total questions</p>
              {assignDialogPaper && assignDialogPaper.assigned_jobs.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Already assigned to:</p>
                  <div className="flex flex-wrap gap-1">
                    {assignDialogPaper.assigned_jobs.map(aj => (
                      <Badge key={aj.job_id} variant="secondary" className="text-[10px]">{aj.job_title}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Section-wise Question Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Settings2 className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-foreground">Choose Questions per Section</p>
              </div>

              {loadingSections ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : sectionCounts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No questions found in this paper.</p>
              ) : (
                <div className="space-y-2">
                  {sectionCounts.map((section) => (
                    <div
                      key={section.key}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border bg-muted/30"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={section.color}>{section.icon}</span>
                        <span className="text-sm font-medium text-foreground truncate">{section.label}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {section.total} available
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          type="number"
                          min={0}
                          max={section.total}
                          value={section.selected}
                          onChange={(e) => handleSectionCountChange(section.key, e.target.value)}
                          className="w-16 h-8 text-center text-sm"
                        />
                        <span className="text-xs text-muted-foreground">Q</span>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-2 px-1">
                    <span className="text-sm font-semibold text-foreground">Total Selected</span>
                    <Badge className="text-xs">
                      {totalSelectedQuestions} questions
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Select Vacancy</p>
              <Select value={selectedJobForAssign} onValueChange={setSelectedJobForAssign}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a vacancy..." />
                </SelectTrigger>
                <SelectContent>
                  {jobs
                    .filter(job => !assignDialogPaper?.assigned_jobs.some(a => a.job_id === job.id))
                    .map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        <div className="flex items-center gap-2">
                          <span>{job.job_title}</span>
                          {job.use_ai_questions && (
                            <Badge variant="outline" className="text-[10px] ml-1">AI</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedJobForAssign && jobs.find(j => j.id === selectedJobForAssign)?.use_ai_questions && (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  AI Questions will be disabled for this vacancy when you assign a manual paper.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => { setAssignDialogPaper(null); setSelectedJobForAssign(""); setSectionCounts([]); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!selectedJobForAssign || !!assigning || totalSelectedQuestions === 0}
                onClick={handleAssignToJob}
              >
                {assigning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Assign ({totalSelectedQuestions}Q)
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewPaper} onOpenChange={(open) => { if (!open) setPreviewPaper(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-primary" />
              {previewPaper?.title}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-3">
            {loadingPreview ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : previewQuestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10">No questions in this paper.</p>
            ) : (
              <div className="space-y-4">
                {previewQuestions.map((q, idx) => (
                  <div key={idx} className="border border-border rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-bold text-primary bg-primary/10 rounded-full h-5 w-5 flex items-center justify-center shrink-0 mt-0.5">
                        {q.question_number}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm text-foreground font-medium">{q.question_text}</p>
                        {q.options && Array.isArray(q.options) && q.options.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {q.options.map((opt: string, oi: number) => (
                              <div key={oi} className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <span className="font-medium text-foreground/70">{String.fromCharCode(65 + oi)}.</span>
                                <span>{opt}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="outline" className="text-[10px]">
                            {q.marks || 1} mark{(q.marks || 1) > 1 ? "s" : ""}
                          </Badge>
                          {q.section && (
                            <Badge variant="secondary" className="text-[10px]">
                              {q.section}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
