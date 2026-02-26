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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Plus, Briefcase, Clock, DollarSign, Trash2, Edit, Loader2, 
  Users, Star, UserCheck, Eye, CheckCircle, XCircle, TrendingUp
} from "lucide-react";

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

interface ProjectProposal {
  id: string;
  project_id: string;
  freelancer_id: string;
  cover_letter: string | null;
  proposed_budget: number | null;
  proposed_duration: string | null;
  status: string;
  created_at: string;
  freelancer_profile?: {
    full_name: string;
    email: string;
    experience_level: string | null;
    location: string | null;
    profile_picture: string | null;
  };
}

export function OutsourceProjectsContent() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<OutsourceProject[]>([]);
  const [proposals, setProposals] = useState<ProjectProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<OutsourceProject | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("projects");

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

  const fetchProposals = async () => {
    if (!user?.id || projects.length === 0) return;
    const projectIds = projects.map(p => p.id);
    const { data, error } = await supabase
      .from("project_proposals")
      .select("*, freelancer_profile:freelancer_id(full_name, email, experience_level, location, profile_picture)")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setProposals(data.map((p: any) => ({
        ...p,
        freelancer_profile: p.freelancer_profile
      })));
    }
  };

  useEffect(() => { fetchProjects(); }, [user?.id]);
  useEffect(() => { fetchProposals(); }, [projects]);

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

  const updateProposalStatus = async (proposalId: string, status: string) => {
    const { error } = await supabase.from("project_proposals").update({ status }).eq("id", proposalId);
    if (!error) { toast.success(`Proposal ${status}`); fetchProposals(); }
  };

  const getProjectProposals = (projectId: string) => proposals.filter(p => p.project_id === projectId);

  // Stats
  const activeProjects = projects.filter(p => p.status === "active").length;
  const closedProjects = projects.filter(p => p.status === "closed").length;
  const totalProposals = proposals.length;
  const pendingProposals = proposals.filter(p => p.status === "pending").length;

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

      {/* Project Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Briefcase className="h-6 w-6 text-accent mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{projects.length}</p>
            <p className="text-xs text-muted-foreground">Total Projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{activeProjects}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-6 w-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{totalProposals}</p>
            <p className="text-xs text-muted-foreground">Total Interested</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{pendingProposals}</p>
            <p className="text-xs text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="projects">My Projects</TabsTrigger>
          <TabsTrigger value="interested">Interested Freelancers ({totalProposals})</TabsTrigger>
          <TabsTrigger value="top-freelancers">Top Freelancers</TabsTrigger>
        </TabsList>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4 mt-4">
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
            projects.map((p) => {
              const projectProposals = getProjectProposals(p.id);
              const progressPercent = p.status === "closed" ? 100 : p.status === "active" ? (projectProposals.length > 0 ? 50 : 20) : 0;
              return (
                <Card key={p.id} className="hover:border-accent/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">{p.title}</h3>
                          <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                          {projectProposals.length > 0 && (
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Users className="h-3 w-3" /> {projectProposals.length} interested
                            </Badge>
                          )}
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
                          <div className="flex gap-2 flex-wrap mb-3">
                            {p.skills.map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                          </div>
                        )}
                        {/* Project Progress */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">Progress:</span>
                          <Progress value={progressPercent} className="h-2 flex-1 max-w-[200px]" />
                          <span className="text-xs text-muted-foreground">{p.status === "closed" ? "Completed" : projectProposals.length > 0 ? "In Review" : "Accepting"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        {projectProposals.length > 0 && (
                          <Button size="sm" variant="outline" onClick={() => { setSelectedProjectId(p.id); setActiveTab("interested"); }} className="gap-1">
                            <Eye className="h-4 w-4" /> View ({projectProposals.length})
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                        <Button size="sm" variant="outline" onClick={() => toggleStatus(p)}>{p.status === "active" ? "Close" : "Reopen"}</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Interested Freelancers Tab */}
        <TabsContent value="interested" className="space-y-4 mt-4">
          {proposals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Proposals Yet</h3>
                <p className="text-muted-foreground">Freelancers will appear here when they show interest in your projects</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Filter by project */}
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant={!selectedProjectId ? "default" : "outline"} onClick={() => setSelectedProjectId(null)}>All Projects</Button>
                {projects.map(p => (
                  <Button key={p.id} size="sm" variant={selectedProjectId === p.id ? "default" : "outline"} onClick={() => setSelectedProjectId(p.id)}>
                    {p.title}
                  </Button>
                ))}
              </div>
              {(selectedProjectId ? proposals.filter(p => p.project_id === selectedProjectId) : proposals).map((proposal) => {
                const project = projects.find(p => p.id === proposal.project_id);
                const fp = proposal.freelancer_profile;
                return (
                  <Card key={proposal.id} className="hover:border-accent/30 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border">
                            {fp?.profile_picture ? (
                              <img src={fp.profile_picture} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <UserCheck className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-foreground">{fp?.full_name || "Freelancer"}</h4>
                            <p className="text-sm text-muted-foreground">{fp?.email}</p>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              {fp?.experience_level && <span>Exp: {fp.experience_level}</span>}
                              {fp?.location && <span>📍 {fp.location}</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">For: <span className="font-medium text-foreground">{project?.title}</span></p>
                            {proposal.cover_letter && (
                              <p className="text-sm text-muted-foreground mt-2 bg-muted/30 p-2 rounded text-xs italic">"{proposal.cover_letter}"</p>
                            )}
                            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                              {proposal.proposed_budget && <span>Budget: ₹{proposal.proposed_budget.toLocaleString()}</span>}
                              {proposal.proposed_duration && <span>Duration: {proposal.proposed_duration}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={proposal.status === "accepted" ? "default" : proposal.status === "rejected" ? "destructive" : "secondary"}>
                            {proposal.status}
                          </Badge>
                          {proposal.status === "pending" && (
                            <>
                              <Button size="sm" variant="outline" className="gap-1 text-green-600 border-green-300 hover:bg-green-50" onClick={() => updateProposalStatus(proposal.id, "accepted")}>
                                <CheckCircle className="h-3.5 w-3.5" /> Accept
                              </Button>
                              <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-300 hover:bg-red-50" onClick={() => updateProposalStatus(proposal.id, "rejected")}>
                                <XCircle className="h-3.5 w-3.5" /> Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </TabsContent>

        {/* Top Freelancers Tab */}
        <TabsContent value="top-freelancers" className="mt-4">
          <TopFreelancersSection />
        </TabsContent>
      </Tabs>

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

// Top Freelancers Section Component
function TopFreelancersSection() {
  const [freelancers, setFreelancers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopFreelancers = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, experience_level, location, profile_picture, preferred_role, highest_qualification")
        .eq("role", "freelancer")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!error && data) setFreelancers(data);
      setLoading(false);
    };
    fetchTopFreelancers();
  }, []);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (freelancers.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Freelancers Yet</h3>
          <p className="text-muted-foreground">Freelancers will appear here once they register on the platform</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {freelancers.map((f) => (
        <Card key={f.id} className="hover:border-accent/30 transition-colors">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
                {f.profile_picture ? (
                  <img src={f.profile_picture} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserCheck className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-foreground">{f.full_name}</h4>
                <p className="text-xs text-muted-foreground">{f.preferred_role || f.email}</p>
                <div className="flex items-center gap-3 mt-1">
                  {f.experience_level && <Badge variant="outline" className="text-xs">{f.experience_level}</Badge>}
                  {f.location && <span className="text-xs text-muted-foreground">📍 {f.location}</span>}
                </div>
                {f.highest_qualification && <p className="text-xs text-muted-foreground mt-1">🎓 {f.highest_qualification}</p>}
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span className="text-sm font-medium text-foreground">4.5</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
