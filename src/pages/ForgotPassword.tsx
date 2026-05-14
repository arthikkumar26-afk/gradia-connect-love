import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState("");

  // Determine the user type based on the URL path
  const getUserType = () => {
    if (location.pathname.includes("/candidate")) return "candidate";
    if (location.pathname.includes("/employer")) return "employer";
    if (location.pathname.includes("/sponsor")) return "sponsor";
    return "user";
  };

  const getBackLink = () => {
    const userType = getUserType();
    switch (userType) {
      case "candidate":
        return "/candidate/login";
      case "employer":
        return "/employer/login";
      case "sponsor":
        return "/sponsor/login";
      default:
        return "/login";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (resetError) {
        toast({
          title: "Error",
          description: resetError.message,
          variant: "destructive",
        });
        return;
      }

      setEmailSent(true);
      toast({
        title: "Reset Email Sent",
        description: "Check your email for the password reset link.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-subtle px-4 py-12">
        <div className="w-full max-w-md">
          <Card className="p-8 text-center animate-scale-in">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Check Your Email
            </h1>
            <p className="text-muted-foreground mb-6">
              We've sent a password reset link to <strong>{email}</strong>. 
              Please check your inbox and follow the instructions to reset your password.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              Didn't receive the email? Check your spam folder or try again.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => setEmailSent(false)} 
                variant="outline" 
                className="w-full"
              >
                Try Another Email
              </Button>
              <Link to={getBackLink()}>
                <Button variant="ghost" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-subtle px-4 py-12">
      <div className="w-full max-w-md">
        <Link 
          to={getBackLink()} 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-accent transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Login
        </Link>

        <Card className="p-8 animate-scale-in">
          <div className="flex justify-center mb-6">
            <img 
              src={gradiaLogo} 
              alt="Gradia - Your Next Step" 
              className="h-16 w-auto object-contain"
            />
          </div>

          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Forgot Password?
            </h1>
            <p className="text-muted-foreground">
              No worries! Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                className={error ? "border-destructive" : ""}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Remember your password?{" "}
              <Link to={getBackLink()} className="text-accent hover:text-accent-hover font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPassword;
