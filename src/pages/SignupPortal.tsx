import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  User, Briefcase, UserPlus, LogIn, Bell, LayoutDashboard, 
  ArrowLeft, Users, Target, BarChart, Shield, ChevronRight,
  FileText, TrendingUp, Search, Menu, ClipboardList,
  CreditCard, Megaphone, Database, Monitor, MessageSquare, 
  Award, Sparkles, Receipt, CheckCircle, Video, Download,
  Plus, Table, Bot, Activity, Calendar, Clock, UserCheck, XCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PasswordStrengthIndicator } from "@/components/ui/PasswordStrengthIndicator";
import { SignupWizard } from "@/components/candidate/signup/SignupWizard";
import { cn } from "@/lib/utils";
import { indiaLocationData } from "@/data/indiaLocations";

type UserRole = "candidate" | "employer" | null;
type SidebarOption = "become-employer" | "registration" | "login" | "job-alert" | "dashboard";
type JobAlertSubOption = 
  | "vacancies-list" 
  | "payment" 
  | "advertisement" 
  | "get-data-cvs" 
  | "cv-dashboard" 
  | "interview-process" 
  | "feedback-report" 
  | "offer-letter";
type VacanciesSubOption = "manual-job" | "ai-job";
type PaymentSubOption = "tariffs" | "receipts" | "confirmation";
type AdvertisementSubOption = "flyers-videos";

const companyCategories = [
  "IT & Technology",
  "Education",
  "Healthcare",
  "Finance & Banking",
  "Manufacturing",
  "Retail & E-commerce",
  "Consulting",
  "Other"
];

interface FormErrors {
  companyName?: string;
  companyCategory?: string;
  contactPerson?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  state?: string;
  district?: string;
  townCity?: string;
  designation?: string;
  contactNumber?: string;
}

