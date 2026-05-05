import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Upload, FileUp, Loader2, Sparkles, Send, Eye, FileEdit, Save, FileText, UserPlus, Mail,
  History, RefreshCw, CheckCircle2, XCircle, Clock,
} from "lucide-react";

interface InviteHistoryRow {
  id: string;
  candidate_name: string | null;
  recipient_email: string;
  subject: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

interface ParsedResume {
  full_name?: string | null;
  email?: string | null;
  mobile?: string | null;
  location?: string | null;
  skills?: string[] | null;
  experience_level?: string | null;
  preferred_role?: string | null;
  experience?: Array<{ designation?: string; organization?: string }>;
}

const DEFAULT_SUBJECT = "Opportunity Update – Your Profile Review";

const DEFAULT_CV_OPENINGS: { title: string; salary: string }[] = [
  { title: "Principal – State Board (Hyderabad)", salary: "₹60,000 – ₹90,000 / month" },
  { title: "Principal – CBSE Board", salary: "₹70,000 – ₹1,10,000 / month" },
  { title: "SME (Subject Matter Expert)", salary: "₹35,000 – ₹60,000 / month" },
];

const buildSuggestedRoles = (p: ParsedResume | null): string[] => {
  if (!p) return [];
  const roles = new Set<string>();
  if (p.preferred_role) roles.add(p.preferred_role);
  (p.experience || []).forEach((e) => e.designation && roles.add(e.designation));
  (p.skills || []).forEach((s) => roles.add(`${s} Specialist`));
  return Array.from(roles);
};

const buildApplyUrl = (baseUrl: string, title: string) => {
  const fallback = "https://gradiaa.com/jobs-results";
  let base = baseUrl && /^https?:\/\//i.test(baseUrl) ? baseUrl : fallback;
  base = base.split("#")[0].split("?")[0];
  base = base.replace(/\/jobs\/?$/i, "/jobs-results");
  let cleanTitle = (title || "").trim();
  if (!cleanTitle) return base;
  cleanTitle = cleanTitle.replace(/[\(\[\{][^\)\]\}]*[\)\]\}]/g, " ");
  cleanTitle = cleanTitle.split(/\s+[–—-]\s+/)[0].replace(/\s+/g, " ").trim();
  if (!cleanTitle) return base;
  return `${base}?q=${encodeURIComponent(cleanTitle)}`;
};

const renderJobRow = (title: string, salary: string, applyUrl: string) => {
  const safeUrl = buildApplyUrl(applyUrl, title);
  const salaryText = salary || "Negotiable";
  return `
    <tr>
      <td style="border:1px solid #e5e7eb;padding:12px 14px;font-size:14px;">${title}</td>
      <td style="border:1px solid #e5e7eb;padding:12px 14px;font-size:13px;color:#047857;font-weight:600;white-space:nowrap;">${salaryText}</td>
      <td style="border:1px solid #e5e7eb;padding:12px 14px;text-align:center;white-space:nowrap;">
        <a href="${safeUrl}" style="background:#1e3a8a;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:6px;display:inline-block;">Apply Now</a>
      </td>
    </tr>`;
};

