import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users as UsersIcon, 
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
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  CreditCard,
  ClipboardList,
  UserCog,
  MessageSquare,
  Trash2,
  Ticket,
  Ban,
  MoreHorizontal,
  UserPlus,
  Send
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { formatDistanceToNow, format } from "date-fns";
import { exportToExcel } from "@/utils/exportToExcel";
import { PLANS, type PlanRole } from "@/config/plans";
import { Download } from "lucide-react";

interface User {
  id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  role: string;
  location: string | null;
  company_name: string | null;
  created_at: string | null;
  experience_level: string | null;
  initial_password?: string | null;
}

interface UserDetailsResponse {
  profile: Record<string, any> | null;
  authUser: {
    email?: string | null;
    created_at?: string | null;
    last_sign_in_at?: string | null;
    email_confirmed_at?: string | null;
    banned_until?: string | null;
  } | null;
  initialPassword?: string | null;
  roles: string[];
  subscription: Record<string, any> | null;
}

const Users = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [blockReason, setBlockReason] = useState<string>("");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "candidate" as "candidate" | "employer",
    plan: "none",
    billingCycle: "monthly" as "monthly" | "annual",
    points: "",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [userDetails, setUserDetails] = useState<UserDetailsResponse | null>(null);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [manageLoading, setManageLoading] = useState(false);
  const [manageForm, setManageForm] = useState({
    role: "candidate" as "candidate" | "employer" | "admin" | "owner",
    plan: "none",
    billingCycle: "monthly" as "monthly" | "annual",
    planAction: "activate" as "activate" | "cancel",
    points: "",
  });

  const openManageDialog = (user: User) => {
    setSelectedUser(user);
    const r = (["candidate", "employer", "admin", "owner"].includes(user.role)
      ? user.role
      : "candidate") as typeof manageForm.role;
    setManageForm({
      role: r,
      plan: "none",
      billingCycle: "monthly",
      planAction: "activate",
      points: "",
    });
    setManageDialogOpen(true);
  };

  const handleManageSubmit = async () => {
    if (!selectedUser) return;
    if (manageLoading) return; // prevent rapid double-clicks
    const { role, plan, billingCycle, planAction, points } = manageForm;
    const pointsNum = points.trim() ? Number(points) : 0;
    if (points.trim() && (!Number.isFinite(pointsNum) || pointsNum < 0)) {
      toast({ title: "Invalid points", description: "Points must be a positive number.", variant: "destructive" });
      return;
    }
    setManageLoading(true);
    // Snapshot the user so subsequent changes don't race
    const target = selectedUser;
    try {
      // 1. Role change must happen first (other actions depend on role)
      if (role !== target.role) {
        const { data, error } = await supabase.functions.invoke("manage-user-roles", {
          body: { action: "assign-role", targetUserId: target.id, role },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        // profiles.role update can run in background — no need to await
        supabase.from("profiles").update({ role }).eq("id", target.id);
      }

      // 2 + 3 are independent — run them in parallel
      const tasks: Promise<any>[] = [];

      if (plan !== "none" && (role === "candidate" || role === "employer")) {
        tasks.push(
          supabase.functions.invoke("manage-user-roles", {
            body: {
              action: "update-subscription",
              targetUserId: target.id,
              targetRole: role,
              plan,
              billingCycle,
              planAction,
            },
          }).then(({ data, error }) => {
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
          })
        );
      }

      if (pointsNum > 0) {
        tasks.push(
          supabase.functions.invoke("manage-user-roles", {
            body: {
              action: "credit-wallet-points",
              targetUserId: target.id,
              points: pointsNum,
              description: "Admin updated via All Users",
            },
          }).then(({ data, error }) => {
            if (error) throw error;
            if (data?.error) throw new Error(data.error);
          })
        );
      }

      if (tasks.length) await Promise.all(tasks);

      toast({ title: "Updated", description: `${target.full_name} updated successfully.` });
      setManageDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update user", variant: "destructive" });
    } finally {
      setManageLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pwd = "";
    for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setCreateForm((p) => ({ ...p, password: pwd }));
  };

  const handleCreateUser = async () => {
    const { fullName, email, password, role, plan, billingCycle, points } = createForm;
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      toast({ title: "Missing fields", description: "Please fill all fields.", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    const pointsNum = points.trim() ? Number(points) : 0;
    if (points.trim() && (!Number.isFinite(pointsNum) || pointsNum < 0)) {
      toast({ title: "Invalid points", description: "Points must be a positive number.", variant: "destructive" });
      return;
    }
    setCreateLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-user-roles", {
        body: { action: "create-user", targetEmail: email.trim(), password, fullName: fullName.trim(), role },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newUserId: string | undefined = data?.userId;

      // Activate plan if selected
      if (plan && plan !== "none" && newUserId) {
        try {
          await supabase.functions.invoke("manage-user-roles", {
            body: {
              action: "update-subscription",
              targetUserId: newUserId,
              targetRole: role,
              plan,
              billingCycle,
              planAction: "activate",
            },
          });
        } catch (e: any) {
          console.error("Plan activation failed:", e);
          toast({ title: "Plan not activated", description: e.message || "Could not activate plan.", variant: "destructive" });
        }
      }

      // Credit wallet points
      if (pointsNum > 0 && newUserId) {
        try {
          await supabase.functions.invoke("manage-user-roles", {
            body: {
              action: "credit-wallet-points",
              targetUserId: newUserId,
              points: pointsNum,
              description: `Admin granted on account creation`,
            },
          });
        } catch (e: any) {
          console.error("Points credit failed:", e);
          toast({ title: "Points not credited", description: e.message || "Could not credit points.", variant: "destructive" });
        }
      }

      try {
        await supabase.functions.invoke("send-account-credentials", {
          body: { email: email.trim(), fullName: fullName.trim(), password, role },
        });
        toast({ title: "Account created", description: `Credentials emailed to ${email}.` });
      } catch (mailErr: any) {
        console.error("Email send failed:", mailErr);
        toast({
          title: "Account created (email failed)",
          description: "User created, but the credentials email could not be sent.",
          variant: "destructive",
        });
      }

      setCreateDialogOpen(false);
      setCreateForm({ fullName: "", email: "", password: "", role: "candidate", plan: "none", billingCycle: "monthly", points: "" });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to create user", variant: "destructive" });
    } finally {
      setCreateLoading(false);
    }
  };

  const blockReasons = [
    "Violation of Terms of Service",
    "Suspicious or fraudulent activity",
    "Inappropriate content or behavior",
    "Multiple account violations",
    "Spam or misuse of platform",
    "Identity verification failure",
    "Harassment or abuse reported",
    "Other policy violation",
  ];

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

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const { data, error } = await supabase.functions.invoke('manage-user-roles', {
        body: { action: 'list-users' }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setUsers(data?.users || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users.",
        variant: "destructive",
      });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleViewUser = async (user: User) => {
    setSelectedUser(user);
    setViewDialogOpen(true);
    setViewLoading(true);
    setUserDetails(null);

    try {
      const { data, error } = await supabase.functions.invoke('manage-user-roles', {
        body: { action: 'get-user-details', targetUserId: user.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setUserDetails(data);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to load user profile', variant: 'destructive' });
      setViewDialogOpen(false);
      setSelectedUser(null);
    } finally {
      setViewLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchUsers();
    }
  }, [isAuthorized]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.mobile?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.location?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user-roles', {
        body: { action: 'delete-user', targetUserId: selectedUser.id }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: "User Deleted", description: `${selectedUser.full_name} has been deleted.` });
      setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedUser || !blockReason) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-user-roles', {
        body: { action: 'block-user', targetUserId: selectedUser.id, blockReason }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Send notification email to the blocked user
      try {
        await supabase.functions.invoke('send-notification-email', {
          body: {
            to: selectedUser.email,
            subject: 'Account Temporarily On Hold - Gradia',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #ea580c;">Account Temporarily On Hold</h2>
                <p>Dear ${selectedUser.full_name},</p>
                <p>We regret to inform you that your Gradia account has been temporarily placed on hold.</p>
                <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                  <strong>Reason:</strong> ${blockReason}
                </div>
                <p>During this period, you will not be able to access your account or use any platform services.</p>
                <p>If you believe this action was taken in error, or if you would like to discuss this further, please contact our support team at <a href="mailto:info@gradiaa.com">info@gradiaa.com</a>.</p>
                <p>Thank you for your understanding.</p>
                <p style="color: #6b7280; margin-top: 24px;">Best regards,<br/>Gradia Team</p>
              </div>
            `,
          }
        });
      } catch (emailError) {
        console.error('Failed to send block notification email:', emailError);
      }

      toast({ title: "User Blocked", description: `${selectedUser.full_name} has been blocked and notified via email.` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to block user", variant: "destructive" });
    } finally {
      setActionLoading(false);
      setBlockDialogOpen(false);
      setSelectedUser(null);
      setBlockReason("");
    }
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
    { title: "Users", icon: UsersIcon, path: "/admin/users" },
    { title: "Subscribed Employers", icon: CreditCard, path: "/admin/subscribed-employers" },
    { title: "Subscribed Candidates", icon: UserCheck, path: "/admin/subscribed-candidates" },
    { title: "Unsubscribed Employers", icon: UserX, path: "/admin/unsubscribed-employers" },
    { title: "Unsubscribed Candidates", icon: UserX, path: "/admin/unsubscribed-candidates" },
    { title: "Job Moderation", icon: Briefcase, path: "/admin/jobs" },
    { title: "External Jobs", icon: Briefcase, path: "/admin/external-jobs" },
    { title: "Companies", icon: Building2, path: "/admin/companies" },
    { title: "Mock Interview", icon: ClipboardList, path: "/admin/mock-interview-pipeline" },
    { title: "Management", icon: UserCog, path: "/admin/management" },
    { title: "HR Negotiations", icon: MessageSquare, path: "/admin/hr-negotiations" },
    { title: "Coupons", icon: Ticket, path: "/admin/coupons" },
    { title: "Reports", icon: BarChart3, path: "/admin/reports" },
    { title: "Audit Logs", icon: FileText, path: "/admin/audit" },
    { title: "Settings", icon: Settings, path: "/admin/settings" },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'employer':
        return <Badge className="bg-purple-500/10 text-purple-600 border-purple-200">Employer</Badge>;
      case 'candidate':
        return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Candidate</Badge>;
      case 'admin':
        return <Badge className="bg-red-500/10 text-red-600 border-red-200">Admin</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const userStats = {
    total: users.length,
    candidates: users.filter(u => u.role === 'candidate').length,
    employers: users.filter(u => u.role === 'employer').length,
    
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
              <h1 className="text-lg font-semibold">User Management</h1>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <UsersIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{userStats.total}</p>
                      <p className="text-xs text-muted-foreground">Total Users</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <UserCheck className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{userStats.candidates}</p>
                      <p className="text-xs text-muted-foreground">Candidates</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <Building2 className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{userStats.employers}</p>
                      <p className="text-xs text-muted-foreground">Employers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>
                  View and manage all registered users on the platform.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email, phone, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-full sm:w-48">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="candidate">Candidates</SelectItem>
                        <SelectItem value="employer">Employers</SelectItem>
                        
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={fetchUsers}
                      disabled={usersLoading}
                      title="Refresh users"
                    >
                      <RefreshCw className={`h-4 w-4 ${usersLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToExcel(
                        filteredUsers.map(u => ({
                          Name: u.full_name,
                          Email: u.email,
                          Phone: u.mobile || 'N/A',
                          Role: u.role,
                          Location: u.location || 'N/A',
                          Company: u.company_name || 'N/A',
                          Experience: u.experience_level || 'N/A',
                          Joined: u.created_at ? format(new Date(u.created_at), 'MMM dd, yyyy') : 'N/A',
                        })),
                        'users'
                      )}
                      disabled={filteredUsers.length === 0}
                      title="Export to Excel"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Export
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setCreateDialogOpen(true)}
                      title="Create new user account"
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Create User
                    </Button>
                  </div>
                </div>

                {/* Users Table */}
                {usersLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <UsersIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Password</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{user.full_name}</p>
                                {user.company_name && (
                                  <p className="text-xs text-muted-foreground">{user.company_name}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1 text-sm">
                                  <Mail className="h-3 w-3 text-muted-foreground" />
                                  <span className="truncate max-w-[200px]">{user.email}</span>
                                </div>
                                {user.mobile && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Phone className="h-3 w-3" />
                                    <span>{user.mobile}</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{getRoleBadge(user.role)}</TableCell>
                            <TableCell>
                              {user.initial_password ? (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-xs">
                                    {visiblePasswords.has(user.id) ? user.initial_password : '••••••••'}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() => {
                                      setVisiblePasswords(prev => {
                                        const next = new Set(prev);
                                        if (next.has(user.id)) next.delete(user.id);
                                        else next.add(user.id);
                                        return next;
                                      });
                                    }}
                                  >
                                    {visiblePasswords.has(user.id) ? (
                                      <EyeOff className="h-3 w-3 text-muted-foreground" />
                                    ) : (
                                      <Eye className="h-3 w-3 text-muted-foreground" />
                                    )}
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>{user.location || 'Not specified'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {user.created_at 
                                  ? format(new Date(user.created_at), 'MMM d, yyyy')
                                  : 'Unknown'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewUser(user)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="ghost">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openManageDialog(user)}>
                                      <CreditCard className="h-4 w-4 mr-2" />
                                      Plan & Role
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-orange-600"
                                      onClick={() => { setSelectedUser(user); setBlockDialogOpen(true); }}
                                    >
                                      <Ban className="h-4 w-4 mr-2" />
                                      Block Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => { setSelectedUser(user); setDeleteDialogOpen(true); }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete User
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Results count */}
                <div className="mt-4 text-sm text-muted-foreground">
                  Showing {filteredUsers.length} of {users.length} users
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>

      <Dialog
        open={viewDialogOpen}
        onOpenChange={(open) => {
          setViewDialogOpen(open);
          if (!open) {
            setUserDetails(null);
            setSelectedUser(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>
              Full account details for {selectedUser?.full_name || 'this user'}.
            </DialogDescription>
          </DialogHeader>

          {viewLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Name</p>
                    <p className="font-medium">{userDetails?.profile?.full_name || selectedUser?.full_name || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium break-all">{userDetails?.authUser?.email || selectedUser?.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Phone</p>
                    <p className="font-medium">{userDetails?.profile?.mobile || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium">{userDetails?.profile?.location || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Company</p>
                    <p className="font-medium">{userDetails?.profile?.company_name || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Experience</p>
                    <p className="font-medium">{userDetails?.profile?.experience_level || 'Not specified'}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border shadow-none">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Access & Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Role</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {userDetails?.roles?.length ? userDetails.roles.map((role) => (
                        <Badge key={role} variant="secondary">{role}</Badge>
                      )) : getRoleBadge(selectedUser?.role || 'user')}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Temporary Password</p>
                    <p className="font-medium font-mono break-all">{userDetails?.initialPassword || selectedUser?.initial_password || 'Not available'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Joined</p>
                    <p className="font-medium">
                      {userDetails?.authUser?.created_at
                        ? format(new Date(userDetails.authUser.created_at), 'MMM d, yyyy h:mm a')
                        : selectedUser?.created_at
                          ? format(new Date(selectedUser.created_at), 'MMM d, yyyy')
                          : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last Sign In</p>
                    <p className="font-medium">
                      {userDetails?.authUser?.last_sign_in_at
                        ? formatDistanceToNow(new Date(userDetails.authUser.last_sign_in_at), { addSuffix: true })
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email Status</p>
                    <p className="font-medium">{userDetails?.authUser?.email_confirmed_at ? 'Confirmed' : 'Pending confirmation'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Subscription</p>
                    <p className="font-medium">
                      {userDetails?.subscription?.plan
                        ? `${userDetails.subscription.plan}${userDetails.subscription.status ? ` • ${userDetails.subscription.status}` : ''}`
                        : 'No active plan'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Plan & Role Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Plan & Role</DialogTitle>
            <DialogDescription>
              Update role, assign a plan, or credit wallet points for {selectedUser?.full_name || "this user"}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Role</Label>
              <Select
                value={manageForm.role}
                onValueChange={(v) =>
                  setManageForm((p) => ({ ...p, role: v as typeof manageForm.role, plan: "none" }))
                }
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="candidate">Candidate</SelectItem>
                  <SelectItem value="employer">Employer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="owner">Owner</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(manageForm.role === "candidate" || manageForm.role === "employer") && (
              <>
                <div>
                  <Label className="text-xs">Plan</Label>
                  <Select
                    value={manageForm.plan}
                    onValueChange={(v) => {
                      const role = manageForm.role as PlanRole;
                      const found = (PLANS[role] ?? []).find((pl) => pl.id === v);
                      // Candidates don't use wallet points for plans (per-feature Razorpay unlocks instead)
                      const autoFillPoints = role !== "candidate" && v !== "none" && found;
                      setManageForm((p) => ({
                        ...p,
                        plan: v,
                        points: autoFillPoints ? String(found!.points) : p.points,
                      }));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No change</SelectItem>
                      {(PLANS[manageForm.role as PlanRole] ?? PLANS.candidate).map((p) => {
                        const isCandidate = manageForm.role === "candidate";
                        const suffix = isCandidate
                          ? (p.priceInr ? ` — ₹${p.priceInr.toLocaleString("en-IN")}${p.group === "bundle" ? " (bundle)" : ""}` : "")
                          : (p.points > 0 ? ` — ${p.points.toLocaleString("en-IN")} pts` : "");
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}{suffix}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                {manageForm.plan !== "none" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Billing</Label>
                      <Select
                        value={manageForm.billingCycle}
                        onValueChange={(v) =>
                          setManageForm((p) => ({ ...p, billingCycle: v as "monthly" | "annual" }))
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="annual">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Action</Label>
                      <Select
                        value={manageForm.planAction}
                        onValueChange={(v) =>
                          setManageForm((p) => ({ ...p, planAction: v as "activate" | "cancel" }))
                        }
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="activate">Activate</SelectItem>
                          <SelectItem value="cancel">Cancel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <Label className="text-xs">Wallet Points (credit)</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={manageForm.points}
                onChange={(e) => setManageForm((p) => ({ ...p, points: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">₹5 = 1 point. Leave 0 to skip.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageDialogOpen(false)} disabled={manageLoading}>
              Cancel
            </Button>
            <Button onClick={handleManageSubmit} disabled={manageLoading}>
              {manageLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={blockDialogOpen} onOpenChange={(open) => { setBlockDialogOpen(open); if (!open) setBlockReason(""); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Block User Profile</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to block <strong>{selectedUser?.full_name}</strong> ({selectedUser?.email})? They will not be able to log in until unblocked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-2 block">Select Reason for Blocking</label>
            <Select value={blockReason} onValueChange={setBlockReason}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a reason..." />
              </SelectTrigger>
              <SelectContent>
                {blockReasons.map((reason) => (
                  <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!blockReason && blockDialogOpen && (
              <p className="text-xs text-muted-foreground mt-1.5">A reason is required to block a user.</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlockUser}
              disabled={actionLoading || !blockReason}
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Ban className="h-4 w-4 mr-2" />}
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User Account</DialogTitle>
            <DialogDescription>
              Create a Candidate or Employer account. Login credentials will be emailed to the user.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cu-role">Account Type</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) => setCreateForm((p) => ({ ...p, role: v as "candidate" | "employer", plan: "none" }))}
              >
                <SelectTrigger id="cu-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="candidate">Candidate</SelectItem>
                  <SelectItem value="employer">Employer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cu-name">Full Name</Label>
              <Input
                id="cu-name"
                placeholder="John Doe"
                value={createForm.fullName}
                onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cu-email">Email</Label>
              <Input
                id="cu-email"
                type="email"
                placeholder="user@example.com"
                value={createForm.email}
                onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cu-pwd">Temporary Password</Label>
              <div className="flex gap-2">
                <Input
                  id="cu-pwd"
                  type="text"
                  placeholder="Min 6 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                />
                <Button type="button" variant="outline" onClick={generatePassword}>
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The user will be asked to change this on first login.
              </p>
            </div>

            <div className="rounded-md border p-3 space-y-3 bg-muted/30">
              <div className="text-sm font-semibold">Activate Plan & Add Points (optional)</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="cu-plan" className="text-xs">Plan</Label>
                  <Select
                    value={createForm.plan}
                    onValueChange={(v) => {
                      const role = createForm.role as PlanRole;
                      const found = (PLANS[role] ?? []).find((pl) => pl.id === v);
                      // Candidates don't use wallet points for plans (per-feature Razorpay unlocks instead)
                      const autoFillPoints = role !== "candidate" && v !== "none" && found;
                      setCreateForm((p) => ({
                        ...p,
                        plan: v,
                        points: autoFillPoints ? String(found!.points) : p.points,
                      }));
                    }}
                  >
                    <SelectTrigger id="cu-plan"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No plan</SelectItem>
                      {(PLANS[createForm.role as PlanRole] ?? PLANS.candidate).map((p) => {
                        const isCandidate = createForm.role === "candidate";
                        const suffix = isCandidate
                          ? (p.priceInr ? ` — ₹${p.priceInr.toLocaleString("en-IN")}${p.group === "bundle" ? " (bundle)" : ""}` : "")
                          : (p.points > 0 ? ` — ${p.points.toLocaleString("en-IN")} pts` : "");
                        return (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}{suffix}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cu-cycle" className="text-xs">Billing Cycle</Label>
                  <Select
                    value={createForm.billingCycle}
                    onValueChange={(v) => setCreateForm((p) => ({ ...p, billingCycle: v as "monthly" | "annual" }))}
                  >
                    <SelectTrigger id="cu-cycle"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="annual">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cu-points" className="text-xs">Wallet Points to Credit</Label>
                <Input
                  id="cu-points"
                  type="number"
                  min={0}
                  placeholder="e.g. 500"
                  value={createForm.points}
                  onChange={(e) => setCreateForm((p) => ({ ...p, points: e.target.value }))}
                />
                <p className="text-[11px] text-muted-foreground">1 point = ₹5. Leave blank to skip.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={createLoading}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={createLoading}>
              {createLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Create & Email Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default Users;
