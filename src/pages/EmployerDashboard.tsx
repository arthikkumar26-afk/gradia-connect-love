import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import gradiaLogo from "@/assets/gradia-logo.png";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  UsersRound, 
  UserSquare2, 
  UserCheck, 
  BookOpen, 
  CheckSquare, 
  Settings, 
  Sliders,
  FileText,
  Clock,
  UserPlus,
  Calendar,
  Award,
  Menu,
  X,
  QrCode,
  Bell,
  Mail
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
import { EmailTemplatesEditor } from "@/components/employer/EmailTemplatesEditor";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const EmployerDashboard = () => {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [newApplications, setNewApplications] = useState(0);
  const { user, profile, isAuthenticated } = useAuth();

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

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/employer/dashboard" },
    { id: "jobs", label: "Jobs", icon: Briefcase, path: "/employer/jobs" },
    { id: "talent-pool", label: "Talent Pool", icon: Users, path: "/employer/talent-pool" },
    { id: "teams", label: "Teams", icon: UsersRound, path: "/employer/teams" },
    { id: "placements", label: "Placements", icon: UserCheck, path: "/employer/placements" },
    { id: "email-templates", label: "Email Templates", icon: Mail, path: "/employer/email-templates" },
    { id: "approvals", label: "Approvals", icon: CheckSquare, path: "/employer/approvals" },
    { id: "settings", label: "Settings", icon: Settings, path: "/employer/settings" },
    { id: "configuration", label: "Configuration", icon: Sliders, path: "/employer/configuration" },
  ];

  const dashboardCards = [
    {
      title: "Active Job Posts",
      value: "12",
      subtitle: "Currently hiring",
      icon: Briefcase,
      gradient: "from-primary/20 to-primary/5",
    },
    {
      title: "Applications Received",
      value: "156",
      subtitle: "Last 30 days",
      icon: UserPlus,
      gradient: "from-success/20 to-success/5",
    },
    {
      title: "Pending Reviews",
      value: "48",
      subtitle: "Awaiting feedback",
      icon: Clock,
      gradient: "from-warning/20 to-warning/5",
    },
    {
      title: "Interviews Scheduled",
      value: "18",
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
                      <Badge className="bg-red-500 text-white text-xs px-1.5 py-0.5 animate-pulse">
                        {newApplications}
                      </Badge>
                    )}
                  </>
                )}
                {!sidebarOpen && showBadge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>
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
              {activeMenu === "jobs" ? "Job Management" : "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="cta" size="lg" className="rounded-xl" asChild>
              <Link to="/employer/post-job">
                <Briefcase className="h-5 w-5 mr-2" />
                Post New Job
              </Link>
            </Button>
          </div>
        </header>

        {/* Breadcrumbs */}
        <div className="bg-background px-6 py-3 border-b border-border">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/employer/dashboard">Employer</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>
                  {activeMenu === "dashboard" ? "Dashboard" :
                   activeMenu === "jobs" ? "Jobs" :
                   activeMenu === "talent-pool" ? "Talent Pool" :
                   activeMenu === "teams" ? "Teams" :
                   activeMenu === "placements" ? "Placements" :
                   activeMenu === "email-templates" ? "Email Templates" :
                   activeMenu === "approvals" ? "Approvals" :
                   activeMenu === "settings" ? "Settings" :
                   activeMenu === "configuration" ? "Configuration" : "Dashboard"}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

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

            {activeMenu === "jobs" && <JobManagementContent />}
            {activeMenu === "talent-pool" && <TalentPoolContent />}
            {activeMenu === "placements" && <PlacementsContent />}
            {activeMenu === "teams" && <TeamsContent />}
            {activeMenu === "email-templates" && <EmailTemplatesEditor />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployerDashboard;