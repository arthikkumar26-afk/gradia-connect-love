import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
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
  Search,
  Star,
  StarOff,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  Clock
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";

interface Job {
  id: string;
  job_title: string;
  department: string | null;
  location: string | null;
  status: string | null;
  is_featured: boolean | null;
  moderation_status: string | null;
  created_at: string | null;
  employer_id: string;
  employer?: {
    company_name: string | null;
    full_name: string;
  };
}

const JobModeration = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [updatingJob, setUpdatingJob] = useState<string | null>(null);

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

  const fetchJobs = async () => {
    try {
      setJobsLoading(true);
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          job_title,
          department,
          location,
          status,
          is_featured,
          moderation_status,
          created_at,
          employer_id
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch employer details separately
      const employerIds = [...new Set((data || []).map(job => job.employer_id))];
      const { data: employers } = await supabase
        .from('profiles')
        .select('id, company_name, full_name')
        .in('id', employerIds);

      const employerMap = new Map(employers?.map(e => [e.id, e]) || []);

      const jobsWithEmployers = (data || []).map(job => ({
        ...job,
        employer: employerMap.get(job.employer_id)
      }));

      setJobs(jobsWithEmployers);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch jobs.",
        variant: "destructive",
      });
    } finally {
      setJobsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchJobs();
    }
  }, [isAuthorized]);

  const handleToggleFeatured = async (jobId: string, currentlyFeatured: boolean) => {
    setUpdatingJob(jobId);
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ 
          is_featured: !currentlyFeatured,
          moderation_status: !currentlyFeatured ? 'approved' : 'pending'
        })
        .eq('id', jobId);

      if (error) throw error;

      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              is_featured: !currentlyFeatured,
              moderation_status: !currentlyFeatured ? 'approved' : 'pending'
            } 
          : job
      ));

      toast({
        title: currentlyFeatured ? "Removed from Home Page" : "Added to Home Page",
        description: currentlyFeatured 
          ? "Job has been removed from the home page." 
          : "Job will now appear on the home page.",
      });
    } catch (error) {
      console.error('Error updating job:', error);
      toast({
        title: "Error",
        description: "Failed to update job status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingJob(null);
    }
  };

  const handleUpdateModerationStatus = async (jobId: string, status: string) => {
    setUpdatingJob(jobId);
    try {
      const updates: { moderation_status: string; is_featured?: boolean } = { moderation_status: status };
      if (status === 'rejected') {
        updates.is_featured = false;
      }

      const { error } = await supabase
        .from('jobs')
        .update(updates)
        .eq('id', jobId);

      if (error) throw error;

      setJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, ...updates } : job
      ));

      toast({
        title: "Status Updated",
        description: `Job moderation status changed to ${status}.`,
      });
    } catch (error) {
      console.error('Error updating job:', error);
      toast({
        title: "Error",
        description: "Failed to update moderation status.",
        variant: "destructive",
      });
    } finally {
      setUpdatingJob(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.job_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.employer?.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || job.moderation_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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

  const getModerationBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-600 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">Pending</Badge>;
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
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
                      <SidebarMenuButton asChild>
                        <Link
                          to={item.path}
                          className={`w-full justify-start gap-3 px-3 py-2 rounded-lg transition-colors ${
                            location.pathname === item.path 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-muted"
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span className="text-sm">{item.title}</span>
                        </Link>
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
              <h1 className="text-lg font-semibold">Job Moderation</h1>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Employer Job Postings</CardTitle>
                <CardDescription>
                  Review and approve jobs to feature on the home page. Featured jobs will appear in the "Trending Jobs This Week" section.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by title, company, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Jobs Table */}
                {jobsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredJobs.length === 0 ? (
                  <div className="text-center py-12">
                    <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No jobs found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Job Title</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Moderation</TableHead>
                          <TableHead>Posted</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredJobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{job.job_title}</span>
                                {job.is_featured && (
                                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {job.employer?.company_name || job.employer?.full_name || 'Unknown'}
                            </TableCell>
                            <TableCell>{job.location || 'Not specified'}</TableCell>
                            <TableCell>
                              <Badge variant={job.status === 'active' ? 'default' : 'secondary'}>
                                {job.status || 'draft'}
                              </Badge>
                            </TableCell>
                            <TableCell>{getModerationBadge(job.moderation_status)}</TableCell>
                            <TableCell>
                              {job.created_at 
                                ? formatDistanceToNow(new Date(job.created_at), { addSuffix: true })
                                : 'Unknown'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant={job.is_featured ? "default" : "outline"}
                                  onClick={() => handleToggleFeatured(job.id, !!job.is_featured)}
                                  disabled={updatingJob === job.id}
                                >
                                  {updatingJob === job.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : job.is_featured ? (
                                    <>
                                      <StarOff className="h-4 w-4 mr-1" />
                                      Remove
                                    </>
                                  ) : (
                                    <>
                                      <Star className="h-4 w-4 mr-1" />
                                      Feature
                                    </>
                                  )}
                                </Button>
                                {job.moderation_status !== 'approved' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600"
                                    onClick={() => handleUpdateModerationStatus(job.id, 'approved')}
                                    disabled={updatingJob === job.id}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                )}
                                {job.moderation_status !== 'rejected' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600"
                                    onClick={() => handleUpdateModerationStatus(job.id, 'rejected')}
                                    disabled={updatingJob === job.id}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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

export default JobModeration;
