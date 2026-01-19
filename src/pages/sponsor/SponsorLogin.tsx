import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { LogIn, Mail, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function SponsorLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated } = useAuth();
  const from = (location.state as { from?: string })?.from || "/sponsor/benefits";

  // Redirect if already authenticated as sponsor
  useEffect(() => {
    const checkSponsorStatus = async () => {
      if (isAuthenticated && user) {
        const { data: sponsor } = await supabase
          .from("sponsors")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (sponsor) {
          navigate(from, { replace: true });
        }
      }
    };
    checkSponsorStatus();
  }, [isAuthenticated, user, navigate, from]);

  const validateForm = (): boolean => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as "email" | "password";
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }
    setErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);

    try {
      // Sign in with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else {
          toast.error(authError.message);
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error("Login failed. Please try again.");
        setIsLoading(false);
        return;
      }

      // Check if user is a sponsor
      const { data: sponsor, error: sponsorError } = await supabase
        .from("sponsors")
        .select("id, company_name, status")
        .eq("user_id", authData.user.id)
        .single();

      if (sponsorError || !sponsor) {
        toast.error("No sponsor account found. Please sign up as a sponsor first.");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      if (sponsor.status === "pending") {
        toast.warning("Your sponsor account is pending approval.");
      } else if (sponsor.status === "inactive") {
        toast.error("Your sponsor account is inactive. Please contact support.");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      toast.success(`Welcome back, ${sponsor.company_name}!`);
      navigate(from, { replace: true });
    } catch (error) {
      console.error("Login error:", error);
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="container mx-auto max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <LogIn className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Sponsor Sign In</h1>
          <p className="text-muted-foreground">
            Access your sponsor dashboard and analytics
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="sponsor@company.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                  required
                  disabled={isLoading}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground z-10" />
                <PasswordInput
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  className={`pl-10 ${errors.password ? "border-destructive" : ""}`}
                  required
                  disabled={isLoading}
                />
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <Link to="#" className="text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>
              New sponsor?{" "}
              <Link to="/sponsor/become-partner" className="text-primary hover:underline">
                Become a Partner
              </Link>
            </p>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
