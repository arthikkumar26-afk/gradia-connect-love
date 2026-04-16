import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QRCodeSVG } from "qrcode.react";
import { Download, FileText, Briefcase, MapPin, Phone, Mail, Globe, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import gradiaLogo from "@/assets/gradia-logo.png";

interface JobData {
  id: string;
  job_title: string;
  designation?: string | null;
  organisation?: string | null;
  location?: string | null;
  salary_range?: string | null;
  segment?: string | null;
  category?: string | null;
  sector_division?: string | null;
  description?: string | null;
  experience_required?: string | null;
  skills?: string[] | null;
  job_type?: string | null;
  subjects?: string | null;
  classes?: string | null;
}

interface QRFlyerModalProps {
  employerId: string;
  companyName?: string;
  companyLogo?: string;
  jobData?: JobData | null;
  trigger?: React.ReactNode;
}

const QRFlyerModal = ({ employerId, companyName = "Your Company", companyLogo, jobData, trigger }: QRFlyerModalProps) => {
  const [open, setOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);
  
  const buildJobDetails = () => {
    if (!jobData) return "";
    const parts: string[] = [];
    if (jobData.description) parts.push(jobData.description);
    if (jobData.subjects) parts.push(`Subjects: ${jobData.subjects}`);
    if (jobData.classes) parts.push(`Classes: ${jobData.classes}`);
    if (jobData.experience_required) parts.push(`Experience: ${jobData.experience_required}`);
    if (jobData.salary_range) parts.push(`Salary: ${jobData.salary_range}`);
    if (jobData.job_type) parts.push(`Type: ${jobData.job_type}`);
    if (jobData.skills?.length) parts.push(`Skills: ${jobData.skills.join(", ")}`);
    return parts.join("\n");
  };

  const [flyerData, setFlyerData] = useState({
    headline: "We're Hiring!",
    tagline: "Join our growing team and build your career",
    positions: jobData?.designation || jobData?.job_title || "Multiple Positions Available",
    jobDetails: buildJobDetails(),
    location: jobData?.location || "All India",
    contactPhone: "",
    contactEmail: "info@gradia.world",
    website: "www.gradia.world",
  });

  const qrUrl = jobData?.id
    ? `${window.location.origin}/jobs-results?job=${jobData.id}&apply=true`
    : `${window.location.origin}/company/${employerId}/jobs`;

  const handleAIGenerate = async () => {
    if (!jobData) {
      toast.error("No job selected. Please select a job to generate AI content.");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-flyer-content", {
        body: { job: jobData, companyName },
      });

      if (error) {
        // Check for rate limit / payment errors
        if (error.message?.includes("429")) {
          toast.error("Rate limit exceeded. Please try again in a moment.");
        } else if (error.message?.includes("402")) {
          toast.error("AI credits exhausted. Please add credits to continue.");
        } else {
          throw error;
        }
        return;
      }

      if (data?.flyerContent) {
        const content = data.flyerContent;
        setFlyerData(prev => ({
          ...prev,
          headline: content.headline || prev.headline,
          tagline: content.tagline || prev.tagline,
          positions: content.positions || prev.positions,
          contactEmail: content.contactEmail || prev.contactEmail,
          website: content.website || prev.website,
        }));
        toast.success("AI content generated! You can edit the fields further.");
      }
    } catch (error: any) {
      console.error("AI generation error:", error);
      toast.error(error.message || "Failed to generate AI content. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!flyerRef.current) return;

    try {
      const flyer = flyerRef.current;
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = flyer.offsetWidth * scale;
      canvas.height = flyer.offsetHeight * scale;
      const ctx = canvas.getContext("2d");
      
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const dataUrl = await generateFlyerImage();
      
      const downloadLink = document.createElement("a");
      downloadLink.download = `${companyName.replace(/\s+/g, "-")}-job-flyer.png`;
      downloadLink.href = dataUrl;
      downloadLink.click();
      
      toast.success("Flyer downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download flyer. Try using Print instead.");
    }
  };

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const generateFlyerImage = async (): Promise<string> => {
    const canvas = document.createElement("canvas");
    const width = 800;
    const height = 1100;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    
    if (!ctx) return "";

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#1a365d");
    gradient.addColorStop(0.3, "#2c5282");
    gradient.addColorStop(1, "#1a365d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative elements
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    ctx.beginPath();
    ctx.arc(700, 100, 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(100, 900, 150, 0, Math.PI * 2);
    ctx.fill();

    // Header bar
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(0, 0, width, 120);

    // Company name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText(companyName, width / 2, 75);

    // Headline
    ctx.font = "bold 56px Arial";
    ctx.fillStyle = "#48bb78";
    ctx.fillText(flyerData.headline, width / 2, 220);

    // Tagline
    ctx.font = "24px Arial";
    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(flyerData.tagline, width / 2, 270);

    // Positions box
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.beginPath();
    ctx.roundRect(50, 320, width - 100, 80, 10);
    ctx.fill();
    
    ctx.fillStyle = "#1a365d";
    ctx.font = "bold 28px Arial";
    ctx.fillText(flyerData.positions, width / 2, 370);

    // QR Code section background
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(width / 2 - 130, 440, 260, 320, 15);
    ctx.fill();

    // Draw QR code
    const qrSvg = document.getElementById("flyer-qr-code");
    if (qrSvg) {
      try {
        const svgData = new XMLSerializer().serializeToString(qrSvg);
        const qrImg = await loadImage("data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))));
        ctx.drawImage(qrImg, width / 2 - 100, 470, 200, 200);
      } catch (e) {
        console.error("Failed to load QR code:", e);
      }
    }
    
    // Scan instruction
    ctx.fillStyle = "#1a365d";
    ctx.font = "bold 18px Arial";
    ctx.fillText("SCAN TO APPLY", width / 2, 710);
    
    ctx.fillStyle = "#48bb78";
    ctx.font = "24px Arial";
    ctx.fillText("👆", width / 2, 740);

    // Contact section background
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
    ctx.fillRect(0, 800, width, 150);

    // Contact info
    ctx.fillStyle = "#ffffff";
    ctx.font = "18px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`📍 ${flyerData.location}`, 80, 850);
    ctx.fillText(`📞 ${flyerData.contactPhone}`, 80, 885);
    ctx.textAlign = "right";
    ctx.fillText(`✉️ ${flyerData.contactEmail}`, width - 80, 850);
    ctx.fillText(`🌐 ${flyerData.website}`, width - 80, 885);

    // Footer
    ctx.textAlign = "center";
    ctx.fillStyle = "#a0aec0";
    ctx.font = "14px Arial";
    ctx.fillText("Powered by Gradia - Your Next Step", width / 2, 1000);

    ctx.fillStyle = "#48bb78";
    ctx.font = "bold 16px Arial";
    ctx.fillText("gradia.jobs", width / 2, 1030);

    try {
      const logoImg = await loadImage(gradiaLogo);
      ctx.drawImage(logoImg, width / 2 - 40, 1040, 80, 30);
    } catch (e) {
      console.error("Failed to load Gradia logo:", e);
    }

    return canvas.toDataURL("image/png");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Create Flyer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Printable QR Flyer</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="space-y-4">
            {/* AI Generate Button */}
            <Button
              onClick={handleAIGenerate}
              disabled={isGenerating || !jobData}
              variant="outline"
              className="w-full border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Generate Flyer Content
                </>
              )}
            </Button>
            {!jobData && (
              <p className="text-xs text-muted-foreground text-center -mt-2">
                Select a specific job to enable AI suggestions
              </p>
            )}

            <div>
              <Label htmlFor="headline">Headline</Label>
              <Input
                id="headline"
                value={flyerData.headline}
                onChange={(e) => setFlyerData({ ...flyerData, headline: e.target.value })}
                placeholder="We're Hiring!"
              />
            </div>
            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Textarea
                id="tagline"
                value={flyerData.tagline}
                onChange={(e) => setFlyerData({ ...flyerData, tagline: e.target.value })}
                placeholder="Join our team..."
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="positions">Open Positions</Label>
              <Input
                id="positions"
                value={flyerData.positions}
                onChange={(e) => setFlyerData({ ...flyerData, positions: e.target.value })}
                placeholder="Software Engineers, Designers..."
              />
            </div>
            <div>
              <Label htmlFor="jobDetails">Job Description / Details</Label>
              <Textarea
                id="jobDetails"
                value={flyerData.jobDetails}
                onChange={(e) => setFlyerData({ ...flyerData, jobDetails: e.target.value })}
                placeholder="Full job description, requirements, qualifications..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={flyerData.location}
                  onChange={(e) => setFlyerData({ ...flyerData, location: e.target.value })}
                  placeholder="City, Country"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={flyerData.contactPhone}
                  onChange={(e) => setFlyerData({ ...flyerData, contactPhone: e.target.value })}
                  placeholder="+91 12345 67890"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={flyerData.contactEmail}
                  onChange={(e) => setFlyerData({ ...flyerData, contactEmail: e.target.value })}
                  placeholder="careers@company.com"
                />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  value={flyerData.website}
                  onChange={(e) => setFlyerData({ ...flyerData, website: e.target.value })}
                  placeholder="www.company.com"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download PNG
              </Button>
              <Button variant="outline" onClick={handlePrint} className="flex-1">
                <FileText className="h-4 w-4 mr-2" />
                Print
              </Button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              ref={flyerRef}
              className="bg-gradient-to-b from-[#1a365d] via-[#2c5282] to-[#1a365d] text-white p-6 aspect-[3/4] relative overflow-hidden"
              style={{ minHeight: "500px" }}
            >
              {/* Decorative circles */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-20 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2" />

              {/* Header */}
              <div className="bg-white/10 -mx-6 -mt-6 px-6 py-4 mb-6">
                <div className="flex items-center justify-center gap-3">
                  {companyLogo ? (
                    <img src={companyLogo} alt={companyName} className="h-10 w-10 object-contain rounded" />
                  ) : (
                    <Briefcase className="h-8 w-8 text-emerald-400" />
                  )}
                  <h2 className="text-xl font-bold">{companyName}</h2>
                </div>
              </div>

              {/* Content */}
              <div className="text-center space-y-4 relative z-10">
                <h1 className="text-3xl font-bold text-emerald-400">{flyerData.headline}</h1>
                <p className="text-gray-200 text-sm">{flyerData.tagline}</p>

                {/* Positions */}
                <div className="bg-white text-gray-800 rounded-lg px-4 py-3 font-semibold text-sm">
                  {flyerData.positions}
                </div>

                {/* QR Code */}
                <div className="bg-white rounded-xl p-4 inline-block mx-auto">
                  <QRCodeSVG
                    id="flyer-qr-code"
                    value={qrUrl}
                    size={120}
                    level="H"
                    includeMargin
                    bgColor="#ffffff"
                    fgColor="#1a365d"
                  />
                  <p className="text-gray-800 font-bold text-xs mt-2">SCAN TO APPLY</p>
                  <span className="text-emerald-500 text-lg">👆</span>
                </div>

                {/* Contact Info */}
                <div className="bg-white/10 rounded-lg px-4 py-3 text-xs space-y-1 mt-4">
                  <div className="flex items-center justify-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span>{flyerData.location}</span>
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {flyerData.contactPhone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {flyerData.contactEmail}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <Globe className="h-3 w-3" />
                    <span>{flyerData.website}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <p className="text-gray-400 text-[10px]">Powered by</p>
                <img src={gradiaLogo} alt="Gradia" className="h-6 mx-auto opacity-70" />
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRFlyerModal;
