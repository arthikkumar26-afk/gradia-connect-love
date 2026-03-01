import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import {
  GraduationCap, Users, BarChart3, Megaphone, CalendarCheck,
  BookOpen, Settings, LogOut, User, Menu, X,
  TrendingUp, Eye, MousePointerClick, UserPlus,
  Plus, Send, LayoutDashboard, ChevronRight
} from "lucide-react";

const statsData = [
  { label: "Total Candidates", value: "1,248", change: "+12%", icon: Users, gradient: "from-primary/20 to-primary/5" },
  { label: "Active Courses", value: "18", change: "+3", icon: BookOpen, gradient: "from-success/20 to-success/5" },
  { label: "Impressions", value: "45.2K", change: "+28%", icon: Eye, gradient: "from-warning/20 to-warning/5" },
  { label: "Placements", value: "342", change: "+8%", icon: TrendingUp, gradient: "from-accent/20 to-accent/5" },
];

const quickActions = [
  { label: "Add Course", icon: Plus, description: "List a new course or workshop", section: "courses" },
  { label: "New Campaign", icon: Send, description: "Launch email/SMS campaign", section: "campaigns" },
  { label: "View Candidates", icon: Users, description: "Track trained candidates", section: "candidates" },
  { label: "Book Stall", icon: CalendarCheck, description: "Reserve a Job Mela stall", section: "events" },
];

const recentCandidates = [
  { name: "Priya Sharma", course: "Full Stack Development", status: "Placed", company: "TCS" },
  { name: "Rahul Verma", course: "Data Science", status: "Interviewing", company: "Infosys" },
  { name: "Anjali Patel", course: "Digital Marketing", status: "Training", company: "-" },
  { name: "Kiran Reddy", course: "Cloud Computing", status: "Placed", company: "Wipro" },
  { name: "Sneha Gupta", course: "UI/UX Design", status: "Job Seeking", company: "-" },
];

const campaignsList = [
  { name: "Summer Batch 2026", type: "Email", sent: 2400, opened: 1680, ctr: "18%", status: "Completed" },
  { name: "Free Webinar Invite", type: "SMS", sent: 5000, opened: 3200, ctr: "22%", status: "Active" },
  { name: "Placement Drive Alert", type: "Email", sent: 1800, opened: 1100, ctr: "15%", status: "Draft" },
];

const courses = [
  { title: "Full Stack Development", enrolled: 120, completed: 85, rating: 4.6, duration: "6 months" },
  { title: "Data Science & ML", enrolled: 95, completed: 42, rating: 4.8, duration: "4 months" },
  { title: "Digital Marketing", enrolled: 78, completed: 65, rating: 4.3, duration: "3 months" },
  { title: "Cloud Computing (AWS)", enrolled: 56, completed: 30, rating: 4.5, duration: "3 months" },
];

