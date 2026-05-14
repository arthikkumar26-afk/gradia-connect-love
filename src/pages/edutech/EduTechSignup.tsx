import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraduationCap, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthIndicator } from "@/components/ui/PasswordStrengthIndicator";
import gradiaLogo from "@/assets/gradia-logo.png";

/**
 * EduTech institute registration page. Wired to the /edutech/signup route so
 * the "Register Your Institute" CTA on /edutech (and /edutech/login) lands on
 * a real form instead of re-rendering the marketing page (the previous bug).
 *
 * Mirrors the freelancer-signup resilience pattern: retries on transient
 * network failures, friendly toasts on rate limits / duplicate emails, and
 * upserts both the `profiles` row and the `user_roles` row so the EduTech
 * login role check (role === 'edutech') succeeds on first sign-in.
 */
export default function EduTechSignup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, refreshProfile } = useAuth();

  const [instituteName, setInstituteName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // If the user is already signed in, skip the form entirely.
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/edutech/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateForm = (): boolean => {
    const next: Record<string, string> = {};
    if (!instituteName.trim()) next.instituteName = "Institute name is required";
    if (!contactPerson.trim()) next.contactPerson = "Contact person is required";
    if (!email.trim()) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Invalid email";
    if (!mobile.trim()) next.mobile = "Mobile is required";
    else if (!/^[6-9]\d{9}$/.test(mobile)) next.mobile = "Enter a valid 10-digit number";
    if (!password) next.password = "Password is required";
    else if (password.length < 8) next.password = "Min 8 characters";
    if (password !== confirmPassword) next.confirmPassword = "Passwords don't match";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const isNetErr = (msg?: string) =>
        !!msg && (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("timed out"));

      // Supabase signUp with up to 3 retries on transient network errors only.
      let authData: any = null;
      let authError: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const signupPromise = supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/edutech/dashboard`,
              data: {
                role: "edutech",
                full_name: contactPerson,
                institute_name: instituteName,
              },
            },
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out.")), 30000)
          );
          const result = await Promise.race([signupPromise, timeoutPromise]);
          authData = result.data;
          authError = result.error;
          if (!authError || !isNetErr(authError.message)) break;
          console.warn(`[edutech-signup] attempt ${attempt + 1} failed (network):`, authError.message);
        } catch (err: any) {
          authError = err;
          if (!(err.name === "TypeError" || isNetErr(err.message)) || attempt >= 2) break;
        }
        if (attempt < 2) await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      }

      if (authError && !authData?.user) {
        const msg = authError.message || "";
        if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already been registered")) {
          setErrors({ email: "Email already registered. Please login instead." });
        } else if (isNetErr(msg)) {
          toast({
            title: "Connection Error",
            description: "Unable to connect. Please check your internet and try again.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Signup Failed", description: msg, variant: "destructive" });
        }
        return;
      }

      // Supabase returns a user with empty `identities` when the email is
      // already taken — surface the same duplicate-email message.
      if (authData?.user && (!authData.user.identities || authData.user.identities.length === 0)) {
        setErrors({ email: "Email already registered. Please login instead." });
        return;
      }

      if (!authData?.user) {
        toast({ title: "Signup Failed", description: "Could not create account. Please try again.", variant: "destructive" });
        return;
      }

      // Upsert profile + role so the EduTech login role check passes.
      // Retry briefly on transient network errors; log non-network failures
      // but don't block the user from continuing.
      for (let attempt = 0; attempt < 3; attempt++) {
        const [profileResult, roleResult] = await Promise.all([
          supabase.from("profiles").upsert({
            id: authData.user.id,
            email,
            full_name: contactPerson,
            mobile,
            role: "edutech",
          }),
          supabase.from("user_roles").upsert(
            { user_id: authData.user.id, role: "edutech" as any },
            { onConflict: "user_id,role" }
          ),
        ]);
        if (!profileResult.error && !roleResult.error) break;
        if (attempt < 2 && (isNetErr(profileResult.error?.message) || isNetErr(roleResult.error?.message))) {
          await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        if (profileResult.error) console.error("[edutech-signup] profile error:", profileResult.error);
        if (roleResult.error) console.error("[edutech-signup] role error:", roleResult.error);
        break;
      }

      refreshProfile().catch((err) => console.error("[edutech-signup] profile refresh error:", err));
      // Fire-and-forget welcome email; failure here must not block navigation.
      supabase.functions
        .invoke("send-welcome-email", {
          body: { email, fullName: contactPerson, role: "edutech" },
        })
        .catch((err) => console.error("[edutech-signup] welcome email failed:", err));

      toast({
        title: "Institute registered!",
        description: "Welcome to Gradia EduTech. Redirecting to your dashboard…",
      });
      navigate("/edutech/dashboard", { replace: true });
    } catch (error: any) {
      const isNetworkError =
        error.name === "TypeError" ||
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("NetworkError") ||
        error.message?.includes("timed out");
      toast({
        title: isNetworkError ? "Connection Error" : "Error",
        description: isNetworkError
          ? "Unable to connect. Please check your internet and try again."
          : error.message || "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>EduTech Sign Up - Gradia</title>
        <meta name="description" content="Register your institute on Gradia EduTech to manage student placements and outreach campaigns." />
        <link rel="canonical" href="https://gradiaa.com/edutech/signup" />
      </Helmet>
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-md">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link to="/edutech" className="flex items-center gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to EduTech
          </Link>
        </Button>

        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <img src={gradiaLogo} alt="Gradia" className="h-10 w-auto" />
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Register Your Institute</CardTitle>
            <CardDescription>
              Create your EduTech account to manage courses, candidates & campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="instituteName">Institute Name</Label>
                <Input
                  id="instituteName"
                  value={instituteName}
                  onChange={(e) => setInstituteName(e.target.value)}
                  placeholder="e.g. Gradia Coaching Center"
                />
                {errors.instituteName && <p className="text-xs text-destructive">{errors.instituteName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Full name"
                />
                {errors.contactPerson && <p className="text-xs text-destructive">{errors.contactPerson}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="institute@example.com"
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number</Label>
                <Input
                  id="mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="10-digit mobile"
                  maxLength={10}
                />
                {errors.mobile && <p className="text-xs text-destructive">{errors.mobile}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                />
                <PasswordStrengthIndicator password={password} />
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <PasswordInput
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                />
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Register Institute"
                )}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>
                Already have an account?{" "}
                <Link to="/edutech/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
