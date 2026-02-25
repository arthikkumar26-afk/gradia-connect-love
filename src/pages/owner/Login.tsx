import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Crown } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const OwnerLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

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
      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timed out. Please check your internet and try again.')), 15000)
      );

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]) as any;

      if (error) {
        const isNetworkError = error.message?.includes("NetworkError") || error.message?.includes("Failed to fetch") || error.message?.includes("fetch");
        toast({
          title: isNetworkError ? "Connection Error" : "Login Failed",
          description: isNetworkError ? "Unable to connect. Please check your internet connection and try again." : error.message,
          variant: "destructive",
        });
        return;
      }

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
      const isNetworkError = error.message?.includes("NetworkError") || error.message?.includes("Failed to fetch") || error.message?.includes("timed out") || error.message?.includes("fetch");
      toast({
        title: isNetworkError ? "Connection Error" : "Error",
        description: isNetworkError ? "Unable to connect to server. Please check your internet connection and try again." : (error.message || "An error occurred during login"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-subtle px-4 py-6">
      <div className="w-full max-w-md">
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-accent transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <div className="bg-card rounded-lg shadow-large p-6 animate-scale-in border-2 border-purple-200 dark:border-purple-800">
          <div className="flex justify-center mb-3">
            <img 
              src={gradiaLogo} 
              alt="Gradia - Your Next Step" 
              className="h-14 w-auto object-contain"
            />
          </div>

          <div className="flex justify-center mb-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <Crown className="h-4 w-4" />
              <span className="font-semibold text-sm">Owner Portal</span>
            </div>
          </div>

          <div className="text-center mb-5">
            <h1 className="text-2xl font-bold text-foreground mb-1">
              Owner Login
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in for full system access
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Owner Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="owner@gradia.co.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput
                id="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full"
              />
            </div>

            <Button 
              type="submit" 
              size="lg" 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white" 
              disabled={isLoading}
            >
              {isLoading ? "Signing In..." : "Sign In as Owner"}
            </Button>
          </form>

          <div className="mt-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
            <p className="text-xs text-muted-foreground text-center">
              👑 This is the highest-level access portal. All activities are logged and audited. Unauthorized access attempts will be reported.
            </p>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-muted-foreground">
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
