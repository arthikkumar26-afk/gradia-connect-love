import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  ShieldCheck,
  Users,
  Briefcase,
  Building2,
  Settings,
  BarChart3,
  FileText,
  Home,
  Menu,
  LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
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

interface TrendingJob {
  id: string;
  job_title: string;
  search_count: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

const TrendingJobsAdmin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [trendingJobs, setTrendingJobs] = useState<TrendingJob[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<TrendingJob | null>(null);
  const [jobToDelete, setJobToDelete] = useState<TrendingJob | null>(null);
  const [formData, setFormData] = useState({
    job_title: "",
    search_count: 0,
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    checkAuthorization();
  }, []);

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
      .maybeSingle();

    if (!roleData) {
      toast.error("You do not have permission to access this page.");
      navigate("/admin/login");
      return;
    }

    setIsAuthorized(true);
    setIsLoading(false);
    fetchTrendingJobs();
  };

  const fetchTrendingJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('trending_jobs')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setTrendingJobs(data || []);
    } catch (error) {
      console.error('Error fetching trending jobs:', error);
      toast.error("Failed to load trending jobs");
    }
  };

  const handleOpenDialog = (job?: TrendingJob) => {
    if (job) {
      setEditingJob(job);
      setFormData({
        job_title: job.job_title,
        search_count: job.search_count,
        is_active: job.is_active,
      });
    } else {
      setEditingJob(null);
      setFormData({
        job_title: "",
        search_count: 0,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.job_title.trim()) {
      toast.error("Job title is required");
      return;
    }

    setIsSaving(true);
    try {
      if (editingJob) {
        const { error } = await supabase
          .from('trending_jobs')
          .update({
            job_title: formData.job_title,
            search_count: formData.search_count,
            is_active: formData.is_active,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingJob.id);

        if (error) throw error;
        toast.success("Trending job updated successfully");
      } else {
        const maxOrder = trendingJobs.length > 0 
          ? Math.max(...trendingJobs.map(j => j.display_order)) + 1 
          : 1;

        const { error } = await supabase
          .from('trending_jobs')
          .insert({
            job_title: formData.job_title,
            search_count: formData.search_count,
            is_active: formData.is_active,
            display_order: maxOrder,
          });

        if (error) throw error;
        toast.success("Trending job added successfully");
      }

      setIsDialogOpen(false);
      fetchTrendingJobs();
    } catch (error) {
      console.error('Error saving trending job:', error);
      toast.error("Failed to save trending job");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!jobToDelete) return;

    try {
      const { error } = await supabase
        .from('trending_jobs')
        .delete()
        .eq('id', jobToDelete.id);

      if (error) throw error;
      toast.success("Trending job deleted successfully");
      setIsDeleteDialogOpen(false);
      setJobToDelete(null);
      fetchTrendingJobs();
    } catch (error) {
      console.error('Error deleting trending job:', error);
      toast.error("Failed to delete trending job");
    }
  };

  const handleReorder = async (job: TrendingJob, direction: 'up' | 'down') => {
    const currentIndex = trendingJobs.findIndex(j => j.id === job.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= trendingJobs.length) return;

    const otherJob = trendingJobs[newIndex];

    try {
      await supabase
        .from('trending_jobs')
        .update({ display_order: otherJob.display_order })
        .eq('id', job.id);

      await supabase
        .from('trending_jobs')
        .update({ display_order: job.display_order })
        .eq('id', otherJob.id);

      fetchTrendingJobs();
      toast.success("Order updated");
    } catch (error) {
      console.error('Error reordering:', error);
      toast.error("Failed to reorder");
    }
  };

  const handleToggleActive = async (job: TrendingJob) => {
    try {
      const { error } = await supabase
        .from('trending_jobs')
        .update({ is_active: !job.is_active })
        .eq('id', job.id);

      if (error) throw error;
      fetchTrendingJobs();
      toast.success(`Job ${!job.is_active ? 'activated' : 'deactivated'}`);
    } catch (error) {
      console.error('Error toggling active status:', error);
      toast.error("Failed to update status");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("You have been successfully logged out.");
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
              <h1 className="text-lg font-semibold">Trending Jobs Management</h1>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Trending Job
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingJob ? 'Edit Trending Job' : 'Add Trending Job'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="job_title">Job Title</Label>
                    <Input
                      id="job_title"
                      placeholder="e.g., React Developer"
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="search_count">Search Count (for display)</Label>
                    <Input
                      id="search_count"
                      type="number"
                      placeholder="0"
                      value={formData.search_count}
                      onChange={(e) => setFormData({ ...formData, search_count: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="is_active">Active</Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingJob ? 'Update' : 'Add'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trending Jobs ({trendingJobs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendingJobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No trending jobs found. Add your first one!
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Order</TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead className="w-32">Search Count</TableHead>
                        <TableHead className="w-24">Status</TableHead>
                        <TableHead className="w-48 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trendingJobs.map((job, index) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={index === 0}
                                onClick={() => handleReorder(job, 'up')}
                              >
                                <ArrowUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                disabled={index === trendingJobs.length - 1}
                                onClick={() => handleReorder(job, 'down')}
                              >
                                <ArrowDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{job.job_title}</TableCell>
                          <TableCell>{job.search_count.toLocaleString()}</TableCell>
                          <TableCell>
                            <Switch
                              checked={job.is_active}
                              onCheckedChange={() => handleToggleActive(job)}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleOpenDialog(job)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  setJobToDelete(job);
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trending Job</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{jobToDelete?.job_title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarProvider>
  );
};

export default TrendingJobsAdmin;