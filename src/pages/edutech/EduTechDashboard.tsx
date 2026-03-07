import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  GraduationCap, Users, BarChart3, Megaphone, CalendarCheck,
  BookOpen, Settings, LogOut, User, Menu, X,
  TrendingUp, Eye, MousePointerClick, UserPlus,
  Plus, Send, LayoutDashboard, ChevronRight,
  Mail, Phone, MapPin, Calendar, IndianRupee, CreditCard, Clock, Award, Pencil, Banknote, Trash2,
  Paperclip, Loader2, XCircle
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
  { name: "Priya Sharma", course: "Full Stack Development", status: "Placed", company: "TCS", email: "priya.sharma@email.com", phone: "+91 98765 43210", enrollDate: "2025-06-15", completionDate: "2025-12-10", totalFee: 45000, paidAmount: 45000, courseDuration: "6 months", batchId: "FSB-2025-03", qualification: "B.Tech (CSE)", location: "Hyderabad" },
  { name: "Rahul Verma", course: "Data Science", status: "Interviewing", company: "Infosys", email: "rahul.verma@email.com", phone: "+91 87654 32109", enrollDate: "2025-08-01", completionDate: null, totalFee: 55000, paidAmount: 35000, courseDuration: "4 months", batchId: "DSB-2025-05", qualification: "M.Sc (Statistics)", location: "Bangalore" },
  { name: "Anjali Patel", course: "Digital Marketing", status: "Training", company: "-", email: "anjali.patel@email.com", phone: "+91 76543 21098", enrollDate: "2025-11-10", completionDate: null, totalFee: 25000, paidAmount: 15000, courseDuration: "3 months", batchId: "DMB-2025-08", qualification: "BBA", location: "Pune" },
  { name: "Kiran Reddy", course: "Cloud Computing", status: "Placed", company: "Wipro", email: "kiran.reddy@email.com", phone: "+91 65432 10987", enrollDate: "2025-07-20", completionDate: "2025-10-18", totalFee: 35000, paidAmount: 35000, courseDuration: "3 months", batchId: "CCB-2025-04", qualification: "B.Tech (IT)", location: "Chennai" },
  { name: "Sneha Gupta", course: "UI/UX Design", status: "Job Seeking", company: "-", email: "sneha.gupta@email.com", phone: "+91 54321 09876", enrollDate: "2025-09-01", completionDate: "2025-12-28", totalFee: 30000, paidAmount: 20000, courseDuration: "4 months", batchId: "UXB-2025-06", qualification: "B.Des", location: "Mumbai" },
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
  const [selectedCandidate, setSelectedCandidate] = useState<typeof recentCandidates[0] | null>(null);

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
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0 cursor-pointer hover:bg-muted/30 rounded-lg px-2 -mx-2 transition-colors" onClick={() => setSelectedCandidate(c)}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-muted">{c.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-primary hover:underline">{c.name}</p>
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

      <CandidateDetailModal candidate={selectedCandidate} isOpen={!!selectedCandidate} onClose={() => setSelectedCandidate(null)} />
    </div>
  );
}

