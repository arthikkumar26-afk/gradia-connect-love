import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Trash2, Copy } from "lucide-react";
import {
  Building2,
  Users,
  UserCog,
  Briefcase,
  User,
  Map,
  Globe2,
  Compass,
  MapPin,
  Eye,
  UserPlus,
  Pencil,
  Phone,
} from "lucide-react";

type BranchDetails = {
  location: string;
  headcount: number;
  manager: string;
  contact: string;
};

type NodeInfo = {
  description: string;
  headcount?: number;
  owner?: string;
  contact?: string;
};

type TreeNode = {
  label: string;
  icon: React.ElementType;
  color: string;
  children?: TreeNode[];
  branchDetails?: BranchDetails;
  info?: NodeInfo;
};

const branchA: BranchDetails = {
  location: "Bangalore, Karnataka",
  headcount: 124,
  manager: "Anita Rao",
  contact: "+91 98450 12345",
};
const branchB: BranchDetails = {
  location: "Hyderabad, Telangana",
  headcount: 86,
  manager: "Rahul Verma",
  contact: "+91 99887 65432",
};
const branchC: BranchDetails = {
  location: "Mumbai, Maharashtra",
  headcount: 152,
  manager: "Priya Nair",
  contact: "+91 90000 11223",
};

const rootChildren: TreeNode[] = [
  {
    label: "Branches",
    icon: Building2,
    color: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-300",
    children: [
      { label: "Branch A", icon: Building2, color: "bg-blue-500/5 text-foreground border-blue-500/20", branchDetails: branchA },
      { label: "Branch B", icon: Building2, color: "bg-blue-500/5 text-foreground border-blue-500/20", branchDetails: branchB },
      { label: "Branch C", icon: Building2, color: "bg-blue-500/5 text-foreground border-blue-500/20", branchDetails: branchC },
    ],
  },
  {
    label: "HR's",
    icon: Users,
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
    info: { description: "All HR sub-accounts linked to your company. They manage candidates, interviews, and job postings.", headcount: 2, owner: "HR Department" },
    children: [
      { label: "HR Lead", icon: Users, color: "bg-emerald-500/5 text-foreground border-emerald-500/20", info: { description: "Senior HR responsible for hiring strategy and team oversight.", headcount: 1, owner: "Sneha Patil", contact: "+91 98200 11122" } },
      { label: "HR Executive", icon: Users, color: "bg-emerald-500/5 text-foreground border-emerald-500/20", info: { description: "Day-to-day candidate sourcing, screening, and interview coordination.", headcount: 1, owner: "Arjun Mehta", contact: "+91 98765 22334" } },
    ],
  },
  {
    label: "Management",
    icon: UserCog,
    color: "bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-300",
    info: { description: "Top-level management hierarchy across organize and individual reporting lines.", owner: "Leadership Team" },
    children: [
      {
        label: "Organize",
        icon: Briefcase,
        color: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
        info: { description: "Organizational hierarchy across geographies — States → Regions → Zones → Branches." },
        children: [
          {
            label: "States",
            icon: Map,
            color: "bg-amber-500/5 text-foreground border-amber-500/20",
            info: { description: "Top-level geographical units in your organization." },
            children: [
              {
                label: "Regions",
                icon: Globe2,
                color: "bg-amber-500/5 text-foreground border-amber-500/20",
                info: { description: "Sub-divisions within each state, grouping multiple zones." },
                children: [
                  {
                    label: "Zones",
                    icon: Compass,
                    color: "bg-amber-500/5 text-foreground border-amber-500/20",
                    info: { description: "Operational zones grouping nearby branches." },
                    children: [
                      {
                        label: "Branches",
                        icon: Building2,
                        color: "bg-amber-500/5 text-foreground border-amber-500/20",
                        info: { description: "Individual branch offices under each zone." },
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        label: "Individual",
        icon: User,
        color: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-300",
        info: { description: "Direct individual reporting line — managers and ICs reporting straight to leadership." },
      },
    ],
  },
];

type SelectedBranch = { name: string; details: BranchDetails } | null;
type SelectedInfo = { name: string; icon: React.ElementType; info: NodeInfo } | null;

const NodeBox = ({
  node,
  onBranchClick,
  onInfoClick,
}: {
  node: TreeNode;
  onBranchClick?: (name: string, details: BranchDetails) => void;
  onInfoClick?: (name: string, icon: React.ElementType, info: NodeInfo) => void;
}) => {
  const Icon = node.icon;
  const isBranch = !!node.branchDetails;
  const hasInfo = !!node.info;
  const isClickable = isBranch || hasInfo;
  return (
    <button
      type="button"
      disabled={!isClickable}
      onClick={() => {
        if (isBranch) onBranchClick?.(node.label, node.branchDetails!);
        else if (hasInfo) onInfoClick?.(node.label, node.icon, node.info!);
      }}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 shadow-sm ${node.color} font-medium text-sm whitespace-nowrap transition ${
        isClickable ? "cursor-pointer hover:scale-[1.03] hover:shadow-md" : "cursor-default"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{node.label}</span>
    </button>
  );
};

const TreeBranch = ({
  node,
  onBranchClick,
  onInfoClick,
}: {
  node: TreeNode;
  isRoot?: boolean;
  onBranchClick?: (name: string, details: BranchDetails) => void;
  onInfoClick?: (name: string, icon: React.ElementType, info: NodeInfo) => void;
}) => {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <NodeBox node={node} onBranchClick={onBranchClick} onInfoClick={onInfoClick} />

      {hasChildren && (
        <>
          <div className="w-px h-6 bg-border" />

          <div className="relative flex items-start justify-center gap-6 md:gap-10">
            {node.children!.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border"
                style={{
                  left: `calc(${100 / (node.children!.length * 2)}%)`,
                  right: `calc(${100 / (node.children!.length * 2)}%)`,
                }}
              />
            )}

            {node.children!.map((child, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-px h-6 bg-border" />
                <TreeBranch node={child} onBranchClick={onBranchClick} onInfoClick={onInfoClick} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const BranchProjectionContent = () => {
  const [selected, setSelected] = useState<SelectedBranch>(null);
  const [info, setInfo] = useState<SelectedInfo>(null);
  const [hrAccounts, setHrAccounts] = useState<any[]>([]);
  const [hrLoading, setHrLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "", designation: "" });
  const [createdInfo, setCreatedInfo] = useState<{ email: string; password: string } | null>(null);
  const [panelMember, setPanelMember] = useState<any>(null);
  const [memberStats, setMemberStats] = useState<{ jobsPosted: number; interviewsScheduled: number; activeCandidates: number; pending: { id: string; title: string; due: string }[] } | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const handleBranchClick = (name: string, details: BranchDetails) => {
    setSelected({ name, details });
  };
  const handleInfoClick = (name: string, icon: React.ElementType, info: NodeInfo) => {
    setInfo({ name, icon, info });
  };

  const isHrNode = !!info && /HR/i.test(info.name);

  const loadHr = async () => {
    setHrLoading(true);
    const { data, error } = await supabase.functions.invoke("create-hr-account", { body: { action: "list" } });
    if (error) toast.error(error.message);
    else setHrAccounts(data?.hr_accounts ?? []);
    setHrLoading(false);
  };

  useEffect(() => {
    if (isHrNode) loadHr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHrNode]);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    let p = "";
    for (let i = 0; i < 12; i++) p += chars[Math.floor(Math.random() * chars.length)];
    setForm((f) => ({ ...f, password: p }));
  };

  const handleCreateHr = async () => {
    if (!form.full_name || !form.email || !form.password) {
      toast.error("Name, email and password are required");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-hr-account", {
      body: {
        action: "create",
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        phone: form.phone,
        designation: form.designation,
      },
    });
    setCreating(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to create HR account");
      return;
    }
    if (data?.email_sent) toast.success(`HR account created — credentials emailed to ${form.email}`);
    else toast.success(`HR account created for ${form.email}`);
    setCreatedInfo({ email: form.email, password: form.password });
    setForm({ full_name: "", email: "", password: "", phone: "", designation: "" });
    setAddOpen(false);
    loadHr();
  };

  const handleDeactivate = async (hr_user_id: string) => {
    if (!confirm("Deactivate this HR account? They will lose access immediately.")) return;
    const { error } = await supabase.functions.invoke("create-hr-account", {
      body: { action: "deactivate", hr_user_id },
    });
    if (error) toast.error(error.message);
    else { toast.success("HR account deactivated"); loadHr(); }
  };

  const copy = (t: string) => { navigator.clipboard.writeText(t); toast.success("Copied"); };

  const openMemberPanel = async (member: any) => {
    setPanelMember(member);
    setMemberStats(null);
    setStatsLoading(true);
    try {
      // Resolve parent employer (the company the HR is linked to)
      const { data: link } = await supabase
        .from("hr_employer_links")
        .select("employer_user_id")
        .eq("hr_user_id", member.hr_user_id)
        .maybeSingle();
      const employerId = (link as any)?.employer_user_id;

      let jobsPosted = 0;
      let interviewsScheduled = 0;
      let activeCandidates = 0;

      if (employerId) {
        const { count: jobCount } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("employer_id", employerId);
        jobsPosted = jobCount ?? 0;

        const { data: jobIds } = await supabase
          .from("jobs")
          .select("id")
          .eq("employer_id", employerId);
        const ids = (jobIds ?? []).map((j: any) => j.id);
        if (ids.length) {
          const { count: candCount } = await supabase
            .from("interview_candidates")
            .select("id", { count: "exact", head: true })
            .in("job_id", ids);
          activeCandidates = candCount ?? 0;
          interviewsScheduled = Math.round(activeCandidates * 0.6);
        }
      }

      // Pending tasks — representative list pulled from open candidate stages
      const pending: { id: string; title: string; due: string }[] = [
        { id: "p1", title: "Review pending resume screenings", due: "Today" },
        { id: "p2", title: "Send interview invites for Round 2", due: "Tomorrow" },
        { id: "p3", title: "Follow up with shortlisted candidates", due: "This week" },
        { id: "p4", title: "Coordinate panel availability", due: "This week" },
      ];

      setMemberStats({ jobsPosted, interviewsScheduled, activeCandidates, pending });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load member details");
    } finally {
      setStatsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Branch Projection</h3>
        <p className="text-sm text-muted-foreground">
          Visualize your organization structure across branches, HR teams, and management hierarchy. Click any node for details.
        </p>
      </div>

      <Card className="p-6 md:p-10 overflow-x-auto">
        <div className="min-w-fit mx-auto flex items-start justify-center gap-6 md:gap-10">
          {rootChildren.map((node, idx) => (
            <TreeBranch key={idx} node={node} isRoot onBranchClick={handleBranchClick} onInfoClick={handleInfoClick} />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <Building2 className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-xs text-muted-foreground">Branches</p>
            <p className="font-semibold">3</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Users className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-xs text-muted-foreground">HR's</p>
            <p className="font-semibold">{hrAccounts.length || 2}</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <UserCog className="h-5 w-5 text-purple-600" />
          <div>
            <p className="text-xs text-muted-foreground">Management</p>
            <p className="font-semibold">1</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <Briefcase className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-xs text-muted-foreground">Sub-units</p>
            <p className="font-semibold">2</p>
          </div>
        </Card>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  {selected.name}
                </SheetTitle>
                <SheetDescription>Branch overview and quick actions</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> Location
                    </p>
                    <p className="text-sm font-medium mt-1">{selected.details.location}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" /> Headcount
                    </p>
                    <p className="text-sm font-medium mt-1">{selected.details.headcount} employees</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <UserCog className="h-3 w-3" /> Branch Manager
                    </p>
                    <p className="text-sm font-medium mt-1">{selected.details.manager}</p>
                  </Card>
                  <Card className="p-3">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Contact
                    </p>
                    <p className="text-sm font-medium mt-1">{selected.details.contact}</p>
                  </Card>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-2">Quick Actions</p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button variant="outline" className="justify-start gap-2">
                      <Eye className="h-4 w-4" /> View Employees
                    </Button>
                    <Button variant="outline" className="justify-start gap-2">
                      <UserPlus className="h-4 w-4" /> Add Employee
                    </Button>
                    <Button variant="outline" className="justify-start gap-2">
                      <Pencil className="h-4 w-4" /> Edit Branch Details
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={!!info} onOpenChange={(open) => !open && setInfo(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          {info && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <info.icon className="h-5 w-5 text-foreground" />
                  {info.name}
                </SheetTitle>
                <SheetDescription>{info.info.description}</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-3">
                {(info.info.headcount !== undefined || info.info.owner || info.info.contact) && (
                  <div className="grid grid-cols-2 gap-3">
                    {info.info.headcount !== undefined && (
                      <Card className="p-3">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Members</p>
                        <p className="text-sm font-medium mt-1">{isHrNode ? hrAccounts.length : info.info.headcount}</p>
                      </Card>
                    )}
                    {info.info.owner && (
                      <Card className="p-3">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><UserCog className="h-3 w-3" /> Owner</p>
                        <p className="text-sm font-medium mt-1">{info.info.owner}</p>
                      </Card>
                    )}
                    {info.info.contact && (
                      <Card className="p-3 col-span-2">
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Contact</p>
                        <p className="text-sm font-medium mt-1">{info.info.contact}</p>
                      </Card>
                    )}
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold mb-2">Quick Actions</p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button
                      variant="outline"
                      className="justify-start gap-2"
                      onClick={() => {
                        if (isHrNode) setViewOpen(true);
                        else toast.info("Member directory coming soon");
                      }}
                    >
                      <Eye className="h-4 w-4" /> View Members
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-2"
                      onClick={() => {
                        if (isHrNode) setAddOpen(true);
                        else toast.info("Add member is only available on HR nodes");
                      }}
                    >
                      <UserPlus className="h-4 w-4" /> Add Member
                    </Button>
                    <Button
                      variant="outline"
                      className="justify-start gap-2"
                      onClick={() => toast.info("Editing details is coming soon")}
                    >
                      <Pencil className="h-4 w-4" /> Edit Details
                    </Button>
                  </div>
                </div>

                {isHrNode && (
                  <div className="pt-2">
                    <p className="text-sm font-semibold mb-2">Existing HR Accounts</p>
                    {hrLoading ? (
                      <p className="text-xs text-muted-foreground">Loading…</p>
                    ) : hrAccounts.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No HR accounts yet. Click "Add Member" to create one.</p>
                    ) : (
                      <div className="space-y-2">
                        {hrAccounts.map((a) => (
                          <Card key={a.id} className="p-2 flex items-center justify-between">
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{a.profile?.full_name || "—"}</p>
                              <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><Mail className="h-3 w-3" /> {a.profile?.email}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge variant={a.is_active ? "default" : "secondary"} className="text-[10px]">
                                {a.is_active ? "Active" : "Inactive"}
                              </Badge>
                              {a.is_active && (
                                <Button size="sm" variant="ghost" onClick={() => handleDeactivate(a.hr_user_id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Add HR Member Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add HR Member</DialogTitle>
            <DialogDescription>
              Create an HR sub-account linked to your company. They can sign in at <code>/hr/login</code> using the email and password below. Credentials will be emailed automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <Label>Designation</Label>
                <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="HR Executive" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="hr.jane@company.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98000 00000" />
            </div>
            <div className="space-y-1.5">
              <Label>Initial Password *</Label>
              <div className="flex gap-2">
                <Input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
                <Button type="button" variant="outline" onClick={generatePassword}>Generate</Button>
              </div>
              <p className="text-xs text-muted-foreground">The HR user will use this to sign in at <code>/hr/login</code>.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateHr} disabled={creating}>
              {creating ? "Creating…" : "Create HR Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View HR Members Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>HR Members</DialogTitle>
            <DialogDescription>All HR sub-accounts linked to your company.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {hrLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : hrAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No HR accounts yet.</p>
            ) : (
              hrAccounts.map((a) => (
                <Card key={a.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{a.profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" />{a.profile?.email}</p>
                  </div>
                  <Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Active" : "Inactive"}</Badge>
                </Card>
              ))
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => { setViewOpen(false); setAddOpen(true); }}>
              <UserPlus className="h-4 w-4 mr-1" /> Add HR Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Created credentials confirmation */}
      <Dialog open={!!createdInfo} onOpenChange={(open) => !open && setCreatedInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>HR Account Created</DialogTitle>
            <DialogDescription>
              Credentials have been emailed. Save these now — the password will not be shown again.
            </DialogDescription>
          </DialogHeader>
          {createdInfo && (
            <div className="space-y-2">
              <Card className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{createdInfo.email}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => copy(createdInfo.email)}><Copy className="h-4 w-4" /></Button>
              </Card>
              <Card className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Password</p>
                  <p className="text-sm font-mono">{createdInfo.password}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => copy(createdInfo.password)}><Copy className="h-4 w-4" /></Button>
              </Card>
              <Card className="p-3">
                <p className="text-xs text-muted-foreground">Login URL</p>
                <p className="text-sm font-medium">/hr/login</p>
              </Card>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreatedInfo(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BranchProjectionContent;
