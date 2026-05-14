import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Award, Loader2 } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthIndicator } from "@/components/ui/PasswordStrengthIndicator";
// Aggregated ARIA live-region announcer for inline form validation errors.
import { FormErrorAnnouncer } from "@/components/auth/FormErrorAnnouncer";

const FreelancerSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, refreshProfile } = useAuth();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Bumped on each submit so the ARIA announcer re-fires on repeat submits.
  const [submitCount, setSubmitCount] = useState(0);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/freelancer/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!email.trim()) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Invalid email";
    if (!mobile.trim()) newErrors.mobile = "Mobile is required";
    else if (!/^[6-9]\d{9}$/.test(mobile)) newErrors.mobile = "Invalid 10-digit number";
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 8) newErrors.password = "Min 8 characters";
    if (password !== confirmPassword) newErrors.confirmPassword = "Passwords don't match";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Bump first so the ARIA live region re-announces on repeat submits.
    setSubmitCount((n) => n + 1);
    if (!validateForm()) return;
    setIsLoading(true);
    
    try {
      const isNetErr = (msg?: string) => 
        msg?.includes("Failed to fetch") || msg?.includes("NetworkError") || msg?.includes("TypeError") || msg?.includes("timed out");

      let authData: any = null;
      let authError: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const signupPromise = supabase.auth.signUp({
            email, password,
            options: {
              emailRedirectTo: `${window.location.origin}/freelancer/dashboard`,
              data: { role: 'freelancer', full_name: fullName }
            }
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out.")), 30000)
          );
          const result = await Promise.race([signupPromise, timeoutPromise]);
          authData = result.data;
          authError = result.error;
          if (!authError || !isNetErr(authError.message)) break;
          console.warn(`Freelancer signup attempt ${attempt + 1} failed (network):`, authError.message);
        } catch (err: any) {
          authError = err;
          if (!(err.name === "TypeError" || isNetErr(err.message)) || attempt >= 2) break;
          console.warn(`Freelancer signup attempt ${attempt + 1} threw:`, err.message);
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }

      if (authError && !authData?.user) {
        const msg = authError.message || '';
        if (msg.includes("already registered") || msg.includes("already been registered")) {
          setErrors({ email: "Email already registered. Please login." });
        } else if (isNetErr(msg)) {
          toast({ title: "Connection Error", description: "Unable to connect. Please check your internet and try again.", variant: "destructive" });
        } else {
          toast({ title: "Signup Failed", description: msg, variant: "destructive" });
        }
        return;
      }

      if (authData?.user && (!authData.user.identities || authData.user.identities.length === 0)) {
        setErrors({ email: "Email already registered. Please login." });
        return;
      }

      if (!authData?.user) {
        toast({ title: "Signup Failed", description: "Could not create account. Please try again.", variant: "destructive" });
        return;
      }

      // Create profile and role with retry
      for (let attempt = 0; attempt < 3; attempt++) {
        const [profileResult, roleResult] = await Promise.all([
          supabase.from("profiles").upsert({
            id: authData.user.id, email, full_name: fullName, mobile, role: 'freelancer',
          }),
          supabase.from("user_roles").upsert(
            { user_id: authData.user.id, role: 'freelancer' as any },
            { onConflict: 'user_id,role' }
          ),
        ]);
        if (!profileResult.error && !roleResult.error) break;
        if (attempt < 2 && (isNetErr(profileResult.error?.message) || isNetErr(roleResult.error?.message))) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        if (profileResult.error) console.error("Profile error:", profileResult.error);
        if (roleResult.error) console.error("Role error:", roleResult.error);
        break;
      }

      refreshProfile().catch(err => console.error("Profile refresh error:", err));
      supabase.functions.invoke('send-welcome-email', {
        body: { email, fullName, role: 'freelancer' }
      }).catch(err => console.error("Welcome email failed:", err));

      toast({ title: "Account Created!", description: "Welcome to Gradia as a Freelancer" });
      navigate('/freelancer/dashboard');
    } catch (error: any) {
      const isNetworkError = error.name === "TypeError" || error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError") || error.message?.includes("timed out");
      toast({
        title: isNetworkError ? "Connection Error" : "Error",
        description: isNetworkError ? "Unable to connect. Please check your internet and try again." : error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/signup" className="inline-flex items-center text-sm text-muted-foreground hover:text-accent mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Sign Up
        </Link>
        
        <Card className="p-8">
          <div className="flex justify-center mb-6">
            <img src={gradiaLogo} alt="Gradia" className="h-12 w-auto" />
          </div>
          
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-3">
              <Award className="h-7 w-7 text-orange-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Freelancer Sign Up</h1>
            <p className="text-sm text-muted-foreground mt-1">Find projects & mentor students</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Aggregated, polite live region — re-announces every submit. */}
            <FormErrorAnnouncer
              id="freelancer-signup-form-errors"
              errors={errors}
              submitCount={submitCount}
            />
            <div>
              <Label htmlFor="fl-fullName">Full Name</Label>
              <Input
                id="fl-fullName"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Enter your full name"
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? "fl-fullName-error" : undefined}
              />
              {errors.fullName && <p id="fl-fullName-error" className="text-xs text-destructive mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <Label htmlFor="fl-email">Email</Label>
              <Input
                id="fl-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "fl-email-error" : undefined}
              />
              {errors.email && <p id="fl-email-error" className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="fl-mobile">Mobile Number</Label>
              <Input
                id="fl-mobile"
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder="10-digit mobile"
                maxLength={10}
                aria-invalid={!!errors.mobile}
                aria-describedby={errors.mobile ? "fl-mobile-error" : undefined}
              />
              {errors.mobile && <p id="fl-mobile-error" className="text-xs text-destructive mt-1">{errors.mobile}</p>}
            </div>
            <div>
              <Label htmlFor="fl-password">Password</Label>
              <PasswordInput
                id="fl-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "fl-password-error" : undefined}
              />
              <PasswordStrengthIndicator password={password} />
              {errors.password && <p id="fl-password-error" className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>
            <div>
              <Label htmlFor="fl-confirmPassword">Confirm Password</Label>
              <PasswordInput
                id="fl-confirmPassword"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "fl-confirmPassword-error" : undefined}
              />
              {errors.confirmPassword && <p id="fl-confirmPassword-error" className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : "Create Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account? <Link to="/login" className="text-accent hover:underline">Login</Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default FreelancerSignup;
