import { useState, useEffect } from "react";
// QR Code header integration
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import gradiaLogo from "@/assets/gradia-logo.png";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Search, Menu, X, Sun, Moon, ChevronDown, LogOut, LayoutDashboard, Briefcase, Users, Settings as SettingsIcon, User, ShieldCheck, Crown, Handshake, Award, FileText, Send, Building2, BookOpen, Star, MessageSquare, Palette, Package, Calendar, HelpCircle, ExternalLink, GraduationCap } from "lucide-react";
import SignupQRButton from "./SignupQRButton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { learningCategories } from "@/data/learningCategories";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const {
    isAuthenticated,
    logout,
    profile,
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const userRole = profile?.role as string | undefined; // 'employer', 'candidate', 'freelancer', 'individual', etc.

  // Fetch company name for employers
  useEffect(() => {
    const fetchCompanyName = async () => {
      if (user?.id && userRole === 'employer') {
        const { data } = await supabase
          .from('employer_registrations')
          .select('company_name')
          .eq('employer_id', user.id)
          .single();
        
        if (data?.company_name) {
          setCompanyName(data.company_name);
        }
      }
    };
    
    fetchCompanyName();
  }, [user?.id, userRole]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);
  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };
  const handleProtectedNavigation = (path: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to continue.",
        variant: "destructive"
      });
      navigate("/employer/login", {
        state: {
          from: path
        }
      });
      return;
    }
    navigate(path);
  };
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      setCompanyName(null);
      navigate("/", { replace: true });
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out."
      });
    }
  };

  // Restructured Candidates menu - public items only
  const candidateMenuItems = [{
    name: "Register / Login",
    path: "/candidate/login",
    public: true
  }, {
    name: "Browse Jobs",
    path: "/jobs",
    public: true
  }, {
    name: "Software Jobs",
    path: "/jobs/software",
    public: true
  }, {
    name: "Education Jobs",
    path: "/jobs/education",
    public: true
  }, {
    name: "Resume Builder",
    path: "/candidate/resume-builder",
    public: true,
    badge: "Save requires login"
  }, {
    name: "Interview Prep",
    path: "/candidate/interview-prep",
    public: true
  }, {
    name: "Career Coaching",
    path: "/candidate/coaching",
    public: true
  }];
  const publicEmployerPages = [{
    name: "Register",
    path: "/employer/signup"
  }, {
    name: "Login",
    path: "/employer/login"
  }, {
    name: "Post a Job",
    path: "/employer/post-job",
    protected: true
  }, {
    name: "Pricing",
    path: "/employer/pricing"
  }, {
    name: "Request Demo",
    path: "/employer/demo"
  }];
  const authenticatedEmployerPages = [{
    name: "Dashboard",
    path: "/employer/dashboard",
    icon: LayoutDashboard
  }, {
    name: "Placements",
    path: "/employer/dashboard?tab=placements",
    icon: Briefcase
  }, {
    name: "Talent Pool",
    path: "/employer/dashboard?tab=talent-pool",
    icon: Users
  }, {
    name: "Settings",
    path: "/employer/settings",
    icon: SettingsIcon
  }];
  return <header className="sticky top-0 z-[999] w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <img alt="Gradia - Your Next Step" className="h-[40px] sm:h-[45px] lg:h-[65px] w-auto object-contain" src="/lovable-uploads/ece65d52-e11a-4a4d-9e10-3e499e3fe3ab.png" />
          </Link>

          {/* Desktop Navigation - Truly Centered */}
          <nav className="hidden lg:flex items-center justify-center flex-1 space-x-8">
            <Link to="/" className="text-sm font-medium text-foreground hover:text-accent transition-colors">
              Home
            </Link>

            <Link to="/candidate/login" className="text-sm font-medium text-foreground hover:text-accent transition-colors">
              Candidates
            </Link>

            <Link to="/employer/login" className="text-sm font-medium text-foreground hover:text-accent transition-colors">
              Employer
            </Link>

            {/* Freelancer & EduTech temporarily hidden */}


            <Link to="/pricing" className="text-sm font-medium text-foreground hover:text-accent transition-colors">
              Pricing
            </Link>
            <Link to="/about" className="text-sm font-medium text-foreground hover:text-accent transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-sm font-medium text-foreground hover:text-accent transition-colors">
              Contact
            </Link>
          </nav>

          {/* Right side - Theme toggle, Language, CTAs - Fixed width for balance */}
          <div className="flex items-center justify-end gap-1 sm:gap-2 lg:gap-4 flex-shrink-0 ml-auto">
            {/* Theme Toggle - hide on mobile */}
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="hidden sm:flex h-8 w-8">
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* QR Code Button - hide on mobile */}
            <div className="hidden sm:flex">
              <SignupQRButton variant="icon" />
            </div>

            {/* Sign Up Button */}
            {!isAuthenticated && <Button variant="outline" size="sm" className="gap-1.5 text-xs sm:text-sm h-8 px-2 sm:px-3" asChild>
                <Link to="/signup">
                  <User className="h-3.5 w-3.5" />
                  Sign Up
                </Link>
              </Button>}

            {/* Login Dropdown */}
            {!isAuthenticated && <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="sm" className="gap-1.5 text-xs sm:text-sm h-8 px-2 sm:px-3">
                      Login
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-background z-[1100]" align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/candidate/login" className="flex items-center gap-3 py-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900">
                          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">Candidate Login</div>
                          <div className="text-xs text-muted-foreground">Job seekers & applicants</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/employer/login" className="flex items-center gap-3 py-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900">
                          <Briefcase className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">Employer Login</div>
                          <div className="text-xs text-muted-foreground">Post jobs & hire talent</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/hr/login" className="flex items-center gap-3 py-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900">
                          <Users className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">HR Login</div>
                          <div className="text-xs text-muted-foreground">Manage candidates & interviews</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    {/* Freelancer & EduTech logins temporarily hidden */}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin/login" className="flex items-center gap-3 py-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900">
                          <ShieldCheck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">Admin Login</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/owner/login" className="flex items-center gap-3 py-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900">
                          <Crown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <div className="font-medium text-foreground">Owner Login</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>}

            {/* User Menu - show on all screens when authenticated */}
            {isAuthenticated && <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="sm" className="gap-1.5 text-xs sm:text-sm h-8 px-2 sm:px-3">
                      <User className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{userRole === 'admin' ? 'Admin' : 
                       userRole === 'owner' ? 'Owner' : 
                       userRole === 'employer' ? (companyName || profile?.company_name || profile?.full_name?.split(' ')[0] || 'Account') :
                       userRole === 'freelancer' ? 'Freelancer' :
                       profile?.full_name?.split(' ')[0] || 'Account'}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-background z-[1100]" align="end">
                    <DropdownMenuItem asChild>
                      <Link to={
                        userRole === 'admin' ? '/admin/dashboard' : 
                        userRole === 'owner' ? '/owner/dashboard' : 
                        userRole === 'employer' ? '/employer/dashboard' : 
                        userRole === 'hr' ? '/hr/dashboard' :
                        userRole === 'freelancer' ? '/freelancer/dashboard' :
                        '/candidate/dashboard'
                      } className="flex items-center gap-3 py-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="flex items-center gap-3 py-2 text-destructive cursor-pointer" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>}

          </div>
        </div>

      </div>

    </header>;
};
export default Header;