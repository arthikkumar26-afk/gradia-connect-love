import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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

  const handleBranchClick = (name: string, details: BranchDetails) => {
    setSelected({ name, details });
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Branch Projection</h3>
        <p className="text-sm text-muted-foreground">
          Visualize your organization structure across branches, HR teams, and management hierarchy. Click a branch for details.
        </p>
      </div>

      <Card className="p-6 md:p-10 overflow-x-auto">
        <div className="min-w-fit mx-auto flex items-start justify-center gap-6 md:gap-10">
          {rootChildren.map((node, idx) => (
            <TreeBranch key={idx} node={node} isRoot onBranchClick={handleBranchClick} />
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
            <p className="font-semibold">2</p>
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
    </div>
  );
};

export default BranchProjectionContent;
