import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getAllStates, getDistrictsByState, getCitiesByDistrict } from "@/data/indiaLocations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Linkedin, 
  Briefcase, 
  Camera, 
  X, 
  Upload,
  FileText,
  Loader2,
  CheckCircle,
  Lock
} from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrengthIndicator } from "@/components/ui/PasswordStrengthIndicator";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Password updated", description: "Your password has been changed successfully." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Failed to update password", description: err.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };
  const [isDetecting, setIsDetecting] = useState(false);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [detectedLogo, setDetectedLogo] = useState<{ file: File; preview: string } | null>(null);
  const [showLogoConfirmation, setShowLogoConfirmation] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [location, setLocation] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  
  // New candidate fields
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [languages, setLanguages] = useState("");
  const [currentState, setCurrentState] = useState("");
  const [currentDistrict, setCurrentDistrict] = useState("");
  const [currentCity, setCurrentCity] = useState("");
  const [industryCategory, setIndustryCategory] = useState("");
  const [alternateNumber, setAlternateNumber] = useState("");
  const [highestQualification, setHighestQualification] = useState("");
  const [officeType, setOfficeType] = useState("");
  const [preferredState, setPreferredState] = useState("");
  const [preferredDistrict, setPreferredDistrict] = useState("");
  const [preferredState2, setPreferredState2] = useState("");
  const [preferredDistrict2, setPreferredDistrict2] = useState("");
  const [segment, setSegment] = useState("");
  const [program, setProgram] = useState("");
  const [classesHandled, setClassesHandled] = useState("");
  const [batch, setBatch] = useState("");
  const [primarySubject, setPrimarySubject] = useState("");
  const [currentSalary, setCurrentSalary] = useState("");
  const [expectedSalary, setExpectedSalary] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [tempImageForCrop, setTempImageForCrop] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  
  const [resume, setResume] = useState<File | null>(null);
  const [currentResumeUrl, setCurrentResumeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !profile) {
      navigate("/");
      return;
    }

    // Load existing profile data
    setFullName(profile.full_name || "");
    setEmail(profile.email || "");
    setMobile(profile.mobile || "");
    setLocation(profile.location || "");
    setLinkedin(profile.linkedin || "");
    setExperienceLevel(profile.experience_level || "");
    setCompanyName(profile.company_name || "");
    setCompanyDescription(profile.company_description || "");
    setCompanyWebsite(profile.website || "");
    setProfilePicturePreview(profile.profile_picture || null);
    setCurrentResumeUrl(profile.resume_url || null);
    
    // Load new candidate fields
    setDateOfBirth(profile.date_of_birth || "");
    setGender(profile.gender || "");
    setLanguages(profile.languages?.join(", ") || "");
    setCurrentState(profile.current_state || "");
    setCurrentDistrict(profile.current_district || "");
    setCurrentCity(profile.location || "");
    setIndustryCategory(profile.category || "");
    setAlternateNumber(profile.alternate_number || "");
    setHighestQualification(profile.highest_qualification || "");
    setOfficeType(profile.office_type || "");
    setPreferredState(profile.preferred_state || "");
    setPreferredDistrict(profile.preferred_district || "");
    setPreferredState2(profile.preferred_state_2 || "");
    setPreferredDistrict2(profile.preferred_district_2 || "");
    setSegment(profile.segment || "");
    setProgram(profile.program || "");
    setClassesHandled(profile.classes_handled || "");
    setBatch(profile.batch || "");
    setPrimarySubject(profile.primary_subject || "");
    setCurrentSalary(profile.current_salary?.toString() || "");
    setExpectedSalary(profile.expected_salary?.toString() || "");
    setAvailableFrom(profile.available_from || "");
  }, [user, profile, navigate]);

  const handleProfilePictureChange = (file: File) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImageForCrop(reader.result as string);
        setShowCropModal(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedFile = new File([croppedBlob], "profile-picture.jpg", {
      type: "image/jpeg",
    });
    setProfilePicture(croppedFile);
    
    const previewUrl = URL.createObjectURL(croppedBlob);
    setProfilePicturePreview(previewUrl);
    setShowCropModal(false);
    setTempImageForCrop(null);
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setTempImageForCrop(null);
  };

  const removeProfilePicture = () => {
    setProfilePicture(null);
    setProfilePicturePreview(profile?.profile_picture || null);
  };

  const handleKeepDetectedLogo = () => {
    if (detectedLogo) {
      setProfilePicture(detectedLogo.file);
      setProfilePicturePreview(detectedLogo.preview);
      setShowLogoConfirmation(false);
      setDetectedLogo(null);
      toast({
        title: "Logo Added",
        description: "Company logo has been set as your profile picture",
      });
    }
  };

  const handleUploadDifferentLogo = () => {
    setShowLogoConfirmation(false);
    setDetectedLogo(null);
    // Trigger file input
    document.getElementById('profilePicture')?.click();
  };

  const handleSkipLogo = () => {
    setShowLogoConfirmation(false);
    setDetectedLogo(null);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setResume(file);
      
      // Auto-parse resume with AI
      if (profile?.role === 'candidate' || profile?.role === 'freelancer') {
        setIsParsingResume(true);
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-resume`,
            {
              method: 'POST',
              headers: token ? { Authorization: `Bearer ${token}` } : {},
              body: formData,
            }
          );
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to parse resume');
          }
          
          const data = await response.json();
          console.log('AI parsed resume data:', data);
          
          // Auto-fill form fields from parsed data
          if (data.full_name) setFullName(data.full_name);
          if (data.email) setEmail(data.email);
          if (data.mobile) setMobile(data.mobile);
          if (data.date_of_birth) setDateOfBirth(data.date_of_birth);
          if (data.gender) setGender(data.gender);
          if (data.languages && Array.isArray(data.languages)) setLanguages(data.languages.join(', '));
          if (data.current_state) setCurrentState(data.current_state);
          if (data.current_district) setCurrentDistrict(data.current_district);
          if (data.alternate_number) setAlternateNumber(data.alternate_number);
          if (data.highest_qualification) setHighestQualification(data.highest_qualification);
          if (data.office_type) setOfficeType(data.office_type);
          if (data.preferred_state) setPreferredState(data.preferred_state);
          if (data.preferred_district) setPreferredDistrict(data.preferred_district);
          if (data.segment) setSegment(data.segment);
          if (data.program) setProgram(data.program);
          if (data.classes_handled) setClassesHandled(data.classes_handled);
          if (data.batch) setBatch(data.batch);
          if (data.primary_subject) setPrimarySubject(data.primary_subject);
          if (data.experience_level) setExperienceLevel(data.experience_level);
          if (data.location) setLocation(data.location);
          if (data.linkedin) setLinkedin(data.linkedin);
          
          toast({
            title: "Resume Parsed Successfully!",
            description: "Profile details have been auto-filled from your resume. Please review and update if needed.",
          });
        } catch (error: any) {
          console.error('Error parsing resume:', error);
          toast({
            title: "Resume Parsing",
            description: error.message || "Could not auto-fill details. You can enter them manually.",
            variant: "destructive",
          });
        } finally {
          setIsParsingResume(false);
        }
      }
    }
  };

  const handleDetectCompanyInfo = async () => {
    if (!companyWebsite) return;

    setIsDetecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-company-website', {
        body: { websiteUrl: companyWebsite }
      });

      if (error) {
        console.error('Edge function error:', error);
        toast({
          title: "Error",
          description: "Failed to analyze website. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('Received data from edge function:', data);

      if (data) {
        if (data.companyName) setCompanyName(data.companyName);
        if (data.description) setCompanyDescription(data.description);
        
        // If logo URL is found, set it as profile picture
        if (data.logoUrl) {
          console.log('Logo URL received:', data.logoUrl.substring(0, 50) + '...');
          try {
            let imageBlob: Blob;
            
            // If it's base64, convert it
            if (data.logoUrl.startsWith('data:')) {
              const response = await fetch(data.logoUrl);
              imageBlob = await response.blob();
            } else {
              // If it's a URL, fetch it
              const response = await fetch(data.logoUrl);
              imageBlob = await response.blob();
            }
            
            const file = new File([imageBlob], "company-logo.png", { type: imageBlob.type });
            
            // Create object URL for preview
            const previewUrl = URL.createObjectURL(imageBlob);
            
            // Store detected logo and show confirmation
            setDetectedLogo({ file, preview: previewUrl });
            setShowLogoConfirmation(true);
            
            console.log('Logo detected, showing confirmation');
          } catch (logoError) {
            console.error("Failed to process logo:", logoError);
            toast({
              title: "Warning",
              description: "Could not load company logo. You can upload it manually.",
            });
          }
        }

        toast({
          title: "Success!",
          description: "Company information detected successfully",
        });
      }
    } catch (error: any) {
      console.error('Error in handleDetectCompanyInfo:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to analyze website",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !profile) return;

    setIsLoading(true);

    try {
      let profilePictureUrl = profile.profile_picture;
      let resumeUrl = profile.resume_url;

      // Upload new profile picture if changed
      if (profilePicture) {
        const fileExt = profilePicture.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `profile-pictures/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('profile-pictures')
          .upload(filePath, profilePicture);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('profile-pictures')
            .getPublicUrl(filePath);
          profilePictureUrl = publicUrl;
        }
      }

      // Upload new resume if changed (only for candidates)
      if (resume && (profile.role === 'candidate' || profile.role === 'freelancer')) {
        const fileExt = resume.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(filePath, resume);

        if (!uploadError) {
          // Store path, not URL - will generate signed URL when needed
          resumeUrl = filePath;
        }
      }

      // Update profile
      const updateData: Record<string, any> = {
        full_name: fullName,
        email: email || profile.email,
        mobile,
        location: (profile.role === 'candidate' || profile.role === 'freelancer') ? (currentCity || location) : location,
        linkedin,
        website: profile.role === 'employer' ? companyWebsite : profile.website,
        profile_picture: profilePictureUrl,
        resume_url: resumeUrl,
        experience_level: (profile.role === 'candidate' || profile.role === 'freelancer') ? experienceLevel : profile.experience_level,
        company_name: profile.role === 'employer' ? companyName : profile.company_name,
        company_description: profile.role === 'employer' ? companyDescription : profile.company_description,
      };

      // Add candidate-specific fields
      if (profile.role === 'candidate' || profile.role === 'freelancer') {
        updateData.date_of_birth = dateOfBirth || null;
        updateData.gender = gender || null;
        updateData.languages = languages ? languages.split(',').map(l => l.trim()).filter(l => l) : null;
        updateData.current_state = currentState || null;
        updateData.current_district = currentDistrict || null;
        updateData.location = currentCity || null;
        updateData.alternate_number = alternateNumber || null;
        updateData.highest_qualification = highestQualification || null;
        updateData.office_type = officeType || null;
        updateData.preferred_state = preferredState || null;
        updateData.preferred_district = preferredDistrict || null;
        updateData.preferred_state_2 = preferredState2 || null;
        updateData.preferred_district_2 = preferredDistrict2 || null;
        updateData.segment = segment || null;
        updateData.program = program || null;
        updateData.classes_handled = classesHandled || null;
        updateData.batch = batch || null;
        updateData.primary_subject = primarySubject || null;
        updateData.category = industryCategory || null;
        updateData.current_salary = currentSalary ? parseFloat(currentSalary) : null;
        updateData.expected_salary = expectedSalary ? parseFloat(expectedSalary) : null;
        updateData.available_from = availableFrom || null;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updateData as any)
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();

      toast({
        title: "Success!",
        description: "Your profile has been updated",
      });

      const dashboardMap: Record<string, string> = {
        employer: "/employer/dashboard",
        freelancer: "/freelancer/dashboard",
      };
      navigate(dashboardMap[profile.role] || "/candidate/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-subtle py-8">
      <div className="container mx-auto px-4 max-w-3xl">
        {/* Header */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Edit Profile
            </h1>
            <p className="text-muted-foreground">
              Update your personal information
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Picture */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {profilePicturePreview ? (
                  <div className="relative">
                    <img
                      src={profilePicturePreview}
                      alt="Profile"
                      className="h-32 w-32 rounded-full object-cover border-4 border-border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0"
                      onClick={removeProfilePicture}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="h-32 w-32 rounded-full bg-muted flex items-center justify-center border-4 border-border">
                    <User className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </div>
              
              <Input
                id="profilePicture"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleProfilePictureChange(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
              <Label htmlFor="profilePicture" className="cursor-pointer">
                <Button type="button" variant="outline" asChild>
                  <span>
                    <Camera className="h-4 w-4 mr-2" />
                    Change Photo
                  </span>
                </Button>
              </Label>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Full Name *
              </Label>
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-12"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
                placeholder="your@email.com"
              />
              <p className="text-xs text-muted-foreground">
                AI will auto-detect email from resume upload
              </p>
            </div>

            {/* Mobile */}
            <div className="space-y-2">
              <Label htmlFor="mobile" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Mobile Number
              </Label>
              <Input
                id="mobile"
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                className="h-12"
              />
            </div>

            {/* Location - only for employers; candidates use State/District/City dropdowns */}
            {profile.role === 'employer' && (
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  Location
                </Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="City, Country"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-12"
                />
              </div>
            )}

            {/* LinkedIn */}
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-muted-foreground" />
                LinkedIn Profile
              </Label>
              <Input
                id="linkedin"
                type="url"
                placeholder="https://linkedin.com/in/yourprofile"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                className="h-12"
              />
            </div>

            {/* Candidate-specific fields */}
            {profile.role === 'candidate' && (
              <>
                {/* Row 1: Gender, Date of Birth */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Gender *
                    </Label>
                    <div className="flex items-center gap-4 h-12">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value="Male"
                          checked={gender === "Male"}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-4 h-4 text-accent"
                        />
                        <span>Male</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="gender"
                          value="Female"
                          checked={gender === "Female"}
                          onChange={(e) => setGender(e.target.value)}
                          className="w-4 h-4 text-accent"
                        />
                        <span>Female</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth</Label>
                    <Input
                      id="dateOfBirth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Row 2: Current State, Current District, Current City */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentState">Current State *</Label>
                    <Select
                      value={currentState}
                      onValueChange={(val) => {
                        setCurrentState(val);
                        setCurrentDistrict("");
                        setCurrentCity("");
                      }}
                    >
                      <SelectTrigger id="currentState" className="h-12">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAllStates().map((state) => (
                          <SelectItem key={state} value={state}>{state}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentDistrict">Current District</Label>
                    <Select
                      value={currentDistrict}
                      onValueChange={(val) => {
                        setCurrentDistrict(val);
                        setCurrentCity("");
                      }}
                      disabled={!currentState}
                    >
                      <SelectTrigger id="currentDistrict" className="h-12">
                        <SelectValue placeholder={currentState ? "Select District" : "Select State first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getDistrictsByState(currentState).map((district) => (
                          <SelectItem key={district} value={district}>{district}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currentCity">Current City</Label>
                    <Select
                      value={currentCity}
                      onValueChange={setCurrentCity}
                      disabled={!currentDistrict}
                    >
                      <SelectTrigger id="currentCity" className="h-12">
                        <SelectValue placeholder={currentDistrict ? "Select City" : "Select District first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getCitiesByDistrict(currentState, currentDistrict).map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>


                {/* Industry Category + Category-specific fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="industryCategory">Industry Category *</Label>
                    <Select value={industryCategory || undefined} onValueChange={(val) => {
                    setIndustryCategory(val);
                      // Reset category-specific fields
                      setPrimarySubject("");
                      setHighestQualification("");
                      setOfficeType("");
                      if (val !== "Education") {
                        setSegment("");
                        setProgram("");
                        setClassesHandled("");
                        setBatch("");
                      }
                    }} key={`industry-${industryCategory}`}>
                      <SelectTrigger id="industryCategory" className="h-12">
                        <SelectValue placeholder="Select Industry Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="IT Corporate">IT Corporate</SelectItem>
                        <SelectItem value="Legal">Legal</SelectItem>
                        <SelectItem value="Doctor">Doctor</SelectItem>
                        <SelectItem value="Civil Service">Civil Service</SelectItem>
                        <SelectItem value="Real Estate & Infrastructure">Real Estate & Infrastructure</SelectItem>
                        <SelectItem value="Freelance / Independent Professionals">Freelance / Independent Professionals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* IT Corporate fields */}
                  {industryCategory === "IT Corporate" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="primarySubject">Skills / Domain *</Label>
                        <Select value={primarySubject || undefined} onValueChange={setPrimarySubject}>
                          <SelectTrigger id="primarySubject" className="h-12">
                            <SelectValue placeholder="Select Skill" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Python">Python</SelectItem>
                            <SelectItem value="Java">Java</SelectItem>
                            <SelectItem value="JavaScript">JavaScript</SelectItem>
                            <SelectItem value="React">React</SelectItem>
                            <SelectItem value="Node.js">Node.js</SelectItem>
                            <SelectItem value="Cyber Security">Cyber Security</SelectItem>
                            <SelectItem value="Data Science">Data Science</SelectItem>
                            <SelectItem value="Cloud Computing">Cloud Computing</SelectItem>
                            <SelectItem value="DevOps">DevOps</SelectItem>
                            <SelectItem value="AI / Machine Learning">AI / Machine Learning</SelectItem>
                            <SelectItem value="Full Stack Development">Full Stack Development</SelectItem>
                            <SelectItem value="Mobile Development">Mobile Development</SelectItem>
                            <SelectItem value="Database Administration">Database Administration</SelectItem>
                            <SelectItem value="UI/UX Design">UI/UX Design</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="segment">Designation</Label>
                        <Select value={segment || undefined} onValueChange={setSegment}>
                          <SelectTrigger id="segment" className="h-12">
                            <SelectValue placeholder="Select Designation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Software Engineer">Software Engineer</SelectItem>
                            <SelectItem value="Senior Software Engineer">Senior Software Engineer</SelectItem>
                            <SelectItem value="Tech Lead">Tech Lead</SelectItem>
                            <SelectItem value="Project Manager">Project Manager</SelectItem>
                            <SelectItem value="Business Analyst">Business Analyst</SelectItem>
                            <SelectItem value="QA Engineer">QA Engineer</SelectItem>
                            <SelectItem value="System Administrator">System Administrator</SelectItem>
                            <SelectItem value="Data Analyst">Data Analyst</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Legal fields */}
                  {industryCategory === "Legal" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="primarySubject">Specialization *</Label>
                        <Select value={primarySubject || undefined} onValueChange={setPrimarySubject}>
                          <SelectTrigger id="primarySubject" className="h-12">
                            <SelectValue placeholder="Select Specialization" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Corporate Law">Corporate Law</SelectItem>
                            <SelectItem value="Criminal Law">Criminal Law</SelectItem>
                            <SelectItem value="Civil Law">Civil Law</SelectItem>
                            <SelectItem value="Family Law">Family Law</SelectItem>
                            <SelectItem value="Intellectual Property">Intellectual Property</SelectItem>
                            <SelectItem value="Tax Law">Tax Law</SelectItem>
                            <SelectItem value="Labour Law">Labour Law</SelectItem>
                            <SelectItem value="Constitutional Law">Constitutional Law</SelectItem>
                            <SelectItem value="Real Estate Law">Real Estate Law</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="segment">Designation</Label>
                        <Select value={segment || undefined} onValueChange={setSegment}>
                          <SelectTrigger id="segment" className="h-12">
                            <SelectValue placeholder="Select Designation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Advocate">Advocate</SelectItem>
                            <SelectItem value="Senior Advocate">Senior Advocate</SelectItem>
                            <SelectItem value="Legal Advisor">Legal Advisor</SelectItem>
                            <SelectItem value="Corporate Counsel">Corporate Counsel</SelectItem>
                            <SelectItem value="Paralegal">Paralegal</SelectItem>
                            <SelectItem value="Judge">Judge</SelectItem>
                            <SelectItem value="Notary">Notary</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Doctor fields */}
                  {industryCategory === "Doctor" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="primarySubject">Specialization *</Label>
                        <Select value={primarySubject || undefined} onValueChange={setPrimarySubject}>
                          <SelectTrigger id="primarySubject" className="h-12">
                            <SelectValue placeholder="Select Specialization" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="General Medicine">General Medicine</SelectItem>
                            <SelectItem value="Cardiology">Cardiology</SelectItem>
                            <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                            <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                            <SelectItem value="Dermatology">Dermatology</SelectItem>
                            <SelectItem value="Neurology">Neurology</SelectItem>
                            <SelectItem value="Gynecology">Gynecology</SelectItem>
                            <SelectItem value="Ophthalmology">Ophthalmology</SelectItem>
                            <SelectItem value="ENT">ENT</SelectItem>
                            <SelectItem value="Dentistry">Dentistry</SelectItem>
                            <SelectItem value="Psychiatry">Psychiatry</SelectItem>
                            <SelectItem value="Surgery">Surgery</SelectItem>
                            <SelectItem value="Radiology">Radiology</SelectItem>
                            <SelectItem value="Ayurveda">Ayurveda</SelectItem>
                            <SelectItem value="Homeopathy">Homeopathy</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="segment">Designation</Label>
                        <Select value={segment || undefined} onValueChange={setSegment}>
                          <SelectTrigger id="segment" className="h-12">
                            <SelectValue placeholder="Select Designation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MBBS">MBBS</SelectItem>
                            <SelectItem value="MD">MD</SelectItem>
                            <SelectItem value="MS">MS</SelectItem>
                            <SelectItem value="DM">DM</SelectItem>
                            <SelectItem value="BDS">BDS</SelectItem>
                            <SelectItem value="BAMS">BAMS</SelectItem>
                            <SelectItem value="BHMS">BHMS</SelectItem>
                            <SelectItem value="Nursing">Nursing</SelectItem>
                            <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                            <SelectItem value="Lab Technician">Lab Technician</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Civil Service fields */}
                  {industryCategory === "Civil Service" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="primarySubject">Department *</Label>
                        <Select value={primarySubject || undefined} onValueChange={setPrimarySubject}>
                          <SelectTrigger id="primarySubject" className="h-12">
                            <SelectValue placeholder="Select Department" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IAS">IAS</SelectItem>
                            <SelectItem value="IPS">IPS</SelectItem>
                            <SelectItem value="IFS">IFS</SelectItem>
                            <SelectItem value="IRS">IRS</SelectItem>
                            <SelectItem value="State Civil Services">State Civil Services</SelectItem>
                            <SelectItem value="Public Administration">Public Administration</SelectItem>
                            <SelectItem value="Revenue">Revenue</SelectItem>
                            <SelectItem value="Education Department">Education Department</SelectItem>
                            <SelectItem value="Health Department">Health Department</SelectItem>
                            <SelectItem value="Police">Police</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="segment">Designation</Label>
                        <Select value={segment || undefined} onValueChange={setSegment}>
                          <SelectTrigger id="segment" className="h-12">
                            <SelectValue placeholder="Select Designation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Officer">Officer</SelectItem>
                            <SelectItem value="Clerk">Clerk</SelectItem>
                            <SelectItem value="Inspector">Inspector</SelectItem>
                            <SelectItem value="Commissioner">Commissioner</SelectItem>
                            <SelectItem value="Secretary">Secretary</SelectItem>
                            <SelectItem value="Director">Director</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Real Estate & Infrastructure fields */}
                  {industryCategory === "Real Estate & Infrastructure" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="primarySubject">Specialization *</Label>
                        <Select value={primarySubject || undefined} onValueChange={setPrimarySubject}>
                          <SelectTrigger id="primarySubject" className="h-12">
                            <SelectValue placeholder="Select Specialization" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                            <SelectItem value="Architecture">Architecture</SelectItem>
                            <SelectItem value="Interior Design">Interior Design</SelectItem>
                            <SelectItem value="Construction Management">Construction Management</SelectItem>
                            <SelectItem value="Property Management">Property Management</SelectItem>
                            <SelectItem value="Urban Planning">Urban Planning</SelectItem>
                            <SelectItem value="Structural Engineering">Structural Engineering</SelectItem>
                            <SelectItem value="Real Estate Sales">Real Estate Sales</SelectItem>
                            <SelectItem value="Surveying">Surveying</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="segment">Designation</Label>
                        <Select value={segment || undefined} onValueChange={setSegment}>
                          <SelectTrigger id="segment" className="h-12">
                            <SelectValue placeholder="Select Designation" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Site Engineer">Site Engineer</SelectItem>
                            <SelectItem value="Project Manager">Project Manager</SelectItem>
                            <SelectItem value="Architect">Architect</SelectItem>
                            <SelectItem value="Contractor">Contractor</SelectItem>
                            <SelectItem value="Real Estate Agent">Real Estate Agent</SelectItem>
                            <SelectItem value="Quantity Surveyor">Quantity Surveyor</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}

                  {/* Freelance / Independent Professionals fields */}
                  {industryCategory === "Freelance / Independent Professionals" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="primarySubject">Domain *</Label>
                        <Select value={primarySubject || undefined} onValueChange={setPrimarySubject}>
                          <SelectTrigger id="primarySubject" className="h-12">
                            <SelectValue placeholder="Select Domain" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Content Writing">Content Writing</SelectItem>
                            <SelectItem value="Graphic Design">Graphic Design</SelectItem>
                            <SelectItem value="Web Development">Web Development</SelectItem>
                            <SelectItem value="Digital Marketing">Digital Marketing</SelectItem>
                            <SelectItem value="Photography">Photography</SelectItem>
                            <SelectItem value="Video Editing">Video Editing</SelectItem>
                            <SelectItem value="Consulting">Consulting</SelectItem>
                            <SelectItem value="Translation">Translation</SelectItem>
                            <SelectItem value="Accounting">Accounting</SelectItem>
                            <SelectItem value="Tutoring">Tutoring</SelectItem>
                            <SelectItem value="Event Management">Event Management</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="segment">Work Type</Label>
                        <Select value={segment || undefined} onValueChange={setSegment}>
                          <SelectTrigger id="segment" className="h-12">
                            <SelectValue placeholder="Select Work Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Remote">Remote</SelectItem>
                            <SelectItem value="On-site">On-site</SelectItem>
                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                            <SelectItem value="Project Based">Project Based</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                {/* Row 3: Alternate Number, Highest Qualification, Office Type */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="alternateNumber">Alternate Number (WhatsApp)</Label>
                    <Input
                      id="alternateNumber"
                      type="tel"
                      placeholder="Alternate Number"
                      value={alternateNumber}
                      onChange={(e) => setAlternateNumber(e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="highestQualification">Highest Qualification *</Label>
                    <Select value={highestQualification || undefined} onValueChange={setHighestQualification} key={`qual-${industryCategory}`}>
                      <SelectTrigger id="highestQualification" className="h-12">
                        <SelectValue placeholder="Select Qualification" />
                      </SelectTrigger>
                      <SelectContent>
                        {industryCategory === "IT Corporate" && (
                          <>
                            <SelectItem value="Diploma">Diploma</SelectItem>
                            <SelectItem value="B.Tech / B.E">B.Tech / B.E</SelectItem>
                            <SelectItem value="BCA">BCA</SelectItem>
                            <SelectItem value="B.Sc (CS/IT)">B.Sc (CS/IT)</SelectItem>
                            <SelectItem value="M.Tech / M.E">M.Tech / M.E</SelectItem>
                            <SelectItem value="MCA">MCA</SelectItem>
                            <SelectItem value="M.Sc (CS/IT)">M.Sc (CS/IT)</SelectItem>
                            <SelectItem value="PhD">PhD</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </>
                        )}
                        {industryCategory === "Doctor" && (
                          <>
                            <SelectItem value="MBBS">MBBS</SelectItem>
                            <SelectItem value="BDS">BDS</SelectItem>
                            <SelectItem value="BAMS">BAMS</SelectItem>
                            <SelectItem value="BHMS">BHMS</SelectItem>
                            <SelectItem value="B.Pharm">B.Pharm</SelectItem>
                            <SelectItem value="MD">MD</SelectItem>
                            <SelectItem value="MS">MS</SelectItem>
                            <SelectItem value="DM">DM</SelectItem>
                            <SelectItem value="M.Pharm">M.Pharm</SelectItem>
                            <SelectItem value="Nursing Diploma">Nursing Diploma</SelectItem>
                            <SelectItem value="B.Sc Nursing">B.Sc Nursing</SelectItem>
                            <SelectItem value="PhD">PhD</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </>
                        )}
                        {industryCategory === "Legal" && (
                          <>
                            <SelectItem value="LLB">LLB</SelectItem>
                            <SelectItem value="BA LLB (5 Year)">BA LLB (5 Year)</SelectItem>
                            <SelectItem value="LLM">LLM</SelectItem>
                            <SelectItem value="PhD in Law">PhD in Law</SelectItem>
                            <SelectItem value="Diploma in Law">Diploma in Law</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </>
                        )}
                        {industryCategory === "Civil Service" && (
                          <>
                            <SelectItem value="Graduate">Graduate</SelectItem>
                            <SelectItem value="Post Graduate">Post Graduate</SelectItem>
                            <SelectItem value="PhD">PhD</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </>
                        )}
                        {industryCategory === "Real Estate & Infrastructure" && (
                          <>
                            <SelectItem value="Diploma (Civil)">Diploma (Civil)</SelectItem>
                            <SelectItem value="B.Tech (Civil)">B.Tech (Civil)</SelectItem>
                            <SelectItem value="B.Arch">B.Arch</SelectItem>
                            <SelectItem value="M.Tech (Civil)">M.Tech (Civil)</SelectItem>
                            <SelectItem value="M.Arch">M.Arch</SelectItem>
                            <SelectItem value="MBA (Real Estate)">MBA (Real Estate)</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </>
                        )}
                        {industryCategory === "Freelance / Independent Professionals" && (
                          <>
                            <SelectItem value="10th">10th</SelectItem>
                            <SelectItem value="12th">12th</SelectItem>
                            <SelectItem value="Diploma">Diploma</SelectItem>
                            <SelectItem value="Graduate">Graduate</SelectItem>
                            <SelectItem value="Post Graduate">Post Graduate</SelectItem>
                            <SelectItem value="Self-Taught / Certified">Self-Taught / Certified</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </>
                        )}
                        {(industryCategory === "Education" || !industryCategory) && (
                          <>
                            <SelectItem value="10th">10th</SelectItem>
                            <SelectItem value="12th">12th</SelectItem>
                            <SelectItem value="Diploma">Diploma</SelectItem>
                            <SelectItem value="Graduate">Graduate</SelectItem>
                            <SelectItem value="Post Graduate">Post Graduate</SelectItem>
                            <SelectItem value="PhD">PhD</SelectItem>
                            <SelectItem value="B.Ed">B.Ed</SelectItem>
                            <SelectItem value="M.Ed">M.Ed</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="officeType">Office Type *</Label>
                    <Select value={officeType || undefined} onValueChange={setOfficeType} key={`office-${industryCategory}`}>
                      <SelectTrigger id="officeType" className="h-12">
                        <SelectValue placeholder="Select Office Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {industryCategory === "IT Corporate" && (
                          <>
                            <SelectItem value="Corporate Office">Corporate Office</SelectItem>
                            <SelectItem value="Tech Park">Tech Park</SelectItem>
                            <SelectItem value="Remote">Remote</SelectItem>
                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                            <SelectItem value="Co-working Space">Co-working Space</SelectItem>
                          </>
                        )}
                        {industryCategory === "Doctor" && (
                          <>
                            <SelectItem value="Hospital">Hospital</SelectItem>
                            <SelectItem value="Clinic">Clinic</SelectItem>
                            <SelectItem value="Nursing Home">Nursing Home</SelectItem>
                            <SelectItem value="Diagnostic Center">Diagnostic Center</SelectItem>
                            <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                            <SelectItem value="Medical College">Medical College</SelectItem>
                          </>
                        )}
                        {industryCategory === "Legal" && (
                          <>
                            <SelectItem value="Law Firm">Law Firm</SelectItem>
                            <SelectItem value="Court">Court</SelectItem>
                            <SelectItem value="Corporate Legal Dept">Corporate Legal Dept</SelectItem>
                            <SelectItem value="Independent Chamber">Independent Chamber</SelectItem>
                            <SelectItem value="Government Office">Government Office</SelectItem>
                          </>
                        )}
                        {industryCategory === "Civil Service" && (
                          <>
                            <SelectItem value="Government Office">Government Office</SelectItem>
                            <SelectItem value="Collectorate">Collectorate</SelectItem>
                            <SelectItem value="Secretariat">Secretariat</SelectItem>
                            <SelectItem value="Field Office">Field Office</SelectItem>
                            <SelectItem value="District Office">District Office</SelectItem>
                          </>
                        )}
                        {industryCategory === "Real Estate & Infrastructure" && (
                          <>
                            <SelectItem value="Site Office">Site Office</SelectItem>
                            <SelectItem value="Corporate Office">Corporate Office</SelectItem>
                            <SelectItem value="Project Site">Project Site</SelectItem>
                            <SelectItem value="Design Studio">Design Studio</SelectItem>
                            <SelectItem value="Branch Office">Branch Office</SelectItem>
                          </>
                        )}
                        {industryCategory === "Freelance / Independent Professionals" && (
                          <>
                            <SelectItem value="Home Office">Home Office</SelectItem>
                            <SelectItem value="Co-working Space">Co-working Space</SelectItem>
                            <SelectItem value="Remote">Remote</SelectItem>
                            <SelectItem value="Client Site">Client Site</SelectItem>
                          </>
                        )}
                        {(industryCategory === "Education" || !industryCategory) && (
                          <>
                            <SelectItem value="Head Office">Head Office</SelectItem>
                            <SelectItem value="Branch Office">Branch Office</SelectItem>
                            <SelectItem value="Regional Office">Regional Office</SelectItem>
                            <SelectItem value="Remote">Remote</SelectItem>
                            <SelectItem value="Hybrid">Hybrid</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 4: Preferred State, Preferred District, Preferred State 2 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preferredState">Preferred State *</Label>
                    <Select value={preferredState} onValueChange={setPreferredState}>
                      <SelectTrigger id="preferredState" className="h-12">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Andhra Pradesh">Andhra Pradesh</SelectItem>
                        <SelectItem value="Arunachal Pradesh">Arunachal Pradesh</SelectItem>
                        <SelectItem value="Assam">Assam</SelectItem>
                        <SelectItem value="Bihar">Bihar</SelectItem>
                        <SelectItem value="Chhattisgarh">Chhattisgarh</SelectItem>
                        <SelectItem value="Delhi">Delhi</SelectItem>
                        <SelectItem value="Goa">Goa</SelectItem>
                        <SelectItem value="Gujarat">Gujarat</SelectItem>
                        <SelectItem value="Haryana">Haryana</SelectItem>
                        <SelectItem value="Himachal Pradesh">Himachal Pradesh</SelectItem>
                        <SelectItem value="Jharkhand">Jharkhand</SelectItem>
                        <SelectItem value="Karnataka">Karnataka</SelectItem>
                        <SelectItem value="Kerala">Kerala</SelectItem>
                        <SelectItem value="Madhya Pradesh">Madhya Pradesh</SelectItem>
                        <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                        <SelectItem value="Manipur">Manipur</SelectItem>
                        <SelectItem value="Meghalaya">Meghalaya</SelectItem>
                        <SelectItem value="Mizoram">Mizoram</SelectItem>
                        <SelectItem value="Nagaland">Nagaland</SelectItem>
                        <SelectItem value="Odisha">Odisha</SelectItem>
                        <SelectItem value="Punjab">Punjab</SelectItem>
                        <SelectItem value="Rajasthan">Rajasthan</SelectItem>
                        <SelectItem value="Sikkim">Sikkim</SelectItem>
                        <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
                        <SelectItem value="Telangana">Telangana</SelectItem>
                        <SelectItem value="Tripura">Tripura</SelectItem>
                        <SelectItem value="Uttar Pradesh">Uttar Pradesh</SelectItem>
                        <SelectItem value="Uttarakhand">Uttarakhand</SelectItem>
                        <SelectItem value="West Bengal">West Bengal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredDistrict">Preferred District *</Label>
                    <Input
                      id="preferredDistrict"
                      type="text"
                      placeholder="Enter preferred district"
                      value={preferredDistrict}
                      onChange={(e) => setPreferredDistrict(e.target.value)}
                      className="h-12"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="preferredState2">Preferred State 2 *</Label>
                    <Select value={preferredState2} onValueChange={setPreferredState2}>
                      <SelectTrigger id="preferredState2" className="h-12">
                        <SelectValue placeholder="Select State" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Andhra Pradesh">Andhra Pradesh</SelectItem>
                        <SelectItem value="Arunachal Pradesh">Arunachal Pradesh</SelectItem>
                        <SelectItem value="Assam">Assam</SelectItem>
                        <SelectItem value="Bihar">Bihar</SelectItem>
                        <SelectItem value="Chhattisgarh">Chhattisgarh</SelectItem>
                        <SelectItem value="Delhi">Delhi</SelectItem>
                        <SelectItem value="Goa">Goa</SelectItem>
                        <SelectItem value="Gujarat">Gujarat</SelectItem>
                        <SelectItem value="Haryana">Haryana</SelectItem>
                        <SelectItem value="Himachal Pradesh">Himachal Pradesh</SelectItem>
                        <SelectItem value="Jharkhand">Jharkhand</SelectItem>
                        <SelectItem value="Karnataka">Karnataka</SelectItem>
                        <SelectItem value="Kerala">Kerala</SelectItem>
                        <SelectItem value="Madhya Pradesh">Madhya Pradesh</SelectItem>
                        <SelectItem value="Maharashtra">Maharashtra</SelectItem>
                        <SelectItem value="Manipur">Manipur</SelectItem>
                        <SelectItem value="Meghalaya">Meghalaya</SelectItem>
                        <SelectItem value="Mizoram">Mizoram</SelectItem>
                        <SelectItem value="Nagaland">Nagaland</SelectItem>
                        <SelectItem value="Odisha">Odisha</SelectItem>
                        <SelectItem value="Punjab">Punjab</SelectItem>
                        <SelectItem value="Rajasthan">Rajasthan</SelectItem>
                        <SelectItem value="Sikkim">Sikkim</SelectItem>
                        <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
                        <SelectItem value="Telangana">Telangana</SelectItem>
                        <SelectItem value="Tripura">Tripura</SelectItem>
                        <SelectItem value="Uttar Pradesh">Uttar Pradesh</SelectItem>
                        <SelectItem value="Uttarakhand">Uttarakhand</SelectItem>
                        <SelectItem value="West Bengal">West Bengal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 5: Preferred District 2 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="preferredDistrict2">Preferred District 2 *</Label>
                    <Input
                      id="preferredDistrict2"
                      type="text"
                      placeholder="Enter preferred district"
                      value={preferredDistrict2}
                      onChange={(e) => setPreferredDistrict2(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Education-specific fields - only show when Industry Category is Education */}
                {industryCategory === "Education" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="segment">Segment *</Label>
                        <Select value={segment || undefined} onValueChange={setSegment}>
                          <SelectTrigger id="segment" className="h-12">
                            <SelectValue placeholder="Select Segment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Education">Education</SelectItem>
                            <SelectItem value="Healthcare">Healthcare</SelectItem>
                            <SelectItem value="IT">IT</SelectItem>
                            <SelectItem value="Finance">Finance</SelectItem>
                            <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                            <SelectItem value="Retail">Retail</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="program">Program</Label>
                        <Select value={program || undefined} onValueChange={setProgram}>
                          <SelectTrigger id="program" className="h-12">
                            <SelectValue placeholder="Select Program" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Full Time">Full Time</SelectItem>
                            <SelectItem value="Part Time">Part Time</SelectItem>
                            <SelectItem value="Contract">Contract</SelectItem>
                            <SelectItem value="Internship">Internship</SelectItem>
                            <SelectItem value="Freelance">Freelance</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="classesHandled">Classes Handled *</Label>
                        <Select value={classesHandled || undefined} onValueChange={setClassesHandled}>
                          <SelectTrigger id="classesHandled" className="h-12">
                            <SelectValue placeholder="Select Classes Handled" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pre-Primary">Pre-Primary</SelectItem>
                            <SelectItem value="Primary (1-5)">Primary (1-5)</SelectItem>
                            <SelectItem value="Middle (6-8)">Middle (6-8)</SelectItem>
                            <SelectItem value="Secondary (9-10)">Secondary (9-10)</SelectItem>
                            <SelectItem value="Higher Secondary (11-12)">Higher Secondary (11-12)</SelectItem>
                            <SelectItem value="Graduation">Graduation</SelectItem>
                            <SelectItem value="Post Graduation">Post Graduation</SelectItem>
                            <SelectItem value="All Classes">All Classes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="batch">Batch</Label>
                        <Select value={batch || undefined} onValueChange={setBatch}>
                          <SelectTrigger id="batch" className="h-12">
                            <SelectValue placeholder="Select Batch" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Morning">Morning</SelectItem>
                            <SelectItem value="Afternoon">Afternoon</SelectItem>
                            <SelectItem value="Evening">Evening</SelectItem>
                            <SelectItem value="Flexible">Flexible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="primarySubject">Primary Subject *</Label>
                        <Select value={primarySubject || undefined} onValueChange={setPrimarySubject}>
                          <SelectTrigger id="primarySubject" className="h-12">
                            <SelectValue placeholder="Select Subject" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mathematics">Mathematics</SelectItem>
                            <SelectItem value="Science">Science</SelectItem>
                            <SelectItem value="English">English</SelectItem>
                            <SelectItem value="Hindi">Hindi</SelectItem>
                            <SelectItem value="Social Studies">Social Studies</SelectItem>
                            <SelectItem value="Physics">Physics</SelectItem>
                            <SelectItem value="Chemistry">Chemistry</SelectItem>
                            <SelectItem value="Biology">Biology</SelectItem>
                            <SelectItem value="Computer Science">Computer Science</SelectItem>
                            <SelectItem value="Commerce">Commerce</SelectItem>
                            <SelectItem value="Arts">Arts</SelectItem>
                            <SelectItem value="Physical Education">Physical Education</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {/* Languages Known */}
                <div className="space-y-2">
                  <Label htmlFor="languages">Languages Known</Label>
                  <Input
                    id="languages"
                    type="text"
                    placeholder="Enter languages separated by comma (e.g., English, Hindi, Telugu)"
                    value={languages}
                    onChange={(e) => setLanguages(e.target.value)}
                    className="h-12"
                  />
                </div>

                {/* Experience Level */}
                <div className="space-y-2">
                  <Label htmlFor="experience" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Experience Level *
                  </Label>
                  <Select value={experienceLevel} onValueChange={setExperienceLevel} required>
                    <SelectTrigger id="experience" className="h-12">
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fresher">Fresher</SelectItem>
                      <SelectItem value="0-1">0-1 year</SelectItem>
                      <SelectItem value="1-3">1-3 years</SelectItem>
                      <SelectItem value="3-5">3-5 years</SelectItem>
                      <SelectItem value="5+">5+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Current Salary, Expected Salary, Available From */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentSalary">Current Salary (₹/month)</Label>
                    <Input
                      id="currentSalary"
                      type="number"
                      placeholder="e.g. 30000"
                      value={currentSalary}
                      onChange={(e) => setCurrentSalary(e.target.value)}
                      className="h-12"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expectedSalary">Expected Salary (₹/month)</Label>
                    <Input
                      id="expectedSalary"
                      type="number"
                      placeholder="e.g. 40000"
                      value={expectedSalary}
                      onChange={(e) => setExpectedSalary(e.target.value)}
                      className="h-12"
                      min="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="availableFrom">Available From</Label>
                    <Input
                      id="availableFrom"
                      type="date"
                      value={availableFrom}
                      onChange={(e) => setAvailableFrom(e.target.value)}
                      className="h-12"
                    />
                  </div>
                </div>

                {/* Resume Upload */}
                <div className="space-y-2">
                  <Label htmlFor="resume" className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Resume (AI Auto-fill)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Upload your resume and AI will automatically extract and fill your profile details.
                  </p>
                  {currentResumeUrl && !resume && (
                    <div className="mb-2">
                      <a
                        href={currentResumeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-accent hover:underline"
                      >
                        View current resume
                      </a>
                    </div>
                  )}
                  <div className="relative">
                    <Input
                      id="resume"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isParsingResume}
                    />
                    <label
                      htmlFor="resume"
                      className={`flex items-center justify-center gap-2 h-12 px-4 border-2 border-dashed rounded-md transition-colors ${
                        isParsingResume 
                          ? 'border-accent bg-accent/10 cursor-wait' 
                          : 'border-input cursor-pointer hover:border-accent hover:bg-accent/5'
                      }`}
                    >
                      {isParsingResume ? (
                        <>
                          <Loader2 className="h-5 w-5 text-accent animate-spin" />
                          <span className="text-sm text-accent font-medium">
                            AI is parsing your resume...
                          </span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {resume ? resume.name : "Upload resume (PDF, DOC, DOCX) - AI will auto-fill details"}
                          </span>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Employer-specific fields */}
            {profile.role === 'employer' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyWebsite" className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4 text-muted-foreground" />
                    Company Website *
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="companyWebsite"
                      type="url"
                      placeholder="https://yourcompany.com"
                      value={companyWebsite}
                      onChange={(e) => setCompanyWebsite(e.target.value)}
                      required
                      className="h-12 flex-1"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleDetectCompanyInfo}
                      disabled={!companyWebsite || isDetecting}
                      className="h-12"
                    >
                      {isDetecting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Detecting...
                        </>
                      ) : (
                        "Auto-fill"
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click "Auto-fill" to automatically detect company details
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyName" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Company Name *
                  </Label>
                  <Input
                    id="companyName"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="companyDescription" className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Company Description
                  </Label>
                  <Input
                    id="companyDescription"
                    type="text"
                    value={companyDescription}
                    onChange={(e) => setCompanyDescription(e.target.value)}
                    className="h-12"
                  />
                </div>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="cta"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* Change Password */}
        <Card className="p-6 md:p-8 mt-6">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Change Password</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Update the password used to sign in to your account.
          </p>
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <PasswordInput
                id="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
              />
              <PasswordStrengthIndicator password={newPassword} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <PasswordInput
                id="confirm-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                autoComplete="new-password"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
            </div>
            <Button
              type="button"
              onClick={handleChangePassword}
              disabled={isChangingPassword || !newPassword || !confirmPassword}
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </div>
        </Card>
      </div>

      {/* Image Crop Modal */}
      {tempImageForCrop && (
        <ImageCropModal
          open={showCropModal}
          imageUrl={tempImageForCrop}
          onClose={handleCropCancel}
          onCropComplete={handleCropComplete}
        />
      )}

      {/* Logo Confirmation Dialog */}
      <Dialog open={showLogoConfirmation} onOpenChange={setShowLogoConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Company Logo Detected</DialogTitle>
            <DialogDescription>
              We found a logo for your company. Would you like to use it as your profile picture?
            </DialogDescription>
          </DialogHeader>
          
          {detectedLogo && (
            <div className="flex justify-center py-4">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-accent shadow-lg">
                <img
                  src={detectedLogo.preview}
                  alt="Detected company logo"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button onClick={handleKeepDetectedLogo} className="w-full">
              <CheckCircle className="h-4 w-4 mr-2" />
              Use This Logo
            </Button>
            <Button onClick={handleUploadDifferentLogo} variant="outline" className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Upload Different Image
            </Button>
            <Button onClick={handleSkipLogo} variant="ghost" className="w-full">
              Skip for Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EditProfile;
