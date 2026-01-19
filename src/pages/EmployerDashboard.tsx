import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import gradiaLogo from "@/assets/gradia-logo.png";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  CheckSquare, 
  Settings, 
  Sliders,
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
  BellRing,
  Megaphone,
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
import { VivaContent } from "@/components/employer/VivaContent";
import { RegistrationContent } from "@/components/employer/RegistrationContent";
import { SubscriptionsContent } from "@/components/employer/SubscriptionsContent";
import { JobAlertContent } from "@/components/employer/JobAlertContent";
import { LiveInterviewMonitor } from "@/components/employer/LiveInterviewMonitor";
import { EmployerInterviewPipelineTracker } from "@/components/employer/EmployerInterviewPipelineTracker";
import { SMMContent } from "@/components/employer/SMMContent";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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
  const { user, profile, isAuthenticated, logout } = useAuth();

  // Role-based access control
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/employer/login");
      return;
    }

    if (profile?.role === "candidate") {
      navigate("/candidate/dashboard");
      return;
    }
  }, [isAuthenticated, profile, navigate]);

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
  }, [user?.id]);

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
    { id: "jobs", label: "Vacancies List", icon: Briefcase, path: "/employer/jobs" },
    { id: "smm", label: "SMM", icon: Megaphone, path: "/employer/smm" },
    { id: "job-alert", label: "Job Alert", icon: BellRing, path: "/employer/job-alert" },
    { id: "interview-pipeline", label: "Interview Pipeline", icon: GitBranch, path: "/employer/interview-pipeline" },
    { id: "mock-interview-pipeline", label: "Mock Interview Pipeline", icon: ClipboardList, path: "/employer/mock-interview-pipeline" },
    { id: "live-interviews", label: "Live Interviews", icon: Calendar, path: "/employer/live-interviews" },
    { id: "talent-pool", label: "Talent Pool", icon: Users, path: "/employer/talent-pool" },
    { id: "email-templates", label: "Email Templates", icon: Mail, path: "/employer/email-templates" },
    { id: "approvals", label: "Approvals", icon: CheckSquare, path: "/employer/approvals" },
    { id: "settings", label: "Settings", icon: Settings, path: "/employer/settings" },
    { id: "configuration", label: "Configuration", icon: Sliders, path: "/employer/configuration" },
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
        } bg-card border-r border-border transition-all duration-300 flex flex-col flex-shrink-0`}
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

        <nav className="flex-1 p-4 space-y-1 pt-6">
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

          {activeMenu === "dashboard" && (
            <div className="flex items-center gap-3">
              <Button variant="cta" size="lg" className="rounded-xl" asChild>
                <Link to="/employer/post-job">
                  <Briefcase className="h-5 w-5 mr-2" />
                  Post New Job
                </Link>
              </Button>
            </div>
          )}
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Button variant="outline" className="justify-start h-auto py-3" asChild>
                        <Link to="/employer/jobs">
                          <Briefcase className="h-4 w-4 mr-2" />
                          <div className="text-left">
                            <div className="text-sm font-medium">Manage Jobs</div>
                            <div className="text-xs text-muted-foreground">View postings</div>
                          </div>
                        </Link>
                      </Button>
                      
                      <Button variant="outline" className="justify-start h-auto py-3" asChild>
                        <Link to="/employer/talent-pool">
                          <Users className="h-4 w-4 mr-2" />
                          <div className="text-left">
                            <div className="text-sm font-medium">Browse Talent</div>
                            <div className="text-xs text-muted-foreground">Find candidates</div>
                          </div>
                        </Link>
                      </Button>
                      
                      <Button variant="outline" className="justify-start h-auto py-3" asChild>
                        <Link to="/employer/approvals">
                          <CheckSquare className="h-4 w-4 mr-2" />
                          <div className="text-left">
                            <div className="text-sm font-medium">Review Approvals</div>
                            <div className="text-xs text-muted-foreground">Pending actions</div>
                          </div>
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeMenu === "registration" && <RegistrationContent />}
            {activeMenu === "jobs" && <JobManagementContent />}
            {activeMenu === "talent-pool" && <TalentPoolContent />}
            {activeMenu === "placements" && <PlacementsContent />}
            {activeMenu === "teams" && <TeamsContent />}
            {activeMenu === "interview-pipeline" && <InterviewPipelineContent />}
            {activeMenu === "mock-interview-pipeline" && <EmployerInterviewPipelineTracker />}
            {activeMenu === "live-interviews" && <LiveInterviewMonitor />}
            {activeMenu === "viva" && <VivaContent />}
            {activeMenu === "subscriptions" && <SubscriptionsContent />}
            {activeMenu === "email-templates" && <EmailTemplatesEditor />}
            {activeMenu === "job-alert" && <JobAlertContent />}
            {activeMenu === "smm" && <SMMContent />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployerDashboard;