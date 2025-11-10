import { useState } from "react";
import { Link } from "react-router-dom";
import gradiaLogo from "@/assets/gradia-logo.png";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  UsersRound, 
  Building2, 
  UserCheck, 
  BookOpen, 
  CheckSquare, 
  Settings, 
  Sliders,
  FileText,
  Clock,
  UserPlus,
  Calendar,
  Award,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobManagementContent } from "@/components/employer/JobManagementContent";
import TalentPoolContent from "@/components/employer/TalentPoolContent";
import PlacementsContent from "@/components/employer/PlacementsContent";

const EmployerDashboard = () => {
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/employer/dashboard" },
    { id: "jobs", label: "Jobs", icon: Briefcase, path: "/employer/jobs" },
    { id: "talent-pool", label: "Talent Pool", icon: Users, path: "/employer/talent-pool" },
    { id: "teams", label: "Teams", icon: UsersRound, path: "/employer/teams" },
    { id: "clients", label: "Clients", icon: Building2, path: "/employer/clients" },
    { id: "placements", label: "Placements", icon: UserCheck, path: "/employer/placements" },
    { id: "knowledge", label: "Knowledge Base", icon: BookOpen, path: "/employer/knowledge" },
    { id: "approvals", label: "Approvals", icon: CheckSquare, path: "/employer/approvals" },
    { id: "settings", label: "Settings", icon: Settings, path: "/employer/settings" },
    { id: "configuration", label: "Configuration", icon: Sliders, path: "/employer/configuration" },
  ];

  const dashboardCards = [
    {
      title: "Shortlisted Profile Status",
      value: "24",
      subtitle: "Profiles under review",
      icon: FileText,
      gradient: "from-accent/20 to-accent/5",
    },
    {
      title: "Active Job Posts",
      value: "12",
      subtitle: "Currently hiring for",
      icon: Briefcase,
      gradient: "from-primary/20 to-primary/5",
    },
    {
      title: "Total Applications Received",
      value: "156",
      subtitle: "In last 30 days",
      icon: UserPlus,
      gradient: "from-success/20 to-success/5",
    },
    {
      title: "Pending Applications to Review",
      value: "48",
      subtitle: "Awaiting your feedback",
      icon: Clock,
      gradient: "from-warning/20 to-warning/5",
    },
    {
      title: "Shortlisted Candidates",
      value: "32",
      subtitle: "Ready for interviews",
      icon: UserCheck,
      gradient: "from-accent/20 to-accent/5",
    },
    {
      title: "Interviews Scheduled",
      value: "18",
      subtitle: "This week",
      icon: Calendar,
      gradient: "from-primary/20 to-primary/5",
    },
    {
      title: "Hires Complete",
      value: "8",
      subtitle: "This month",
      icon: Award,
      gradient: "from-success/20 to-success/5",
    },
  ];

  return (
    <div className="bg-subtle flex min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-card border-r border-border transition-all duration-300 overflow-hidden flex flex-col`}
      >
        <nav className="flex-1 p-4 space-y-1 pt-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-2xl font-bold text-foreground">
              {activeMenu === "jobs" ? "Job Management" : "Dashboard"}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="lg" className="rounded-xl" asChild>
              <Link to="/profile/edit">
                <Settings className="h-5 w-5 mr-2" />
                Edit Profile
              </Link>
            </Button>
            <Button variant="cta" size="lg" className="rounded-xl" asChild>
              <Link to="/employer/post-job">
                <Briefcase className="h-5 w-5 mr-2" />
                Post New Job
              </Link>
            </Button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
          {activeMenu === "dashboard" && (
              <>
                {/* Summary Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {dashboardCards.map((card, index) => {
                    const Icon = card.icon;
                    
                    return (
                      <Card 
                        key={index}
                        className="overflow-hidden hover:shadow-large transition-all duration-300 animate-fade-in border-border"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <CardHeader className={`bg-gradient-to-br ${card.gradient} pb-3`}>
                          <div className="flex items-start justify-between">
                            <CardTitle className="text-base font-semibold text-foreground">
                              {card.title}
                            </CardTitle>
                            <div className="p-2 bg-background/50 rounded-lg">
                              <Icon className="h-5 w-5 text-accent" />
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                          <div className="text-4xl font-bold text-foreground mb-1">
                            {card.value}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {card.subtitle}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Quick Actions Section */}
                <div className="mt-8 bg-card rounded-xl border border-border p-6 shadow-soft">
                  <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Button variant="outline" className="justify-start h-auto py-4" asChild>
                      <Link to="/employer/jobs">
                        <Briefcase className="h-5 w-5 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">Manage Jobs</div>
                          <div className="text-xs text-muted-foreground">View and edit postings</div>
                        </div>
                      </Link>
                    </Button>
                    
                    <Button variant="outline" className="justify-start h-auto py-4" asChild>
                      <Link to="/employer/talent-pool">
                        <Users className="h-5 w-5 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">Browse Talent</div>
                          <div className="text-xs text-muted-foreground">Find qualified candidates</div>
                        </div>
                      </Link>
                    </Button>
                    
                    <Button variant="outline" className="justify-start h-auto py-4" asChild>
                      <Link to="/employer/approvals">
                        <CheckSquare className="h-5 w-5 mr-3" />
                        <div className="text-left">
                          <div className="font-medium">Review Approvals</div>
                          <div className="text-xs text-muted-foreground">Pending actions</div>
                        </div>
                      </Link>
                    </Button>
                  </div>
                </div>
              </>
            )}

            {activeMenu === "jobs" && <JobManagementContent />}
            {activeMenu === "talent-pool" && <TalentPoolContent />}
            {activeMenu === "placements" && <PlacementsContent />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default EmployerDashboard;