import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Bell,
  Search,
  Menu,
  ChevronRight,
  Activity,
  UserCheck,
  AlertTriangle,
  CheckCircle2,
  Loader2
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
import { formatDistanceToNow } from "date-fns";

interface AdminStats {
  totalUsers: number;
  totalCandidates: number;
  totalCompanies: number;
  activeJobs: number;
  totalJobs: number;
  placements: number;
  pendingJobs: number;
  totalSponsors: number;
  activeSponsors: number;
  totalApplications: number;
  recentUsers: Array<{
    id: string;
    full_name: string;
    email: string;
    role: string;
    created_at: string;
  }>;
  recentJobs: Array<{
    id: string;
    job_title: string;
    employer_id: string;
    created_at: string;
    status: string;
  }>;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

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
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You do not have admin privileges.",
          variant: "destructive",
        });
        navigate("/admin/login");
        return;
      }

      setIsAuthorized(true);
      setIsLoading(false);
    };

    checkAuthorization();
  }, [navigate, toast]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!isAuthorized) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await supabase.functions.invoke('admin-stats', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (response.error) {
          console.error('Error fetching stats:', response.error);
          toast({
            title: "Error",
            description: "Failed to fetch dashboard statistics.",
            variant: "destructive",
          });
          return;
        }

        setStats(response.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    if (isAuthorized) {
      fetchStats();
    }
  }, [isAuthorized, toast]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const statsCards = [
    { 
      title: "Total Users", 
      value: statsLoading ? "..." : stats?.totalUsers?.toLocaleString() || "0", 
      subtitle: `${stats?.totalCandidates || 0} candidates`,
      icon: Users, 
      color: "bg-blue-500/10 text-blue-600" 
    },
    { 
      title: "Active Jobs", 
      value: statsLoading ? "..." : stats?.activeJobs?.toLocaleString() || "0", 
      subtitle: `${stats?.totalJobs || 0} total`,
      icon: Briefcase, 
      color: "bg-green-500/10 text-green-600" 
    },
    { 
      title: "Companies", 
      value: statsLoading ? "..." : stats?.totalCompanies?.toLocaleString() || "0", 
      subtitle: "Registered employers",
      icon: Building2, 
      color: "bg-purple-500/10 text-purple-600" 
    },
    { 
      title: "Placements", 
      value: statsLoading ? "..." : stats?.placements?.toLocaleString() || "0", 
      subtitle: `${stats?.totalApplications || 0} applications`,
      icon: TrendingUp, 
      color: "bg-orange-500/10 text-orange-600" 
    },
  ];

  const menuItems = [
    { title: "Dashboard", icon: Home, path: "/admin/dashboard" },
    { title: "Users", icon: Users, path: "/admin/users" },
    { title: "Trending Jobs", icon: TrendingUp, path: "/admin/trending-jobs" },
    { title: "Job Moderation", icon: Briefcase, path: "/admin/jobs" },
    { title: "Companies", icon: Building2, path: "/admin/companies" },
    { title: "Reports", icon: BarChart3, path: "/admin/reports" },
    { title: "Audit Logs", icon: FileText, path: "/admin/audit" },
    { title: "Settings", icon: Settings, path: "/admin/settings" },
  ];

  const pendingActions = [
    { title: "Pending Job Approvals", count: stats?.pendingJobs || 0, icon: Briefcase, status: "warning" },
    { title: "Active Sponsors", count: stats?.activeSponsors || 0, icon: Building2, status: "success" },
    { title: "Total Applications", count: stats?.totalApplications || 0, icon: FileText, status: "info" },
    { title: "Successful Placements", count: stats?.placements || 0, icon: CheckCircle2, status: "success" },
  ];

  const getActivityType = (role: string) => {
    switch (role) {
      case 'candidate': return 'user';
      case 'employer': return 'company';
      case 'sponsor': return 'sponsor';
      default: return 'system';
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        {/* Sidebar */}
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
                      <SidebarMenuButton
                        onClick={() => navigate(item.path)}
                        className={`w-full justify-start gap-3 px-3 py-2 rounded-lg transition-colors ${
                          location.pathname === item.path 
                            ? "bg-primary text-primary-foreground" 
                            : "hover:bg-muted"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="text-sm">{item.title}</span>
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Header */}
          <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger>
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search..." 
                  className="pl-9 w-64 h-9 bg-muted/50 border-0"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {(stats?.pendingJobs || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-[10px] text-destructive-foreground flex items-center justify-center">
                    {stats?.pendingJobs || 0}
                  </span>
                )}
              </Button>
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                A
              </div>
            </div>
          </header>

          {/* Dashboard Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {/* Welcome Section */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground">Welcome back, Admin</h1>
              <p className="text-muted-foreground">Here's what's happening with your platform today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {statsCards.map((stat, index) => (
                <Card key={index} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.title}</p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                          {statsLoading ? (
                            <Loader2 className="h-6 w-6 animate-spin" />
                          ) : (
                            stat.value
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{stat.subtitle}</p>
                      </div>
                      <div className={`p-3 rounded-xl ${stat.color}`}>
                        <stat.icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Pending Actions */}
              <Card className="lg:col-span-1 border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold">Platform Overview</CardTitle>
                  <CardDescription>Key metrics at a glance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingActions.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          item.status === 'warning' ? 'bg-yellow-500/10 text-yellow-600' :
                          item.status === 'error' ? 'bg-red-500/10 text-red-600' :
                          item.status === 'info' ? 'bg-blue-500/10 text-blue-600' :
                          'bg-green-500/10 text-green-600'
                        }`}>
                          <item.icon className="h-4 w-4" />
                        </div>
                        <span className="text-sm font-medium">{item.title}</span>
                      </div>
                      <Badge variant={item.status === 'success' ? 'default' : 'secondary'} className="text-xs">
                        {statsLoading ? "..." : item.count}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Recent Users</CardTitle>
                      <CardDescription>Latest registrations on the platform</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/admin/users')}>
                      View All <ChevronRight className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {statsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : stats?.recentUsers && stats.recentUsers.length > 0 ? (
                    <div className="space-y-4">
                      {stats.recentUsers.map((user) => (
                        <div key={user.id} className="flex items-center gap-4">
                          <div className={`p-2 rounded-full ${
                            getActivityType(user.role) === 'user' ? 'bg-blue-500/10 text-blue-600' :
                            getActivityType(user.role) === 'company' ? 'bg-purple-500/10 text-purple-600' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {user.role === 'employer' ? (
                              <Building2 className="h-3 w-3" />
                            ) : (
                              <Users className="h-3 w-3" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                          <Badge variant="outline" className="text-xs capitalize">{user.role}</Badge>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No recent users</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Jobs */}
            <Card className="mt-6 border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold">Recent Job Postings</CardTitle>
                    <CardDescription>Latest jobs posted on the platform</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate('/admin/jobs')}>
                    View All <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : stats?.recentJobs && stats.recentJobs.length > 0 ? (
                  <div className="space-y-3">
                    {stats.recentJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                            <Briefcase className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{job.job_title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                        <Badge 
                          variant={job.status === 'active' ? 'default' : 'secondary'} 
                          className="text-xs capitalize"
                        >
                          {job.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No recent job postings</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;