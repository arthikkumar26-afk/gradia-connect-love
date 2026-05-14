import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
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
// Shared helpers + hook for the resend-confirmation flow. Pure helpers stay
// in `@/lib/auth/resendCooldown` so they remain unit-testable; the hook owns
// state + the `supabase.auth.resend` call so every login/signup screen has
// identical cooldown/rate-limit/toast behaviour.
import { isEmailNotConfirmedErr } from "@/lib/auth/resendCooldown";
import { useResendConfirmation } from "@/hooks/useResendConfirmation";

const FreelancerLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, profile } = useAuth();
  const { toast } = useToast();

  // All resend-confirmation state lives in the shared hook so the
  // freelancer/employer/candidate flows behave identically.
  const {
    unverifiedEmail,
    setUnverifiedEmail,
    resendCooldown,
    isResending,
    isDisabled: isResendDisabled,
    cooldownLabel,
    resend,
    reset: resetResendState,
  } = useResendConfirmation({
    flow: "freelancer-login",
    redirectTo: `${window.location.origin}/freelancer/login`,
  });

  useEffect(() => {
    if (isAuthenticated && profile?.role === 'freelancer') {
      navigate("/freelancer/dashboard", { replace: true });
    }
  }, [isAuthenticated, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Clear any prior unverified-state when the user retries — the new
    // attempt may succeed or surface a different error.
    resetResendState();
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

  // Resend the signup verification email. The shared hook handles cooldown
  // gating, rate-limit detection, toast copy, and console logging — this is
  // just a thin wrapper that invokes it.
  const handleResendVerification = () => {
    void resend();
  };

  return (
    <>
      <Helmet>
        <title>Freelancer Login - Gradia</title>
        <meta name="description" content="Sign in to your Gradia freelancer account to manage portfolio, mentorship, and outsource projects." />
        <link rel="canonical" href="https://gradiaa.com/freelancer/login" />
      </Helmet>
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
            <section
              ref={(el) => el?.focus()}
              tabIndex={-1}
              role="region"
              aria-labelledby="freelancer-login-resend-title"
              aria-describedby="freelancer-login-resend-desc"
              className="mt-5 rounded-md border border-destructive/30 bg-destructive/5 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex gap-3">
                <MailWarning aria-hidden="true" className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p
                    id="freelancer-login-resend-title"
                    role="alert"
                    className="text-sm font-medium text-foreground"
                  >
                    Your email is not verified
                  </p>
                  <p id="freelancer-login-resend-desc" className="text-xs text-muted-foreground">
                    Please confirm <span className="font-medium text-foreground">{unverifiedEmail}</span> to continue. Check your inbox for the verification link, or resend it below.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerification}
                    disabled={isResendDisabled}
                    aria-busy={isResending}
                    aria-describedby="freelancer-login-resend-status"
                    aria-label={
                      isResending
                        ? 'Sending verification email'
                        : resendCooldown > 0
                          ? `Resend available in ${cooldownLabel}`
                          : `Resend confirmation email to ${unverifiedEmail}`
                    }
                    className="mt-1"
                  >
                    {isResending
                      ? 'Sending…'
                      : resendCooldown > 0
                        ? `Try again in ${cooldownLabel}`
                        : 'Resend confirmation email'}
                  </Button>
                  <span
                    id="freelancer-login-resend-status"
                    aria-live="polite"
                    aria-atomic="true"
                    className="sr-only"
                  >
                    {isResending
                      ? 'Sending verification email'
                      : resendCooldown > 0
                        ? `You can resend in ${cooldownLabel}.`
                        : 'You can resend the verification email now.'}
                  </span>
                </div>
              </div>
            </section>
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
    </>
  );
};

export default FreelancerLogin;
