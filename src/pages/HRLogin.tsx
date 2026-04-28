import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Users } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const HRLogin = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { profile, isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated && profile) {
      if ((profile.role as string) === "hr") {
        navigate("/hr/dashboard");
      } else {
        toast({
          title: "Access Denied",
          description: "This login is for HR accounts only.",
          variant: "destructive",
        });
        supabase.auth.signOut();
      }
    }
  }, [isAuthenticated, profile, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast({ title: "Login Failed", description: error.message, variant: "destructive" });
        return;
      }
      const { data: prof } = await supabase.from("profiles").select("role").eq("id", data.user.id).single();
      if (prof?.role !== "hr") {
        toast({
          title: "Access Denied",
          description: `This login is for HR only. Your account is registered as ${prof?.role}.`,
          variant: "destructive",
        });
        await supabase.auth.signOut();
        return;
      }
      toast({ title: "Welcome", description: "Signed in to HR portal" });
      navigate("/hr/dashboard");
    } catch (err: any) {
      toast({ title: "Error", description: err.message ?? "Login failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-subtle px-4 py-6">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-accent transition-colors mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        <div className="bg-card rounded-lg shadow-large p-6 animate-scale-in">
          <div className="flex justify-center mb-4">
            <img src={gradiaLogo} alt="Gradia" className="h-14 w-auto object-contain" />
          </div>
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-pink-100 dark:bg-pink-900 mb-2">
              <Users className="h-5 w-5 text-pink-600 dark:text-pink-300" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">HR Login</h1>
            <p className="text-sm text-muted-foreground">Sign in to your HR account</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="hr@company.com" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <PasswordInput id="password" placeholder="Enter your password" value={password}
                onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button type="submit" variant="cta" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            HR accounts are created by your linked Employer. Contact your Employer admin if you need access.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HRLogin;
