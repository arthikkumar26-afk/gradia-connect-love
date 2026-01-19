import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Users, Target, BarChart, Shield, Sparkles, Calendar, FileText, Award, Briefcase, GraduationCap, CheckCircle, Check } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PasswordStrengthIndicator } from "@/components/ui/PasswordStrengthIndicator";

interface FormErrors {
  fullName?: string;
  email?: string;
  mobile?: string;
  password?: string;
  confirmPassword?: string;
}

type WizardStep = 'signup' | 'benefits' | 'agreement' | 'terms';

const wizardSteps = [
  { id: 'signup' as const, label: 'Create Account', stepNumber: 1 },
  { id: 'benefits' as const, label: 'Benefits', stepNumber: 2 },
  { id: 'agreement' as const, label: 'Agreement', stepNumber: 3 },
  { id: 'terms' as const, label: 'Terms & Conditions', stepNumber: 4 },
];

const benefits = [
  {
    icon: Briefcase,
    title: 'Access to Top Jobs',
    description: 'Browse and apply for thousands of verified job opportunities from leading companies across industries.',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Job Matching',
    description: 'Our AI technology matches you with jobs that fit your skills, experience, and career preferences.',
  },
  {
    icon: Calendar,
    title: 'Easy Interview Scheduling',
    description: 'Get interview invitations and schedule them at your convenience with automated reminders.',
  },
  {
    icon: FileText,
    title: 'Resume Builder',
    description: 'Create professional resumes with our easy-to-use builder and templates.',
  },
  {
    icon: GraduationCap,
    title: 'Skill Development',
    description: 'Access learning resources and courses to enhance your skills and increase your employability.',
  },
  {
    icon: Award,
    title: 'Mock Interviews',
    description: 'Practice with AI-powered mock interviews to prepare and boost your confidence.',
  },
  {
    icon: Target,
    title: 'Career Guidance',
    description: 'Get personalized career advice and insights to help you make informed decisions.',
  },
  {
    icon: CheckCircle,
    title: 'Application Tracking',
    description: 'Track all your job applications in one place and never miss an opportunity.',
  },
];

const CandidateSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('signup');
  
  // Form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Agreement state
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  
  // Terms state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsScrolledToEnd, setTermsScrolledToEnd] = useState(false);
  const termsScrollRef = useRef<HTMLDivElement>(null);
  
  // Retry error state
  const [retryError, setRetryError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && currentStep === 'signup') {
      // If already authenticated, skip to benefits
      setCurrentStep('benefits');
    }
  }, [isAuthenticated, currentStep]);

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
      const redirectUrl = `${window.location.origin}/candidate/signup`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: 'candidate',
            full_name: fullName,
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
            role: 'candidate',
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }
      }

      toast({
        title: "Account Created!",
        description: "Explore the benefits of joining Gradia",
      });

      // Move to next step instead of navigating
      setCurrentStep('benefits');
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

  const handleAgreementContinue = async () => {
    if (!agreementAccepted) {
      toast({ title: 'Please accept the agreement', variant: 'destructive' });
      return;
    }

    setCurrentStep('terms');
  };

  const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 20 && !termsScrolledToEnd) {
      setTermsScrolledToEnd(true);
    }
  };

  const handleTermsContinue = async () => {
    if (!termsScrolledToEnd) {
      toast({ title: 'Please scroll to the end of the terms', variant: 'destructive' });
      return;
    }
    if (!termsAccepted) {
      toast({ title: 'Please accept the terms', variant: 'destructive' });
      return;
    }

    toast({ title: 'Welcome to Gradia!', description: 'Your account is ready' });
    navigate('/candidate/dashboard');
  };

  const goBack = () => {
    const stepOrder: WizardStep[] = ['signup', 'benefits', 'agreement', 'terms'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const getCurrentStepIndex = () => {
    return wizardSteps.findIndex(s => s.id === currentStep);
  };

  // Progress indicator component
  const ProgressIndicator = () => {
    const currentIndex = getCurrentStepIndex();
    const displaySteps = wizardSteps.slice(1); // Skip 'signup' for display after signup

    if (currentStep === 'signup') return null;

    return (
      <div className="w-full max-w-3xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          {displaySteps.map((step, index) => {
            const actualIndex = index;
            const stepCurrentIndex = currentIndex - 1;
            const isCompleted = actualIndex < stepCurrentIndex;
            const isCurrent = actualIndex === stepCurrentIndex;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : isCurrent
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium text-center ${
                      isCurrent ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < displaySteps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 -mt-8 transition-colors ${
                      isCompleted ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render signup form step
  const renderSignupStep = () => (
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
            Launch Your Career Today
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join thousands of candidates who found their dream jobs with Gradia
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
              <h3 className="font-semibold text-foreground mb-1">Top Job Opportunities</h3>
              <p className="text-sm text-muted-foreground">
                Access verified jobs from leading companies across industries
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-accent" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Smart Job Matching</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered matching to find jobs that fit your skills and preferences
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <BarChart className="h-6 w-6 text-accent" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Track Applications</h3>
              <p className="text-sm text-muted-foreground">
                Monitor all your applications and interview schedules in one place
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-accent" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Verified Employers</h3>
              <p className="text-sm text-muted-foreground">
                Apply with confidence to companies verified by Gradia
              </p>
            </div>
          </div>
        </div>

        {/* Onboarding Steps */}
        <div className="mt-8 p-4 bg-card/50 rounded-lg border border-border">
          <h4 className="font-medium text-foreground mb-3">Your Journey to Success</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">1</div>
              <span className="font-medium">Create Account</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">2</div>
              <span>View Benefits</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">3</div>
              <span>Accept Agreement</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">4</div>
              <span>Accept Terms & Conditions</span>
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
                setMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                if (errors.mobile) setErrors({ ...errors, mobile: undefined });
              }}
              className={errors.mobile ? "border-destructive" : ""}
            />
            {errors.mobile && <p className="text-sm text-destructive">{errors.mobile}</p>}
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
            {isLoading ? "Creating Account..." : "Continue"}
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
          Looking to hire?{" "}
          <Link to="/employer/signup" className="text-accent hover:underline font-medium">
            Sign up as an Employer
          </Link>
        </p>
      </div>
    </div>
  );

  // Render benefits step
  const renderBenefitsStep = () => (
    <div className="w-full max-w-4xl">
      <ProgressIndicator />
      <Card className="w-full p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={gradiaLogo} alt="Gradia" className="h-16 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Benefits for Candidates</h1>
          <p className="text-muted-foreground mt-2">
            Discover the advantages of joining Gradia Connect for your career journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <benefit.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={goBack} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
          <Button onClick={() => setCurrentStep('agreement')} className="flex-1">
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );

  // Render agreement step
  const renderAgreementStep = () => (
    <div className="w-full max-w-4xl">
      <ProgressIndicator />
      <Card className="w-full p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={gradiaLogo} alt="Gradia" className="h-16 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Candidate Agreement</h1>
          <p className="text-muted-foreground mt-2">
            Please review and accept the following agreement to continue.
          </p>
        </div>

        <ScrollArea className="h-[300px] rounded-md border p-6 mb-6 bg-muted/30">
          <div className="prose prose-sm max-w-none">
            <h2 className="text-xl font-semibold mb-4">Candidate Service Agreement</h2>
            
            <h3 className="text-lg font-semibold mt-6 mb-3">1. Introduction</h3>
            <p className="text-muted-foreground mb-4">
              This Service Agreement is entered into between the Candidate and Gradia Connect platform for the provision of job placement services.
            </p>
            <h3 className="text-lg font-semibold mt-6 mb-3">2. Services Provided</h3>
            <p className="text-muted-foreground mb-4">
              Our platform provides comprehensive job search solutions including job listings, application management, resume building, and interview preparation tools.
            </p>
            <h3 className="text-lg font-semibold mt-6 mb-3">3. Candidate Responsibilities</h3>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>Provide accurate and truthful information in your profile and applications</li>
              <li>Maintain professional conduct in all interactions with employers</li>
              <li>Keep your profile and resume updated</li>
              <li>Respond to employer communications in a timely manner</li>
            </ul>
            <h3 className="text-lg font-semibold mt-6 mb-3">4. Platform Usage</h3>
            <p className="text-muted-foreground mb-4">
              The platform is provided free for candidates. We may offer premium features in the future for enhanced job search capabilities.
            </p>
            <p className="text-muted-foreground mt-8 italic">Last updated: January 2025</p>
          </div>
        </ScrollArea>

        <div className="flex items-start gap-3 mb-6 p-4 bg-muted/50 rounded-md">
          <Checkbox id="accept-agreement" checked={agreementAccepted} onCheckedChange={(checked) => setAgreementAccepted(checked as boolean)} />
          <label htmlFor="accept-agreement" className="text-sm leading-relaxed cursor-pointer">
            I have read and agree to the Candidate Agreement
          </label>
        </div>

        {retryError && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            {retryError}
          </div>
        )}

        <div className="flex gap-4">
          <Button variant="outline" onClick={goBack} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
          <Button onClick={handleAgreementContinue} disabled={!agreementAccepted || isLoading} className="flex-1">
            {isLoading ? 'Processing...' : 'I Agree & Continue'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );

  // Render terms step
  const renderTermsStep = () => (
    <div className="w-full max-w-4xl">
      <ProgressIndicator />
      <Card className="w-full p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={gradiaLogo} alt="Gradia" className="h-16 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Terms & Conditions</h1>
          <p className="text-muted-foreground mt-2">Please read and accept the terms & conditions to complete your registration.</p>
        </div>

        <div ref={termsScrollRef} className="h-[400px] rounded-md border p-6 mb-6 bg-muted/30 overflow-y-auto" onScroll={handleTermsScroll}>
          <div className="prose prose-sm max-w-none">
            <h2 className="text-xl font-semibold mb-4">Terms and Conditions of Use</h2>
            <h3 className="text-lg font-semibold mt-6 mb-3">1. Acceptance of Terms</h3>
            <p className="text-muted-foreground mb-4">By accessing this platform, you agree to these Terms and Conditions.</p>
            <h3 className="text-lg font-semibold mt-6 mb-3">2. Account Registration</h3>
            <p className="text-muted-foreground mb-4">You must provide accurate information during registration and keep your account secure.</p>
            <h3 className="text-lg font-semibold mt-6 mb-3">3. Use of Platform</h3>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>No false or misleading information in profiles or applications</li>
              <li>No harassment of employers or other users</li>
              <li>No unauthorized access attempts</li>
              <li>No spamming or mass application submissions</li>
            </ul>
            <h3 className="text-lg font-semibold mt-6 mb-3">4. Privacy and Data</h3>
            <p className="text-muted-foreground mb-4">Your data is processed as per our Privacy Policy. Your profile may be visible to employers.</p>
            <h3 className="text-lg font-semibold mt-6 mb-3">5. Service Availability</h3>
            <p className="text-muted-foreground mb-4">We strive to maintain platform availability but do not guarantee uninterrupted access.</p>
            <h3 className="text-lg font-semibold mt-6 mb-3">6. Limitation of Liability</h3>
            <p className="text-muted-foreground mb-4">We are not responsible for employment outcomes or employer actions.</p>
            <h3 className="text-lg font-semibold mt-6 mb-3">7. Termination</h3>
            <p className="text-muted-foreground mb-4">We may terminate your account if you breach these Terms.</p>
            <p className="text-muted-foreground mt-8 italic">Last updated: January 2025</p>
          </div>
        </div>

        {!termsScrolledToEnd && (
          <div className="text-sm text-amber-600 mb-4 flex items-center gap-2">
            <span>⚠️</span><span>Please scroll to the end to enable the checkbox</span>
          </div>
        )}

        <div className="flex items-start gap-3 mb-6 p-4 bg-muted/50 rounded-md">
          <Checkbox id="accept-terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked as boolean)} disabled={!termsScrolledToEnd} />
          <label htmlFor="accept-terms" className={`text-sm cursor-pointer ${!termsScrolledToEnd ? 'text-muted-foreground' : ''}`}>
            I have read and accept the Terms & Conditions
          </label>
        </div>

        {retryError && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">{retryError}</div>}

        <div className="flex gap-4">
          <Button variant="outline" onClick={goBack} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
          <Button onClick={handleTermsContinue} disabled={!termsAccepted || isLoading || !termsScrolledToEnd} className="flex-1">
            {isLoading ? 'Processing...' : 'Accept & Get Started'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4 py-12">
      {currentStep === 'signup' && renderSignupStep()}
      {currentStep === 'benefits' && renderBenefitsStep()}
      {currentStep === 'agreement' && renderAgreementStep()}
      {currentStep === 'terms' && renderTermsStep()}
    </div>
  );
};

export default CandidateSignup;
