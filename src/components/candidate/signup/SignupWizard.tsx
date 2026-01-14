import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PersonalInfoStep } from "./PersonalInfoStep";
import { EducationExperienceStep } from "./EducationExperienceStep";
import { JobPreferencesStep } from "./JobPreferencesStep";
import { StepIndicator } from "./StepIndicator";

export interface CandidateFormData {
  // Account
  email: string;
  password: string;
  confirmPassword: string;
  // Personal Info
  fullName: string;
  dateOfBirth: string;
  mobile: string;
  gender: string;
  // Education & Experience
  highestQualification: string;
  fieldOfStudy: string;
  institution: string;
  graduationYear: string;
  experienceLevel: string;
  currentCompany: string;
  currentRole: string;
  totalExperience: string;
  skills: string[];
  // Job Preferences
  preferredRole: string;
  preferredLocation: string;
  expectedSalary: string;
  jobType: string;
  // Resume
  resumeFile: File | null;
  resumeUrl: string;
  // Profile Picture
  profilePicture: File | null;
  profilePicturePreview: string | null;
}

const initialFormData: CandidateFormData = {
  email: "",
  password: "",
  confirmPassword: "",
  fullName: "",
  dateOfBirth: "",
  mobile: "",
  gender: "",
  highestQualification: "",
  fieldOfStudy: "",
  institution: "",
  graduationYear: "",
  experienceLevel: "",
  currentCompany: "",
  currentRole: "",
  totalExperience: "",
  skills: [],
  preferredRole: "",
  preferredLocation: "",
  expectedSalary: "",
  jobType: "",
  resumeFile: null,
  resumeUrl: "",
  profilePicture: null,
  profilePicturePreview: null,
};

const steps = [
  { id: 1, title: "Personal Info", description: "Basic details" },
  { id: 2, title: "Education & Experience", description: "Your background" },
  { id: 3, title: "Job Preferences", description: "What you're looking for" },
];

