import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { 
  LayoutDashboard,
  Briefcase, 
  MapPin, 
  Calendar, 
  LogOut, 
  User, 
  FileText, 
  ClipboardList, 
  TrendingUp,
  Menu,
  X,
  Settings,
  BookOpen,
  GraduationCap,
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { JobApplicationModal } from "@/components/candidate/JobApplicationModal";
import { ApplicationsTab } from "@/components/candidate/ApplicationsTab";
import { InterviewPipelineTab } from "@/components/candidate/InterviewPipelineTab";

interface Job {
  id: string;
  job_title: string;
  department: string;
  description: string;
  experience_required: string;
  job_type: string;
  location: string;
  salary_range: string;
  posted_date: string;
  employer_id: string;
}

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { profile, isAuthenticated, logout, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [applicationCount, setApplicationCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "applications", label: "My Applications", icon: ClipboardList },
    { id: "pipeline", label: "Interview Pipeline", icon: TrendingUp },
    { id: "jobs", label: "Browse Jobs", icon: Briefcase },
    { id: "resume", label: "Resume Builder", icon: FileText },
    { id: "learning", label: "Learning", icon: BookOpen },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const dashboardCards = [
    {
      title: "Available Jobs",
      value: jobs.length.toString(),
      subtitle: "Open positions",
      icon: Briefcase,
      gradient: "from-primary/20 to-primary/5",
    },
    {
      title: "Applications",
      value: applicationCount.toString(),
      subtitle: "Submitted",
      icon: FileText,
      gradient: "from-accent/20 to-accent/5",
    },
    {
      title: "Active Interviews",
      value: interviewCount.toString(),
      subtitle: "In progress",
      icon: TrendingUp,
      gradient: "from-success/20 to-success/5",
    },
    {
      title: "Experience Level",
      value: profile?.experience_level || "N/A",
      subtitle: "Your profile",
      icon: Award,
      gradient: "from-secondary/20 to-secondary/5",
    },
  ];

  const fetchApplicationCount = async () => {
    if (!profile?.id) return;
    const { count } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', profile.id);
    setApplicationCount(count || 0);
  };

  const fetchInterviewCount = async () => {
    if (!profile?.id) return;
    const { count } = await supabase
      .from('interview_candidates')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', profile.id)
      .eq('status', 'active');
    setInterviewCount(count || 0);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/candidate/login");
      return;
    }

    // Wait for profile to load before checking role
    if (!profile) {
      return;
    }

    if (profile.role !== "candidate") {
      // Non-candidates should not access this page
      toast({
        title: "Access Denied",
        description: "This dashboard is for candidates only.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    fetchJobs();
    fetchApplicationCount();
    fetchInterviewCount();

    // Subscribe to real-time job updates
    const channel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          console.log('Real-time job update:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new.status === 'active') {
            // Add new active job to the list
            setJobs(prev => [payload.new as Job, ...prev].slice(0, 10));
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.status === 'active') {
              // Update existing job or add if newly activated
              setJobs(prev => {
                const exists = prev.some(job => job.id === payload.new.id);
                if (exists) {
                  return prev.map(job => job.id === payload.new.id ? payload.new as Job : job);
                } else {
                  return [payload.new as Job, ...prev].slice(0, 10);
                }
              });
            } else {
              // Remove job if no longer active
              setJobs(prev => prev.filter(job => job.id !== payload.new.id));
            }
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted job
            setJobs(prev => prev.filter(job => job.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, profile, navigate]);

  const handleApply = (job: Job) => {
    setSelectedJob(job);
    setIsApplicationModalOpen(true);
  };

  const handleApplicationSubmitted = () => {
    fetchApplicationCount();
    fetchInterviewCount();
  };

  const handleViewPipeline = (applicationId: string) => {
    setActiveMenu("pipeline");
  };

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "active")
        .order("posted_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPageTitle = () => {
    switch (activeMenu) {
      case "dashboard": return "Dashboard";
      case "applications": return "My Applications";
      case "pipeline": return "Interview Pipeline";
      case "jobs": return "Browse Jobs";
      case "resume": return "Resume Builder";
      case "learning": return "Learning";
      case "settings": return "Settings";
      default: return "Dashboard";
    }
  };

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-subtle">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or no profile after loading, the useEffect will handle redirect
  if (!profile) {
    return null;
  }

  return (
    <div className="bg-subtle flex min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-card border-r border-border transition-all duration-300 overflow-hidden flex flex-col`}
      >
        {/* User Info */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {profile?.full_name}
              </p>
              <p className="text-xs text-muted-foreground">Candidate</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-accent/10 text-accent font-medium border-l-4 border-accent -ml-1 pl-5"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
                {item.id === "applications" && applicationCount > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {applicationCount}
                  </Badge>
                )}
                {item.id === "pipeline" && interviewCount > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {interviewCount}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
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
              {getPageTitle()}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/profile/edit")}>
              <User className="h-4 w-4 mr-2" />
              Edit Profile
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
                  <Link to="/candidate/dashboard">Candidate</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Dashboard Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {/* Dashboard View */}
            {activeMenu === "dashboard" && (
              <>
                {/* Summary Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {dashboardCards.map((card, index) => {
                    const Icon = card.icon;
                    
                    return (
                      <Card 
                        key={index}
                        className="overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in border-border"
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

                {/* Quick Actions Section */}
                <div className="bg-card rounded-xl border border-border p-6 shadow-soft">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto py-4" 
                      onClick={() => setActiveMenu("jobs")}
                    >
                      <Briefcase className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Browse Jobs</div>
                        <div className="text-xs text-muted-foreground">Find opportunities</div>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto py-4"
                      onClick={() => setActiveMenu("applications")}
                    >
                      <ClipboardList className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">View Applications</div>
                        <div className="text-xs text-muted-foreground">Track your progress</div>
                      </div>
                    </Button>
                    
                    <Button 
                      variant="outline" 
                      className="justify-start h-auto py-4"
                      onClick={() => setActiveMenu("pipeline")}
                    >
                      <TrendingUp className="h-5 w-5 mr-3" />
                      <div className="text-left">
                        <div className="font-medium">Interview Pipeline</div>
                        <div className="text-xs text-muted-foreground">See interview stages</div>
                      </div>
                    </Button>
                  </div>
                </div>

                {/* Recent Jobs Preview */}
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-foreground">Recent Job Openings</h3>
                    <Button variant="link" onClick={() => setActiveMenu("jobs")}>
                      View All
                    </Button>
                  </div>
                  <div className="grid gap-4">
                    {jobs.slice(0, 3).map((job) => (
                      <Card key={job.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-foreground">{job.job_title}</h4>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3" />
                                {job.department}
                              </span>
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {job.location}
                              </span>
                            </div>
                          </div>
                          <Button variant="cta" size="sm" onClick={() => handleApply(job)}>
                            Apply
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Applications View */}
            {activeMenu === "applications" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">My Applications</h2>
                    <p className="text-sm text-muted-foreground">Track your job applications</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveMenu("jobs")}>
                    Find More Jobs
                  </Button>
                </div>
                {profile?.id && (
                  <ApplicationsTab 
                    candidateId={profile.id} 
                    onViewPipeline={handleViewPipeline}
                  />
                )}
              </div>
            )}

            {/* Interview Pipeline View */}
            {activeMenu === "pipeline" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Interview Pipeline</h2>
                  <p className="text-sm text-muted-foreground">Track your interview progress</p>
                </div>
                {profile?.id && (
                  <InterviewPipelineTab candidateId={profile.id} />
                )}
              </div>
            )}

            {/* Browse Jobs View */}
            {activeMenu === "jobs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Browse Jobs</h2>
                    <p className="text-sm text-muted-foreground">Find your next opportunity</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/jobs-results')}>
                    View All Jobs
                  </Button>
                </div>

                {isLoading ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading jobs...</p>
                  </div>
                ) : jobs.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Jobs Available
                    </h3>
                    <p className="text-muted-foreground">
                      Check back later for new opportunities
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {jobs.map((job) => (
                      <Card key={job.id} className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                              {job.job_title}
                            </h3>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Briefcase className="h-4 w-4" />
                                {job.department}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Posted {formatDate(job.posted_date)}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary">{job.job_type}</Badge>
                        </div>

                        <p className="text-muted-foreground mb-4 line-clamp-2">
                          {job.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            {job.experience_required && (
                              <Badge variant="outline">{job.experience_required}</Badge>
                            )}
                            {job.salary_range && (
                              <Badge variant="outline">{job.salary_range}</Badge>
                            )}
                          </div>
                          <Button variant="cta" onClick={() => handleApply(job)}>Apply Now</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Resume Builder Placeholder */}
            {activeMenu === "resume" && (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Resume Builder</h2>
                <p className="text-muted-foreground mb-4">Coming soon - Build and manage your resumes</p>
                <Button variant="outline" asChild>
                  <Link to="/candidate/resume-builder">Go to Resume Builder</Link>
                </Button>
              </div>
            )}

            {/* Learning Placeholder */}
            {activeMenu === "learning" && (
              <div className="text-center py-12">
                <GraduationCap className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Learning Platform</h2>
                <p className="text-muted-foreground mb-4">Enhance your skills with our courses</p>
                <Button variant="outline" asChild>
                  <Link to="/learning">Explore Courses</Link>
                </Button>
              </div>
            )}

            {/* Settings Placeholder */}
            {activeMenu === "settings" && (
              <div className="text-center py-12">
                <Settings className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-foreground mb-2">Settings</h2>
                <p className="text-muted-foreground mb-4">Manage your account preferences</p>
                <Button variant="outline" onClick={() => navigate("/profile/edit")}>
                  Edit Profile
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Application Modal */}
      <JobApplicationModal
        job={selectedJob}
        open={isApplicationModalOpen}
        onOpenChange={setIsApplicationModalOpen}
        candidateId={profile?.id || ''}
        candidateProfile={profile}
        onApplicationSubmitted={handleApplicationSubmitted}
      />
    </div>
  );
};

export default CandidateDashboard;
