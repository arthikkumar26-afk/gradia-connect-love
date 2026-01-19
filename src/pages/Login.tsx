import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Briefcase, User, Building2 } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { profile, isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Redirect based on role when authenticated
  useEffect(() => {
    if (isAuthenticated && profile) {
      redirectBasedOnRole(profile.role);
    }
  }, [isAuthenticated, profile]);

  const redirectBasedOnRole = (role: string) => {
    switch (role) {
      case "candidate":
        navigate("/candidate/dashboard", { replace: true });
        break;
      case "employer":
        navigate("/employer/dashboard", { replace: true });
        break;
      case "sponsor":
        navigate("/sponsor/dashboard", { replace: true });
        break;
      case "admin":
        navigate("/admin/dashboard", { replace: true });
        break;
      case "owner":
        navigate("/owner/dashboard", { replace: true });
        break;
      default:
        navigate("/", { replace: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Login Successful",
        description: "Redirecting to your dashboard...",
      });
      // Redirect will happen via useEffect when profile loads
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-subtle px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back to Home Link */}
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-accent transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        {/* Login Card */}
        <div className="bg-card rounded-lg shadow-large p-8 animate-scale-in">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src={gradiaLogo} 
              alt="Gradia - Your Next Step" 
              className="h-20 w-auto object-contain"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome Back
            </h1>
            <p className="text-muted-foreground">
              Sign in to access your account
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-accent hover:text-accent-hover transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label
                htmlFor="remember"
                className="text-sm text-muted-foreground cursor-pointer"
              >
                Remember me for 30 days
              </Label>
            </div>

            {/* Submit Button */}
            <Button type="submit" variant="cta" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-4 text-muted-foreground">
                New to Gradia?
              </span>
            </div>
          </div>

          {/* Sign Up Options */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center mb-4">
              Create an account as:
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" size="lg" className="w-full" asChild>
                <Link to="/candidate/signup" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Candidate
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="w-full" asChild>
                <Link to="/employer/signup" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Employer
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Role-specific login links */}
        <div className="mt-6 text-center text-sm text-muted-foreground space-y-2">
          <p>
            <Link to="/sponsor/login" className="text-accent hover:text-accent-hover transition-colors">
              Sponsor Login
            </Link>
            {" · "}
            <Link to="/admin/login" className="text-accent hover:text-accent-hover transition-colors">
              Admin Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;