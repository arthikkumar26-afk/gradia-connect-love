import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  Plus, Trash2, Eye, Share2, Download, Globe, Github, Linkedin, Twitter,
  ExternalLink, Loader2, Link2, Copy, Pencil, Briefcase, Code, Sparkles, Upload
} from "lucide-react";
import jsPDF from "jspdf";

interface Portfolio {
  id: string;
  user_id: string;
  tagline: string;
  bio: string;
  skills: string[];
  website: string;
  github: string;
  linkedin: string;
  twitter: string;
  is_public: boolean;
}

interface PortfolioProject {
  id?: string;
  portfolio_id?: string;
  title: string;
  description: string;
  tech_stack: string[];
  project_url: string;
  image_url: string;
  start_date: string;
  end_date: string;
  display_order: number;
}

const emptyProject: PortfolioProject = {
  title: "", description: "", tech_stack: [], project_url: "",
  image_url: "", start_date: "", end_date: "", display_order: 0,
};

const PortfolioTab = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [activeTab, setActiveTab] = useState("edit");
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<PortfolioProject | null>(null);
  const [projectForm, setProjectForm] = useState<PortfolioProject>(emptyProject);
  const [newSkill, setNewSkill] = useState("");
  const [newTech, setNewTech] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const resumeRef = useRef<HTMLInputElement>(null);

  // Form state
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [website, setWebsite] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [twitter, setTwitter] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => { fetchPortfolio(); }, []);

  const fetchPortfolio = async () => {
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return;

      const { data: pData } = await supabase
        .from("freelancer_portfolios")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (pData) {
        setPortfolio(pData as Portfolio);
        setTagline(pData.tagline || "");
        setBio(pData.bio || "");
        setSkills((pData.skills as string[]) || []);
        setWebsite(pData.website || "");
        setGithub(pData.github || "");
        setLinkedin(pData.linkedin || "");
        setTwitter(pData.twitter || "");
        setIsPublic(pData.is_public !== false);

        const { data: projData } = await supabase
          .from("freelancer_portfolio_projects")
          .select("*")
          .eq("portfolio_id", pData.id)
          .order("display_order");

        setProjects((projData as PortfolioProject[]) || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return;

      const payload = {
        user_id: userId,
        tagline, bio, skills, website, github, linkedin, twitter, is_public: isPublic,
      };

      if (portfolio) {
        const { error } = await supabase.from("freelancer_portfolios").update(payload).eq("id", portfolio.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("freelancer_portfolios").insert(payload).select().single();
        if (error) throw error;
        setPortfolio(data as Portfolio);
      }
      toast.success("Portfolio saved!");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProject = async () => {
    if (!projectForm.title) { toast.error("Project title is required"); return; }
    if (!portfolio?.id) { toast.error("Save portfolio details first"); return; }

    try {
      const payload = {
        ...projectForm,
        portfolio_id: portfolio.id,
        display_order: editingProject ? projectForm.display_order : projects.length,
      };

      if (editingProject?.id) {
        const { error } = await supabase.from("freelancer_portfolio_projects")
          .update(payload).eq("id", editingProject.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("freelancer_portfolio_projects")
          .insert(payload);
        if (error) throw error;
      }

      await fetchPortfolio();
      setShowProjectModal(false);
      setEditingProject(null);
      setProjectForm(emptyProject);
      toast.success("Project saved!");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      const { error } = await supabase.from("freelancer_portfolio_projects").delete().eq("id", id);
      if (error) throw error;
      setProjects(projects.filter(p => p.id !== id));
      toast.success("Project deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills([...skills, newSkill.trim()]);
      setNewSkill("");
    }
  };

  const addTech = () => {
    if (newTech.trim() && !projectForm.tech_stack.includes(newTech.trim())) {
      setProjectForm({ ...projectForm, tech_stack: [...projectForm.tech_stack, newTech.trim()] });
      setNewTech("");
    }
  };

  const getPortfolioUrl = () => {
    const userId = profile?.id;
    return `${window.location.origin}/portfolio/${userId}`;
  };

  const copyLink = () => {
    navigator.clipboard.writeText(getPortfolioUrl());
    toast.success("Portfolio link copied!");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const name = profile?.full_name || "Freelancer";
    
    doc.setFontSize(24);
    doc.text(name, 20, 25);
    
    if (tagline) {
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(tagline, 20, 35);
    }

    doc.setTextColor(0);
    let y = 50;

    if (bio) {
      doc.setFontSize(14);
      doc.text("About", 20, y); y += 8;
      doc.setFontSize(10);
      const bioLines = doc.splitTextToSize(bio, 170);
      doc.text(bioLines, 20, y); y += bioLines.length * 5 + 10;
    }

    if (skills.length > 0) {
      doc.setFontSize(14);
      doc.text("Skills", 20, y); y += 8;
      doc.setFontSize(10);
      doc.text(skills.join(", "), 20, y); y += 15;
    }

    if (projects.length > 0) {
      doc.setFontSize(14);
      doc.text("Projects", 20, y); y += 8;
      projects.forEach(p => {
        if (y > 260) { doc.addPage(); y = 20; }
        doc.setFontSize(12);
        doc.text(`• ${p.title}`, 20, y); y += 6;
        if (p.description) {
          doc.setFontSize(9);
          const descLines = doc.splitTextToSize(p.description, 160);
          doc.text(descLines, 25, y); y += descLines.length * 4 + 3;
        }
        if (p.tech_stack?.length) {
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text(`Tech: ${p.tech_stack.join(", ")}`, 25, y);
          doc.setTextColor(0);
          y += 8;
        }
      });
    }

    // Contact
    y += 5;
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(14);
    doc.text("Contact", 20, y); y += 8;
    doc.setFontSize(10);
    if (profile?.email) { doc.text(`Email: ${profile.email}`, 20, y); y += 6; }
    if (profile?.mobile) { doc.text(`Phone: ${profile.mobile}`, 20, y); y += 6; }
    if (website) { doc.text(`Website: ${website}`, 20, y); y += 6; }
    if (github) { doc.text(`GitHub: ${github}`, 20, y); y += 6; }
    if (linkedin) { doc.text(`LinkedIn: ${linkedin}`, 20, y); y += 6; }

    doc.save(`${name.replace(/\s+/g, '_')}_Portfolio.pdf`);
    toast.success("PDF downloaded!");
  };

  const handleAiAnalyze = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (resumeRef.current) resumeRef.current.value = '';

    setAiLoading(true);
    try {
      // First parse resume text via existing edge function
      const formData = new FormData();
      formData.append('file', file);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const parseRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-resume`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
      );
      
      let resumeText = "";
      if (parseRes.ok) {
        const parsed = await parseRes.json();
        resumeText = JSON.stringify(parsed);
      }

      // Now generate portfolio via AI
      const { data, error } = await supabase.functions.invoke('generate-portfolio', {
        body: { profile, resumeText },
      });

      if (error) throw error;

      // Fill form fields
      if (data.tagline) setTagline(data.tagline);
      if (data.bio) setBio(data.bio);
      if (data.skills?.length) setSkills(data.skills);

      // Auto-save portfolio first
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return;

      const payload = {
        user_id: userId,
        tagline: data.tagline || tagline,
        bio: data.bio || bio,
        skills: data.skills || skills,
        website, github, linkedin, twitter,
        is_public: isPublic,
      };

      let portfolioId = portfolio?.id;
      if (portfolio) {
        await supabase.from("freelancer_portfolios").update(payload).eq("id", portfolio.id);
      } else {
        const { data: newP } = await supabase.from("freelancer_portfolios").insert(payload).select().single();
        if (newP) { setPortfolio(newP as Portfolio); portfolioId = newP.id; }
      }

      // Add AI-suggested projects
      if (data.projects?.length && portfolioId) {
        for (let i = 0; i < data.projects.length; i++) {
          const p = data.projects[i];
          await supabase.from("freelancer_portfolio_projects").insert({
            portfolio_id: portfolioId,
            title: p.title,
            description: p.description,
            tech_stack: p.tech_stack || [],
            display_order: projects.length + i,
          });
        }
      }

      await fetchPortfolio();
      toast.success("AI has analyzed your resume and created your portfolio!");
    } catch (err: any) {
      console.error("AI analyze error:", err);
      toast.error(err.message || "Failed to generate portfolio");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">My Portfolio</h2>
        <div className="flex gap-2 flex-wrap">
          <input ref={resumeRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleAiAnalyze} />
          <Button size="sm" onClick={() => resumeRef.current?.click()} disabled={aiLoading}
            className="bg-gradient-to-r from-accent to-accent/80">
            {aiLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing...</> : <><Sparkles className="h-4 w-4 mr-2" /> AI Analyze Resume</>}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setActiveTab("preview")}>
            <Eye className="h-4 w-4 mr-2" /> Preview
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowShareModal(true)}>
            <Share2 className="h-4 w-4 mr-2" /> Share
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <Download className="h-4 w-4 mr-2" /> PDF
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="edit">Edit Portfolio</TabsTrigger>
          <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        {/* EDIT TAB */}
        <TabsContent value="edit" className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Personal Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Tagline</Label>
                <Input placeholder="e.g. Full Stack Developer | React & Node.js Expert" value={tagline} onChange={e => setTagline(e.target.value)} />
              </div>
              <div>
                <Label>About Me / Bio</Label>
                <Textarea rows={4} placeholder="Tell about yourself, your experience, what you do..." value={bio} onChange={e => setBio(e.target.value)} />
              </div>
              <div>
                <Label>Skills</Label>
                <div className="flex gap-2 mb-2">
                  <Input placeholder="Add skill" value={newSkill} onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addSkill())} />
                  <Button type="button" size="sm" onClick={addSkill}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {skills.map(s => (
                    <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => setSkills(skills.filter(sk => sk !== s))}>
                      {s} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Social Links</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><Globe className="h-3 w-3" /> Website</Label>
                <Input placeholder="https://yourwebsite.com" value={website} onChange={e => setWebsite(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><Github className="h-3 w-3" /> GitHub</Label>
                <Input placeholder="https://github.com/username" value={github} onChange={e => setGithub(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><Linkedin className="h-3 w-3" /> LinkedIn</Label>
                <Input placeholder="https://linkedin.com/in/username" value={linkedin} onChange={e => setLinkedin(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1"><Twitter className="h-3 w-3" /> Twitter</Label>
                <Input placeholder="https://twitter.com/username" value={twitter} onChange={e => setTwitter(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <Label>Public Portfolio</Label>
                <p className="text-xs text-muted-foreground">Allow anyone with the link to view your portfolio</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </CardContent>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</> : "Save Portfolio"}
          </Button>
        </TabsContent>

        {/* PROJECTS TAB */}
        <TabsContent value="projects" className="space-y-4">
          <Button onClick={() => { setEditingProject(null); setProjectForm(emptyProject); setShowProjectModal(true); }}>
            <Plus className="h-4 w-4 mr-2" /> Add Project
          </Button>

          {projects.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>No projects added yet. Click "Add Project" to showcase your work.</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map(p => (
                <Card key={p.id}>
                  {p.image_url && (
                    <div className="h-40 overflow-hidden rounded-t-lg">
                      <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-foreground">{p.title}</h3>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          setEditingProject(p); setProjectForm(p); setShowProjectModal(true);
                        }}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => p.id && deleteProject(p.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                    <div className="flex flex-wrap gap-1">
                      {p.tech_stack?.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                    </div>
                    {p.project_url && (
                      <a href={p.project_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> View Project
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* PREVIEW TAB */}
        <TabsContent value="preview">
          <Card>
            <CardContent className="py-8">
              {/* Preview Header */}
              <div className="text-center mb-8">
                {profile?.profile_picture ? (
                  <img src={profile.profile_picture} alt="" className="h-24 w-24 rounded-full object-cover mx-auto mb-4 border-4 border-accent/20" />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Code className="h-10 w-10 text-accent" />
                  </div>
                )}
                <h2 className="text-2xl font-bold text-foreground">{profile?.full_name || "Your Name"}</h2>
                {tagline && <p className="text-muted-foreground mt-1">{tagline}</p>}
                <div className="flex justify-center gap-3 mt-3">
                  {website && <a href={website} target="_blank" rel="noopener noreferrer"><Globe className="h-5 w-5 text-muted-foreground hover:text-accent" /></a>}
                  {github && <a href={github} target="_blank" rel="noopener noreferrer"><Github className="h-5 w-5 text-muted-foreground hover:text-accent" /></a>}
                  {linkedin && <a href={linkedin} target="_blank" rel="noopener noreferrer"><Linkedin className="h-5 w-5 text-muted-foreground hover:text-accent" /></a>}
                  {twitter && <a href={twitter} target="_blank" rel="noopener noreferrer"><Twitter className="h-5 w-5 text-muted-foreground hover:text-accent" /></a>}
                </div>
              </div>

              {/* Bio */}
              {bio && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-foreground mb-2">About Me</h3>
                  <p className="text-muted-foreground whitespace-pre-line">{bio}</p>
                </div>
              )}

              {/* Skills */}
              {skills.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.map(s => <Badge key={s} className="bg-accent/10 text-accent border-accent/20">{s}</Badge>)}
                  </div>
                </div>
              )}

              {/* Projects */}
              {projects.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Projects</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {projects.map(p => (
                      <Card key={p.id} className="overflow-hidden">
                        {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-36 object-cover" />}
                        <CardContent className="pt-3 space-y-2">
                          <h4 className="font-semibold text-foreground">{p.title}</h4>
                          {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                          <div className="flex flex-wrap gap-1">
                            {p.tech_stack?.map(t => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                          </div>
                          {p.project_url && (
                            <a href={p.project_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent flex items-center gap-1 mt-1">
                              <ExternalLink className="h-3 w-3" /> View Project
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact */}
              <div className="mt-8 pt-6 border-t border-border text-center">
                <p className="text-sm text-muted-foreground">
                  {profile?.email && <span>{profile.email}</span>}
                  {profile?.mobile && <span> • {profile.mobile}</span>}
                  {profile?.location && <span> • {profile.location}</span>}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit Project Modal */}
      <Dialog open={showProjectModal} onOpenChange={setShowProjectModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit Project" : "Add Project"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Project Title *</Label>
              <Input value={projectForm.title} onChange={e => setProjectForm({ ...projectForm, title: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea rows={3} value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} />
            </div>
            <div>
              <Label>Tech Stack</Label>
              <div className="flex gap-2 mb-2">
                <Input placeholder="Add technology" value={newTech} onChange={e => setNewTech(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTech())} />
                <Button type="button" size="sm" onClick={addTech}>Add</Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {projectForm.tech_stack?.map(t => (
                  <Badge key={t} variant="secondary" className="cursor-pointer"
                    onClick={() => setProjectForm({ ...projectForm, tech_stack: projectForm.tech_stack.filter(x => x !== t) })}>
                    {t} ×
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>Project URL</Label>
              <Input placeholder="https://..." value={projectForm.project_url} onChange={e => setProjectForm({ ...projectForm, project_url: e.target.value })} />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input placeholder="https://... (screenshot or cover image)" value={projectForm.image_url} onChange={e => setProjectForm({ ...projectForm, image_url: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={projectForm.start_date} onChange={e => setProjectForm({ ...projectForm, start_date: e.target.value })} />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={projectForm.end_date} onChange={e => setProjectForm({ ...projectForm, end_date: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleSaveProject} className="w-full">
              {editingProject ? "Update Project" : "Add Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Portfolio</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Portfolio Link</Label>
              <div className="flex gap-2 mt-1">
                <Input readOnly value={getPortfolioUrl()} />
                <Button size="sm" onClick={copyLink}><Copy className="h-4 w-4" /></Button>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={exportPDF}>
              <Download className="h-4 w-4 mr-2" /> Download as PDF
            </Button>
            {!isPublic && (
              <p className="text-xs text-destructive">⚠ Your portfolio is currently private. Enable "Public Portfolio" to allow others to view it.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PortfolioTab;
