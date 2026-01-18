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
  MessageSquare,
  GraduationCap
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

// For now, we'll use mock test sessions as a proxy for candidate subscriptions
// In a real scenario, you'd have a separate candidate_subscriptions table
interface CandidateSubscription {
  id: string;
  candidate_id: string;
  status: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
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
  const [selectedSubscription, setSelectedSubscription] = useState<CandidateSubscription | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"activate" | "deactivate" | "extend" | null>(null);
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
        // Fetch mock interview sessions as candidate "subscriptions"
        const { data: sessionsData, error } = await supabase
          .from('mock_interview_sessions')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch candidate details for each session
        const enrichedSubscriptions = await Promise.all(
          (sessionsData || []).map(async (session) => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('full_name, email, mobile, location')
              .eq('id', session.candidate_id)
              .single();

            return {
              id: session.id,
              candidate_id: session.candidate_id,
              status: session.status,
              created_at: session.created_at,
              started_at: session.started_at,
              completed_at: session.completed_at,
              candidate: profileData || undefined
            };
          })
        );

        setSubscriptions(enrichedSubscriptions);
      } catch (error) {
        console.error('Error fetching candidate subscriptions:', error);
        toast({
          title: "Error",
          description: "Failed to load candidate subscriptions",
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
        case "activate":
          updateData = { status: 'in_progress' };
          break;
        case "deactivate":
          updateData = { status: 'cancelled' };
          break;
        case "extend":
          updateData = { status: 'pending' };
          break;
      }

      const { error } = await supabase
        .from('mock_interview_sessions')
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
        description: `Subscription ${actionType}d successfully`,
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
      sub.candidate?.full_name?.toLowerCase().includes(searchLower) ||
      sub.candidate?.email?.toLowerCase().includes(searchLower) ||
      sub.candidate?.location?.toLowerCase().includes(searchLower)
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
      case 'in_progress':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Active</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">Pending</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">Cancelled</Badge>;
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
                  <h1 className="text-xl font-bold">Subscribed Candidates</h1>
                  <p className="text-sm text-muted-foreground">Manage candidate subscriptions & access</p>
                </div>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search candidates..."
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
                      <GraduationCap className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{subscriptions.length}</p>
                      <p className="text-sm text-muted-foreground">Total Candidates</p>
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
                        {subscriptions.filter(s => s.status === 'in_progress').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <UserCheck className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {subscriptions.filter(s => s.status === 'completed').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Completed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-yellow-500/10">
                      <Calendar className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">
                        {subscriptions.filter(s => s.status === 'pending').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Subscriptions Table */}
            <Card>
              <CardHeader>
                <CardTitle>Candidate Subscriptions</CardTitle>
                <CardDescription>View and manage all candidate access and subscriptions</CardDescription>
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
                        <TableHead>Candidate</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Registered</TableHead>
                        <TableHead>Last Activity</TableHead>
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
                          <TableCell>{sub.candidate?.location || 'N/A'}</TableCell>
                          <TableCell>{getStatusBadge(sub.status)}</TableCell>
                          <TableCell>
                            {format(new Date(sub.created_at), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            {sub.completed_at 
                              ? format(new Date(sub.completed_at), 'MMM dd, yyyy')
                              : sub.started_at
                                ? format(new Date(sub.started_at), 'MMM dd, yyyy')
                                : 'N/A'
                            }
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
                                  setActionType("activate");
                                  setActionDialogOpen(true);
                                }}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Activate Access
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  setSelectedSubscription(sub);
                                  setActionType("extend");
                                  setActionDialogOpen(true);
                                }}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Reset Status
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedSubscription(sub);
                                    setActionType("deactivate");
                                    setActionDialogOpen(true);
                                  }}
                                  className="text-red-600"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Deactivate Access
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
                {actionType === "activate" && "Activate Candidate Access"}
                {actionType === "deactivate" && "Deactivate Candidate Access"}
                {actionType === "extend" && "Reset Candidate Status"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "activate" && "This will activate the candidate's access to all platform features."}
                {actionType === "deactivate" && "This will deactivate the candidate's access. They will not be able to use premium features."}
                {actionType === "extend" && "This will reset the candidate's status to pending."}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm">
                <strong>Candidate:</strong> {selectedSubscription?.candidate?.full_name}
              </p>
              <p className="text-sm">
                <strong>Email:</strong> {selectedSubscription?.candidate?.email}
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
                variant={actionType === "deactivate" ? "destructive" : "default"}
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

export default SubscribedCandidates;
