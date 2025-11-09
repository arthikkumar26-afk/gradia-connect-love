import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import gradiaLogo from "@/assets/gradia-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Menu,
  X,
  Sun,
  Moon,
  Globe,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Briefcase,
  Users,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
  };

  const handleProtectedNavigation = (path: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to continue.",
        variant: "destructive",
      });
      navigate("/employer/login", { state: { from: path } });
      return;
    }
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  const candidatePages = [
    { name: "Browse Jobs", path: "/jobs" },
    { name: "Software Jobs", path: "/jobs/software" },
    { name: "Education Jobs", path: "/jobs/education" },
    { name: "Dashboard", path: "/candidate/dashboard" },
    { name: "Resume Builder", path: "/candidate/resume-builder" },
    { name: "Interview Prep", path: "/candidate/interview-prep" },
    { name: "Career Coaching", path: "/candidate/coaching" },
    { name: "Salary Insights", path: "/candidate/salary-insights" },
  ];

  const publicEmployerPages = [
    { name: "Register", path: "/employer/signup" },
    { name: "Login", path: "/employer/login" },
    { name: "Post a Job", path: "/employer/post-job", protected: true },
    { name: "Pricing", path: "/employer/pricing", protected: true },
    { name: "Request Demo", path: "/employer/demo", protected: true },
  ];

  const authenticatedEmployerPages = [
    { name: "Dashboard", path: "/employer/dashboard", icon: LayoutDashboard },
    { name: "Placements", path: "/employer/dashboard?tab=placements", icon: Briefcase },
    { name: "Talent Pool", path: "/employer/dashboard?tab=talent-pool", icon: Users },
    { name: "Settings", path: "/employer/settings", icon: SettingsIcon },
  ];

  const resourceCategories = {
    exploreCategories: [
      { name: "Unicorn", path: "/resources/unicorn" },
      { name: "MNC", path: "/resources/mnc" },
      { name: "Startup", path: "/resources/startup" },
      { name: "Product based", path: "/resources/product-based" },
      { name: "Internet", path: "/resources/internet" },
    ],
    exploreCollections: [
      { name: "Top companies", path: "/resources/top-companies" },
      { name: "IT companies", path: "/resources/it-companies" },
      { name: "Fintech companies", path: "/resources/fintech-companies" },
      { name: "Sponsored companies", path: "/resources/sponsored-companies" },
      { name: "Featured companies", path: "/resources/featured-companies" },
    ],
    researchCompanies: [
      { name: "Interview questions", path: "/resources/interview-questions" },
      { name: "Company salaries", path: "/resources/company-salaries" },
      { name: "Company reviews", path: "/resources/company-reviews" },
      { name: "Salary Calculator", path: "/resources/salary-calculator" },
    ],
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={gradiaLogo} 
              alt="Gradia - Your Next Step" 
              className="h-[65px] w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link
              to="/"
              className="text-sm font-medium text-foreground hover:text-accent transition-colors"
            >
              Home
            </Link>

            {/* For Employers Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center text-sm font-medium text-foreground hover:text-accent transition-colors">
                For Employers
                <ChevronDown className="ml-1 h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 bg-background z-50">
                {!isAuthenticated ? (
                  <>
                    {publicEmployerPages.map((page) => (
                      <DropdownMenuItem
                        key={page.path}
                        onClick={() => {
                          if (page.protected) {
                            handleProtectedNavigation(page.path);
                          } else {
                            navigate(page.path);
                          }
                        }}
                      >
                        {page.name}
                      </DropdownMenuItem>
                    ))}
                  </>
                ) : (
                  <>
                    {authenticatedEmployerPages.map((page) => {
                      const Icon = page.icon;
                      return (
                        <DropdownMenuItem key={page.path} asChild>
                          <Link to={page.path} className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {page.name}
                          </Link>
                        </DropdownMenuItem>
                      );
                    })}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 text-destructive">
                      <LogOut className="h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* For Candidates Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center text-sm font-medium text-foreground hover:text-accent transition-colors">
                For Candidates
                <ChevronDown className="ml-1 h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                {candidatePages.map((page) => (
                  <DropdownMenuItem key={page.path} asChild>
                    <Link to={page.path}>{page.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Resources Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center text-sm font-medium text-foreground hover:text-accent transition-colors">
                Resources
                <ChevronDown className="ml-1 h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[640px] p-6">
                <div className="grid grid-cols-3 gap-8">
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-3">
                      Explore categories
                    </h3>
                    <div className="flex flex-col space-y-2">
                      {resourceCategories.exploreCategories.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-3">
                      Explore collections
                    </h3>
                    <div className="flex flex-col space-y-2">
                      {resourceCategories.exploreCollections.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground mb-3">
                      Research companies
                    </h3>
                    <div className="flex flex-col space-y-2">
                      {resourceCategories.researchCompanies.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              to="/about"
              className="text-sm font-medium text-foreground hover:text-accent transition-colors"
            >
              About
            </Link>
            <Link
              to="/contact"
              className="text-sm font-medium text-foreground hover:text-accent transition-colors"
            >
              Contact
            </Link>
          </nav>

          {/* Right side - Search, Theme toggle, Language, CTAs */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="hidden md:flex items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs, companies..."
                  className="pl-10 w-64"
                />
              </div>
            </div>

            {/* Theme Toggle */}
            <Button variant="ghost" size="sm" onClick={toggleTheme}>
              {isDark ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Globe className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>English</DropdownMenuItem>
                <DropdownMenuItem>Español</DropdownMenuItem>
                <DropdownMenuItem>Français</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* CTAs */}
            <div className="hidden lg:flex items-center space-x-3">
              <Button variant="outline" size="sm" asChild>
                <Link to="/candidate/apply">Apply Now</Link>
              </Button>
              <Button variant="default" size="sm" asChild>
                <Link to="/employer/login">Post Job</Link>
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border animate-slide-up">
            <div className="flex flex-col space-y-4">
              {/* Mobile Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs, companies..."
                  className="pl-10"
                />
              </div>

              {/* Mobile Navigation */}
              <div className="flex flex-col space-y-2">
                <Link
                  to="/"
                  className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent hover:bg-muted rounded-md transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Home
                </Link>
                <div className="px-3 py-2">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    For Employers
                  </div>
                  {!isAuthenticated ? (
                    <>
                      {publicEmployerPages.map((page) => (
                        <div
                          key={page.path}
                          className="block px-2 py-1 text-sm text-foreground hover:text-accent transition-colors cursor-pointer"
                          onClick={() => {
                            setIsMenuOpen(false);
                            if (page.protected) {
                              handleProtectedNavigation(page.path);
                            } else {
                              navigate(page.path);
                            }
                          }}
                        >
                          {page.name}
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {authenticatedEmployerPages.map((page) => {
                        const Icon = page.icon;
                        return (
                          <Link
                            key={page.path}
                            to={page.path}
                            className="flex items-center gap-2 px-2 py-1 text-sm text-foreground hover:text-accent transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            <Icon className="h-4 w-4" />
                            {page.name}
                          </Link>
                        );
                      })}
                      <div
                        className="flex items-center gap-2 px-2 py-1 text-sm text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleLogout();
                        }}
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </div>
                    </>
                  )}
                </div>
                <div className="px-3 py-2">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    For Candidates
                  </div>
                  {candidatePages.map((page) => (
                    <Link
                      key={page.path}
                      to={page.path}
                      className="block px-2 py-1 text-sm text-foreground hover:text-accent transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {page.name}
                    </Link>
                  ))}
                </div>
                <div className="px-3 py-2">
                  <div className="text-sm font-semibold text-foreground mb-2">
                    Explore categories
                  </div>
                  {resourceCategories.exploreCategories.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="block px-2 py-1 text-sm text-muted-foreground hover:text-accent transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="px-3 py-2">
                  <div className="text-sm font-semibold text-foreground mb-2">
                    Explore collections
                  </div>
                  {resourceCategories.exploreCollections.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="block px-2 py-1 text-sm text-muted-foreground hover:text-accent transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="px-3 py-2">
                  <div className="text-sm font-semibold text-foreground mb-2">
                    Research companies
                  </div>
                  {resourceCategories.researchCompanies.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="block px-2 py-1 text-sm text-muted-foreground hover:text-accent transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <Link
                  to="/about"
                  className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent hover:bg-muted rounded-md transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  About
                </Link>
                <Link
                  to="/contact"
                  className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent hover:bg-muted rounded-md transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Contact
                </Link>
              </div>

              {/* Mobile CTAs */}
              <div className="flex flex-col space-y-2 px-3">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/candidate/apply" onClick={() => setIsMenuOpen(false)}>
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
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;