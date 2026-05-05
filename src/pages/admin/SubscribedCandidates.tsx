import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Briefcase, 
  Building2, 
  TrendingUp, 
  ShieldCheck,
  LogOut,
  Settings,
  BarChart3,
  FileText,
  Home,
  Menu,
  Search,
  Loader2,
  CreditCard,
  UserCheck,
  Calendar,
  Phone,
  MoreHorizontal,
  XCircle,
  CheckCircle,
  ClipboardList,
  UserCog,
  MessageSquare,
  Crown,
  Zap,
  UserX,
  Ticket
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { exportToExcel } from "@/utils/exportToExcel";
import { Download } from "lucide-react";

interface CandidateSubscription {
  id: string;
  candidate_id: string;
  plan: string;
  status: string;
  started_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  candidate?: {
    full_name: string;
    email: string;
    mobile: string | null;
    location: string | null;
  };
}

const SubscribedCandidates = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<CandidateSubscription[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog state for activate/deactivate
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<{ id: string; name: string; email: string } | null>(null);
  const [actionPlan, setActionPlan] = useState<"pro" | "premium">("pro");
  const [actionType, setActionType] = useState<"activate" | "deactivate">("activate");
  const [actionLoading, setActionLoading] = useState(false);

  // For activating a plan on a candidate who has no subscription yet
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [activateCandidateId, setActivateCandidateId] = useState<string>("");
  const [activatePlan, setActivatePlan] = useState<"pro" | "premium">("pro");
  const [activateLoading, setActivateLoading] = useState(false);

  useEffect(() => {
    const checkAuthorization = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login"); return; }
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'owner'])
        .single();
      if (!roleData) {
        toast({ title: "Access Denied", description: "You don't have permission.", variant: "destructive" });
        navigate("/"); return;
      }
      setIsAuthorized(true);
      setIsLoading(false);
    };
    checkAuthorization();
  }, [navigate, toast]);

  const fetchSubscriptions = async () => {
    if (!isAuthorized) return;
    setSubscriptionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('candidate_subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const enriched = await Promise.all(
        (data || []).map(async (sub) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, mobile, location')
            .eq('id', sub.candidate_id)
            .single();
          return { ...sub, candidate: profile || undefined } as CandidateSubscription;
        })
      );
      setSubscriptions(enriched);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      toast({ title: "Error", description: "Failed to load subscriptions", variant: "destructive" });
    } finally {
      setSubscriptionsLoading(false);
    }
  };

  useEffect(() => { fetchSubscriptions(); }, [isAuthorized]);

  const handleLogout = async () => { await logout(); navigate("/admin/login"); };

  // Activate a plan for a subscription row
  const handleActivate = async () => {
    if (!selectedCandidate) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('candidate_subscriptions')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('candidate_id', selectedCandidate.id)
        .eq('plan', actionPlan);
      if (error) throw error;
      toast({ title: "Plan Activated", description: `${actionPlan.charAt(0).toUpperCase() + actionPlan.slice(1)} plan activated for ${selectedCandidate.name}` });
      fetchSubscriptions();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to activate plan", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setActionDialogOpen(false);
    }
  };

  // Deactivate a plan
  const handleDeactivate = async () => {
    if (!selectedCandidate) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('candidate_subscriptions')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('candidate_id', selectedCandidate.id)
        .eq('plan', actionPlan);
      if (error) throw error;
      toast({ title: "Plan Deactivated", description: `${actionPlan.charAt(0).toUpperCase() + actionPlan.slice(1)} plan deactivated for ${selectedCandidate.name}` });
      fetchSubscriptions();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to deactivate plan", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setActionDialogOpen(false);
    }
  };

  // Create a new subscription for a candidate
  const handleCreateSubscription = async () => {
    if (!activateCandidateId) return;
    setActivateLoading(true);
    try {
      const endsAt = new Date();
      endsAt.setMonth(endsAt.getMonth() + 1);
      const { error } = await supabase
        .from('candidate_subscriptions')
        .insert({
          candidate_id: activateCandidateId,
          plan: activatePlan,
          status: 'active',
          ends_at: endsAt.toISOString(),
        });
      if (error) throw error;
      toast({ title: "Subscription Created", description: `${activatePlan.charAt(0).toUpperCase() + activatePlan.slice(1)} plan activated.` });
      fetchSubscriptions();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to create subscription", variant: "destructive" });
    } finally {
      setActivateLoading(false);
      setActivateDialogOpen(false);
      setActivateCandidateId("");
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q ||
      sub.candidate?.full_name?.toLowerCase().includes(q) ||
      sub.candidate?.email?.toLowerCase().includes(q);
    const matchesPlan = planFilter === "all" || sub.plan === planFilter;
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>;
      case 'trial': return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Trial</Badge>;
      case 'expired': return <Badge className="bg-red-500/10 text-red-600 border-red-200">Expired</Badge>;
      case 'cancelled': return <Badge className="bg-gray-500/10 text-gray-600 border-gray-200">Cancelled</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'pro': return <Badge className="bg-orange-500/10 text-orange-600 border-orange-200"><Zap className="h-3 w-3 mr-1" />Pro</Badge>;
      case 'premium': return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200"><Crown className="h-3 w-3 mr-1" />Premium</Badge>;
      default: return <Badge variant="secondary">{plan}</Badge>;
    }
  };

  const menuItems = [
    { title: "Dashboard", icon: Home, path: "/admin/dashboard" },
    { title: "Users", icon: Users, path: "/admin/users" },
    { title: "Subscribed Employers", icon: CreditCard, path: "/admin/subscribed-employers" },
    { title: "Subscribed Candidates", icon: UserCheck, path: "/admin/subscribed-candidates" },
    { title: "Candidate Resumes", icon: FileText, path: "/admin/candidate-resumes" },
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

  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    trial: subscriptions.filter(s => s.status === 'trial').length,
    pro: subscriptions.filter(s => s.plan === 'pro').length,
    premium: subscriptions.filter(s => s.plan === 'premium').length,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) return null;

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

        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger><Menu className="h-5 w-5" /></SidebarTrigger>
                <div>
                  <h1 className="text-xl font-bold">Subscribed Candidates</h1>
                  <p className="text-sm text-muted-foreground">Manage Pro & Premium candidate subscriptions</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => setActivateDialogOpen(true)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate Plan
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToExcel(
                    filteredSubscriptions.map(s => ({
                      Name: s.candidate?.full_name || 'N/A',
                      Email: s.candidate?.email || 'N/A',
                      Phone: s.candidate?.mobile || 'N/A',
                      Location: s.candidate?.location || 'N/A',
                      Plan: s.plan,
                      Status: s.status,
                      Started: format(new Date(s.started_at), 'MMM dd, yyyy'),
                      Expires: s.ends_at ? format(new Date(s.ends_at), 'MMM dd, yyyy') : 'N/A',
                    })),
                    'subscribed_candidates'
                  )}
                  disabled={filteredSubscriptions.length === 0}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </header>

          <div className="p-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
                  <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></div>
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-600" /></div>
                  <div><p className="text-2xl font-bold">{stats.active}</p><p className="text-xs text-muted-foreground">Active</p></div>
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10"><Calendar className="h-5 w-5 text-blue-600" /></div>
                  <div><p className="text-2xl font-bold">{stats.trial}</p><p className="text-xs text-muted-foreground">Trial</p></div>
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10"><Zap className="h-5 w-5 text-orange-600" /></div>
                  <div><p className="text-2xl font-bold">{stats.pro}</p><p className="text-xs text-muted-foreground">Pro</p></div>
                </div>
              </CardContent></Card>
              <Card><CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10"><Crown className="h-5 w-5 text-purple-600" /></div>
                  <div><p className="text-2xl font-bold">{stats.premium}</p><p className="text-xs text-muted-foreground">Premium</p></div>
                </div>
              </CardContent></Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name or email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Plan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>Candidate Subscriptions</CardTitle>
                <CardDescription>Activate or deactivate Pro/Premium plans for candidates</CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptionsLoading ? (
                  <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
                ) : filteredSubscriptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No subscriptions found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSubscriptions.map((sub) => (
                        <TableRow key={sub.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{sub.candidate?.full_name || 'N/A'}</p>
                              <p className="text-sm text-muted-foreground">{sub.candidate?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {sub.candidate?.mobile || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell>{getPlanBadge(sub.plan)}</TableCell>
                          <TableCell>{getStatusBadge(sub.status)}</TableCell>
                          <TableCell>{format(new Date(sub.started_at), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{sub.ends_at ? format(new Date(sub.ends_at), 'MMM dd, yyyy') : '—'}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {(sub.status === 'expired' || sub.status === 'cancelled' || sub.status === 'trial') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={() => {
                                    setSelectedCandidate({ id: sub.candidate_id, name: sub.candidate?.full_name || '', email: sub.candidate?.email || '' });
                                    setActionPlan(sub.plan as "pro" | "premium");
                                    setActionType("activate");
                                    setActionDialogOpen(true);
                                  }}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  Activate
                                </Button>
                              )}
                              {(sub.status === 'active' || sub.status === 'trial') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                  onClick={() => {
                                    setSelectedCandidate({ id: sub.candidate_id, name: sub.candidate?.full_name || '', email: sub.candidate?.email || '' });
                                    setActionPlan(sub.plan as "pro" | "premium");
                                    setActionType("deactivate");
                                    setActionDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-1" />
                                  Deactivate
                                </Button>
                              )}
                            </div>
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

        {/* Activate/Deactivate Confirmation Dialog */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "activate" ? "Activate" : "Deactivate"} {actionPlan.charAt(0).toUpperCase() + actionPlan.slice(1)} Plan
              </DialogTitle>
              <DialogDescription>
                {actionType === "activate"
                  ? `This will activate the ${actionPlan} plan for ${selectedCandidate?.name}, granting them access to premium features.`
                  : `This will deactivate the ${actionPlan} plan for ${selectedCandidate?.name}. They will lose access to premium features.`}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2">
              <p className="text-sm"><strong>Candidate:</strong> {selectedCandidate?.name}</p>
              <p className="text-sm"><strong>Email:</strong> {selectedCandidate?.email}</p>
              <p className="text-sm"><strong>Plan:</strong> {actionPlan.charAt(0).toUpperCase() + actionPlan.slice(1)}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={actionType === "activate" ? handleActivate : handleDeactivate}
                disabled={actionLoading}
                variant={actionType === "deactivate" ? "destructive" : "default"}
              >
                {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {actionType === "activate" ? "Activate" : "Deactivate"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create New Subscription Dialog */}
        <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Activate Plan for Candidate</DialogTitle>
              <DialogDescription>Enter the candidate's user ID and select a plan to activate.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Candidate ID</label>
                <Input
                  placeholder="Enter candidate UUID..."
                  value={activateCandidateId}
                  onChange={(e) => setActivateCandidateId(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Plan</label>
                <Select value={activatePlan} onValueChange={(v) => setActivatePlan(v as "pro" | "premium")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pro">Pro (₹15,000/mo)</SelectItem>
                    <SelectItem value="premium">Premium (₹30,000/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActivateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateSubscription} disabled={activateLoading || !activateCandidateId}>
                {activateLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Activate Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
};

export default SubscribedCandidates;
