import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Loader2, 
  Search, 
  MessageSquare, 
  Phone, 
  FileText, 
  User, 
  IndianRupee, 
  Calendar, 
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  ExternalLink,
  ShieldCheck,
  Home,
  Users,
  CreditCard,
  UserCheck,
  TrendingUp,
  Briefcase,
  Building2,
  ClipboardList,
  UserCog,
  BarChart3,
  Settings,
  LogOut,
  Menu
} from "lucide-react";
import { format } from "date-fns";
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
import { useAuth } from "@/contexts/AuthContext";

interface Negotiation {
  id: string;
  session_id: string;
  candidate_id: string;
  negotiation_type: string;
  expected_salary: number | null;
  current_salary: number | null;
  notice_period: string | null;
  preferred_joining_date: string | null;
  relocation_required: boolean | null;
  willing_to_relocate: boolean | null;
  preferred_location: string | null;
  additional_requirements: string | null;
  preferred_call_date: string | null;
  preferred_call_time: string | null;
  call_scheduled_at: string | null;
  call_meeting_link: string | null;
  call_notes: string | null;
  admin_response: string | null;
  offered_salary: number | null;
  offered_joining_date: string | null;
  admin_notes: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
    mobile: string | null;
    profile_picture: string | null;
    segment: string | null;
    primary_subject: string | null;
    experience_level: string | null;
  } | null;
}

