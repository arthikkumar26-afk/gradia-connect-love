import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  Eye, BookOpen, Hash, Award, Unlink, AlertCircle
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
  job_title?: string;
}

interface Job {
  id: string;
  job_title: string;
  status: string | null;
  department: string | null;
  use_ai_questions: boolean;
}

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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch all question papers created by this employer
      const { data: papersData, error: papersError } = await supabase
        .from("interview_question_papers")
        .select("id, title, stage_type, is_active, job_id, set_number, created_at, description")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (papersError) throw papersError;

      // Get question counts for each paper
      const papersWithCounts: QuestionPaper[] = [];
      for (const paper of (papersData || [])) {
        const { count } = await supabase
          .from("interview_questions")
          .select("id", { count: "exact", head: true })
          .eq("paper_id", paper.id);

        // Get job title if assigned
        let jobTitle: string | undefined;
        if (paper.job_id) {
          const { data: jobData } = await supabase
            .from("jobs")
            .select("job_title")
            .eq("id", paper.job_id)
            .single();
          jobTitle = jobData?.job_title;
        }

        papersWithCounts.push({
          ...paper,
          question_count: count || 0,
          job_title: jobTitle,
        });
      }

      setPapers(papersWithCounts);

      // Fetch employer's jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("id, job_title, status, department, use_ai_questions")
        .eq("employer_id", user.id)
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;
      setJobs((jobsData as any[]) || []);
    } catch (err) {
      console.error("Error fetching test papers:", err);
      toast.error("Failed to load test papers");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignToJob = async () => {
    if (!assignDialogPaper || !selectedJobForAssign) return;

    setAssigning(assignDialogPaper.id);
    try {
      // Update the paper's job_id
      const { error } = await supabase
        .from("interview_question_papers")
        .update({ job_id: selectedJobForAssign } as any)
        .eq("id", assignDialogPaper.id);

      if (error) throw error;

      // If the target job has AI questions enabled, disable it since manual paper is now assigned
      const targetJob = jobs.find(j => j.id === selectedJobForAssign);
      if (targetJob?.use_ai_questions) {
        await supabase
          .from("jobs")
          .update({ use_ai_questions: false } as any)
          .eq("id", selectedJobForAssign);
      }

      toast.success(`Paper assigned to "${targetJob?.job_title}" successfully!`);
      setAssignDialogPaper(null);
      setSelectedJobForAssign("");
      fetchData();
    } catch (err) {
      console.error("Error assigning paper:", err);
      toast.error("Failed to assign paper");
    } finally {
      setAssigning(null);
    }
  };

  const handleUnassign = async (paperId: string) => {
    try {
      const { error } = await supabase
        .from("interview_question_papers")
        .update({ job_id: null } as any)
        .eq("id", paperId);

      if (error) throw error;
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
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Test Papers
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          View all question papers created in Smart Assessment and assign them to vacancy positions for the Written Test.
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Paper Info */}
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

                    {/* Assignment Status */}
                    {paper.job_id && paper.job_title ? (
                      <div className="flex items-center gap-1.5 mt-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-xs font-medium text-emerald-600">
                          Assigned to: {paper.job_title}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-2">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs text-amber-600">Not assigned to any vacancy</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
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

                    {paper.job_id ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => handleUnassign(paper.id)}
                      >
                        <Unlink className="h-3.5 w-3.5 mr-1" />
                        Unassign
                      </Button>
                    ) : null}

                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setAssignDialogPaper(paper);
                        setSelectedJobForAssign(paper.job_id || "");
                      }}
                    >
                      <Link2 className="h-3.5 w-3.5 mr-1" />
                      {paper.job_id ? "Reassign" : "Assign to Vacancy"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Assign Dialog */}
      <Dialog open={!!assignDialogPaper} onOpenChange={(open) => { if (!open) { setAssignDialogPaper(null); setSelectedJobForAssign(""); } }}>
        <DialogContent className="sm:max-w-md">
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
              <p className="text-xs text-muted-foreground">{assignDialogPaper?.question_count} questions</p>
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Select Vacancy</p>
              <Select value={selectedJobForAssign} onValueChange={setSelectedJobForAssign}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a vacancy..." />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map((job) => (
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
              <Button variant="outline" size="sm" onClick={() => { setAssignDialogPaper(null); setSelectedJobForAssign(""); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!selectedJobForAssign || !!assigning}
                onClick={handleAssignToJob}
              >
                {assigning ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                Assign
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
                              Section {q.section}
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
