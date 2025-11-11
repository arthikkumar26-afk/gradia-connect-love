import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Upload, 
  CheckCircle, 
  ArrowRight,
  User,
  Phone,
  FileText,
  Briefcase,
  MapPin,
  Linkedin,
  Camera,
  X
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CandidateCreateProfile = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [resume, setResume] = useState<File | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [tempImageForCrop, setTempImageForCrop] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [experienceLevel, setExperienceLevel] = useState("");
  const [location, setLocation] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/candidate/signup");
      return;
    }

    if (profile) {
      navigate("/candidate/dashboard");
    }

    // Verify user is a candidate
    const role = user.user_metadata?.role;
    if (role !== 'candidate') {
      navigate("/employer/create-profile");
    }
  }, [user, profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a profile",
        variant: "destructive",
      });
      return;
    }

    if (!agreeToTerms) {
      toast({
        title: "Error",
        description: "Please agree to the terms and conditions",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Upload profile picture if exists
      let profilePictureUrl = null;
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

      // Upload resume if exists
      let resumeUrl = null;
      if (resume) {
        const fileExt = resume.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `resumes/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('resumes')
          .upload(filePath, resume);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('resumes')
            .getPublicUrl(filePath);
          resumeUrl = publicUrl;
        }
      }

      // Create profile
      const { error } = await supabase.from("profiles").insert({
        id: user.id,
        full_name: fullName,
        email: user.email!,
        mobile,
        role: 'candidate',
        location,
        linkedin,
        profile_picture: profilePictureUrl,
        resume_url: resumeUrl,
        experience_level: experienceLevel,
        preferred_role: experienceLevel,
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      await refreshProfile();
      
      toast({
        title: "Success!",
        description: "Your profile has been created",
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setResume(file);
      
      toast({
        title: "Analyzing resume...",
        description: "AI is extracting your profile details",
      });
      
      // Parse resume with AI
      try {
        const formData = new FormData();
        formData.append("file", file);
        
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-resume`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: formData,
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to parse resume");
        }
        
        const data = await response.json();
        
        // If parsing was skipped (e.g., PDF/DOC), inform the user gracefully
        if (data.note === "parsing_skipped") {
          toast({
            title: "Resume uploaded",
            description: "Parsing isn't supported for this file type yet. Please fill details manually.",
          });
          return;
        }
        
        // Auto-fill form fields
        if (data.full_name) setFullName(data.full_name);
        if (data.mobile) setMobile(data.mobile);
        if (data.experience_level) setExperienceLevel(data.experience_level);
        if (data.location) setLocation(data.location);
        if (data.linkedin) setLinkedin(data.linkedin);
        
        toast({
          title: "Success!",
          description: "Profile details extracted from your resume",
        });
      } catch (error) {
        console.error("Error parsing resume:", error);
        toast({
          title: "Note",
          description: "Resume uploaded. Please fill in your details manually.",
          variant: "default",
        });
      }
    }
  };

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
  };

  const handleCropCancel = () => {
    setShowCropModal(false);
    setTempImageForCrop(null);
  };

  const handleProfilePictureInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProfilePictureChange(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProfilePictureChange(e.dataTransfer.files[0]);
    }
  };

  const removeProfilePicture = () => {
    setProfilePicture(null);
    setProfilePicturePreview(null);
  };

  const benefits = [
    "Build your profile and let recruiters find you",
    "Get job postings delivered right to your email",
    "Find a job and grow your career"
  ];

  return (
    <>
      {tempImageForCrop && (
        <ImageCropModal
          open={showCropModal}
          imageUrl={tempImageForCrop}
          onClose={handleCropCancel}
          onCropComplete={handleCropComplete}
        />
      )}

      <div className="min-h-screen bg-gradient-to-b from-subtle to-background">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground py-16">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-secondary/80" />
          
          <div className="relative z-10 container mx-auto px-4 text-center">
            <div className="animate-fade-in max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Create Your Candidate Profile
              </h1>
              <p className="text-xl text-primary-foreground/90">
                Your next career move starts with a strong profile.
              </p>
            </div>
          </div>

          {/* Bottom Wave */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
              className="relative block w-full h-12"
            >
              <path
                d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
                opacity=".5"
                className="fill-background"
              ></path>
              <path
                d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
                className="fill-background"
              ></path>
            </svg>
          </div>
        </section>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 max-w-7xl mx-auto">
            {/* Left Info Panel */}
            <div className="lg:col-span-1 animate-slide-up">
              <div className="bg-gradient-subtle rounded-2xl p-8 shadow-medium sticky top-24">
                <div className="mb-6 flex items-center justify-center">
                  <div className="w-48 h-48 bg-gradient-accent rounded-2xl flex items-center justify-center shadow-glow">
                    <div className="text-center">
                      <User className="h-24 w-24 text-accent-foreground mx-auto mb-2" />
                      <p className="text-sm text-accent-foreground font-medium">Your Career Journey</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-foreground mb-6">
                  On registering, you can
                </h3>

                <ul className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="h-6 w-6 text-success flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right Form Panel */}
            <div className="lg:col-span-2 animate-scale-in">
              <div className="bg-card rounded-2xl shadow-large p-8 md:p-10">
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Step 1 of 3</span>
                    <span className="text-sm font-medium text-accent">33%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-accent w-1/3 transition-all duration-300" />
                  </div>
                </div>

                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-foreground mb-2">
                    Create your Profile
                  </h2>
                  <p className="text-muted-foreground">
                    Search & apply to jobs from top companies
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Profile Picture Upload */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-muted-foreground" />
                      Profile Picture
                    </Label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`relative border-2 border-dashed rounded-lg transition-all ${
                        isDragging
                          ? "border-accent bg-accent/10"
                          : "border-input hover:border-accent"
                      }`}
                    >
                      <Input
                        id="profilePicture"
                        type="file"
                        accept="image/*"
                        onChange={handleProfilePictureInputChange}
                        className="hidden"
                      />
                      
                      {profilePicturePreview ? (
                        <div className="relative p-4 flex items-center gap-4">
                          <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-accent shadow-medium">
                            <img
                              src={profilePicturePreview}
                              alt="Profile preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-foreground">
                              {profilePicture?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {profilePicture && (profilePicture.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={removeProfilePicture}
                            className="hover:bg-destructive/10 hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <label
                          htmlFor="profilePicture"
                          className="flex flex-col items-center justify-center gap-2 p-8 cursor-pointer"
                        >
                          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                            <Camera className="h-8 w-8 text-accent" />
                          </div>
                          <div className="text-center">
                            <p className="text-sm font-medium text-foreground">
                              Drop your photo here or click to browse
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PNG, JPG, WEBP (Max 5MB)
                            </p>
                          </div>
                        </label>
                      )}
                    </div>
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
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  {/* Mobile */}
                  <div className="space-y-2">
                    <Label htmlFor="mobile" className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      Mobile Number *
                    </Label>
                    <Input
                      id="mobile"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                      className="h-12"
                    />
                  </div>

                  {/* Resume Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="resume" className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Upload Resume
                    </Label>
                    <div className="relative">
                      <Input
                        id="resume"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="resume"
                        className="flex items-center justify-center gap-2 h-12 px-4 border-2 border-dashed border-input rounded-md cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
                      >
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {resume ? resume.name : "Choose File (PDF, DOC, DOCX)"}
                        </span>
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload your resume and AI will auto-fill your details
                    </p>
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
                        <SelectItem value="entry">Entry Level / Fresher</SelectItem>
                        <SelectItem value="mid">Mid Level (1-5 years)</SelectItem>
                        <SelectItem value="senior">Senior Level (5+ years)</SelectItem>
                        <SelectItem value="expert">Expert / Lead (10+ years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Current Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Current Location
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

                  {/* LinkedIn Profile */}
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

                  {/* Terms & Conditions */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={agreeToTerms}
                      onCheckedChange={(checked) => setAgreeToTerms(checked as boolean)}
                      required
                    />
                    <Label
                      htmlFor="terms"
                      className="text-sm text-muted-foreground cursor-pointer"
                    >
                      I agree to the{" "}
                      <Link to="/terms" className="text-accent hover:underline">
                        Terms & Conditions
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy" className="text-accent hover:underline">
                        Privacy Policy
                      </Link>
                    </Label>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-12 bg-gradient-accent hover:shadow-glow transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating Profile..." : "Create Profile & Continue"}
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </Button>

                  {/* Already have account */}
                  <div className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Link
                      to="/candidate/login"
                      className="text-accent hover:underline font-medium"
                    >
                      Login here
                    </Link>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CandidateCreateProfile;