const HRNegotiations = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedNegotiation, setSelectedNegotiation] = useState<Negotiation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [responseForm, setResponseForm] = useState({
    status: '',
    adminResponse: '',
    offeredSalary: '',
    offeredJoiningDate: '',
    callMeetingLink: '',
    adminNotes: ''
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
    loadNegotiations();
  }, []);

  const loadNegotiations = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('hr_negotiations')
        .select(`
          *,
          profiles:candidate_id (
            full_name,
            email,
            mobile,
            profile_picture,
            segment,
            primary_subject,
            experience_level
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNegotiations(data || []);
    } catch (error) {
      console.error('Error loading negotiations:', error);
      toast.error('Failed to load negotiations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDetails = (negotiation: Negotiation) => {
    setSelectedNegotiation(negotiation);
    setResponseForm({
      status: negotiation.status,
      adminResponse: negotiation.admin_response || '',
      offeredSalary: negotiation.offered_salary?.toString() || '',
      offeredJoiningDate: negotiation.offered_joining_date || '',
      callMeetingLink: negotiation.call_meeting_link || '',
      adminNotes: negotiation.admin_notes || ''
    });
  };

  const handleSubmitResponse = async () => {
    if (!selectedNegotiation) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('hr_negotiations')
        .update({
          status: responseForm.status,
          admin_response: responseForm.adminResponse || null,
          offered_salary: responseForm.offeredSalary ? parseFloat(responseForm.offeredSalary) : null,
          offered_joining_date: responseForm.offeredJoiningDate || null,
          call_meeting_link: responseForm.callMeetingLink || null,
          admin_notes: responseForm.adminNotes || null,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedNegotiation.id);

      if (error) throw error;

      toast.success('Response submitted successfully');
      setSelectedNegotiation(null);
      loadNegotiations();
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast.success("You have been successfully logged out.");
  };

  const filteredNegotiations = negotiations.filter(n => {
    const matchesSearch = 
      n.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      n.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || n.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-amber-100 text-amber-700"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'call_requested':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700"><Phone className="h-3 w-3 mr-1" /> Call Requested</Badge>;
      case 'call_scheduled':
        return <Badge variant="default" className="bg-blue-500"><Calendar className="h-3 w-3 mr-1" /> Call Scheduled</Badge>;
      case 'under_review':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Under Review</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case 'counter_offer':
        return <Badge variant="default" className="bg-purple-500"><MessageSquare className="h-3 w-3 mr-1" /> Counter Offer</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

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
          {/* Top Header */}
          <header className="h-14 border-b border-border bg-background flex items-center px-4 lg:px-6">
            <SidebarTrigger>
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">HR Negotiations</h1>
          <p className="text-muted-foreground">Review and respond to candidate negotiations</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {negotiations.filter(n => n.status === 'pending' || n.status === 'call_requested').length} Pending
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="call_requested">Call Requested</SelectItem>
                <SelectItem value="call_scheduled">Call Scheduled</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="counter_offer">Counter Offer</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Negotiations List */}
      <div className="grid gap-4">
        {filteredNegotiations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No negotiations found</h3>
              <p className="text-muted-foreground">No HR negotiations match your filters.</p>
            </CardContent>
          </Card>
        ) : (
          filteredNegotiations.map((negotiation) => (
            <Card key={negotiation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  {/* Candidate Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {negotiation.profiles?.profile_picture ? (
                        <img 
                          src={negotiation.profiles.profile_picture} 
                          alt={negotiation.profiles.full_name} 
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <User className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{negotiation.profiles?.full_name || 'Unknown'}</h3>
                      <p className="text-sm text-muted-foreground">{negotiation.profiles?.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {negotiation.profiles?.segment && (
                          <Badge variant="outline" className="text-xs">{negotiation.profiles.segment}</Badge>
                        )}
                        {negotiation.profiles?.primary_subject && (
                          <Badge variant="outline" className="text-xs">{negotiation.profiles.primary_subject}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Negotiation Type & Details */}
                  <div className="flex flex-col md:items-center gap-2">
                    <div className="flex items-center gap-2">
                      {negotiation.negotiation_type === 'call' ? (
                        <Badge variant="outline" className="gap-1">
                          <Phone className="h-3 w-3" /> Call Request
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <FileText className="h-3 w-3" /> Form Submission
                        </Badge>
                      )}
                      {getStatusBadge(negotiation.status)}
                    </div>
                    {negotiation.expected_salary && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <IndianRupee className="h-3 w-3" />
                        Expected: ₹{negotiation.expected_salary.toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(negotiation.created_at), 'MMM d, yyyy')}
                    </span>
                    <Button onClick={() => handleOpenDetails(negotiation)}>
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Details Modal */}
      <Dialog open={!!selectedNegotiation} onOpenChange={() => setSelectedNegotiation(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {selectedNegotiation?.profiles?.full_name} - HR Negotiation
            </DialogTitle>
            <DialogDescription>
              Review candidate details and respond to their negotiation request
            </DialogDescription>
          </DialogHeader>

          {selectedNegotiation && (
            <div className="space-y-6">
              {/* Candidate Profile Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Candidate Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <p className="font-medium">{selectedNegotiation.profiles?.full_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{selectedNegotiation.profiles?.email}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mobile:</span>
                      <p className="font-medium">{selectedNegotiation.profiles?.mobile || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Experience:</span>
                      <p className="font-medium">{selectedNegotiation.profiles?.experience_level || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Segment:</span>
                      <p className="font-medium">{selectedNegotiation.profiles?.segment || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Subject:</span>
                      <p className="font-medium">{selectedNegotiation.profiles?.primary_subject || 'N/A'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Negotiation Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {selectedNegotiation.negotiation_type === 'call' ? (
                      <><Phone className="h-4 w-4" /> Call Request Details</>
                    ) : (
                      <><FileText className="h-4 w-4" /> Negotiation Details</>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {selectedNegotiation.negotiation_type === 'call' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-muted-foreground">Preferred Date:</span>
                        <p className="font-medium">{selectedNegotiation.preferred_call_date || 'N/A'}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Preferred Time:</span>
                        <p className="font-medium">{selectedNegotiation.preferred_call_time || 'N/A'}</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-muted-foreground">Current Salary:</span>
                          <p className="font-medium">
                            {selectedNegotiation.current_salary 
                              ? `₹${selectedNegotiation.current_salary.toLocaleString()}`
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Expected Salary:</span>
                          <p className="font-medium text-primary">
                            {selectedNegotiation.expected_salary 
                              ? `₹${selectedNegotiation.expected_salary.toLocaleString()}`
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Notice Period:</span>
                          <p className="font-medium">{selectedNegotiation.notice_period?.replace('_', ' ') || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Preferred Joining:</span>
                          <p className="font-medium">{selectedNegotiation.preferred_joining_date || 'N/A'}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Relocation Required:</span>
                          <p className="font-medium">{selectedNegotiation.relocation_required ? 'Yes' : 'No'}</p>
                        </div>
                        {selectedNegotiation.relocation_required && (
                          <div>
                            <span className="text-muted-foreground">Willing to Relocate:</span>
                            <p className="font-medium">{selectedNegotiation.willing_to_relocate ? 'Yes' : 'No'}</p>
                          </div>
                        )}
                        {selectedNegotiation.preferred_location && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Preferred Location:</span>
                            <p className="font-medium">{selectedNegotiation.preferred_location}</p>
                          </div>
                        )}
                      </div>
                      {selectedNegotiation.additional_requirements && (
                        <div>
                          <span className="text-muted-foreground">Additional Requirements:</span>
                          <p className="mt-1 p-3 bg-muted/50 rounded-lg">{selectedNegotiation.additional_requirements}</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Admin Response Form */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Admin Response</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select 
                        value={responseForm.status} 
                        onValueChange={(value) => setResponseForm(prev => ({ ...prev, status: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="under_review">Under Review</SelectItem>
                          <SelectItem value="call_scheduled">Call Scheduled</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                          <SelectItem value="counter_offer">Counter Offer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Offered Salary (₹)</Label>
                      <Input
                        type="number"
                        placeholder="e.g., 600000"
                        value={responseForm.offeredSalary}
                        onChange={(e) => setResponseForm(prev => ({ ...prev, offeredSalary: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Offered Joining Date</Label>
                      <Input
                        type="date"
                        value={responseForm.offeredJoiningDate}
                        onChange={(e) => setResponseForm(prev => ({ ...prev, offeredJoiningDate: e.target.value }))}
                      />
                    </div>
                    {selectedNegotiation.negotiation_type === 'call' && (
                      <div className="space-y-2">
                        <Label>Meeting Link</Label>
                        <Input
                          placeholder="https://meet.google.com/..."
                          value={responseForm.callMeetingLink}
                          onChange={(e) => setResponseForm(prev => ({ ...prev, callMeetingLink: e.target.value }))}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Response to Candidate</Label>
                    <textarea
                      className="w-full min-h-[80px] p-3 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Write a response that will be visible to the candidate..."
                      value={responseForm.adminResponse}
                      onChange={(e) => setResponseForm(prev => ({ ...prev, adminResponse: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Internal Notes (not visible to candidate)</Label>
                    <textarea
                      className="w-full min-h-[60px] p-3 rounded-lg border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Internal notes for HR team..."
                      value={responseForm.adminNotes}
                      onChange={(e) => setResponseForm(prev => ({ ...prev, adminNotes: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setSelectedNegotiation(null)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmitResponse} disabled={isSubmitting} className="gap-2">
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Submit Response
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default HRNegotiations;