export const SignupWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<CandidateFormData>(initialFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [resumeAnalysis, setResumeAnalysis] = useState<{
    overall_score?: number;
    strengths?: string[];
    improvements?: string[];
    experience_summary?: string;
    skill_highlights?: string[];
    career_level?: string;
  } | null>(null);

  // Pre-fill form from URL params (from registration email)
  useEffect(() => {
    const emailParam = searchParams.get('email');
    const nameParam = searchParams.get('name');
    
    if (emailParam || nameParam) {
      const storedData = localStorage.getItem('quickRegistrationData');
      let updates: Partial<CandidateFormData> = {};
      
      if (emailParam) updates.email = emailParam;
      if (nameParam) updates.fullName = nameParam;
      
      // Try to load more data from localStorage
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          if (parsed.mobile) updates.mobile = parsed.mobile;
          if (parsed.date_of_birth) updates.dateOfBirth = parsed.date_of_birth;
          if (parsed.highest_qualification) updates.highestQualification = parsed.highest_qualification;
          if (parsed.total_experience) updates.totalExperience = parsed.total_experience;
          if (parsed.experience_level) updates.experienceLevel = parsed.experience_level;
          if (parsed.location) updates.preferredLocation = parsed.location;
          if (parsed.skills) updates.skills = parsed.skills.split(',').map((s: string) => s.trim()).filter(Boolean);
        } catch (e) {
          console.error('Error parsing stored registration data:', e);
        }
      }
      
      setFormData(prev => ({ ...prev, ...updates }));
      
      toast({
        title: "Welcome back! 👋",
        description: "Your registration details have been pre-filled. Just set a password to create your account.",
      });
    }
  }, [searchParams, toast]);

  const updateFormData = (updates: Partial<CandidateFormData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleResumeUpload = async (file: File) => {
    setIsParsingResume(true);
    updateFormData({ resumeFile: file });

    toast({
      title: "Analyzing resume...",
      description: "AI is extracting your profile details",
    });

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("file", file);

      console.log("Calling parse-resume function...");
      const { data, error } = await supabase.functions.invoke("parse-resume", {
        body: formDataToSend,
      });

      console.log("Parse resume response:", data, error);

      if (error) {
        console.error("Parse resume error:", error);
        throw new Error(error.message || "Failed to parse resume");
      }

      if (!data || data.error) {
        console.error("Parse resume data error:", data?.error);
        throw new Error(data?.error || "Failed to parse resume");
      }

      if (data.note === "parsing_skipped") {
        toast({
          title: "Resume uploaded",
          description: "Please fill in your details manually.",
        });
        setIsParsingResume(false);
        return;
      }

      // Store AI analysis data for saving after signup
      if (data.overall_score !== undefined) {
        setResumeAnalysis({
          overall_score: data.overall_score,
          strengths: data.strengths || [],
          improvements: data.improvements || [],
          experience_summary: data.experience_summary || "",
          skill_highlights: data.skill_highlights || [],
          career_level: data.career_level || "Mid-Level",
        });
      }

      // Auto-fill form fields from AI parsing
      const updates: Partial<CandidateFormData> = {};
      
      if (data.full_name) updates.fullName = data.full_name;
      if (data.mobile) updates.mobile = data.mobile;
      if (data.email) updates.email = data.email;
      if (data.date_of_birth) updates.dateOfBirth = data.date_of_birth;
      if (data.gender) updates.gender = data.gender;
      if (data.experience_level) updates.experienceLevel = data.experience_level;
      if (data.location) updates.preferredLocation = data.location;
      if (data.highest_qualification) updates.highestQualification = data.highest_qualification;
      if (data.field_of_study) updates.fieldOfStudy = data.field_of_study;
      if (data.institution) updates.institution = data.institution;
      if (data.graduation_year) updates.graduationYear = data.graduation_year;
      if (data.current_company) updates.currentCompany = data.current_company;
      if (data.current_role) updates.currentRole = data.current_role;
      if (data.total_experience) updates.totalExperience = data.total_experience;
      if (data.skills && Array.isArray(data.skills)) updates.skills = data.skills;
      if (data.preferred_role) updates.preferredRole = data.preferred_role;

      console.log("Auto-filling fields:", updates);
      updateFormData(updates);

      toast({
        title: "Success!",
        description: "Profile details extracted from your resume. You can edit them if needed.",
      });
    } catch (error) {
      console.error("Error parsing resume:", error);
      toast({
        title: "Resume uploaded",
        description: "Please fill in your details manually.",
        variant: "default",
      });
    } finally {
      setIsParsingResume(false);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.fullName.trim()) {
          toast({ title: "Error", description: "Full name is required", variant: "destructive" });
          return false;
        }
        if (!formData.email.trim()) {
          toast({ title: "Error", description: "Email is required", variant: "destructive" });
          return false;
        }
        if (!formData.password || formData.password.length < 6) {
          toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
          return false;
        }
        if (!formData.mobile.trim()) {
          toast({ title: "Error", description: "Mobile number is required", variant: "destructive" });
          return false;
        }
        return true;
      case 2:
        if (!formData.highestQualification) {
          toast({ title: "Error", description: "Please select your highest qualification", variant: "destructive" });
          return false;
        }
        return true;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);

    try {
      // Sign up user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/candidate/dashboard`,
          data: {
            role: "candidate",
            full_name: formData.fullName,
          },
        },
      });

      if (authError) {
        toast({ title: "Signup Failed", description: authError.message, variant: "destructive" });
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        toast({ title: "Error", description: "Failed to create account", variant: "destructive" });
        return;
      }

      // Upload profile picture if exists
      let profilePictureUrl = null;
      if (formData.profilePicture) {
        const fileExt = formData.profilePicture.name.split(".").pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `profile-pictures/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-pictures")
          .upload(filePath, formData.profilePicture);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from("profile-pictures")
            .getPublicUrl(filePath);
          profilePictureUrl = publicUrl;
        }
      }

      // Upload resume if exists
      let resumeUrl = null;
      if (formData.resumeFile) {
        const fileExt = formData.resumeFile.name.split(".").pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("resumes")
          .upload(filePath, formData.resumeFile);

        if (!uploadError) {
          resumeUrl = filePath;
        }
      }

      // Create profile
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: userId,
        full_name: formData.fullName,
        email: formData.email,
        mobile: formData.mobile,
        date_of_birth: formData.dateOfBirth || null,
        gender: formData.gender || null,
        highest_qualification: formData.highestQualification || null,
        experience_level: formData.experienceLevel || null,
        location: formData.preferredLocation || null,
        preferred_role: formData.preferredRole || null,
        role: "candidate",
        profile_picture: profilePictureUrl,
        resume_url: resumeUrl,
      }, { onConflict: "id" });

      if (profileError) {
        toast({ title: "Error", description: profileError.message, variant: "destructive" });
        return;
      }

      // Save resume analysis if available
      if (resumeAnalysis && resumeAnalysis.overall_score !== undefined) {
        try {
          const { error: analysisError } = await supabase.from("resume_analyses").upsert({
            user_id: userId,
            overall_score: resumeAnalysis.overall_score,
            strengths: resumeAnalysis.strengths || [],
            improvements: resumeAnalysis.improvements || [],
            experience_summary: resumeAnalysis.experience_summary || "",
            skill_highlights: resumeAnalysis.skill_highlights || [],
            career_level: resumeAnalysis.career_level || "Mid-Level",
            analyzed_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

          if (analysisError) {
            console.error("Error saving resume analysis:", analysisError);
          } else {
            console.log("Resume analysis saved successfully");
          }
        } catch (analysisErr) {
          console.error("Failed to save resume analysis:", analysisErr);
        }
      }

      // Send welcome email
      try {
        await supabase.functions.invoke("send-welcome-email", {
          body: {
            email: formData.email,
            fullName: formData.fullName,
            role: "candidate",
          },
        });
      } catch (emailError) {
        console.error("Welcome email failed:", emailError);
      }

      toast({
        title: "Account Created!",
        description: "Welcome to Gradia. Start exploring job opportunities.",
      });

      navigate("/candidate/dashboard");
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

  return (
    <div className="w-full max-w-3xl mx-auto">
      <StepIndicator steps={steps} currentStep={currentStep} />

      <div className="mt-8 bg-card rounded-2xl shadow-large p-6 md:p-8">
        {currentStep === 1 && (
          <PersonalInfoStep
            formData={formData}
            updateFormData={updateFormData}
            onResumeUpload={handleResumeUpload}
            isParsingResume={isParsingResume}
            onNext={handleNext}
          />
        )}

        {currentStep === 2 && (
          <EducationExperienceStep
            formData={formData}
            updateFormData={updateFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        )}

        {currentStep === 3 && (
          <JobPreferencesStep
            formData={formData}
            updateFormData={updateFormData}
            onSubmit={handleSubmit}
            onBack={handleBack}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};
