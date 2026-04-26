import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Save, RefreshCw, Eye, Palette, ChevronRight, Info, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { interviewPipelineConfig } from "@/data/interviewPipelineConfig";

interface EmailTemplate {
  id?: string;
  employer_id: string;
  stage_name: string;
  template_type: string;
  subject: string;
  header_text: string;
  body_text: string;
  footer_text: string;
  primary_color: string;
  is_active: boolean;
}

interface Job {
  id: string;
  job_title: string;
  interview_type: string | null;
  function_type: string | null;
}

// Stage icon mapping
const STAGE_ICONS: Record<string, string> = {
  "CV/Resume": "📄",
  "Resume Screening": "📄",
  "Written Test Slot Booking": "📅",
  "Demo Slot Booking": "📅",
  "HR Round Slot Booking": "📅",
  "Written Test": "✍️",
  "Technical Assessment": "💻",
  "Technical Coding Challenge": "💻",
  "Technical MCQ Test": "📝",
  "Technical Interview": "🖥️",
  "Demo Round": "🎥",
  "Demo Feedback": "💬",
  "HR Round": "👥",
  "Final Review": "🎯",
  "Offer Stage": "🎁",
  "Instruction Mail": "📧",
  "Leadership Assessment": "👑",
  "Academic Assessment": "🎓",
  "Case Study": "📋",
  "Board Interview": "🏢",
  "Aptitude Test": "🧠",
  "Sales Pitch": "📊",
  "Group Discussion": "🗣️",
  "Management Meet": "🤝",
  "Psychometric Assessment": "🧩",
  "Role Play Round": "🎭",
  "Practical Assessment": "🔬",
  "Knowledge Assessment": "📚",
  "Security Assessment": "🔒",
  "SQL & Analytics Test": "📊",
  "Infrastructure Test": "☁️",
  "QA Assessment": "✅",
  "Design Challenge": "🎨",
  "Strategy Presentation": "📈",
  "Technical Support Test": "🛠️",
  "Operations Case Study": "⚙️",
  "Team Scenario": "👫",
};

