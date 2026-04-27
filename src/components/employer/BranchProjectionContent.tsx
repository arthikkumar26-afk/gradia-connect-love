import { Card } from "@/components/ui/card";
import { Building2, Users, UserCog, Briefcase, User } from "lucide-react";

type TreeNode = {
  label: string;
  icon: React.ElementType;
  color: string;
  children?: TreeNode[];
};

const rootChildren: TreeNode[] = [
  {
    label: "Branches",
    icon: Building2,
    color: "bg-blue-500/10 text-blue-700 border-blue-500/30 dark:text-blue-300",
    children: [
      { label: "Branch A", icon: Building2, color: "bg-blue-500/5 text-foreground border-blue-500/20" },
      { label: "Branch B", icon: Building2, color: "bg-blue-500/5 text-foreground border-blue-500/20" },
      { label: "Branch C", icon: Building2, color: "bg-blue-500/5 text-foreground border-blue-500/20" },
    ],
  },
  {
    label: "HR's",
    icon: Users,
    color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
    children: [
      { label: "HR Lead", icon: Users, color: "bg-emerald-500/5 text-foreground border-emerald-500/20" },
      { label: "HR Executive", icon: Users, color: "bg-emerald-500/5 text-foreground border-emerald-500/20" },
    ],
  },
  {
    label: "Management",
    icon: UserCog,
    color: "bg-purple-500/10 text-purple-700 border-purple-500/30 dark:text-purple-300",
    children: [
      {
        label: "Organize",
        icon: Briefcase,
        color: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300",
      },
      {
        label: "Individual",
        icon: User,
        color: "bg-rose-500/10 text-rose-700 border-rose-500/30 dark:text-rose-300",
      },
    ],
  },
];

const NodeBox = ({ node }: { node: TreeNode }) => {
  const Icon = node.icon;
  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border-2 shadow-sm ${node.color} font-medium text-sm whitespace-nowrap`}
    >
      <Icon className="h-4 w-4" />
      <span>{node.label}</span>
    </div>
  );
};

const TreeBranch = ({ node, isRoot = false }: { node: TreeNode; isRoot?: boolean }) => {
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      <NodeBox node={node} />

      {hasChildren && (
        <>
          {/* vertical line down from parent */}
          <div className="w-px h-6 bg-border" />

          {/* horizontal connector */}
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
                {/* vertical line up from child */}
                <div className="w-px h-6 bg-border" />
                <TreeBranch node={child} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const BranchProjectionContent = () => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Branch Projection</h3>
        <p className="text-sm text-muted-foreground">
          Visualize your organization structure across branches, HR teams, and management hierarchy.
        </p>
      </div>

      <Card className="p-6 md:p-10 overflow-x-auto">
        <div className="min-w-fit mx-auto flex items-start justify-center gap-6 md:gap-10">
          {rootChildren.map((node, idx) => (
            <TreeBranch key={idx} node={node} isRoot />
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
    </div>
  );
};

export default BranchProjectionContent;
