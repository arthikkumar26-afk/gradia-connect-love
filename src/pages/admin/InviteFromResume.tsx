import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Home, Users, CreditCard, UserCheck, UserX, Briefcase, Building2,
  ClipboardList, UserCog, MessageSquare, Ticket, Bell, BarChart3,
  FileText, Settings, ShieldCheck, Upload, Mail, Send, Loader2, FileUp,
  Sparkles, MapPin, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarTrigger,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", icon: Home, path: "/admin/dashboard" },
  { title: "Users", icon: Users, path: "/admin/users" },
  { title: "Job Moderation", icon: Briefcase, path: "/admin/jobs" },
  { title: "External Jobs", icon: Briefcase, path: "/admin/external-jobs" },
  { title: "Companies", icon: Building2, path: "/admin/companies" },
  { title: "Bulk Mail & Register", icon: FileUp, path: "/admin/bulk-mail-register" },
  { title: "Invite from Resume", icon: Mail, path: "/admin/invite-from-resume" },
  { title: "Reports", icon: BarChart3, path: "/admin/reports" },
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

interface BulkRow {
  fileName: string;
  status: "pending" | "parsing" | "sending" | "sent" | "failed";
  email?: string;
  fullName?: string;
  matchedJobs?: number;
  error?: string;
}

