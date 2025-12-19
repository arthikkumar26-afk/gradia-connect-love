import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  Package,
  Settings,
  Menu,
  X,
  LogOut,
  Award,
  Users,
  Store,
  MessageSquare,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SponsorDashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
}

const menuItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, path: "/sponsor/dashboard" },
  { id: "sponsorships", label: "My Sponsorships", icon: FileText, path: "/sponsor/sponsorships" },
  { id: "stalls", label: "My Stalls", icon: Store, path: "/sponsor/stalls" },
  { id: "leads", label: "Candidate Leads", icon: Users, path: "/sponsor/leads" },
  { id: "analytics", label: "Analytics", icon: BarChart3, path: "/sponsor/analytics" },
  { id: "resources", label: "Branding Resources", icon: Package, path: "/sponsor/resources" },
  { id: "messages", label: "Messages & Support", icon: MessageSquare, path: "/sponsor/messages" },
  { id: "billing", label: "Billing & Invoices", icon: CreditCard, path: "/sponsor/billing" },
  { id: "settings", label: "Settings", icon: Settings, path: "/sponsor/settings" },
];

export default function SponsorDashboardLayout({ children, activeTab }: SponsorDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error signing out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b z-50 flex items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <div className="flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          <span className="font-semibold">Sponsor Portal</span>
        </div>
        <div className="w-10" />
      </header>

      <div className="flex pt-16 lg:pt-0">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed lg:sticky top-16 lg:top-0 left-0 h-[calc(100vh-4rem)] lg:h-screen bg-card border-r transition-all duration-300 z-40 overflow-hidden",
            sidebarOpen ? "w-64" : "w-0 lg:w-20"
          )}
        >
          <div className="flex flex-col h-full w-64">
            {/* Logo */}
            <div className="hidden lg:flex items-center gap-2 p-6 border-b">
              <Award className="h-6 w-6 text-primary flex-shrink-0" />
              {sidebarOpen && <span className="font-semibold">Sponsor Portal</span>}
            </div>


            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                    )}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                  </Link>
                );
              })}
            </nav>

            {/* Logout Button */}
            <div className="p-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                {sidebarOpen && <span>Logout</span>}
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-screen">
          <div className="container mx-auto p-6 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
