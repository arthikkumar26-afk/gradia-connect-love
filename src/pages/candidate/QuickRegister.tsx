import { useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Calendar, MapPin, GraduationCap, Users, Upload, Loader2, CheckCircle2, Sparkles, IndianRupee, Search, Briefcase, User, Mail, Phone, BookOpen, Award, TrendingUp, AlertCircle, Star } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

interface ResumeAnalysis {
  overall_score: number;
  strengths: string[];
  improvements: string[];
  experience_summary: string;
  skill_highlights: string[];
  career_level: string;
}

// Education designations only
const educationDesignations = ["Teacher", "Vice Principal", "Principal"];

// India states and districts data
const locationData: Record<string, Record<string, string[]>> = {
  "Telangana": {
    "Hyderabad": ["Secunderabad", "Gachibowli", "Kukatpally", "Madhapur", "Ameerpet", "Dilsukhnagar", "LB Nagar", "Banjara Hills", "Jubilee Hills", "Begumpet", "Himayat Nagar", "Kondapur"],
    "Rangareddy": ["Shamshabad", "Mehdipatnam", "Rajendranagar", "Chevella", "Ibrahimpatnam", "Vikarabad"],
    "Medchal-Malkajgiri": ["Kompally", "Alwal", "Bowenpally", "Quthbullapur", "Medchal"],
    "Warangal": ["Hanamkonda", "Kazipet", "Warangal City"],
    "Nizamabad": ["Nizamabad City", "Armoor", "Bodhan"],
    "Karimnagar": ["Karimnagar City", "Ramagundam", "Peddapalli"]
  },
  "Andhra Pradesh": {
    "Visakhapatnam": ["Visakhapatnam City", "Gajuwaka", "Madhurawada", "Seethammadhara", "MVP Colony"],
    "Vijayawada": ["Vijayawada City", "Benz Circle", "Labbipet", "Governorpet"],
    "Guntur": ["Guntur City", "Narasaraopet", "Tenali"],
    "Tirupati": ["Tirupati City", "Tirumala", "Renigunta"],
    "Nellore": ["Nellore City", "Kavali"],
    "Kurnool": ["Kurnool City", "Nandyal"]
  },
  "Karnataka": {
    "Bengaluru Urban": ["Whitefield", "Koramangala", "HSR Layout", "Marathahalli", "Electronic City", "Indiranagar", "Jayanagar", "BTM Layout", "Hebbal"],
    "Bengaluru Rural": ["Devanahalli", "Hoskote", "Nelamangala"],
    "Mysuru": ["Mysuru City", "Gokulam", "Vijayanagar"],
    "Mangaluru": ["Mangaluru City", "Surathkal", "Kankanady"],
    "Hubli-Dharwad": ["Hubli", "Dharwad"]
  },
  "Tamil Nadu": {
    "Chennai": ["T Nagar", "Adyar", "Anna Nagar", "Velachery", "Porur", "Nungambakkam", "Mylapore", "Guindy"],
    "Coimbatore": ["Coimbatore City", "RS Puram", "Gandhipuram", "Peelamedu"],
    "Madurai": ["Madurai City", "Anna Nagar", "KK Nagar"],
    "Tiruchirappalli": ["Trichy City", "Srirangam", "Thillai Nagar"],
    "Salem": ["Salem City", "Fairlands"]
  },
  "Maharashtra": {
    "Mumbai": ["Andheri", "Bandra", "Powai", "Dadar", "Worli", "Malad", "Goregaon", "Borivali"],
    "Pune": ["Kothrud", "Hinjewadi", "Koregaon Park", "Viman Nagar", "Hadapsar", "Baner"],
    "Nagpur": ["Nagpur City", "Dharampeth", "Civil Lines"],
    "Nashik": ["Nashik City", "College Road"],
    "Aurangabad": ["Aurangabad City", "CIDCO"]
  }
};

