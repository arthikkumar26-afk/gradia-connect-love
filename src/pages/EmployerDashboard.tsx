import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import gradiaLogo from "@/assets/gradia-logo.png";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  CheckSquare, 
  Settings, 
  
  Clock,
  UserPlus,
  Calendar,
  Menu,
  X,
  GitBranch,
  Mail,
  LogOut,
  User,
  ClipboardList,
  Megaphone,
  Grid3X3,
  UserCheck,
  FileText,
  BookOpen,
  Crown,
  Wallet,
  Sparkles,
  Handshake,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import EmployerQRCode from "@/components/employer/EmployerQRCode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { JobManagementContent } from "@/components/employer/JobManagementContent";
import TalentPoolContent from "@/components/employer/TalentPoolContent";
import PlacementsContent from "@/components/employer/PlacementsContent";
import { TeamsContent } from "@/components/employer/TeamsContent";
import { InterviewPipelineContent } from "@/components/employer/InterviewPipelineContent";
import { EmailTemplatesEditor } from "@/components/employer/EmailTemplatesEditor";
import { FeedbackTemplatesContent } from "@/components/employer/FeedbackTemplatesContent";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { RegistrationContent } from "@/components/employer/RegistrationContent";
import { SubscriptionsContent } from "@/components/employer/SubscriptionsContent";
import { JobAlertContent } from "@/components/employer/JobAlertContent";
import { LiveInterviewMonitor } from "@/components/employer/LiveInterviewMonitor";
import { EmployerInterviewPipelineTracker } from "@/components/employer/EmployerInterviewPipelineTracker";
import { SMMContent } from "@/components/employer/SMMContent";
import { MyVacanciesContent } from "@/components/employer/MyVacanciesContent";
import { FeedbackMatrixContent } from "@/components/employer/FeedbackMatrixContent";
import { ConfirmationContent } from "@/components/employer/ConfirmationContent";
import { OfferLetterContent } from "@/components/employer/OfferLetterContent";
import { QPMContent } from "@/components/employer/QPMContent";
import { TestPapersContent } from "@/components/employer/TestPapersContent";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { UpgradePlanContent } from "@/components/employer/UpgradePlanContent";
import { EmployerSettingsContent } from "@/components/employer/EmployerSettingsContent";
import { AllCandidatesContent } from "@/components/employer/AllCandidatesContent";
import { SuggestedCandidatesContent } from "@/components/employer/SuggestedCandidatesContent";

import WalletTab from "@/components/candidate/WalletTab";
import { EmployerCampaignContent } from "@/components/employer/EmployerCampaignContent";
import { OutsourceProjectsContent } from "@/components/employer/OutsourceProjectsContent";
import { EmployerNotifications } from "@/components/employer/EmployerNotifications";


