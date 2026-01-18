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
  Mail,
  Phone,
  MoreHorizontal,
  RefreshCw,
  XCircle,
  CheckCircle,
  ClipboardList,
  UserCog,
  MessageSquare
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface Subscription {
  id: string;
  employer_id: string;
  plan_name: string;
  plan_id: string;
  status: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  started_at: string;
  ends_at: string | null;
  auto_renew: boolean | null;
  employer?: {
    full_name: string;
    email: string;
    company_name: string | null;
    mobile: string | null;
  };
}

const SubscribedEmployers = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subscriptionsLoading, setSubscriptionsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"extend" | "cancel" | "renew" | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const checkAuthorization = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/admin/login");
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'owner'])
        .single();

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkAuthorization();
  }, [navigate, toast]);

  useEffect(() => {
    const fetchSubscriptions = async () => {
      if (!isAuthorized) return;

      try {
        const { data: subsData, error } = await supabase
          .from('subscriptions')
          .select('*')
          .order('started_at', { ascending: false });

        if (error) throw error;

        // Fetch employer details for each subscription
        const enrichedSubscriptions = await Promise.all(
          (subsData || []).map(async (sub) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email, company_name, mobile')
              .eq('id', sub.employer_id)
              .single();

            return {
              ...sub,
              employer: profileData || undefined
            };
          })
        );

        setSubscriptions(enrichedSubscriptions);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
        toast({
          title: "Error",
          description: "Failed to load subscriptions",
          variant: "destructive",
        });
      } finally {
        setSubscriptionsLoading(false);
      }
    };

    fetchSubscriptions();
  }, [isAuthorized, toast]);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const handleAction = async () => {
    if (!selectedSubscription || !actionType) return;

    setActionLoading(true);
    try {
      let updateData: any = {};

      switch (actionType) {
        case "extend":
          // Extend by 30 days
          const currentEnd = selectedSubscription.ends_at 
            ? new Date(selectedSubscription.ends_at) 
            : new Date();
          currentEnd.setDate(currentEnd.getDate() + 30);
          updateData = { ends_at: currentEnd.toISOString(), status: 'active' };
          break;
        case "cancel":
          updateData = { status: 'cancelled', auto_renew: false };
          break;
        case "renew":
          const newEnd = new Date();
          newEnd.setDate(newEnd.getDate() + 30);
          updateData = { status: 'active', ends_at: newEnd.toISOString(), auto_renew: true };
          break;
      }

      const { error } = await supabase
        .from('subscriptions')
        .update(updateData)
        .eq('id', selectedSubscription.id);

      if (error) throw error;

      // Update local state
      setSubscriptions(prev => prev.map(sub => 
        sub.id === selectedSubscription.id 
          ? { ...sub, ...updateData }
          : sub
      ));

      toast({
        title: "Success",
        description: `Subscription ${actionType}ed successfully`,
      });
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: "Error",
        description: "Failed to update subscription",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
      setActionDialogOpen(false);
      setSelectedSubscription(null);
      setActionType(null);
    }
  };

  const filteredSubscriptions = subscriptions.filter(sub => {
    const searchLower = searchQuery.toLowerCase();
    return (
      sub.employer?.full_name?.toLowerCase().includes(searchLower) ||
      sub.employer?.email?.toLowerCase().includes(searchLower) ||
      sub.employer?.company_name?.toLowerCase().includes(searchLower) ||
      sub.plan_name?.toLowerCase().includes(searchLower)
    );
  });

  const menuItems = [
    { title: "Dashboard", icon: Home, path: "/admin/dashboard" },
    { title: "Users", icon: Users, path: "/admin/users" },
    { title: "Subscribed Employers", icon: CreditCard, path: "/admin/subscribed-employers" },
    { title: "Subscribed Candidates", icon: UserCheck, path: "/admin/subscribed-candidates" },
    { title: "Trending Jobs", icon: TrendingUp, path: "/admin/trending-jobs" },
    { title: "Job Moderation", icon: Briefcase, path: "/admin/jobs" },
    { title: "Companies", icon: Building2, path: "/admin/companies" },
    { title: "Mock Interview", icon: ClipboardList, path: "/admin/mock-interview-pipeline" },
    { title: "Management", icon: UserCog, path: "/admin/management" },
    { title: "HR Negotiations", icon: MessageSquare, path: "/admin/hr-negotiations" },
    { title: "Reports", icon: BarChart3, path: "/admin/reports" },
    { title: "Audit Logs", icon: FileText, path: "/admin/audit" },
    { title: "Settings", icon: Settings, path: "/admin/settings" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">Cancelled</Badge>;
      case 'expired':
        return <Badge className="bg-gray-500/10 text-gray-600 border-gray-200">Expired</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">Pending</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
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
          
          <SidebarContent className="p-2">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-2">
                Main Menu
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <Link
                          to={item.path}
                          className={`w-full justify-start gap-3 px-3 py-2 rounded-lg transition-colors ${
                            location.pathname === item.path 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-muted"
                          }`}
                        >
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
            <Button 
              variant="ghost" 
              onClick={handleLogout} 
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger>
                  <Menu className="h-5 w-5" />
                </SidebarTrigger>
                <div>
                  <h1 className="text-xl font-bold">Subscribed Employers</h1>
                  <p className="text-sm text-muted-foreground">Manage employer subscriptions</p>
                </div>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </header>

          <div className="p-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{subscriptions.length}</p>
                      <p className="text-sm text-muted-foreground">Total Subscriptions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {subscriptions.filter(s => s.status === 'active').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-red-500/10">
                      <XCircle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {subscriptions.filter(s => s.status === 'cancelled').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Cancelled</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <RefreshCw className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {subscriptions.filter(s => s.auto_renew).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Auto-Renew</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Subscriptions Table */}
            <Card>
              <CardHeader>
                <CardTitle>Employer Subscriptions</CardTitle>
                <CardDescription>View and manage all employer subscription plans</CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredSubscriptions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No subscriptions found
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employer</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Amount</TableHead>
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
                              <p className="font-medium">{sub.employer?.full_name || 'N/A'}</p>
                              <p className="text-sm text-muted-foreground">{sub.employer?.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{sub.employer?.company_name || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{sub.plan_name}</Badge>
                          </TableCell>
                          <TableCell>
                            {sub.currency} {sub.amount}/{sub.billing_cycle}
                          </TableCell>
                          <TableCell>{getStatusBadge(sub.status)}</TableCell>
                          <TableCell>
                            {format(new Date(sub.started_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            {sub.ends_at ? format(new Date(sub.ends_at), 'MMM dd, yyyy') : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedSubscription(sub);
                                  setActionType("extend");
                                  setActionDialogOpen(true);
                                }}>
                                  <Calendar className="h-4 w-4 mr-2" />
                                  Extend 30 Days
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedSubscription(sub);
                                  setActionType("renew");
                                  setActionDialogOpen(true);
                                }}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Renew Subscription
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedSubscription(sub);
                                    setActionType("cancel");
                                    setActionDialogOpen(true);
                                  }}
                                  className="text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel Subscription
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

        {/* Action Dialog */}
        <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "extend" && "Extend Subscription"}
                {actionType === "cancel" && "Cancel Subscription"}
                {actionType === "renew" && "Renew Subscription"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "extend" && "This will extend the subscription by 30 days."}
                {actionType === "cancel" && "This will cancel the subscription. The user will lose access at the end of their billing period."}
                {actionType === "renew" && "This will renew the subscription for another billing cycle."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm">
                <strong>Employer:</strong> {selectedSubscription?.employer?.full_name}
              </p>
              <p className="text-sm">
                <strong>Plan:</strong> {selectedSubscription?.plan_name}
              </p>
              <p className="text-sm">
                <strong>Current Status:</strong> {selectedSubscription?.status}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAction}
                disabled={actionLoading}
                variant={actionType === "cancel" ? "destructive" : "default"}
              >
                {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarProvider>
  );
};

export default SubscribedEmployers;
