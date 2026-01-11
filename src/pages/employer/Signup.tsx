import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users, Target, BarChart, Shield } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PasswordStrengthIndicator } from "@/components/ui/PasswordStrengthIndicator";

const companyCategories = [
  "IT & Technology",
  "Education",
  "Healthcare",
  "Finance & Banking",
  "Manufacturing",
  "Retail & E-commerce",
  "Consulting",
  "Other"
];

interface FormErrors {
  companyName?: string;
  companyCategory?: string;
  contactPerson?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

const EmployerSignup = () => {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [companyCategory, setCompanyCategory] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/employer/agreement");
    }
  }, [isAuthenticated, navigate]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }

    if (!companyCategory) {
      newErrors.companyCategory = "Please select a company category";
    }

    if (!contactPerson.trim()) {
      newErrors.contactPerson = "Contact person name is required";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const redirectUrl = `${window.location.origin}/employer/agreement`;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            role: 'employer',
            company_name: companyName,
            company_category: companyCategory,
            full_name: contactPerson,
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
        // Create or update profile with company details
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: authData.user.id,
            email: email,
            full_name: contactPerson,
            company_name: companyName,
            role: 'employer',
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
        }
      }

      toast({
        title: "Account Created!",
        description: "Please review and accept the agreement to continue",
      });

      navigate("/employer/agreement");
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
    <div className="min-h-screen flex items-center justify-center bg-subtle px-4 py-12">
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
              Find Top Talent Faster
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Join leading companies using Gradia to build exceptional teams
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-accent" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Quality Candidates</h3>
                <p className="text-sm text-muted-foreground">
                  Access a pool of pre-vetted, skilled professionals ready to join your team
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
                <h3 className="font-semibold text-foreground mb-1">Smart Matching</h3>
                <p className="text-sm text-muted-foreground">
                  AI-powered candidate matching to find the perfect fit for your roles
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
                <h3 className="font-semibold text-foreground mb-1">Analytics Dashboard</h3>
                <p className="text-sm text-muted-foreground">
                  Track hiring metrics and optimize your recruitment process
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
                <h3 className="font-semibold text-foreground mb-1">Secure & Compliant</h3>
                <p className="text-sm text-muted-foreground">
                  Background verification and screening tools built-in
                </p>
              </div>
            </div>
          </div>

          {/* Onboarding Steps */}
          <div className="mt-8 p-4 bg-card/50 rounded-lg border border-border">
            <h4 className="font-medium text-foreground mb-3">Your Hiring Journey</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">1</div>
                <span className="font-medium">Create Account</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">2</div>
                <span>Accept Agreement</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">3</div>
                <span>Accept Terms & Conditions</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">4</div>
                <span>Choose a Plan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="bg-card rounded-lg shadow-large p-8 animate-scale-in">
          {/* Mobile back button */}
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
              Create Employer Account
            </h1>
            <p className="text-muted-foreground">
              Join Gradia to find top talent
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name <span className="text-destructive">*</span></Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Enter your company name"
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  if (errors.companyName) setErrors({ ...errors, companyName: undefined });
                }}
                className={errors.companyName ? "border-destructive" : ""}
                aria-invalid={!!errors.companyName}
                aria-describedby={errors.companyName ? "companyName-error" : undefined}
              />
              {errors.companyName && (
                <p id="companyName-error" className="text-sm text-destructive">{errors.companyName}</p>
              )}
            </div>

            {/* Company Category */}
            <div className="space-y-2">
              <Label htmlFor="companyCategory">Company Category <span className="text-destructive">*</span></Label>
              <Select 
                value={companyCategory} 
                onValueChange={(value) => {
                  setCompanyCategory(value);
                  if (errors.companyCategory) setErrors({ ...errors, companyCategory: undefined });
                }}
              >
                <SelectTrigger 
                  id="companyCategory"
                  className={errors.companyCategory ? "border-destructive" : ""}
                  aria-invalid={!!errors.companyCategory}
                  aria-describedby={errors.companyCategory ? "companyCategory-error" : undefined}
                >
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {companyCategories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.companyCategory && (
                <p id="companyCategory-error" className="text-sm text-destructive">{errors.companyCategory}</p>
              )}
            </div>

            {/* Contact Person Name */}
            <div className="space-y-2">
              <Label htmlFor="contactPerson">Contact Person Name <span className="text-destructive">*</span></Label>
              <Input
                id="contactPerson"
                type="text"
                placeholder="Enter your full name"
                value={contactPerson}
                onChange={(e) => {
                  setContactPerson(e.target.value);
                  if (errors.contactPerson) setErrors({ ...errors, contactPerson: undefined });
                }}
                className={errors.contactPerson ? "border-destructive" : ""}
                aria-invalid={!!errors.contactPerson}
                aria-describedby={errors.contactPerson ? "contactPerson-error" : undefined}
              />
              {errors.contactPerson && (
                <p id="contactPerson-error" className="text-sm text-destructive">{errors.contactPerson}</p>
              )}
            </div>

            {/* Work Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Work Email <span className="text-destructive">*</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="employer@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: undefined });
                }}
                className={errors.email ? "border-destructive" : ""}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {errors.email && (
                <p id="email-error" className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            {/* Password */}
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
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              <PasswordStrengthIndicator password={password} />
              {errors.password && (
                <p id="password-error" className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
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
                aria-invalid={!!errors.confirmPassword}
                aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
              />
              {errors.confirmPassword && (
                <p id="confirmPassword-error" className="text-sm text-destructive">{errors.confirmPassword}</p>
              )}
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
              <Link to="/employer/login">Login</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground md:col-span-2">
          <p>
            Looking for a job?{" "}
            <Link to="/candidate/signup" className="text-accent hover:text-accent-hover transition-colors font-medium">
              Create candidate account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default EmployerSignup;