const QuickRegister = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeParsed, setResumeParsed] = useState(false);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSearch2, setLocationSearch2] = useState("");
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [showLocationSuggestions2, setShowLocationSuggestions2] = useState(false);
  
  const [formData, setFormData] = useState({
    // Step 1 fields
    state: "",
    district: "",
    city: "",
    state2: "",
    district2: "",
    city2: "",
    category: "",
    segment: "",
    department: "",
    designation: "",
    currentSalary: "",
    expectedSalary: "",
    noticePeriod: "",
    experienceLevel: "",
    // Step 2 - Personal Details
    fullName: "",
    dateOfBirth: "",
    mobile: "",
    email: "",
    // Educational Details
    highestQualification: "",
    specialization: "",
    university: "",
    yearOfPassing: "",
    // Professional Details
    totalExperience: "",
    currentOrganization: "",
    currentDesignation: "",
    skills: ""
  });

  // Get AI-powered location suggestions based on search
  const getLocationSuggestions = (searchText: string) => {
    if (!searchText.trim()) return [];
    
    const search = searchText.toLowerCase();
    const suggestions: { state: string; district: string; city: string; display: string }[] = [];
    
    Object.entries(locationData).forEach(([state, districts]) => {
      Object.entries(districts).forEach(([district, cities]) => {
        cities.forEach(city => {
          const fullLocation = `${city}, ${district}, ${state}`;
          if (
            city.toLowerCase().includes(search) ||
            district.toLowerCase().includes(search) ||
            state.toLowerCase().includes(search) ||
            fullLocation.toLowerCase().includes(search)
          ) {
            suggestions.push({
              state,
              district,
              city,
              display: fullLocation
            });
          }
        });
      });
    });
    
    return suggestions.slice(0, 8);
  };

  const handleLocationSelect = (suggestion: { state: string; district: string; city: string; display: string }) => {
    setFormData(prev => ({
      ...prev,
      state: suggestion.state,
      district: suggestion.district,
      city: suggestion.city
    }));
    setLocationSearch(suggestion.display);
    setShowLocationSuggestions(false);
  };

  const handleLocationSelect2 = (suggestion: { state: string; district: string; city: string; display: string }) => {
    setFormData(prev => ({
      ...prev,
      state2: suggestion.state,
      district2: suggestion.district,
      city2: suggestion.city
    }));
    setLocationSearch2(suggestion.display);
    setShowLocationSuggestions2(false);
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF, Word document, or image file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    setResumeFile(file);
    setIsParsingResume(true);
    setResumeParsed(false);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-resume`,
        {
          method: 'POST',
          body: formDataToSend,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to analyze resume: ${response.status}`);
      }

      const analysisData = await response.json();
      console.log("Resume analysis data:", analysisData);

      // Store analysis data for later use in email and display
      localStorage.setItem('resumeAnalysis', JSON.stringify(analysisData));
      setResumeAnalysis(analysisData);

      setResumeParsed(true);
      toast({
        title: `Resume Analyzed - Score: ${analysisData.overall_score || 70}/100`,
        description: "View your detailed score breakdown below.",
      });
    } catch (error: any) {
      console.error("Resume analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Could not analyze resume. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsParsingResume(false);
    }
  };

  const validateStep1 = () => {
    if (!formData.state || !formData.district || !formData.city) {
      toast({
        title: "Location Required",
        description: "Please select your preferred location.",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.category) {
      toast({
        title: "Category Required",
        description: "Please select a category.",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.segment) {
      toast({
        title: "Segment Required",
        description: "Please select a segment.",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.department) {
      toast({
        title: "Department Required",
        description: "Please select a department.",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.designation) {
      toast({
        title: "Designation Required",
        description: "Please select a designation.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.fullName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name as per Aadhar.",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.dateOfBirth) {
      toast({
        title: "Date of Birth Required",
        description: "Please enter your date of birth.",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.mobile.trim()) {
      toast({
        title: "Mobile Number Required",
        description: "Please enter your mobile number.",
        variant: "destructive"
      });
      return false;
    }
    if (!formData.email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) return;

    setIsSubmitting(true);

    try {
      // Get stored resume analysis if available
      const storedAnalysis = localStorage.getItem('resumeAnalysis');
      const parsedResumeAnalysis = storedAnalysis ? JSON.parse(storedAnalysis) : null;

      // Prepare data for email
      const emailData = {
        fullName: formData.fullName,
        email: formData.email,
        mobile: formData.mobile,
        dateOfBirth: formData.dateOfBirth,
        category: formData.category,
        segment: formData.segment,
        department: formData.department,
        designation: formData.designation,
        location: `${formData.city}, ${formData.district}, ${formData.state}${formData.city2 ? ` | ${formData.city2}, ${formData.district2}, ${formData.state2}` : ''}`,
        currentSalary: formData.currentSalary,
        expectedSalary: formData.expectedSalary,
        highestQualification: formData.highestQualification,
        specialization: formData.specialization,
        totalExperience: formData.totalExperience,
        currentOrganization: formData.currentOrganization,
        skills: formData.skills,
        resumeAnalysis: parsedResumeAnalysis || resumeAnalysis
      };

      // Send registration email with resume analysis
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-registration-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Service is busy. Please try again in a moment.");
        }
        throw new Error(result.error || "Failed to complete registration");
      }

      // Store registration data for later use
      const registrationData = {
        segment: formData.segment,
        category: formData.category,
        department: formData.department,
        designation: formData.designation,
        preferred_state: formData.state,
        preferred_district: formData.district,
        preferred_state_2: formData.state2 || null,
        preferred_district_2: formData.district2 || null,
        location: emailData.location,
        experience_level: formData.experienceLevel,
        current_salary: formData.currentSalary ? parseFloat(formData.currentSalary) : null,
        expected_salary: formData.expectedSalary ? parseFloat(formData.expectedSalary) : null,
        notice_period: formData.noticePeriod || null,
        full_name: formData.fullName,
        date_of_birth: formData.dateOfBirth,
        mobile: formData.mobile,
        email: formData.email,
        highest_qualification: formData.highestQualification,
        specialization: formData.specialization,
        university: formData.university,
        year_of_passing: formData.yearOfPassing,
        total_experience: formData.totalExperience,
        current_organization: formData.currentOrganization,
        current_designation: formData.currentDesignation,
        skills: formData.skills,
        profile_score: result.score
      };

      localStorage.setItem('quickRegistrationData', JSON.stringify(registrationData));

      // Show appropriate message based on email status
      if (result.emailSent) {
        toast({
          title: "Registration Complete! 🎉",
          description: `Your profile score is ${result.score}/100. Check your email for details!`,
        });
      } else {
        toast({
          title: "Registration Saved! 🎉",
          description: `Your profile score is ${result.score}/100. ${result.message}`,
        });
      }

      // Navigate to candidate signup
      navigate("/candidate/signup");
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

  const locationSuggestions = getLocationSuggestions(locationSearch);
  const locationSuggestions2 = getLocationSuggestions(locationSearch2);

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

      {/* Step Indicator */}
      <div className="container mx-auto px-4 pt-6 max-w-2xl">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${currentStep === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <span className="font-semibold">1</span>
            <span className="text-sm">Job Preferences</span>
          </div>
          <div className="h-1 w-8 bg-muted rounded-full overflow-hidden">
            <div className={`h-full bg-primary transition-all ${currentStep === 2 ? 'w-full' : 'w-0'}`} />
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${currentStep === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            <span className="font-semibold">2</span>
            <span className="text-sm">Personal Details</span>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container mx-auto px-4 py-4 max-w-2xl">
        <Card className="shadow-medium">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">
              {currentStep === 1 ? "Job Preferences" : "Personal Details"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 
                ? "Select your preferred job category, segment, and location"
                : "Enter your personal, educational, and professional details"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {currentStep === 1 ? (
                <>
                  {/* Resume Upload Section */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Resume Analysis (Optional)
                    </h3>
                    
                    <div 
                      className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer hover:border-primary/50 hover:bg-accent/5 ${
                        resumeParsed ? 'border-green-500 bg-green-50/50' : 'border-muted-foreground/25'
                      }`}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={handleResumeUpload}
                        className="hidden"
                      />
                      
                      {isParsingResume ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-10 w-10 text-primary animate-spin" />
                          <p className="text-sm text-muted-foreground">AI is analyzing your resume...</p>
                        </div>
                      ) : resumeParsed ? (
                        <div className="flex flex-col items-center gap-3">
                          <CheckCircle2 className="h-10 w-10 text-green-500" />
                          <div>
                            <p className="font-medium text-green-700">Resume Analyzed Successfully!</p>
                            <p className="text-sm text-muted-foreground">{resumeFile?.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">Click to upload a different resume</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="p-3 bg-primary/10 rounded-full">
                            <Upload className="h-8 w-8 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Upload your resume for AI analysis</p>
                            <p className="text-sm text-muted-foreground">PDF, Word, or Image (max 10MB)</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Resume Score Display */}
                    {resumeAnalysis && resumeParsed && (
                      <div className="space-y-4 p-4 bg-gradient-to-br from-primary/5 to-accent/10 rounded-xl border border-primary/20">
                        {/* Score Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`relative w-16 h-16 rounded-full flex items-center justify-center ${
                              resumeAnalysis.overall_score >= 80 ? 'bg-green-100' :
                              resumeAnalysis.overall_score >= 60 ? 'bg-yellow-100' : 'bg-red-100'
                            }`}>
                              <span className={`text-xl font-bold ${
                                resumeAnalysis.overall_score >= 80 ? 'text-green-700' :
                                resumeAnalysis.overall_score >= 60 ? 'text-yellow-700' : 'text-red-700'
                              }`}>
                                {resumeAnalysis.overall_score}
                              </span>
                              <span className="text-xs text-muted-foreground absolute -bottom-1">/100</span>
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">Resume Score</h4>
                              <p className="text-sm text-muted-foreground">{resumeAnalysis.career_level || 'Professional'}</p>
                            </div>
                          </div>
                          <Star className={`h-6 w-6 ${
                            resumeAnalysis.overall_score >= 80 ? 'text-green-500 fill-green-500' :
                            resumeAnalysis.overall_score >= 60 ? 'text-yellow-500 fill-yellow-500' : 'text-red-500'
                          }`} />
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <Progress 
                            value={resumeAnalysis.overall_score} 
                            className="h-2"
                          />
                          <p className="text-xs text-muted-foreground text-right">
                            {resumeAnalysis.overall_score >= 80 ? 'Excellent' :
                             resumeAnalysis.overall_score >= 60 ? 'Good' : 'Needs Improvement'}
                          </p>
                        </div>

                        {/* Experience Summary */}
                        {resumeAnalysis.experience_summary && (
                          <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                            {resumeAnalysis.experience_summary}
                          </p>
                        )}

                        {/* Strengths */}
                        {resumeAnalysis.strengths && resumeAnalysis.strengths.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-green-700 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Key Strengths
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {resumeAnalysis.strengths.slice(0, 4).map((strength, index) => (
                                <span 
                                  key={index}
                                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full"
                                >
                                  {strength}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Areas for Improvement */}
                        {resumeAnalysis.improvements && resumeAnalysis.improvements.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-amber-700 flex items-center gap-2">
                              <AlertCircle className="h-4 w-4" />
                              Areas to Improve
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {resumeAnalysis.improvements.slice(0, 3).map((improvement, index) => (
                                <span 
                                  key={index}
                                  className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-full"
                                >
                                  {improvement}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Top Skills */}
                        {resumeAnalysis.skill_highlights && resumeAnalysis.skill_highlights.length > 0 && (
                          <div className="space-y-2">
                            <h5 className="text-sm font-medium text-primary flex items-center gap-2">
                              <Award className="h-4 w-4" />
                              Top Skills Detected
                            </h5>
                            <div className="flex flex-wrap gap-2">
                              {resumeAnalysis.skill_highlights.slice(0, 6).map((skill, index) => (
                                <span 
                                  key={index}
                                  className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-primary/10">
                          Complete registration to receive detailed analysis via email
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Basic Information
                    </h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="experienceLevel">Experience</Label>
                      <Input
                        id="experienceLevel"
                        value={formData.experienceLevel}
                        onChange={(e) => setFormData(prev => ({ ...prev, experienceLevel: e.target.value }))}
                        placeholder="e.g., 3 years"
                        className={resumeParsed && formData.experienceLevel ? "border-green-300 bg-green-50/30" : ""}
                      />
                    </div>
                  </div>

                  {/* Preferred Locations - AI Search */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Preferred Locations *
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Location 1 */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Location 1 *</Label>
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={locationSearch}
                              onChange={(e) => {
                                setLocationSearch(e.target.value);
                                setShowLocationSuggestions(true);
                              }}
                              onFocus={() => setShowLocationSuggestions(true)}
                              placeholder="Search area..."
                              className="pl-10"
                            />
                          </div>
                          
                          {showLocationSuggestions && locationSuggestions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {locationSuggestions.map((suggestion, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  className="w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b last:border-b-0 flex items-center gap-3"
                                  onClick={() => handleLocationSelect(suggestion)}
                                >
                                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                                  <div>
                                    <p className="font-medium text-sm">{suggestion.city}</p>
                                    <p className="text-xs text-muted-foreground">{suggestion.district}, {suggestion.state}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {formData.state && (
                          <div className="flex flex-wrap gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                            <span className="text-xs font-medium text-primary">Selected:</span>
                            <span className="text-xs">{formData.city}, {formData.district}, {formData.state}</span>
                          </div>
                        )}
                      </div>

                      {/* Location 2 */}
                      <div className="space-y-3">
                        <Label className="text-sm font-medium">Location 2 (Optional)</Label>
                        <div className="relative">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              value={locationSearch2}
                              onChange={(e) => {
                                setLocationSearch2(e.target.value);
                                setShowLocationSuggestions2(true);
                              }}
                              onFocus={() => setShowLocationSuggestions2(true)}
                              placeholder="Search area..."
                              className="pl-10"
                            />
                          </div>
                          
                          {showLocationSuggestions2 && locationSuggestions2.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                              {locationSuggestions2.map((suggestion, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  className="w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors border-b last:border-b-0 flex items-center gap-3"
                                  onClick={() => handleLocationSelect2(suggestion)}
                                >
                                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                                  <div>
                                    <p className="font-medium text-sm">{suggestion.city}</p>
                                    <p className="text-xs text-muted-foreground">{suggestion.district}, {suggestion.state}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {formData.state2 && (
                          <div className="flex flex-wrap gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20">
                            <span className="text-xs font-medium text-primary">Selected:</span>
                            <span className="text-xs">{formData.city2}, {formData.district2}, {formData.state2}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Category *
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {["Academic", "Non-Academic"].map((cat) => (
                        <Button
                          key={cat}
                          type="button"
                          variant={formData.category === cat ? "default" : "outline"}
                          className={`h-auto py-4 flex flex-col items-center gap-1 ${formData.category === cat ? "" : "hover:bg-accent/10"}`}
                          onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                        >
                          <GraduationCap className="h-5 w-5" />
                          <span className="text-sm">{cat}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Segment */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Segment *
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {["Pre-Primary", "Primary", "HSC", "Competitive"].map((seg) => (
                        <Button
                          key={seg}
                          type="button"
                          variant={formData.segment === seg ? "default" : "outline"}
                          className={`h-auto py-3 ${formData.segment === seg ? "" : "hover:bg-accent/10"}`}
                          onClick={() => setFormData(prev => ({ ...prev, segment: seg }))}
                        >
                          <span className="text-sm">{seg}</span>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Department */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <GraduationCap className="h-4 w-4" />
                      Department *
                    </h3>
                    
                    <Select
                      value={formData.department}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, department: value }))}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Select Department" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="Telugu">Telugu</SelectItem>
                        <SelectItem value="Hindi">Hindi</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Maths">Maths</SelectItem>
                        <SelectItem value="Science">Science</SelectItem>
                        <SelectItem value="Social Studies">Social Studies</SelectItem>
                        <SelectItem value="Physics">Physics</SelectItem>
                        <SelectItem value="Chemistry">Chemistry</SelectItem>
                        <SelectItem value="Biology">Biology</SelectItem>
                        <SelectItem value="Computer Science">Computer Science</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Designation */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Designation *
                    </h3>
                    
                    <Select
                      value={formData.designation}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, designation: value }))}
                    >
                      <SelectTrigger className="w-full bg-background">
                        <SelectValue placeholder="Select Designation" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="Teacher">Teacher</SelectItem>
                        <SelectItem value="Vice Principal">Vice Principal</SelectItem>
                        <SelectItem value="Principal">Principal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Salary & Joining */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <IndianRupee className="h-4 w-4" />
                      Salary & Date of Joining
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
                        <Label htmlFor="noticePeriod">
                          <Calendar className="inline h-3.5 w-3.5 mr-1" />
                          Notice Period
                        </Label>
                        <Select
                          value={formData.noticePeriod}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, noticePeriod: value }))}
                        >
                          <SelectTrigger className="w-full bg-background">
                            <SelectValue placeholder="Select Notice Period" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="Immediate">Immediate</SelectItem>
                            <SelectItem value="15 Days">15 Days</SelectItem>
                            <SelectItem value="30 Days">30 Days</SelectItem>
                            <SelectItem value="45 Days">45 Days</SelectItem>
                            <SelectItem value="60 Days">60 Days</SelectItem>
                            <SelectItem value="90 Days">90 Days</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Next Button */}
                  <div className="pt-4">
                    <Button 
                      type="button" 
                      className="w-full"
                      onClick={handleNext}
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Step 2: Personal Details */}
                  
                  {/* Personal Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Personal Information *
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name (as per Aadhar) *</Label>
                        <Input
                          id="fullName"
                          value={formData.fullName}
                          onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                          placeholder="Enter your full name"
                          className={resumeParsed && formData.fullName ? "border-green-300 bg-green-50/30" : ""}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                        <Input
                          id="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="mobile">
                          <Phone className="inline h-3.5 w-3.5 mr-1" />
                          Mobile Number *
                        </Label>
                        <Input
                          id="mobile"
                          type="tel"
                          value={formData.mobile}
                          onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                          placeholder="Enter mobile number"
                          className={resumeParsed && formData.mobile ? "border-green-300 bg-green-50/30" : ""}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">
                          <Mail className="inline h-3.5 w-3.5 mr-1" />
                          Email Address *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="Enter email address"
                          className={resumeParsed && formData.email ? "border-green-300 bg-green-50/30" : ""}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Educational Details */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Educational Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="highestQualification">Highest Qualification</Label>
                        <Select
                          value={formData.highestQualification}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, highestQualification: value }))}
                        >
                          <SelectTrigger className="w-full bg-background">
                            <SelectValue placeholder="Select Qualification" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="B.Ed">B.Ed</SelectItem>
                            <SelectItem value="M.Ed">M.Ed</SelectItem>
                            <SelectItem value="B.A">B.A</SelectItem>
                            <SelectItem value="M.A">M.A</SelectItem>
                            <SelectItem value="B.Sc">B.Sc</SelectItem>
                            <SelectItem value="M.Sc">M.Sc</SelectItem>
                            <SelectItem value="B.Com">B.Com</SelectItem>
                            <SelectItem value="M.Com">M.Com</SelectItem>
                            <SelectItem value="Ph.D">Ph.D</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="specialization">Specialization</Label>
                        <Input
                          id="specialization"
                          value={formData.specialization}
                          onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                          placeholder="e.g., Mathematics, Physics"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="university">University / Board</Label>
                        <Input
                          id="university"
                          value={formData.university}
                          onChange={(e) => setFormData(prev => ({ ...prev, university: e.target.value }))}
                          placeholder="Enter university name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="yearOfPassing">Year of Passing</Label>
                        <Input
                          id="yearOfPassing"
                          value={formData.yearOfPassing}
                          onChange={(e) => setFormData(prev => ({ ...prev, yearOfPassing: e.target.value }))}
                          placeholder="e.g., 2020"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Professional Details */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-foreground flex items-center gap-2">
                      <Award className="h-4 w-4" />
                      Professional Details
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="totalExperience">Total Experience</Label>
                        <Input
                          id="totalExperience"
                          value={formData.totalExperience}
                          onChange={(e) => setFormData(prev => ({ ...prev, totalExperience: e.target.value }))}
                          placeholder="e.g., 5 years"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="currentOrganization">Current Organization</Label>
                        <Input
                          id="currentOrganization"
                          value={formData.currentOrganization}
                          onChange={(e) => setFormData(prev => ({ ...prev, currentOrganization: e.target.value }))}
                          placeholder="Enter current school/institution"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentDesignation">Current Designation</Label>
                        <Input
                          id="currentDesignation"
                          value={formData.currentDesignation}
                          onChange={(e) => setFormData(prev => ({ ...prev, currentDesignation: e.target.value }))}
                          placeholder="e.g., Senior Teacher"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="skills">Key Skills</Label>
                        <Input
                          id="skills"
                          value={formData.skills}
                          onChange={(e) => setFormData(prev => ({ ...prev, skills: e.target.value }))}
                          placeholder="e.g., Teaching, Curriculum Design"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Navigation Buttons */}
                  <div className="pt-4 flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline"
                      className="flex-1"
                      onClick={handleBack}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Registering..." : "Complete Registration"}
                    </Button>
                  </div>
                </>
              )}

              <p className="text-center text-sm text-muted-foreground mt-4">
                Already have an account?{" "}
                <Link to="/candidate/login" className="text-accent hover:underline font-medium">
                  Login here
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuickRegister;
