import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Crown, Zap } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDevLogin } from "@/hooks/useDevLogin";

const OwnerLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const { handleDevLogin, isLoading: isDevLoading } = useDevLogin('owner');

  useEffect(() => {
    const checkOwnerRole = async () => {
      if (isAuthenticated) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'owner')
            .single();
          
          if (roleData) {
            navigate("/owner/dashboard");
          }
        }
      }
    };
    checkOwnerRole();
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
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

      // Check if user has owner role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .eq('role', 'owner')
        .single();

      if (roleError || !roleData) {
        await supabase.auth.signOut();
        toast({
          title: "Access Denied",
          description: "You do not have owner privileges.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Login Successful",
        description: "Welcome to the Owner Dashboard!",
      });
      navigate("/owner/dashboard");
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
        <div className="bg-card rounded-lg shadow-large p-8 animate-scale-in border-2 border-purple-200 dark:border-purple-800">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              src={gradiaLogo} 
              alt="Gradia - Your Next Step" 
              className="h-20 w-auto object-contain"
            />
          </div>

          {/* Owner Badge */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Crown className="h-5 w-5" />
              <span className="font-semibold">Owner Portal</span>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Owner Login
            </h1>
            <p className="text-muted-foreground">
              Sign in for full system access
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Owner Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="owner@gradia.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              size="lg" 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In as Owner"}
            </Button>

            {/* Dev Test Login */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Dev Testing</span>
              </div>
            </div>

            <Button 
              type="button"
              variant="outline"
              size="lg" 
              className="w-full border-purple-300 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:hover:bg-purple-900/20" 
              disabled={isDevLoading}
              onClick={handleDevLogin}
            >
              <Zap className="h-4 w-4 mr-2" />
              {isDevLoading ? "Logging in..." : "Dev Test Login (Owner)"}
            </Button>
          </form>

          {/* Security Notice */}
          <div className="mt-6 p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
            <p className="text-xs text-muted-foreground text-center">
              👑 This is the highest-level access portal. All activities are logged and audited. Unauthorized access attempts will be reported.
            </p>
          </div>
        </div>

        {/* Additional Links */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Looking for other portals?{" "}
            <Link to="/admin/login" className="text-accent hover:text-accent-hover transition-colors font-medium">
              Admin
            </Link>
            {" · "}
            <Link to="/employer/login" className="text-accent hover:text-accent-hover transition-colors font-medium">
              Employer
            </Link>
            {" · "}
            <Link to="/candidate/login" className="text-accent hover:text-accent-hover transition-colors font-medium">
              Candidate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;
