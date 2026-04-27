import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Home, Users, CreditCard, UserCheck, UserX, Briefcase, Building2,
  ClipboardList, UserCog, MessageSquare, Ticket, Bell, BarChart3,
  FileText, Settings, ShieldCheck, Upload, Mail, Send, Loader2, FileUp,
  Sparkles, MapPin, Wand2, Search, Save, Database, Eye, FileEdit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarTrigger,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", icon: Home, path: "/admin/dashboard" },
  { title: "Users", icon: Users, path: "/admin/users" },
  { title: "Subscribed Employers", icon: CreditCard, path: "/admin/subscribed-employers" },
  { title: "Subscribed Candidates", icon: UserCheck, path: "/admin/subscribed-candidates" },
  { title: "Candidate Resumes", icon: FileText, path: "/admin/candidate-resumes" },
  { title: "Unsubscribed Employers", icon: UserX, path: "/admin/unsubscribed-employers" },
  { title: "Unsubscribed Candidates", icon: UserX, path: "/admin/unsubscribed-candidates" },
  { title: "Job Moderation", icon: Briefcase, path: "/admin/jobs" },
  { title: "External Jobs", icon: Briefcase, path: "/admin/external-jobs" },
  { title: "Companies", icon: Building2, path: "/admin/companies" },
  { title: "Mock Interview", icon: ClipboardList, path: "/admin/mock-interview-pipeline" },
  { title: "Management", icon: UserCog, path: "/admin/management" },
  { title: "HR Negotiations", icon: MessageSquare, path: "/admin/hr-negotiations" },
  { title: "Coupons", icon: Ticket, path: "/admin/coupons" },
  { title: "AI Flyer Maker", icon: FileText, path: "/admin/flyer-maker" },
  { title: "Popup Ads", icon: Bell, path: "/admin/popup-ads" },
  { title: "Event Alerts", icon: Bell, path: "/admin/event-alerts" },
  { title: "Bulk Mail & Register", icon: FileUp, path: "/admin/bulk-mail-register" },
  { title: "Invite from Resume", icon: Mail, path: "/admin/invite-from-resume" },
  { title: "Reports", icon: BarChart3, path: "/admin/reports" },
  { title: "Audit Logs", icon: FileText, path: "/admin/audit" },
  { title: "Settings", icon: Settings, path: "/admin/settings" },
];

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

interface CandidateRow {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  location: string | null;
  resume_url: string | null;
  preferred_role: string | null;
}

const DRAFT_KEY = "invite_from_resume_draft_v1";

const DEFAULT_SUBJECT = "Opportunity Update – Your Profile Review";

const buildSuggestedRoles = (p: ParsedResume | null): string[] => {
  if (!p) return [];
  const roles = new Set<string>();
  if (p.preferred_role) roles.add(p.preferred_role);
  (p.experience || []).forEach((e) => e.designation && roles.add(e.designation));
  (p.skills || []).slice(0, 3).forEach((s) => roles.add(`${s} Specialist`));
  return Array.from(roles).slice(0, 5);
};

