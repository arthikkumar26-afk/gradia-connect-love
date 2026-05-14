import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useLocation } from "react-router-dom";
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

const EmployerLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { profile, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  const from = (location.state as any)?.from || "/employer/dashboard";

  useEffect(() => {
    if (isAuthenticated && profile) {
      if (profile.role === "employer") {
        navigate(from);
      } else {
        // User logged in but is not an employer - show error and logout
        toast({
          title: "Access Denied",
          description: "This login is for employers only. Please use the candidate login instead.",
          variant: "destructive",
        });
        supabase.auth.signOut();
      }
    }
  }, [isAuthenticated, profile, navigate, from, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const isNetErr = (msg?: string) => 
        msg?.includes("Failed to fetch") || msg?.includes("NetworkError") || msg?.includes("timed out");

      let data: any = null;
      let error: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const signInPromise = supabase.auth.signInWithPassword({ email, password });
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Connection timed out.')), 30000)
          );
          const result = await Promise.race([signInPromise, timeoutPromise]) as any;
          data = result.data;
          error = result.error;
          if (!error || !isNetErr(error.message)) break;
          console.warn(`Login attempt ${attempt + 1} failed (network):`, error.message);
        } catch (err: any) {
          error = err;
          if (!(err.name === "TypeError" || isNetErr(err.message)) || attempt >= 2) break;
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }

      if (error) {
        const isNetwork = error.name === "TypeError" || isNetErr(error.message);
        toast({
          title: isNetwork ? "Connection Error" : "Login Failed",
          description: isNetwork ? "Unable to connect. Please check your internet connection and try again." : error.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Check the user's role from profiles (with retry for network issues)
      let profileData = null;
      let profileError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        profileData = result.data;
        profileError = result.error;
        if (!profileError) break;
        if (attempt < 2) await new Promise(r => setTimeout(r, 1000));
      }

      if (profileError || !profileData) {
        const isNetErr = profileError?.message?.includes("Failed to fetch") || profileError?.message?.includes("NetworkError");
        toast({
          title: isNetErr ? "Connection Error" : "Profile Not Found",
          description: isNetErr ? "Unable to connect. Please check your internet and try again." : "Please complete your employer registration first.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      if (profileData.role !== "employer") {
        toast({
          title: "Access Denied",
          description: `This login is for employers only. Your account is registered as a ${profileData.role}. Please use the correct login page.`,
          variant: "destructive",
        });
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      
      // Navigate to employer dashboard
      navigate(from);
    } catch (error: any) {
      const isNetworkError = error.name === "TypeError" || error.message?.includes("NetworkError") || error.message?.includes("Failed to fetch") || error.message?.includes("timed out");
      toast({
        title: isNetworkError ? "Connection Error" : "Error",
        description: isNetworkError ? "Unable to connect. Please check your internet connection and try again." : (error.message || "An error occurred during login"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Employer Login - Gradia</title>
        <meta name="description" content="Sign in to your Gradia employer account to manage vacancies, candidates, and hiring pipelines." />
        <link rel="canonical" href="https://gradiaa.com/employer/login" />
      </Helmet>
    <div className="min-h-screen flex items-center justify-center bg-subtle px-4 py-6">
      <div className="w-full max-w-md">
        {/* Back to Home Link */}
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-accent transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        {/* Login Card */}
        <div className="bg-card rounded-lg shadow-large p-6 animate-scale-in">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img 
              src={gradiaLogo} 
              alt="Gradia - Your Next Step" 
              className="h-14 w-auto object-contain"
            />
          </div>

          {/* Title */}
          <div className="text-center mb-5">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Employers Login
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to access your employer dashboard
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
                placeholder="employer@company.com"
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
                  to="/employer/forgot-password"
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
              Don't have an employer account yet?
            </p>
            <Button variant="outline" size="lg" className="w-full" asChild>
              <Link to="/employer/signup">Create Employer Account</Link>
            </Button>
          </div>
        </div>

        {/* Additional Links */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>
            Looking for a job?{" "}
            <Link to="/candidate/login" className="text-accent hover:text-accent-hover transition-colors font-medium">
              Sign in as candidate
            </Link>
          </p>
        </div>
      </div>
    </div>
    </>
  );
};

export default EmployerLogin;
