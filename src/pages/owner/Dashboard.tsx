import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, LineChart, Line } from "recharts";
import { cn } from "@/lib/utils";
import { 
  Users, 
  Briefcase, 
  Building2, 
  TrendingUp, 
  Crown,
  LogOut,
  Settings,
  BarChart3,
  Shield,
  Database,
  IndianRupee,
  Globe,
  Activity,
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  Menu,
  CreditCard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UserRoleManagement from "@/components/owner/UserRoleManagement";
import LiveActivityMonitor from "@/components/owner/LiveActivityMonitor";

const sidebarItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "live-activity", label: "Live Activity", icon: Activity, hasLiveDot: true },
  { id: "user-roles", label: "User Roles", icon: Users },
  { id: "revenue", label: "Revenue Analytics", icon: BarChart3, path: "/owner/revenue-analytics" },
  { id: "plan-control", label: "Plan Control", icon: CreditCard, path: "/owner/plan-control" },
  { id: "jobs", label: "All Jobs", icon: Briefcase, path: "/owner/all-jobs" },
  { id: "database", label: "Database", icon: Database, path: "/owner/database-management" },
  { id: "growth", label: "Growth Metrics", icon: TrendingUp, path: "/owner/growth-metrics" },
  { id: "config", label: "System Config", icon: Settings, path: "/owner/system-configuration" },
];

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [liveCounts, setLiveCounts] = useState({
    admins: 0,
    subscriptions: 0,
    totalUsers: 0,
    totalJobs: 0,
    totalApplications: 0,
    totalEmployers: 0,
  });

  useEffect(() => {
    const checkAuthorization = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/owner/login"); return; }
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .maybeSingle();
      if (!roleData) {
        toast({ title: "Access Denied", description: "You do not have owner privileges.", variant: "destructive" });
        navigate("/owner/login");
        return;
      }
      setIsAuthorized(true);
      setIsLoading(false);
    };
    checkAuthorization();
  }, [navigate, toast]);

  useEffect(() => {
    if (!isAuthorized) return;
    const fetchCounts = async () => {
      const [adminsRes, subsRes, usersRes, jobsRes, appsRes, empRes] = await Promise.all([
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('jobs').select('id', { count: 'exact', head: true }),
        supabase.from('applications').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'employer'),
      ]);
      setLiveCounts({
        admins: adminsRes.count || 0,
        subscriptions: subsRes.count || 0,
        totalUsers: usersRes.count || 0,
        totalJobs: jobsRes.count || 0,
        totalApplications: appsRes.count || 0,
        totalEmployers: empRes.count || 0,
      });
    };
    fetchCounts();
  }, [isAuthorized]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
  };

  const handleSidebarClick = (item: typeof sidebarItems[0]) => {
    if (item.path) {
      navigate(item.path);
    } else {
      setActiveSection(item.id);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) return null;

  const stats = [
    { title: "Total Revenue", value: "₹24.5L", change: "+18%", icon: IndianRupee, color: "text-green-600" },
    { title: "Total Users", value: liveCounts.totalUsers.toLocaleString(), change: "Live", icon: Users, color: "text-blue-600" },
    { title: "Active Subscriptions", value: liveCounts.subscriptions.toLocaleString(), change: "Live", icon: Building2, color: "text-purple-600" },
    { title: "System Health", value: "99.9%", change: "Stable", icon: Globe, color: "text-orange-600" },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "h-screen sticky top-0 border-r border-border bg-card flex flex-col transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-60"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 shrink-0">
            <Crown className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-foreground truncate">Owner Panel</h1>
              <p className="text-xs text-muted-foreground">Full Access</p>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSidebarClick(item)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                activeSection === item.id && !item.path
                  ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {item.hasLiveDot && !sidebarCollapsed && (
                <span className="relative flex h-2 w-2 ml-auto">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              )}
              {item.hasLiveDot && sidebarCollapsed && (
                <span className="absolute right-2 top-2 flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-2 border-t border-border space-y-1">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Bar */}
        <header className="sticky top-0 z-10 bg-card/80 backdrop-blur border-b border-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="lg:hidden p-2 rounded-lg hover:bg-muted">
              <Menu className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-semibold text-foreground capitalize">
              {sidebarItems.find(i => i.id === activeSection)?.label || "Overview"}
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            <span>{liveCounts.admins} Admins</span>
            <span className="mx-1">•</span>
            <Users className="h-4 w-4" />
            <span>{liveCounts.totalUsers} Users</span>
          </div>
        </header>

        <div className="p-6">
          {activeSection === "overview" && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                  <Card key={index}>
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.title}</p>
                          <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                          <p className="text-sm text-green-600">{stat.change}</p>
                        </div>
                        <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                          <stat.icon className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Platform Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    Platform Analytics
                  </CardTitle>
                  <CardDescription>Key metrics and trends across the platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-base font-semibold text-foreground mb-1">Monthly User Growth</h3>
                      <p className="text-sm text-muted-foreground mb-3">New registrations over last 6 months</p>
                      <ChartContainer config={{
                        candidates: { label: "Candidates", color: "hsl(262, 83%, 58%)" },
                        employers: { label: "Employers", color: "hsl(220, 70%, 55%)" },
                      }} className="h-[250px] w-full">
                        <BarChart data={[
                          { month: "Oct", candidates: 1200, employers: 45 },
                          { month: "Nov", candidates: 1800, employers: 62 },
                          { month: "Dec", candidates: 2100, employers: 78 },
                          { month: "Jan", candidates: 2800, employers: 95 },
                          { month: "Feb", candidates: 3200, employers: 110 },
                          { month: "Mar", candidates: 3600, employers: 130 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="candidates" fill="var(--color-candidates)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="employers" fill="var(--color-employers)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-foreground mb-1">Job Postings & Applications</h3>
                      <p className="text-sm text-muted-foreground mb-3">Monthly activity overview</p>
                      <ChartContainer config={{
                        jobs: { label: "Jobs Posted", color: "hsl(262, 83%, 58%)" },
                        applications: { label: "Applications", color: "hsl(38, 92%, 50%)" },
                      }} className="h-[250px] w-full">
                        <BarChart data={[
                          { month: "Oct", jobs: 18, applications: 240 },
                          { month: "Nov", jobs: 25, applications: 380 },
                          { month: "Dec", jobs: 22, applications: 310 },
                          { month: "Jan", jobs: 30, applications: 520 },
                          { month: "Feb", jobs: 28, applications: 460 },
                          { month: "Mar", jobs: 35, applications: 620 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="jobs" fill="var(--color-jobs)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="applications" fill="var(--color-applications)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ChartContainer>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-foreground mb-1">Industry Distribution</h3>
                      <p className="text-sm text-muted-foreground mb-3">Candidates by industry category</p>
                      <ChartContainer config={{
                        education: { label: "Education", color: "hsl(262, 83%, 58%)" },
                        itCorporate: { label: "IT Corporate", color: "hsl(220, 70%, 55%)" },
                        nonIt: { label: "Non-IT", color: "hsl(142, 71%, 45%)" },
                        legal: { label: "Legal", color: "hsl(38, 92%, 50%)" },
                        civil: { label: "Civil Service", color: "hsl(0, 72%, 51%)" },
                      }} className="h-[250px] w-full">
                        <PieChart>
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Pie
                            data={[
                              { name: "Education", value: 35, fill: "hsl(262, 83%, 58%)" },
                              { name: "IT Corporate", value: 28, fill: "hsl(220, 70%, 55%)" },
                              { name: "Non-IT", value: 18, fill: "hsl(142, 71%, 45%)" },
                              { name: "Legal", value: 12, fill: "hsl(38, 92%, 50%)" },
                              { name: "Civil Service", value: 7, fill: "hsl(0, 72%, 51%)" },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={90}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          />
                        </PieChart>
                      </ChartContainer>
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-foreground mb-1">Revenue Trend (₹ Lakhs)</h3>
                      <p className="text-sm text-muted-foreground mb-3">Monthly revenue over last 6 months</p>
                      <ChartContainer config={{
                        revenue: { label: "Revenue", color: "hsl(142, 71%, 45%)" },
                      }} className="h-[250px] w-full">
                        <LineChart data={[
                          { month: "Oct", revenue: 2.1 },
                          { month: "Nov", revenue: 3.4 },
                          { month: "Dec", revenue: 2.8 },
                          { month: "Jan", revenue: 4.5 },
                          { month: "Feb", revenue: 5.2 },
                          { month: "Mar", revenue: 6.5 },
                        ]}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={3} dot={{ r: 5 }} />
                        </LineChart>
                      </ChartContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <h2 className="text-xl font-bold text-foreground">System Controls</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { title: "Admin Management", description: "Manage admin accounts", icon: Shield, action: () => setActiveSection("user-roles"), liveValue: `${liveCounts.admins} admins` },
                  { title: "Revenue Analytics", description: "Financial reports & insights", icon: BarChart3, action: () => navigate("/owner/revenue-analytics"), liveValue: `${liveCounts.subscriptions} active subs` },
                  { title: "System Configuration", description: "Core system settings", icon: Settings, action: () => navigate("/owner/system-configuration"), liveValue: "" },
                  { title: "Database Management", description: "Data & backups", icon: Database, action: () => navigate("/owner/database-management"), liveValue: `${liveCounts.totalUsers.toLocaleString()} records` },
                  { title: "All Jobs Overview", description: "Platform-wide job listings", icon: Briefcase, action: () => navigate("/owner/all-jobs"), liveValue: `${liveCounts.totalJobs} jobs` },
                  { title: "Growth Metrics", description: "Track platform growth", icon: TrendingUp, action: () => navigate("/owner/growth-metrics"), liveValue: `${liveCounts.totalApplications} applications` },
                ].map((action, index) => (
                  <Card 
                    key={index} 
                    className="hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer"
                    onClick={action.action}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <action.icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <CardTitle className="text-base">{action.title}</CardTitle>
                            <CardDescription className="text-xs">{action.description}</CardDescription>
                          </div>
                        </div>
                        {action.liveValue && (
                          <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                            {action.liveValue}
                          </span>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeSection === "live-activity" && <LiveActivityMonitor />}
          {activeSection === "user-roles" && <UserRoleManagement />}
        </div>
      </main>
    </div>
  );
};

export default OwnerDashboard;
