import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, Briefcase, Building2, TrendingUp, ShieldCheck, LogOut, Settings,
  BarChart3, FileText, Home, Menu, Search, Loader2, CreditCard, UserCheck,
  UserX, ClipboardList, UserCog, MessageSquare, Ticket
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { exportToExcel } from "@/utils/exportToExcel";
import { Download } from "lucide-react";

interface UnsubscribedCandidate {
  id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  location: string | null;
  created_at: string | null;
}

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
  { title: "Reports", icon: BarChart3, path: "/admin/reports" },
  { title: "Audit Logs", icon: FileText, path: "/admin/audit" },
  { title: "Settings", icon: Settings, path: "/admin/settings" },
];

const UnsubscribedCandidates = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [candidates, setCandidates] = useState<UnsubscribedCandidate[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login"); return; }
      const { data: roleData } = await supabase
        .from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'owner']).single();
      if (!roleData) {
        toast({ title: "Access Denied", description: "No permission.", variant: "destructive" });
        navigate("/"); return;
      }
      setIsAuthorized(true);
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate, toast]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isAuthorized) return;
      try {
        // Get all candidate profiles
        const { data: allCandidates, error: candError } = await supabase
          .from('profiles')
          .select('id, full_name, email, mobile, location, created_at')
          .eq('role', 'candidate')
          .order('created_at', { ascending: false });
        if (candError) throw candError;

        // Get candidate IDs that have active subscriptions
        const { data: subs, error: subError } = await supabase
          .from('candidate_subscriptions')
          .select('candidate_id')
          .eq('status', 'active');
        if (subError) throw subError;

        const subscribedIds = new Set((subs || []).map(s => s.candidate_id));
        const unsubscribed = (allCandidates || []).filter(c => !subscribedIds.has(c.id));
        setCandidates(unsubscribed);
      } catch (error) {
        console.error('Error:', error);
        toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, [isAuthorized, toast]);

  const handleLogout = async () => { await logout(); navigate("/admin/login"); };

  const filtered = candidates.filter(c => {
    const q = searchQuery.toLowerCase();
    return !q || c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!isAuthorized) return null;

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-muted/30">
        <Sidebar className="border-r border-border">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary"><ShieldCheck className="h-5 w-5 text-primary-foreground" /></div>
              <div><h1 className="font-bold text-foreground">Gradia Admin</h1><p className="text-xs text-muted-foreground">Management Panel</p></div>
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
                          <item.icon className="h-4 w-4" /><span className="text-sm">{item.title}</span>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger><Menu className="h-5 w-5" /></SidebarTrigger>
                <div>
                  <h1 className="text-xl font-bold">Unsubscribed Candidates</h1>
                  <p className="text-sm text-muted-foreground">Candidates without active subscriptions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search candidates..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToExcel(
                    filtered.map(c => ({
                      Name: c.full_name,
                      Email: c.email,
                      Phone: c.mobile || 'N/A',
                      Location: c.location || 'N/A',
                      Joined: c.created_at ? format(new Date(c.created_at), 'MMM dd, yyyy') : 'N/A',
                    })),
                    'unsubscribed_candidates'
                  )}
                  disabled={filtered.length === 0}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </header>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10"><UserX className="h-5 w-5 text-red-600" /></div>
                    <div><p className="text-2xl font-bold">{candidates.length}</p><p className="text-sm text-muted-foreground">Unsubscribed Candidates</p></div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10"><Search className="h-5 w-5 text-primary" /></div>
                    <div><p className="text-2xl font-bold">{filtered.length}</p><p className="text-sm text-muted-foreground">Showing</p></div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Unsubscribed Candidates</CardTitle>
                <CardDescription>Candidates who do not have an active subscription plan</CardDescription>
              </CardHeader>
              <CardContent>
                {dataLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No unsubscribed candidates found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((cand) => (
                        <TableRow key={cand.id}>
                          <TableCell className="font-medium">{cand.full_name}</TableCell>
                          <TableCell>{cand.email}</TableCell>
                          <TableCell>{cand.mobile || 'N/A'}</TableCell>
                          <TableCell>{cand.location || 'N/A'}</TableCell>
                          <TableCell>{cand.created_at ? format(new Date(cand.created_at), 'MMM dd, yyyy') : 'N/A'}</TableCell>
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

export default UnsubscribedCandidates;