const SignupPortal = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profile } = useAuth();
  const { toast } = useToast();
  
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [activeSection, setActiveSection] = useState<SidebarOption>("registration");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [jobAlertSubOption, setJobAlertSubOption] = useState<JobAlertSubOption>("vacancies-list");
  const [vacanciesSubOption, setVacanciesSubOption] = useState<VacanciesSubOption>("manual-job");
  const [paymentSubOption, setPaymentSubOption] = useState<PaymentSubOption>("tariffs");
  const [advertisementSubOption, setAdvertisementSubOption] = useState<AdvertisementSubOption>("flyers-videos");
  const [showAddJobForm, setShowAddJobForm] = useState(false);
  
  // Add Job Form states
  const [jobDate, setJobDate] = useState("");
  const [jobCity, setJobCity] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [jobSegment, setJobSegment] = useState("");
  const [jobDepartment, setJobDepartment] = useState("");
  const [jobDesignation, setJobDesignation] = useState("");
  const [jobSalary, setJobSalary] = useState("");
  const [jobQualification, setJobQualification] = useState("");
  const [jobExperience, setJobExperience] = useState("");
  const [savedJobs, setSavedJobs] = useState<Array<{
    id: string;
    date: string;
    city: string;
    schoolName: string;
    segment: string;
    department: string;
    designation: string;
    salary: string;
    qualification: string;
    experience: string;
    status: string;
  }>>([]);

  // Role-based options (same as MockInterviewPipeline)
  const segmentOptions = ['Pre-Primary', 'Primary', 'High School', 'School'];

  const categoryOptions: Record<string, string[]> = {
    'Pre-Primary': ['Teaching', 'Helping/Supporting', 'Admin'],
    'Primary': ['Teaching', 'Helping/Supporting', 'Admin', 'CLASS-1&2', 'CLASSES-3,4&5'],
    'High School': ['Board', 'Compititive'],
    'School': ['CBSE', 'State Board'],
  };

  const schoolDesignationOptions = [
    'Principal', 'Cluster Principal', 'SME', 'RP', 'Vice Principal', 'Dean', 'Academic Dean'
  ];

  const designationOptions: Record<string, Record<string, string[]>> = {
    'Pre-Primary': {
      'Teaching': ['MOTHER TEACHER'],
      'Helping/Supporting': ['ASSO.TEACHER', 'CARE TAKER'],
      'Admin': ['VICE PRINCIPAL']
    },
    'Primary': {
      'Teaching': ['PRT', 'TGT', 'ASSO.TEACHER'],
      'Helping/Supporting': ['ASSO.TEACHER'],
      'Admin': ['VICE PRINCIPAL'],
      'CLASS-1&2': ['PRT', 'TGT', 'SUBJECT TEACHER'],
      'CLASSES-3,4&5': ['1st Language', '2nd Language', '3rd Language', 'MATHS', 'GEN.SCIENCE', 'SOCIAL', 'COMPUTERS', 'PHYSICAL EDUCATION', 'CCA']
    },
    'High School': {
      'Board': ['Telugu', 'Hindi', 'English', 'Maths', 'Physics', 'Chemistry', 'Biology'],
      'Compititive': ['TGT', 'PGT', 'SENIOR TEACHER', 'HOD']
    },
    'School': {
      'CBSE': schoolDesignationOptions,
      'State Board': schoolDesignationOptions
    }
  };

  // Get available departments based on selected segment
  const availableDepartments = useMemo(() => {
    if (!jobSegment) return [];
    return categoryOptions[jobSegment] || [];
  }, [jobSegment]);

  // Get available designations based on selected segment and department
  const availableDesignations = useMemo(() => {
    if (!jobSegment || !jobDepartment) return [];
    return designationOptions[jobSegment]?.[jobDepartment] || [];
  }, [jobSegment, jobDepartment]);

  // Reset dependent fields when segment changes
  const handleSegmentChange = (value: string) => {
    setJobSegment(value);
    setJobDepartment("");
    setJobDesignation("");
  };

  // Reset designation when department changes
  const handleDepartmentChange = (value: string) => {
    setJobDepartment(value);
    setJobDesignation("");
  };

  const [isSavingJob, setIsSavingJob] = useState(false);

  const handleSaveJob = async () => {
    if (!jobDesignation || !jobCity || !schoolName) {
      toast({
        title: "Missing Fields",
        description: "Please fill in at least Designation, City, and School Name",
        variant: "destructive",
      });
      return;
    }

    setIsSavingJob(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // If user is authenticated, save to database
      if (user) {
        const { data, error } = await supabase
          .from('jobs')
          .insert({
            employer_id: user.id,
            job_title: jobDesignation,
            location: jobCity,
            description: `School: ${schoolName}, Segment: ${jobSegment || 'N/A'}`,
            department: jobDepartment || null,
            salary_range: jobSalary || null,
            requirements: jobQualification || null,
            experience_required: jobExperience || null,
            closing_date: jobDate || null,
            status: 'draft',
          })
          .select()
          .single();

        if (error) throw error;

        const newJob = {
          id: data.id,
          date: jobDate,
          city: jobCity,
          schoolName: schoolName,
          segment: jobSegment,
          department: jobDepartment,
          designation: jobDesignation,
          salary: jobSalary,
          qualification: jobQualification,
          experience: jobExperience,
          status: "Draft",
        };

        setSavedJobs([...savedJobs, newJob]);

        toast({
          title: "Job Saved",
          description: "Your job has been saved to the database!",
        });
      } else {
        // Save locally for non-authenticated users (demo mode)
        const newJob = {
          id: Date.now().toString(),
          date: jobDate,
          city: jobCity,
          schoolName: schoolName,
          segment: jobSegment,
          department: jobDepartment,
          designation: jobDesignation,
          salary: jobSalary,
          qualification: jobQualification,
          experience: jobExperience,
          status: "Draft (Local)",
        };

        setSavedJobs([...savedJobs, newJob]);

        toast({
          title: "Job Saved Locally",
          description: "Complete registration to save jobs permanently to the database.",
        });
      }
      
      // Reset form
      setJobDate("");
      setJobCity("");
      setSchoolName("");
      setJobSegment("");
      setJobDepartment("");
      setJobDesignation("");
      setJobSalary("");
      setJobQualification("");
      setJobExperience("");
      setShowAddJobForm(false);
    } catch (error: any) {
      console.error('Error saving job:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingJob(false);
    }
  };

  // Employer form states
  const [companyName, setCompanyName] = useState("");
  const [companyCategory, setCompanyCategory] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [townCity, setTownCity] = useState("");
  const [designation, setDesignation] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  // Derived location options
  const states = useMemo(() => Object.keys(indiaLocationData).sort(), []);
  const districts = useMemo(() => {
    if (!state) return [];
    return Object.keys(indiaLocationData[state] || {}).sort();
  }, [state]);
  const towns = useMemo(() => {
    if (!state || !district) return [];
    return (indiaLocationData[state]?.[district] || []).sort();
  }, [state, district]);

  useEffect(() => {
    if (isAuthenticated && profile) {
      if (profile.role === 'employer') {
        navigate("/employer/agreement");
      } else {
        navigate("/candidate/dashboard");
      }
    }
  }, [isAuthenticated, profile, navigate]);

  const validateEmployerForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }
    if (!companyCategory) {
      newErrors.companyCategory = "Please select a company category";
    }
    if (!contactPerson.trim()) {
      newErrors.contactPerson = "Contact person name is required";
    }
    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!state) {
      newErrors.state = "Please select a state";
    }
    if (!district) {
      newErrors.district = "Please select a district";
    }
    if (!townCity) {
      newErrors.townCity = "Please select or enter town/city";
    }
    if (!designation.trim()) {
      newErrors.designation = "Designation is required";
    }
    if (!contactNumber.trim()) {
      newErrors.contactNumber = "Contact number is required";
    } else if (!/^[6-9]\d{9}$/.test(contactNumber)) {
      newErrors.contactNumber = "Please enter a valid 10-digit mobile number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmployerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmployerForm()) return;

    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/employer/agreement`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: 'employer',
            company_name: companyName,
            company_category: companyCategory,
            full_name: contactPerson,
          }
        }
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setErrors({ email: "This email is already registered. Please login instead." });
        } else {
          toast({
            title: "Signup Failed",
            description: authError.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: authData.user.id,
            email: email,
            full_name: contactPerson,
            company_name: companyName,
            role: 'employer',
            current_state: state,
            current_district: district,
            location: townCity,
            mobile: contactNumber,
            preferred_role: designation,
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }
      }

      toast({
        title: "Account Created!",
        description: "Please review and accept the agreement to continue",
      });

      navigate("/employer/agreement");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during signup",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const candidateSidebarItems = [
    { id: "registration" as SidebarOption, label: "Registration", icon: UserPlus },
    { id: "login" as SidebarOption, label: "Login", icon: LogIn },
    { id: "job-alert" as SidebarOption, label: "Job Alert", icon: Bell },
    { id: "dashboard" as SidebarOption, label: "Candidate Dashboard", icon: LayoutDashboard },
  ];

  const employerSidebarItems = [
    { id: "become-employer" as SidebarOption, label: "Become an Employer", icon: Briefcase },
    { id: "registration" as SidebarOption, label: "Registration", icon: UserPlus },
    { id: "job-alert" as SidebarOption, label: "Job Alert", icon: Bell, hasSubItems: true },
    { id: "dashboard" as SidebarOption, label: "Client Dashboard", icon: LayoutDashboard },
  ];

  const jobAlertSubItems = [
    { id: "vacancies-list" as JobAlertSubOption, label: "Vacancies List", icon: ClipboardList, hasSubItems: true },
    { id: "payment" as JobAlertSubOption, label: "Payment", icon: CreditCard, hasSubItems: true },
    { id: "advertisement" as JobAlertSubOption, label: "Advertisement", icon: Megaphone, hasSubItems: true },
    { id: "get-data-cvs" as JobAlertSubOption, label: "Get DATA/CVs", icon: Database },
    { id: "cv-dashboard" as JobAlertSubOption, label: "CV Dashboard", icon: Monitor },
    { id: "interview-process" as JobAlertSubOption, label: "Interview Process", icon: MessageSquare },
    { id: "feedback-report" as JobAlertSubOption, label: "Feedback Report", icon: FileText },
    { id: "offer-letter" as JobAlertSubOption, label: "Offer Letter", icon: Award },
  ];

  const sidebarItems = selectedRole === "employer" ? employerSidebarItems : candidateSidebarItems;

  // Role Selection Screen
  if (!selectedRole) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-4xl">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-slate-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>

          <div className="text-center mb-12">
            <img 
              src={gradiaLogo} 
              alt="Gradia" 
              className="h-16 w-auto mx-auto mb-6 bg-white/10 rounded-lg p-2"
            />
            <h1 className="text-4xl font-bold text-white mb-4">Who are you?</h1>
            <p className="text-slate-400 text-lg">
              Select your role to continue with registration
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Candidate Option */}
            <Card 
              className="bg-slate-800/50 border-slate-700 hover:border-blue-500 cursor-pointer transition-all hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10"
              onClick={() => navigate("/candidate/signup")}
            >
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-6">
                  <User className="h-10 w-10 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">I'm a Candidate</h2>
                <p className="text-slate-400 mb-6">
                  Looking for job opportunities, career growth, and connecting with employers
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">Browse Jobs</span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">Resume Builder</span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">Interview Prep</span>
                </div>
                <Button className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                  Continue as Candidate
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Employer Option */}
            <Card 
              className="bg-slate-800/50 border-slate-700 hover:border-green-500 cursor-pointer transition-all hover:scale-105 hover:shadow-xl hover:shadow-green-500/10"
              onClick={() => {
                setSelectedRole("employer");
                setActiveSection("become-employer");
              }}
            >
              <CardContent className="p-8 text-center">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <Briefcase className="h-10 w-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">I'm an Employer</h2>
                <p className="text-slate-400 mb-6">
                  Looking to hire talent, post jobs, and find the perfect candidates
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Post Jobs</span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">AI Matching</span>
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">Analytics</span>
                </div>
                <Button className="mt-6 w-full bg-green-600 hover:bg-green-700 text-white" size="lg">
                  Continue as Employer
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
            <div className="bg-slate-800/30 rounded-lg p-4 text-center border border-slate-700">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center mx-auto mb-2">
                <Users className="h-5 w-5 text-orange-400" />
              </div>
              <div className="text-2xl font-bold text-white">10,000+</div>
              <div className="text-xs text-slate-400">Expected Attendees</div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-4 text-center border border-slate-700">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">150+</div>
              <div className="text-xs text-slate-400">Partner Companies</div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-4 text-center border border-slate-700">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
              <div className="text-2xl font-bold text-white">500+</div>
              <div className="text-xs text-slate-400">Job Opportunities</div>
            </div>
            <div className="bg-slate-800/30 rounded-lg p-4 text-center border border-slate-700">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mx-auto mb-2">
                <Target className="h-5 w-5 text-purple-400" />
              </div>
              <div className="text-2xl font-bold text-white">50+</div>
              <div className="text-xs text-slate-400">Industry Partners</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Layout with Sidebar
  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Sidebar */}
      <aside className={cn(
        "bg-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col sticky top-0 h-screen",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <img 
              src={gradiaLogo} 
              alt="Gradia" 
              className="h-10 w-10 object-contain bg-white/10 rounded-lg p-1"
            />
            {!sidebarCollapsed && (
              <div>
                <div className="font-semibold text-white">Gradia Portal</div>
                <div className="text-xs text-slate-400 capitalize">{selectedRole} Portal</div>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        {!sidebarCollapsed && (
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search..." 
                className="pl-9 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "login") {
                  navigate(selectedRole === "employer" ? "/employer/login" : "/candidate/login");
                } else {
                  setActiveSection(item.id);
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mb-1",
                activeSection === item.id
                  ? "bg-primary text-primary-foreground"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Sidebar Toggle */}
        <div className="p-4 border-t border-slate-700">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-slate-400 hover:text-white"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            <Menu className="h-4 w-4" />
            {!sidebarCollapsed && <span className="ml-2">Collapse</span>}
          </Button>
        </div>

        {/* Back to role selection */}
        <div className="p-4 border-t border-slate-700">
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-slate-400 hover:text-white"
            onClick={() => setSelectedRole(null)}
          >
            <ArrowLeft className="h-4 w-4" />
            {!sidebarCollapsed && <span className="ml-2">Change Role</span>}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Stats Bar */}
        <div className="bg-slate-800/50 border-b border-slate-700 p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                  <Users className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">10,000+</div>
                  <div className="text-xs text-slate-400">Expected Attendees</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">150+</div>
                  <div className="text-xs text-slate-400">Partner Companies</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">500+</div>
                  <div className="text-xs text-slate-400">Job Opportunities</div>
                </div>
              </div>
            </div>
            <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Target className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <div className="text-lg font-bold text-white">50+</div>
                  <div className="text-xs text-slate-400">Industry Partners</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6">
          {selectedRole === "candidate" && activeSection === "registration" && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Become a Candidate</h1>
                <p className="text-slate-400">Join us and find your dream job opportunity</p>
              </div>
              
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">As a Candidate?</h2>
                    </div>
                  </div>
                  
                  <p className="text-slate-300 mb-4">
                    A <strong className="text-white">Candidate</strong> is a job seeker who registers with Gradia to find employment opportunities. 
                    Candidates create profiles, upload resumes, and apply to jobs posted by employers.
                  </p>
                  
                  <p className="text-slate-300">
                    As a candidate, you get access to <strong className="text-blue-400">Resume Building</strong> tools, 
                    <strong className="text-green-400"> Interview Preparation</strong> resources, 
                    <strong className="text-purple-400"> Career Coaching</strong>, and 
                    <strong className="text-orange-400"> Job Matching</strong> features to help you land your dream job.
                  </p>
                </CardContent>
              </Card>

              <div className="mt-6">
                <SignupWizard />
              </div>
            </div>
          )}

          {selectedRole === "employer" && activeSection === "become-employer" && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white">Become an Employer</h1>
                <p className="text-slate-400">Join us as a strategic partner and unlock exclusive opportunities</p>
              </div>
              
              {/* Introduction Card */}
              <Card className="bg-slate-800 border-slate-700 mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">As an Employer?</h2>
                    </div>
                  </div>
                  
                  <p className="text-slate-300 mb-4">
                    An <strong className="text-white">Employer</strong> is an organization or entity that collaborates with Gradia to support employment generation initiatives. 
                    Employers post jobs and strategically connect with talented candidates to build exceptional teams.
                  </p>
                  
                  <p className="text-slate-300">
                    As an employer, you serve as a <strong className="text-blue-400">Brand Ambassador</strong> representing your company within the talent network, 
                    a <strong className="text-green-400">Talent Connector</strong> helping bridge the gap between job seekers and opportunities, 
                    an <strong className="text-purple-400">Industry Expert</strong> sharing insights through panel discussions, 
                    and a <strong className="text-orange-400">Community Builder</strong> fostering connections between businesses, job seekers, and professionals.
                  </p>
                </CardContent>
              </Card>

              {/* Benefits Section */}
              <Card className="bg-slate-800 border-slate-700 mb-6">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-400" />
                    Employer Benefits
                  </h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex gap-3 p-3 bg-slate-700/50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <Users className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white text-sm">Access Quality Candidates</h4>
                        <p className="text-xs text-slate-400">Pre-vetted, skilled professionals ready to join your team</p>
                      </div>
                    </div>

                    <div className="flex gap-3 p-3 bg-slate-700/50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <Target className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white text-sm">AI-Powered Matching</h4>
                        <p className="text-xs text-slate-400">Smart algorithms to find the perfect fit for your roles</p>
                      </div>
                    </div>

                    <div className="flex gap-3 p-3 bg-slate-700/50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <BarChart className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white text-sm">Analytics Dashboard</h4>
                        <p className="text-xs text-slate-400">Track hiring metrics and optimize your recruitment</p>
                      </div>
                    </div>

                    <div className="flex gap-3 p-3 bg-slate-700/50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <Shield className="h-5 w-5 text-orange-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white text-sm">Background Verification</h4>
                        <p className="text-xs text-slate-400">Built-in screening tools for secure hiring</p>
                      </div>
                    </div>

                    <div className="flex gap-3 p-3 bg-slate-700/50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <FileText className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white text-sm">Post Unlimited Jobs</h4>
                        <p className="text-xs text-slate-400">Reach thousands of qualified job seekers</p>
                      </div>
                    </div>

                    <div className="flex gap-3 p-3 bg-slate-700/50 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                        <TrendingUp className="h-5 w-5 text-pink-400" />
                      </div>
                      <div>
                        <h4 className="font-medium text-white text-sm">Brand Visibility</h4>
                        <p className="text-xs text-slate-400">Showcase your company to potential candidates</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* CTA to Registration */}
              <Card className="bg-slate-800 border-green-500/50">
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold text-white mb-2">Ready to Start Hiring?</h3>
                  <p className="text-slate-300 text-sm mb-4">Create your employer account and access thousands of qualified candidates</p>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white" 
                    size="lg"
                    onClick={() => setActiveSection("registration")}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Proceed to Registration
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {selectedRole === "employer" && activeSection === "registration" && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <UserPlus className="h-6 w-6 text-green-400" />
                  Employer Registration
                </h1>
                <p className="text-slate-400">Complete the form below to create your employer account</p>
              </div>

              {/* Employer Registration Form */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6">
                  <form onSubmit={handleEmployerSubmit} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName" className="text-white">Company Name <span className="text-destructive">*</span></Label>
                        <Input
                          id="companyName"
                          type="text"
                          placeholder="Enter your company name"
                          value={companyName}
                          onChange={(e) => {
                            setCompanyName(e.target.value);
                            if (errors.companyName) setErrors({ ...errors, companyName: undefined });
                          }}
                          className={cn("bg-slate-700 border-slate-600 text-white", errors.companyName && "border-destructive")}
                        />
                        {errors.companyName && <p className="text-sm text-destructive">{errors.companyName}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="companyCategory" className="text-white">Company Category <span className="text-destructive">*</span></Label>
                        <Select value={companyCategory} onValueChange={(value) => {
                          setCompanyCategory(value);
                          if (errors.companyCategory) setErrors({ ...errors, companyCategory: undefined });
                        }}>
                          <SelectTrigger className={cn("bg-slate-700 border-slate-600 text-white", errors.companyCategory && "border-destructive")}>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {companyCategories.map((category) => (
                              <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.companyCategory && <p className="text-sm text-destructive">{errors.companyCategory}</p>}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactPerson" className="text-white">Contact Person Name <span className="text-destructive">*</span></Label>
                        <Input
                          id="contactPerson"
                          type="text"
                          placeholder="Enter your full name"
                          value={contactPerson}
                          onChange={(e) => {
                            setContactPerson(e.target.value);
                            if (errors.contactPerson) setErrors({ ...errors, contactPerson: undefined });
                          }}
                          className={cn("bg-slate-700 border-slate-600 text-white", errors.contactPerson && "border-destructive")}
                        />
                        {errors.contactPerson && <p className="text-sm text-destructive">{errors.contactPerson}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="designation" className="text-white">Designation <span className="text-destructive">*</span></Label>
                        <Input
                          id="designation"
                          type="text"
                          placeholder="e.g., HR Manager, CEO"
                          value={designation}
                          onChange={(e) => {
                            setDesignation(e.target.value);
                            if (errors.designation) setErrors({ ...errors, designation: undefined });
                          }}
                          className={cn("bg-slate-700 border-slate-600 text-white", errors.designation && "border-destructive")}
                        />
                        {errors.designation && <p className="text-sm text-destructive">{errors.designation}</p>}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactNumber" className="text-white">Contact Number <span className="text-destructive">*</span></Label>
                        <Input
                          id="contactNumber"
                          type="tel"
                          placeholder="Enter 10-digit mobile number"
                          value={contactNumber}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setContactNumber(value);
                            if (errors.contactNumber) setErrors({ ...errors, contactNumber: undefined });
                          }}
                          className={cn("bg-slate-700 border-slate-600 text-white", errors.contactNumber && "border-destructive")}
                        />
                        {errors.contactNumber && <p className="text-sm text-destructive">{errors.contactNumber}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-white">Work Email <span className="text-destructive">*</span></Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="employer@company.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (errors.email) setErrors({ ...errors, email: undefined });
                          }}
                          className={cn("bg-slate-700 border-slate-600 text-white", errors.email && "border-destructive")}
                        />
                        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                      </div>
                    </div>

                    {/* Location Fields */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="state" className="text-white">State <span className="text-destructive">*</span></Label>
                        <Select value={state} onValueChange={(value) => {
                          setState(value);
                          setDistrict("");
                          setTownCity("");
                          if (errors.state) setErrors({ ...errors, state: undefined });
                        }}>
                          <SelectTrigger className={cn("bg-slate-700 border-slate-600 text-white", errors.state && "border-destructive")}>
                            <SelectValue placeholder="Select state" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {states.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.state && <p className="text-sm text-destructive">{errors.state}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="district" className="text-white">District <span className="text-destructive">*</span></Label>
                        <Select value={district} onValueChange={(value) => {
                          setDistrict(value);
                          setTownCity("");
                          if (errors.district) setErrors({ ...errors, district: undefined });
                        }} disabled={!state}>
                          <SelectTrigger className={cn("bg-slate-700 border-slate-600 text-white", errors.district && "border-destructive", !state && "opacity-50")}>
                            <SelectValue placeholder={state ? "Select district" : "Select state first"} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {districts.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.district && <p className="text-sm text-destructive">{errors.district}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="townCity" className="text-white">Town/City <span className="text-destructive">*</span></Label>
                        <Select value={townCity} onValueChange={(value) => {
                          setTownCity(value);
                          if (errors.townCity) setErrors({ ...errors, townCity: undefined });
                        }} disabled={!district}>
                          <SelectTrigger className={cn("bg-slate-700 border-slate-600 text-white", errors.townCity && "border-destructive", !district && "opacity-50")}>
                            <SelectValue placeholder={district ? "Select town/city" : "Select district first"} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {towns.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.townCity && <p className="text-sm text-destructive">{errors.townCity}</p>}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-white">Password <span className="text-destructive">*</span></Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="Create a strong password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (errors.password) setErrors({ ...errors, password: undefined });
                          }}
                          className={cn("bg-slate-700 border-slate-600 text-white", errors.password && "border-destructive")}
                        />
                        <PasswordStrengthIndicator password={password} />
                        {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-white">Confirm Password <span className="text-destructive">*</span></Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Confirm your password"
                          value={confirmPassword}
                          onChange={(e) => {
                            setConfirmPassword(e.target.value);
                            if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                          }}
                          className={cn("bg-slate-700 border-slate-600 text-white", errors.confirmPassword && "border-destructive")}
                        />
                        {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                      </div>
                    </div>

                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" size="lg" disabled={isLoading}>
                      {isLoading ? "Creating Account..." : "Create Employer Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Job Alert Section for Employers */}
          {selectedRole === "employer" && activeSection === "job-alert" && (
            <div>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Bell className="h-6 w-6 text-yellow-400" />
                  Job Alert
                </h1>
                <p className="text-slate-400">Manage your job postings, payments, and recruitment process</p>
              </div>

              {/* Step 1: Main navigation tabs */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Step 1: Select Category</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {jobAlertSubItems.map((subItem) => (
                    <Button
                      key={subItem.id}
                      variant="outline"
                      size="sm"
                      onClick={() => setJobAlertSubOption(subItem.id)}
                      className={cn(
                        "border-2 transition-all",
                        jobAlertSubOption === subItem.id 
                          ? "bg-yellow-500/20 border-yellow-500 text-yellow-400 hover:bg-yellow-500/30" 
                          : "border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500"
                      )}
                    >
                      <subItem.icon className="h-4 w-4 mr-2" />
                      {subItem.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Step 2: Sub-category tabs for Vacancies List */}
              {jobAlertSubOption === "vacancies-list" && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Step 2: Choose Method</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVacanciesSubOption("manual-job")}
                      className={cn(
                        "border-2 transition-all",
                        vacanciesSubOption === "manual-job" 
                          ? "bg-blue-500/20 border-blue-500 text-blue-400 hover:bg-blue-500/30" 
                          : "border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500"
                      )}
                    >
                      <Table className="h-4 w-4 mr-2" />
                      Manual Job Creation
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setVacanciesSubOption("ai-job")}
                      className={cn(
                        "border-2 transition-all",
                        vacanciesSubOption === "ai-job" 
                          ? "bg-blue-500/20 border-blue-500 text-blue-400 hover:bg-blue-500/30" 
                          : "border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500"
                      )}
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      AI Job Creation
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Sub-category tabs for Payment */}
              {jobAlertSubOption === "payment" && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Step 2: Choose Option</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentSubOption("tariffs")}
                      className={cn(
                        "border-2 transition-all",
                        paymentSubOption === "tariffs" 
                          ? "bg-blue-500/20 border-blue-500 text-blue-400 hover:bg-blue-500/30" 
                          : "border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500"
                      )}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Tariffs/Plans
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentSubOption("receipts")}
                      className={cn(
                        "border-2 transition-all",
                        paymentSubOption === "receipts" 
                          ? "bg-blue-500/20 border-blue-500 text-blue-400 hover:bg-blue-500/30" 
                          : "border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500"
                      )}
                    >
                      <Receipt className="h-4 w-4 mr-2" />
                      Payment Receipts
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaymentSubOption("confirmation")}
                      className={cn(
                        "border-2 transition-all",
                        paymentSubOption === "confirmation" 
                          ? "bg-blue-500/20 border-blue-500 text-blue-400 hover:bg-blue-500/30" 
                          : "border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500"
                      )}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmation
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Sub-category tabs for Advertisement */}
              {jobAlertSubOption === "advertisement" && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Step 2: Choose Option</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAdvertisementSubOption("flyers-videos")}
                      className={cn(
                        "border-2 transition-all",
                        advertisementSubOption === "flyers-videos" 
                          ? "bg-blue-500/20 border-blue-500 text-blue-400 hover:bg-blue-500/30" 
                          : "border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500"
                      )}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Flyers/Videos Creation
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Content Area */}
              <div className="mb-3">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  {jobAlertSubOption === "vacancies-list" ? "Step 3: Manage Jobs" : 
                   jobAlertSubOption === "payment" ? "Step 3: Payment Details" :
                   jobAlertSubOption === "advertisement" ? "Step 3: Create Materials" :
                   "Step 2: View Details"}
                </span>
              </div>

              {/* Vacancies List Content */}
              {jobAlertSubOption === "vacancies-list" && (
                <div className="space-y-6">
                  {/* Manual Job Creation */}
                  {vacanciesSubOption === "manual-job" && (
                    <Card className="bg-slate-800 border-slate-700">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Table className="h-5 w-5 text-blue-400" />
                            Manual Job Creation
                          </h3>
                          <Button 
                            size="sm" 
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => setShowAddJobForm(!showAddJobForm)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            {showAddJobForm ? "Cancel" : "Add New Job"}
                          </Button>
                        </div>
                        
                        {/* Add Job Form */}
                        {showAddJobForm && (
                          <div className="mb-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                            <h4 className="text-white font-medium mb-4">Add New Job</h4>
                            <div className="grid md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label className="text-white">Date</Label>
                                <Input 
                                  type="date"
                                  value={jobDate}
                                  onChange={(e) => setJobDate(e.target.value)}
                                  className="bg-slate-700 border-slate-600 text-white"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-white">City</Label>
                                <Input 
                                  placeholder="Enter city"
                                  value={jobCity}
                                  onChange={(e) => setJobCity(e.target.value)}
                                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-white">School Name</Label>
                                <Input 
                                  placeholder="Enter school name"
                                  value={schoolName}
                                  onChange={(e) => setSchoolName(e.target.value)}
                                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-white">Segment</Label>
                                <Select value={jobSegment} onValueChange={handleSegmentChange}>
                                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue placeholder="Select segment" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-700 border-slate-600">
                                    {segmentOptions.map((seg) => (
                                      <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-white">Department/Category</Label>
                                <Select 
                                  value={jobDepartment} 
                                  onValueChange={handleDepartmentChange}
                                  disabled={!jobSegment}
                                >
                                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue placeholder={jobSegment ? "Select department" : "Select segment first"} />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-700 border-slate-600">
                                    {availableDepartments.map((dept) => (
                                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-white">Designation</Label>
                                <Select 
                                  value={jobDesignation} 
                                  onValueChange={setJobDesignation}
                                  disabled={!jobDepartment}
                                >
                                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue placeholder={jobDepartment ? "Select designation" : "Select department first"} />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-700 border-slate-600">
                                    {availableDesignations.map((desig) => (
                                      <SelectItem key={desig} value={desig}>{desig}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-white">Salary (₹)</Label>
                                <Input 
                                  placeholder="e.g., 25000-35000"
                                  value={jobSalary}
                                  onChange={(e) => setJobSalary(e.target.value)}
                                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-white">Qualification</Label>
                                <Select value={jobQualification} onValueChange={setJobQualification}>
                                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue placeholder="Select qualification" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-700 border-slate-600">
                                    <SelectItem value="graduate">Graduate</SelectItem>
                                    <SelectItem value="post-graduate">Post Graduate</SelectItem>
                                    <SelectItem value="phd">PhD</SelectItem>
                                    <SelectItem value="bed">B.Ed</SelectItem>
                                    <SelectItem value="med">M.Ed</SelectItem>
                                    <SelectItem value="diploma">Diploma</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-white">Experience</Label>
                                <Select value={jobExperience} onValueChange={setJobExperience}>
                                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                    <SelectValue placeholder="Select experience" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-700 border-slate-600">
                                    <SelectItem value="fresher">Fresher</SelectItem>
                                    <SelectItem value="1-2">1-2 Years</SelectItem>
                                    <SelectItem value="2-5">2-5 Years</SelectItem>
                                    <SelectItem value="5-10">5-10 Years</SelectItem>
                                    <SelectItem value="10+">10+ Years</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button 
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={handleSaveJob}
                                disabled={isSavingJob}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                {isSavingJob ? "Saving..." : "Save Job"}
                              </Button>
                              <Button 
                                variant="outline" 
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                onClick={() => setShowAddJobForm(false)}
                                disabled={isSavingJob}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}
                        
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-700">
                                <th className="text-left py-3 px-2 text-slate-400 font-medium text-xs">Date</th>
                                <th className="text-left py-3 px-2 text-slate-400 font-medium text-xs">City</th>
                                <th className="text-left py-3 px-2 text-slate-400 font-medium text-xs">School Name</th>
                                <th className="text-left py-3 px-2 text-slate-400 font-medium text-xs">Segment</th>
                                <th className="text-left py-3 px-2 text-slate-400 font-medium text-xs">Department</th>
                                <th className="text-left py-3 px-2 text-slate-400 font-medium text-xs">Designation</th>
                                <th className="text-left py-3 px-2 text-slate-400 font-medium text-xs">Salary</th>
                                <th className="text-left py-3 px-2 text-slate-400 font-medium text-xs">Qualification</th>
                                <th className="text-left py-3 px-2 text-slate-400 font-medium text-xs">Experience</th>
                                <th className="text-left py-3 px-2 text-slate-400 font-medium text-xs">Status</th>
                                <th className="text-left py-3 px-2 text-slate-400 font-medium text-xs">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {savedJobs.length === 0 ? (
                                <tr>
                                  <td colSpan={11} className="py-8 text-center text-slate-400">
                                    No jobs created yet. Click "Add New Job" to create your first job posting.
                                  </td>
                                </tr>
                              ) : (
                                savedJobs.map((job) => (
                                  <tr key={job.id} className="border-b border-slate-700/50">
                                    <td className="py-3 px-2 text-slate-300 text-xs">{job.date || '-'}</td>
                                    <td className="py-3 px-2 text-slate-300 text-xs capitalize">{job.city}</td>
                                    <td className="py-3 px-2 text-slate-300 text-xs">{job.schoolName}</td>
                                    <td className="py-3 px-2 text-slate-300 text-xs capitalize">{job.segment || '-'}</td>
                                    <td className="py-3 px-2 text-slate-300 text-xs capitalize">{job.department || '-'}</td>
                                    <td className="py-3 px-2 text-white text-xs capitalize font-medium">{job.designation}</td>
                                    <td className="py-3 px-2 text-slate-300 text-xs">₹{job.salary || '-'}</td>
                                    <td className="py-3 px-2 text-slate-300 text-xs capitalize">{job.qualification || '-'}</td>
                                    <td className="py-3 px-2 text-slate-300 text-xs capitalize">{job.experience || '-'}</td>
                                    <td className="py-3 px-2">
                                      <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">{job.status}</span>
                                    </td>
                                    <td className="py-3 px-2">
                                      <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 text-xs">Edit</Button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                        <p className="text-slate-400 text-sm mt-4">Note: Complete registration to create and manage job postings.</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* AI Job Creation */}
                  {vacanciesSubOption === "ai-job" && (
                    <Card className="bg-slate-800 border-slate-700">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <Bot className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">AI Job Creation</h3>
                            <p className="text-slate-400 text-sm">Generate job descriptions with AI by selecting designation</p>
                          </div>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-white">Select Designation</Label>
                            <Select>
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                                <SelectValue placeholder="Choose a designation" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="software-engineer">Software Engineer</SelectItem>
                                <SelectItem value="product-manager">Product Manager</SelectItem>
                                <SelectItem value="data-analyst">Data Analyst</SelectItem>
                                <SelectItem value="hr-manager">HR Manager</SelectItem>
                                <SelectItem value="marketing-executive">Marketing Executive</SelectItem>
                                <SelectItem value="teacher">Teacher</SelectItem>
                                <SelectItem value="accountant">Accountant</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Job Description with AI
                          </Button>
                        </div>
                        <p className="text-slate-400 text-sm mt-4">Note: Complete registration to access AI job creation features.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Payment Content */}
              {jobAlertSubOption === "payment" && (
                <div className="space-y-6">
                  {paymentSubOption === "tariffs" && (
                    <div className="grid md:grid-cols-3 gap-4">
                      <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-6 text-center">
                          <h4 className="text-lg font-semibold text-white mb-2">Basic Plan</h4>
                          <div className="text-3xl font-bold text-green-400 mb-4">₹5,000<span className="text-sm text-slate-400">/month</span></div>
                          <ul className="text-slate-300 text-sm space-y-2 mb-4">
                            <li>• 5 Job Postings</li>
                            <li>• 50 CV Downloads</li>
                            <li>• Email Support</li>
                          </ul>
                          <Button className="w-full bg-green-600 hover:bg-green-700 text-white">Choose Plan</Button>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-800 border-yellow-500/50">
                        <CardContent className="p-6 text-center">
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Popular</span>
                          <h4 className="text-lg font-semibold text-white mb-2 mt-2">Pro Plan</h4>
                          <div className="text-3xl font-bold text-yellow-400 mb-4">₹15,000<span className="text-sm text-slate-400">/month</span></div>
                          <ul className="text-slate-300 text-sm space-y-2 mb-4">
                            <li>• 20 Job Postings</li>
                            <li>• 200 CV Downloads</li>
                            <li>• Priority Support</li>
                          </ul>
                          <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white">Choose Plan</Button>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-800 border-slate-700">
                        <CardContent className="p-6 text-center">
                          <h4 className="text-lg font-semibold text-white mb-2">Enterprise</h4>
                          <div className="text-3xl font-bold text-purple-400 mb-4">Custom</div>
                          <ul className="text-slate-300 text-sm space-y-2 mb-4">
                            <li>• Unlimited Postings</li>
                            <li>• Unlimited Downloads</li>
                            <li>• Dedicated Support</li>
                          </ul>
                          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">Contact Us</Button>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {paymentSubOption === "receipts" && (
                    <Card className="bg-slate-800 border-slate-700">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <Receipt className="h-5 w-5 text-blue-400" />
                          Payment Receipts
                        </h3>
                        <p className="text-slate-400">No payment receipts available. Complete registration to view payment history.</p>
                      </CardContent>
                    </Card>
                  )}

                  {paymentSubOption === "confirmation" && (
                    <Card className="bg-slate-800 border-slate-700">
                      <CardContent className="p-6">
                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-green-400" />
                          Payment Confirmation
                        </h3>
                        <p className="text-slate-400">No pending confirmations. Complete registration and subscribe to a plan.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Advertisement Content */}
              {jobAlertSubOption === "advertisement" && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Megaphone className="h-5 w-5 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Flyers & Videos Creation</h3>
                        <p className="text-slate-400 text-sm">Create and download promotional materials</p>
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <Card className="bg-slate-700/50 border-slate-600">
                        <CardContent className="p-4 text-center">
                          <FileText className="h-12 w-12 text-blue-400 mx-auto mb-3" />
                          <h4 className="text-white font-medium mb-2">Job Flyers</h4>
                          <p className="text-slate-400 text-sm mb-3">Generate professional job flyers for social media</p>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Download className="h-4 w-4 mr-2" />
                            Create Flyer
                          </Button>
                        </CardContent>
                      </Card>
                      <Card className="bg-slate-700/50 border-slate-600">
                        <CardContent className="p-4 text-center">
                          <Video className="h-12 w-12 text-purple-400 mx-auto mb-3" />
                          <h4 className="text-white font-medium mb-2">Promo Videos</h4>
                          <p className="text-slate-400 text-sm mb-3">Create video content for job promotions</p>
                          <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
                            <Download className="h-4 w-4 mr-2" />
                            Create Video
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                    <p className="text-slate-400 text-sm mt-4">Note: Complete registration to create and download materials.</p>
                  </CardContent>
                </Card>
              )}

              {/* Get DATA/CVs Content */}
              {jobAlertSubOption === "get-data-cvs" && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <Database className="h-5 w-5 text-cyan-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Get DATA/CVs</h3>
                        <p className="text-slate-400 text-sm">Access and download candidate CVs and data</p>
                      </div>
                    </div>
                    <p className="text-slate-400">Complete registration and subscribe to a plan to access candidate data and CVs.</p>
                  </CardContent>
                </Card>
              )}

              {/* CV Dashboard Content */}
              {jobAlertSubOption === "cv-dashboard" && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                        <Monitor className="h-5 w-5 text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">CV Dashboard</h3>
                        <p className="text-slate-400 text-sm">Manage and track downloaded CVs</p>
                      </div>
                    </div>
                    <p className="text-slate-400">Complete registration to access your CV dashboard.</p>
                  </CardContent>
                </Card>
              )}

              {/* Interview Process Content */}
              {jobAlertSubOption === "interview-process" && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-teal-500/20 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-teal-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Interview Process</h3>
                        <p className="text-slate-400 text-sm">Manage candidate interviews and scheduling</p>
                      </div>
                    </div>
                    <p className="text-slate-400">Complete registration to manage your interview pipeline.</p>
                  </CardContent>
                </Card>
              )}

              {/* Feedback Report Content */}
              {jobAlertSubOption === "feedback-report" && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-pink-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Feedback Report</h3>
                        <p className="text-slate-400 text-sm">View and manage interview feedback</p>
                      </div>
                    </div>
                    <p className="text-slate-400">Complete registration to access feedback reports.</p>
                  </CardContent>
                </Card>
              )}

              {/* Offer Letter Content */}
              {jobAlertSubOption === "offer-letter" && (
                <Card className="bg-slate-800 border-slate-700">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Award className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Offer Letter</h3>
                        <p className="text-slate-400 text-sm">Generate and manage offer letters</p>
                      </div>
                    </div>
                    <p className="text-slate-400">Complete registration to create and send offer letters.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Client Dashboard Content */}
          {selectedRole === "employer" && activeSection === "dashboard" && (
            <div className="space-y-6">
              {/* Interview Tracker Header */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <Activity className="h-6 w-6 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-white">Interview Tracker</h2>
                      <p className="text-slate-400 text-sm">Track and manage all interview activities</p>
                    </div>
                  </div>

                  {/* Stats Overview */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-2">
                        <Clock className="h-5 w-5 text-yellow-400" />
                      </div>
                      <p className="text-2xl font-bold text-white">0</p>
                      <p className="text-slate-400 text-xs">Pending</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                        <Calendar className="h-5 w-5 text-blue-400" />
                      </div>
                      <p className="text-2xl font-bold text-white">0</p>
                      <p className="text-slate-400 text-xs">Scheduled</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                        <UserCheck className="h-5 w-5 text-green-400" />
                      </div>
                      <p className="text-2xl font-bold text-white">0</p>
                      <p className="text-slate-400 text-xs">Completed</p>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-4 text-center">
                      <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-2">
                        <XCircle className="h-5 w-5 text-red-400" />
                      </div>
                      <p className="text-2xl font-bold text-white">0</p>
                      <p className="text-slate-400 text-xs">Cancelled</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Interview List */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-blue-400" />
                    Recent Interviews
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-700">
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">Candidate</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">Position</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">Date & Time</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">Stage</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                          <th className="text-left py-3 px-4 text-slate-400 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400">
                            <div className="flex flex-col items-center gap-2">
                              <Calendar className="h-12 w-12 text-slate-600" />
                              <p>No interviews scheduled yet</p>
                              <p className="text-sm">Complete registration to start scheduling interviews</p>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white h-auto py-4 flex flex-col gap-2">
                      <Calendar className="h-5 w-5" />
                      Schedule Interview
                    </Button>
                    <Button className="bg-green-600 hover:bg-green-700 text-white h-auto py-4 flex flex-col gap-2">
                      <UserCheck className="h-5 w-5" />
                      View Candidates
                    </Button>
                    <Button className="bg-purple-600 hover:bg-purple-700 text-white h-auto py-4 flex flex-col gap-2">
                      <FileText className="h-5 w-5" />
                      Generate Report
                    </Button>
                  </div>
                  <p className="text-slate-400 text-sm mt-4">Note: Complete registration to access these features.</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SignupPortal;