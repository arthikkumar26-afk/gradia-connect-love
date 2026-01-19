import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Briefcase, FileText, TrendingUp, GraduationCap } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PasswordStrengthIndicator } from "@/components/ui/PasswordStrengthIndicator";

const experienceLevels = [
  "Fresher (0-1 years)",
  "Junior (1-3 years)",
  "Mid-Level (3-5 years)",
  "Senior (5-8 years)",
  "Expert (8+ years)"
];

const qualifications = [
  "High School",
  "Diploma",
  "Bachelor's Degree",
  "Master's Degree",
  "PhD",
  "Other"
];

interface FormErrors {
  fullName?: string;
  email?: string;
  mobile?: string;
  qualification?: string;
  experienceLevel?: string;
  password?: string;
  confirmPassword?: string;
}

const CandidateSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, profile, refreshProfile } = useAuth();
  
  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [qualification, setQualification] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated && profile) {
      navigate("/candidate/dashboard");
    }
  }, [isAuthenticated, profile, navigate]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^[6-9]\d{9}$/.test(mobile)) {
      newErrors.mobile = "Please enter a valid 10-digit mobile number";
    }

    if (!qualification) {
      newErrors.qualification = "Please select your qualification";
    }

    if (!experienceLevel) {
      newErrors.experienceLevel = "Please select your experience level";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/candidate/dashboard`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: 'candidate',
            full_name: fullName,
            mobile: mobile,
            highest_qualification: qualification,
            experience_level: experienceLevel,
          }
        }
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setErrors({ email: "This email is already registered. Please login instead." });
        } else {
          toast({
            title: "Signup Failed",
            description: authError.message,
            variant: "destructive",
          });
        }
        return;
      }

      if (authData.user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: authData.user.id,
            email: email,
            full_name: fullName,
            mobile: mobile,
            highest_qualification: qualification,
            experience_level: experienceLevel,
            role: 'candidate',
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }
      }

      toast({
        title: "Account Created!",
        description: "Welcome to Gradia. Start exploring job opportunities.",
      });

      // Refresh profile and navigate
      await refreshProfile();
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate("/candidate/dashboard", { replace: true });
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4 py-12">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-start">
        {/* Left Side - Benefits */}
        <div className="hidden md:block space-y-6 animate-fade-in sticky top-8">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-muted-foreground hover:text-accent transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Find Your Dream Job
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join thousands of professionals finding amazing opportunities with Gradia
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-accent" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Access Top Jobs</h3>
                <p className="text-sm text-muted-foreground">
                  Verified job openings from leading companies across industries
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-accent" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">AI-Powered Tools</h3>
                <p className="text-sm text-muted-foreground">
                  Resume parsing & smart interview preparation assistance
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Track Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Real-time application status updates and notifications
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-accent" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Career Growth</h3>
                <p className="text-sm text-muted-foreground">
                  Mock interviews, skill assessments, and learning resources
                </p>
              </div>
            </div>
          </div>

          {/* Journey Steps */}
          <div className="mt-8 p-4 bg-card/50 rounded-lg border border-border">
            <h4 className="font-medium text-foreground mb-3">Your Career Journey</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">1</div>
                <span className="font-medium">Create Account</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">2</div>
                <span>Complete Profile</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">3</div>
                <span>Upload Resume</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">4</div>
                <span>Apply for Jobs</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">5</div>
                <span>Get Hired!</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="bg-card rounded-lg shadow-large p-8 animate-scale-in">
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
              Create Candidate Account
            </h1>
            <p className="text-muted-foreground">
              Join Gradia to find your dream job
            </p>
          </div>

          <form onSubmit={handleSignupSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  if (errors.fullName) setErrors({ ...errors, fullName: undefined });
                }}
                className={errors.fullName ? "border-destructive" : ""}
              />
              {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number <span className="text-destructive">*</span></Label>
              <Input
                id="mobile"
                type="tel"
                placeholder="10-digit mobile number"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  if (errors.mobile) setErrors({ ...errors, mobile: undefined });
                }}
                className={errors.mobile ? "border-destructive" : ""}
              />
              {errors.mobile && <p className="text-sm text-destructive">{errors.mobile}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="qualification">Highest Qualification <span className="text-destructive">*</span></Label>
              <Select 
                value={qualification} 
                onValueChange={(value) => {
                  setQualification(value);
                  if (errors.qualification) setErrors({ ...errors, qualification: undefined });
                }}
              >
                <SelectTrigger className={errors.qualification ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select your qualification" />
                </SelectTrigger>
                <SelectContent>
                  {qualifications.map((qual) => (
                    <SelectItem key={qual} value={qual}>{qual}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.qualification && <p className="text-sm text-destructive">{errors.qualification}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="experienceLevel">Experience Level <span className="text-destructive">*</span></Label>
              <Select 
                value={experienceLevel} 
                onValueChange={(value) => {
                  setExperienceLevel(value);
                  if (errors.experienceLevel) setErrors({ ...errors, experienceLevel: undefined });
                }}
              >
                <SelectTrigger className={errors.experienceLevel ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select your experience level" />
                </SelectTrigger>
                <SelectContent>
                  {experienceLevels.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.experienceLevel && <p className="text-sm text-destructive">{errors.experienceLevel}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors({ ...errors, password: undefined });
                }}
                className={errors.password ? "border-destructive" : ""}
              />
              <PasswordStrengthIndicator password={password} />
              {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                }}
                className={errors.confirmPassword ? "border-destructive" : ""}
              />
              {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
            </div>

            <Button type="submit" variant="cta" size="lg" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

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
              <Link to="/candidate/login">Login</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground md:col-span-2">
          <p>
            Are you an employer?{" "}
            <Link to="/employer/signup" className="text-accent hover:underline font-medium">
              Sign up as an Employer
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CandidateSignup;
