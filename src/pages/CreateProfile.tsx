import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Mail,
  Lock,
  Phone,
  FileText,
  Briefcase,
  MapPin,
  Linkedin,
  Camera,
  X,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CreateProfile = () => {
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
  const [roleType, setRoleType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [location, setLocation] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectedLogo, setDetectedLogo] = useState<{ file: File; preview: string } | null>(null);
  const [showLogoConfirmation, setShowLogoConfirmation] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/candidate/signup");
      return;
    }

    if (profile) {
      navigate(profile.role === "employer" ? "/employer/dashboard" : "/candidate/dashboard");
    }

    // Get role from user metadata
    const role = user.user_metadata?.role;
    if (role) {
      setRoleType(role);
    }
  }, [user, profile, navigate]);

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
        role: roleType,
        location,
        linkedin,
        website: roleType === 'employer' ? companyWebsite : null,
        profile_picture: profilePictureUrl,
        resume_url: resumeUrl,
        experience_level: experienceLevel,
        preferred_role: experienceLevel,
        company_name: roleType === 'employer' ? companyName : null,
        company_description: roleType === 'employer' ? companyDescription : null,
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

      navigate(roleType === "employer" ? "/employer/dashboard" : "/candidate/dashboard");
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResume(e.target.files[0]);
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
    // Convert blob to file
    const croppedFile = new File([croppedBlob], "profile-picture.jpg", {
      type: "image/jpeg",
    });
    setProfilePicture(croppedFile);
    
    // Create preview URL
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

  const benefits = [
    "Build your profile and let recruiters find you",
    "Get job postings delivered right to your email",
    "Find a job and grow your career"
  ];

  return (
    <>
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

      <div className="min-h-screen bg-gradient-to-b from-subtle to-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground py-16">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-secondary/80" />
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="animate-fade-in max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Create Your Gradia Profile
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
              {/* Illustration Placeholder */}
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
              {/* Progress Indicator */}
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

                {/* Resume Upload - Only for candidates */}
                {roleType === 'candidate' && (
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
                  </div>
                )}

                {/* Role Type - Read only from signup */}
                <div className="space-y-2">
                  <Label htmlFor="roleType" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Account Type *
                  </Label>
                  <Input
                    id="roleType"
                    type="text"
                    value={roleType === 'candidate' ? 'Candidate' : 'Employer'}
                    disabled
                    className="h-12 bg-muted"
                  />
                </div>

                {/* Employer-specific fields */}
                {roleType === 'employer' && (
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
                        placeholder="Your Company Name"
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
                        placeholder="Brief description of your company"
                        value={companyDescription}
                        onChange={(e) => setCompanyDescription(e.target.value)}
                        className="h-12"
                      />
                    </div>
                  </>
                )}

                {/* Candidate-specific fields */}
                {roleType === 'candidate' && (
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
                )}

                {/* Current Location (Optional) */}
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

                {/* LinkedIn Profile (Optional) */}
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

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">OR</span>
                  </div>
                </div>

                {/* Google Sign In */}
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="w-full h-12 hover:bg-accent/5"
                >
                  <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
};

export default CreateProfile;
