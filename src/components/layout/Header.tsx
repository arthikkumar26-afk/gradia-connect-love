import { useState, useEffect } from "react";
// QR Code header integration
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import gradiaLogo from "@/assets/gradia-logo.png";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Search, Menu, X, Sun, Moon, ChevronDown, LogOut, LayoutDashboard, Briefcase, Users, Settings as SettingsIcon, User, ShieldCheck, Crown, Handshake, Award, FileText, Send, Building2, BookOpen, Star, MessageSquare, Palette, Package, Calendar, HelpCircle, ExternalLink } from "lucide-react";
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
  const userRole = profile?.role; // 'employer' or 'candidate'

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
  const handleLogout = () => {
    logout();
    navigate("/");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out."
    });
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
  return <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center">
          {/* Logo - Fixed width for balance */}
          <Link to="/" className="flex items-center flex-shrink-0 w-48">
            <img alt="Gradia - Your Next Step" className="h-[65px] w-auto object-contain" src="/lovable-uploads/ece65d52-e11a-4a4d-9e10-3e499e3fe3ab.png" />
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

            <Link to="/about" className="text-sm font-medium text-foreground hover:text-accent transition-colors">
              About
            </Link>
            <Link to="/contact" className="text-sm font-medium text-foreground hover:text-accent transition-colors">
              Contact
            </Link>
          </nav>

          {/* Right side - Theme toggle, Language, CTAs - Fixed width for balance */}
          <div className="flex items-center justify-end space-x-4 w-48">
            {/* Theme Toggle */}
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* QR Code Button */}
            <SignupQRButton variant="icon" />

            {/* Sign Up Dropdown - Only show when not authenticated */}
            {!isAuthenticated && <div className="hidden lg:flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <User className="h-4 w-4" />
                      Sign Up
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-background z-50" align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/candidate/signup" className="flex items-center gap-3 py-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900">
                          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium">Candidate Sign Up</div>
                          <div className="text-xs text-muted-foreground">Job seekers & applicants</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/employer/signup" className="flex items-center gap-3 py-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900">
                          <Briefcase className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <div className="font-medium">Employer Sign Up</div>
                          <div className="text-xs text-muted-foreground">Post jobs & hire talent</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>}

            {/* Login Dropdown - Only show when not authenticated */}
            {!isAuthenticated && <div className="hidden lg:flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="sm" className="gap-2">
                      Login
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-background z-50" align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/candidate/login" className="flex items-center gap-3 py-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900">
                          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="font-medium">Candidate Login</div>
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
                          <div className="font-medium">Employer Login</div>
                          <div className="text-xs text-muted-foreground">Post jobs & hire talent</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/admin/login" className="flex items-center gap-3 py-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900">
                          <ShieldCheck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <div className="font-medium">Admin Login</div>
                          <div className="text-xs text-muted-foreground">Platform management</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/owner/login" className="flex items-center gap-3 py-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900">
                          <Crown className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <div className="font-medium">Owner Login</div>
                          <div className="text-xs text-muted-foreground">Full system access</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>}

            {/* User Menu - Only show when authenticated */}
            {isAuthenticated && <div className="hidden lg:flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="default" size="sm" className="gap-2">
                      <User className="h-4 w-4" />
                      {userRole === 'admin' ? 'Admin' : 
                       userRole === 'owner' ? 'Owner' : 
                       userRole === 'employer' ? (companyName || profile?.company_name || profile?.full_name?.split(' ')[0] || 'Account') :
                       profile?.full_name?.split(' ')[0] || 'Account'}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-background z-50" align="end">
                    <DropdownMenuItem asChild>
                      <Link to={
                        userRole === 'admin' ? '/admin/dashboard' : 
                        userRole === 'owner' ? '/owner/dashboard' : 
                        userRole === 'employer' ? '/employer/dashboard' : 
                        userRole === 'sponsor' ? '/sponsor/dashboard' :
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
                </DropdownMenu>
              </div>}

            {/* Mobile Menu Button */}
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && <div className="lg:hidden fixed inset-x-0 top-16 bottom-0 bg-background border-t border-border overflow-y-auto z-[70]">
            <div className="flex flex-col space-y-4 pb-20 pt-4 container mx-auto px-4">
              {/* Mobile Navigation */}
              <div className="flex flex-col space-y-2">
                <Link to="/" className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent hover:bg-muted rounded-md transition-colors" onClick={() => setIsMenuOpen(false)}>
                  Home
                </Link>
                
                {/* Mobile - Employers Section */}
                {userRole !== 'candidate' && <div className="px-3 py-2">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Employers
                    </div>
                    {!isAuthenticated || userRole !== 'employer' ? <>
                        {publicEmployerPages.map(page => <div key={page.path} className="block px-2 py-1 text-sm text-foreground hover:text-accent transition-colors cursor-pointer" onClick={() => {
                  setIsMenuOpen(false);
                  if (page.protected) {
                    handleProtectedNavigation(page.path);
                  } else {
                    navigate(page.path);
                  }
                }}>
                            {page.name}
                          </div>)}
                      </> : <>
                        {authenticatedEmployerPages.map(page => {
                  const Icon = page.icon;
                  return <Link key={page.path} to={page.path} className="flex items-center gap-2 px-2 py-1 text-sm text-foreground hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                              <Icon className="h-4 w-4" />
                              {page.name}
                            </Link>;
                })}
                        <div className="flex items-center gap-2 px-2 py-1 text-sm text-destructive hover:text-destructive/80 transition-colors cursor-pointer" onClick={() => {
                  setIsMenuOpen(false);
                  handleLogout();
                }}>
                          <LogOut className="h-4 w-4" />
                          Logout
                        </div>
                      </>}
                  </div>}
                
                {/* Mobile - Candidates Section */}
                {userRole !== 'employer' && <div className="px-3 py-2">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Candidates
                    </div>
                    {candidateMenuItems.map(item => <Link key={item.path} to={item.path} className="block px-2 py-1 text-sm text-foreground hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                        {item.name}
                        {item.badge && <span className="text-xs text-muted-foreground ml-2">*</span>}
                      </Link>)}
                    {isAuthenticated && userRole === 'candidate' && <div className="flex items-center gap-2 px-2 py-1 text-sm text-destructive hover:text-destructive/80 transition-colors cursor-pointer" onClick={() => {
                setIsMenuOpen(false);
                handleLogout();
              }}>
                        <LogOut className="h-4 w-4" />
                        Logout
                      </div>}
                  </div>}

                {/* Learning Section - Accordion style */}
                <div className="px-3 py-2">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Training
                  </div>
                  {learningCategories.map(category => <Collapsible key={category.name} className="mb-2">
                      <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1 text-sm font-medium text-foreground hover:text-accent transition-colors">
                        <span className="flex items-center gap-2">
                          <span>{category.icon}</span>
                          {category.name}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4 mt-1 space-y-1">
                        {category.subcategories.map(sub => <Link key={sub.name} to={sub.path} className="block px-2 py-1 text-xs text-muted-foreground hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                            {sub.name} ({sub.count})
                          </Link>)}
                      </CollapsibleContent>
                    </Collapsible>)}
                  <Button asChild variant="default" size="sm" className="w-full mt-3">
                    <Link to="/learning/all-categories" onClick={() => setIsMenuOpen(false)}>
                      View All Categories
                    </Link>
                  </Button>
                </div>

                {/* Sponsors Section - Accordion style */}
                <div className="px-3 py-2">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Sponsors
                  </div>
                  
                  {/* Sign In Button - Prominent placement */}
                  <div className="mb-3">
                    <Button asChild variant="default" size="sm" className="w-full">
                      <Link to="/sponsor/login" className="flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                        <LogOut className="h-3 w-3" />
                        Sign In
                      </Link>
                    </Button>
                  </div>

                  {/* Sponsor Programs */}
                  <Collapsible className="mb-2">
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1 text-sm font-medium text-foreground hover:text-accent transition-colors">
                      <span className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Sponsor Programs
                      </span>
                      <ChevronDown className="h-3 w-3" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 mt-1 space-y-1">
                      <Link to="/sponsors/become-partner" className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <Handshake className="h-3 w-3" />
                        Become a Partner
                      </Link>
                      <Link to="/sponsors/tiers" className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <Award className="h-3 w-3" />
                        Sponsorship Tiers
                      </Link>
                      <Link to="/job-mela-calendar" className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <Calendar className="h-3 w-3" />
                        Job Mela Calendar
                      </Link>
                      <Link to="/sponsors/collaboration" className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <Users className="h-3 w-3" />
                        Collaboration Opportunities
                      </Link>
                      <Link to="/sponsors/submit-proposal" className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <Send className="h-3 w-3" />
                        Submit Partnership Proposal
                      </Link>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Our Clients & Partners */}
                  <Collapsible className="mb-2">
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1 text-sm font-medium text-foreground hover:text-accent transition-colors">
                      <span className="flex items-center gap-2">
                        <Handshake className="h-4 w-4" />
                        Our Clients & Partners
                      </span>
                      <ChevronDown className="h-3 w-3" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 mt-1 space-y-1">
                      <Link to="/featured-clients" className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <Star className="h-3 w-3" />
                        Featured Clients
                      </Link>
                      <Link to="/success-stories" className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <Award className="h-3 w-3" />
                        Success Stories
                      </Link>
                      <Link to="/sponsors/testimonials" className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <MessageSquare className="h-3 w-3" />
                        Partner Testimonials
                      </Link>
                    </CollapsibleContent>
                  </Collapsible>

                  {/* Resources for Sponsors */}
                  <Collapsible className="mb-2">
                    <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1 text-sm font-medium text-foreground hover:text-accent transition-colors">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Resources for Sponsors
                      </span>
                      <ChevronDown className="h-3 w-3" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 mt-1 space-y-1">
                      <Link to="/sponsors/branding-guidelines" className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <Palette className="h-3 w-3" />
                        Branding Guidelines
                      </Link>
                      <Link to="/sponsors/marketing-toolkit" className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <Package className="h-3 w-3" />
                        Marketing Toolkit
                      </Link>
                      <Link to="/sponsors/event-deck" className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <Calendar className="h-3 w-3" />
                        Event Sponsorship Deck
                      </Link>
                      <Link to="/sponsors/support-portal" className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground hover:text-accent transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <HelpCircle className="h-3 w-3" />
                        Sponsor Support Portal
                      </Link>
                    </CollapsibleContent>
                  </Collapsible>
                </div>

                <Link to="/about" className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent hover:bg-muted rounded-md transition-colors" onClick={() => setIsMenuOpen(false)}>
                  About
                </Link>
                <Link to="/contact" className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent hover:bg-muted rounded-md transition-colors" onClick={() => setIsMenuOpen(false)}>
                  Contact
                </Link>
              </div>

              {/* Mobile CTAs - Always visible */}
              <div className="flex flex-col space-y-2 px-3">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/candidate/login" onClick={() => setIsMenuOpen(false)}>
                    Apply Now
                  </Link>
                </Button>
                <Button variant="default" size="sm" asChild>
                  <Link to="/employer/login" onClick={() => setIsMenuOpen(false)}>
                    Post Job
                  </Link>
                </Button>
              </div>
            </div>
          </div>}
      </div>
    </header>;
};
export default Header;