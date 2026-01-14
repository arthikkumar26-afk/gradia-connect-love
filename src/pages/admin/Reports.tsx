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
  Menu,
  Loader2,
  Download,
  Calendar,
  CheckCircle,
  Clock,
  UserCheck
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

interface ReportStats {
  totalUsers: number;
  totalJobs: number;
  totalApplications: number;
  totalPlacements: number;
  usersByRole: { name: string; value: number }[];
  applicationsByStatus: { name: string; value: number }[];
  monthlyRegistrations: { month: string; users: number; jobs: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Reports = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30");
  const [stats, setStats] = useState<ReportStats | null>(null);

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

  const fetchReportData = async () => {
    try {
      setReportLoading(true);

      // Fetch all data
      const [profilesRes, jobsRes, applicationsRes] = await Promise.all([
        supabase.from('profiles').select('role, created_at'),
        supabase.from('jobs').select('status, created_at'),
        supabase.from('applications').select('status, applied_date'),
      ]);

      const profiles = profilesRes.data || [];
      const jobs = jobsRes.data || [];
      const applications = applicationsRes.data || [];

      // Calculate role distribution
      const roleCount = profiles.reduce((acc, p) => {
        acc[p.role] = (acc[p.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const usersByRole = Object.entries(roleCount).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

      // Calculate application status distribution
      const statusCount = applications.reduce((acc, a) => {
        const status = a.status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const applicationsByStatus = Object.entries(statusCount).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value
      }));

      // Calculate monthly registrations (last 6 months)
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const now = new Date();
      const monthlyData: { month: string; users: number; jobs: number }[] = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = date.toISOString();
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString();

        const usersInMonth = profiles.filter(p => 
          p.created_at && p.created_at >= monthStart && p.created_at <= monthEnd
        ).length;

        const jobsInMonth = jobs.filter(j => 
          j.created_at && j.created_at >= monthStart && j.created_at <= monthEnd
        ).length;

        monthlyData.push({
          month: monthNames[date.getMonth()],
          users: usersInMonth,
          jobs: jobsInMonth
        });
      }

      const placements = applications.filter(a => a.status === 'hired' || a.status === 'placed').length;

      setStats({
        totalUsers: profiles.length,
        totalJobs: jobs.length,
        totalApplications: applications.length,
        totalPlacements: placements,
        usersByRole,
        applicationsByStatus,
        monthlyRegistrations: monthlyData
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch report data.",
        variant: "destructive",
      });
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchReportData();
    }
  }, [isAuthorized, dateRange]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const handleExportReport = () => {
    toast({
      title: "Export Started",
      description: "Your report is being generated and will be downloaded shortly.",
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
              <h1 className="text-lg font-semibold">Reports & Analytics</h1>
            </div>
            <div className="flex items-center gap-3">
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleExportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {reportLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Users className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                          <p className="text-xs text-muted-foreground">Total Users</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <Briefcase className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{stats?.totalJobs || 0}</p>
                          <p className="text-xs text-muted-foreground">Total Jobs</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500/10">
                          <Clock className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{stats?.totalApplications || 0}</p>
                          <p className="text-xs text-muted-foreground">Applications</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <CheckCircle className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{stats?.totalPlacements || 0}</p>
                          <p className="text-xs text-muted-foreground">Placements</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Monthly Registrations Chart */}
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Monthly Activity</CardTitle>
                      <CardDescription>User registrations and job postings over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={stats?.monthlyRegistrations || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={2} name="Users" />
                            <Line type="monotone" dataKey="jobs" stroke="#10b981" strokeWidth={2} name="Jobs" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* User Distribution Chart */}
                  <Card className="border-0 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">User Distribution</CardTitle>
                      <CardDescription>Breakdown of users by role</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={stats?.usersByRole || []}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {(stats?.usersByRole || []).map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Application Status Chart */}
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Application Status Distribution</CardTitle>
                    <CardDescription>Current status of all applications</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats?.applicationsByStatus || []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Reports;
