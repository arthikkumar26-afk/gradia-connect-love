import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Briefcase, Clock, DollarSign, Trash2, Edit, Loader2 } from "lucide-react";

interface OutsourceProject {
  id: string;
  title: string;
  description: string | null;
  budget_min: number | null;
  budget_max: number | null;
  duration: string | null;
  skills: string[];
  deliverables: string[];
  status: string;
  created_at: string;
}

export function OutsourceProjectsContent() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<OutsourceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<OutsourceProject | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [duration, setDuration] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [deliverablesInput, setDeliverablesInput] = useState("");

  const fetchProjects = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("outsource_projects")
      .select("*")
      .eq("employer_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setProjects(data);
    setLoading(false);
  };

  useEffect(() => { fetchProjects(); }, [user?.id]);

  const resetForm = () => {
    setTitle(""); setDescription(""); setBudgetMin(""); setBudgetMax("");
    setDuration(""); setSkillsInput(""); setDeliverablesInput("");
    setEditingProject(null);
  };

  const openEdit = (p: OutsourceProject) => {
    setEditingProject(p);
    setTitle(p.title);
    setDescription(p.description || "");
    setBudgetMin(p.budget_min?.toString() || "");
    setBudgetMax(p.budget_max?.toString() || "");
    setDuration(p.duration || "");
    setSkillsInput(p.skills?.join(", ") || "");
    setDeliverablesInput(p.deliverables?.join(", ") || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!user?.id) return;
    setSaving(true);

    const payload = {
      employer_id: user.id,
      title: title.trim(),
      description: description.trim() || null,
      budget_min: budgetMin ? Number(budgetMin) : null,
      budget_max: budgetMax ? Number(budgetMax) : null,
      duration: duration.trim() || null,
      skills: skillsInput ? skillsInput.split(",").map(s => s.trim()).filter(Boolean) : [],
      deliverables: deliverablesInput ? deliverablesInput.split(",").map(s => s.trim()).filter(Boolean) : [],
    };

    let error;
    if (editingProject) {
      ({ error } = await supabase.from("outsource_projects").update(payload).eq("id", editingProject.id));
    } else {
      ({ error } = await supabase.from("outsource_projects").insert(payload));
    }

    if (error) {
      toast.error("Failed to save project");
    } else {
      toast.success(editingProject ? "Project updated" : "Project posted");
      setShowForm(false);
      resetForm();
      fetchProjects();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("outsource_projects").delete().eq("id", id);
    if (!error) { toast.success("Project deleted"); fetchProjects(); }
  };

  const toggleStatus = async (p: OutsourceProject) => {
    const newStatus = p.status === "active" ? "closed" : "active";
    await supabase.from("outsource_projects").update({ status: newStatus }).eq("id", p.id);
    fetchProjects();
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Outsource Projects</h2>
          <p className="text-sm text-muted-foreground">Post projects for freelancers to work on</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Post Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Projects Yet</h3>
            <p className="text-muted-foreground mb-4">Post your first outsource project for freelancers</p>
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Post Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((p) => (
            <Card key={p.id} className="hover:border-accent/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
                      <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{p.description}</p>}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      {(p.budget_min || p.budget_max) && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5" />
                          ₹{p.budget_min?.toLocaleString() || "0"} - ₹{p.budget_max?.toLocaleString() || "0"}
                        </span>
                      )}
                      {p.duration && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {p.duration}</span>}
                    </div>
                    {p.skills?.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {p.skills.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="outline" onClick={() => toggleStatus(p)}>{p.status === "active" ? "Close" : "Reopen"}</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); resetForm(); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Post New Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Project Title *</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. React Dashboard Development" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the project requirements..." rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Budget Min (₹)</Label>
                <Input type="number" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="20000" />
              </div>
              <div>
                <Label>Budget Max (₹)</Label>
                <Input type="number" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="50000" />
              </div>
            </div>
            <div>
              <Label>Duration</Label>
              <Input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 2-3 months" />
            </div>
            <div>
              <Label>Skills (comma separated)</Label>
              <Input value={skillsInput} onChange={(e) => setSkillsInput(e.target.value)} placeholder="React, TypeScript, Tailwind" />
            </div>
            <div>
              <Label>Deliverables (comma separated)</Label>
              <Input value={deliverablesInput} onChange={(e) => setDeliverablesInput(e.target.value)} placeholder="Admin Panel, API Integration, Documentation" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingProject ? "Update Project" : "Post Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