const InviteFromResume = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const bulkRef = useRef<HTMLInputElement>(null);

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [sending, setSending] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [emailOverride, setEmailOverride] = useState("");
  const [lastResult, setLastResult] = useState<{ matchedJobs: number; jobs: any[] } | null>(null);

  // Bulk state
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const has = roles?.some((r) => r.role === "admin" || r.role === "owner");
      if (!has) { navigate("/admin/login"); return; }
      setAuthorized(true); setLoading(false);
    })();
  }, [navigate]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsed(null);
    setLastResult(null);
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data, error } = await supabase.functions.invoke("parse-resume", { body: fd });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setParsed(data);
      setEmailOverride(data?.email || "");
      toast.success("Resume parsed successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to parse resume");
    } finally {
      setParsing(false);
    }
  };

  const handleSendInvite = async () => {
    const email = (emailOverride || parsed?.email || "").trim();
    if (!email || !email.includes("@")) {
      toast.error("Please provide a valid email address");
      return;
    }
    setSending(true);
    try {
      const lastDesignation = parsed?.experience?.[0]?.designation || "";
      const { data, error } = await supabase.functions.invoke("invite-candidate-from-resume", {
        body: {
          email,
          fullName: parsed?.full_name || undefined,
          skills: parsed?.skills || [],
          preferredRole: parsed?.preferred_role || "",
          experienceLevel: parsed?.experience_level || "",
          lastDesignation,
          location: parsed?.location || "",
          maxJobs: 6,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLastResult({ matchedJobs: data.matchedJobs, jobs: data.jobs });
      toast.success(`Invite sent to ${email} with ${data.matchedJobs} matched job${data.matchedJobs !== 1 ? "s" : ""}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to send invite");
    } finally {
      setSending(false);
    }
  };

  const handleBulkFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBulkRows(files.map((f) => ({ fileName: f.name, status: "pending" as const })));
    // Store actual files via dataset on a ref-less map: re-trigger via input instead
    (window as any).__bulkResumeFiles = files;
    toast.success(`${files.length} resume${files.length > 1 ? "s" : ""} queued. Click "Process & Invite All" to start.`);
  };

  const processBulk = async () => {
    const files: File[] = (window as any).__bulkResumeFiles || [];
    if (!files.length) { toast.error("No files queued"); return; }
    setBulkRunning(true);
    let sent = 0, failed = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // parse
      setBulkRows((rows) => rows.map((r, idx) => idx === i ? { ...r, status: "parsing" } : r));
      try {
        const fd = new FormData();
        fd.append("file", file);
        const { data: parsedData, error: parseErr } = await supabase.functions.invoke("parse-resume", { body: fd });
        if (parseErr) throw parseErr;
        if (parsedData?.error) throw new Error(parsedData.error);

        const email = (parsedData?.email || "").trim();
        const fullName = parsedData?.full_name || "";
        if (!email || !email.includes("@")) {
          throw new Error("No valid email found in resume");
        }

        setBulkRows((rows) => rows.map((r, idx) => idx === i ? { ...r, status: "sending", email, fullName } : r));

        const lastDesignation = parsedData?.experience?.[0]?.designation || "";
        const { data: inviteData, error: inviteErr } = await supabase.functions.invoke("invite-candidate-from-resume", {
          body: {
            email,
            fullName: fullName || undefined,
            skills: parsedData?.skills || [],
            preferredRole: parsedData?.preferred_role || "",
            experienceLevel: parsedData?.experience_level || "",
            lastDesignation,
            location: parsedData?.location || "",
            maxJobs: 6,
          },
        });
        if (inviteErr) throw inviteErr;
        if (inviteData?.error) throw new Error(inviteData.error);

        setBulkRows((rows) => rows.map((r, idx) => idx === i ? { ...r, status: "sent", matchedJobs: inviteData.matchedJobs } : r));
        sent++;
      } catch (err: any) {
        console.error("Bulk row failed:", file.name, err);
        setBulkRows((rows) => rows.map((r, idx) => idx === i ? { ...r, status: "failed", error: err.message || "Failed" } : r));
        failed++;
      }
      // small gap to avoid rate limits
      await new Promise((r) => setTimeout(r, 800));
    }

    setBulkRunning(false);
    toast.success(`Bulk complete: ${sent} sent, ${failed} failed`);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!authorized) return null;

  const lastDesig = parsed?.experience?.[0]?.designation || "";

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
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                Invite from Resume
              </h1>
              <p className="text-sm text-muted-foreground">Upload a candidate's resume → AI matches open vacancies → email them an invite</p>
            </div>
          </header>

          <div className="p-6 max-w-5xl mx-auto space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Upload className="h-4 w-4" /> Step 1 — Upload Resume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  onClick={() => fileRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition"
                >
                  <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium">{fileName || "Click to upload PDF / DOCX / Image"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Max 20MB. AI will extract skills, role, location.</p>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                  onChange={handleFile}
                  className="hidden"
                />
                {parsing && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Analyzing resume with AI…
                  </div>
                )}
              </CardContent>
            </Card>

            {parsed && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-primary" /> Step 2 — Review Extracted Profile
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <p className="font-medium">{parsed.full_name || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Phone</Label>
                      <p className="font-medium">{parsed.mobile || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Last Designation</Label>
                      <p className="font-medium">{lastDesig || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Preferred Role</Label>
                      <p className="font-medium">{parsed.preferred_role || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Experience</Label>
                      <p className="font-medium">{parsed.experience_level || "—"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />Location</Label>
                      <p className="font-medium">{parsed.location || "—"}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Top Skills</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {(parsed.skills || []).slice(0, 20).map((s) => (
                        <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                      ))}
                      {(!parsed.skills || parsed.skills.length === 0) && <p className="text-sm text-muted-foreground">No skills detected</p>}
                    </div>
                  </div>

                  <div className="pt-3 border-t">
                    <Label htmlFor="email" className="text-sm">Send invite to</Label>
                    <Input
                      id="email"
                      type="email"
                      value={emailOverride}
                      onChange={(e) => setEmailOverride(e.target.value)}
                      placeholder="candidate@example.com"
                      className="mt-1.5"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Auto-detected from resume. Edit if needed.</p>
                  </div>

                  <Button
                    onClick={handleSendInvite}
                    disabled={sending || !emailOverride}
                    className="w-full"
                    size="lg"
                  >
                    {sending ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Matching jobs & sending email…</>
                    ) : (
                      <><Send className="h-4 w-4 mr-2" /> Send Invite with Matched Vacancies</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {lastResult && (
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Mail className="h-4 w-4 text-green-700" />
                    Invite Sent — {lastResult.matchedJobs} job{lastResult.matchedJobs !== 1 ? "s" : ""} included
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {lastResult.jobs.map((j, i) => (
                      <div key={i} className="flex items-center justify-between bg-background border rounded-md px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{j.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{j.company} {j.location ? `· ${j.location}` : ""}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <Badge variant={j.source === "internal" ? "default" : "outline"} className="text-[10px]">{j.source}</Badge>
                          <Badge variant="secondary" className="text-[10px]">Score {j.matchScore}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* BULK INVITE SECTION */}
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileUp className="h-4 w-4 text-primary" /> Bulk Invite — Upload Multiple Resumes
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Upload multiple PDF/DOCX resumes. Each one is parsed → AI suggests jobs → invite email sent automatically.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onClick={() => bulkRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition"
                >
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium text-sm">Click to select multiple resumes</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF / DOCX / Image. Up to 10 files at once.</p>
                </div>
                <input
                  ref={bulkRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                  onChange={handleBulkFiles}
                  className="hidden"
                />

                {bulkRows.length > 0 && (
                  <>
                    <div className="border rounded-md divide-y">
                      {bulkRows.map((row, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{row.fileName}</p>
                            {row.email && <p className="text-xs text-muted-foreground truncate">{row.fullName ? `${row.fullName} · ` : ""}{row.email}</p>}
                            {row.error && <p className="text-xs text-destructive truncate">{row.error}</p>}
                          </div>
                          <div className="ml-3 shrink-0">
                            {row.status === "pending" && <Badge variant="outline" className="text-[10px]">Queued</Badge>}
                            {row.status === "parsing" && <Badge variant="secondary" className="text-[10px]"><Loader2 className="h-3 w-3 mr-1 animate-spin inline" />Parsing</Badge>}
                            {row.status === "sending" && <Badge variant="secondary" className="text-[10px]"><Loader2 className="h-3 w-3 mr-1 animate-spin inline" />Sending</Badge>}
                            {row.status === "sent" && <Badge className="text-[10px] bg-green-600">Sent · {row.matchedJobs} jobs</Badge>}
                            {row.status === "failed" && <Badge variant="destructive" className="text-[10px]">Failed</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button onClick={processBulk} disabled={bulkRunning} className="w-full">
                      {bulkRunning ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing {bulkRows.filter(r => r.status === "sent" || r.status === "failed").length}/{bulkRows.length}…</>
                      ) : (
                        <><Send className="h-4 w-4 mr-2" /> Process & Invite All ({bulkRows.length})</>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default InviteFromResume;
