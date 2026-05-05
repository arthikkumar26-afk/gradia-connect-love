import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Home, Users, Briefcase, Building2, ClipboardList, UserCog, MessageSquare,
  Ticket, BarChart3, FileText, Settings, Plus, Pencil, Trash2, ExternalLink,
  Loader2, LogOut, ShieldCheck, CreditCard, UserCheck, UserX, Globe, Sparkles, Upload, FileUp
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ExternalJob {
  id: string;
  company_name: string;
  job_title: string;
  location: string | null;
  job_type: string | null;
  salary_range: string | null;
  experience_required: string | null;
  description: string | null;
  skills: string[];
  apply_url: string;
  company_logo_url: string | null;
  hr_name: string | null;
  hr_contact: string | null;
  hr_email: string | null;
  is_active: boolean;
  created_at: string;
}

const ExternalJobs = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<ExternalJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<ExternalJob | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [form, setForm] = useState({
    company_name: "",
    job_title: "",
    location: "",
    job_type: "full-time",
    salary_range: "",
    experience_required: "",
    description: "",
    skills: "",
    apply_url: "",
    company_logo_url: "",
    hr_name: "",
    hr_contact: "",
    hr_email: "",
  });

  const menuItems = [
    { title: "Dashboard", icon: Home, path: "/admin/dashboard" },
    { title: "Users", icon: Users, path: "/admin/users" },
    { title: "Subscribed Employers", icon: CreditCard, path: "/admin/subscribed-employers" },
    { title: "Subscribed Candidates", icon: UserCheck, path: "/admin/subscribed-candidates" },
    { title: "Unsubscribed Employers", icon: UserX, path: "/admin/unsubscribed-employers" },
    { title: "Unsubscribed Candidates", icon: UserX, path: "/admin/unsubscribed-candidates" },
    { title: "Job Moderation", icon: Briefcase, path: "/admin/jobs" },
    { title: "External Jobs", icon: Globe, path: "/admin/external-jobs" },
    { title: "Companies", icon: Building2, path: "/admin/companies" },
    { title: "Mock Interview", icon: ClipboardList, path: "/admin/mock-interview-pipeline" },
    { title: "Management", icon: UserCog, path: "/admin/management" },
    { title: "Coupons", icon: Ticket, path: "/admin/coupons" },
    { title: "Reports", icon: BarChart3, path: "/admin/reports" },
    { title: "Audit Logs", icon: FileText, path: "/admin/audit" },
    { title: "Settings", icon: Settings, path: "/admin/settings" },
  ];

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("external_jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setJobs(data as ExternalJob[]);
    setLoading(false);
  };

  const resetForm = () => {
    setForm({ company_name: "", job_title: "", location: "", job_type: "full-time", salary_range: "", experience_required: "", description: "", skills: "", apply_url: "", company_logo_url: "", hr_name: "", hr_contact: "", hr_email: "" });
    setEditingJob(null);
  };

  const applyAiData = (data: any) => {
    setForm(f => ({
      ...f,
      company_name: data.company_name || f.company_name,
      job_title: data.job_title || f.job_title,
      location: data.location || f.location,
      job_type: data.job_type || f.job_type,
      salary_range: data.salary_range || f.salary_range,
      experience_required: data.experience_required || f.experience_required,
      description: data.description || f.description,
      skills: data.skills || f.skills,
      apply_url: data.apply_url || f.apply_url,
      hr_name: data.hr_name || f.hr_name,
      hr_contact: data.hr_contact || f.hr_contact,
      hr_email: data.hr_email || f.hr_email,
    }));
  };

  const handleParseText = async () => {
    if (!pasteText.trim()) {
      toast({ title: "No text", description: "Paste job text to analyze.", variant: "destructive" });
      return;
    }
    setAiParsing(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-external-job", {
        body: { text: pasteText },
      });
      if (error) throw error;
      if (data?.success) {
        applyAiData(data.data);
        setPasteText("");
        toast({ title: "AI Filled", description: "Fields populated from text." });
      } else {
        throw new Error(data?.error || "Parse failed");
      }
    } catch (err: any) {
      toast({ title: "AI Error", description: err.message, variant: "destructive" });
    } finally {
      setAiParsing(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Only PDF files are supported.", variant: "destructive" });
      return;
    }
    setAiParsing(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data, error } = await supabase.functions.invoke("parse-external-job", {
        body: { pdfBase64: base64 },
      });
      if (error) throw error;
      if (data?.success) {
        applyAiData(data.data);
        toast({ title: "AI Filled", description: "Fields populated from PDF." });
      } else {
        throw new Error(data?.error || "Parse failed");
      }
    } catch (err: any) {
      toast({ title: "AI Error", description: err.message, variant: "destructive" });
    } finally {
      setAiParsing(false);
      e.target.value = "";
    }
  };

  const openEdit = (job: ExternalJob) => {
    setEditingJob(job);
    setForm({
      company_name: job.company_name,
      job_title: job.job_title,
      location: job.location || "",
      job_type: job.job_type || "full-time",
      salary_range: job.salary_range || "",
      experience_required: job.experience_required || "",
      description: job.description || "",
      skills: (job.skills || []).join(", "),
      apply_url: job.apply_url,
      company_logo_url: job.company_logo_url || "",
      hr_name: (job as any).hr_name || "",
      hr_contact: (job as any).hr_contact || "",
      hr_email: (job as any).hr_email || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      company_name: form.company_name,
      job_title: form.job_title,
      location: form.location || null,
      job_type: form.job_type,
      salary_range: form.salary_range || null,
      experience_required: form.experience_required || null,
      description: form.description || null,
      skills: form.skills ? form.skills.split(",").map(s => s.trim()).filter(Boolean) : [],
      apply_url: form.apply_url,
      company_logo_url: form.company_logo_url || null,
      hr_name: form.hr_name || null,
      hr_contact: form.hr_contact || null,
      hr_email: form.hr_email || null,
    };

    if (editingJob) {
      const { error } = await supabase.from("external_jobs").update(payload).eq("id", editingJob.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Updated", description: "External job updated." });
    } else {
      const { error } = await supabase.from("external_jobs").insert(payload);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Created", description: "External job added." });
    }
    setSaving(false);
    setShowForm(false);
    resetForm();
    fetchJobs();
  };

  const toggleActive = async (job: ExternalJob) => {
    await supabase.from("external_jobs").update({ is_active: !job.is_active }).eq("id", job.id);
    fetchJobs();
  };

  const deleteJob = async (id: string) => {
    if (!confirm("Delete this external job?")) return;
    await supabase.from("external_jobs").delete().eq("id", id);
    toast({ title: "Deleted" });
    fetchJobs();
  };

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
                <h2 className="font-semibold text-sm">Admin Panel</h2>
                <p className="text-xs text-muted-foreground">Management Console</p>
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
                        <button
                          onClick={() => navigate(item.path)}
                          className={`flex items-center gap-3 w-full ${item.path === "/admin/external-jobs" ? "bg-accent text-accent-foreground" : ""}`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="text-sm">{item.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <button onClick={() => { logout(); navigate("/admin/login"); }} className="flex items-center gap-3 w-full text-destructive">
                        <LogOut className="h-4 w-4" />
                        <span className="text-sm">Logout</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <h1 className="text-2xl font-bold">External Job Listings</h1>
                <p className="text-sm text-muted-foreground">Manage external job postings visible to candidates</p>
              </div>
            </div>
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Add External Job
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : jobs.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No external jobs yet. Click "Add External Job" to create one.</CardContent></Card>
          ) : (
            <div className="grid gap-4">
              {jobs.map((job) => (
                <Card key={job.id} className={`${!job.is_active ? "opacity-60" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-base">{job.job_title}</h3>
                          <Badge variant={job.is_active ? "default" : "secondary"} className="text-[10px]">
                            {job.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {job.job_type && <Badge variant="outline" className="text-[10px]">{job.job_type}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{job.company_name} {job.location ? `• ${job.location}` : ""}</p>
                        {job.salary_range && <p className="text-xs text-muted-foreground mt-1">Salary: {job.salary_range}</p>}
                        {((job as any).hr_name || (job as any).hr_contact) && (
                          <p className="text-xs text-muted-foreground mt-1">HR: {(job as any).hr_name}{(job as any).hr_contact ? ` • ${(job as any).hr_contact}` : ""}</p>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate max-w-xs">{job.apply_url}</a>
                        </div>
                        {job.skills?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {job.skills.map(s => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={job.is_active} onCheckedChange={() => toggleActive(job)} />
                        <Button size="sm" variant="ghost" onClick={() => openEdit(job)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteJob(job.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add/Edit Dialog */}
          <Dialog open={showForm} onOpenChange={(o) => { if (!o) { resetForm(); } setShowForm(o); }}>
            <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingJob ? "Edit External Job" : "Add External Job"}</DialogTitle>
              </DialogHeader>

              {/* AI Auto-Fill Section */}
              {!editingJob && (
                <div className="border border-dashed border-primary/40 rounded-lg p-4 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary">
                    <Sparkles className="h-4 w-4" />
                    AI Auto-Fill — Paste text or upload PDF
                  </div>
                  <Tabs defaultValue="text" className="w-full">
                    <TabsList className="w-full">
                      <TabsTrigger value="text" className="flex-1 gap-1.5"><FileText className="h-3.5 w-3.5" /> Paste Text</TabsTrigger>
                      <TabsTrigger value="pdf" className="flex-1 gap-1.5"><FileUp className="h-3.5 w-3.5" /> Upload PDF</TabsTrigger>
                    </TabsList>
                    <TabsContent value="text" className="space-y-2 mt-2">
                      <Textarea
                        value={pasteText}
                        onChange={e => setPasteText(e.target.value)}
                        placeholder="Paste job description text here..."
                        rows={4}
                        className="text-xs"
                      />
                      <Button size="sm" onClick={handleParseText} disabled={aiParsing} className="gap-1.5 w-full">
                        {aiParsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {aiParsing ? "Analyzing..." : "Analyze & Fill Fields"}
                      </Button>
                    </TabsContent>
                    <TabsContent value="pdf" className="mt-2">
                      <label className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors ${aiParsing ? "opacity-50 pointer-events-none" : "hover:border-primary/60 hover:bg-primary/5"}`}>
                        {aiParsing ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
                        <span className="text-sm text-muted-foreground">{aiParsing ? "Analyzing PDF..." : "Click to upload PDF"}</span>
                        <input type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} disabled={aiParsing} />
                      </label>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Company Name</Label>
                    <Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Job Title</Label>
                    <Input value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Apply URL</Label>
                  <Input value={form.apply_url} onChange={e => setForm(f => ({ ...f, apply_url: e.target.value }))} placeholder="https://company.com/careers/apply" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Location</Label>
                    <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Job Type</Label>
                    <Select value={form.job_type} onValueChange={v => setForm(f => ({ ...f, job_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full-time">Full Time</SelectItem>
                        <SelectItem value="part-time">Part Time</SelectItem>
                        <SelectItem value="contract">Contract</SelectItem>
                        <SelectItem value="internship">Internship</SelectItem>
                        <SelectItem value="fresher">Fresher</SelectItem>
                        <SelectItem value="experienced">Experienced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Salary Range</Label>
                    <Input value={form.salary_range} onChange={e => setForm(f => ({ ...f, salary_range: e.target.value }))} placeholder="e.g. 5-8 LPA" />
                  </div>
                  <div>
                    <Label>Experience Required</Label>
                    <Input value={form.experience_required} onChange={e => setForm(f => ({ ...f, experience_required: e.target.value }))} placeholder="e.g. 2-4 years" />
                  </div>
                </div>
                <div>
                  <Label>Skills (comma separated)</Label>
                  <Input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="React, Node.js, Python" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>HR Name</Label>
                    <Input value={form.hr_name} onChange={e => setForm(f => ({ ...f, hr_name: e.target.value }))} placeholder="e.g. Nikhil" />
                  </div>
                  <div>
                    <Label>HR Contact Number</Label>
                    <Input value={form.hr_contact} onChange={e => setForm(f => ({ ...f, hr_contact: e.target.value }))} placeholder="e.g. 9876543210" />
                  </div>
                </div>
                <div>
                  <Label>HR Email</Label>
                  <Input type="email" value={form.hr_email} onChange={e => setForm(f => ({ ...f, hr_email: e.target.value }))} placeholder="e.g. hr@company.com" />
                </div>
                <div>
                  <Label>Company Logo URL</Label>
                  <Input value={form.company_logo_url} onChange={e => setForm(f => ({ ...f, company_logo_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {editingJob ? "Update" : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ExternalJobs;
