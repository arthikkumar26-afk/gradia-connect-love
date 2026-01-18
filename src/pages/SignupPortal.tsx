import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  User, Briefcase, UserPlus, LogIn, Bell, LayoutDashboard, 
  ArrowLeft, Users, Target, BarChart, Shield, ChevronRight,
  FileText, TrendingUp, Search, Menu
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

type UserRole = "candidate" | "employer" | null;
type SidebarOption = "registration" | "login" | "job-alert" | "dashboard";

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
}

const SignupPortal = () => {
  const navigate = useNavigate();
  const { isAuthenticated, profile } = useAuth();
  const { toast } = useToast();
  
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const [activeSection, setActiveSection] = useState<SidebarOption>("registration");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Employer form states
  const [companyName, setCompanyName] = useState("");
  const [companyCategory, setCompanyCategory] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

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
    { id: "registration" as SidebarOption, label: "Registration", icon: UserPlus },
    { id: "login" as SidebarOption, label: "Login", icon: LogIn },
    { id: "job-alert" as SidebarOption, label: "Job Alert", icon: Bell },
    { id: "dashboard" as SidebarOption, label: "Client Dashboard", icon: LayoutDashboard },
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
              onClick={() => setSelectedRole("candidate")}
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
                <Button className="mt-6 w-full bg-blue-600 hover:bg-blue-700" size="lg">
                  Continue as Candidate
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </CardContent>
            </Card>

            {/* Employer Option */}
            <Card 
              className="bg-slate-800/50 border-slate-700 hover:border-green-500 cursor-pointer transition-all hover:scale-105 hover:shadow-xl hover:shadow-green-500/10"
              onClick={() => setSelectedRole("employer")}
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
                <Button className="mt-6 w-full bg-green-600 hover:bg-green-700" size="lg">
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
        "bg-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col",
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
        <nav className="flex-1 p-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "login") {
                  navigate(selectedRole === "employer" ? "/employer/login" : "/candidate/login");
                } else if (item.id === "dashboard") {
                  toast({
                    title: "Login Required",
                    description: "Please complete registration first to access the dashboard",
                  });
                } else if (item.id === "job-alert") {
                  toast({
                    title: "Coming Soon",
                    description: "Job alerts feature will be available after registration",
                  });
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

          {selectedRole === "employer" && activeSection === "registration" && (
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

              {/* Registration Form Header */}
              <Card className="bg-slate-800 border-slate-700 mb-6">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-green-400" />
                    Registration
                  </h3>
                  <p className="text-slate-400 text-sm">Complete the form below to create your employer account and start hiring top talent.</p>
                </CardContent>
              </Card>

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

                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" size="lg" disabled={isLoading}>
                      {isLoading ? "Creating Account..." : "Create Employer Account"}
                    </Button>
                  </form>
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