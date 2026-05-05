import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Home, Users, CreditCard, UserCheck, UserX, Briefcase, Building2,
  ClipboardList, UserCog, MessageSquare, Ticket, Bell, BarChart3,
  FileText, Settings, ShieldCheck, Upload, Mail, UserPlus, Eye,
  Send, Loader2, X, FileUp, ChevronDown, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarTrigger
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", icon: Home, path: "/admin/dashboard" },
  { title: "Users", icon: Users, path: "/admin/users" },
  { title: "Subscribed Employers", icon: CreditCard, path: "/admin/subscribed-employers" },
  { title: "Subscribed Candidates", icon: UserCheck, path: "/admin/subscribed-candidates" },
  { title: "Unsubscribed Employers", icon: UserX, path: "/admin/unsubscribed-employers" },
  { title: "Unsubscribed Candidates", icon: UserX, path: "/admin/unsubscribed-candidates" },
  { title: "Job Moderation", icon: Briefcase, path: "/admin/jobs" },
  { title: "External Jobs", icon: Briefcase, path: "/admin/external-jobs" },
  { title: "Companies", icon: Building2, path: "/admin/companies" },
  { title: "Mock Interview", icon: ClipboardList, path: "/admin/mock-interview-pipeline" },
  { title: "Management", icon: UserCog, path: "/admin/management" },
  { title: "Coupons", icon: Ticket, path: "/admin/coupons" },
  { title: "Popup Ads", icon: Bell, path: "/admin/popup-ads" },
  { title: "Event Alerts", icon: Bell, path: "/admin/event-alerts" },
  { title: "Bulk Mail & Register", icon: FileUp, path: "/admin/bulk-mail-register" },
  { title: "Invite from Resume", icon: Mail, path: "/admin/invite-from-resume" },
  { title: "Reports", icon: BarChart3, path: "/admin/reports" },
  { title: "Audit Logs", icon: FileText, path: "/admin/audit" },
  { title: "Settings", icon: Settings, path: "/admin/settings" },
];