function CandidateDetailModal({ candidate, isOpen, onClose }: { candidate: typeof recentCandidates[0] | null; isOpen: boolean; onClose: () => void }) {
  const [editMode, setEditMode] = useState(false);
  const [paymentMode, setPaymentMode] = useState(false);
  const [editData, setEditData] = useState({ name: "", email: "", phone: "", location: "", qualification: "", course: "", batchId: "", status: "", company: "", totalFee: "", paidAmount: "" });
  const [paymentData, setPaymentData] = useState({ amount: "", method: "cash", reference: "", date: new Date().toISOString().split("T")[0] });

  if (!candidate) return null;
  const pending = candidate.totalFee - candidate.paidAmount;
  const paidPercent = Math.round((candidate.paidAmount / candidate.totalFee) * 100);

  const handleEditOpen = () => {
    setEditData({
      name: candidate.name, email: candidate.email, phone: candidate.phone,
      location: candidate.location, qualification: candidate.qualification,
      course: candidate.course, batchId: candidate.batchId, status: candidate.status,
      company: candidate.company, totalFee: String(candidate.totalFee), paidAmount: String(candidate.paidAmount)
    });
    setEditMode(true);
    setPaymentMode(false);
  };

  const handlePaymentOpen = () => {
    setPaymentData({ amount: "", method: "cash", reference: "", date: new Date().toISOString().split("T")[0] });
    setPaymentMode(true);
    setEditMode(false);
  };

  const handleSaveDetails = () => {
    toast.success(`Details updated for ${editData.name}`);
    setEditMode(false);
  };

  const handleSavePayment = () => {
    if (!paymentData.amount || Number(paymentData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (Number(paymentData.amount) > pending) {
      toast.error(`Amount cannot exceed pending balance ₹${pending.toLocaleString("en-IN")}`);
      return;
    }
    toast.success(`Payment of ₹${Number(paymentData.amount).toLocaleString("en-IN")} recorded via ${paymentData.method}`);
    setPaymentMode(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => { onClose(); setEditMode(false); setPaymentMode(false); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">{candidate.name.split(" ").map(n => n[0]).join("")}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg">{candidate.name}</p>
              <p className="text-sm font-normal text-muted-foreground">{candidate.qualification}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button size="sm" variant={editMode ? "default" : "outline"} onClick={handleEditOpen} className="flex-1">
            <Pencil className="h-3.5 w-3.5 mr-1.5" /> Update Details
          </Button>
          {pending > 0 && (
            <Button size="sm" variant={paymentMode ? "default" : "outline"} onClick={handlePaymentOpen} className="flex-1">
              <Banknote className="h-3.5 w-3.5 mr-1.5" /> Manual Payment
            </Button>
          )}
        </div>

        {/* Edit Details Form */}
        {editMode && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Edit Candidate Details</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Full Name</Label>
                  <Input value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email</Label>
                  <Input value={editData.email} onChange={e => setEditData({...editData, email: e.target.value})} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input value={editData.phone} onChange={e => setEditData({...editData, phone: e.target.value})} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Location</Label>
                  <Input value={editData.location} onChange={e => setEditData({...editData, location: e.target.value})} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Qualification</Label>
                  <Input value={editData.qualification} onChange={e => setEditData({...editData, qualification: e.target.value})} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={editData.status} onValueChange={v => setEditData({...editData, status: v})}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Training">Training</SelectItem>
                      <SelectItem value="Job Seeking">Job Seeking</SelectItem>
                      <SelectItem value="Interviewing">Interviewing</SelectItem>
                      <SelectItem value="Placed">Placed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {editData.status === "Placed" && (
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Placed at (Company)</Label>
                    <Input value={editData.company} onChange={e => setEditData({...editData, company: e.target.value})} className="h-8 text-sm" />
                  </div>
                )}
              </div>

              <Separator />
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><IndianRupee className="h-3.5 w-3.5" /> Modify Payment Amounts</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Total Fee (₹)</Label>
                  <Input type="number" value={editData.totalFee} onChange={e => setEditData({...editData, totalFee: e.target.value})} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Paid Amount (₹)</Label>
                  <Input type="number" value={editData.paidAmount} onChange={e => setEditData({...editData, paidAmount: e.target.value})} className="h-8 text-sm" />
                </div>
                {Number(editData.totalFee) > 0 && (
                  <div className="col-span-2 text-xs text-muted-foreground flex items-center justify-between bg-muted/50 rounded-md px-3 py-2">
                    <span>Pending: <span className={`font-semibold ${Number(editData.totalFee) - Number(editData.paidAmount) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>₹{(Number(editData.totalFee) - Number(editData.paidAmount)).toLocaleString("en-IN")}</span></span>
                    <span>Cleared: <span className="font-semibold text-green-600 dark:text-green-400">₹{Number(editData.paidAmount).toLocaleString("en-IN")}</span></span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSaveDetails}>Save Changes</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditMode(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Manual Payment Form */}
        {paymentMode && (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Record Manual Payment</h4>
              <p className="text-xs text-muted-foreground">Pending balance: <span className="font-medium text-foreground">₹{pending.toLocaleString("en-IN")}</span></p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input type="number" placeholder="e.g. 5000" value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: e.target.value})} className="h-8 text-sm" max={pending} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Payment Method</Label>
                  <Select value={paymentData.method} onValueChange={v => setPaymentData({...paymentData, method: v})}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Payment Date</Label>
                  <Input type="date" value={paymentData.date} onChange={e => setPaymentData({...paymentData, date: e.target.value})} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reference / Receipt No.</Label>
                  <Input placeholder="Optional" value={paymentData.reference} onChange={e => setPaymentData({...paymentData, reference: e.target.value})} className="h-8 text-sm" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSavePayment}>Record Payment</Button>
                <Button size="sm" variant="ghost" onClick={() => setPaymentMode(false)}>Cancel</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-5">
          {/* Contact Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Contact Information</h4>
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /> {candidate.email}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /> {candidate.phone}</div>
              <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /> {candidate.location}</div>
            </div>
          </div>

          <Separator />

          {/* Course Info */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">Course Details</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Course:</span> <span className="font-medium text-foreground">{candidate.course}</span></div>
              <div><span className="text-muted-foreground">Batch:</span> <span className="font-medium text-foreground">{candidate.batchId}</span></div>
              <div><span className="text-muted-foreground">Duration:</span> <span className="font-medium text-foreground">{candidate.courseDuration}</span></div>
              <div><span className="text-muted-foreground">Enrolled:</span> <span className="font-medium text-foreground">{new Date(candidate.enrollDate).toLocaleDateString("en-IN")}</span></div>
              <div>
                <span className="text-muted-foreground">Status:</span>{" "}
                <Badge variant={candidate.status === "Placed" ? "default" : candidate.status === "Training" ? "secondary" : "outline"} className="text-xs ml-1">{candidate.status}</Badge>
              </div>
              {candidate.completionDate && (
                <div><span className="text-muted-foreground">Completed:</span> <span className="font-medium text-foreground">{new Date(candidate.completionDate).toLocaleDateString("en-IN")}</span></div>
              )}
              {candidate.company !== "-" && (
                <div><span className="text-muted-foreground">Placed at:</span> <span className="font-medium text-foreground">{candidate.company}</span></div>
              )}
            </div>
          </div>

          <Separator />

          {/* Payment Info */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Payment Details</h4>
            
            <div className="grid grid-cols-3 gap-3">
              <Card className="border-border/50">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Fee</p>
                  <p className="text-lg font-bold text-foreground">₹{candidate.totalFee.toLocaleString("en-IN")}</p>
                </CardContent>
              </Card>
              <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">₹{candidate.paidAmount.toLocaleString("en-IN")}</p>
                </CardContent>
              </Card>
              <Card className={`${pending > 0 ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20" : "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20"}`}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className={`text-lg font-bold ${pending > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>₹{pending.toLocaleString("en-IN")}</p>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Payment Progress</span>
                <span>{paidPercent}%</span>
              </div>
              <Progress value={paidPercent} className="h-2" />
            </div>

            {pending > 0 && (
              <p className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                <Clock className="h-3 w-3" /> ₹{pending.toLocaleString("en-IN")} payment is pending
              </p>
            )}
            {pending === 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <Award className="h-3 w-3" /> Full payment completed
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CandidatesContent() {
  const [selectedCandidate, setSelectedCandidate] = useState<typeof recentCandidates[0] | null>(null);

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
                  <th className="text-left p-3 font-medium text-muted-foreground">Fee</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Pending</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentCandidates.map((c, i) => {
                  const pending = c.totalFee - c.paidAmount;
                  return (
                    <tr key={i} className="border-b border-border/30">
                      <td className="p-3 font-medium text-primary cursor-pointer hover:underline" onClick={() => setSelectedCandidate(c)}>{c.name}</td>
                      <td className="p-3 text-muted-foreground">{c.course}</td>
                      <td className="p-3"><Badge variant={c.status === "Placed" ? "default" : "outline"} className="text-xs">{c.status}</Badge></td>
                      <td className="p-3 text-muted-foreground">{c.company}</td>
                      <td className="p-3 text-foreground">₹{c.totalFee.toLocaleString("en-IN")}</td>
                      <td className="p-3">
                        <span className={pending > 0 ? "text-red-600 dark:text-red-400 font-medium" : "text-green-600 dark:text-green-400"}>
                          {pending > 0 ? `₹${pending.toLocaleString("en-IN")}` : "Paid ✓"}
                        </span>
                      </td>
                      <td className="p-3 flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedCandidate(c)}>View</Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); toast.success(`${c.name} has been removed`); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <CandidateDetailModal candidate={selectedCandidate} isOpen={!!selectedCandidate} onClose={() => setSelectedCandidate(null)} />
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

interface AttachmentFile {
  file: File;
  name: string;
  size: number;
  type: string;
  uploading?: boolean;
  url?: string;
}

function CampaignsContent() {
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState<{ totalSent: number; totalFailed: number } | null>(null);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addEmails = () => {
    const newEmails = emailInput
      .split(/[,;\n\s]+/)
      .map(e => e.trim())
      .filter(e => e && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && !emailList.includes(e));
    if (newEmails.length > 0) {
      setEmailList(prev => [...prev, ...newEmails]);
      setEmailInput("");
    } else if (emailInput.trim()) {
      toast.error("No valid new email addresses found");
    }
  };

  const removeEmail = (email: string) => {
    setEmailList(prev => prev.filter(e => e !== email));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmails();
    }
  };

  const handleSendCampaign = async () => {
    if (emailList.length === 0) { toast.error("Add at least one recipient email"); return; }
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    if (!messageBody.trim()) { toast.error("Message body is required"); return; }

    setIsSending(true);
    setSendResults(null);

    try {
      // Convert plain text message to HTML
      const htmlBody = messageBody
        .split("\n")
        .map(line => line.trim() ? `<p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">${line}</p>` : `<br/>`)
        .join("");

      const { data, error } = await supabase.functions.invoke("send-campaign-emails", {
        body: {
          recipients: emailList,
          subject: subject.trim(),
          htmlBody,
          senderName: campaignName.trim() || "Gradia EduTech",
        },
      });

      if (error) throw error;

      setSendResults({ totalSent: data.totalSent, totalFailed: data.totalFailed });

      if (data.totalSent > 0) {
        toast.success(`Campaign sent! ${data.totalSent} email(s) delivered successfully.`);
      }
      if (data.totalFailed > 0) {
        toast.error(`${data.totalFailed} email(s) failed to send.`);
      }
    } catch (err: any) {
      console.error("Campaign send error:", err);
      toast.error(err.message || "Failed to send campaign");
    } finally {
      setIsSending(false);
    }
  };

  const resetForm = () => {
    setEmailInput("");
    setEmailList([]);
    setSubject("");
    setMessageBody("");
    setCampaignName("");
    setSendResults(null);
    setShowNewCampaign(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Marketing Campaigns</h3>
        <Button size="sm" onClick={() => setShowNewCampaign(true)}><Plus className="h-4 w-4 mr-1" /> New Campaign</Button>
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

      {/* New Campaign Dialog */}
      <Dialog open={showNewCampaign} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Send className="h-5 w-5 text-primary" /> New Email Campaign</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Campaign Name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Campaign / Sender Name</Label>
              <Input placeholder="e.g. Gradia EduTech, Summer Batch 2026" value={campaignName} onChange={e => setCampaignName(e.target.value)} />
              <p className="text-xs text-muted-foreground">This name appears as the sender in recipient's inbox</p>
            </div>

            {/* Recipients */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Recipients <span className="text-destructive">*</span></Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter emails (comma, space, or newline separated)"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={addEmails}>Add</Button>
              </div>
              {emailList.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto p-2 rounded-md border border-border bg-muted/30">
                  {emailList.map((email) => (
                    <Badge key={email} variant="secondary" className="text-xs gap-1 pr-1">
                      <Mail className="h-3 w-3" />
                      {email}
                      <button onClick={() => removeEmail(email)} className="ml-0.5 hover:text-destructive">
                        <XCircle className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{emailList.length} recipient(s) added • Emails sent individually to each</p>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Subject <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Exciting Placement Drive Opportunity!" value={subject} onChange={e => setSubject(e.target.value)} />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Message <span className="text-destructive">*</span></Label>
              <Textarea
                placeholder="Type your email message here...&#10;&#10;Use line breaks for paragraphs. The message will be formatted in a professional email template automatically."
                value={messageBody}
                onChange={e => setMessageBody(e.target.value)}
                rows={8}
                className="resize-y"
              />
              <p className="text-xs text-muted-foreground">Your message will be wrapped in a branded email template with header & footer</p>
            </div>

            {/* Send Results */}
            {sendResults && (
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="text-foreground font-medium">{sendResults.totalSent} Sent</span>
                    </div>
                    {sendResults.totalFailed > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-destructive" />
                        <span className="text-foreground font-medium">{sendResults.totalFailed} Failed</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSendCampaign} disabled={isSending || emailList.length === 0} className="flex-1">
                {isSending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending {emailList.length} email(s)...</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Send Campaign ({emailList.length})</>
                )}
              </Button>
              <Button variant="ghost" onClick={resetForm} disabled={isSending}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
