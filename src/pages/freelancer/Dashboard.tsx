import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMentorship } from "@/hooks/useMentorship";
import {
  LayoutDashboard, Briefcase, Search, Users, GraduationCap, Star, 
  Clock, MapPin, DollarSign, ArrowRight, BookOpen,
  MessageSquare, Calendar, TrendingUp, User, LogOut, Menu, X,
   FileText, Settings, Sparkles, Upload, Loader2, Video, CheckCircle2,
   ClipboardList, Send, Radio, Download, FolderOpen, Crown, Check, Zap
} from "lucide-react";
import PortfolioTab from "@/components/freelancer/PortfolioTab";
import { Textarea } from "@/components/ui/textarea";

const sampleProjects = [
  { id: 1, title: "React Dashboard Development", budget: "₹50,000 - ₹80,000", duration: "2-3 months", skills: ["React", "TypeScript", "Tailwind"], posted: "2 days ago", proposals: 12 },
  { id: 2, title: "Mobile App UI/UX Design", budget: "₹30,000 - ₹50,000", duration: "1 month", skills: ["Figma", "UI/UX", "Mobile"], posted: "1 day ago", proposals: 8 },
  { id: 3, title: "Python Data Analysis Script", budget: "₹20,000 - ₹35,000", duration: "2 weeks", skills: ["Python", "Pandas", "SQL"], posted: "3 hours ago", proposals: 5 },
];

const sampleMentorships = [
  { id: 1, student: "Rahul Sharma", topic: "Full Stack Development", sessions: 12, nextSession: "Tomorrow, 4 PM", status: "active", email: "rahul@example.com", mobile: "+91 9876543210", location: "Hyderabad, Telangana", qualification: "B.Tech CSE", experience: "1 year", mockTestScore: 78, assignmentScore: 85, skillsToLearn: ["React", "Node.js", "MongoDB", "Docker"], gender: "Male", dob: "1999-05-15", liveTraining: "in-progress" as const, homeworkGiven: 3, homeworkCompleted: 2, submissions: [
    { name: "React_CRUD_Assignment.pdf", date: "2026-02-18", status: "reviewed" as const, score: 85 },
    { name: "NodeJS_API_Project.zip", date: "2026-02-20", status: "reviewed" as const, score: 78 },
    { name: "MongoDB_Schema_Design.docx", date: "2026-02-22", status: "pending" as const, score: null },
  ]},
  { id: 2, student: "Priya Patel", topic: "Data Science Basics", sessions: 8, nextSession: "Wed, 6 PM", status: "active", email: "priya@example.com", mobile: "+91 9123456789", location: "Bangalore, Karnataka", qualification: "M.Sc Statistics", experience: "Fresher", mockTestScore: 65, assignmentScore: 72, skillsToLearn: ["Python", "Pandas", "Machine Learning", "SQL"], gender: "Female", dob: "2000-08-22", liveTraining: "scheduled" as const, homeworkGiven: 5, homeworkCompleted: 4, submissions: [
    { name: "Pandas_Data_Analysis.ipynb", date: "2026-02-15", status: "reviewed" as const, score: 72 },
    { name: "SQL_Queries_Exercise.pdf", date: "2026-02-19", status: "reviewed" as const, score: 80 },
  ]},
  { id: 3, student: "Amit Kumar", topic: "React & Node.js", sessions: 20, nextSession: "Completed", status: "completed", email: "amit@example.com", mobile: "+91 9988776655", location: "Delhi", qualification: "BCA", experience: "2 years", mockTestScore: 92, assignmentScore: 88, skillsToLearn: ["TypeScript", "AWS", "GraphQL"], gender: "Male", dob: "1998-01-10", liveTraining: "completed" as const, homeworkGiven: 8, homeworkCompleted: 8, submissions: [
    { name: "Final_Project_Report.pdf", date: "2026-02-10", status: "reviewed" as const, score: 92 },
    { name: "GraphQL_API_Demo.zip", date: "2026-02-12", status: "reviewed" as const, score: 88 },
  ]},
];

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "portfolio", label: "Portfolio", icon: FolderOpen },
  { id: "projects", label: "Find Projects", icon: Search },
  { id: "mentorship", label: "Mentorship", icon: GraduationCap },
  { id: "proposals", label: "My Proposals", icon: MessageSquare },
  { id: "earnings", label: "Earnings", icon: TrendingUp },
  { id: "upgrade", label: "Upgrade Plan", icon: Crown },
  { id: "profile", label: "Profile", icon: User },
];