const buildEmailHtml = (opts: {
  candidateName: string;
  jobRoles: string[];
  jobSalaries: string[];
  cvOpenings: { title: string; salary: string }[];
  applyUrl: string;
  hrName: string;
  companyName: string;
  contactInfo: string;
  showTerms: boolean;
}) => {
  const { candidateName, jobRoles, jobSalaries, cvOpenings, applyUrl, hrName, companyName, contactInfo, showTerms } = opts;
  const cvRows = cvOpenings.filter(o => o.title.trim()).slice(0, 3).map(o => renderJobRow(o.title, o.salary, applyUrl)).join("");
  const filledRoles = jobRoles.map(r => (r || "").trim()).filter(Boolean).slice(0, 3);
  const rolesForRender = filledRoles.length ? filledRoles : ["Suitable Role 1", "Suitable Role 2", "Suitable Role 3"];
  const roleRows = rolesForRender.map((t, i) => renderJobRow(t, jobSalaries[i] || "", applyUrl)).join("");
  const termsBlock = showTerms ? `
    <h3 style="color:#1e3a8a;margin-top:24px;">📜 Terms &amp; Conditions</h3>
    <ul style="font-size:13px;line-height:1.7;color:#4b5563;margin:0 0 0 18px;">
      <li>Submission of your resume/CV does not guarantee job placement.</li>
      <li>Interview scheduling is subject to employer availability.</li>
      <li>Information in your resume must be accurate and truthful.</li>
      <li>We may share your profile with potential employers.</li>
    </ul>` : "";
  return `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#111827;background:#fff;">
  <h2 style="color:#1e3a8a;margin:0 0 14px;font-size:18px;">Dear ${candidateName},</h2>
  <p style="font-size:13px;line-height:1.6;">Greetings from ${companyName},</p>
  <p style="font-size:13px;line-height:1.6;">Thank you for sharing your resume with us through Gradia. Our team has reviewed your profile, and based on your qualifications &amp; experience, we'd like to share suitable openings.</p>
  <h3 style="color:#1e3a8a;margin-top:24px;">Based on your CV, suitable openings:</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
    <thead><tr style="background:#f3f4f6;">
      <th style="border:1px solid #e5e7eb;padding:10px;text-align:left;">Vacancy</th>
      <th style="border:1px solid #e5e7eb;padding:10px;text-align:left;">Salary</th>
      <th style="border:1px solid #e5e7eb;padding:10px;text-align:center;">Action</th>
    </tr></thead><tbody>${cvRows}</tbody>
  </table>
  <h3 style="color:#1e3a8a;margin-top:24px;">Suitable Jobs according to your qualifications:</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
    <thead><tr style="background:#f3f4f6;">
      <th style="border:1px solid #e5e7eb;padding:10px;text-align:left;">Vacancy</th>
      <th style="border:1px solid #e5e7eb;padding:10px;text-align:left;">Salary</th>
      <th style="border:1px solid #e5e7eb;padding:10px;text-align:center;">Action</th>
    </tr></thead><tbody>${roleRows}</tbody>
  </table>
  ${termsBlock}
  <div style="text-align:center;margin:28px 0 20px;">
    <a href="https://gradiaa.com/candidate/signup" style="display:inline-block;background:#1e3a8a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;">🚀 Get Started on Gradia</a>
  </div>
  <p style="font-size:14px;margin-top:16px;">Best regards,<br/><strong>${hrName}</strong><br/>${companyName}<br/>${contactInfo}</p>
</div>`;
};

type BulkRow = {
  id: string;
  fileName: string;
  name: string;
  email: string;
  status: "pending" | "parsing" | "ready" | "sending" | "sent" | "failed";
  error?: string;
  parsed?: ParsedResume | null;
  suggestedRoles?: string[];
};

interface Props {
  hrName: string;
  companyName: string;
  hrEmail: string;
}