const buildEmailHtml = (opts: {
  candidateName: string;
  jobRoles: string[];
  adminName: string;
  companyName: string;
  contactInfo: string;
  showSubscription: boolean;
  showPayment: boolean;
  showTerms: boolean;
}) => {
  const { candidateName, jobRoles, adminName, companyName, contactInfo, showSubscription, showPayment, showTerms } = opts;
  const roleList = Array.from({ length: 5 }, (_, i) =>
    `<li>${String.fromCharCode(65 + i)}. ${jobRoles[i] || `Suitable Role ${i + 1}`}</li>`
  ).join("");

  const planTiers: {
    name: string;
    headerColor: string;
    bg: string;
    highlight?: boolean;
    features: { text: string; included: boolean; bold?: boolean; sub?: string }[];
  }[] = [
    {
      name: "Basic",
      headerColor: "#475569",
      bg: "#ffffff",
      features: [
        { text: "Apply to job", included: true },
        { text: "Resume export (1×)", included: true },
        { text: "ATS score check", included: true },
        { text: "Mock interview", included: false },
        { text: "AI feedback report", included: false },
        { text: "Featured profile boost", included: false },
      ],
    },
    {
      name: "Standard",
      headerColor: "#1e3a8a",
      bg: "#ffffff",
      features: [
        { text: "Apply to job", included: true },
        { text: "Resume export (1×)", included: true },
        { text: "ATS score check", included: true },
        { text: "1× Mock Interview", included: true, bold: true, sub: "(Aptitude + 1 Technical round)" },
        { text: "Basic AI feedback", included: true },
        { text: "Featured boost", included: false },
      ],
    },
    {
      name: "Premium",
      headerColor: "#b45309",
      bg: "#fffbeb",
      highlight: true,
      features: [
        { text: "Apply to job", included: true },
        { text: "Resume export (2×)", included: true },
        { text: "ATS score check", included: true },
        { text: "2× Mock Interviews", included: true, bold: true, sub: "(Aptitude + Technical + HR rounds)" },
        { text: "Detailed AI feedback report", included: true },
        { text: "Featured profile boost (1×)", included: true },
        { text: "Priority application tag", included: true },
      ],
    },
    {
      name: "Professional",
      headerColor: "#065f46",
      bg: "#ffffff",
      features: [
        { text: "Apply to job", included: true },
        { text: "Unlimited resume exports", included: true },
        { text: "ATS score check", included: true },
        { text: "5× Mock Interviews", included: true, bold: true, sub: "(Aptitude + Technical + Coding/Demo + HR + Final rounds)" },
        { text: "Full AI feedback + improvement plan", included: true },
        { text: "Featured profile boost (3×)", included: true },
        { text: "Priority support & faster shortlisting", included: true },
      ],
    },
  ];

  const renderFeature = (f: { text: string; included: boolean; bold?: boolean; sub?: string }) => {
    const symbol = f.included ? "✓" : "✗";
    const color = f.included ? "#15803d" : "#9ca3af";
    const textColor = f.included ? "#111827" : "#9ca3af";
    const fontWeight = f.bold ? "600" : "400";
    return `
      <div style="margin-bottom:6px;font-size:13px;line-height:1.45;color:${textColor};font-weight:${fontWeight};">
        <span style="color:${color};font-weight:700;margin-right:6px;">${symbol}</span>${f.text}
        ${f.sub ? `<div style="font-size:11px;color:#6b7280;font-weight:400;margin-left:16px;margin-top:2px;">${f.sub}</div>` : ""}
      </div>`;
  };

  const subscriptionBlock = showSubscription ? `
    <h3 style="color:#1e3a8a;margin-top:24px;">📋 Subscription Plans</h3>
    <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:8px 0;margin-top:12px;table-layout:fixed;">
      <tr>
        ${planTiers.map((tier) => `
          <td valign="top" style="width:25%;background:${tier.bg};border:1px solid ${tier.highlight ? "#f59e0b" : "#e5e7eb"};border-top:4px solid ${tier.headerColor};border-radius:6px;padding:14px;vertical-align:top;">
            <div style="font-size:15px;font-weight:700;color:${tier.headerColor};margin-bottom:10px;text-align:center;letter-spacing:0.3px;">
              ${tier.name}${tier.highlight ? ' <span style="background:#fbbf24;color:#7c2d12;font-size:9px;padding:2px 6px;border-radius:10px;margin-left:4px;vertical-align:middle;">POPULAR</span>' : ""}
            </div>
            ${tier.features.map(renderFeature).join("")}
          </td>
        `).join("")}
      </tr>
    </table>` : "";


  const paymentBlock = showPayment ? `
    <h3 style="color:#1e3a8a;margin-top:24px;">💳 Payment Methods</h3>
    <ul style="font-size:14px;line-height:1.7;">
      <li>UPI (GPay, PhonePe, Paytm, BHIM)</li>
      <li>Credit / Debit Cards</li>
      <li>Net Banking</li>
      <li>Wallets</li>
      <li>Bank Transfer</li>
    </ul>
    <div style="background:#fff7ed;border-left:4px solid #f97316;padding:12px;margin-top:12px;font-size:13px;">
      <strong>Important Notes:</strong>
      <ul style="margin:6px 0 0 18px;padding:0;">
        <li>No job guarantee</li>
        <li>Payment non-refundable</li>
        <li>Subscription activates after verification</li>
      </ul>
    </div>` : "";

  const termsBlock = showTerms ? `
    <h3 style="color:#1e3a8a;margin-top:24px;">📜 Terms &amp; Conditions</h3>
    <ul style="font-size:13px;line-height:1.6;color:#4b5563;">
      <li>Resume must be accurate</li>
      <li>Opportunities depend on employer</li>
      <li>Profile may be shared with recruiters</li>
      <li>Communication via email/phone</li>
    </ul>` : "";

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#111827;background:#ffffff;">
  <h2 style="color:#1e3a8a;margin:0 0 16px;">Dear ${candidateName},</h2>
  <p style="font-size:15px;line-height:1.6;">Greetings!</p>
  <p style="font-size:15px;line-height:1.6;">We have received your resume/CV through our job portal. Thank you for your interest in exploring opportunities with us.</p>
  <p style="font-size:15px;line-height:1.6;">Our team is currently reviewing your profile, and we will be scheduling the interview process at the earliest possible time. You will be notified with further details shortly.</p>
  <p style="font-size:15px;line-height:1.6;">Additionally, based on your qualifications and experience, we will guide you toward job opportunities that closely match your profile.</p>
  <p style="font-size:15px;line-height:1.6;">If you have any questions or need further assistance, please feel free to reach out to us.</p>

  <h3 style="color:#1e3a8a;margin-top:24px;">Based on your CV, suitable openings:</h3>
  <ul style="font-size:14px;line-height:1.7;">
    <li>Principal – State Board (Hyderabad)</li>
    <li>Principal – State Board (Nizamabad)</li>
    <li>Principal – CBSE Board</li>
    <li>SME (Subject Matter Expert)</li>
    <li>Resource Person</li>
    <li>HOD / Senior Teacher</li>
  </ul>

  <h3 style="color:#1e3a8a;margin-top:24px;">Suitable Jobs according to your qualifications:</h3>
  <ul style="font-size:14px;line-height:1.7;list-style:none;padding-left:0;">${roleList}</ul>

  <p style="font-size:14px;margin-top:16px;"><strong>Please confirm your preference:</strong></p>
  <p style="font-size:14px;">☐ With Interview &nbsp;&nbsp; ☐ Without Interview</p>

  <h3 style="color:#1e3a8a;margin-top:24px;">⚖️ Comparison Overview</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <tr style="background:#f3f4f6;"><th style="border:1px solid #e5e7eb;padding:8px;text-align:left;">With Interview</th><th style="border:1px solid #e5e7eb;padding:8px;text-align:left;">Without Interview</th></tr>
    <tr><td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;">• Selection based on interview performance<br/>• Direct interaction with employer<br/>• Multi-stage evaluation<br/>• Higher transparency</td>
        <td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;">• Selection based on resume/profile<br/>• Faster hiring process<br/>• Limited interaction<br/>• Quick employer decision</td></tr>
  </table>

  ${subscriptionBlock}
  ${paymentBlock}
  ${termsBlock}

  <p style="font-size:15px;margin-top:24px;">We will keep you updated with the next steps shortly.</p>
  <p style="font-size:15px;margin-top:16px;">Best regards,<br/><strong>${adminName}</strong><br/>${companyName}<br/>${contactInfo}</p>
</div>`;
};

const InviteFromResume = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [sending, setSending] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedResume | null>(null);

  const [activeTab, setActiveTab] = useState("resume");

  // Recipient + roles
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [jobRoles, setJobRoles] = useState<string[]>(["", "", "", "", ""]);

  // Email
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [adminName, setAdminName] = useState("Gradia Hiring Team");
  const [companyName, setCompanyName] = useState("Gradia");
  const [contactInfo, setContactInfo] = useState("info@gradiaa.com");
  const [showSubscription, setShowSubscription] = useState(true);
  const [showPayment, setShowPayment] = useState(true);
  const [showTerms, setShowTerms] = useState(true);
  const [editedHtml, setEditedHtml] = useState<string | null>(null);

  // Candidate DB selector
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const has = roles?.some((r) => r.role === "admin" || r.role === "owner");
      if (!has) { navigate("/admin/login"); return; }
      setAuthorized(true); setLoading(false);

      // load draft
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d.candidateName) setCandidateName(d.candidateName);
          if (d.candidateEmail) setCandidateEmail(d.candidateEmail);
          if (d.jobRoles) setJobRoles(d.jobRoles);
          if (d.subject) setSubject(d.subject);
          if (d.adminName) setAdminName(d.adminName);
          if (d.companyName) setCompanyName(d.companyName);
          if (d.contactInfo) setContactInfo(d.contactInfo);
          if (typeof d.editedHtml === "string") setEditedHtml(d.editedHtml);
          if (typeof d.showSubscription === "boolean") setShowSubscription(d.showSubscription);
          if (typeof d.showPayment === "boolean") setShowPayment(d.showPayment);
          if (typeof d.showTerms === "boolean") setShowTerms(d.showTerms);
        }
      } catch { /* ignore */ }
    })();
  }, [navigate]);

  const loadCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, mobile, location, resume_url, preferred_role")
        .eq("role", "candidate")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setCandidates((data || []) as CandidateRow[]);
    } catch (e: any) {
      toast.error(e.message || "Failed to load candidates");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    const q = candidateSearch.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter((c) =>
      [c.full_name, c.email, c.mobile, c.location, c.preferred_role]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q))
    );
  }, [candidates, candidateSearch]);

  const applyParsed = (p: ParsedResume) => {
    setParsed(p);
    if (p.full_name) setCandidateName(p.full_name);
    if (p.email) setCandidateEmail(p.email);
    const suggested = buildSuggestedRoles(p);
    if (suggested.length) {
      setJobRoles((prev) => prev.map((r, i) => suggested[i] || r));
    }
    setEditedHtml(null);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data, error } = await supabase.functions.invoke("parse-resume", { body: fd });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      applyParsed(data);
      toast.success("Resume parsed successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to parse resume");
    } finally {
      setParsing(false);
    }
  };

  const selectCandidate = (c: CandidateRow) => {
    setCandidateName(c.full_name || "");
    setCandidateEmail(c.email || "");
    setFileName(c.full_name ? `${c.full_name} (from database)` : "Candidate selected");
    const synthetic: ParsedResume = {
      full_name: c.full_name,
      email: c.email,
      mobile: c.mobile,
      location: c.location,
      preferred_role: c.preferred_role,
    };
    applyParsed(synthetic);
    toast.success(`Selected ${c.full_name || c.email}`);
  };

  const generatedHtml = useMemo(
    () =>
      buildEmailHtml({
        candidateName: candidateName || "Candidate",
        jobRoles,
        adminName,
        companyName,
        contactInfo,
        showSubscription,
        showPayment,
        showTerms,
      }),
    [candidateName, jobRoles, adminName, companyName, contactInfo, showSubscription, showPayment, showTerms]
  );

  const finalHtml = editedHtml ?? generatedHtml;

  const handleSaveDraft = () => {
    const payload = {
      candidateName, candidateEmail, jobRoles, subject,
      adminName, companyName, contactInfo, editedHtml,
      showSubscription, showPayment, showTerms,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    toast.success("Draft saved locally");
  };

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setEditedHtml(null);
    toast.success("Draft cleared");
  };

  const handleSend = async () => {
    if (!candidateEmail || !candidateEmail.includes("@")) {
      toast.error("Enter a valid recipient email"); return;
    }
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-resume-invite-email", {
        body: { to: candidateEmail.trim(), subject: subject.trim(), html: finalHtml, fromName: companyName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Email sent to ${candidateEmail}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!authorized) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <Sidebar>
          <SidebarContent>
            <div className="p-4 border-b">
              <Link to="/admin/dashboard" className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <span className="font-bold">Admin Panel</span>
              </Link>
            </div>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild isActive={location.pathname === item.path}>
                        <Link to={item.path}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <header className="bg-background border-b px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                Invite from Resume
              </h1>
              <p className="text-sm text-muted-foreground">Upload or pick a candidate → auto-generate a branded invite → preview, edit and send.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSaveDraft}><Save className="h-4 w-4 mr-2" />Save Draft</Button>
          </header>

          <div className="p-6 max-w-6xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-3 w-full max-w-xl mx-auto mb-6">
                <TabsTrigger value="resume"><FileText className="h-4 w-4 mr-2" />Resume Info</TabsTrigger>
                <TabsTrigger value="preview"><Eye className="h-4 w-4 mr-2" />Email Preview</TabsTrigger>
                <TabsTrigger value="send"><Send className="h-4 w-4 mr-2" />Send</TabsTrigger>
              </TabsList>

              {/* TAB 1: RESUME INFO */}
              <TabsContent value="resume" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Upload className="h-4 w-4" /> Upload Resume
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        onClick={() => fileRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/50 transition"
                      >
                        <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="font-medium text-sm">{fileName || "Click to upload PDF / DOCX / Image"}</p>
                        <p className="text-xs text-muted-foreground mt-1">AI extracts name, email, role, skills.</p>
                      </div>
                      <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg" onChange={handleFile} className="hidden" />
                      {parsing && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Analyzing resume…
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Database className="h-4 w-4" /> Or Select from Database
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search by name, email, role…"
                            value={candidateSearch}
                            onChange={(e) => setCandidateSearch(e.target.value)}
                            className="pl-8"
                          />
                        </div>
                        <Button variant="outline" onClick={loadCandidates} disabled={loadingCandidates}>
                          {loadingCandidates ? <Loader2 className="h-4 w-4 animate-spin" /> : "Load"}
                        </Button>
                      </div>
                      <div className="border rounded-md max-h-56 overflow-auto divide-y">
                        {filteredCandidates.length === 0 ? (
                          <p className="text-xs text-muted-foreground p-3 text-center">
                            {candidates.length === 0 ? "Click Load to fetch candidates" : "No matches"}
                          </p>
                        ) : filteredCandidates.slice(0, 50).map((c) => (
                          <button
                            key={c.id}
                            onClick={() => selectCandidate(c)}
                            className="w-full text-left px-3 py-2 hover:bg-muted/50 transition"
                          >
                            <p className="font-medium text-sm truncate">{c.full_name || "Unnamed"}</p>
                            <p className="text-xs text-muted-foreground truncate">{c.email} {c.preferred_role ? `· ${c.preferred_role}` : ""}</p>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-primary" /> Extracted / Editable Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Candidate Name</Label>
                        <Input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} placeholder="Full name" />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input type="email" value={candidateEmail} onChange={(e) => setCandidateEmail(e.target.value)} placeholder="candidate@example.com" />
                      </div>
                      {parsed && (
                        <>
                          <div>
                            <Label className="text-xs text-muted-foreground">Phone</Label>
                            <p className="text-sm font-medium">{parsed.mobile || "—"}</p>
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Location</Label>
                            <p className="text-sm font-medium">{parsed.location || "—"}</p>
                          </div>
                        </>
                      )}
                    </div>

                    <div>
                      <Label className="mb-2 block">Suggested Job Roles (AI-prefilled, editable)</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {jobRoles.map((r, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs font-semibold w-5">{String.fromCharCode(65 + i)}.</span>
                            <Input
                              value={r}
                              onChange={(e) => setJobRoles((prev) => prev.map((x, idx) => idx === i ? e.target.value : x))}
                              placeholder={`Job role ${i + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {parsed?.skills?.length ? (
                      <div>
                        <Label className="text-xs text-muted-foreground">Top Skills (from resume)</Label>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {parsed.skills.slice(0, 20).map((s) => (
                            <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="flex justify-end pt-2">
                      <Button onClick={() => setActiveTab("preview")} disabled={!candidateName || !candidateEmail}>
                        Continue to Preview <Eye className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 2: PREVIEW */}
              <TabsContent value="preview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-1 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2"><FileEdit className="h-4 w-4" />Email Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>Subject</Label>
                        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                      </div>
                      <div>
                        <Label>From / Admin Name</Label>
                        <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                      </div>
                      <div>
                        <Label>Company</Label>
                        <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                      </div>
                      <div>
                        <Label>Contact Info</Label>
                        <Input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
                      </div>

                      <div className="pt-2 border-t space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Sections</p>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">Subscription Plans</Label>
                          <Switch checked={showSubscription} onCheckedChange={setShowSubscription} />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">Payment Methods</Label>
                          <Switch checked={showPayment} onCheckedChange={setShowPayment} />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">Terms &amp; Conditions</Label>
                          <Switch checked={showTerms} onCheckedChange={setShowTerms} />
                        </div>
                      </div>

                      <div className="pt-2 border-t flex flex-col gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditedHtml(null)}>
                          Reset to Auto-Generated
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleClearDraft}>
                          Clear Draft
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" />Live Preview</CardTitle>
                      <Badge variant={editedHtml ? "default" : "secondary"} className="text-[10px]">
                        {editedHtml ? "Custom edited" : "Auto-generated"}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg bg-white max-h-[480px] overflow-auto">
                        <div dangerouslySetInnerHTML={{ __html: finalHtml }} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><FileEdit className="h-4 w-4" />HTML Editor (Advanced)</CardTitle>
                    <p className="text-xs text-muted-foreground">Edit raw HTML for full control. Changes override the auto-generated preview.</p>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={finalHtml}
                      onChange={(e) => setEditedHtml(e.target.value)}
                      className="font-mono text-xs min-h-[280px]"
                    />
                    <div className="flex justify-end mt-3">
                      <Button onClick={() => setActiveTab("send")}>
                        Continue to Send <Send className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 3: SEND */}
              <TabsContent value="send" className="space-y-6">
                <Card className="shadow-sm max-w-2xl mx-auto">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4 text-primary" />Review &amp; Send</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">To</span>
                        <span className="font-medium">{candidateEmail || "—"}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Recipient</span>
                        <span className="font-medium">{candidateName || "—"}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Subject</span>
                        <span className="font-medium truncate max-w-[60%]">{subject}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Sender</span>
                        <span className="font-medium">{adminName} · {companyName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sections enabled</span>
                        <span className="font-medium text-xs">
                          {[showSubscription && "Subscription", showPayment && "Payment", showTerms && "Terms"].filter(Boolean).join(", ") || "Core only"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button variant="outline" className="flex-1" onClick={handleSaveDraft}>
                        <Save className="h-4 w-4 mr-2" />Save as Draft
                      </Button>
                      <Button className="flex-1" onClick={handleSend} disabled={sending || !candidateEmail}>
                        {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</> : <><Send className="h-4 w-4 mr-2" />Send Email</>}
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground text-center">
                      Email is sent from <strong>noreply@gradia.co.in</strong>. Drafts are saved locally in this browser.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default InviteFromResume;