const EmployerDashboard = () => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newApplications, setNewApplications] = useState(0);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState({
    activeJobs: 0,
    applicationsReceived: 0,
    pendingReviews: 0,
    interviewsScheduled: 0,
    isLoading: true
  });
  const { user, profile, isAuthenticated, isLoading, logout } = useAuth();
  const [candidateStatusData, setCandidateStatusData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [applicationsPerJob, setApplicationsPerJob] = useState<{ name: string; applications: number }[]>([]);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Fetch wallet balance + subscribe to changes
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("wallets")
        .select("points_balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!cancelled) setWalletBalance(data?.points_balance ?? 0);
    };
    load();
    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user?.id]);

  // Listen for navigation events from notifications
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.menu) {
        setActiveMenu(detail.menu);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("employer:navigate", handler);
    return () => window.removeEventListener("employer:navigate", handler);
  }, []);

  // Role-based access control - wait for auth to finish loading
  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      navigate("/employer/login");
      return;
    }

    if (profile?.role === "candidate") {
      navigate("/candidate/dashboard");
      return;
    }
  }, [isAuthenticated, isLoading, profile, navigate]);

  // Fetch company name for employer
  useEffect(() => {
    const fetchCompanyName = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('employer_registrations')
          .select('company_name')
          .eq('employer_id', user.id)
          .single();
        
        if (data?.company_name) {
          setCompanyName(data.company_name);
        }
      }
    };
    
    fetchCompanyName();
  }, [user?.id, profile?.company_name]);

  // Fetch live dashboard stats
  useEffect(() => {
    const fetchDashboardStats = async () => {
      if (!user?.id) return;
      
      try {
        // Get active jobs count
        const { count: activeJobsCount } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('employer_id', user.id)
          .eq('status', 'active');

        // Get all job IDs for this employer
        const { data: myJobs } = await supabase
          .from('jobs')
          .select('id')
          .eq('employer_id', user.id);
        
        const jobIds = myJobs?.map(j => j.id) || [];

        // Get applications received (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count: applicationsCount } = await supabase
          .from('interview_candidates')
          .select('*', { count: 'exact', head: true })
          .in('job_id', jobIds.length > 0 ? jobIds : ['no-jobs'])
          .gte('applied_at', thirtyDaysAgo.toISOString());

        // Get pending reviews (candidates with status 'pending' or 'applied')
        const { count: pendingCount } = await supabase
          .from('interview_candidates')
          .select('*', { count: 'exact', head: true })
          .in('job_id', jobIds.length > 0 ? jobIds : ['no-jobs'])
          .in('status', ['pending', 'applied', 'screening']);

        // Get interviews scheduled this week
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 7);

        const { count: interviewsCount } = await supabase
          .from('interview_events')
          .select('*, interview_candidates!inner(job_id)', { count: 'exact', head: true })
          .in('interview_candidates.job_id', jobIds.length > 0 ? jobIds : ['no-jobs'])
          .gte('scheduled_at', startOfWeek.toISOString())
          .lt('scheduled_at', endOfWeek.toISOString());

        setDashboardStats({
          activeJobs: activeJobsCount || 0,
          applicationsReceived: applicationsCount || 0,
          pendingReviews: pendingCount || 0,
          interviewsScheduled: interviewsCount || 0,
          isLoading: false
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setDashboardStats(prev => ({ ...prev, isLoading: false }));
      }
    };

    fetchDashboardStats();
  }, [user?.id]);

  // Fetch analytics data for charts
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user?.id) return;

      const { data: myJobs } = await supabase
        .from('jobs')
        .select('id, job_title')
        .eq('employer_id', user.id);

      if (!myJobs || myJobs.length === 0) return;
      const jobIds = myJobs.map(j => j.id);

      // Fetch candidate status distribution
      const { data: candidates } = await supabase
        .from('interview_candidates')
        .select('status')
        .in('job_id', jobIds);

      if (candidates) {
        const statusCounts: Record<string, number> = {};
        candidates.forEach(c => {
          const s = c.status || 'applied';
          statusCounts[s] = (statusCounts[s] || 0) + 1;
        });
        const STATUS_COLORS: Record<string, string> = {
          applied: 'hsl(var(--primary))',
          screening: 'hsl(var(--accent))',
          pending: 'hsl(var(--warning))',
          shortlisted: 'hsl(142 71% 45%)',
          rejected: 'hsl(var(--destructive))',
          hired: 'hsl(var(--success))',
          interview: 'hsl(262 83% 58%)',
        };
        const pieData = Object.entries(statusCounts).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
          color: STATUS_COLORS[name] || 'hsl(var(--muted-foreground))',
        }));
        setCandidateStatusData(pieData);
      }

      // Fetch applications per job (top 6)
      const { data: appCounts } = await supabase
        .from('interview_candidates')
        .select('job_id')
        .in('job_id', jobIds);

      if (appCounts) {
        const jobCountMap: Record<string, number> = {};
        appCounts.forEach(c => {
          jobCountMap[c.job_id] = (jobCountMap[c.job_id] || 0) + 1;
        });
        const barData = myJobs
          .map(j => ({
            name: j.job_title.length > 14 ? j.job_title.slice(0, 14) + '…' : j.job_title,
            applications: jobCountMap[j.id] || 0,
          }))
          .sort((a, b) => b.applications - a.applications)
          .slice(0, 6);
        setApplicationsPerJob(barData);
      }
    };
    fetchAnalytics();
  }, [user?.id]);

  // Real-time subscription for new applications
  useEffect(() => {
    if (!user?.id) return;

    // First, get all job IDs for this employer
    const setupRealtimeSubscription = async () => {
      const { data: myJobs } = await supabase
        .from('jobs')
        .select('id, job_title')
        .eq('employer_id', user.id);

      if (!myJobs || myJobs.length === 0) return;

      const jobIds = myJobs.map(j => j.id);
      const jobTitles = Object.fromEntries(myJobs.map(j => [j.id, j.job_title]));

      // Subscribe to new interview_candidates for employer's jobs
      const channel = supabase
        .channel('employer-applications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'interview_candidates'
          },
          async (payload) => {
            const newCandidate = payload.new as any;
            
            // Check if this application is for one of our jobs
            if (jobIds.includes(newCandidate.job_id)) {
              // Fetch candidate name
              const { data: candidateProfile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', newCandidate.candidate_id)
                .single();

              const candidateName = candidateProfile?.full_name || 'A candidate';
              const jobTitle = jobTitles[newCandidate.job_id] || 'your job';
              const aiScore = newCandidate.ai_score;

              // Show toast notification
              toast.success(
                `🎉 New Application!`,
                {
                  description: `${candidateName} applied for ${jobTitle}${aiScore ? ` (AI Score: ${aiScore}%)` : ''}`,
                  duration: 8000,
                  action: {
                    label: "View",
                    onClick: () => setActiveMenu("talent-pool")
                  }
                }
              );

              // Update badge count
              setNewApplications(prev => prev + 1);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = setupRealtimeSubscription();
    
    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/employer/dashboard" },
    { id: "wallet", label: "My Wallet", icon: Wallet, path: "/employer/wallet" },
    { id: "jobs", label: "Vacancies List", icon: Briefcase, path: "/employer/jobs" },
    { id: "qpm", label: "Smart Assessment", icon: BookOpen, path: "/employer/qpm" },
    { id: "test-papers", label: "Test Papers", icon: FileText, path: "/employer/test-papers" },
    { id: "smm", label: "SMM", icon: Megaphone, path: "/employer/smm" },
    { id: "my-vacancies", label: "My Vacancies", icon: Briefcase, path: "/employer/my-vacancies" },
    { id: "talent-pool", label: "Candidate Data", icon: Users, path: "/employer/talent-pool" },
    { id: "suggested-candidates", label: "Suggested Candidates", icon: Sparkles, path: "/employer/suggested-candidates" },
    { id: "interview-pipeline", label: "Interview Pipeline", icon: GitBranch, path: "/employer/interview-pipeline" },
    { id: "email-templates", label: "Email Templates", icon: Mail, path: "/employer/email-templates" },
    { id: "feedback-matrix", label: "Feedback Matrix", icon: Grid3X3, path: "/employer/feedback-matrix" },
    { id: "confirmation", label: "Confirmation", icon: UserCheck, path: "/employer/confirmation" },
    { id: "offer-letter", label: "Offer Letter", icon: FileText, path: "/employer/offer-letter" },
    { id: "approvals", label: "Approvals", icon: CheckSquare, path: "/employer/approvals" },
    { id: "all-candidates", label: "Candidates", icon: ClipboardList, path: "/employer/candidates" },
    { id: "campaigns", label: "Campaigns", icon: Megaphone, path: "/employer/campaigns" },
    { id: "outsource-projects", label: "Outsource Projects", icon: Handshake, path: "/employer/outsource-projects" },
    
    
    { id: "upgrade-plan", label: "Upgrade Plan", icon: Crown, path: "/employer/upgrade-plan" },
    { id: "settings", label: "Settings", icon: Settings, path: "/employer/settings" },
    
  ];

  const dashboardCards = [
    {
      title: "Active Job Posts",
      value: dashboardStats.isLoading ? "..." : dashboardStats.activeJobs.toString(),
      subtitle: "Currently hiring",
      icon: Briefcase,
      gradient: "from-primary/20 to-primary/5",
    },
    {
      title: "Applications Received",
      value: dashboardStats.isLoading ? "..." : dashboardStats.applicationsReceived.toString(),
      subtitle: "Last 30 days",
      icon: UserPlus,
      gradient: "from-success/20 to-success/5",
    },
    {
      title: "Pending Reviews",
      value: dashboardStats.isLoading ? "..." : dashboardStats.pendingReviews.toString(),
      subtitle: "Awaiting feedback",
      icon: Clock,
      gradient: "from-warning/20 to-warning/5",
    },
    {
      title: "Interviews Scheduled",
      value: dashboardStats.isLoading ? "..." : dashboardStats.interviewsScheduled.toString(),
      subtitle: "This week",
      icon: Calendar,
      gradient: "from-accent/20 to-accent/5",
    },
  ];

  return (
    <div className="bg-subtle flex min-h-[calc(100vh-64px)]">
      {/* Sidebar - Always visible with toggle */}
      <aside 
        className={`${
          sidebarOpen ? "w-64 min-w-64" : "w-16 min-w-16"
        } bg-card border-r border-border transition-all duration-300 flex flex-col flex-shrink-0 sticky top-[64px] h-[calc(100vh-64px)]`}
      >
        {/* User Info */}
        {sidebarOpen && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {companyName || profile?.company_name || profile?.full_name || "Employer"}
                </p>
                <p className="text-xs text-muted-foreground">Employer</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1 pt-6 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            const showBadge = item.id === "talent-pool" && newApplications > 0;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveMenu(item.id);
                  // Clear badge when viewing talent pool
                  if (item.id === "talent-pool") {
                    setNewApplications(0);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && (
                  <>
                    <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>
                    {item.id === "wallet" && walletBalance !== null && (
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5 font-semibold">
                        {walletBalance.toLocaleString("en-IN")} pts
                      </Badge>
                    )}
                    {showBadge && (
                      <Badge className="bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 animate-pulse">
                        {newApplications}
                      </Badge>
                    )}
                  </>
                )}
                {!sidebarOpen && showBadge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-border">
          <Button 
            variant="ghost" 
            className={`${sidebarOpen ? "w-full justify-start" : "w-full justify-center"}`} 
            onClick={handleLogout}
            title={!sidebarOpen ? "Logout" : undefined}
          >
            <LogOut className="h-4 w-4" />
            {sidebarOpen && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {menuItems.find(item => item.id === activeMenu)?.label || "Dashboard"}
            </h1>
          </div>

          {user?.id && <EmployerNotifications employerId={user.id} />}
        </header>


        {/* Dashboard Content */}
        <main className="flex-1 p-4 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
          {activeMenu === "dashboard" && (
              <>
                {/* Summary Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {dashboardCards.map((card, index) => {
                    const Icon = card.icon;
                    
                    return (
                      <Card 
                        key={index}
                        className="overflow-hidden hover:shadow-large transition-all duration-300 animate-fade-in border-border"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <CardHeader className={`bg-gradient-to-br ${card.gradient} pb-2`}>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-sm font-semibold text-foreground">
                              {card.title}
                            </CardTitle>
                            <div className="p-1.5 bg-background/50 rounded-lg">
                              <Icon className="h-4 w-4 text-accent" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-3 pb-3">
                          <div className="text-3xl font-bold text-foreground mb-0.5">
                            {card.value}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {card.subtitle}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* QR Code & Quick Actions Section */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* QR Code Card */}
                  {user?.id && (
                    <EmployerQRCode 
                      employerId={user.id} 
                      companyName={profile?.company_name || profile?.full_name} 
                    />
                  )}

                  {/* Quick Actions Section */}
                  <div className="lg:col-span-2 bg-card rounded-xl border border-border p-4 shadow-soft">
                    <h3 className="text-base font-semibold text-foreground mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <Button variant="outline" className="justify-start h-auto py-3" onClick={() => setActiveMenu("jobs")}>
                        <Briefcase className="h-4 w-4 mr-2" />
                        <div className="text-left">
                          <div className="text-sm font-medium">Manage Jobs</div>
                          <div className="text-xs opacity-70">View postings</div>
                        </div>
                      </Button>

                      <Button variant="outline" className="justify-start h-auto py-3" onClick={() => { setActiveMenu("talent-pool"); setNewApplications(0); }}>
                        <Users className="h-4 w-4 mr-2" />
                        <div className="text-left">
                          <div className="text-sm font-medium">Browse Talent</div>
                          <div className="text-xs opacity-70">Find candidates</div>
                        </div>
                      </Button>

                      <Button variant="outline" className="justify-start h-auto py-3" onClick={() => setActiveMenu("approvals")}>
                        <CheckSquare className="h-4 w-4 mr-2" />
                        <div className="text-left">
                          <div className="text-sm font-medium">Review Approvals</div>
                          <div className="text-xs opacity-70">Pending actions</div>
                        </div>
                      </Button>

                      <Button variant="outline" className="justify-start h-auto py-3" onClick={() => setActiveMenu("interview-pipeline")}>
                        <GitBranch className="h-4 w-4 mr-2" />
                        <div className="text-left">
                          <div className="text-sm font-medium">Interview Pipeline</div>
                          <div className="text-xs opacity-70">Track stages</div>
                        </div>
                      </Button>

                      <Button variant="outline" className="justify-start h-auto py-3" onClick={() => setActiveMenu("question-bank")}>
                        <ClipboardList className="h-4 w-4 mr-2" />
                        <div className="text-left">
                          <div className="text-sm font-medium">Question Bank</div>
                          <div className="text-xs opacity-70">Manage tests</div>
                        </div>
                      </Button>

                      <Button variant="outline" className="justify-start h-auto py-3" onClick={() => setActiveMenu("campaign")}>
                        <Megaphone className="h-4 w-4 mr-2" />
                        <div className="text-left">
                          <div className="text-sm font-medium">Campaigns</div>
                          <div className="text-xs opacity-70">Send outreach</div>
                        </div>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Analytics Charts Section */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Candidate Status Pie Chart */}
                  <Card className="border-border shadow-soft">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-foreground">Candidate Status Breakdown</CardTitle>
                      <p className="text-xs text-muted-foreground">Distribution across all your job postings</p>
                    </CardHeader>
                    <CardContent>
                      {candidateStatusData.length === 0 ? (
                        <div className="h-48 flex flex-col items-center justify-center gap-2">
                          <div className="h-16 w-16 rounded-full border-4 border-dashed border-border flex items-center justify-center">
                            <Users className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">No candidate data yet</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <ResponsiveContainer width="55%" height={180}>
                            <PieChart>
                              <Pie
                                data={candidateStatusData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={75}
                                paddingAngle={3}
                                dataKey="value"
                              >
                                {candidateStatusData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip
                                contentStyle={{
                                  background: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  color: 'hsl(var(--foreground))',
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex-1 space-y-1.5">
                            {candidateStatusData.map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="h-2 w-2 rounded-full shrink-0"
                                    style={{ background: item.color }}
                                  />
                                  <span className="text-muted-foreground">{item.name}</span>
                                </div>
                                <span className="font-medium text-foreground">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Applications Per Job Bar Chart */}
                  <Card className="border-border shadow-soft">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold text-foreground">Applications per Job</CardTitle>
                      <p className="text-xs text-muted-foreground">Total applicants per active posting</p>
                    </CardHeader>
                    <CardContent>
                      {applicationsPerJob.length === 0 ? (
                        <div className="h-48 flex flex-col items-center justify-center gap-2">
                          <div className="h-16 w-16 rounded-full border-4 border-dashed border-border flex items-center justify-center">
                            <Briefcase className="h-6 w-6 text-muted-foreground" />
                          </div>
                          <p className="text-sm text-muted-foreground">No job postings yet</p>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={180}>
                          <BarChart data={applicationsPerJob} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <XAxis
                              dataKey="name"
                              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                              axisLine={false}
                              tickLine={false}
                              allowDecimals={false}
                            />
                            <Tooltip
                              contentStyle={{
                                background: 'hsl(var(--card))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px',
                                fontSize: '12px',
                                color: 'hsl(var(--foreground))',
                              }}
                              cursor={{ fill: 'hsl(var(--muted))' }}
                            />
                            <Bar
                              dataKey="applications"
                              fill="hsl(var(--primary))"
                              radius={[4, 4, 0, 0]}
                              maxBarSize={40}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            )}

            {activeMenu === "registration" && <RegistrationContent />}
            {activeMenu === "jobs" && <JobManagementContent />}
            {activeMenu === "qpm" && <QPMContent key="qpm-refresh" />}
            {activeMenu === "test-papers" && <TestPapersContent />}
            {activeMenu === "talent-pool" && <TalentPoolContent />}
            {activeMenu === "suggested-candidates" && <SuggestedCandidatesContent />}
            {activeMenu === "placements" && <PlacementsContent />}
            {activeMenu === "teams" && <TeamsContent />}
            {activeMenu === "interview-pipeline" && (
              <Tabs defaultValue="pipeline" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
                  <TabsTrigger value="feedback-templates">Feedback Templates</TabsTrigger>
                </TabsList>
                <TabsContent value="pipeline">
                  <InterviewPipelineContent />
                </TabsContent>
                <TabsContent value="feedback-templates">
                  <FeedbackTemplatesContent />
                </TabsContent>
              </Tabs>
            )}
            {activeMenu === "mock-interview-pipeline" && <EmployerInterviewPipelineTracker />}
            {activeMenu === "live-interviews" && <LiveInterviewMonitor />}
            
            {activeMenu === "subscriptions" && <SubscriptionsContent />}
            {activeMenu === "email-templates" && <EmailTemplatesEditor />}
            
            {activeMenu === "smm" && <SMMContent />}
            {activeMenu === "my-vacancies" && <MyVacanciesContent />}
            {activeMenu === "feedback-matrix" && <FeedbackMatrixContent />}
            {activeMenu === "confirmation" && <ConfirmationContent />}
            {activeMenu === "offer-letter" && <OfferLetterContent />}
            {activeMenu === "approvals" && <ConfirmationContent />}
            {activeMenu === "all-candidates" && <AllCandidatesContent />}
            {activeMenu === "campaigns" && <EmployerCampaignContent />}
            {activeMenu === "outsource-projects" && <OutsourceProjectsContent />}
            
            {activeMenu === "wallet" && user?.id && <WalletTab userId={user.id} />}
            {activeMenu === "upgrade-plan" && <UpgradePlanContent />}
            {activeMenu === "settings" && <EmployerSettingsContent />}
            
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployerDashboard;