import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Award, ArrowLeft, MailWarning } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Supabase signals an unverified email in a few different shapes depending on
// project settings. We treat any of these as a structured EMAIL_NOT_CONFIRMED
// error so the UI can show a recovery path instead of a generic failure toast.
const isEmailNotConfirmedErr = (err: any): boolean => {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  const code = (err.code || "").toLowerCase();
  return (
    code === "email_not_confirmed" ||
    code === "email_address_not_confirmed" ||
    msg.includes("email not confirmed") ||
    msg.includes("email address not confirmed") ||
    msg.includes("confirm your email") ||
    msg.includes("not confirmed")
  );
};

const isRateLimitErr = (err: any): boolean => {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  const code = (err.code || "").toLowerCase();
  const status = err.status;
  return (
    status === 429 ||
    code.includes("over_email_send_rate") ||
    code.includes("rate_limit") ||
    msg.includes("rate limit") ||
    msg.includes("for security purposes") ||
    msg.includes("only request this after")
  );
};

// Pull retry-after seconds from Supabase's error message; fall back to 60s.
const getRetryAfterSeconds = (err: any): number => {
  const msg = err?.message || "";
  const match =
    msg.match(/after\s+(\d+)\s*seconds?/i) ||
    msg.match(/in\s+(\d+)\s*seconds?/i) ||
    msg.match(/(\d+)\s*seconds?/i);
  if (match) {
    const n = parseInt(match[1], 10);
    if (!Number.isNaN(n) && n > 0) return Math.min(n, 600);
  }
  return 60;
};

const formatRetryWindow = (seconds: number) => {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const mins = Math.ceil(seconds / 60);
  return `${mins} minute${mins === 1 ? "" : "s"}`;
};

const FreelancerLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, profile } = useAuth();
  const { toast } = useToast();

  // Inline EMAIL_NOT_CONFIRMED state. `unverifiedEmail` is the address tied to
  // the failed login (we keep it separately from the input so the user can
  // edit the field without losing the recovery panel). `resendCooldown` gates
  // the resend button so we never hammer the upstream rate limit.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (isAuthenticated && profile?.role === 'freelancer') {
      navigate("/freelancer/dashboard", { replace: true });
    }
  }, [isAuthenticated, profile, navigate]);

  // 1-second tick for the cooldown timer. The button stays disabled until
  // this reaches 0, mirroring the employer-signup resend behaviour.
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
    // attempt may succeed or surface a different error.
    setUnverifiedEmail(null);
    try {
      const isNetErr = (msg?: string) =>
        msg?.includes("Failed to fetch") || msg?.includes("NetworkError") || msg?.includes("timed out");

      let error: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const signInPromise = supabase.auth.signInWithPassword({ email, password });
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Connection timed out.')), 30000)
          );
          const result = await Promise.race([signInPromise, timeoutPromise]) as any;
          error = result.error;
          // Only retry transient network errors. EMAIL_NOT_CONFIRMED, bad
          // credentials, etc. are terminal and should not loop.
          if (!error || !isNetErr(error.message)) break;
          console.warn(`Login attempt ${attempt + 1} failed (network)`);
        } catch (err: any) {
          error = err;
          if (!(err.name === "TypeError" || isNetErr(err.message)) || attempt >= 2) break;
        }
        if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }

      if (error) {
        // Structured EMAIL_NOT_CONFIRMED handling: show the inline recovery
        // card with a Resend CTA instead of a generic destructive toast.
        if (isEmailNotConfirmedErr(error)) {
          console.warn("[freelancer-login] EMAIL_NOT_CONFIRMED", { email });
          setUnverifiedEmail(email);
          toast({
            title: "Email not verified",
            description: "Please confirm your email to continue. You can resend the verification link below.",
          });
          return;
        }

        const isNetwork = error.name === "TypeError" || isNetErr(error.message);
        toast({
          title: isNetwork ? "Connection Error" : "Login Failed",
          description: isNetwork
            ? "Unable to connect. Check your internet and try again."
            : error.message,
          variant: "destructive",
        });
        return;
      }
      toast({ title: "Login Successful", description: "Redirecting to your dashboard..." });
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
        description: isNetworkError ? "Unable to connect. Check your internet." : (error.message || "An error occurred"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Resend the signup verification email. Gated by `resendCooldown` so this
  // can only fire after the local timer elapses; if the upstream rate limit
  // still trips, we re-arm the timer with the parsed retry-after value.
  const handleResendVerification = async () => {
    if (!unverifiedEmail) return;
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    try {
      const redirectUrl = `${window.location.origin}/freelancer/login`;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: unverifiedEmail,
        options: { emailRedirectTo: redirectUrl },
      });

      if (error) {
        if (isRateLimitErr(error)) {
          const retryAfter = getRetryAfterSeconds(error);
          const friendly = `Too many requests for this email. Try again in ${formatRetryWindow(retryAfter)}.`;
          console.warn('[freelancer-login] resend rate limit', { email: unverifiedEmail, retryAfter, raw: error.message });
          setResendCooldown(retryAfter);
          toast({ title: 'Please wait a moment', description: friendly, variant: 'destructive' });
          return;
        }
        toast({ title: 'Could not resend email', description: error.message || 'Please try again.', variant: 'destructive' });
        return;
      }

      // Success — arm a 60s local cooldown to match Supabase's window.
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
    <div className="min-h-screen flex items-center justify-center bg-subtle px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-accent transition-colors mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <div className="bg-card rounded-lg shadow-large p-8 animate-scale-in">
          <div className="flex justify-center mb-3">
            <img src={gradiaLogo} alt="Gradia" className="h-12 w-auto object-contain" />
          </div>

          <div className="text-center mb-1">
            <h1 className="text-xl font-bold text-foreground mb-0.5">Freelancer Login</h1>
            <p className="text-xs text-muted-foreground">Access your projects & mentorship</p>
          </div>

          {/* Inline EMAIL_NOT_CONFIRMED recovery card. Renders only after a
              login attempt surfaces an unverified email — provides a clear
              explanation and a one-click resend with cooldown feedback. */}
          {unverifiedEmail && (
            <div
              role="alert"
              className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 p-4"
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

          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link to="/forgot-password" className="text-sm text-accent hover:text-accent-hover transition-colors">Forgot password?</Link>
              </div>
              <PasswordInput id="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" variant="cta" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-4 text-muted-foreground">New to Gradia?</span>
            </div>
          </div>

          <Button variant="outline" size="lg" className="w-full" asChild>
            <Link to="/freelancer/signup" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Create Freelancer Account
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FreelancerLogin;
