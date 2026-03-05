import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer } from "recharts";
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
  Activity
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import UserRoleManagement from "@/components/owner/UserRoleManagement";
import LiveActivityMonitor from "@/components/owner/LiveActivityMonitor";

const OwnerDashboard = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
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
      
      if (!user) {
        navigate("/owner/login");
        return;
      }

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'owner')
        .maybeSingle();

      if (!roleData) {
        toast({
          title: "Access Denied",
          description: "You do not have owner privileges.",
          variant: "destructive",
        });
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
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  const stats = [
    { title: "Total Revenue", value: "₹24.5L", change: "+18%", icon: IndianRupee, color: "text-green-600" },
    { title: "Total Users", value: liveCounts.totalUsers.toLocaleString(), change: "Live", icon: Users, color: "text-blue-600" },
    { title: "Active Subscriptions", value: liveCounts.subscriptions.toLocaleString(), change: "Live", icon: Building2, color: "text-purple-600" },
    { title: "System Health", value: "99.9%", change: "Stable", icon: Globe, color: "text-orange-600" },
  ];

  const ownerActions = [
    { title: "Admin Management", description: "Manage admin accounts", icon: Shield, path: "", liveValue: `${liveCounts.admins} admins` },
    { title: "Revenue Analytics", description: "Financial reports & insights", icon: BarChart3, path: "/owner/revenue-analytics", liveValue: `${liveCounts.subscriptions} active subs` },
    { title: "System Configuration", description: "Core system settings", icon: Settings, path: "/owner/system-configuration", liveValue: "" },
    { title: "Database Management", description: "Data & backups", icon: Database, path: "/owner/database-management", liveValue: `${liveCounts.totalUsers.toLocaleString()} records` },
    { title: "All Jobs Overview", description: "Platform-wide job listings", icon: Briefcase, path: "/owner/all-jobs", liveValue: `${liveCounts.totalJobs} jobs` },
    { title: "Growth Metrics", description: "Track platform growth", icon: TrendingUp, path: "/owner/growth-metrics", liveValue: `${liveCounts.totalApplications} applications` },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-purple-200 dark:border-purple-800 bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Crown className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Owner Dashboard</h1>
              <p className="text-sm text-muted-foreground">Full System Access</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="gap-2 border-purple-200 dark:border-purple-800">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="live-activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Live Activity
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
            </TabsTrigger>
            <TabsTrigger value="user-roles">User Roles</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <Card key={index} className="border-purple-100 dark:border-purple-900">
                  <CardContent className="p-6">
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

            {/* Platform Analytics - Single Section */}
            <Card className="border-purple-100 dark:border-purple-900">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  Platform Analytics
                </CardTitle>
                <CardDescription>Key metrics and trends across the platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Growth Bar Chart */}
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

                  {/* Job Postings Trend */}
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

                  {/* Industry Distribution Pie Chart */}
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

                  {/* Revenue Trend Line Chart */}
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

            {/* Owner Actions */}
            <h2 className="text-2xl font-bold text-foreground">System Controls</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ownerActions.map((action, index) => (
                <Card 
                  key={index} 
                  className="hover:shadow-lg hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer"
                  onClick={() => {
                    if (action.path) {
                      navigate(action.path);
                    } else {
                      setActiveTab("user-roles");
                    }
                  }}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                          <action.icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{action.title}</CardTitle>
                          <CardDescription>{action.description}</CardDescription>
                        </div>
                      </div>
                      {action.liveValue && (
                        <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                          {action.liveValue}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="live-activity">
            <LiveActivityMonitor />
          </TabsContent>

          <TabsContent value="user-roles">
            <UserRoleManagement />
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>System Settings</CardTitle>
                <CardDescription>Configure platform-wide settings</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Settings coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default OwnerDashboard;