// Smart default templates for common stage patterns
const buildDefaultTemplate = (stageName: string, companyName = "{{companyName}}", jobTitle = "{{jobTitle}}") => {
  const slotStages = ["Slot Booking"];
  const isSlotStage = slotStages.some(s => stageName.includes(s));

  if (stageName === "CV/Resume" || stageName === "Resume Screening") {
    return {
      subject: `📄 Application Received - ${jobTitle} at ${companyName}`,
      header_text: "Application Under Review",
      body_text: `Thank you for applying for the {{jobTitle}} position at {{companyName}}. Your resume has been received and is currently under AI-powered review. We will notify you of the result shortly.`,
      footer_text: `Best regards,\nThe {{companyName}} Hiring Team`,
      primary_color: "#10b981",
    };
  }
  if (isSlotStage) {
    const roundName = stageName.replace(" Slot Booking", "");
    return {
      subject: `📅 Book Your ${roundName} Slot - {{jobTitle}} at {{companyName}}`,
      header_text: `Book Your ${roundName} Appointment`,
      body_text: `Congratulations! You've cleared the previous stage. Please book your preferred slot for the {{jobTitle}} ${roundName} at {{companyName}}. Click the link below to choose a date and time convenient for you.`,
      footer_text: `Best of luck!\nThe {{companyName}} Hiring Team`,
      primary_color: "#3b82f6",
    };
  }
  if (stageName === "Demo Round") {
    return {
      subject: `🎥 Demo Round Scheduled - {{jobTitle}} at {{companyName}}`,
      header_text: "Your Demo Round is Confirmed!",
      body_text: `Your Demo Round for the {{jobTitle}} position at {{companyName}} has been scheduled. This is a live teaching/presentation session. Please be prepared with your topic and ensure a stable internet connection.`,
      footer_text: `All the best!\nThe {{companyName}} Hiring Team`,
      primary_color: "#8b5cf6",
    };
  }
  if (stageName === "Demo Feedback") {
    return {
      subject: `💬 Demo Round Feedback - {{jobTitle}} at {{companyName}}`,
      header_text: "Demo Round Evaluation Complete",
      body_text: `Your Demo Round for {{jobTitle}} at {{companyName}} has been evaluated by our management team. Please find your feedback and score below. We will update you on next steps soon.`,
      footer_text: `Thank you,\nThe {{companyName}} Hiring Team`,
      primary_color: "#f59e0b",
    };
  }
  if (stageName === "HR Round") {
    return {
      subject: `👥 HR Round Scheduled - {{jobTitle}} at {{companyName}}`,
      header_text: "HR Interview Confirmed!",
      body_text: `Great news! You have been scheduled for the HR Round for the {{jobTitle}} position at {{companyName}}. This interview will cover your cultural fit, expectations, and overall suitability for the role.`,
      footer_text: `Looking forward to speaking with you!\nThe {{companyName}} HR Team`,
      primary_color: "#f59e0b",
    };
  }
  if (stageName === "Final Review") {
    return {
      subject: `🎯 Final Review Update - {{jobTitle}} at {{companyName}}`,
      header_text: "Final Review in Progress",
      body_text: `You have successfully completed all interview stages for {{jobTitle}} at {{companyName}}. Our team is currently conducting the final review of all candidates. We will inform you of the outcome very soon.`,
      footer_text: `Thank you for your patience,\nThe {{companyName}} Hiring Team`,
      primary_color: "#ec4899",
    };
  }
  if (stageName === "Offer Stage") {
    return {
      subject: `🎁 Offer Letter - {{jobTitle}} at {{companyName}}`,
      header_text: "Congratulations! You Got the Job!",
      body_text: `We are thrilled to extend an offer for the {{jobTitle}} position at {{companyName}}. Please find your offer letter attached. Kindly review and respond at your earliest convenience. Welcome to the team!`,
      footer_text: `We can't wait to have you on board!\nThe {{companyName}} Hiring Team`,
      primary_color: "#10b981",
    };
  }
  if (stageName === "Instruction Mail") {
    return {
      subject: `📧 Important: Interview Instructions - {{jobTitle}} at {{companyName}}`,
      header_text: "Interview Process Instructions",
      body_text: `Thank you for your application for {{jobTitle}} at {{companyName}}. Please carefully read all the enclosed instructions for your upcoming interview process. Following these guidelines will ensure a smooth experience.`,
      footer_text: `Good luck!\nThe {{companyName}} Hiring Team`,
      primary_color: "#6366f1",
    };
  }
  // Generic fallback for any stage
  return {
    subject: `📋 ${stageName} Update - {{jobTitle}} at {{companyName}}`,
    header_text: `${stageName} Stage`,
    body_text: `We have an update regarding your {{jobTitle}} application at {{companyName}} for the ${stageName} stage. Please review the details below and follow any instructions provided.`,
    footer_text: `Best regards,\nThe {{companyName}} Hiring Team`,
    primary_color: "#6366f1",
  };
};

const TEMPLATE_UNLOCK_COST = 200;

