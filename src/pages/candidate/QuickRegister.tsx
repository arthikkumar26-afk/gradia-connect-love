import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Briefcase, GraduationCap, Building2, Users } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Domain configuration with their specific options
const domainConfig = {
  education: {
    label: "Education",
    icon: GraduationCap,
    categories: ["Academic", "Non-Academic"],
    segments: ["Pre-Primary", "Primary", "HSC", "Competitive"],
    departments: [
      "Telugu",
      "Hindi",
      "English",
      "Mathematics",
      "Science",
      "Social Studies",
      "Physical Education",
      "Computer Science",
      "Arts",
      "Music"
    ],
    designations: ["Teacher", "Vice Principal", "Principal", "HOD", "Coordinator", "Counselor"]
  },
  it: {
    label: "IT",
    icon: Building2,
    categories: ["Development", "Infrastructure", "Support"],
    segments: ["Frontend", "Backend", "Full Stack", "DevOps", "QA"],
    departments: [
      "Web Development",
      "Mobile Development",
      "Data Science",
      "Cloud Computing",
      "Cybersecurity",
      "AI/ML"
    ],
    designations: ["Junior Developer", "Senior Developer", "Team Lead", "Manager", "Architect"]
  },
  "non-it": {
    label: "Non-IT",
    icon: Users,
    categories: ["Operations", "Sales", "HR", "Finance"],
    segments: ["Entry Level", "Mid Level", "Senior Level", "Executive"],
    departments: [
      "Human Resources",
      "Marketing",
      "Sales",
      "Operations",
      "Finance",
      "Administration"
    ],
    designations: ["Executive", "Manager", "Senior Manager", "Director", "VP"]
  },
  healthcare: {
    label: "Healthcare",
    icon: Briefcase,
    categories: ["Clinical", "Non-Clinical"],
    segments: ["Hospital", "Clinic", "Diagnostics", "Pharma"],
    departments: [
      "Nursing",
      "Pharmacy",
      "Lab Technician",
      "Radiology",
      "Administration"
    ],
    designations: ["Nurse", "Pharmacist", "Technician", "Doctor", "Specialist"]
  }
};

const preferredLocations = [
  "Area-1 (Hyderabad)",
  "Area-2 (Secunderabad)",
  "Area-3 (Gachibowli)",
  "Area-4 (Kukatpally)",
  "Area-5 (Madhapur)",
  "Area-6 (Ameerpet)",
  "Area-7 (Dilsukhnagar)",
  "Area-8 (LB Nagar)"
];

const QuickRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    preferredLocations: [] as string[],
    domain: "",
    category: "",
    segment: "",
    department: "",
    designation: "",
    currentSalary: "",
    expectedSalary: "",
    dateOfJoining: "",
    password: "",
    confirmPassword: ""
  });

  const selectedDomain = formData.domain as keyof typeof domainConfig;
  const domainOptions = selectedDomain ? domainConfig[selectedDomain] : null;

  const handleLocationChange = (location: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        preferredLocations: [...prev.preferredLocations, location]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        preferredLocations: prev.preferredLocations.filter(l => l !== location)
      }));
    }
  };

  const handleDomainChange = (domain: string) => {
    setFormData(prev => ({
      ...prev,
      domain,
      category: "",
      segment: "",
      department: "",
      designation: ""
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (formData.preferredLocations.length === 0) {
      toast({
        title: "Location Required",
        description: "Please select at least one preferred location.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: formData.fullName,
            role: "candidate"
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create profile with additional fields
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({
            id: authData.user.id,
            email: formData.email,
            full_name: formData.fullName,
            mobile: formData.mobile,
            role: "candidate",
            segment: formData.domain,
            preferred_role: formData.designation,
            preferred_state: formData.preferredLocations.join(", "),
            experience_level: formData.segment,
            primary_subject: formData.department
          });

        if (profileError) {
          console.error("Profile error:", profileError);
        }
      }

      toast({
        title: "Registration Successful!",
        description: "Your account has been created. You can now login.",
      });

      navigate("/candidate/login");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-subtle to-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground py-8">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-secondary/80" />
        
        <div className="relative z-10 container mx-auto px-4">
          <Link 
            to="/" 
            className="inline-flex items-center text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          
          <div className="flex items-center justify-center mb-3">
            <img 
              src={gradiaLogo} 
              alt="Gradia" 
              className="h-14 w-auto object-contain bg-white/10 rounded-lg p-2"
            />
          </div>
          
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Quick Registration
            </h1>
            <p className="text-sm text-primary-foreground/90">
              Fill in your details to get started with Gradia
            </p>
          </div>
        </div>
      </section>

      {/* Form Content */}
      <div className="container mx-auto px-4 py-6 max-w-2xl">
        <Card className="shadow-medium">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Registration Form</CardTitle>
            <CardDescription>
              Complete your profile to find the best job opportunities
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="mobile">Mobile Number *</Label>
                    <Input
                      id="mobile"
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                      placeholder="+91 9876543210"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Preferred Locations */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Preferred Locations *
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {preferredLocations.map((location) => (
                    <div key={location} className="flex items-center space-x-2">
                      <Checkbox
                        id={location}
                        checked={formData.preferredLocations.includes(location)}
                        onCheckedChange={(checked) => handleLocationChange(location, checked as boolean)}
                      />
                      <Label htmlFor={location} className="text-sm cursor-pointer">
                        {location.split(" ")[0]}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Interested In (Domain) */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Interested In *
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(domainConfig).map(([key, config]) => {
                    const Icon = config.icon;
                    const isSelected = formData.domain === key;
                    return (
                      <Button
                        key={key}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        className={`h-auto py-3 flex flex-col items-center gap-1 ${isSelected ? "" : "hover:bg-accent/10"}`}
                        onClick={() => handleDomainChange(key)}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs">{config.label}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Domain-specific fields */}
              {domainOptions && (
                <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                  <h3 className="font-semibold text-foreground">
                    {domainOptions.label} Details
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category *</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {domainOptions.categories.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Segment *</Label>
                      <Select
                        value={formData.segment}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, segment: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select segment" />
                        </SelectTrigger>
                        <SelectContent>
                          {domainOptions.segments.map((seg) => (
                            <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Department *</Label>
                      <Select
                        value={formData.department}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {domainOptions.departments.map((dept) => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Designation *</Label>
                      <Select
                        value={formData.designation}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, designation: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select designation" />
                        </SelectTrigger>
                        <SelectContent>
                          {domainOptions.designations.map((des) => (
                            <SelectItem key={des} value={des}>{des}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Salary & Joining */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Salary & Availability
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentSalary">Current Salary (₹)</Label>
                    <Input
                      id="currentSalary"
                      type="number"
                      value={formData.currentSalary}
                      onChange={(e) => setFormData(prev => ({ ...prev, currentSalary: e.target.value }))}
                      placeholder="e.g., 500000"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expectedSalary">Expected Salary (₹)</Label>
                    <Input
                      id="expectedSalary"
                      type="number"
                      value={formData.expectedSalary}
                      onChange={(e) => setFormData(prev => ({ ...prev, expectedSalary: e.target.value }))}
                      placeholder="e.g., 700000"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="dateOfJoining">Available from</Label>
                    <Input
                      id="dateOfJoining"
                      type="date"
                      value={formData.dateOfJoining}
                      onChange={(e) => setFormData(prev => ({ ...prev, dateOfJoining: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div className="space-y-4">
                <h3 className="font-semibold text-foreground">Create Password</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Min 6 characters"
                      minLength={6}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password *</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Re-enter password"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSubmitting || !formData.domain}
                >
                  {isSubmitting ? "Registering..." : "Complete Registration"}
                </Button>
                
                <p className="text-center text-sm text-muted-foreground mt-4">
                  Already have an account?{" "}
                  <Link to="/candidate/login" className="text-accent hover:underline font-medium">
                    Login here
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuickRegister;
