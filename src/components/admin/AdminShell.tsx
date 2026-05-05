import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  ShieldCheck, LogOut, Menu, Home, Users as UsersIcon, CreditCard, UserCheck,
  UserX, Briefcase, Building2, ClipboardList, UserCog, MessageSquare, Ticket,
  BarChart3, FileText, Settings, Receipt,
} from "lucide-react";

const menuItems = [
  { title: "Dashboard", icon: Home, path: "/admin/dashboard" },
  { title: "Users", icon: UsersIcon, path: "/admin/users" },
  { title: "Plan Control", icon: Receipt, path: "/admin/plan-control" },
  { title: "Subscribed Employers", icon: CreditCard, path: "/admin/subscribed-employers" },
  { title: "Subscribed Candidates", icon: UserCheck, path: "/admin/subscribed-candidates" },
  { title: "Unsubscribed Employers", icon: UserX, path: "/admin/unsubscribed-employers" },
  { title: "Unsubscribed Candidates", icon: UserX, path: "/admin/unsubscribed-candidates" },
  { title: "Job Moderation", icon: Briefcase, path: "/admin/jobs" },
  { title: "External Jobs", icon: Briefcase, path: "/admin/external-jobs" },
  { title: "Companies", icon: Building2, path: "/admin/companies" },
  { title: "Mock Interview", icon: ClipboardList, path: "/admin/mock-interview-pipeline" },
  { title: "Management", icon: UserCog, path: "/admin/management" },
  { title: "Coupons", icon: Ticket, path: "/admin/coupons" },
  { title: "Reports", icon: BarChart3, path: "/admin/reports" },
  { title: "Audit Logs", icon: FileText, path: "/admin/audit" },
  { title: "Settings", icon: Settings, path: "/admin/settings" },
];

interface AdminShellProps {
  title: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export const AdminShell = ({ title, headerRight, children }: AdminShellProps) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-muted/30">
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

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-border bg-background flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger>
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
            {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
          </header>

          <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminShell;
