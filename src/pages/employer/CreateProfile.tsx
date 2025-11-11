import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
  X,
  Loader2,
  Building2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import RoleSwitcher from "@/components/auth/RoleSwitcher";

const EmployerCreateProfile = () => {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const [tempImageForCrop, setTempImageForCrop] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
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
    const checkAndRedirect = async () => {
      if (!user) {
        navigate("/employer/signup");
        return;
      }

      // Check if profile already exists
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('id', user.id)
          .maybeSingle();

        if (existingProfile) {
          toast({
            title: "Profile Already Exists",
            description: "Redirecting to your dashboard",
          });
          navigate("/employer/dashboard");
          return;
        }
      } catch (error) {
        console.error('Error checking profile:', error);
      }

      // Only redirect if explicitly a candidate (not if role is missing)
      const params = new URLSearchParams(window.location.search);
      const override = params.get('role');
      if (!override) {
        const role = user.user_metadata?.role;
        if (role === 'candidate') {
          navigate("/candidate/create-profile");
        }
      }
    };

    checkAndRedirect();
  }, [user, navigate, toast]);

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

      if (data) {
        if (data.companyName) setCompanyName(data.companyName);
        if (data.description) setCompanyDescription(data.description);
        
        if (data.logoUrl) {
          try {
            let imageBlob: Blob;
            
            if (data.logoUrl.startsWith('data:')) {
              const response = await fetch(data.logoUrl);
              imageBlob = await response.blob();
            } else {
              const response = await fetch(data.logoUrl);
              imageBlob = await response.blob();
            }
            
            const file = new File([imageBlob], "company-logo.png", { type: imageBlob.type });
            const previewUrl = URL.createObjectURL(imageBlob);
            
            setDetectedLogo({ file, preview: previewUrl });
            setShowLogoConfirmation(true);
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
      // Upload company logo if exists
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

      // Upsert profile (create or update if exists)
      const { error } = await supabase.from("profiles").upsert(
        {
          id: user.id,
          full_name: fullName,
          email: user.email!,
          mobile,
          role: 'employer',
          location,
          linkedin,
          website: companyWebsite,
          profile_picture: profilePictureUrl,
          company_name: companyName,
          company_description: companyDescription,
        },
        { onConflict: 'id' }
      );

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      await refreshProfile();
      
      // Send welcome email in background
      try {
        await supabase.functions.invoke('send-welcome-email', {
          body: { 
            email: user.email,
            fullName: fullName,
            role: 'employer'
          }
        });
      } catch (emailError) {
        // Don't block profile creation if email fails
        console.error('Welcome email failed:', emailError);
      }
      
      toast({
        title: "Success!",
        description: "Your company profile has been created",
      });

      navigate("/employer/dashboard");
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
    const croppedFile = new File([croppedBlob], "company-logo.jpg", {
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
    document.getElementById('profilePicture')?.click();
  };

  const handleSkipLogo = () => {
    setShowLogoConfirmation(false);
    setDetectedLogo(null);
  };

  const benefits = [
    "Post unlimited job openings",
    "Access qualified candidate profiles",
    "Streamline your hiring process"
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

      <Dialog open={showLogoConfirmation} onOpenChange={setShowLogoConfirmation}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Company Logo Detected</DialogTitle>
            <DialogDescription>
              We found a logo for your company. Would you like to use it?
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
                Create Your Company Profile
              </h1>
              <p className="text-xl text-primary-foreground/90">
                Connect with top talent and build your team.
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

        {/* Breadcrumbs */}
        <div className="container mx-auto px-4 pt-8">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/">Home</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/employer/signup">Employer</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Create Profile</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6"><RoleSwitcher current="employer" /></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12 max-w-7xl mx-auto">
            {/* Left Info Panel */}
            <div className="lg:col-span-1 animate-slide-up">
              <div className="bg-gradient-subtle rounded-2xl p-8 shadow-medium sticky top-24">
                <div className="mb-6 flex items-center justify-center">
                  <div className="w-48 h-48 bg-gradient-accent rounded-2xl flex items-center justify-center shadow-glow">
                    <div className="text-center">
                      <Building2 className="h-24 w-24 text-accent-foreground mx-auto mb-2" />
                      <p className="text-sm text-accent-foreground font-medium">Your Hiring Partner</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-foreground mb-6">
                  With your company profile
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
                    Create your Company Profile
                  </h2>
                  <p className="text-muted-foreground">
                    Start hiring top talent today
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Company Logo Upload */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Camera className="h-4 w-4 text-muted-foreground" />
                      Company Logo
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
                              alt="Logo preview"
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
                              Drop your logo here or click to browse
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              PNG, JPG, WEBP (Max 5MB)
                            </p>
                          </div>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Contact Person Name */}
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Contact Person Name *
                    </Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter contact person name"
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

                  {/* Company Website */}
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
                      Click "Auto-fill" to automatically detect company details and logo
                    </p>
                  </div>

                  {/* Company Name */}
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

                  {/* Company Description */}
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

                  {/* Company Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location" className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Company Location
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
                      LinkedIn Company Page
                    </Label>
                    <Input
                      id="linkedin"
                      type="url"
                      placeholder="https://linkedin.com/company/yourcompany"
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
                      <Link to="/employer/terms" className="text-accent hover:underline">
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
                      to="/employer/login"
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

export default EmployerCreateProfile;