const BulkMailRegister = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [sending, setSending] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Extracted emails
  const [emails, setEmails] = useState<string[]>([]);
  const [manualEmails, setManualEmails] = useState("");
  const [fileName, setFileName] = useState("");

  // Action mode
  const [actionMode, setActionMode] = useState<"email" | "register">("email");

  // Email fields
  const [subject, setSubject] = useState("");
  const [senderName, setSenderName] = useState("Gradia EduTech");
  const [emailBody, setEmailBody] = useState("");

  // Register fields
  const [registerRole, setRegisterRole] = useState<string>("candidate");
  const [registerMethod, setRegisterMethod] = useState<"auto" | "invite">("invite");

  // Preview
  const [showPreview, setShowPreview] = useState(false);

  // AI Generate
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");

  // Signup link in email
  const [includeSignupLink, setIncludeSignupLink] = useState(true);
  const [signupRole, setSignupRole] = useState<string>("candidate");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const hasAccess = roles?.some(r => r.role === "admin" || r.role === "owner");
      if (!hasAccess) { navigate("/admin/login"); return; }
      setIsAuthorized(true);
      setLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;

      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        // For PDF, read as base64 and let AI handle it
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
    ];

    const ext = file.name.split(".").pop()?.toLowerCase();
    const isAllowed = allowedTypes.includes(file.type) || ["csv", "xlsx", "xls", "pdf", "doc", "docx", "txt"].includes(ext || "");

    if (!isAllowed) {
      toast.error("Unsupported file format. Please upload CSV, Excel, PDF, Word, or Text files.");
      return;
    }

    setFileName(file.name);
    setExtracting(true);

    try {
      const content = await readFileAsText(file);
      const { data, error } = await supabase.functions.invoke("extract-emails-from-document", {
        body: { fileContent: content, fileType: file.type, fileName: file.name },
      });

      if (error) throw error;

      const extractedEmails = data?.emails || [];
      if (extractedEmails.length === 0) {
        toast.warning("No email addresses found in the document.");
      } else {
        toast.success(`Found ${extractedEmails.length} email(s) from the document.`);
      }
      setEmails(extractedEmails);
    } catch (err: any) {
      toast.error(err.message || "Failed to extract emails");
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const addManualEmails = () => {
    if (!manualEmails.trim()) return;
    const newEmails = manualEmails
      .split(/[,;\n]+/)
      .map(e => e.trim())
      .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    const combined = [...new Set([...emails, ...newEmails])];
    setEmails(combined);
    setManualEmails("");
    toast.success(`Added ${newEmails.length} email(s). Total: ${combined.length}`);
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter(e => e !== email));
  };

  const getSignupUrl = (role: string) => {
    const base = "https://gradia-link-shine.lovable.app";
    switch (role) {
      case "employer": return `${base}/employer/signup`;
      case "freelancer": return `${base}/freelancer/signup`;
      case "edutech": return `${base}/edutech/login`;
      default: return `${base}/candidate/signup`;
    }
  };

  const signupButtonHtml = includeSignupLink
    ? `<div style="text-align:center;margin:24px 0;">
        <a href="${getSignupUrl(signupRole)}" target="_blank" style="background:#0f766e;color:#ffffff;padding:14px 32px;text-decoration:none;border-radius:8px;display:inline-block;font-weight:600;font-size:16px;">
          Register as ${signupRole.charAt(0).toUpperCase() + signupRole.slice(1)} on Gradia
        </a>
        <p style="margin-top:8px;color:#6b7280;font-size:12px;">Click the button above to create your free account</p>
      </div>`
    : "";

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) { toast.error("Please describe what the email should be about"); return; }
    setGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-bulk-email", {
        body: { prompt: aiPrompt },
      });
      if (error) throw error;
      const generatedText = data?.content || "";
      if (generatedText) {
        setEmailBody(generatedText);
        if (!subject) setSubject(data?.subject || aiPrompt.slice(0, 60));
        toast.success("Email content generated by AI!");
      } else {
        toast.error("AI returned empty response");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to generate email with AI");
    } finally {
      setGeneratingAI(false);
    }
  };

  const handleSendEmails = async () => {
    if (emails.length === 0) { toast.error("No recipients"); return; }
    if (!subject || !emailBody) { toast.error("Subject and body are required"); return; }

    setSending(true);
    try {
      const fullBody = emailBody.replace(/\n/g, "<br/>") + signupButtonHtml;
      const { data, error } = await supabase.functions.invoke("send-campaign-emails", {
        body: {
          recipients: emails,
          subject,
          htmlBody: fullBody,
          senderName,
          campaignName: `Bulk Mail - ${subject}`,
        },
      });

      if (error) throw error;
      toast.success(`Emails sent! ${data.totalSent} delivered, ${data.totalFailed} failed.`);
      setShowPreview(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send emails");
    } finally {
      setSending(false);
    }
  };

  const handleRegisterUsers = async () => {
    if (emails.length === 0) { toast.error("No emails to register"); return; }

    setRegistering(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const email of emails) {
        try {
          if (registerMethod === "auto") {
            // Auto-register with random password
            const password = Math.random().toString(36).slice(-10) + "A1!";
            const { data, error } = await supabase.functions.invoke("manage-user-roles", {
              body: {
                action: "create",
                email,
                password,
                role: registerRole,
                full_name: email.split("@")[0],
              },
            });
            if (error) throw error;

            // Send credentials email
            await supabase.functions.invoke("send-notification-email", {
              body: {
                type: "direct",
                recipientEmail: email,
                subject: `Your Gradia Account Credentials - ${registerRole.charAt(0).toUpperCase() + registerRole.slice(1)}`,
                html: `
                  <h2>Welcome to Gradia!</h2>
                  <p>Your ${registerRole} account has been created.</p>
                  <p><strong>Email:</strong> ${email}</p>
                  <p><strong>Password:</strong> ${password}</p>
                  <p>Please login and change your password immediately.</p>
                  <p><a href="https://gradia-link-shine.lovable.app/login">Login Now</a></p>
                `,
              },
            });

            successCount++;
          } else {
            // Send invitation link
            await supabase.functions.invoke("send-notification-email", {
              body: {
                type: "direct",
                recipientEmail: email,
                subject: `You're Invited to Join Gradia as ${registerRole.charAt(0).toUpperCase() + registerRole.slice(1)}`,
                html: `
                  <h2>You're Invited to Gradia!</h2>
                  <p>You have been invited to join Gradia EduTech platform as a <strong>${registerRole}</strong>.</p>
                  <p>Click the link below to create your account:</p>
                  <p><a href="https://gradia-link-shine.lovable.app/${registerRole === "employer" ? "employer/signup" : registerRole === "freelancer" ? "freelancer/signup" : registerRole === "edutech" ? "edutech/login" : "candidate/signup"}" style="background:#0f766e;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;display:inline-block;">Join as ${registerRole.charAt(0).toUpperCase() + registerRole.slice(1)}</a></p>
                `,
              },
            });
            successCount++;
          }
        } catch (err) {
          console.error(`Failed for ${email}:`, err);
          failCount++;
        }
      }

      toast.success(`Registration complete! ${successCount} success, ${failCount} failed.`);
    } catch (err: any) {
      toast.error(err.message || "Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const previewHtml = `
    <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:20px;">
      <p style="color:#6b7280;font-size:12px;">From: ${senderName} &lt;noreply@gradia.co.in&gt;</p>
      <p style="color:#6b7280;font-size:12px;">To: ${emails.length} recipient(s)</p>
      <h3 style="margin:16px 0 8px;color:#111;">${subject}</h3>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:12px 0;" />
      <div style="color:#222;font-size:14px;line-height:1.6;">
        ${emailBody.replace(/\n/g, "<br/>")}
      </div>
      ${signupButtonHtml}
    </div>
  `;

  if (loading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-muted/30">
        <Sidebar className="border-r border-border">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary">
                <ShieldCheck className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">Gradia Admin</h1>
                <p className="text-xs text-muted-foreground">Management Panel</p>
              </div>
            </div>
          </div>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={item.path}
                          className={location.pathname === item.path ? "bg-primary/10 text-primary font-medium" : ""}
                        >
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

        <div className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-10 bg-background/80 backdrop-blur border-b px-6 py-3 flex items-center gap-3">
            <SidebarTrigger />
            <FileUp className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold text-foreground">Bulk Mail & Register</h1>
          </header>

          <main className="flex-1 p-6 space-y-6 overflow-auto">
            {/* Step 1: Upload Document */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Upload className="h-5 w-5 text-primary" />
                  Step 1: Upload Document or Add Emails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label>Upload Document (CSV, Excel, PDF, Word, Text)</Label>
                    <div className="mt-2 flex gap-2">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls,.pdf,.doc,.docx,.txt"
                        onChange={handleFileUpload}
                        disabled={extracting}
                      />
                      {extracting && <Loader2 className="h-5 w-5 animate-spin text-primary mt-2" />}
                    </div>
                    {fileName && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Uploaded: <strong>{fileName}</strong>
                      </p>
                    )}
                  </div>
                  <div className="flex-1">
                    <Label>Or add emails manually (comma/newline separated)</Label>
                    <div className="mt-2 flex gap-2">
                      <Textarea
                        value={manualEmails}
                        onChange={(e) => setManualEmails(e.target.value)}
                        placeholder="email1@example.com, email2@example.com"
                        rows={2}
                      />
                      <Button onClick={addManualEmails} size="sm" className="mt-auto">
                        Add
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Email List */}
                {emails.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">
                      Extracted Emails ({emails.length})
                    </Label>
                    <div className="mt-2 flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 border rounded-md bg-muted/20">
                      {emails.map((email) => (
                        <Badge key={email} variant="secondary" className="gap-1 py-1">
                          {email}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-destructive"
                            onClick={() => removeEmail(email)}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Choose Action */}
            {emails.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Step 2: Choose Action</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={actionMode} onValueChange={(v) => setActionMode(v as "email" | "register")}>
                    <TabsList className="grid grid-cols-2 w-full max-w-md">
                      <TabsTrigger value="email" className="gap-2">
                        <Mail className="h-4 w-4" /> Send Email
                      </TabsTrigger>
                      <TabsTrigger value="register" className="gap-2">
                        <UserPlus className="h-4 w-4" /> Register Users
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="email" className="space-y-4 mt-4">
                      {/* AI Generate */}
                      <div className="p-4 border rounded-lg bg-muted/20 space-y-3">
                        <Label className="flex items-center gap-2 font-medium">
                          <Sparkles className="h-4 w-4 text-primary" /> Generate Email with AI
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            placeholder="e.g. Job vacancies for software engineers, invitation for campus recruitment drive..."
                            className="flex-1"
                          />
                          <Button onClick={handleGenerateWithAI} disabled={generatingAI || !aiPrompt.trim()} variant="secondary">
                            {generatingAI ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                            Generate
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Sender Name</Label>
                          <Input value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                        </div>
                        <div>
                          <Label>Subject *</Label>
                          <Input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Enter email subject..."
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Email Body *</Label>
                        <Textarea
                          value={emailBody}
                          onChange={(e) => setEmailBody(e.target.value)}
                          placeholder="Write your email message here... (supports plain text, line breaks will be converted to HTML)"
                          rows={8}
                        />
                      </div>

                      {/* Include Signup Link Toggle */}
                      <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
                        <div className="flex items-center gap-2 flex-1">
                          <Switch
                            checked={includeSignupLink}
                            onCheckedChange={setIncludeSignupLink}
                          />
                          <Label className="cursor-pointer">Include Signup Button in Email</Label>
                        </div>
                        {includeSignupLink && (
                          <div className="flex items-center gap-2">
                            <Label className="text-sm whitespace-nowrap">Signup as:</Label>
                            <Select value={signupRole} onValueChange={setSignupRole}>
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="candidate">Candidate</SelectItem>
                                <SelectItem value="employer">Employer</SelectItem>
                                <SelectItem value="freelancer">Freelancer</SelectItem>
                                <SelectItem value="edutech">EduTech</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-3">
                        <Button
                          onClick={() => setShowPreview(true)}
                          variant="outline"
                          disabled={!subject || !emailBody}
                        >
                          <Eye className="h-4 w-4 mr-2" /> Preview Email
                        </Button>
                        <Button
                          onClick={handleSendEmails}
                          disabled={sending || !subject || !emailBody}
                        >
                          {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                          Send to {emails.length} Recipients
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="register" className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Register As</Label>
                          <Select value={registerRole} onValueChange={setRegisterRole}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="candidate">Candidate</SelectItem>
                              <SelectItem value="employer">Employer</SelectItem>
                              <SelectItem value="freelancer">Freelancer</SelectItem>
                              <SelectItem value="edutech">EduTech</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Registration Method</Label>
                          <Select value={registerMethod} onValueChange={(v) => setRegisterMethod(v as "auto" | "invite")}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="auto">Auto-Register (Create Account + Send Credentials)</SelectItem>
                              <SelectItem value="invite">Send Invitation Link</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="p-4 border rounded-lg bg-muted/30">
                        <p className="text-sm text-muted-foreground">
                          {registerMethod === "auto"
                            ? `Will create ${emails.length} ${registerRole} account(s) with auto-generated passwords and send credentials via email.`
                            : `Will send ${emails.length} invitation email(s) with a signup link for the ${registerRole} role.`}
                        </p>
                      </div>

                      <Button
                        onClick={handleRegisterUsers}
                        disabled={registering}
                      >
                        {registering
                          ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          : <UserPlus className="h-4 w-4 mr-2" />}
                        {registerMethod === "auto" ? "Register" : "Send Invitations"} ({emails.length})
                      </Button>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}
          </main>
        </div>

        {/* Email Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
            </DialogHeader>
            <div className="border rounded-lg overflow-hidden">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close & Modify
              </Button>
              <Button onClick={handleSendEmails} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send Now
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
};

export default BulkMailRegister;
