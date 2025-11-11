import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Users, Target, BarChart, Shield } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const EmployerSignup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/employer/create-profile");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/employer/create-profile`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: 'employer'
          }
        }
      });

      if (error) {
        toast({
          title: "Signup Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Account Created!",
        description: "Please complete your company profile to start hiring",
      });

      navigate("/employer/create-profile");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during signup",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setIsLoading(true);
    try {
      const devEmail = "employer@test.com";
      const devPassword = "test123456";
      
      // Try to sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: devEmail,
        password: devPassword,
      });

      if (signInError) {
        // If user doesn't exist, create it
        const { error: signUpError } = await supabase.auth.signUp({
          email: devEmail,
          password: devPassword,
          options: {
            data: {
              role: 'employer',
              full_name: 'Test Employer'
            }
          }
        });

        if (signUpError) {
          toast({
            title: "Dev Login Failed",
            description: signUpError.message,
            variant: "destructive",
          });
          return;
        }

        // Try signing in again after signup
        await supabase.auth.signInWithPassword({
          email: devEmail,
          password: devPassword,
        });
      }

      toast({
        title: "Dev Login Successful",
        description: "Logged in as test employer",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Dev login failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-subtle px-4 py-12">
      <div className="w-full max-w-4xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left Side - Benefits */}
        <div className="hidden md:block space-y-6 animate-fade-in">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Find Top Talent Faster
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join leading companies using Gradia to build exceptional teams
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-accent" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Quality Candidates</h3>
                <p className="text-sm text-muted-foreground">
                  Access a pool of pre-vetted, skilled professionals ready to join your team
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-accent" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Smart Matching</h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered candidate matching to find the perfect fit for your roles
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <BarChart className="h-6 w-6 text-accent" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Analytics Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Track hiring metrics and optimize your recruitment process
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Secure & Compliant</h3>
                <p className="text-sm text-muted-foreground">
                  Background verification and screening tools built-in
                </p>
              </div>
            </div>
          </div>

          {/* Onboarding Steps */}
          <div className="mt-8 p-4 bg-card/50 rounded-lg border border-border">
            <h4 className="font-medium text-foreground mb-3">Your Hiring Journey</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">1</div>
                <span className="font-medium">Create Account</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">2</div>
                <span>Complete Company Profile</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">3</div>
                <span>Post Your First Job</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">4</div>
                <span>Review Applications</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="bg-card rounded-lg shadow-large p-8 animate-scale-in">
          {/* Mobile back button */}
          <Link 
            to="/" 
            className="md:hidden inline-flex items-center text-sm text-muted-foreground hover:text-accent transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>

          <div className="flex justify-center mb-6">
            <img 
              src={gradiaLogo} 
              alt="Gradia - Your Next Step" 
              className="h-15 w-auto object-contain"
            />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Create Employer Account
            </h1>
            <p className="text-muted-foreground">
              Join Gradia to find top talent
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full"
              />
            </div>

            <Button type="submit" variant="cta" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          {/* Dev Login Section */}
          {import.meta.env.DEV && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card px-4 text-muted-foreground">
                    Quick Test
                  </span>
                </div>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="lg" 
                className="w-full" 
                onClick={handleDevLogin}
                disabled={isLoading}
              >
                🚀 Dev Login (Test Employer)
              </Button>
            </>
          )}

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-4 text-muted-foreground">
                Already have an account?
              </span>
            </div>
          </div>

          <div className="text-center">
            <Button variant="outline" size="lg" className="w-full" asChild>
              <Link to="/employer/login">Sign In</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            Looking for a job?{" "}
            <Link to="/candidate/signup" className="text-accent hover:text-accent-hover transition-colors font-medium">
              Create candidate account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployerSignup;
