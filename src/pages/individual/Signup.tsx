import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, UserPlus, Loader2 } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthIndicator } from "@/components/ui/PasswordStrengthIndicator";

const IndividualSignup = () => {
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

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/individual/dashboard');
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
    if (!validateForm()) return;
    setIsLoading(true);
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email, password,
        options: {
          emailRedirectTo: `${window.location.origin}/individual/dashboard`,
          data: { role: 'individual', full_name: fullName }
        }
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setErrors({ email: "Email already registered. Please login." });
        } else {
          toast({ title: "Signup Failed", description: authError.message, variant: "destructive" });
        }
        return;
      }

      if (authData.user) {
        await supabase.from("profiles").upsert({
          id: authData.user.id, email, full_name: fullName, mobile, role: 'individual',
        });
        await supabase.from("user_roles").upsert(
          { user_id: authData.user.id, role: 'individual' as any },
          { onConflict: 'user_id,role' }
        );
        await refreshProfile();

        supabase.functions.invoke('send-welcome-email', {
          body: { email, fullName, role: 'individual' }
        }).catch(err => console.error("Welcome email failed:", err));
      }

      toast({ title: "Account Created!", description: "Welcome to Gradia" });
      navigate('/individual/dashboard');
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
            <div className="w-14 h-14 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
              <UserPlus className="h-7 w-7 text-purple-500" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Individual Sign Up</h1>
            <p className="text-sm text-muted-foreground mt-1">Explore services, courses & find mentors</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Full Name</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" />
              {errors.fullName && <p className="text-xs text-destructive mt-1">{errors.fullName}</p>}
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
            <div>
              <Label>Mobile Number</Label>
              <Input value={mobile} onChange={e => setMobile(e.target.value)} placeholder="10-digit mobile" maxLength={10} />
              {errors.mobile && <p className="text-xs text-destructive mt-1">{errors.mobile}</p>}
            </div>
            <div>
              <Label>Password</Label>
              <PasswordInput value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" />
              <PasswordStrengthIndicator password={password} />
              {errors.password && <p className="text-xs text-destructive mt-1">{errors.password}</p>}
            </div>
            <div>
              <Label>Confirm Password</Label>
              <PasswordInput value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter password" />
              {errors.confirmPassword && <p className="text-xs text-destructive mt-1">{errors.confirmPassword}</p>}
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

export default IndividualSignup;
