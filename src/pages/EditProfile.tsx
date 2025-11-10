import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageCropModal } from "@/components/ui/ImageCropModal";
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
  Loader2
} from "lucide-react";

const EditProfile = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [location, setLocation] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  
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
    setMobile(profile.mobile || "");
    setLocation(profile.location || "");
    setLinkedin(profile.linkedin || "");
    setExperienceLevel(profile.experience_level || "");
    setCompanyName(profile.company_name || "");
    setCompanyDescription(profile.company_description || "");
    setCompanyWebsite(profile.website || "");
    setProfilePicturePreview(profile.profile_picture || null);
    setCurrentResumeUrl(profile.resume_url || null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResume(e.target.files[0]);
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
        toast({
          title: "Error",
          description: "Failed to analyze website. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        if (data.companyName) setCompanyName(data.companyName);
        if (data.description) setCompanyDescription(data.description);
        
        // If logo URL is found, download and set as profile picture
        if (data.logoUrl) {
          try {
            const response = await fetch(data.logoUrl);
            const blob = await response.blob();
            const file = new File([blob], "company-logo.jpg", { type: blob.type });
            setProfilePicture(file);
            setProfilePicturePreview(data.logoUrl);
          } catch (logoError) {
            console.error("Failed to fetch logo:", logoError);
          }
        }

        toast({
          title: "Success!",
          description: "Company information detected successfully",
        });
      }
    } catch (error: any) {
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
      if (resume && profile.role === 'candidate') {
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

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          mobile,
          location,
          linkedin,
          website: profile.role === 'employer' ? companyWebsite : profile.website,
          profile_picture: profilePictureUrl,
          resume_url: resumeUrl,
          experience_level: profile.role === 'candidate' ? experienceLevel : profile.experience_level,
          company_name: profile.role === 'employer' ? companyName : profile.company_name,
          company_description: profile.role === 'employer' ? companyDescription : profile.company_description,
        })
        .eq("id", user.id);

      if (error) throw error;

      await refreshProfile();

      toast({
        title: "Success!",
        description: "Your profile has been updated",
      });

      navigate(profile.role === "employer" ? "/employer/dashboard" : "/candidate/dashboard");
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

            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="h-12 bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
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

            {/* Location */}
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

                <div className="space-y-2">
                  <Label htmlFor="resume" className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    Resume
                  </Label>
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
                    />
                    <label
                      htmlFor="resume"
                      className="flex items-center justify-center gap-2 h-12 px-4 border-2 border-dashed border-input rounded-md cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
                    >
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {resume ? resume.name : "Upload new resume (PDF, DOC, DOCX)"}
                      </span>
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
    </div>
  );
};

export default EditProfile;