const HRInviteCandidate = ({ hrName, companyName, hrEmail }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkFileRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState("upload");

  const [parsing, setParsing] = useState(false);
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [sending, setSending] = useState(false);

  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);

  // Single
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");

  // Email content
  const [jobRoles, setJobRoles] = useState<string[]>(["", "", ""]);
  const [jobSalaries, setJobSalaries] = useState<string[]>(["", "", ""]);
  const [cvOpenings, setCvOpenings] = useState(DEFAULT_CV_OPENINGS);
  const [applyUrl, setApplyUrl] = useState("https://gradiaa.com/jobs-results");
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [adminName, setAdminName] = useState(hrName || "Hiring Team");
  const [companyNameInput, setCompanyNameInput] = useState(companyName || "Gradia");
  const [contactInfo, setContactInfo] = useState(hrEmail || "info@gradiaa.com");
  const [showTerms, setShowTerms] = useState(true);
  const [editedHtml, setEditedHtml] = useState<string | null>(null);

  const [history, setHistory] = useState<InviteHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let q = supabase
        .from("resume_invites")
        .select("id, candidate_name, recipient_email, subject, status, error_message, sent_at, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (user?.id) q = q.eq("sender_user_id", user.id);
      const { data, error } = await q;
      if (error) throw error;
      setHistory((data || []) as InviteHistoryRow[]);
    } catch (err: any) {
      console.error("history fetch", err);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const updateRow = (id: string, patch: Partial<BulkRow>) =>
    setBulkRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const handleSingleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setParsing(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data, error } = await supabase.functions.invoke("parse-resume", { body: fd });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const p = data as ParsedResume;
      if (p.full_name) setCandidateName(p.full_name);
      if (p.email) setCandidateEmail(p.email);
      const suggested = buildSuggestedRoles(p);
      if (suggested.length) setJobRoles(prev => prev.map((r, i) => suggested[i] || r));
      toast.success("Resume parsed by AI");
    } catch (err: any) {
      toast.error(err.message || "Failed to parse");
    } finally { setParsing(false); if (e.target) e.target.value = ""; }
  };

  const handleBulkFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []); if (!files.length) return;
    setBulkParsing(true);
    const initial: BulkRow[] = files.map(f => ({
      id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 8)}`,
      fileName: f.name, name: "", email: "", status: "parsing",
    }));
    setBulkRows(prev => [...prev, ...initial]);
    for (let i = 0; i < files.length; i++) {
      const file = files[i]; const rowId = initial[i].id;
      try {
        const fd = new FormData(); fd.append("file", file);
        const { data, error } = await supabase.functions.invoke("parse-resume", { body: fd });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const name = data?.full_name || ""; const email = data?.email || "";
        updateRow(rowId, {
          name, email, parsed: data as ParsedResume,
          suggestedRoles: buildSuggestedRoles(data as ParsedResume),
          status: email ? "ready" : "failed",
          error: email ? undefined : "No email found — enter manually",
        });
      } catch (err: any) {
        updateRow(rowId, { status: "pending", error: `${err?.message || "Parse failed"}. Enter name & email manually.` });
      }
    }
    setBulkParsing(false); if (e.target) e.target.value = "";
    toast.success(`Analyzed ${files.length} resume(s)`);
  };

  const generatedHtml = useMemo(() => buildEmailHtml({
    candidateName: candidateName || "Candidate",
    jobRoles, jobSalaries, cvOpenings, applyUrl,
    hrName: adminName, companyName: companyNameInput, contactInfo, showTerms,
  }), [candidateName, jobRoles, jobSalaries, cvOpenings, applyUrl, adminName, companyNameInput, contactInfo, showTerms]);

  const finalHtml = editedHtml ?? generatedHtml;

  const sendOne = async (to: string, name: string, html: string) => {
    const { data, error } = await supabase.functions.invoke("send-resume-invite-email", {
      body: { to: to.trim(), subject: subject.trim(), html, fromName: companyNameInput, candidateName: name || null },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
  };

  const handleSendSingle = async () => {
    if (!candidateEmail.includes("@")) { toast.error("Enter a valid email"); return; }
    if (!subject.trim()) { toast.error("Subject required"); return; }
    setSending(true);
    try {
      await sendOne(candidateEmail, candidateName, finalHtml);
      toast.success(`Email sent to ${candidateEmail}`);
    } catch (err: any) { toast.error(err.message || "Send failed"); }
    finally { setSending(false); }
  };

  const sendBulk = async () => {
    const recipients = bulkRows.filter(r => r.email.includes("@") && r.status !== "sent");
    if (!recipients.length) { toast.error("No valid recipients"); return; }
    if (!subject.trim()) { toast.error("Subject required"); return; }
    setBulkSending(true);
    let ok = 0, fail = 0;
    for (const row of recipients) {
      updateRow(row.id, { status: "sending" });
      try {
        const merged = (row.suggestedRoles && row.suggestedRoles.length)
          ? jobRoles.map((r, i) => row.suggestedRoles![i] || r) : jobRoles;
        const html = buildEmailHtml({
          candidateName: row.name || "Candidate",
          jobRoles: merged, jobSalaries, cvOpenings, applyUrl,
          hrName: adminName, companyName: companyNameInput, contactInfo, showTerms,
        });
        await sendOne(row.email, row.name, html);
        updateRow(row.id, { status: "sent" }); ok++;
        await new Promise(r => setTimeout(r, 250));
      } catch (err: any) {
        updateRow(row.id, { status: "failed", error: err.message || "Send failed" }); fail++;
      }
    }
    setBulkSending(false);
    toast.success(`Bulk send done: ${ok} sent · ${fail} failed`);
  };

  const pendingCount = bulkRows.filter(r => r.email.includes("@") && r.status !== "sent").length;
  const sentCount = bulkRows.filter(r => r.status === "sent").length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" /> Invite a Candidate
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Upload bulk resumes/CVs — AI extracts name &amp; email — preview the Gradia-branded invitation — send directly to candidates.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full max-w-xl mb-4">
              <TabsTrigger value="upload"><FileUp className="h-3.5 w-3.5 mr-1" />Upload &amp; Analyze</TabsTrigger>
              <TabsTrigger value="preview"><Eye className="h-3.5 w-3.5 mr-1" />Preview</TabsTrigger>
              <TabsTrigger value="send"><Send className="h-3.5 w-3.5 mr-1" />Send</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Upload className="h-4 w-4" />Single Resume</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div onClick={() => fileRef.current?.click()}
                      className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-muted/50">
                      <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Click to upload PDF / DOCX / Image</p>
                      <p className="text-xs text-muted-foreground">AI extracts name, email, role</p>
                    </div>
                    <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg" onChange={handleSingleFile} className="hidden" />
                    {parsing && <div className="text-xs flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Analyzing…</div>}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="Candidate name" className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Email</Label>
                        <Input value={candidateEmail} onChange={e => setCandidateEmail(e.target.value)} placeholder="email@example.com" className="h-8 text-xs" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4" />Bulk Upload (AI Analyze)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div onClick={() => bulkFileRef.current?.click()}
                      className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:bg-muted/50">
                      <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Select multiple resumes/CVs</p>
                      <p className="text-xs text-muted-foreground">PDF / DOCX / Image — AI auto-extracts each</p>
                    </div>
                    <input ref={bulkFileRef} type="file" multiple accept=".pdf,.docx,.doc,.png,.jpg,.jpeg" onChange={handleBulkFiles} className="hidden" />
                    {bulkParsing && <div className="text-xs flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />AI analyzing resumes…</div>}
                    {bulkRows.length > 0 && (
                      <>
                        <div className="text-xs text-muted-foreground">
                          {bulkRows.length} files · {bulkRows.filter(r => r.status === "ready").length} ready · {sentCount} sent · {bulkRows.filter(r => r.status === "failed").length} failed
                        </div>
                        <div className="border rounded-md max-h-56 overflow-auto divide-y">
                          {bulkRows.map(r => (
                            <div key={r.id} className="px-2 py-1.5 text-xs space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium truncate flex-1">{r.fileName}</span>
                                <Badge variant={r.status === "sent" ? "default" : r.status === "failed" ? "destructive" : r.status === "ready" ? "secondary" : "outline"} className="text-[10px]">{r.status}</Badge>
                                <button onClick={() => setBulkRows(p => p.filter(x => x.id !== r.id))} className="text-muted-foreground hover:text-destructive">×</button>
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                <Input value={r.name} onChange={e => updateRow(r.id, { name: e.target.value })} placeholder="Name" className="h-6 text-xs" />
                                <Input value={r.email} onChange={e => updateRow(r.id, {
                                  email: e.target.value,
                                  status: e.target.value.includes("@") && (r.status === "failed" || r.status === "pending") ? "ready" : r.status,
                                })} placeholder="email@example.com" className="h-6 text-xs" />
                              </div>
                              {r.error && <p className="text-[10px] text-amber-600">{r.error}</p>}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Email Content (editable)</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs">Apply Now Link</Label>
                    <Input value={applyUrl} onChange={e => setApplyUrl(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Suggested Roles &amp; Salaries</Label>
                    {jobRoles.map((r, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 mt-1">
                        <Input className="col-span-8 h-8 text-xs" value={r} onChange={e => setJobRoles(p => p.map((x, idx) => idx === i ? e.target.value : x))} placeholder={`Role ${i+1}`} />
                        <Input className="col-span-4 h-8 text-xs" value={jobSalaries[i] || ""} onChange={e => setJobSalaries(p => p.map((x, idx) => idx === i ? e.target.value : x))} placeholder="Salary" />
                      </div>
                    ))}
                  </div>
                  <div>
                    <Label className="text-xs">CV-Based Openings</Label>
                    {cvOpenings.map((o, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 mt-1">
                        <Input className="col-span-8 h-8 text-xs" value={o.title} onChange={e => setCvOpenings(p => p.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))} />
                        <Input className="col-span-4 h-8 text-xs" value={o.salary} onChange={e => setCvOpenings(p => p.map((x, idx) => idx === i ? { ...x, salary: e.target.value } : x))} />
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" onClick={() => setActiveTab("preview")}>Continue to Preview <Eye className="h-3.5 w-3.5 ml-1" /></Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-1">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileEdit className="h-4 w-4" />Settings</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    <div><Label className="text-xs">Subject</Label><Input value={subject} onChange={e => setSubject(e.target.value)} className="h-8 text-xs" /></div>
                    <div><Label className="text-xs">From / HR Name</Label><Input value={adminName} onChange={e => setAdminName(e.target.value)} className="h-8 text-xs" /></div>
                    <div><Label className="text-xs">Company</Label><Input value={companyNameInput} onChange={e => setCompanyNameInput(e.target.value)} className="h-8 text-xs" /></div>
                    <div><Label className="text-xs">Contact Info</Label><Input value={contactInfo} onChange={e => setContactInfo(e.target.value)} className="h-8 text-xs" /></div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <Label className="text-xs">Show Terms</Label>
                      <Switch checked={showTerms} onCheckedChange={setShowTerms} />
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => setEditedHtml(null)}>Reset Auto-Generated</Button>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4" />Gradia Invitation Preview</CardTitle>
                    <Badge variant={editedHtml ? "default" : "secondary"} className="text-[10px]">{editedHtml ? "Edited" : "Auto"}</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded bg-white max-h-[480px] overflow-auto" dangerouslySetInnerHTML={{ __html: finalHtml }} />
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">HTML Editor (advanced)</CardTitle></CardHeader>
                <CardContent>
                  <Textarea value={finalHtml} onChange={e => setEditedHtml(e.target.value)} className="font-mono text-xs min-h-[200px]" />
                  <div className="flex justify-end mt-2">
                    <Button size="sm" onClick={() => setActiveTab("send")}>Continue to Send <Send className="h-3.5 w-3.5 ml-1" /></Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="send" className="space-y-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />Review &amp; Send</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">Subject</span><span className="font-medium">{subject}</span></div>
                    <div className="flex justify-between border-b pb-1"><span className="text-muted-foreground">From</span><span className="font-medium">{adminName} · {companyNameInput}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Recipients</span><span className="font-medium">{pendingCount} pending · {sentCount} sent</span></div>
                  </div>

                  {bulkRows.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                      <div className="border rounded-md max-h-[28rem] overflow-auto divide-y">
                        <div className="px-2 py-1.5 bg-muted/50 text-[11px] font-semibold sticky top-0 border-b">Resumes ({bulkRows.length})</div>
                        {bulkRows.map(r => {
                          const sel = selectedPreviewId === r.id;
                          return (
                            <div key={r.id} className={`text-xs px-2 py-1.5 flex items-center justify-between gap-2 ${sel ? "bg-primary/10" : "hover:bg-muted/50"}`}>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{r.name || r.fileName}</p>
                                <p className="text-muted-foreground truncate">{r.email || "no email"}</p>
                              </div>
                              <Badge variant={r.status === "sent" ? "default" : r.status === "failed" ? "destructive" : r.status === "ready" ? "secondary" : "outline"} className="text-[10px]">{r.status}</Badge>
                              <Button size="sm" variant={sel ? "default" : "outline"} className="h-6 text-[11px]" onClick={() => setSelectedPreviewId(sel ? null : r.id)}>
                                <Eye className="h-3 w-3 mr-1" />{sel ? "Hide" : "View"}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                      <div className="lg:sticky lg:top-2 self-start">
                        {(() => {
                          const r = bulkRows.find(x => x.id === selectedPreviewId);
                          if (!r) return <div className="border rounded-md p-6 text-center text-xs text-muted-foreground bg-muted/30 min-h-[20rem] flex items-center justify-center">Select a resume to preview the personalized email.</div>;
                          const merged = (r.suggestedRoles && r.suggestedRoles.length) ? jobRoles.map((jr, i) => r.suggestedRoles![i] || jr) : jobRoles;
                          const html = buildEmailHtml({ candidateName: r.name || "Candidate", jobRoles: merged, jobSalaries, cvOpenings, applyUrl, hrName: adminName, companyName: companyNameInput, contactInfo, showTerms });
                          return (
                            <div className="border rounded-md bg-muted/20 p-2 space-y-2">
                              <div className="text-[11px]">
                                <div><span className="text-muted-foreground">To: </span><span className="font-medium">{r.email}</span></div>
                                <div><span className="text-muted-foreground">From: </span><span className="font-medium">{companyNameInput} &lt;noreply@gradia.co.in&gt;</span></div>
                              </div>
                              <iframe title={`prev-${r.id}`} srcDoc={html} className="w-full h-[24rem] border rounded bg-white" sandbox="" />
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-muted/50 border rounded-md p-3 text-center text-xs text-muted-foreground">
                      {candidateEmail.includes("@") ? <>Ready to send to <strong>{candidateName || "Candidate"}</strong> ({candidateEmail}).</> : <>No recipients yet. Upload resumes in <strong>Upload &amp; Analyze</strong>.</>}
                    </div>
                  )}

                  <Button className="w-full" onClick={bulkRows.length > 0 ? sendBulk : handleSendSingle}
                    disabled={bulkSending || sending || (bulkRows.length === 0 && !candidateEmail.includes("@")) || (bulkRows.length > 0 && pendingCount === 0)}>
                    {bulkSending || sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
                      : <><Send className="h-4 w-4 mr-2" />Send {bulkRows.length > 0 ? `to ${pendingCount} recipient(s)` : "Email"}</>}
                  </Button>
                  <p className="text-[11px] text-muted-foreground text-center">Each email is personalized and sent from <strong>noreply@gradia.co.in</strong>.</p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default HRInviteCandidate;
