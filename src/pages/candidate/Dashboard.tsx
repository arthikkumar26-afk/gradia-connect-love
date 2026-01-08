import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Briefcase, MapPin, Calendar, LogOut, User, FileText, ClipboardList, TrendingUp } from "lucide-react";
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
  const { profile, isAuthenticated, logout } = useAuth();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [applicationCount, setApplicationCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [activeTab, setActiveTab] = useState("applications");

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

    if (profile?.role !== "candidate") {
      navigate("/employer/dashboard");
      return;
    }

    fetchJobs();
    fetchApplicationCount();
    fetchInterviewCount();
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
    setActiveTab("pipeline");
  };

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "active")
        .order("posted_date", { ascending: false })
        .limit(5);

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

  return (
    <div className="bg-subtle min-h-[calc(100vh-64px)]">
      {/* Dashboard Header */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {profile?.full_name}
                </h2>
                <p className="text-sm text-muted-foreground">Candidate Dashboard</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate("/profile/edit")}>
                <User className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="bg-background border-b border-border">
        <div className="container mx-auto px-4 py-3">
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
                <BreadcrumbPage>Dashboard</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{jobs.length}</p>
                <p className="text-sm text-muted-foreground">Available Jobs</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{applicationCount}</p>
                <p className="text-sm text-muted-foreground">Applications</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{interviewCount}</p>
                <p className="text-sm text-muted-foreground">Active Interviews</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {profile?.experience_level || "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">Experience Level</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tabs for Applications, Pipeline, and Jobs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="applications" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">My Applications</span>
              <span className="sm:hidden">Applications</span>
              {applicationCount > 0 && (
                <Badge variant="secondary" className="ml-1">{applicationCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Interview Pipeline</span>
              <span className="sm:hidden">Pipeline</span>
              {interviewCount > 0 && (
                <Badge variant="secondary" className="ml-1">{interviewCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Browse Jobs</span>
              <span className="sm:hidden">Jobs</span>
            </TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">My Applications</h2>
                <Button variant="outline" size="sm" onClick={() => navigate('/jobs-results')}>
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
          </TabsContent>

          {/* Interview Pipeline Tab */}
          <TabsContent value="pipeline">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-foreground">Interview Pipeline</h2>
              {profile?.id && (
                <InterviewPipelineTab candidateId={profile.id} />
              )}
            </div>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-foreground">Available Jobs</h2>
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
          </TabsContent>
        </Tabs>
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
