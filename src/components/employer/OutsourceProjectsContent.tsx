import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Briefcase, Users, Clock, Trash2, CheckCircle2, XCircle, Mail, Phone, RefreshCw, Sparkles, Loader2 } from "lucide-react";

const CURRENCY_SYMBOLS: Record<string, string> = { INR: "₹", USD: "$", EUR: "€", GBP: "£", AED: "AED " };
const PAY_TYPE_SUFFIX: Record<string, string> = { fixed: "", hourly: " /hr", daily: " /day" };
const PAY_TYPE_LABEL: Record<string, string> = { fixed: "Fixed price", hourly: "Per hour", daily: "Per day" };

interface Project {
  id: string;
  title: string;
  description: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string | null;
  pay_type: string | null;
  duration: string | null;
  skills: string[] | null;
  deliverables: string[] | null;
  status: string;
  created_at: string;
}

interface Proposal {
  id: string;
  project_id: string;
  freelancer_id: string;
  cover_letter: string | null;
  proposed_budget: number | null;
  proposed_duration: string | null;
  status: string;
  created_at: string;
  freelancer?: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
    profile_picture: string | null;
    govt_id_verified?: boolean | null;
  } | null;
}

export const OutsourceProjectsContent = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [proposalsByProject, setProposalsByProject] = useState<Record<string, Proposal[]>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    budget_min: "",
    budget_max: "",
    duration: "",
    skills: "",
    deliverables: "",
  });

  const resetForm = () =>
    setForm({ title: "", description: "", budget_min: "", budget_max: "", duration: "", skills: "", deliverables: "" });

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data: projs } = await supabase
      .from("outsource_projects")
      .select("*")
      .eq("employer_id", user.id)
      .order("created_at", { ascending: false });

    const list = (projs || []) as Project[];
    setProjects(list);

    if (list.length) {
      const ids = list.map((p) => p.id);
      const { data: props } = await supabase
        .from("project_proposals")
        .select("*")
        .in("project_id", ids)
        .order("created_at", { ascending: false });

      const proposals = (props || []) as Proposal[];
      const freelancerIds = Array.from(new Set(proposals.map((p) => p.freelancer_id)));
      let profilesMap: Record<string, any> = {};
      if (freelancerIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, profile_picture, govt_id_verified")
          .in("id", freelancerIds);
        (profs || []).forEach((pr: any) => (profilesMap[pr.id] = pr));
      }
      const grouped: Record<string, Proposal[]> = {};
      proposals.forEach((p) => {
        const enriched = { ...p, freelancer: profilesMap[p.freelancer_id] || null };
        (grouped[p.project_id] ||= []).push(enriched);
      });
      setProposalsByProject(grouped);
    } else {
      setProposalsByProject({});
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleAiGenerate = async () => {
    if (!form.title.trim() && !form.description.trim()) {
      toast({ title: "Add a title or description first", description: "AI needs at least one to work from.", variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-outsource-project", {
        body: {
          title: form.title,
          description: form.description,
          skills: form.skills,
          duration: form.duration,
          budget_min: form.budget_min,
          budget_max: form.budget_max,
          deliverables: form.deliverables,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setForm({
        title: data.title || form.title,
        description: data.description || form.description,
        budget_min: data.budget_min != null ? String(data.budget_min) : form.budget_min,
        budget_max: data.budget_max != null ? String(data.budget_max) : form.budget_max,
        duration: data.duration || form.duration,
        skills: Array.isArray(data.skills) ? data.skills.join(", ") : (data.skills || form.skills),
        deliverables: Array.isArray(data.deliverables) ? data.deliverables.join(", ") : (data.deliverables || form.deliverables),
      });
      toast({ title: "AI filled the project details", description: "Review and edit before posting." });
    } catch (e: any) {
      toast({ title: "AI generation failed", description: e.message || "Please try again", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!user?.id) return;
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("outsource_projects").insert({
      employer_id: user.id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      duration: form.duration.trim() || null,
      skills: form.skills ? form.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      deliverables: form.deliverables ? form.deliverables.split(",").map((s) => s.trim()).filter(Boolean) : [],
      status: "active",
    });
    setSaving(false);
    if (error) {
      toast({ title: "Failed to create project", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Project posted", description: "Freelancers can now view and bid on it." });
    resetForm();
    setOpen(false);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this project? All bids will also be removed.")) return;
    const { error } = await supabase.from("outsource_projects").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Project deleted" });
    fetchData();
  };

  const handleToggleStatus = async (p: Project) => {
    const next = p.status === "active" ? "closed" : "active";
    const { error } = await supabase.from("outsource_projects").update({ status: next }).eq("id", p.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    fetchData();
  };

  const handleProposalAction = async (proposalId: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("project_proposals").update({ status }).eq("id", proposalId);
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Bid ${status}` });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" /> Outsource Projects
          </h2>
          <p className="text-sm text-muted-foreground">
            Post projects for freelancers and review the bids they submit.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" /> New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Post Outsource Project</DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-between gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                <div className="text-xs text-muted-foreground">
                  Enter a title (and any details you have), then let AI complete the rest.
                </div>
                <Button type="button" size="sm" variant="default" onClick={handleAiGenerate} disabled={aiLoading}>
                  {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  {aiLoading ? "Generating..." : "AI Auto-fill"}
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Project Title *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Build a landing page" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Describe the work, goals, and expectations"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Budget Min (₹)</Label>
                    <Input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} />
                  </div>
                  <div>
                    <Label>Budget Max (₹)</Label>
                    <Input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Duration</Label>
                  <Input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 2 weeks" />
                </div>
                <div>
                  <Label>Skills (comma separated)</Label>
                  <Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="React, Tailwind, Figma" />
                </div>
                <div>
                  <Label>Deliverables (comma separated)</Label>
                  <Input value={form.deliverables} onChange={(e) => setForm({ ...form, deliverables: e.target.value })} placeholder="Source code, Design files" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={saving}>{saving ? "Posting..." : "Post Project"}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading projects...</div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">No outsource projects yet</p>
            <p className="text-sm text-muted-foreground mb-4">Post your first project to start receiving bids from freelancers.</p>
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((p) => {
            const bids = proposalsByProject[p.id] || [];
            return (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <CardTitle className="text-lg">{p.title}</CardTitle>
                        <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                      </div>
                      {p.description && <CardDescription className="mt-1">{p.description}</CardDescription>}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        {(p.budget_min || p.budget_max) && (
                          <span className="flex items-center gap-1">
                            <IndianRupee className="h-3 w-3" />
                            {(p.budget_min || 0).toLocaleString()} - {(p.budget_max || 0).toLocaleString()}
                          </span>
                        )}
                        {p.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {p.duration}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> {bids.length} bid{bids.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {p.skills && p.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {p.skills.map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleToggleStatus(p)}>
                        {p.status === "active" ? "Close" : "Reopen"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border-t pt-3">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" /> Freelancer Bids ({bids.length})
                    </h4>
                    {bids.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-3">No bids yet. Freelancers will appear here once they submit proposals.</p>
                    ) : (
                      <div className="space-y-2">
                        {bids.map((b) => (
                          <div key={b.id} className="rounded-md border p-3 bg-muted/30">
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                {b.freelancer?.profile_picture ? (
                                  <img src={b.freelancer.profile_picture} alt="" className="h-10 w-10 rounded-full object-cover" />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                    {(b.freelancer?.full_name || "F").charAt(0)}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-sm">{b.freelancer?.full_name || "Freelancer"}</span>
                                    {b.freelancer?.govt_id_verified && (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    )}
                                    <Badge
                                      variant={b.status === "accepted" ? "default" : b.status === "rejected" ? "destructive" : "secondary"}
                                      className="text-[10px]"
                                    >
                                      {b.status}
                                    </Badge>
                                  </div>
                                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                                    {b.freelancer?.email && (
                                      <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{b.freelancer.email}</span>
                                    )}
                                    {b.freelancer?.phone && (
                                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{b.freelancer.phone}</span>
                                    )}
                                    {b.proposed_budget != null && (
                                      <span className="flex items-center gap-1"><IndianRupee className="h-3 w-3" />{b.proposed_budget.toLocaleString()}</span>
                                    )}
                                    {b.proposed_duration && (
                                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.proposed_duration}</span>
                                    )}
                                  </div>
                                  {b.cover_letter && (
                                    <p className="text-xs mt-2 text-foreground/80 whitespace-pre-wrap">{b.cover_letter}</p>
                                  )}
                                </div>
                              </div>
                              {b.status === "pending" && (
                                <div className="flex gap-2">
                                  <Button size="sm" variant="default" onClick={() => handleProposalAction(b.id, "accepted")}>
                                    <CheckCircle2 className="h-4 w-4 mr-1" /> Accept
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => handleProposalAction(b.id, "rejected")}>
                                    <XCircle className="h-4 w-4 mr-1" /> Reject
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OutsourceProjectsContent;
