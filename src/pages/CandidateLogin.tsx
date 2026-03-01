import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CandidateLogin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { profile, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated && profile) {
      if (profile.role === "candidate") {
        // Check for redirect URL (e.g., returning to job application)
        if (redirectUrl) {
          navigate(redirectUrl, { replace: true });
        } else {
          navigate("/candidate/dashboard", { replace: true });
        }
      } else {
        // Non-candidates should not use this login page - sign them out
        toast({
          title: "Wrong Account Type",
          description: "Please use the employer login page for employer accounts.",
          variant: "destructive"
        });
        supabase.auth.signOut();
      }
    }
  }, [isAuthenticated, profile, navigate, toast, redirectUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password
      });
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timed out. Please check your internet and try again.')), 30000)
      );
      const { data, error } = await Promise.race([signInPromise, timeoutPromise]) as any;

      if (error) {
        const isNetworkError = error.message?.includes("NetworkError") || error.message?.includes("Failed to fetch") || error.message?.includes("fetch");
        toast({
          title: isNetworkError ? "Connection Error" : "Login Failed",
          description: isNetworkError ? "Unable to connect. Please check your internet connection and try again." : error.message,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      // Check the user's role from profiles
      const { data: profileData, error: profileError } = await supabase.
      from("profiles").
      select("role").
      eq("id", data.user.id).
      single();

      if (profileError || !profileData) {
        toast({
          title: "Profile Not Found",
          description: "Please complete your profile registration first.",
          variant: "destructive"
        });
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      if (profileData.role !== "candidate") {
        toast({
          title: "Access Denied",
          description: `This login is for candidates only. Your account is registered as ${profileData.role}. Please use the correct login page.`,
          variant: "destructive"
        });
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      toast({
        title: "Login Successful",
        description: "Welcome back!"
      });

      // Navigate to redirect URL or candidate dashboard
      if (redirectUrl) {
        navigate(redirectUrl, { replace: true });
      } else {
        navigate("/candidate/dashboard", { replace: true });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during login",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-subtle px-4 py-6">
      <div className="w-full max-w-md">
        {/* Back to Home Link */}
        <Link
          to="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-accent transition-colors mb-4">

          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        {/* Login Card */}
        <div className="bg-card rounded-lg shadow-large p-6 animate-scale-in">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img

              alt="Gradia - Your Next Step"
              className="h-14 w-auto object-contain" src="/lovable-uploads/3f4ccc4d-bff0-48a4-82ae-962d55c7abac.png" />

          </div>

          {/* Title */}
          <div className="text-center mb-5">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Candidate Login
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to access your job applications and profile
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full" />

            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/candidate/forgot-password"
                  className="text-sm text-accent hover:text-accent-hover transition-colors">

                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full" />

            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)} />

              <Label
                htmlFor="remember"
                className="text-sm text-muted-foreground cursor-pointer">

                Remember me for 30 days
              </Label>
            </div>

            {/* Submit Button */}
            <Button type="submit" variant="cta" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-4 text-muted-foreground">
                New to Gradia?
              </span>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Don't have a candidate account yet?
            </p>
            <Button variant="outline" size="lg" className="w-full" asChild>
              <Link to="/candidate/signup">Create Candidate Account</Link>
            </Button>
          </div>
        </div>

        {/* Additional Links */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>
            Are you an employer?{" "}
            <Link to="/employer/login" className="text-accent hover:text-accent-hover transition-colors font-medium">
              Sign in as employer
            </Link>
          </p>
        </div>
      </div>
    </div>);

};

export default CandidateLogin;