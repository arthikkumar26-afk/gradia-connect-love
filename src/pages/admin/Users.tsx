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
  MoreHorizontal
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
      const [profilesRes, credentialsRes] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_credentials').select('user_id, initial_password'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      
      const credMap = new Map<string, string>();
      (credentialsRes.data || []).forEach((c: any) => credMap.set(c.user_id, c.initial_password));
      
      const usersWithPasswords = (profilesRes.data || []).map((u: any) => ({
        ...u,
        initial_password: credMap.get(u.id) || null,
      }));
      
      setUsers(usersWithPasswords);
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
                <p>If you believe this action was taken in error, or if you would like to discuss this further, please contact our support team at <a href="mailto:support@gradia.co.in">support@gradia.co.in</a>.</p>
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
                                  onClick={() => {
                                    toast({
                                      title: "View User",
                                      description: `Viewing ${user.full_name}'s profile.`,
                                    });
                                  }}
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
    </SidebarProvider>
  );
};

export default Users;
