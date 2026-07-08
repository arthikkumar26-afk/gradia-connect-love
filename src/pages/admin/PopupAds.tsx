import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Users, Briefcase, Building2, ShieldCheck, LogOut, Settings, BarChart3, FileText,
  Home, Bell, Menu, Loader2, ClipboardList, UserCog, MessageSquare, CreditCard, Ticket, UserX, UserCheck,
  Megaphone, Plus, Trash2, Edit, Eye, EyeOff, Image, ExternalLink, Upload
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";

interface PopupAd {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  link_label: string | null;
  is_active: boolean;
  show_email_input: boolean;
  display_order: number;
  created_at: string;
}

const emptyForm = {
  title: "",
  description: "",
  image_url: "",
  link_url: "",
  link_label: "Learn More",
  is_active: true,
  show_email_input: false,
  display_order: 0,
};

const PopupAds = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ads, setAds] = useState<PopupAd[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<PopupAd | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ title: "Only image files allowed", variant: "destructive" });
      return;
    }
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const path = `popup-ads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from('campaign-attachments')
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from('campaign-attachments').getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
      toast({ title: "Image uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login"); return; }
      const { data: roleData } = await supabase
        .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').single();
      if (!roleData) { navigate("/admin/login"); return; }
      setIsAuthorized(true);
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate]);

  const fetchAds = async () => {
    setAdsLoading(true);
    const { data, error } = await supabase
      .from('popup_ads')
      .select('*')
      .order('display_order', { ascending: true });
    if (!error && data) setAds(data as PopupAd[]);
    setAdsLoading(false);
  };

  useEffect(() => { if (isAuthorized) fetchAds(); }, [isAuthorized]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const openCreate = () => {
    setEditingAd(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (ad: PopupAd) => {
    setEditingAd(ad);
    setForm({
      title: ad.title,
      description: ad.description || "",
      image_url: ad.image_url || "",
      link_url: ad.link_url || "",
      link_label: ad.link_label || "Learn More",
      is_active: ad.is_active,
      show_email_input: ad.show_email_input,
      display_order: ad.display_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editingAd) {
        const { error } = await supabase.from('popup_ads').update({
          title: form.title,
          description: form.description || null,
          image_url: form.image_url || null,
          link_url: form.link_url || null,
          link_label: form.link_label || null,
          is_active: form.is_active,
          show_email_input: form.show_email_input,
          display_order: form.display_order,
          updated_at: new Date().toISOString(),
        }).eq('id', editingAd.id);
        if (error) throw error;
        toast({ title: "Popup ad updated" });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('popup_ads').insert({
          title: form.title,
          description: form.description || null,
          image_url: form.image_url || null,
          link_url: form.link_url || null,
          link_label: form.link_label || null,
          is_active: form.is_active,
          show_email_input: form.show_email_input,
          display_order: form.display_order,
          created_by: user?.id,
        });
        if (error) throw error;
        toast({ title: "Popup ad created" });
      }
      setDialogOpen(false);
      fetchAds();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('popup_ads').delete().eq('id', id);
    if (error) {
      toast({ title: "Error deleting", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Popup ad deleted" });
      fetchAds();
    }
  };

  const toggleActive = async (ad: PopupAd) => {
    const { error } = await supabase.from('popup_ads').update({ is_active: !ad.is_active }).eq('id', ad.id);
    if (!error) fetchAds();
  };

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete ALL popup ads?")) return;
    const { error } = await supabase.from('popup_ads').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (!error) {
      toast({ title: "All popup ads deleted" });
      fetchAds();
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  if (!isAuthorized) return null;

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
    { title: "Popup Ads", icon: Megaphone, path: "/admin/popup-ads" },
    { title: "Event Alerts", icon: Bell, path: "/admin/event-alerts" },
    { title: "Reports", icon: BarChart3, path: "/admin/reports" },
    { title: "Audit Logs", icon: FileText, path: "/admin/audit" },
    { title: "Settings", icon: Settings, path: "/admin/settings" },
  ];

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
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2">Main Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <Link to={item.path} className={`w-full justify-start gap-3 px-3 py-2 rounded-lg transition-colors ${location.pathname === item.path ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
                          <item.icon className="h-4 w-4" />
                          <span className="text-sm">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <div className="mt-auto p-4 border-t border-border">
            <Button variant="ghost" onClick={handleLogout} className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" /><span>Logout</span>
            </Button>
          </div>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger><Menu className="h-5 w-5" /></SidebarTrigger>
              <h1 className="text-lg font-semibold">Popup Ads Management</h1>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Popup Ads</h2>
                <p className="text-muted-foreground">Create and manage popup advertisements shown to visitors.</p>
              </div>
              <div className="flex gap-2">
                {ads.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleDeleteAll}>
                    <Trash2 className="h-4 w-4 mr-1" /> Delete All
                  </Button>
                )}
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-1" /> Create Ad
                </Button>
              </div>
            </div>

            {adsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : ads.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Megaphone className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">No popup ads yet</p>
                  <p className="text-sm text-muted-foreground mb-4">Create your first popup ad to display to visitors.</p>
                  <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Create Ad</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ads.map((ad) => (
                  <Card key={ad.id} className={`relative transition-all ${!ad.is_active ? 'opacity-60' : ''}`}>
                    {ad.image_url && (
                      <div className="h-40 overflow-hidden rounded-t-lg bg-muted">
                        <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{ad.title}</CardTitle>
                        <Badge variant={ad.is_active ? "default" : "secondary"}>
                          {ad.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {ad.description && (
                        <CardDescription className="line-clamp-2">{ad.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-1 mb-3">
                        {ad.show_email_input && <Badge variant="outline" className="text-xs">Email Input</Badge>}
                        {ad.link_url && <Badge variant="outline" className="text-xs"><ExternalLink className="h-3 w-3 mr-1" />Link</Badge>}
                        <Badge variant="outline" className="text-xs">Order: {ad.display_order}</Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => toggleActive(ad)}>
                          {ad.is_active ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                          {ad.is_active ? "Disable" : "Enable"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(ad)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(ad.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingAd ? "Edit Popup Ad" : "Create Popup Ad"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ad title" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ad description" rows={3} />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Link URL</Label>
                <Input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label>Link Label</Label>
                <Input value={form.link_label} onChange={(e) => setForm({ ...form, link_label: e.target.value })} placeholder="Learn More" />
              </div>
            </div>
            <div>
              <Label>Display Order</Label>
              <Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Show Email Input</Label>
              <Switch checked={form.show_email_input} onCheckedChange={(v) => setForm({ ...form, show_email_input: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingAd ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default PopupAds;