export function EmailTemplatesEditor() {
  const [templates, setTemplates] = useState<Record<string, EmailTemplate>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [pipelineStages, setPipelineStages] = useState<{ name: string; icon: string; description: string }[]>([]);
  const [activeStage, setActiveStage] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [unlockedJobs, setUnlockedJobs] = useState<Set<string>>(new Set());
  const [unlocking, setUnlocking] = useState(false);

  const handleUnlockTemplates = async () => {
    if (!userId || !selectedJobId) {
      toast.error("Please select a job first");
      return;
    }
    if (unlockedJobs.has(selectedJobId)) return;

    setUnlocking(true);
    try {
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, points_balance")
        .eq("user_id", userId)
        .maybeSingle();

      if (!wallet) {
        toast.error("Wallet not found. Please load points first.");
        return;
      }
      const balance = wallet.points_balance ?? 0;
      if (balance < TEMPLATE_UNLOCK_COST) {
        toast.error(`Insufficient points. You need ${TEMPLATE_UNLOCK_COST} pts but have ${balance} pts.`);
        return;
      }

      const { error: updErr } = await supabase
        .from("wallets")
        .update({ points_balance: balance - TEMPLATE_UNLOCK_COST })
        .eq("id", wallet.id);
      if (updErr) throw updErr;

      const jobLabel = jobs.find(j => j.id === selectedJobId)?.job_title || "Vacancy";
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        transaction_type: "debit",
        category: "email_template_unlock",
        amount: 0,
        points: TEMPLATE_UNLOCK_COST,
        description: `Email templates unlocked for "${jobLabel}"`,
      });

      setUnlockedJobs(prev => new Set(prev).add(selectedJobId));
      toast.success(`${TEMPLATE_UNLOCK_COST} pts deducted. Email templates unlocked!`);
    } catch (e: any) {
      console.error("Email template unlock error:", e);
      toast.error(e.message || "Failed to deduct points");
    } finally {
      setUnlocking(false);
    }
  };

  const isTemplatesUnlocked = selectedJobId ? unlockedJobs.has(selectedJobId) : false;

  useEffect(() => {
    initEditor();
  }, []);

  const initEditor = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Fetch employer jobs
    const { data: jobData } = await supabase
      .from("jobs")
      .select("id, job_title, interview_type, function_type")
      .eq("employer_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (jobData && jobData.length > 0) {
      setJobs(jobData as Job[]);
      const firstJob = jobData[0] as Job;
      setSelectedJobId(firstJob.id);
      loadPipelineForJob(firstJob, user.id);
    } else {
      setLoading(false);
    }
  };

  const loadPipelineForJob = async (job: Job, uid: string) => {
    setLoading(true);
    const stages = getStagesForJob(job);
    setPipelineStages(stages);

    if (stages.length > 0) {
      setActiveStage(stages[0].name);
    }

    // Fetch saved templates
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .eq("employer_id", uid);

    const templateMap: Record<string, EmailTemplate> = {};
    stages.forEach(stage => {
      const existing = data?.find(t => t.stage_name === stage.name);
      if (existing) {
        templateMap[stage.name] = existing as EmailTemplate;
      } else {
        const defaults = buildDefaultTemplate(stage.name);
        templateMap[stage.name] = {
          employer_id: uid,
          stage_name: stage.name,
          template_type: "stage_transition",
          subject: defaults.subject,
          header_text: defaults.header_text,
          body_text: defaults.body_text,
          footer_text: defaults.footer_text,
          primary_color: defaults.primary_color,
          is_active: true,
        };
      }
    });

    setTemplates(templateMap);
    setLoading(false);
  };

  const getStagesForJob = (job: Job) => {
    const interviewType = job.interview_type || "standard";
    const functionType = job.function_type || "general";

    const typeConfig = interviewPipelineConfig.find(c => c.value === interviewType);
    const pipelineType = typeConfig?.pipelineTypes.find(p => p.value === functionType)
      || typeConfig?.pipelineTypes[0];

    const stages = pipelineType?.stages || [];
    return stages.map(s => ({
      name: s.name,
      icon: STAGE_ICONS[s.name] || "📋",
      description: s.description,
    }));
  };

  const handleJobChange = (jobId: string) => {
    setSelectedJobId(jobId);
    const job = jobs.find(j => j.id === jobId);
    if (job) loadPipelineForJob(job, userId);
  };

  const updateTemplate = (stageName: string, field: keyof EmailTemplate, value: any) => {
    setTemplates(prev => ({
      ...prev,
      [stageName]: { ...prev[stageName], [field]: value },
    }));
  };

  const saveTemplate = async (stageName: string) => {
    setSaving(true);
    try {
      const template = templates[stageName];
      if (!userId) throw new Error("Not authenticated");

      if (template.id) {
        const { error } = await supabase
          .from("email_templates")
          .update({
            subject: template.subject,
            header_text: template.header_text,
            body_text: template.body_text,
            footer_text: template.footer_text,
            primary_color: template.primary_color,
            is_active: template.is_active,
          })
          .eq("id", template.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("email_templates")
          .insert({
            employer_id: userId,
            stage_name: template.stage_name,
            template_type: template.template_type,
            subject: template.subject,
            header_text: template.header_text,
            body_text: template.body_text,
            footer_text: template.footer_text,
            primary_color: template.primary_color,
            is_active: template.is_active,
          })
          .select()
          .single();
        if (error) throw error;
        setTemplates(prev => ({
          ...prev,
          [stageName]: { ...prev[stageName], id: data.id },
        }));
      }
      toast.success(`Template for "${stageName}" saved!`);
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = (stageName: string) => {
    const defaults = buildDefaultTemplate(stageName);
    setTemplates(prev => ({ ...prev, [stageName]: { ...prev[stageName], ...defaults } }));
    toast.info("Reset to default template");
  };

  const renderPreview = (template: EmailTemplate) => (
    <div className="rounded-lg overflow-hidden shadow-lg max-w-lg mx-auto text-sm border border-border">
      <div className="p-8 text-center" style={{ background: `linear-gradient(135deg, ${template.primary_color} 0%, ${template.primary_color}cc 100%)` }}>
        <h1 className="text-xl font-bold m-0" style={{ color: "#ffffff" }}>{template.header_text}</h1>
      </div>
      <div className="p-6 bg-background">
        <p className="mb-4 text-foreground">Dear <strong>John Doe</strong>,</p>
        <p className="mb-4 text-muted-foreground">
          {template.body_text
            .replace(/\{\{jobTitle\}\}/g, "Senior Teacher")
            .replace(/\{\{companyName\}\}/g, "ABC School")}
        </p>
        <div className="p-4 rounded-lg my-4" style={{ borderLeft: `4px solid ${template.primary_color}`, backgroundColor: `${template.primary_color}18` }}>
          <p className="m-0 font-semibold" style={{ color: template.primary_color }}>📊 Score: 87%</p>
          <p className="m-0 mt-1 text-muted-foreground">Excellent performance! Keep it up.</p>
        </div>
      </div>
      <div className="p-4 text-center text-muted-foreground text-xs bg-muted border-t border-border">
        <p className="whitespace-pre-line m-0">
          {template.footer_text.replace(/\{\{companyName\}\}/g, "ABC School")}
        </p>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading pipeline stages...</p>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold text-foreground">No Active Jobs Found</p>
          <p className="text-sm text-muted-foreground mt-1">Post a job to configure email templates for its interview pipeline.</p>
        </CardContent>
      </Card>
    );
  }

  const currentTemplate = templates[activeStage];
  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Templates
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Customize emails sent to candidates at each pipeline stage.
            Use <code className="bg-muted px-1 rounded">{"{{candidateName}}"}</code>,{" "}
            <code className="bg-muted px-1 rounded">{"{{jobTitle}}"}</code>,{" "}
            <code className="bg-muted px-1 rounded">{"{{companyName}}"}</code> as placeholders.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Label className="shrink-0 font-medium">Job / Pipeline:</Label>
            <Select value={selectedJobId} onValueChange={handleJobChange}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Select a job" />
              </SelectTrigger>
              <SelectContent>
                {jobs.map(job => (
                  <SelectItem key={job.id} value={job.id}>
                    {job.job_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedJob && (
              <Badge variant="secondary" className="text-xs">
                {interviewPipelineConfig.find(c => c.value === selectedJob.interview_type)?.label || selectedJob.interview_type || "Standard"} — {pipelineStages.length} stages
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Paywall — shown until employer unlocks templates for this vacancy */}
      {!isTemplatesUnlocked && (
        <Card className="border-dashed border-primary/40 bg-primary/5">
          <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10 shrink-0">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-foreground">
                Unlock Email Templates for this Vacancy
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Spend <span className="font-semibold text-primary">{TEMPLATE_UNLOCK_COST} pts</span> to customize and use email templates for{" "}
                <span className="font-medium text-foreground">{selectedJob?.job_title || "this job"}</span>.
                One-time deduction per vacancy.
              </p>
            </div>
            <Button
              onClick={handleUnlockTemplates}
              disabled={!selectedJobId || unlocking}
              size="lg"
              className="shrink-0"
            >
              <Lock className="h-4 w-4 mr-2" />
              {unlocking ? "Processing..." : `Unlock (${TEMPLATE_UNLOCK_COST} pts)`}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Stage Sidebar + Editor */}
      {isTemplatesUnlocked && (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Stages List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pipeline Stages</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
            <div className="space-y-1">
              {pipelineStages.map((stage, idx) => {
                const isActive = activeStage === stage.name;
                const isSaved = !!templates[stage.name]?.id;
                return (
                  <button
                    key={stage.name}
                    onClick={() => setActiveStage(stage.name)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left transition-all text-sm ${
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="text-base">{stage.icon}</span>
                    <span className="flex-1 truncate">{stage.name}</span>
                    {isSaved && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" title="Saved" />}
                    {isActive && <ChevronRight className="h-3 w-3 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Template Editor */}
        <Card className="lg:col-span-3">
          {currentTemplate ? (
            <>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{pipelineStages.find(s => s.name === activeStage)?.icon}</span>
                    <div>
                      <CardTitle className="text-base">{activeStage}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {pipelineStages.find(s => s.name === activeStage)?.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={currentTemplate.is_active}
                        onCheckedChange={(v) => updateTemplate(activeStage, "is_active", v)}
                      />
                      <span className="text-sm text-muted-foreground">Active</span>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => resetToDefault(activeStage)}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      Reset
                    </Button>
                    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Email Preview — {activeStage}</DialogTitle>
                        </DialogHeader>
                        {renderPreview(currentTemplate)}
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Subject */}
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    value={currentTemplate.subject}
                    onChange={(e) => updateTemplate(activeStage, "subject", e.target.value)}
                    placeholder="Email subject line..."
                  />
                </div>

                {/* Header + Color */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="header">Header Text</Label>
                    <Input
                      id="header"
                      value={currentTemplate.header_text}
                      onChange={(e) => updateTemplate(activeStage, "header_text", e.target.value)}
                      placeholder="Header shown in the email banner..."
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="color" className="flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5" />
                      Brand Color
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="color"
                        type="color"
                        value={currentTemplate.primary_color}
                        onChange={(e) => updateTemplate(activeStage, "primary_color", e.target.value)}
                        className="w-12 h-9 p-1 cursor-pointer"
                      />
                      <Input
                        value={currentTemplate.primary_color}
                        onChange={(e) => updateTemplate(activeStage, "primary_color", e.target.value)}
                        placeholder="#10b981"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="space-y-1.5">
                  <Label htmlFor="body">Email Body</Label>
                  <Textarea
                    id="body"
                    value={currentTemplate.body_text}
                    onChange={(e) => updateTemplate(activeStage, "body_text", e.target.value)}
                    placeholder="Main email content sent to the candidate..."
                    rows={5}
                  />
                </div>

                {/* Footer */}
                <div className="space-y-1.5">
                  <Label htmlFor="footer">Footer / Signature</Label>
                  <Textarea
                    id="footer"
                    value={currentTemplate.footer_text}
                    onChange={(e) => updateTemplate(activeStage, "footer_text", e.target.value)}
                    placeholder="Footer or sign-off text..."
                    rows={2}
                  />
                </div>

                {/* Info box */}
                <div className="flex items-start gap-2 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    This template will be used when a candidate reaches the <strong>{activeStage}</strong> stage.
                    Placeholders like <code>{"{{candidateName}}"}</code> are replaced automatically when the email is sent.
                  </span>
                </div>

                <Button onClick={() => saveTemplate(activeStage)} disabled={saving} className="w-full">
                  {saving ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Saving...</>
                  ) : (
                    <><Save className="h-4 w-4 mr-2" />Save Template</>
                  )}
                </Button>
              </CardContent>
            </>
          ) : (
            <CardContent className="p-8 text-center text-muted-foreground">
              Select a stage from the left to edit its email template.
            </CardContent>
          )}
        </Card>
      </div>
      )}
    </div>
  );
}