export default function EduTechDashboard() {
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const [activeMenu, setActiveMenu] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "courses", label: "Courses", icon: BookOpen },
    { id: "candidates", label: "Candidate Data", icon: Users },
    { id: "campaigns", label: "Campaigns", icon: Megaphone },
    { id: "events", label: "Job Mela & Events", icon: CalendarCheck },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return <DashboardContent setActiveMenu={setActiveMenu} />;
      case "courses":
        return <CoursesContent />;
      case "candidates":
        return <CandidatesContent />;
      case "campaigns":
        return <CampaignsContent />;
      case "events":
        return <EventsContent />;
      case "analytics":
        return <AnalyticsContent />;
      case "settings":
        return <SettingsContent profile={profile} />;
      default:
        return <DashboardContent setActiveMenu={setActiveMenu} />;
    }
  };

  return (
    <div className="bg-subtle flex min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64 min-w-64" : "w-16 min-w-16"
        } bg-card border-r border-border transition-all duration-300 flex flex-col flex-shrink-0 sticky top-[64px] h-[calc(100vh-64px)]`}
      >
        {/* User Info */}
        {sidebarOpen && (
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {profile?.company_name || profile?.full_name || "EduTech Admin"}
                </p>
                <p className="text-xs text-primary">EduTech</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1 pt-6 overflow-y-auto">
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
                title={!sidebarOpen ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {sidebarOpen && <span className="flex-1 text-left whitespace-nowrap">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            title={!sidebarOpen ? "Logout" : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-[calc(100vh-64px)]">
        {/* Top bar with toggle */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-2 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-medium text-foreground capitalize">
              {menuItems.find(m => m.id === activeMenu)?.label || "Dashboard"}
            </span>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

/* ─── Sub-components ─── */

function DashboardContent({ setActiveMenu }: { setActiveMenu: (id: string) => void }) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsData.map((stat) => (
          <Card key={stat.label} className="border-border/50">
            <CardContent className="p-4">
              <div className={`flex items-center gap-3 mb-2`}>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.gradient}`}>
                  <stat.icon className="h-4 w-4 text-foreground" />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <Badge variant="secondary" className="text-xs">{stat.change}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {quickActions.map((action) => (
          <Card
            key={action.label}
            className="cursor-pointer hover:shadow-md transition-shadow border-border/50 hover:border-primary/30"
            onClick={() => setActiveMenu(action.section)}
          >
            <CardContent className="p-4 text-center">
              <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <p className="font-medium text-sm text-foreground">{action.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Candidates */}
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">Recent Candidates</CardTitle>
            <CardDescription>Latest candidates from your training programs</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setActiveMenu("candidates")} className="text-primary">
            View All <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentCandidates.map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-muted">{c.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.course}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={c.status === "Placed" ? "default" : c.status === "Interviewing" ? "secondary" : "outline"} className="text-xs">
                    {c.status}
                  </Badge>
                  {c.company !== "-" && <p className="text-xs text-muted-foreground mt-1">{c.company}</p>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CandidatesContent() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Trained Candidates</h3>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Candidate</Button>
      </div>
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Course</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Company</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentCandidates.map((c, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="p-3 font-medium text-foreground">{c.name}</td>
                    <td className="p-3 text-muted-foreground">{c.course}</td>
                    <td className="p-3"><Badge variant={c.status === "Placed" ? "default" : "outline"} className="text-xs">{c.status}</Badge></td>
                    <td className="p-3 text-muted-foreground">{c.company}</td>
                    <td className="p-3"><Button variant="ghost" size="sm">View</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CoursesContent() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Your Courses</h3>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Course</Button>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {courses.map((course, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-foreground">{course.title}</h4>
                  <p className="text-xs text-muted-foreground">Duration: {course.duration}</p>
                </div>
                <Badge variant="secondary">⭐ {course.rating}</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Completion Rate</span>
                  <span className="font-medium text-foreground">{Math.round((course.completed / course.enrolled) * 100)}%</span>
                </div>
                <Progress value={(course.completed / course.enrolled) * 100} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground pt-1">
                  <span>{course.enrolled} enrolled</span>
                  <span>{course.completed} completed</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function CampaignsContent() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Marketing Campaigns</h3>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Campaign</Button>
      </div>
      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 font-medium text-muted-foreground">Campaign</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Sent</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Opened</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">CTR</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {campaignsList.map((c, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="p-3 font-medium text-foreground">{c.name}</td>
                    <td className="p-3"><Badge variant="outline" className="text-xs">{c.type}</Badge></td>
                    <td className="p-3 text-muted-foreground">{c.sent.toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground">{c.opened.toLocaleString()}</td>
                    <td className="p-3 text-muted-foreground">{c.ctr}</td>
                    <td className="p-3">
                      <Badge variant={c.status === "Active" ? "default" : c.status === "Completed" ? "secondary" : "outline"} className="text-xs">{c.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EventsContent() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Job Mela & Events</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CalendarCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">Hyderabad Job Mela 2026</h4>
                <p className="text-xs text-muted-foreground">March 15, 2026 • HICC Convention Center</p>
              </div>
            </div>
            <Badge variant="secondary" className="mb-3">Stall Booked - A12</Badge>
            <p className="text-sm text-muted-foreground">Your stall is confirmed. Upload banners and promotional materials before the event.</p>
            <Button variant="outline" size="sm" className="mt-3">Manage Stall</Button>
          </CardContent>
        </Card>
        <Card className="border-border/50 border-dashed">
          <CardContent className="p-5 flex flex-col items-center justify-center text-center h-full min-h-[180px]">
            <CalendarCheck className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="font-medium text-foreground">Book a Stall</p>
            <p className="text-sm text-muted-foreground mb-3">Reserve your space at upcoming Job Mela events</p>
            <Button size="sm">Browse Events</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AnalyticsContent() {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Analytics & ROI</h3>
      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: "Banner Impressions", value: "45,200", icon: Eye, change: "+28%" },
          { label: "Click-Through Rate", value: "3.8%", icon: MousePointerClick, change: "+0.5%" },
          { label: "New Enrollments", value: "156", icon: UserPlus, change: "+18%" },
        ].map((metric, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-2">
                <metric.icon className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">{metric.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{metric.value}</p>
              <p className="text-xs text-primary mt-1">{metric.change} this month</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Campaign Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Detailed charts will appear once campaigns have data</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsContent({ profile }: { profile: any }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Institute Settings</h3>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Institute Profile</CardTitle>
            <CardDescription>Update your institute details and branding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {profile?.company_name?.charAt(0) || "E"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground">{profile?.company_name || "Your Institute"}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Edit Profile</Button>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Subscription</CardTitle>
            <CardDescription>Manage your plan and billing</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge className="mb-3">Free Plan</Badge>
            <p className="text-sm text-muted-foreground mb-3">Upgrade to access banner ads, SMS campaigns, and priority stall booking.</p>
            <Button size="sm">Upgrade Plan</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