const FreelancerDashboard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, profile, logout, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [activeMenu, setActiveMenu] = useState(() => searchParams.get("tab") || "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [parsedResumeData, setParsedResumeData] = useState<any>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  // Mentorship from DB
  const { enrollments: dbMentorships, loading: mentorshipLoading, assignHomework, uploadDocument, reviewDocument } = useMentorship("mentor");

  // Homework form state
  const [hwTitle, setHwTitle] = useState("");
  const [hwDesc, setHwDesc] = useState("");
  const [hwDueDate, setHwDueDate] = useState("");
  const [hwFile, setHwFile] = useState<File | null>(null);

  // Project filters
  const [projectSkillFilter, setProjectSkillFilter] = useState<string>("all");
  const [projectBudgetFilter, setProjectBudgetFilter] = useState<string>("all");
  const [projectSearchQuery, setProjectSearchQuery] = useState("");

  // Mentorship filters
  const [mentorshipStatusFilter, setMentorshipStatusFilter] = useState<string>("all");
  const [mentorshipSearchQuery, setMentorshipSearchQuery] = useState("");

  // Mentorship candidate detail modal
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  const allProjectSkills = Array.from(new Set(sampleProjects.flatMap(p => p.skills)));

  const filteredProjects = sampleProjects.filter(p => {
    if (projectSkillFilter !== "all" && !p.skills.includes(projectSkillFilter)) return false;
    if (projectBudgetFilter === "under50k" && !p.budget.includes("20,000") && !p.budget.includes("30,000")) return false;
    if (projectBudgetFilter === "50k+" && !p.budget.includes("50,000") && !p.budget.includes("80,000")) return false;
    if (projectSearchQuery && !p.title.toLowerCase().includes(projectSearchQuery.toLowerCase())) return false;
    return true;
  });

  // Merge DB mentorships with sample data as fallback
  const allMentorships = dbMentorships.length > 0 ? dbMentorships.map(e => ({
    id: e.id,
    student: e.candidate_profile?.full_name || "Unknown",
    topic: e.topic,
    sessions: e.sessions_completed,
    nextSession: e.next_session || "TBD",
    status: e.status,
    email: e.candidate_profile?.email || "",
    mobile: e.candidate_profile?.mobile || "",
    location: e.candidate_profile?.location || "",
    qualification: e.candidate_profile?.highest_qualification || "",
    experience: e.candidate_profile?.experience_level || "",
    gender: e.candidate_profile?.gender || "",
    dob: e.candidate_profile?.date_of_birth || "",
    mockTestScore: 0,
    assignmentScore: e.homework?.filter(h => h.score).reduce((a, h) => a + (h.score || 0), 0) / Math.max(e.homework?.filter(h => h.score).length || 1, 1) || 0,
    skillsToLearn: [] as string[],
    liveTraining: "scheduled" as const,
    homeworkGiven: e.homework?.length || 0,
    homeworkCompleted: e.homework?.filter(h => h.status === "reviewed").length || 0,
    submissions: (e.documents || []).map(d => ({
      name: d.file_name,
      date: d.created_at.split("T")[0],
      status: d.review_status as "reviewed" | "pending",
      score: d.score,
      url: d.file_url,
    })),
    homework: (e.homework || []).map(h => ({
      id: h.id,
      title: h.title,
      dueDate: h.due_date,
      status: h.status,
      score: h.score,
    })),
    enrollmentId: e.id,
    candidateId: e.candidate_id,
  })) : sampleMentorships.map(m => ({ ...m, enrollmentId: "", candidateId: "", homework: m.submissions.map((s, i) => ({ id: String(i), title: s.name, dueDate: s.date, status: s.status, score: s.score })) }));

  const filteredMentorships = allMentorships.filter(m => {
    if (mentorshipStatusFilter !== "all" && m.status !== mentorshipStatusFilter) return false;
    if (mentorshipSearchQuery && !m.student.toLowerCase().includes(mentorshipSearchQuery.toLowerCase()) && !m.topic.toLowerCase().includes(mentorshipSearchQuery.toLowerCase())) return false;
    return true;
  });

  // Ensure profile exists for this user
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/freelancer/login");
      return;
    }
    // Only allow freelancer role
    if (profile && profile.role !== 'freelancer') {
      navigate("/freelancer/login");
      return;
    }
    const ensureProfile = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      
      // Check if profile exists
      const { data: existing } = await supabase.from('profiles').select('id, role').eq('id', currentUser.id).maybeSingle();
      if (existing && existing.role !== 'freelancer') {
        navigate("/freelancer/login");
        return;
      }
      if (!existing) {
        // Create profile from auth metadata
        const meta = currentUser.user_metadata || {};
        await supabase.from('profiles').upsert({
          id: currentUser.id,
          email: currentUser.email || meta.email || '',
          full_name: meta.full_name || 'User',
          role: meta.role || 'freelancer',
          mobile: meta.mobile || null,
        });
        await refreshProfile();
      }
    };
    ensureProfile();
  }, [isAuthenticated, profile, navigate, refreshProfile]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
    toast({ title: "Logged out", description: "You have been logged out successfully." });
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!allowedTypes.includes(ext)) {
      toast({ title: "Invalid File", description: "Please upload PDF, Word, or image files only.", variant: "destructive" });
      return;
    }

    setIsUploadingResume(true);
    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error("Not authenticated");

      // Try to upload to storage (may fail due to RLS, continue anyway)
      let resumeUrl: string | null = null;
      try {
        const filePath = `${userId}/resume${ext}`;
        const { error: storageError } = await supabase.storage.from('resumes').upload(filePath, file, { upsert: true });
        if (!storageError) {
          const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(filePath);
          resumeUrl = urlData.publicUrl;
        } else {
          console.warn("Storage upload failed (RLS), continuing with AI parse:", storageError.message);
        }
      } catch (storageErr) {
        console.warn("Storage upload error, continuing:", storageErr);
      }

      // Parse with AI
      const formData = new FormData();
      formData.append('file', file);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-resume`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to parse resume");
      }

      const parsed = await response.json();
      console.log("Parsed resume data:", parsed);

      // Store full parsed data for display
      setParsedResumeData(parsed);

      // Update profile with AI-extracted data
      const updateData: Record<string, any> = {};
      if (resumeUrl) updateData.resume_url = resumeUrl;
      if (parsed.full_name) updateData.full_name = parsed.full_name;
      if (parsed.email) updateData.email = parsed.email;
      if (parsed.mobile) updateData.mobile = parsed.mobile;
      if (parsed.location) updateData.location = parsed.location;
      if (parsed.current_state) updateData.current_state = parsed.current_state;
      if (parsed.current_district) updateData.current_district = parsed.current_district;
      if (parsed.highest_qualification) updateData.highest_qualification = parsed.highest_qualification;
      if (parsed.experience_level) updateData.experience_level = parsed.experience_level;
      if (parsed.preferred_role) updateData.preferred_role = parsed.preferred_role;
      if (parsed.linkedin) updateData.linkedin = parsed.linkedin;
      if (parsed.languages) updateData.languages = parsed.languages;
      if (parsed.gender) updateData.gender = parsed.gender;
      if (parsed.segment) updateData.segment = parsed.segment;
      if (parsed.date_of_birth) updateData.date_of_birth = parsed.date_of_birth;
      if (parsed.alternate_number) updateData.alternate_number = parsed.alternate_number;
      if (parsed.primary_subject) updateData.primary_subject = parsed.primary_subject;
      if (parsed.program) updateData.program = parsed.program;
      if (parsed.batch) updateData.batch = parsed.batch;
      if (parsed.classes_handled) updateData.classes_handled = parsed.classes_handled;
      if (parsed.office_type) updateData.office_type = parsed.office_type;

      const { error: updateError } = await supabase.from('profiles').update(updateData).eq('id', userId);
      if (updateError) throw updateError;

      // Refresh profile to show updated data
      await refreshProfile();

      toast({ title: "Resume Parsed!", description: "AI has detected and filled your profile details." });
    } catch (error: any) {
      console.error("Resume upload error:", error);
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsUploadingResume(false);
      if (resumeInputRef.current) resumeInputRef.current.value = '';
    }
  };

  const getPageTitle = () => {
    switch (activeMenu) {
      case "dashboard": return `Welcome, ${profile?.full_name || "Freelancer"}`;
      case "portfolio": return "My Portfolio";
      case "projects": return "Find Projects";
      case "mentorship": return "Mentorship";
      case "proposals": return "My Proposals";
      case "earnings": return "Earnings";
      case "upgrade": return "Upgrade Plan";
      case "profile": return "Profile";
      default: return "Dashboard";
    }
  };

  const renderContent = () => {
    switch (activeMenu) {
      case "dashboard":
        return (
          <div className="space-y-6 p-6 overflow-y-auto">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Briefcase className="h-8 w-8 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">5</p>
                  <p className="text-xs text-muted-foreground">Active Projects</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <GraduationCap className="h-8 w-8 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">3</p>
                  <p className="text-xs text-muted-foreground">Students Mentoring</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">₹2.4L</p>
                  <p className="text-xs text-muted-foreground">Total Earnings</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Star className="h-8 w-8 text-accent mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">4.8</p>
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                </CardContent>
              </Card>
            </div>

            {/* Profile Details */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-accent" />
                  <CardTitle className="text-lg">AI Detected Profile Details</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    ref={resumeInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleResumeUpload}
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => resumeInputRef.current?.click()}
                    disabled={isUploadingResume}
                  >
                    {isUploadingResume ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Parsing...</>
                    ) : (
                      <><Upload className="h-4 w-4 mr-2" /> Update Resume</>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("/freelancer/edit-profile")}>
                    <User className="h-4 w-4 mr-2" /> Edit Profile
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-6">
                  <div className="flex flex-col items-center gap-2">
                    {profile?.profile_picture ? (
                      <img src={profile.profile_picture} alt="Profile" className="h-24 w-24 rounded-full object-cover border-2 border-border" />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                        <User className="h-10 w-10 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30 w-40">NAME</td>
                            <td className="px-4 py-3 text-foreground font-semibold">{profile?.full_name || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30 w-40">EMAIL</td>
                            <td className="px-4 py-3 text-foreground">{profile?.email || "—"}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">MOBILE</td>
                            <td className="px-4 py-3 text-foreground">{profile?.mobile || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">LOCATION</td>
                            <td className="px-4 py-3 text-foreground">{profile?.location || profile?.current_state || "—"}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">QUALIFICATION</td>
                            <td className="px-4 py-3 text-foreground">{profile?.highest_qualification || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">EXPERIENCE</td>
                            <td className="px-4 py-3 text-foreground">{profile?.experience_level || "—"}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">SEGMENT</td>
                            <td className="px-4 py-3 text-foreground">{profile?.segment || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">ROLE</td>
                            <td className="px-4 py-3 text-foreground capitalize">{profile?.role || "Freelancer"}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">GENDER</td>
                            <td className="px-4 py-3 text-foreground">{profile?.gender || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">DATE OF BIRTH</td>
                            <td className="px-4 py-3 text-foreground">{profile?.date_of_birth || "—"}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">LINKEDIN</td>
                            <td className="px-4 py-3 text-foreground">{profile?.linkedin || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">LANGUAGES</td>
                            <td className="px-4 py-3 text-foreground">{profile?.languages?.join(", ") || "—"}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">PREFERRED ROLE</td>
                            <td className="px-4 py-3 text-foreground">{profile?.preferred_role || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">PRIMARY SUBJECT</td>
                            <td className="px-4 py-3 text-foreground">{profile?.primary_subject || "—"}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">CURRENT SALARY</td>
                            <td className="px-4 py-3 text-foreground">{profile?.current_salary ? `₹${profile.current_salary.toLocaleString()}` : "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">EXPECTED SALARY</td>
                            <td className="px-4 py-3 text-foreground">{profile?.expected_salary ? `₹${profile.expected_salary.toLocaleString()}` : "—"}</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">AVAILABLE FROM</td>
                            <td className="px-4 py-3 text-foreground">{profile?.available_from || "—"}</td>
                            <td className="px-4 py-3 text-muted-foreground font-medium bg-muted/30">ALT. NUMBER</td>
                            <td className="px-4 py-3 text-foreground">{profile?.alternate_number || "—"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Skills Section */}
                {(parsedResumeData?.skills?.length > 0 || parsedResumeData?.skill_highlights?.length > 0) && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {(parsedResumeData.skills || parsedResumeData.skill_highlights || []).map((skill: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs px-3 py-1">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience Section */}
                {parsedResumeData?.experience?.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Experience</h4>
                    <div className="space-y-3">
                      {parsedResumeData.experience.map((exp: any, i: number) => (
                        <div key={i} className="border border-border rounded-lg p-4 bg-muted/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-foreground">{exp.designation || exp.role || "—"}</p>
                              <p className="text-sm text-muted-foreground">{exp.organization || exp.company || "—"}</p>
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {exp.from_date || "—"} → {exp.to_date || "Present"}
                            </span>
                          </div>
                          {exp.place && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><MapPin className="h-3 w-3" />{exp.place}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education Section */}
                {parsedResumeData?.education?.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Education</h4>
                    <div className="space-y-3">
                      {parsedResumeData.education.map((edu: any, i: number) => (
                        <div key={i} className="border border-border rounded-lg p-4 bg-muted/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-foreground">{edu.education_level} {edu.specialization ? `- ${edu.specialization}` : ""}</p>
                              <p className="text-sm text-muted-foreground">{edu.school_college_name || "—"}</p>
                            </div>
                            <div className="text-right">
                              {edu.year_of_passing && <span className="text-xs text-muted-foreground">{edu.year_of_passing}</span>}
                              {edu.percentage_marks && <p className="text-xs font-medium text-accent">{edu.percentage_marks}%</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Projects</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sampleProjects.slice(0, 2).map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                      <div>
                        <p className="font-medium text-foreground text-sm">{project.title}</p>
                        <p className="text-xs text-muted-foreground">{project.budget} · {project.duration}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">{project.proposals} proposals</Badge>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => setActiveMenu("projects")}>
                    View All Projects <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Active Mentorships</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {sampleMentorships.filter(m => m.status === "active").map((m) => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{m.student}</p>
                          <p className="text-xs text-muted-foreground">{m.topic}</p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{m.nextSession}</span>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" className="w-full" onClick={() => setActiveMenu("mentorship")}>
                    View All <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case "portfolio":
        return <PortfolioTab />;

      case "projects":
        return (
          <div className="space-y-4 p-6 overflow-y-auto">
            <h2 className="text-xl font-semibold text-foreground">Available Projects</h2>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Search projects..."
                  value={projectSearchQuery}
                  onChange={(e) => setProjectSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={projectSkillFilter}
                onChange={(e) => setProjectSkillFilter(e.target.value)}
              >
                <option value="all">All Skills</option>
                {allProjectSkills.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={projectBudgetFilter}
                onChange={(e) => setProjectBudgetFilter(e.target.value)}
              >
                <option value="all">All Budgets</option>
                <option value="under50k">Under ₹50K</option>
                <option value="50k+">₹50K+</option>
              </select>
            </div>
            {filteredProjects.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No projects match your filters.</CardContent></Card>
            ) : filteredProjects.map((project) => (
              <Card key={project.id} className="hover:border-accent/50 transition-colors cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{project.title}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {project.budget}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {project.duration}</span>
                        <span>{project.posted}</span>
                      </div>
                    </div>
                    <Badge variant="secondary">{project.proposals} proposals</Badge>
                  </div>
                  <div className="flex gap-2 flex-wrap mb-4">
                    {project.skills.map((skill) => (
                      <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                    ))}
                  </div>
                  <Button size="sm" className="gap-1">Submit Proposal <ArrowRight className="h-3.5 w-3.5" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        );

      case "mentorship":
        return (
          <div className="space-y-4 p-6 overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">My Mentorship</h2>
              <Button size="sm" className="gap-1"><Users className="h-4 w-4" /> Find Students</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  className="flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Search by student or topic..."
                  value={mentorshipSearchQuery}
                  onChange={(e) => setMentorshipSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={mentorshipStatusFilter}
                onChange={(e) => setMentorshipStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            {filteredMentorships.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No mentorships match your filters.</CardContent></Card>
            ) : filteredMentorships.map((m) => (
               <Card key={m.id} className="hover:border-accent/50 transition-colors cursor-pointer" onClick={() => setSelectedCandidate(m)}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{m.student}</h3>
                        <p className="text-sm text-muted-foreground">{m.topic}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {m.sessions} sessions</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {m.nextSession}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={m.status === "active" ? "default" : "secondary"}>{m.status}</Badge>
                      <Badge variant="outline" className={`text-xs gap-1 ${
                        m.liveTraining === "in-progress" ? "border-green-500 text-green-600" :
                        m.liveTraining === "scheduled" ? "border-blue-500 text-blue-600" :
                        "border-muted-foreground text-muted-foreground"
                      }`}>
                        {m.liveTraining === "in-progress" && <><Radio className="h-3 w-3 animate-pulse" /> Live Training</>}
                        {m.liveTraining === "scheduled" && <><Video className="h-3 w-3" /> Training Scheduled</>}
                        {m.liveTraining === "completed" && <><CheckCircle2 className="h-3 w-3" /> Training Done</>}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Homework: {m.homeworkCompleted}/{m.homeworkGiven} completed
                    </div>
                    <Button size="sm" variant="outline" className="ml-auto gap-1 text-xs h-7" onClick={(e) => { e.stopPropagation(); setSelectedCandidate(m); }}>
                      <Send className="h-3 w-3" /> Give Homework
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Candidate Detail Modal */}
            <Dialog open={!!selectedCandidate} onOpenChange={(open) => !open && setSelectedCandidate(null)}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-accent" />
                    </div>
                    {selectedCandidate?.student} — Full Profile
                  </DialogTitle>
                </DialogHeader>
                {selectedCandidate && (
                  <div className="space-y-5">
                    {/* Personal Details */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><User className="h-4 w-4" /> Personal Details</h4>
                      <div className="border border-border rounded-lg overflow-hidden text-sm">
                        <table className="w-full">
                          <tbody>
                            <tr className="border-b border-border">
                              <td className="px-3 py-2 text-muted-foreground bg-muted/30 w-36">Name</td>
                              <td className="px-3 py-2 text-foreground font-medium">{selectedCandidate.student}</td>
                              <td className="px-3 py-2 text-muted-foreground bg-muted/30 w-36">Gender</td>
                              <td className="px-3 py-2 text-foreground">{selectedCandidate.gender}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="px-3 py-2 text-muted-foreground bg-muted/30">Email</td>
                              <td className="px-3 py-2 text-foreground">{selectedCandidate.email}</td>
                              <td className="px-3 py-2 text-muted-foreground bg-muted/30">Mobile</td>
                              <td className="px-3 py-2 text-foreground">{selectedCandidate.mobile}</td>
                            </tr>
                            <tr className="border-b border-border">
                              <td className="px-3 py-2 text-muted-foreground bg-muted/30">Location</td>
                              <td className="px-3 py-2 text-foreground">{selectedCandidate.location}</td>
                              <td className="px-3 py-2 text-muted-foreground bg-muted/30">DOB</td>
                              <td className="px-3 py-2 text-foreground">{selectedCandidate.dob}</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 text-muted-foreground bg-muted/30">Qualification</td>
                              <td className="px-3 py-2 text-foreground">{selectedCandidate.qualification}</td>
                              <td className="px-3 py-2 text-muted-foreground bg-muted/30">Experience</td>
                              <td className="px-3 py-2 text-foreground">{selectedCandidate.experience}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Scores Section */}
                    <div className="grid grid-cols-2 gap-4">
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Mock Test Score</p>
                          <p className={`text-2xl font-bold ${selectedCandidate.mockTestScore >= 70 ? 'text-green-600' : selectedCandidate.mockTestScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {selectedCandidate.mockTestScore}%
                          </p>
                          <Progress value={selectedCandidate.mockTestScore} className="h-2 mt-2" />
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4">
                          <p className="text-xs text-muted-foreground mb-1">Assignment Score</p>
                          <p className={`text-2xl font-bold ${selectedCandidate.assignmentScore >= 70 ? 'text-green-600' : selectedCandidate.assignmentScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                            {selectedCandidate.assignmentScore}%
                          </p>
                          <Progress value={selectedCandidate.assignmentScore} className="h-2 mt-2" />
                        </CardContent>
                      </Card>
                    </div>

                    {/* Skills Interested to Learn */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4" /> Skills Interested to Learn</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.skillsToLearn.map((skill) => (
                          <Badge key={skill} variant="outline">{skill}</Badge>
                        ))}
                      </div>
                    </div>

                    {/* Live Training Status */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Video className="h-4 w-4" /> Live Training Status</h4>
                      <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                        selectedCandidate.liveTraining === "in-progress" ? "border-green-500/50 bg-green-50 dark:bg-green-900/10" :
                        selectedCandidate.liveTraining === "scheduled" ? "border-blue-500/50 bg-blue-50 dark:bg-blue-900/10" :
                        "border-border bg-muted/30"
                      }`}>
                        {selectedCandidate.liveTraining === "in-progress" && <><Radio className="h-5 w-5 text-green-600 animate-pulse" /><div><p className="font-medium text-green-700 dark:text-green-400">Live Training In Progress</p><p className="text-xs text-muted-foreground">Currently attending session</p></div></>}
                        {selectedCandidate.liveTraining === "scheduled" && <><Video className="h-5 w-5 text-blue-600" /><div><p className="font-medium text-blue-700 dark:text-blue-400">Training Scheduled</p><p className="text-xs text-muted-foreground">Next session: {selectedCandidate.nextSession}</p></div></>}
                        {selectedCandidate.liveTraining === "completed" && <><CheckCircle2 className="h-5 w-5 text-muted-foreground" /><div><p className="font-medium text-foreground">Training Completed</p><p className="text-xs text-muted-foreground">All sessions finished</p></div></>}
                      </div>
                    </div>

                    {/* Mentorship Info */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Mentorship Info</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                          <p className="text-lg font-bold text-foreground">{selectedCandidate.sessions}</p>
                          <p className="text-xs text-muted-foreground">Sessions</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                          <p className="text-sm font-medium text-foreground">{selectedCandidate.topic}</p>
                          <p className="text-xs text-muted-foreground">Topic</p>
                        </div>
                        <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                          <Badge variant={selectedCandidate.status === "active" ? "default" : "secondary"}>{selectedCandidate.status}</Badge>
                          <p className="text-xs text-muted-foreground mt-1">Status</p>
                        </div>
                      </div>
                    </div>

                    {/* Homework Section */}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Homework</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border border-border">
                          <div className="flex-1">
                            <p className="text-sm text-foreground font-medium">Completed: {selectedCandidate.homeworkCompleted} / {selectedCandidate.homeworkGiven}</p>
                            <Progress value={(selectedCandidate.homeworkCompleted / selectedCandidate.homeworkGiven) * 100} className="h-2 mt-1" />
                          </div>
                          <Badge variant={selectedCandidate.homeworkCompleted === selectedCandidate.homeworkGiven ? "default" : "secondary"}>
                            {selectedCandidate.homeworkCompleted === selectedCandidate.homeworkGiven ? "All Done" : "Pending"}
                          </Badge>
                        </div>
                        {/* Candidate Uploaded Documents */}
                        {selectedCandidate.submissions.length > 0 && (
                          <div className="border border-border rounded-lg p-3 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Candidate Uploaded Documents</p>
                            <div className="space-y-2">
                              {selectedCandidate.submissions.map((sub, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2 rounded-md bg-background border border-border">
                                  <FileText className="h-4 w-4 text-accent flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{sub.name}</p>
                                    <p className="text-xs text-muted-foreground">{sub.date}</p>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 flex-shrink-0"
                                    onClick={() => {
                                      if ((sub as any).url) {
                                        window.open((sub as any).url, '_blank');
                                      } else {
                                        toast({ title: "Downloading...", description: sub.name });
                                      }
                                    }}
                                    title={`Download ${sub.name}`}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                  {sub.status === "reviewed" ? (
                                    <Badge variant="default" className="text-xs gap-1">
                                      <CheckCircle2 className="h-3 w-3" /> {sub.score}%
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">Pending Review</Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="border border-border rounded-lg p-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">Assign New Homework</p>
                          <Textarea placeholder="Enter homework title..." className="text-sm min-h-[40px]" value={hwTitle} onChange={(e) => setHwTitle(e.target.value)} />
                          <Textarea placeholder="Description (optional)..." className="text-sm min-h-[40px]" value={hwDesc} onChange={(e) => setHwDesc(e.target.value)} />
                          <div className="flex items-center gap-2 flex-wrap">
                            <input type="date" className="h-8 rounded-md border border-input bg-background px-2 text-xs" value={hwDueDate} onChange={(e) => setHwDueDate(e.target.value)} />
                            <label className="flex items-center gap-1.5 h-8 px-3 rounded-md border border-input bg-background text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                              <Upload className="h-3.5 w-3.5" />
                              <span>{hwFile ? (hwFile.name.length > 20 ? hwFile.name.slice(0, 17) + '...' : hwFile.name) : "Attach Document"}</span>
                              <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.zip" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setHwFile(file);
                              }} />
                            </label>
                            <Button size="sm" className="ml-auto gap-1 h-8 text-xs" onClick={async () => {
                              if (!hwTitle.trim()) { toast({ title: "Enter a title", variant: "destructive" }); return; }
                              if (selectedCandidate?.enrollmentId) {
                                await assignHomework(selectedCandidate.enrollmentId, selectedCandidate.candidateId, hwTitle, hwDesc, hwDueDate);
                                if (hwFile) await uploadDocument(selectedCandidate.enrollmentId, null, hwFile);
                              } else {
                                toast({ title: "Homework Assigned!", description: `"${hwTitle}" sent to ${selectedCandidate?.student}.` });
                              }
                              setHwTitle(""); setHwDesc(""); setHwDueDate(""); setHwFile(null);
                            }}>
                              <Send className="h-3 w-3" /> Assign
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        );

      case "proposals":
        return (
          <div className="p-6">
            <Card>
              <CardContent className="p-12 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Active Proposals</h3>
                <p className="text-muted-foreground mb-4">Browse projects and submit proposals to get started.</p>
                <Button onClick={() => setActiveMenu("projects")}>Browse Projects</Button>
              </CardContent>
            </Card>
          </div>
        );

      case "earnings":
        return (
          <div className="p-6">
            <Card>
              <CardContent className="p-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Earnings Dashboard</h3>
                <p className="text-muted-foreground mb-4">Your earnings and payment history will appear here.</p>
              </CardContent>
            </Card>
          </div>
        );

      case "upgrade":
        return (
          <div className="p-6 space-y-8">
            <div className="text-center max-w-2xl mx-auto">
              <Crown className="h-10 w-10 text-accent mx-auto mb-3" />
              <h2 className="text-3xl font-bold text-foreground mb-2">Upgrade Your Plan</h2>
              <p className="text-muted-foreground">Unlock premium features to grow your freelancing career</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {/* Free Plan */}
              <Card className="relative border-border">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">Starter</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">₹0</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {[
                      "1 Portfolio page",
                      "5 Project proposals/month",
                      "Basic profile visibility",
                      "Community support",
                      "Standard search ranking",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className="w-full" disabled>Current Plan</Button>
                </CardContent>
              </Card>

              {/* Pro Plan */}
              <Card className="relative border-primary shadow-lg">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-semibold">
                  Most Popular
                </div>
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">Pro</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">₹1,499</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {[
                      "Unlimited Portfolio projects",
                      "30 Project proposals/month",
                      "AI Resume Analyzer",
                      "Priority profile visibility",
                      "Featured in search results",
                      "Mentorship tools (up to 10 students)",
                      "Earnings analytics dashboard",
                      "Email support",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full gap-2">
                    <Zap className="h-4 w-4" /> Upgrade to Pro
                  </Button>
                </CardContent>
              </Card>

              {/* Premium Plan */}
              <Card className="relative border-border">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">Premium</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-foreground">₹2,999</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {[
                      "Everything in Pro",
                      "Unlimited proposals",
                      "AI Portfolio auto-generation",
                      "Top search ranking & badge",
                      "Unlimited mentorship students",
                      "Advanced analytics & reports",
                      "Custom branded portfolio URL",
                      "Priority 24/7 support",
                      "Early access to new features",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-foreground">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" className="w-full gap-2">
                    <Crown className="h-4 w-4" /> Upgrade to Premium
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Comparison Table */}
            <Card className="max-w-5xl mx-auto">
              <CardHeader>
                <CardTitle>Feature Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 text-foreground">Feature</th>
                        <th className="text-center py-3 px-4 text-foreground">Starter</th>
                        <th className="text-center py-3 px-4 text-foreground">Pro</th>
                        <th className="text-center py-3 px-4 text-foreground">Premium</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { feature: "Portfolio Projects", starter: "1", pro: "Unlimited", premium: "Unlimited" },
                        { feature: "Monthly Proposals", starter: "5", pro: "30", premium: "Unlimited" },
                        { feature: "AI Resume Analyzer", starter: false, pro: true, premium: true },
                        { feature: "AI Portfolio Generation", starter: false, pro: false, premium: true },
                        { feature: "Mentorship Students", starter: "—", pro: "Up to 10", premium: "Unlimited" },
                        { feature: "Earnings Analytics", starter: false, pro: true, premium: true },
                        { feature: "Search Priority", starter: "Standard", pro: "High", premium: "Top" },
                        { feature: "Custom Portfolio URL", starter: false, pro: false, premium: true },
                        { feature: "Support", starter: "Community", pro: "Email", premium: "24/7 Priority" },
                      ].map((row) => (
                        <tr key={row.feature} className="border-b">
                          <td className="py-3 px-4 text-foreground">{row.feature}</td>
                          {(["starter", "pro", "premium"] as const).map((tier) => (
                            <td key={tier} className="text-center py-3 px-4">
                              {typeof row[tier] === "boolean"
                                ? row[tier]
                                  ? <Check className="h-4 w-4 text-primary mx-auto" />
                                  : <span className="text-muted-foreground">—</span>
                                : <span className="text-foreground">{row[tier]}</span>
                              }
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case "profile":
        return (
          <div className="p-6">
            <Card>
              <CardHeader>
                <CardTitle>Freelancer Profile</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium text-foreground">{profile?.full_name || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium text-foreground">{profile?.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium text-foreground">{profile?.mobile || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium text-foreground">{profile?.location || "—"}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => navigate("/profile/edit")}>Edit Profile</Button>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-subtle flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-card border-r border-border transition-all duration-300 overflow-hidden flex flex-col fixed top-[64px] left-0 h-[calc(100vh-64px)] z-40`}
      >
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-accent/10 text-accent font-medium border-l-4 border-accent -ml-1 pl-5"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 overflow-hidden ${sidebarOpen ? "ml-64" : "ml-0"}`}>
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
            {/* Profile Badge */}
            <div className="flex items-center gap-3 mr-4">
              {profile?.profile_picture ? (
                <img
                  src={profile.profile_picture}
                  alt={profile.full_name || "Profile"}
                  className="h-10 w-10 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">{profile?.full_name || "User"}</p>
                <p className="text-xs text-muted-foreground">Freelancer</p>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{getPageTitle()}</h1>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default FreelancerDashboard;
