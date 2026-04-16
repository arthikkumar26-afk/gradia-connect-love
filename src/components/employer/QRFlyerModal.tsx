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
    const bullets: string[] = [];
    if (jobData.subjects) bullets.push(`Subjects: ${jobData.subjects}`);
    if (jobData.classes) bullets.push(`Classes: ${jobData.classes}`);
    if (jobData.experience_required) bullets.push(`Experience: ${jobData.experience_required}`);
    if (jobData.salary_range) bullets.push(`Salary: ${jobData.salary_range}`);
    if (jobData.job_type) bullets.push(`Type: ${jobData.job_type}`);
    if (jobData.skills?.length) bullets.push(`Skills: ${jobData.skills.slice(0, 4).join(", ")}`);
    if (jobData.description && bullets.length < 5) {
      const desc = jobData.description.replace(/\s+/g, " ").trim();
      const firstSentence = desc.split(/[.!]\s/).filter(s => s.trim().length > 10)[0];
      if (firstSentence) {
        const summary = firstSentence.length > 80 ? firstSentence.substring(0, 77) + "..." : firstSentence;
        bullets.unshift(summary);
      }
    }
    return bullets.slice(0, 6).join("\n");
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
        if (error.message?.includes("429")) toast.error("Rate limit exceeded. Please try again in a moment.");
        else if (error.message?.includes("402")) toast.error("AI credits exhausted. Please add credits to continue.");
        else throw error;
        return;
      }
      if (data?.flyerContent) {
        const content = data.flyerContent;
        const aiJobDetails = content.keyPoints?.length
          ? content.keyPoints.slice(0, 6).join("\n")
          : "";
        setFlyerData(prev => ({
          ...prev,
          headline: content.headline || prev.headline,
          tagline: content.tagline || prev.tagline,
          positions: content.positions || prev.positions,
          jobDetails: aiJobDetails || prev.jobDetails,
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

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  };

  const generateFlyerImage = async (): Promise<string> => {
    const canvas = document.createElement("canvas");
    const width = 800;
    const height = 1130;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const pad = 60;
    const innerW = width - pad * 2;

    // --- Background: white ---
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // --- Top accent bar ---
    const barGrad = ctx.createLinearGradient(0, 0, width, 0);
    barGrad.addColorStop(0, "#0f4c75");
    barGrad.addColorStop(1, "#3282b8");
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, width, 8);

    // --- Header band ---
    ctx.fillStyle = "#0f4c75";
    roundRect(ctx, pad, 40, innerW, 90, 12);
    ctx.fill();

    // Company icon placeholder + name
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(companyName.toUpperCase(), width / 2, 95);

    // --- Headline ---
    ctx.fillStyle = "#0f4c75";
    ctx.font = "bold 46px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(flyerData.headline, width / 2, 195);

    // Underline accent
    const headW = ctx.measureText(flyerData.headline).width;
    ctx.fillStyle = "#f7941d";
    ctx.fillRect(width / 2 - headW / 2, 205, headW, 4);

    // --- Tagline ---
    ctx.fillStyle = "#555555";
    ctx.font = "18px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(flyerData.tagline, width / 2, 240);

    // --- Position badge ---
    const badgeY = 270;
    ctx.fillStyle = "#f7941d";
    roundRect(ctx, pad, badgeY, innerW, 60, 10);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(flyerData.positions, width / 2, badgeY + 38);

    // --- Key Highlights section ---
    let y = 365;
    const detailItems = flyerData.jobDetails
      ? flyerData.jobDetails.split("\n").filter(l => l.trim()).slice(0, 6)
      : [];

    if (detailItems.length > 0) {
      // Section header
      ctx.fillStyle = "#0f4c75";
      ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("KEY HIGHLIGHTS", pad, y);
      // Thin line
      ctx.fillStyle = "#e0e0e0";
      ctx.fillRect(pad, y + 8, innerW, 1);
      y += 30;

      ctx.font = "15px 'Segoe UI', Arial, sans-serif";
      for (const item of detailItems) {
        const text = item.replace(/^[•\-]\s*/, "");
        // Bullet dot
        ctx.fillStyle = "#f7941d";
        ctx.beginPath();
        ctx.arc(pad + 8, y - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        // Text
        ctx.fillStyle = "#333333";
        ctx.textAlign = "left";
        // Truncate if too long
        let displayText = text;
        while (ctx.measureText(displayText).width > innerW - 30 && displayText.length > 10) {
          displayText = displayText.slice(0, -4) + "...";
        }
        ctx.fillText(displayText, pad + 22, y);
        y += 28;
      }
      y += 10;
    }

    // --- Two-column bottom: QR left, Contact right ---
    const bottomY = Math.max(y, 580);
    // Divider line
    ctx.fillStyle = "#e0e0e0";
    ctx.fillRect(pad, bottomY, innerW, 1);

    const colW = innerW / 2;

    // QR section (left) - white background for max scan reliability
    const qrBoxX = pad;
    const qrBoxY = bottomY + 20;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, qrBoxX, qrBoxY, colW - 15, 280, 12);
    ctx.fill();
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    roundRect(ctx, qrBoxX, qrBoxY, colW - 15, 280, 12);
    ctx.stroke();

    // Draw QR code - white quiet zone behind QR for guaranteed scannability
    const qrSize = 180;
    const qrX = qrBoxX + (colW - 15) / 2 - qrSize / 2;
    const qrY = qrBoxY + 15;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);

    const qrSvg = document.getElementById("flyer-qr-code");
    if (qrSvg) {
      try {
        // Clone & force pure black/white for max contrast in export
        const cloned = qrSvg.cloneNode(true) as SVGElement;
        cloned.querySelectorAll("path, rect").forEach((el) => {
          const fill = el.getAttribute("fill");
          if (fill && fill.toLowerCase() !== "none") {
            // background rect (largest) -> white; foreground modules -> black
            if (fill === "#f9f9f9" || fill === "#ffffff" || fill === "white") {
              el.setAttribute("fill", "#ffffff");
            } else {
              el.setAttribute("fill", "#000000");
            }
          }
        });
        const svgData = new XMLSerializer().serializeToString(cloned);
        const qrImg = await loadImage("data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))));
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      } catch (e) {
        console.error("Failed to load QR code:", e);
      }
    }
    ctx.fillStyle = "#0f4c75";
    ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SCAN TO APPLY", qrBoxX + (colW - 15) / 2, qrBoxY + 210);
    ctx.fillStyle = "#888";
    ctx.font = "12px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Point your camera at the QR code", qrBoxX + (colW - 15) / 2, qrBoxY + 232);
    ctx.fillText("to apply instantly", qrBoxX + (colW - 15) / 2, qrBoxY + 248);

    // Contact section (right)
    const contactX = pad + colW + 15;
    const contactW = colW - 15;
    ctx.fillStyle = "#0f4c75";
    roundRect(ctx, contactX, qrBoxY, contactW, 280, 12);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("CONTACT US", contactX + 24, qrBoxY + 35);
    // Thin line
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(contactX + 24, qrBoxY + 45, contactW - 48, 1);

    const contactItems = [
      { icon: "📍", text: flyerData.location },
      { icon: "📧", text: flyerData.contactEmail },
      { icon: "🌐", text: flyerData.website },
      ...(flyerData.contactPhone ? [{ icon: "📞", text: flyerData.contactPhone }] : []),
    ];

    ctx.font = "14px 'Segoe UI', Arial, sans-serif";
    let cy = qrBoxY + 80;
    for (const item of contactItems) {
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "left";
      ctx.fillText(item.icon, contactX + 24, cy);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(item.text, contactX + 50, cy);
      cy += 38;
    }

    // --- Footer bar ---
    const footerY = height - 80;
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, footerY, width, 80);
    ctx.fillStyle = "#e0e0e0";
    ctx.fillRect(0, footerY, width, 1);

    ctx.fillStyle = "#999";
    ctx.font = "12px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Powered by Gradia  •  www.gradia.world", width / 2, footerY + 35);

    try {
      const logoImg = await loadImage(gradiaLogo);
      ctx.drawImage(logoImg, width / 2 - 35, footerY + 45, 70, 25);
    } catch (e) {
      console.error("Failed to load Gradia logo:", e);
    }

    // Bottom accent bar
    const bottomBar = ctx.createLinearGradient(0, 0, width, 0);
    bottomBar.addColorStop(0, "#0f4c75");
    bottomBar.addColorStop(1, "#3282b8");
    ctx.fillStyle = bottomBar;
    ctx.fillRect(0, height - 8, width, 8);

    return canvas.toDataURL("image/png");
  };

  const handleDownload = async () => {
    try {
      const dataUrl = await generateFlyerImage();
      if (!dataUrl) return;
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

  const handlePrint = () => {
    window.print();
  };

  const detailItems = flyerData.jobDetails
    ? flyerData.jobDetails.split("\n").filter(l => l.trim()).slice(0, 6)
    : [];

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
            <Button
              onClick={handleAIGenerate}
              disabled={isGenerating || !jobData}
              variant="outline"
              className="w-full border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary"
            >
              {isGenerating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating with AI...</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />AI Generate Flyer Content</>
              )}
            </Button>
            {!jobData && (
              <p className="text-xs text-muted-foreground text-center -mt-2">
                Select a specific job to enable AI suggestions
              </p>
            )}
            <div>
              <Label htmlFor="headline">Headline</Label>
              <Input id="headline" value={flyerData.headline} onChange={(e) => setFlyerData({ ...flyerData, headline: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Textarea id="tagline" value={flyerData.tagline} onChange={(e) => setFlyerData({ ...flyerData, tagline: e.target.value })} rows={2} />
            </div>
            <div>
              <Label htmlFor="positions">Open Positions</Label>
              <Input id="positions" value={flyerData.positions} onChange={(e) => setFlyerData({ ...flyerData, positions: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="jobDetails">Key Highlights (one per line, max 6)</Label>
              <Textarea id="jobDetails" value={flyerData.jobDetails} onChange={(e) => setFlyerData({ ...flyerData, jobDetails: e.target.value })} rows={4} placeholder="Experience: 5-10 years&#10;Salary: ₹50,000 - ₹75,000&#10;Type: Full-time" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={flyerData.location} onChange={(e) => setFlyerData({ ...flyerData, location: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={flyerData.contactPhone} onChange={(e) => setFlyerData({ ...flyerData, contactPhone: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={flyerData.contactEmail} onChange={(e) => setFlyerData({ ...flyerData, contactEmail: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="website">Website</Label>
                <Input id="website" value={flyerData.website} onChange={(e) => setFlyerData({ ...flyerData, website: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" />Download PNG
              </Button>
              <Button variant="outline" onClick={handlePrint} className="flex-1">
                <FileText className="h-4 w-4 mr-2" />Print
              </Button>
            </div>
          </div>

          {/* Preview Section - Professional clean design */}
          <div className="border rounded-lg overflow-hidden bg-white">
            <div ref={flyerRef} className="bg-white text-gray-800 relative" style={{ minHeight: "500px" }}>
              {/* Top accent bar */}
              <div className="h-2 bg-gradient-to-r from-[#0f4c75] to-[#3282b8]" />

              {/* Header band */}
              <div className="mx-6 mt-5 bg-[#0f4c75] rounded-xl px-4 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  {companyLogo ? (
                    <img src={companyLogo} alt={companyName} className="h-8 w-8 object-contain rounded" />
                  ) : (
                    <Briefcase className="h-6 w-6 text-white/80" />
                  )}
                  <h2 className="text-white font-bold text-lg tracking-wide uppercase">{companyName}</h2>
                </div>
              </div>

              {/* Headline */}
              <div className="text-center mt-5 px-6">
                <h1 className="text-3xl font-bold text-[#0f4c75]">{flyerData.headline}</h1>
                <div className="w-20 h-1 bg-[#f7941d] mx-auto mt-2 rounded-full" />
                <p className="text-gray-500 text-sm mt-2">{flyerData.tagline}</p>
              </div>

              {/* Position badge */}
              <div className="mx-6 mt-4 bg-[#f7941d] rounded-lg px-4 py-3 text-center">
                <span className="text-white font-bold text-base">{flyerData.positions}</span>
              </div>

              {/* Key Highlights */}
              {detailItems.length > 0 && (
                <div className="mx-6 mt-4">
                  <p className="text-xs font-bold text-[#0f4c75] uppercase tracking-wider mb-2">Key Highlights</p>
                  <div className="border-t border-gray-200 pt-2 space-y-2">
                    {detailItems.map((item, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#f7941d] mt-1.5 shrink-0" />
                        <span className="text-xs text-gray-700 leading-snug">{item.replace(/^[•\-]\s*/, "")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom: QR + Contact side by side */}
              <div className="mx-6 mt-5 grid grid-cols-2 gap-3">
                {/* QR */}
                <div className="border border-gray-200 rounded-xl p-3 bg-white text-center">
                  <QRCodeSVG
                    id="flyer-qr-code"
                    value={qrUrl}
                    size={110}
                    level="H"
                    includeMargin
                    bgColor="#ffffff"
                    fgColor="#000000"
                  />
                  <p className="text-[#0f4c75] font-bold text-[10px] mt-1">SCAN TO APPLY</p>
                  <p className="text-gray-400 text-[8px]">Point camera at QR code</p>
                </div>

                {/* Contact */}
                <div className="bg-[#0f4c75] rounded-xl p-3 text-white">
                  <p className="font-bold text-[10px] uppercase tracking-wider mb-2">Contact Us</p>
                  <div className="border-t border-white/20 pt-2 space-y-2">
                    <div className="flex items-start gap-1.5">
                      <MapPin className="h-3 w-3 shrink-0 mt-0.5 text-white/70" />
                      <span className="text-[9px] text-white/90">{flyerData.location}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Mail className="h-3 w-3 shrink-0 mt-0.5 text-white/70" />
                      <span className="text-[9px] text-white/90">{flyerData.contactEmail}</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Globe className="h-3 w-3 shrink-0 mt-0.5 text-white/70" />
                      <span className="text-[9px] text-white/90">{flyerData.website}</span>
                    </div>
                    {flyerData.contactPhone && (
                      <div className="flex items-start gap-1.5">
                        <Phone className="h-3 w-3 shrink-0 mt-0.5 text-white/70" />
                        <span className="text-[9px] text-white/90">{flyerData.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 bg-gray-50 border-t border-gray-200 py-3 text-center">
                <p className="text-gray-400 text-[8px]">Powered by Gradia • www.gradia.world</p>
                <img src={gradiaLogo} alt="Gradia" className="h-4 mx-auto mt-1 opacity-60" />
              </div>

              {/* Bottom accent bar */}
              <div className="h-2 bg-gradient-to-r from-[#0f4c75] to-[#3282b8]" />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRFlyerModal;
