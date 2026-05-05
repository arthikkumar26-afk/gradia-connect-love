import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Home, Users, CreditCard, UserCheck, UserX, Briefcase, Building2,
  ClipboardList, UserCog, MessageSquare, Ticket, BarChart3, FileText,
  Settings, ShieldCheck, LogOut, Menu, Search, Loader2, Download,
  Archive, FileDown,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { downloadResume, getSignedResumeUrl } from "@/utils/resumeUrl";
import JSZip from "jszip";
import { format } from "date-fns";

interface CandidateRow {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  location: string | null;
  resume_url: string | null;
  preferred_role: string | null;
  created_at: string;
}

const CandidateResumes = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { toast } = useToast();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDownloading, setBulkDownloading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login"); return; }
      const { data: roleData } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", user.id).in("role", ["admin", "owner"]).single();
      if (!roleData) {
        toast({ title: "Access Denied", description: "Admin access required", variant: "destructive" });
        navigate("/"); return;
      }
      setIsAuthorized(true);
      setIsLoading(false);
    })();
  }, [navigate, toast]);

  const fetchCandidates = async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, mobile, location, resume_url, preferred_role, created_at")
        .eq("role", "candidate")
        .not("resume_url", "is", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setCandidates((data || []) as CandidateRow[]);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to load candidate resumes", variant: "destructive" });
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => { if (isAuthorized) fetchCandidates(); }, [isAuthorized]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return candidates;
    return candidates.filter(c =>
      c.full_name?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.mobile?.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q) ||
      c.preferred_role?.toLowerCase().includes(q)
    );
  }, [candidates, search]);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(c => c.id)));
  };

  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60);

  const handleDownloadOne = async (c: CandidateRow) => {
    if (!c.resume_url) return;
    const ext = c.resume_url.split(".").pop()?.split("?")[0] || "pdf";
    const fname = `${sanitize(c.full_name || "candidate")}_${c.id.slice(0, 8)}.${ext}`;
    await downloadResume(c.resume_url, fname);
  };

  const handleBulkDownload = async () => {
    const items = candidates.filter(c => selected.has(c.id) && c.resume_url);
    if (items.length === 0) {
      toast({ title: "No resumes selected", variant: "destructive" });
      return;
    }
    setBulkDownloading(true);
    try {
      const zip = new JSZip();
      let success = 0;
      await Promise.all(items.map(async (c) => {
        try {
          const signed = await getSignedResumeUrl(c.resume_url!);
          if (!signed) return;
          const res = await fetch(signed);
          if (!res.ok) return;
          const blob = await res.blob();
          const ext = c.resume_url!.split(".").pop()?.split("?")[0] || "pdf";
          const fname = `${sanitize(c.full_name || "candidate")}_${c.id.slice(0, 8)}.${ext}`;
          zip.file(fname, blob);
          success++;
        } catch (err) {
          console.error("Failed to fetch resume for", c.id, err);
        }
      }));
      if (success === 0) {
        toast({ title: "Download failed", description: "No resumes could be retrieved", variant: "destructive" });
        return;
      }
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `candidate_resumes_${format(new Date(), "yyyyMMdd_HHmm")}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "ZIP ready", description: `Downloaded ${success} of ${items.length} resumes` });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to build ZIP archive", variant: "destructive" });
    } finally {
      setBulkDownloading(false);
    }
  };

  const handleLogout = async () => { await logout(); navigate("/admin/login"); };

  const menuItems = [
    { title: "Dashboard", icon: Home, path: "/admin/dashboard" },
    { title: "Users", icon: Users, path: "/admin/users" },
    { title: "Subscribed Employers", icon: CreditCard, path: "/admin/subscribed-employers" },
    { title: "Subscribed Candidates", icon: UserCheck, path: "/admin/subscribed-candidates" },
    { title: "Candidate Resumes", icon: FileDown, path: "/admin/candidate-resumes" },
    { title: "Unsubscribed Employers", icon: UserX, path: "/admin/unsubscribed-employers" },
    { title: "Unsubscribed Candidates", icon: UserX, path: "/admin/unsubscribed-candidates" },
    { title: "Job Moderation", icon: Briefcase, path: "/admin/jobs" },
    { title: "External Jobs", icon: Briefcase, path: "/admin/external-jobs" },
    { title: "Companies", icon: Building2, path: "/admin/companies" },
    { title: "Mock Interview", icon: ClipboardList, path: "/admin/mock-interview-pipeline" },
    { title: "Management", icon: UserCog, path: "/admin/management" },
    { title: "Coupons", icon: Ticket, path: "/admin/coupons" },
    { title: "Reports", icon: BarChart3, path: "/admin/reports" },
    { title: "Audit Logs", icon: FileText, path: "/admin/audit" },
    { title: "Settings", icon: Settings, path: "/admin/settings" },
  ];

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!isAuthorized) return null;

  const allChecked = filtered.length > 0 && selected.size === filtered.length;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-muted/30">
        <Sidebar className="border-r border-border">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary"><ShieldCheck className="h-5 w-5 text-primary-foreground" /></div>
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

        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger><Menu className="h-5 w-5" /></SidebarTrigger>
                <div>
                  <h1 className="text-xl font-bold">Candidate Resumes</h1>
                  <p className="text-sm text-muted-foreground">Download individual or bulk candidate resumes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{selected.size} selected</Badge>
                <Button size="sm" onClick={handleBulkDownload} disabled={selected.size === 0 || bulkDownloading}>
                  {bulkDownloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Archive className="h-4 w-4 mr-2" />}
                  Download ZIP
                </Button>
              </div>
            </div>
          </header>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                <div><p className="text-2xl font-bold">{candidates.length}</p><p className="text-xs text-muted-foreground">Candidates with Resumes</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10"><FileDown className="h-5 w-5 text-green-600" /></div>
                <div><p className="text-2xl font-bold">{filtered.length}</p><p className="text-xs text-muted-foreground">Filtered</p></div>
              </CardContent></Card>
              <Card><CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10"><Archive className="h-5 w-5 text-orange-600" /></div>
                <div><p className="text-2xl font-bold">{selected.size}</p><p className="text-xs text-muted-foreground">Selected for ZIP</p></div>
              </CardContent></Card>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, email, phone, role, location..."
                value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
            </div>

            <Card>
              <CardContent className="p-0">
                {loadingList ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                ) : filtered.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">No candidate resumes found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox checked={allChecked} onCheckedChange={toggleAll} aria-label="Select all" />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Preferred Role</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggleSelect(c.id)} aria-label={`Select ${c.full_name}`} />
                          </TableCell>
                          <TableCell className="font-medium">{c.full_name || "—"}</TableCell>
                          <TableCell className="text-sm">{c.email || "—"}</TableCell>
                          <TableCell className="text-sm">{c.mobile || "—"}</TableCell>
                          <TableCell className="text-sm">{c.preferred_role || "—"}</TableCell>
                          <TableCell className="text-sm">{c.location || "—"}</TableCell>
                          <TableCell className="text-sm">{format(new Date(c.created_at), "MMM dd, yyyy")}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => handleDownloadOne(c)}>
                              <Download className="h-3.5 w-3.5 mr-1" /> Download
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default CandidateResumes;
