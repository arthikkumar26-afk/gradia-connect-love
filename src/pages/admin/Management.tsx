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
  Plus,
  Mail,
  Trash2,
  Edit,
  UserCog,
  ClipboardList,
  Loader2,
  CheckCircle2,
  XCircle,
  Search,
  MessageSquare,
  CreditCard,
  UserCheck
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface ManagementMember {
  id: string;
  full_name: string;
  email: string;
  role: string;
  department: string | null;
  is_active: boolean;
  receives_slot_notifications: boolean;
  receives_demo_notifications: boolean;
  created_at: string;
}

export default function AdminManagement() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<ManagementMember[]>([]);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<ManagementMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "reviewer",
    department: "",
    receives_slot_notifications: true,
    receives_demo_notifications: true
  });

  const menuItems = [
    { title: "Dashboard", icon: Home, path: "/admin/dashboard" },
    { title: "Users", icon: Users, path: "/admin/users" },
    { title: "Subscribed Employers", icon: CreditCard, path: "/admin/subscribed-employers" },
    { title: "Subscribed Candidates", icon: UserCheck, path: "/admin/subscribed-candidates" },
    { title: "Trending Jobs", icon: TrendingUp, path: "/admin/trending-jobs" },
    { title: "Job Moderation", icon: Briefcase, path: "/admin/jobs" },
    { title: "Companies", icon: Building2, path: "/admin/companies" },
    { title: "Mock Interview", icon: ClipboardList, path: "/admin/mock-interview-pipeline" },
    { title: "Management", icon: UserCog, path: "/admin/management" },
    { title: "HR Negotiations", icon: MessageSquare, path: "/admin/hr-negotiations" },
    { title: "Reports", icon: BarChart3, path: "/admin/reports" },
    { title: "Audit Logs", icon: FileText, path: "/admin/audit" },
    { title: "Settings", icon: Settings, path: "/admin/settings" },
  ];

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('management_team')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading management team:', error);
      toast({
        title: "Error",
        description: "Failed to load management team",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  const openAddDialog = () => {
    setFormData({
      full_name: "",
      email: "",
      role: "reviewer",
      department: "",
      receives_slot_notifications: true,
      receives_demo_notifications: true
    });
    setEditingMember(null);
    setShowAddDialog(true);
  };

  const openEditDialog = (member: ManagementMember) => {
    setFormData({
      full_name: member.full_name,
      email: member.email,
      role: member.role,
      department: member.department || "",
      receives_slot_notifications: member.receives_slot_notifications,
      receives_demo_notifications: member.receives_demo_notifications
    });
    setEditingMember(member);
    setShowAddDialog(true);
  };

  const saveMember = async () => {
    if (!formData.full_name || !formData.email) {
      toast({
        title: "Error",
        description: "Name and email are required",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingMember) {
        const { error } = await supabase
          .from('management_team')
          .update({
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
            department: formData.department || null,
            receives_slot_notifications: formData.receives_slot_notifications,
            receives_demo_notifications: formData.receives_demo_notifications
          })
          .eq('id', editingMember.id);
        
        if (error) throw error;
        toast({ title: "Success", description: "Member updated successfully" });
      } else {
        const { error } = await supabase
          .from('management_team')
          .insert({
            full_name: formData.full_name,
            email: formData.email,
            role: formData.role,
            department: formData.department || null,
            receives_slot_notifications: formData.receives_slot_notifications,
            receives_demo_notifications: formData.receives_demo_notifications
          });
        
        if (error) throw error;
        toast({ title: "Success", description: "Member added successfully" });
      }
      
      setShowAddDialog(false);
      loadMembers();
    } catch (error: any) {
      console.error('Error saving member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save member",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMemberStatus = async (member: ManagementMember) => {
    try {
      const { error } = await supabase
        .from('management_team')
        .update({ is_active: !member.is_active })
        .eq('id', member.id);
      
      if (error) throw error;
      loadMembers();
      toast({
        title: "Success",
        description: `Member ${member.is_active ? 'deactivated' : 'activated'}`
      });
    } catch (error) {
      console.error('Error toggling status:', error);
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const deleteMember = async (member: ManagementMember) => {
    if (!confirm(`Are you sure you want to delete ${member.full_name}?`)) return;
    
    try {
      const { error } = await supabase
        .from('management_team')
        .delete()
        .eq('id', member.id);
      
      if (error) throw error;
      loadMembers();
      toast({ title: "Success", description: "Member deleted successfully" });
    } catch (error) {
      console.error('Error deleting member:', error);
      toast({
        title: "Error",
        description: "Failed to delete member",
        variant: "destructive"
      });
    }
  };

  const filteredMembers = members.filter(m => 
    m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger>
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <h1 className="text-lg font-semibold">Management Team</h1>
            </div>
            <Button onClick={openAddDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Member
            </Button>
          </header>

          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCog className="h-5 w-5" />
                  Management Team Members
                </CardTitle>
                <CardDescription>
                  Team members who receive notifications for slot bookings and demo feedback requests.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredMembers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No members found matching your search" : "No management team members yet. Add one to get started."}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Notifications</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell className="font-medium">{member.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">{member.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {member.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{member.department || "-"}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {member.receives_slot_notifications && (
                                <Badge variant="secondary" className="text-xs">Slots</Badge>
                              )}
                              {member.receives_demo_notifications && (
                                <Badge variant="secondary" className="text-xs">Demo</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {member.is_active ? (
                              <Badge className="bg-green-500/10 text-green-600 gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <XCircle className="h-3 w-3" />
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(member)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleMemberStatus(member)}
                              >
                                {member.is_active ? (
                                  <XCircle className="h-4 w-4 text-orange-500" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMember(member)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMember ? "Edit Team Member" : "Add Team Member"}
            </DialogTitle>
            <DialogDescription>
              {editingMember 
                ? "Update the team member's information" 
                : "Add a new member to receive notifications"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="Enter full name"
              />
            </div>
            
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            
            <div>
              <Label htmlFor="role">Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                placeholder="Enter department (optional)"
              />
            </div>
            
            <div className="space-y-3">
              <Label>Notification Preferences</Label>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="slot_notif" className="text-sm font-normal">Slot Booking Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive email when candidates book slots</p>
                </div>
                <Switch
                  id="slot_notif"
                  checked={formData.receives_slot_notifications}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, receives_slot_notifications: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="demo_notif" className="text-sm font-normal">Demo Feedback Requests</Label>
                  <p className="text-xs text-muted-foreground">Receive email to review demo rounds</p>
                </div>
                <Switch
                  id="demo_notif"
                  checked={formData.receives_demo_notifications}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, receives_demo_notifications: checked }))}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveMember} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editingMember ? "Update" : "Add"} Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
