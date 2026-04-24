import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, MailWarning } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
// Shared, unit-tested helpers for the resend-confirmation flow. Keeping
// these in one module guarantees identical rate-limit detection and
// cooldown decisions across every login/signup page.
import {
  isEmailNotConfirmedErr,
  isRateLimitErr,
  getRetryAfterSeconds,
  formatRetryWindow,
  decideResendOutcome,
} from "@/lib/auth/resendCooldown";

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

  // Inline EMAIL_NOT_CONFIRMED state. `unverifiedEmail` is the address tied
  // to the failed login (kept separate from the input so editing the field
  // doesn't dismiss the recovery panel). `resendCooldown` gates the resend
  // button so we never re-hit the upstream rate limit early.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

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

  // 1-second tick for the resend cooldown timer. Button stays disabled
  // until this hits 0, mirroring the freelancer/employer flows.
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => {
      setResendCooldown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Clear any prior unverified-state when the user retries — the new
    // attempt may succeed or surface a different error entirely.
    setUnverifiedEmail(null);

    try {
      const isNetErr = (msg?: string) =>
        msg?.includes("Failed to fetch") || msg?.includes("NetworkError") || msg?.includes("timed out");

      // Sign in with retry for transient network errors only. EMAIL_NOT_CONFIRMED,
      // bad credentials, and rate limits are terminal — they should never loop.
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
          console.warn(`Login attempt ${attempt + 1} threw:`, err.message);
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }

      if (error) {
        // Structured EMAIL_NOT_CONFIRMED handling — show inline recovery
        // card with a Resend CTA instead of a generic destructive toast.
        if (isEmailNotConfirmedErr(error)) {
          console.warn("[candidate-login] EMAIL_NOT_CONFIRMED", { email });
          setUnverifiedEmail(email);
          toast({
            title: "Email not verified",
            description: "Please confirm your email to continue. You can resend the verification link below.",
          });
          setIsLoading(false);
          return;
        }

        const isNetwork = error.name === "TypeError" || isNetErr(error.message);
        toast({
          title: isNetwork ? "Connection Error" : "Login Failed",
          description: isNetwork ? "Unable to connect. Please check your internet connection and try again." : error.message,
          variant: "destructive"
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
        const isNetErrLocal = profileError?.message?.includes("Failed to fetch") || profileError?.message?.includes("NetworkError");
        toast({
          title: isNetErrLocal ? "Connection Error" : "Profile Not Found",
          description: isNetErrLocal ? "Unable to connect. Please check your internet and try again." : "Please complete your profile registration first.",
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
      if (isEmailNotConfirmedErr(error)) {
        setUnverifiedEmail(email);
        toast({
          title: "Email not verified",
          description: "Please confirm your email to continue. You can resend the verification link below.",
        });
        return;
      }
      const isNetworkError = error.name === "TypeError" || error.message?.includes("NetworkError") || error.message?.includes("Failed to fetch") || error.message?.includes("timed out");
      toast({
        title: isNetworkError ? "Connection Error" : "Error",
        description: isNetworkError ? "Unable to connect. Please check your internet connection and try again." : (error.message || "An error occurred during login"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Resend the signup verification email. Gated by `resendCooldown` so it
  // only fires once the local timer elapses; if the upstream rate limit
  // still trips we re-arm the cooldown using the parsed retry-after value.
  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      const redirectTarget = `${window.location.origin}/candidate/login`;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: unverifiedEmail,
        options: { emailRedirectTo: redirectTarget },
      });

      if (error) {
        if (isRateLimitErr(error)) {
          const retryAfter = getRetryAfterSeconds(error);
          const friendly = `Too many requests for this email. Try again in ${formatRetryWindow(retryAfter)}.`;
          console.warn('[candidate-login] resend rate limit', { email: unverifiedEmail, retryAfter, raw: error.message });
          setResendCooldown(retryAfter);
          toast({ title: 'Please wait a moment', description: friendly, variant: 'destructive' });
          return;
        }
        toast({ title: 'Could not resend email', description: error.message || 'Please try again.', variant: 'destructive' });
        return;
      }

      // Success — arm a 60s local cooldown to mirror Supabase's window.
      setResendCooldown(60);
      toast({
        title: 'Resent successfully',
        description: `Check your inbox at ${unverifiedEmail} for the confirmation link.`,
      });
    } catch (err: any) {
      if (isRateLimitErr(err)) {
        const retryAfter = getRetryAfterSeconds(err);
        const friendly = `Too many requests for this email. Try again in ${formatRetryWindow(retryAfter)}.`;
        setResendCooldown(retryAfter);
        toast({ title: 'Please wait a moment', description: friendly, variant: 'destructive' });
      } else {
        toast({ title: 'Could not resend email', description: err?.message || 'Please try again.', variant: 'destructive' });
      }
    } finally {
      setIsResending(false);
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

          {/* Inline EMAIL_NOT_CONFIRMED recovery card. Renders only after a
              login attempt surfaces an unverified email — provides a clear
              explanation and a one-click resend with cooldown feedback. */}
          {unverifiedEmail && (
            <div
              role="alert"
              className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-4"
            >
              <div className="flex gap-3">
                <MailWarning className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Your email is not verified
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Please confirm <span className="font-medium text-foreground">{unverifiedEmail}</span> to continue. Check your inbox for the verification link, or resend it below.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={resendCooldown > 0 || isResending}
                    className="mt-1"
                  >
                    {isResending
                      ? 'Sending…'
                      : resendCooldown > 0
                        ? `Try again in ${formatRetryWindow(resendCooldown)}`
                        : 'Resend confirmation email'}
                  </Button>
                </div>
              </div>
            </div>
          )}

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
