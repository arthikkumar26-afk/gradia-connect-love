import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Mail, Phone, MapPin, Briefcase, GraduationCap, User, Eye, Download, Home,
  Sparkles, Send, Trash2, Save, Wand2, Loader2, Target, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  candidateId: string | null;
  resumeUrl?: string | null;
}

interface MailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export const HRCandidateProfileDialog = ({ open, onClose, candidateId, resumeUrl }: Props) => {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [education, setEducation] = useState<any[]>([]);
  const [experience, setExperience] = useState<any[]>([]);
  const [address, setAddress] = useState<any>(null);

  // Mail templates state
  const [templates, setTemplates] = useState<MailTemplate[]>([]);
  const [selectedTplId, setSelectedTplId] = useState<string>("");
  const [tplName, setTplName] = useState("");
  const [tplSubject, setTplSubject] = useState("");
  const [tplBody, setTplBody] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<{ state: "idle" | "sending" | "sent" | "failed"; message?: string; to?: string; at?: string }>({ state: "idle" });

  useEffect(() => {
    if (!open || !candidateId) return;
    const load = async () => {
      setLoading(true);
      const [{ data: p }, { data: edu }, { data: exp }, { data: addr }, { data: tpls }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", candidateId).maybeSingle(),
        supabase.from("educational_qualifications").select("*").eq("user_id", candidateId).order("display_order"),
        supabase.from("work_experience").select("*").eq("user_id", candidateId).order("display_order"),
        supabase.from("address_details").select("*").eq("user_id", candidateId).maybeSingle(),
        supabase.from("hr_mail_templates").select("*").order("created_at", { ascending: false }),
      ]);
      setProfile(p);
      setEducation(edu || []);
      setExperience(exp || []);
      setAddress(addr);
      setTemplates((tpls as MailTemplate[]) || []);
      setLoading(false);
    };
    load();
  }, [open, candidateId]);

  const reloadTemplates = async () => {
    const { data } = await supabase.from("hr_mail_templates").select("*").order("created_at", { ascending: false });
    setTemplates((data as MailTemplate[]) || []);
  };

  const handleSelectTemplate = (id: string) => {
    setSelectedTplId(id);
    const t = templates.find(x => x.id === id);
    if (t) { setTplName(t.name); setTplSubject(t.subject); setTplBody(t.body); }
  };

  const handleNewTemplate = () => {
    setSelectedTplId("");
    setTplName(""); setTplSubject(""); setTplBody(""); setAiPrompt("");
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) { toast.error("Describe the email you want"); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-hr-mail-template", {
        body: { prompt: aiPrompt, name: tplName },
      });
      if (error) throw error;
      setTplSubject(data.subject || "");
      setTplBody(data.body || "");
      toast.success("Template generated");
    } catch (e: any) {
      toast.error(e.message || "AI generation failed");
    } finally { setAiLoading(false); }
  };

  const handleSaveTemplate = async () => {
    if (!tplName.trim() || !tplSubject.trim() || !tplBody.trim()) {
      toast.error("Name, subject and body are required"); return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      if (selectedTplId) {
        const { error } = await supabase.from("hr_mail_templates")
          .update({ name: tplName, subject: tplSubject, body: tplBody })
          .eq("id", selectedTplId);
        if (error) throw error;
        toast.success("Template updated");
      } else {
        const { data, error } = await supabase.from("hr_mail_templates")
          .insert({ name: tplName, subject: tplSubject, body: tplBody, created_by: user.id })
          .select().single();
        if (error) throw error;
        setSelectedTplId(data.id);
        toast.success("Template saved");
      }
      await reloadTemplates();
    } catch (e: any) { toast.error(e.message || "Save failed"); }
    finally { setSaving(false); }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTplId) return;
    if (!confirm("Delete this template?")) return;
    const { error } = await supabase.from("hr_mail_templates").delete().eq("id", selectedTplId);
    if (error) { toast.error(error.message); return; }
    toast.success("Template deleted");
    handleNewTemplate();
    await reloadTemplates();
  };

  const handleSendEmail = async () => {
    if (!candidateId) return;
    if (!tplSubject.trim() || !tplBody.trim()) { toast.error("Subject and body required"); return; }
    setSending(true);
    setSendStatus({ state: "sending" });
    try {
      const { data, error } = await supabase.functions.invoke("send-hr-custom-email", {
        body: { candidateId, subject: tplSubject, body: tplBody },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const to = (data as any)?.to || profile?.email || "candidate";
      toast.success(`Email sent to ${to}`);
      setSendStatus({ state: "sent", to, at: new Date().toLocaleString() });
    } catch (e: any) {
      toast.error(e.message || "Send failed");
      setSendStatus({ state: "failed", message: e.message || "Send failed" });
    }
    finally { setSending(false); }
  };

  const Section = ({ icon: Icon, title, children }: any) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-1">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </div>
      <div className="pl-1">{children}</div>
    </div>
  );

  const Field = ({ label, value }: { label: string; value: any }) => {
    if (value === null || value === undefined || value === "") return null;
    return (
      <div className="grid grid-cols-3 gap-2 text-sm py-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="col-span-2 text-foreground">{String(value)}</span>
      </div>
    );
  };

  if (!open) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="text-right">
          <h2 className="text-xl font-semibold">{profile?.full_name || "Candidate Profile"}</h2>
          <p className="text-xs text-muted-foreground">Complete profile details and mail templates.</p>
        </div>
      </div>
      <div className="w-full">


        {loading ? (
          <div className="space-y-3 py-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : !profile ? (
          <p className="text-center text-muted-foreground py-8">Profile not found.</p>
        ) : (
          <div className="space-y-5 py-2">
            <div className="flex items-start justify-between flex-wrap gap-3 p-3 rounded-lg bg-muted/40 border border-border">
              <div className="flex items-center gap-3">
                {profile.profile_picture ? (
                  <img src={profile.profile_picture} alt={profile.full_name} className="h-14 w-14 rounded-full object-cover border" />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-foreground">{profile.full_name}</h3>
                  {profile.preferred_role && <p className="text-sm text-muted-foreground">{profile.preferred_role}</p>}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.experience_level && <Badge variant="secondary" className="text-xs">{profile.experience_level}</Badge>}
                    {profile.gender && <Badge variant="outline" className="text-xs">{profile.gender}</Badge>}
                  </div>
                </div>
              </div>
              {(resumeUrl || profile.resume_url) && (
                <div className="flex flex-col gap-2">
                  <Button size="sm" asChild>
                    <a href={resumeUrl || profile.resume_url} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-3.5 w-3.5 mr-1" /> View CV
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={resumeUrl || profile.resume_url} download>
                      <Download className="h-3.5 w-3.5 mr-1" /> Download
                    </a>
                  </Button>
                </div>
              )}
            </div>

            <Section icon={Mail} title="Contact">
              <Field label="Email" value={profile.email} />
              <Field label="Mobile" value={profile.mobile} />
              <Field label="Alternate" value={profile.alternate_number} />
              <Field label="LinkedIn" value={profile.linkedin} />
              <Field label="Website" value={profile.website} />
            </Section>

            <Section icon={User} title="Personal">
              <Field label="Date of Birth" value={profile.date_of_birth} />
              <Field label="Languages" value={Array.isArray(profile.languages) ? profile.languages.join(", ") : profile.languages} />
              <Field label="Highest Qualification" value={profile.highest_qualification} />
              <Field label="Category" value={profile.category} />
            </Section>

            <Section icon={MapPin} title="Location">
              <Field label="Current" value={profile.location} />
              <Field label="Current State" value={profile.current_state} />
              <Field label="Current District" value={profile.current_district} />
              <Field label="Preferred State" value={profile.preferred_state} />
              <Field label="Preferred District" value={profile.preferred_district} />
            </Section>

            <Section icon={Briefcase} title="Job Preferences">
              <Field label="Preferred Role" value={profile.preferred_role} />
              <Field label="Office Type" value={profile.office_type} />
              <Field label="Segment" value={profile.segment} />
              <Field label="Program" value={profile.program} />
              <Field label="Classes Handled" value={profile.classes_handled} />
              <Field label="Primary Subject" value={profile.primary_subject} />
              <Field label="Current Salary" value={profile.current_salary} />
              <Field label="Expected Salary" value={profile.expected_salary} />
              <Field label="Available From" value={profile.available_from} />
            </Section>

            <Section icon={GraduationCap} title={`Education (${education.length})`}>
              {education.length === 0 ? <p className="text-sm text-muted-foreground">No education records.</p> : (
                <div className="space-y-2">
                  {education.map((e) => (
                    <div key={e.id} className="p-2 rounded border border-border bg-card">
                      <div className="font-medium text-sm">{e.education_level}</div>
                      <div className="text-xs text-muted-foreground">{[e.school_college_name, e.specialization, e.board_university].filter(Boolean).join(" • ")}</div>
                      <div className="text-xs text-muted-foreground">{e.year_of_passing && `Year: ${e.year_of_passing}`}{e.percentage_marks ? ` • ${e.percentage_marks}%` : ""}</div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section icon={Briefcase} title={`Work Experience (${experience.length})`}>
              {experience.length === 0 ? <p className="text-sm text-muted-foreground">No experience records.</p> : (
                <div className="space-y-2">
                  {experience.map((w) => (
                    <div key={w.id} className="p-2 rounded border border-border bg-card">
                      <div className="font-medium text-sm">{w.designation || "—"} {w.organization && `@ ${w.organization}`}</div>
                      <div className="text-xs text-muted-foreground">{[w.department, w.place].filter(Boolean).join(" • ")}</div>
                      <div className="text-xs text-muted-foreground">{w.from_date || "?"} → {w.to_date || "Present"}{w.salary_per_month ? ` • ₹${w.salary_per_month}/mo` : ""}</div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {address && (
              <Section icon={Home} title="Address Details">
                <div className="text-sm">
                  <div className="font-medium mb-1">Present Address</div>
                  <div className="text-muted-foreground">
                    {[address.present_door_flat_no, address.present_street, address.present_village_area, address.present_mandal, address.present_district, address.present_state, address.present_pin_code].filter(Boolean).join(", ") || "—"}
                  </div>
                  <div className="font-medium mt-2 mb-1">Permanent Address</div>
                  <div className="text-muted-foreground">
                    {address.same_as_present ? "Same as present" : [address.permanent_door_flat_no, address.permanent_street, address.permanent_village_area, address.permanent_mandal, address.permanent_district, address.permanent_state, address.permanent_pin_code].filter(Boolean).join(", ") || "—"}
                  </div>
                </div>
              </Section>
            )}

            {/* Mail Templates Section */}
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Mail Templates — AI Maker & Send
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <select
                    value={selectedTplId}
                    onChange={(e) => e.target.value ? handleSelectTemplate(e.target.value) : handleNewTemplate()}
                    className="border border-border rounded-md px-2 py-1.5 text-sm bg-background flex-1 min-w-[180px]"
                  >
                    <option value="">— New template —</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <Button size="sm" variant="outline" onClick={handleNewTemplate}>New</Button>
                </div>

                <div className="space-y-2 p-3 border border-dashed border-primary/30 rounded-md bg-primary/5">
                  <p className="text-xs font-medium text-foreground">Ask AI to draft an email</p>
                  <Textarea
                    rows={2}
                    placeholder="e.g. Write an interview shortlist email inviting the candidate for round 2 next Monday at 10 AM."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                  />
                  <Button size="sm" onClick={handleAIGenerate} disabled={aiLoading}>
                    {aiLoading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 mr-1" />}
                    Generate with AI
                  </Button>
                </div>

                <Input placeholder="Template name" value={tplName} onChange={(e) => setTplName(e.target.value)} />
                <Input placeholder="Subject (supports {{candidate_name}}, {{job_title}}…)" value={tplSubject} onChange={(e) => setTplSubject(e.target.value)} />
                <Textarea rows={8} placeholder="Email body…" value={tplBody} onChange={(e) => setTplBody(e.target.value)} />

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={handleSaveTemplate} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                    {selectedTplId ? "Update" : "Save"} Template
                  </Button>
                  {selectedTplId && (
                    <Button size="sm" variant="outline" onClick={handleDeleteTemplate}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                  )}
                  <Button size="sm" onClick={handleSendEmail} disabled={sending || !profile?.email} className="ml-auto">
                    {sending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                    Send to {profile?.email || "candidate"}
                  </Button>
                </div>

                {sendStatus.state !== "idle" && (
                  <div
                    className={
                      "text-xs rounded-md border px-3 py-2 flex items-center gap-2 " +
                      (sendStatus.state === "sent"
                        ? "bg-green-500/10 border-green-500/40 text-green-700 dark:text-green-400"
                        : sendStatus.state === "failed"
                        ? "bg-destructive/10 border-destructive/40 text-destructive"
                        : "bg-muted/40 border-border text-muted-foreground")
                    }
                  >
                    {sendStatus.state === "sending" && (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending email…</>)}
                    {sendStatus.state === "sent" && (<><Send className="h-3.5 w-3.5" /> Delivered to <strong>{sendStatus.to}</strong> · {sendStatus.at}</>)}
                    {sendStatus.state === "failed" && (<>✗ Failed: {sendStatus.message}</>)}
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Placeholders supported: <code>{"{{candidate_name}}"}</code>, <code>{"{{job_title}}"}</code>, <code>{"{{company_name}}"}</code>, <code>{"{{hr_name}}"}</code>, <code>{"{{date}}"}</code>, <code>{"{{time}}"}</code>.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default HRCandidateProfileDialog;
