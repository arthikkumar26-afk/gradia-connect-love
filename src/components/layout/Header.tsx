import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import gradiaLogo from "@/assets/gradia-logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  User,
  Settings,
  LogOut,
  LayoutDashboard,
  Briefcase,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const handlePostJob = () => {
    if (!isAuthenticated) {
      navigate('/employer/login', { state: { from: '/employer/post-job' } });
    } else {
      navigate('/employer/post-job');
    }
    setIsMenuOpen(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
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
          <nav className="hidden lg:flex items-center space-x-6">
            {isAuthenticated ? (
              <>
                <Link
                  to="/employer/dashboard"
                  className="text-sm font-medium text-foreground hover:text-accent transition-colors flex items-center gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
                <Link
                  to="/employer/dashboard?tab=placements"
                  className="text-sm font-medium text-foreground hover:text-accent transition-colors flex items-center gap-2"
                >
                  <Briefcase className="h-4 w-4" />
                  Placements
                </Link>
                <Link
                  to="/employer/dashboard?tab=talent-pool"
                  className="text-sm font-medium text-foreground hover:text-accent transition-colors flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Talent Pool
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/employer/pricing"
                  className="text-sm font-medium text-foreground hover:text-accent transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  to="/employer/demo"
                  className="text-sm font-medium text-foreground hover:text-accent transition-colors"
                >
                  Request Demo
                </Link>
              </>
            )}
          </nav>

          {/* Right side - CTAs or Profile */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user?.name || 'U')}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/employer/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/employer/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                {/* Public CTAs */}
                <div className="hidden lg:flex items-center space-x-3">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/employer/signup">Register</Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/employer/login">Login</Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={handlePostJob}>
                    Post a Job
                  </Button>
                </div>
              </>
            )}

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
              {isAuthenticated ? (
                <>
                  {/* Logged In Mobile Menu */}
                  <div className="flex flex-col space-y-2">
                    <Link
                      to="/employer/dashboard"
                      className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent hover:bg-muted rounded-md transition-colors flex items-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                    <Link
                      to="/employer/dashboard?tab=placements"
                      className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent hover:bg-muted rounded-md transition-colors flex items-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Briefcase className="h-4 w-4" />
                      Placements
                    </Link>
                    <Link
                      to="/employer/dashboard?tab=talent-pool"
                      className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent hover:bg-muted rounded-md transition-colors flex items-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Users className="h-4 w-4" />
                      Talent Pool
                    </Link>
                    <div className="border-t border-border my-2"></div>
                    <Link
                      to="/employer/profile"
                      className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent hover:bg-muted rounded-md transition-colors flex items-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>
                    <Link
                      to="/employer/settings"
                      className="px-3 py-2 text-sm font-medium text-foreground hover:text-accent hover:bg-muted rounded-md transition-colors flex items-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="px-3 py-2 text-sm font-medium text-destructive hover:bg-muted rounded-md transition-colors flex items-center gap-2 w-full text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Public Mobile Menu */}
                  <div className="flex flex-col space-y-2 px-3">
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/employer/signup" onClick={() => setIsMenuOpen(false)}>
                        Register
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/employer/login" onClick={() => setIsMenuOpen(false)}>
                        Login
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handlePostJob}>
                      Post a Job
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/employer/pricing" onClick={() => setIsMenuOpen(false)}>
                        Pricing
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/employer/demo" onClick={() => setIsMenuOpen(false)}>
                        Request Demo
                      </Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;