import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Search,
  Menu,
  X,
  Sun,
  Moon,
  Globe,
  ChevronDown,
} from "lucide-react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle("dark");
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

  const employerPages = [
    { name: "Post a Job", path: "/employer/post-job" },
    { name: "Dashboard", path: "/employer/dashboard" },
    { name: "Campus Hiring", path: "/employer/campus-hiring" },
    { name: "Partnerships", path: "/employer/partnerships" },
    { name: "Pricing", path: "/employer/pricing" },
    { name: "Case Studies", path: "/employer/case-studies" },
    { name: "Request Demo", path: "/employer/demo" },
  ];

  const resourceCategories = {
    exploreCategories: [
      { name: "Cybersecurity", path: "/resources/cybersecurity" },
      { name: "Web Development", path: "/resources/web-development" },
      { name: "Mobile App Development", path: "/resources/mobile-development" },
      { name: "DevOps", path: "/resources/devops" },
      { name: "AI & Automation", path: "/resources/ai-automation" },
      { name: "SaaS Products", path: "/resources/saas" },
    ],
    exploreCollections: [
      { name: "Top IT Companies", path: "/companies/top-it" },
      { name: "Cybersecurity Companies", path: "/companies/cybersecurity" },
      { name: "Product-Based Companies", path: "/companies/product-based" },
      { name: "Startup Companies", path: "/companies/startups" },
      { name: "Featured Tech Companies", path: "/companies/featured" },
      { name: "Partnered Companies", path: "/companies/partners" },
    ],
    researchTools: [
      { name: "Interview Questions", path: "/resources/interview-questions" },
      { name: "Salary Insights", path: "/resources/salary-insights" },
      { name: "Company Reviews", path: "/resources/reviews" },
      { name: "Skill Assessment Tests", path: "/resources/assessments" },
      { name: "Career Guides", path: "/resources/career-guides" },
      { name: "Salary Calculator", path: "/resources/salary-calculator" },
    ],
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-lg">G</span>
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-xl text-foreground">
                Gradia
              </span>
              <span className="text-xs text-muted-foreground font-medium -mt-1">
                Your next move
              </span>
            </div>
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
              <DropdownMenuContent className="w-48">
                {employerPages.map((page) => (
                  <DropdownMenuItem key={page.path} asChild>
                    <Link to={page.path}>{page.name}</Link>
                  </DropdownMenuItem>
                ))}
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

            {/* Resources Mega Menu */}
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="text-sm font-medium bg-transparent hover:bg-transparent data-[state=open]:bg-transparent">
                    Resources
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div className="w-[800px] p-6 bg-background">
                      <div className="grid grid-cols-3 gap-8">
                        {/* Explore Categories */}
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-4">
                            Explore Categories
                          </h3>
                          <ul className="space-y-3">
                            {resourceCategories.exploreCategories.map((item) => (
                              <li key={item.path}>
                                <NavigationMenuLink asChild>
                                  <Link
                                    to={item.path}
                                    className="block text-sm text-muted-foreground hover:text-accent transition-colors"
                                  >
                                    {item.name}
                                  </Link>
                                </NavigationMenuLink>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Explore Collections */}
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-4">
                            Explore Collections
                          </h3>
                          <ul className="space-y-3">
                            {resourceCategories.exploreCollections.map((item) => (
                              <li key={item.path}>
                                <NavigationMenuLink asChild>
                                  <Link
                                    to={item.path}
                                    className="block text-sm text-muted-foreground hover:text-accent transition-colors"
                                  >
                                    {item.name}
                                  </Link>
                                </NavigationMenuLink>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Research & Tools */}
                        <div>
                          <h3 className="text-sm font-semibold text-foreground mb-4">
                            Research & Tools
                          </h3>
                          <ul className="space-y-3">
                            {resourceCategories.researchTools.map((item) => (
                              <li key={item.path}>
                                <NavigationMenuLink asChild>
                                  <Link
                                    to={item.path}
                                    className="block text-sm text-muted-foreground hover:text-accent transition-colors"
                                  >
                                    {item.name}
                                  </Link>
                                </NavigationMenuLink>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

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
                  {employerPages.map((page) => (
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
                  <div className="text-sm font-semibold text-foreground mb-3">
                    Explore Categories
                  </div>
                  {resourceCategories.exploreCategories.map((page) => (
                    <Link
                      key={page.path}
                      to={page.path}
                      className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-accent transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {page.name}
                    </Link>
                  ))}
                </div>
                <div className="px-3 py-2">
                  <div className="text-sm font-semibold text-foreground mb-3">
                    Explore Collections
                  </div>
                  {resourceCategories.exploreCollections.map((page) => (
                    <Link
                      key={page.path}
                      to={page.path}
                      className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-accent transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {page.name}
                    </Link>
                  ))}
                </div>
                <div className="px-3 py-2">
                  <div className="text-sm font-semibold text-foreground mb-3">
                    Research & Tools
                  </div>
                  {resourceCategories.researchTools.map((page) => (
                    <Link
                      key={page.path}
                      to={page.path}
                      className="block px-2 py-1.5 text-sm text-muted-foreground hover:text-accent transition-colors"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {page.name}
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