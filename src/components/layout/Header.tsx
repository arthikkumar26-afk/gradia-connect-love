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
import { learningCategories } from "@/data/learningCategories";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

  // Restructured Candidates menu - public items only
  const candidateMenuItems = [
    { name: "Register / Login", path: "/candidate/login", public: true },
    { name: "Browse Jobs", path: "/jobs", public: true },
    { name: "Software Jobs", path: "/jobs/software", public: true },
    { name: "Education Jobs", path: "/jobs/education", public: true },
    { name: "Resume Builder", path: "/candidate/resume-builder", public: true, badge: "Save requires login" },
    { name: "Interview Prep", path: "/candidate/interview-prep", public: true },
    { name: "Career Coaching", path: "/candidate/coaching", public: true },
  ];

  const publicEmployerPages = [
    { name: "Register", path: "/employer/signup" },
    { name: "Login", path: "/employer/login" },
    { name: "Post a Job", path: "/employer/post-job", protected: true },
    { name: "Pricing", path: "/employer/pricing" },
    { name: "Request Demo", path: "/employer/demo" },
  ];

  const authenticatedEmployerPages = [
    { name: "Dashboard", path: "/employer/dashboard", icon: LayoutDashboard },
    { name: "Placements", path: "/employer/dashboard?tab=placements", icon: Briefcase },
    { name: "Talent Pool", path: "/employer/dashboard?tab=talent-pool", icon: Users },
    { name: "Settings", path: "/employer/settings", icon: SettingsIcon },
  ];

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

            {/* Candidates Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center text-sm font-medium text-foreground hover:text-accent transition-colors">
                Candidates
                <ChevronDown className="ml-1 h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-background z-50">
                {candidateMenuItems.map((item) => (
                  <DropdownMenuItem key={item.path} asChild>
                    <Link to={item.path} className="flex items-center justify-between">
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className="text-xs text-muted-foreground ml-2">*</span>
                      )}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Learning Dropdown - Multi-column */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center text-sm font-medium text-foreground hover:text-accent transition-colors">
                Learning
                <ChevronDown className="ml-1 h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[800px] p-6 bg-background z-50" align="start">
                <div className="grid grid-cols-4 gap-6">
                  {learningCategories.map((category) => (
                    <div key={category.name}>
                      <h3 className="font-semibold text-sm text-foreground mb-3 flex items-center gap-2">
                        <span>{category.icon}</span>
                        {category.name}
                      </h3>
                      <div className="flex flex-col space-y-2">
                        {category.subcategories.map((sub) => (
                          <Link
                            key={sub.name}
                            to={sub.path}
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors group"
                          >
                            <div className="flex items-start gap-1">
                              <span className="flex-1">{sub.name}</span>
                              <span className="text-xs opacity-60">{sub.count}</span>
                            </div>
                          </Link>
                        ))}
                        <Link
                          to={category.subcategories[0]?.path || "/learning"}
                          className="text-xs text-accent hover:text-accent/80 transition-colors mt-1"
                        >
                          View All →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
                <DropdownMenuSeparator className="my-4" />
                <div className="flex justify-center">
                  <Button asChild variant="default" className="w-full max-w-md">
                    <Link to="/learning/all-categories">
                      View All Categories of Learning
                    </Link>
                  </Button>
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
                {/* Candidates Section */}
                <div className="px-3 py-2">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Candidates
                  </div>
                  {candidateMenuItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className="block px-2 py-1 text-sm text-foreground hover:text-accent transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {item.name}
                      {item.badge && <span className="text-xs text-muted-foreground ml-2">*</span>}
                    </Link>
                  ))}
                </div>

                {/* Learning Section - Accordion style */}
                <div className="px-3 py-2">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Learning
                  </div>
                  {learningCategories.map((category) => (
                    <Collapsible key={category.name} className="mb-2">
                      <CollapsibleTrigger className="flex items-center justify-between w-full px-2 py-1 text-sm font-medium text-foreground hover:text-accent transition-colors">
                        <span className="flex items-center gap-2">
                          <span>{category.icon}</span>
                          {category.name}
                        </span>
                        <ChevronDown className="h-3 w-3" />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pl-4 mt-1 space-y-1">
                        {category.subcategories.map((sub) => (
                          <Link
                            key={sub.name}
                            to={sub.path}
                            className="block px-2 py-1 text-xs text-muted-foreground hover:text-accent transition-colors"
                            onClick={() => setIsMenuOpen(false)}
                          >
                            {sub.name} ({sub.count})
                          </Link>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                  <Button asChild variant="default" size="sm" className="w-full mt-3">
                    <Link to="/learning/all-categories" onClick={() => setIsMenuOpen(false)}>
                      View All Categories
                    </Link>
                  </Button>
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