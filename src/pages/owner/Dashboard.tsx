import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DollarSign,
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
    { title: "Total Revenue", value: "₹24.5L", change: "+18%", icon: DollarSign, color: "text-green-600" },
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
