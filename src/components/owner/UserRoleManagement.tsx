import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Shield, Crown, Users, UserPlus, Trash2, Search, Loader2, Plus, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MEMBERSHIP_PLANS: Record<string, { name: string; monthly: number; annual: number }[]> = {
  candidate: [
    { name: "Pro", monthly: 1499, annual: 14990 },
    { name: "Premium", monthly: 1999, annual: 19990 },
  ],
  employer: [
    { name: "Starter", monthly: 0, annual: 0 },
    { name: "Growth", monthly: 4999, annual: 49990 },
    { name: "Professional", monthly: 14999, annual: 149990 },
    { name: "Enterprise", monthly: 29000, annual: 290000 },
  ],
  freelancer: [
    { name: "Starter", monthly: 0, annual: 0 },
    { name: "Pro", monthly: 1499, annual: 14990 },
    { name: "Premium", monthly: 2999, annual: 29990 },
  ],
  edutech: [
    { name: "Starter", monthly: 0, annual: 0 },
    { name: "Growth", monthly: 4999, annual: 49990 },
    { name: "Enterprise", monthly: 14999, annual: 149990 },
  ],
};

interface UserWithRoles {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  privilegedRoles: string[];
}

const UserRoleManagement = () => {
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "candidate" as string,
    withMembership: false,
    plan: "",
    billingCycle: "monthly" as "monthly" | "annual",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [roleToRemove, setRoleToRemove] = useState<{ userId: string; role: string } | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithRoles | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await supabase.functions.invoke("manage-user-roles", {
        body: { action: "list-users" },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setUsers(response.data.users || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    setIsAssigning(true);
    try {
      const response = await supabase.functions.invoke("manage-user-roles", {
        body: {
          action: "assign-role",
          targetUserId: selectedUser.id,
          role: selectedRole,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Success",
        description: `${selectedRole} role assigned to ${selectedUser.full_name}`,
      });

      setSelectedUser(null);
      setSelectedRole("");
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign role",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleRemoveRole = async () => {
    if (!roleToRemove) return;

    setIsAssigning(true);
    try {
      const response = await supabase.functions.invoke("manage-user-roles", {
        body: {
          action: "remove-role",
          targetUserId: roleToRemove.userId,
          role: roleToRemove.role,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Success",
        description: `Role removed successfully`,
      });

      setRoleToRemove(null);
      fetchUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove role",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!createForm.fullName || !createForm.email || !createForm.password) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      const response = await supabase.functions.invoke("manage-user-roles", {
        body: {
          action: "create-user",
          targetEmail: createForm.email,
          password: createForm.password,
          fullName: createForm.fullName,
          role: createForm.role,
        },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      const newUserId = response.data?.userId;

      if (createForm.withMembership && createForm.plan && newUserId) {
        const plans = MEMBERSHIP_PLANS[createForm.role] || [];
        const selectedPlan = plans.find(p => p.name === createForm.plan);
        if (selectedPlan) {
          const amount = createForm.billingCycle === "annual" ? selectedPlan.annual : selectedPlan.monthly;
          const now = new Date();
          const endsAt = new Date(now);
          if (createForm.billingCycle === "annual") {
            endsAt.setFullYear(endsAt.getFullYear() + 1);
          } else {
            endsAt.setMonth(endsAt.getMonth() + 1);
          }
          if (createForm.role === "candidate") {
            await supabase.from("candidate_subscriptions").insert({
              candidate_id: newUserId,
              plan: createForm.plan.toLowerCase(),
              status: "active",
              started_at: now.toISOString(),
              ends_at: endsAt.toISOString(),
            });
          } else {
            await supabase.from("subscriptions").insert({
              employer_id: newUserId,
              plan_id: createForm.plan.toLowerCase(),
              plan_name: createForm.plan,
              amount,
              status: "active",
              billing_cycle: createForm.billingCycle,
              started_at: now.toISOString(),
              ends_at: endsAt.toISOString(),
              payment_method: "owner_assigned",
            });
          }
        }
      }

      toast({
        title: "Account Created",
        description: `${createForm.role} account for ${createForm.email}${createForm.withMembership ? ` with ${createForm.plan} plan` : ""}`,
      });
      setCreateForm({ fullName: "", email: "", password: "", role: "candidate", withMembership: false, plan: "", billingCycle: "monthly" });
      setIsCreateOpen(false);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create account", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const response = await supabase.functions.invoke("manage-user-roles", {
        body: { action: "delete-user", targetUserId: userToDelete.id },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Deleted", description: `Account ${userToDelete.email} has been deleted.` });
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete account", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "owner":
        return "default";
      case "admin":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <Crown className="h-3 w-3 mr-1" />;
      case "admin":
        return <Shield className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle>User Role Management</CardTitle>
              <CardDescription>Create & manage user accounts and roles</CardDescription>
            </div>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Account
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Base Role</TableHead>
                  <TableHead>Privileged Roles</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.privilegedRoles.map((role) => (
                            <Badge
                              key={role}
                              variant={getRoleBadgeVariant(role)}
                              className="flex items-center"
                            >
                              {getRoleIcon(role)}
                              {role}
                              <button
                                onClick={() => setRoleToRemove({ userId: user.id, role })}
                                className="ml-1 hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {user.privilegedRoles.length === 0 && (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setIsDialogOpen(true);
                            }}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            Assign Role
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            onClick={() => setUserToDelete(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Assign Role Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Role</DialogTitle>
              <DialogDescription>
                Assign a privileged role to {selectedUser?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-2" />
                      Admin
                    </div>
                  </SelectItem>
                  <SelectItem value="owner">
                    <div className="flex items-center">
                      <Crown className="h-4 w-4 mr-2" />
                      Owner
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAssignRole} disabled={!selectedRole || isAssigning}>
                {isAssigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Assign Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Role Confirmation */}
        <Dialog open={!!roleToRemove} onOpenChange={() => setRoleToRemove(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remove Role</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove the {roleToRemove?.role} role from this user?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleToRemove(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRemoveRole} disabled={isAssigning}>
                {isAssigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Remove Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Account Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Account
              </DialogTitle>
              <DialogDescription>
                Create a new user account with a specific role and optional membership.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  placeholder="Enter full name"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm(f => ({ ...f, fullName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={createForm.email}
                  onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Password *</Label>
                <Input
                  type="password"
                  placeholder="Set password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Role *</Label>
                <Select
                  value={createForm.role}
                  onValueChange={(val) => setCreateForm(f => ({ ...f, role: val, plan: "", withMembership: false }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="candidate">Candidate</SelectItem>
                    <SelectItem value="employer">Employer</SelectItem>
                    <SelectItem value="freelancer">Freelancer</SelectItem>
                    <SelectItem value="edutech">EduTech</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Membership Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Assign Membership</Label>
                    <p className="text-xs text-muted-foreground">Create with an active subscription plan</p>
                  </div>
                </div>
                <Switch
                  checked={createForm.withMembership}
                  onCheckedChange={(checked) => setCreateForm(f => ({ ...f, withMembership: checked, plan: "" }))}
                />
              </div>

              {createForm.withMembership && MEMBERSHIP_PLANS[createForm.role] && (
                <div className="space-y-3 rounded-lg border p-3 bg-muted/30">
                  <div className="space-y-2">
                    <Label>Plan</Label>
                    <Select
                      value={createForm.plan}
                      onValueChange={(val) => setCreateForm(f => ({ ...f, plan: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {MEMBERSHIP_PLANS[createForm.role].map((plan) => (
                          <SelectItem key={plan.name} value={plan.name}>
                            {plan.name} — ₹{createForm.billingCycle === "annual" ? plan.annual.toLocaleString() + "/yr" : plan.monthly.toLocaleString() + "/mo"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Billing Cycle</Label>
                    <Select
                      value={createForm.billingCycle}
                      onValueChange={(val: "monthly" | "annual") => setCreateForm(f => ({ ...f, billingCycle: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateAccount} disabled={isCreating || !createForm.fullName || !createForm.email || !createForm.password}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Account Confirmation */}
        <Dialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete Account</DialogTitle>
              <DialogDescription>
                Are you sure you want to permanently delete <strong>{userToDelete?.full_name}</strong> ({userToDelete?.email})? This will remove their profile, roles, and auth account. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUserToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteAccount} disabled={isDeleting}>
                {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default UserRoleManagement;
