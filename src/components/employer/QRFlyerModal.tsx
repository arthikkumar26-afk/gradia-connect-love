import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

// ---- Theme colors ----
const NAVY = "#1f2747";
const GREEN = "#7ed957";
const LIGHT = "#f3f4f3";

// Detect content-heavy: long description OR many skills/responsibilities
const detectContentHeavy = (job?: JobData | null) => {
  if (!job) return false;
  const desc = job.description?.length || 0;
  const skillCount = job.skills?.length || 0;
  return desc > 350 || skillCount > 5;
};

const splitDescriptionIntoResponsibilities = (desc?: string | null) => {
  if (!desc) return [] as { title: string; detail: string }[];
  const cleaned = desc.replace(/\s+/g, " ").trim();
  // Try to split by numbered headings or sentences
  const sentences = cleaned.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(s => s.length > 15);
  return sentences.slice(0, 7).map((s, i) => {
    const colon = s.indexOf(":");
    if (colon > 0 && colon < 40) {
      return { title: s.slice(0, colon).trim(), detail: s.slice(colon + 1).trim().slice(0, 140) };
    }
    return { title: `Responsibility ${i + 1}`, detail: s.slice(0, 140) };
  });
};

const QRFlyerModal = ({ employerId, companyName = "Your Company", companyLogo, jobData, trigger, open: openProp, onOpenChange }: QRFlyerModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (v: boolean) => {
    if (!isControlled) setInternalOpen(v);
    onOpenChange?.(v);
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const flyerRef = useRef<HTMLDivElement>(null);

  const autoHeavy = useMemo(() => detectContentHeavy(jobData), [jobData]);
  const [layout, setLayout] = useState<"compact" | "detailed" | "ai">(autoHeavy ? "detailed" : "compact");
  const [aiStyle, setAiStyle] = useState<string>("modern corporate");
  const [aiImageUrl, setAiImageUrl] = useState<string>("");
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

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

  const initialResponsibilities = useMemo(
    () => splitDescriptionIntoResponsibilities(jobData?.description),
    [jobData?.description]
  );

  const [flyerData, setFlyerData] = useState({
    headline: "We're Hiring!",
    tagline: "Join our growing team and build your career",
    positions: jobData?.designation || jobData?.job_title || "Multiple Positions Available",
    jobDetails: buildJobDetails(),
    location: jobData?.location || "All India",
    contactPhone: "",
    contactEmail: "info@gradia.world",
    website: "www.gradia.world",
    // Detailed layout fields
    responsibilities: initialResponsibilities.length
      ? initialResponsibilities.map(r => `${r.title}: ${r.detail}`).join("\n")
      : "Curriculum Design: Design age-appropriate curriculum and learning resources\nContent Quality: Ensure all teaching materials are accurate and consistent\nTeacher Training: Train and mentor teachers using effective methods\nAssessment: Develop child-friendly assessments to track progress\nResearch: Implement modern teaching approaches based on latest trends",
    educationalBackground: jobData?.description
      ? "Relevant Bachelor's or Master's degree from a recognized university\nProfessional certification or equivalent in the field\nGraduate / Postgraduate qualification preferred"
      : "Bachelor's or Master's degree from a recognized university\nProfessional qualification in relevant field",
    experienceText: jobData?.experience_required
      ? `${jobData.experience_required} of relevant experience required`
      : "5–10 years of experience in the relevant domain\nPrior experience in similar role preferred",
    salaryText: jobData?.salary_range || "As per industry standards",
    moreInformation: "V-Square Building, Madhapur, Hyderabad\nwww.gradiaa.com\n+91 8688369502",
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
        const aiJobDetails = content.keyPoints?.length ? content.keyPoints.slice(0, 6).join("\n") : "";
        const aiResp = Array.isArray(content.responsibilities) && content.responsibilities.length
          ? content.responsibilities.map((r: any) => `${r.title}: ${r.detail}`).join("\n")
          : "";
        const aiEdu = Array.isArray(content.educationalBackground) && content.educationalBackground.length
          ? content.educationalBackground.join("\n") : "";
        const aiExp = Array.isArray(content.experience) && content.experience.length
          ? content.experience.join("\n") : "";
        const aiMore = Array.isArray(content.moreInformation) && content.moreInformation.length
          ? content.moreInformation.join("\n") : "";
        setFlyerData(prev => ({
          ...prev,
          headline: content.headline || prev.headline,
          tagline: content.tagline || prev.tagline,
          positions: content.positions || prev.positions,
          jobDetails: aiJobDetails || prev.jobDetails,
          contactEmail: content.contactEmail || prev.contactEmail,
          website: content.website || prev.website,
          responsibilities: aiResp || prev.responsibilities,
          educationalBackground: aiEdu || prev.educationalBackground,
          experienceText: aiExp || prev.experienceText,
          salaryText: content.salaryRange || prev.salaryText,
          moreInformation: aiMore || prev.moreInformation,
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

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
    const words = text.split(" ");
    let line = "";
    let curY = y;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, curY);
        line = words[n] + " ";
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, curY);
    return curY + lineHeight;
  };

  const generateCompactFlyer = async (): Promise<string> => {
    const canvas = document.createElement("canvas");
    const width = 800;
    const height = 1130;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    const pad = 60;
    const innerW = width - pad * 2;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const barGrad = ctx.createLinearGradient(0, 0, width, 0);
    barGrad.addColorStop(0, "#0f4c75");
    barGrad.addColorStop(1, "#3282b8");
    ctx.fillStyle = barGrad;
    ctx.fillRect(0, 0, width, 8);

    ctx.fillStyle = "#0f4c75";
    roundRect(ctx, pad, 40, innerW, 90, 12);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 30px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(companyName.toUpperCase(), width / 2, 95);

    ctx.fillStyle = "#0f4c75";
    ctx.font = "bold 46px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(flyerData.headline, width / 2, 195);

    const headW = ctx.measureText(flyerData.headline).width;
    ctx.fillStyle = "#f7941d";
    ctx.fillRect(width / 2 - headW / 2, 205, headW, 4);

    ctx.fillStyle = "#555555";
    ctx.font = "18px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(flyerData.tagline, width / 2, 240);

    const badgeY = 270;
    ctx.fillStyle = "#f7941d";
    roundRect(ctx, pad, badgeY, innerW, 60, 10);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(flyerData.positions, width / 2, badgeY + 38);

    let y = 365;
    const detailItems = flyerData.jobDetails ? flyerData.jobDetails.split("\n").filter(l => l.trim()).slice(0, 6) : [];

    if (detailItems.length > 0) {
      ctx.fillStyle = "#0f4c75";
      ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("KEY HIGHLIGHTS", pad, y);
      ctx.fillStyle = "#e0e0e0";
      ctx.fillRect(pad, y + 8, innerW, 1);
      y += 30;

      ctx.font = "15px 'Segoe UI', Arial, sans-serif";
      for (const item of detailItems) {
        const text = item.replace(/^[•\-]\s*/, "");
        ctx.fillStyle = "#f7941d";
        ctx.beginPath();
        ctx.arc(pad + 8, y - 4, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#333333";
        ctx.textAlign = "left";
        let displayText = text;
        while (ctx.measureText(displayText).width > innerW - 30 && displayText.length > 10) {
          displayText = displayText.slice(0, -4) + "...";
        }
        ctx.fillText(displayText, pad + 22, y);
        y += 28;
      }
      y += 10;
    }

    const bottomY = Math.max(y, 580);
    ctx.fillStyle = "#e0e0e0";
    ctx.fillRect(pad, bottomY, innerW, 1);
    const colW = innerW / 2;

    const qrBoxX = pad;
    const qrBoxY = bottomY + 20;
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, qrBoxX, qrBoxY, colW - 15, 280, 12);
    ctx.fill();
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 1;
    roundRect(ctx, qrBoxX, qrBoxY, colW - 15, 280, 12);
    ctx.stroke();

    const qrSize = 180;
    const qrX = qrBoxX + (colW - 15) / 2 - qrSize / 2;
    const qrY = qrBoxY + 15;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12);

    const qrSvg = document.getElementById("flyer-qr-code");
    if (qrSvg) {
      try {
        const cloned = qrSvg.cloneNode(true) as SVGElement;
        cloned.querySelectorAll("path, rect").forEach((el) => {
          const fill = el.getAttribute("fill");
          if (fill && fill.toLowerCase() !== "none") {
            if (fill === "#f9f9f9" || fill === "#ffffff" || fill === "white") el.setAttribute("fill", "#ffffff");
            else el.setAttribute("fill", "#000000");
          }
        });
        const svgData = new XMLSerializer().serializeToString(cloned);
        const qrImg = await loadImage("data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))));
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      } catch (e) { console.error(e); }
    }
    ctx.fillStyle = "#0f4c75";
    ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SCAN TO APPLY", qrBoxX + (colW - 15) / 2, qrBoxY + 210);
    ctx.fillStyle = "#888";
    ctx.font = "12px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Point your camera at the QR code", qrBoxX + (colW - 15) / 2, qrBoxY + 232);
    ctx.fillText("to apply instantly", qrBoxX + (colW - 15) / 2, qrBoxY + 248);

    const contactX = pad + colW + 15;
    const contactW = colW - 15;
    ctx.fillStyle = "#0f4c75";
    roundRect(ctx, contactX, qrBoxY, contactW, 280, 12);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("CONTACT US", contactX + 24, qrBoxY + 35);
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
      ctx.fillText(item.icon, contactX + 24, cy);
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillText(item.text, contactX + 50, cy);
      cy += 38;
    }

    const footerY = height - 80;
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, footerY, width, 80);
    ctx.fillStyle = "#999";
    ctx.font = "12px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Powered by Gradia  •  www.gradia.world", width / 2, footerY + 35);

    try {
      const logoImg = await loadImage(gradiaLogo);
      ctx.drawImage(logoImg, width / 2 - 35, footerY + 45, 70, 25);
    } catch (e) { console.error(e); }

    const bottomBar = ctx.createLinearGradient(0, 0, width, 0);
    bottomBar.addColorStop(0, "#0f4c75");
    bottomBar.addColorStop(1, "#3282b8");
    ctx.fillStyle = bottomBar;
    ctx.fillRect(0, height - 8, width, 8);

    return canvas.toDataURL("image/png");
  };

  // ============ DETAILED (content-heavy) FLYER — matches the reference image ============
  const generateDetailedFlyer = async (): Promise<string> => {
    const canvas = document.createElement("canvas");
    const width = 900;
    const height = 1200;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Top-right accent green curve
    ctx.fillStyle = GREEN;
    ctx.beginPath();
    ctx.moveTo(width * 0.42, 0);
    ctx.quadraticCurveTo(width * 0.55, 90, width * 0.5, 180);
    ctx.lineTo(width * 0.7, 180);
    ctx.quadraticCurveTo(width * 0.62, 60, width * 0.7, 0);
    ctx.closePath();
    ctx.fill();

    // Logo box (top-left)
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 40, 40, 80, 80, 12);
    ctx.fill();
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    roundRect(ctx, 40, 40, 80, 80, 12);
    ctx.stroke();
    try {
      const logoImg = await loadImage(gradiaLogo);
      ctx.drawImage(logoImg, 50, 55, 60, 50);
    } catch (e) { /* noop */ }

    // Brand name
    ctx.fillStyle = NAVY;
    ctx.font = "bold 38px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(companyName, 140, 85);
    ctx.fillStyle = "#6b7280";
    ctx.font = "14px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("YOUR NEXT STEP", 142, 108);

    // Big "WE'RE HIRING" navy header band
    const headerY = 200;
    const headerH = 280;
    ctx.fillStyle = NAVY;
    // Asymmetric pill — rounded right side
    ctx.beginPath();
    ctx.moveTo(0, headerY);
    ctx.lineTo(width * 0.62, headerY);
    ctx.quadraticCurveTo(width * 0.78, headerY + headerH / 2, width * 0.62, headerY + headerH);
    ctx.lineTo(0, headerY + headerH);
    ctx.closePath();
    ctx.fill();

    // WE'RE
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 56px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("WE'RE", 60, headerY + 100);
    // HIRING (green)
    ctx.fillStyle = GREEN;
    ctx.font = "bold 110px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("HIRING", 60, headerY + 220);

    // Position title
    let y = headerY + headerH + 70;
    ctx.fillStyle = NAVY;
    ctx.font = "bold 32px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "left";
    y = wrapText(ctx, flyerData.positions, 60, y, width - 120, 38);

    // green accent line
    ctx.fillStyle = GREEN;
    ctx.fillRect(60, y - 20, 140, 4);

    // ===== Two-column body =====
    const leftX = 60;
    const leftW = 380;
    const rightX = 480;
    const rightW = 380;
    let leftY = y + 30;
    let rightY = y + 30;

    // Left: Job Responsibilities heading
    ctx.fillStyle = NAVY;
    ctx.font = "bold 24px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Job Responsibilities:", leftX, leftY);
    leftY += 28;

    const contentMaxY = height - 160; // keep clear of footer (footer starts at height-140)
    const respItems = flyerData.responsibilities.split("\n").filter(l => l.trim()).slice(0, 8);
    for (let i = 0; i < respItems.length; i++) {
      const line = respItems[i];
      const colon = line.indexOf(":");
      const title = colon > 0 ? line.slice(0, colon).trim() : `Item ${i + 1}`;
      const detail = colon > 0 ? line.slice(colon + 1).trim() : line.trim();
      if (leftY + 40 > contentMaxY) break; // stop before overlapping footer
      ctx.fillStyle = NAVY;
      ctx.font = "bold 14px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(`${i + 1}. ${title}`, leftX, leftY);
      leftY += 18;
      ctx.fillStyle = "#374151";
      ctx.font = "13px 'Segoe UI', Arial, sans-serif";
      const newY = wrapText(ctx, detail, leftX, leftY, leftW, 16);
      // If wrap overflowed, clamp by skipping rest
      if (newY > contentMaxY) {
        leftY = contentMaxY;
        break;
      }
      leftY = newY + 4;
    }

    // Right: Requirements heading
    ctx.fillStyle = NAVY;
    ctx.font = "bold 24px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Requirements:", rightX, rightY);
    rightY += 30;

    const drawRightSection = (title: string, items: string[]) => {
      if (rightY + 30 > contentMaxY) return;
      ctx.fillStyle = NAVY;
      ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
      ctx.fillText(title, rightX, rightY);
      rightY += 22;
      ctx.fillStyle = "#374151";
      ctx.font = "13px 'Segoe UI', Arial, sans-serif";
      for (const item of items) {
        if (rightY + 16 > contentMaxY) return;
        ctx.fillStyle = "#374151";
        ctx.fillText("•", rightX + 4, rightY);
        const newY = wrapText(ctx, item, rightX + 18, rightY, rightW - 18, 16);
        if (newY > contentMaxY) { rightY = contentMaxY; return; }
        rightY = newY + 2;
      }
      rightY += 10;
    };

    drawRightSection("Educational Background",
      flyerData.educationalBackground.split("\n").filter(l => l.trim()));
    drawRightSection("Experience",
      flyerData.experienceText.split("\n").filter(l => l.trim()));
    drawRightSection("Salary Range", [flyerData.salaryText]);
    drawRightSection("More Information",
      flyerData.moreInformation.split("\n").filter(l => l.trim()));

    // Footer area
    const footerY = height - 140;

    // "Send your CV" navy pill (left)
    ctx.fillStyle = NAVY;
    roundRect(ctx, 40, footerY, 480, 80, 40);
    ctx.fill();
    // Mail icon circle
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(85, footerY + 40, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = NAVY;
    ctx.font = "bold 20px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✉", 85, footerY + 47);
    // Text
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.font = "bold 16px 'Segoe UI', Arial, sans-serif";
    ctx.fillText("Send your CV:", 120, footerY + 35);
    ctx.font = "14px 'Segoe UI', Arial, sans-serif";
    ctx.fillText(`Email: ${flyerData.contactEmail}`, 120, footerY + 58);

    // QR (small, tucked between)
    const qrSize = 70;
    const qrX = 540;
    const qrY = footerY + 5;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
    ctx.strokeStyle = "#e5e7eb";
    ctx.strokeRect(qrX - 4, qrY - 4, qrSize + 8, qrSize + 8);
    const qrSvg = document.getElementById("flyer-qr-code");
    if (qrSvg) {
      try {
        const cloned = qrSvg.cloneNode(true) as SVGElement;
        cloned.querySelectorAll("path, rect").forEach((el) => {
          const fill = el.getAttribute("fill");
          if (fill && fill.toLowerCase() !== "none") {
            if (fill === "#f9f9f9" || fill === "#ffffff" || fill === "white") el.setAttribute("fill", "#ffffff");
            else el.setAttribute("fill", "#000000");
          }
        });
        const svgData = new XMLSerializer().serializeToString(cloned);
        const qrImg = await loadImage("data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData))));
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
      } catch (e) { /* noop */ }
    }
    ctx.fillStyle = NAVY;
    ctx.font = "bold 9px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SCAN", qrX + qrSize / 2, qrY + qrSize + 14);

    // APPLY NOW green pill (right)
    ctx.fillStyle = GREEN;
    roundRect(ctx, 640, footerY, 220, 80, 40);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 26px 'Segoe UI', Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("APPLY NOW", 750, footerY + 50);

    // Bottom faint band
    ctx.fillStyle = LIGHT;
    ctx.fillRect(0, height - 30, width, 30);

    return canvas.toDataURL("image/png");
  };

  const handleAIGenerateImage = async () => {
    setIsGeneratingImage(true);
    setAiImageUrl("");
    try {
      const respList = flyerData.responsibilities.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 8);
      const eduList = flyerData.educationalBackground.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 4);
      const expList = flyerData.experienceText.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 3);
      const moreList = flyerData.moreInformation.split("\n").map(l => l.trim()).filter(Boolean).slice(0, 3);

      const sections: string[] = [
        `Design a professional, content-rich recruitment hiring flyer poster (portrait 1080x1350).`,
        `COMPANY: ${companyName}.`,
        `HEADLINE (render large at top): "${flyerData.headline || "WE'RE HIRING"}".`,
        flyerData.tagline && `TAGLINE: "${flyerData.tagline}".`,
        `POSITION (render prominently): "${flyerData.positions || "Open Position"}".`,
        flyerData.location && `LOCATION: ${flyerData.location}.`,
        flyerData.salaryText && `SALARY: ${flyerData.salaryText}.`,
        respList.length > 0 && `KEY RESPONSIBILITIES (render as a clear bulleted list, all items visible):\n- ${respList.join("\n- ")}`,
        eduList.length > 0 && `EDUCATION REQUIREMENTS (bulleted list):\n- ${eduList.join("\n- ")}`,
        expList.length > 0 && `EXPERIENCE REQUIRED (bulleted list):\n- ${expList.join("\n- ")}`,
        moreList.length > 0 && `CONTACT / MORE INFO:\n- ${moreList.join("\n- ")}`,
        flyerData.contactEmail && `EMAIL: ${flyerData.contactEmail}.`,
        flyerData.website && `WEBSITE: ${flyerData.website}.`,
        `CALL TO ACTION: "APPLY NOW" with a "Scan to Apply" QR placeholder area at the bottom-left.`,
        `LAYOUT RULES: Use a two-column body if content is heavy (Responsibilities on left, Requirements on right). Render ALL the text content above clearly and legibly — do NOT truncate, summarize, or omit any bullet point. Use clean professional typography, strong hierarchy, balanced spacing, and ensure no text is cut off. Reserve a clean square area at bottom-left for the QR code.`,
      ].filter(Boolean) as string[];

      const promptParts = sections.join("\n\n");

      const { data, error } = await supabase.functions.invoke("generate-flyer-image", {
        body: { prompt: promptParts, style: aiStyle, size: "1080x1350" },
      });
      if (error) {
        if (error.message?.includes("429")) toast.error("Rate limit exceeded. Try again shortly.");
        else if (error.message?.includes("402")) toast.error("AI credits exhausted.");
        else throw error;
        return;
      }
      if (data?.imageUrl) {
        setAiImageUrl(data.imageUrl);
        toast.success("AI flyer generated!");
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err: any) {
      console.error("AI image error:", err);
      toast.error(err.message || "Failed to generate AI flyer image.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownload = async () => {
    try {
      if (layout === "ai") {
        if (!aiImageUrl) {
          toast.error("Generate an AI flyer first.");
          return;
        }
        const link = document.createElement("a");
        link.download = `${companyName.replace(/\s+/g, "-")}-ai-flyer.png`;
        link.href = aiImageUrl;
        link.click();
        toast.success("AI flyer downloaded!");
        return;
      }
      const dataUrl = layout === "detailed" ? await generateDetailedFlyer() : await generateCompactFlyer();
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.download = `${companyName.replace(/\s+/g, "-")}-job-flyer.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Flyer downloaded successfully!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download flyer.");
    }
  };

  const detailItems = flyerData.jobDetails ? flyerData.jobDetails.split("\n").filter(l => l.trim()).slice(0, 6) : [];
  const respLines = flyerData.responsibilities.split("\n").filter(l => l.trim());
  const eduLines = flyerData.educationalBackground.split("\n").filter(l => l.trim());
  const expLines = flyerData.experienceText.split("\n").filter(l => l.trim());
  const moreLines = flyerData.moreInformation.split("\n").filter(l => l.trim());

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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Printable QR Flyer</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form Section */}
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
              <div>
                <Label className="text-sm font-semibold">Flyer Style</Label>
                <p className="text-[11px] text-muted-foreground">Pick a layout. AI Designed creates a fully custom poster image.</p>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-md bg-background p-1 border">
                {([
                  { v: "compact", label: "Compact" },
                  { v: "detailed", label: "Detailed" },
                  { v: "ai", label: "✨ AI Designed" },
                ] as const).map(opt => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setLayout(opt.v)}
                    className={`text-xs font-medium py-1.5 rounded transition-colors ${
                      layout === opt.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {layout === "ai" && (
                <div className="space-y-2">
                  <Label htmlFor="aiStyle" className="text-xs">Visual Style</Label>
                  <select
                    id="aiStyle"
                    value={aiStyle}
                    onChange={(e) => setAiStyle(e.target.value)}
                    className="w-full text-sm rounded-md border bg-background px-2 py-1.5"
                  >
                    <option value="modern corporate">Modern Corporate</option>
                    <option value="bold minimal">Bold Minimal</option>
                    <option value="vibrant gradient">Vibrant Gradient</option>
                    <option value="elegant dark">Elegant Dark</option>
                    <option value="playful illustrated">Playful Illustrated</option>
                    <option value="editorial magazine">Editorial Magazine</option>
                    <option value="tech startup neon">Tech Startup / Neon</option>
                    <option value="indian festive">Indian Festive</option>
                  </select>
                  <Button
                    onClick={handleAIGenerateImage}
                    disabled={isGeneratingImage}
                    className="w-full"
                    size="sm"
                  >
                    {isGeneratingImage ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Designing flyer...</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" />{aiImageUrl ? "Regenerate" : "Generate"} AI Flyer</>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {layout !== "ai" && (
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
            )}

            <div>
              <Label htmlFor="headline">Headline</Label>
              <Input id="headline" value={flyerData.headline} onChange={(e) => setFlyerData({ ...flyerData, headline: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="positions">Position / Designation</Label>
              <Input id="positions" value={flyerData.positions} onChange={(e) => setFlyerData({ ...flyerData, positions: e.target.value })} />
            </div>

            {layout === "compact" ? (
              <>
                <div>
                  <Label htmlFor="tagline">Tagline</Label>
                  <Textarea id="tagline" value={flyerData.tagline} onChange={(e) => setFlyerData({ ...flyerData, tagline: e.target.value })} rows={2} />
                </div>
                <div>
                  <Label htmlFor="jobDetails">Key Highlights (one per line)</Label>
                  <Textarea id="jobDetails" value={flyerData.jobDetails} onChange={(e) => setFlyerData({ ...flyerData, jobDetails: e.target.value })} rows={4} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="responsibilities">Job Responsibilities (one per line — format: <em>Title: Description</em>)</Label>
                  <Textarea id="responsibilities" value={flyerData.responsibilities} onChange={(e) => setFlyerData({ ...flyerData, responsibilities: e.target.value })} rows={6} />
                </div>
                <div>
                  <Label htmlFor="education">Educational Background (one per line)</Label>
                  <Textarea id="education" value={flyerData.educationalBackground} onChange={(e) => setFlyerData({ ...flyerData, educationalBackground: e.target.value })} rows={3} />
                </div>
                <div>
                  <Label htmlFor="experience">Experience (one per line)</Label>
                  <Textarea id="experience" value={flyerData.experienceText} onChange={(e) => setFlyerData({ ...flyerData, experienceText: e.target.value })} rows={2} />
                </div>
                <div>
                  <Label htmlFor="salary">Salary Range</Label>
                  <Input id="salary" value={flyerData.salaryText} onChange={(e) => setFlyerData({ ...flyerData, salaryText: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="moreInfo">More Information (address, website, phone — one per line)</Label>
                  <Textarea id="moreInfo" value={flyerData.moreInformation} onChange={(e) => setFlyerData({ ...flyerData, moreInformation: e.target.value })} rows={3} />
                </div>
              </>
            )}

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

            <div className="flex gap-3 pt-4">
              <Button onClick={handleDownload} className="flex-1">
                <Download className="h-4 w-4 mr-2" />Download PNG
              </Button>
              <Button variant="outline" onClick={() => window.print()} className="flex-1">
                <FileText className="h-4 w-4 mr-2" />Print
              </Button>
            </div>
          </div>

          {/* Preview Section */}
          <div className="border rounded-lg overflow-hidden bg-white">
            {/* Hidden QR — referenced by both layouts during canvas export */}
            <div className="hidden">
              <QRCodeSVG id="flyer-qr-code" value={qrUrl} size={180} level="H" includeMargin bgColor="#ffffff" fgColor="#000000" />
            </div>

            {layout === "ai" ? (
              <div className="bg-white p-4 flex items-center justify-center min-h-[500px]">
                {aiImageUrl ? (
                  <img src={aiImageUrl} alt="AI generated flyer" className="max-w-full max-h-[700px] object-contain rounded-md shadow" />
                ) : (
                  <div className="text-center text-muted-foreground text-sm space-y-2 px-6">
                    <Sparkles className="h-10 w-10 mx-auto opacity-50" />
                    <p>Pick a visual style and click <strong>Generate AI Flyer</strong> to create a custom designed poster.</p>
                  </div>
                )}
              </div>
            ) : layout === "compact" ? (
              <div ref={flyerRef} className="bg-white text-gray-800 relative" style={{ minHeight: "500px" }}>
                <div className="h-2 bg-gradient-to-r from-[#0f4c75] to-[#3282b8]" />
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
                <div className="text-center mt-5 px-6">
                  <h1 className="text-3xl font-bold text-[#0f4c75]">{flyerData.headline}</h1>
                  <div className="w-20 h-1 bg-[#f7941d] mx-auto mt-2 rounded-full" />
                  <p className="text-gray-500 text-sm mt-2">{flyerData.tagline}</p>
                </div>
                <div className="mx-6 mt-4 bg-[#f7941d] rounded-lg px-4 py-3 text-center">
                  <span className="text-white font-bold text-base">{flyerData.positions}</span>
                </div>
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
                <div className="mx-6 mt-5 grid grid-cols-2 gap-3">
                  <div className="border border-gray-200 rounded-xl p-3 bg-white text-center">
                    <QRCodeSVG value={qrUrl} size={110} level="H" includeMargin bgColor="#ffffff" fgColor="#000000" />
                    <p className="text-[#0f4c75] font-bold text-[10px] mt-1">SCAN TO APPLY</p>
                    <p className="text-gray-400 text-[8px]">Point camera at QR code</p>
                  </div>
                  <div className="bg-[#0f4c75] rounded-xl p-3 text-white">
                    <p className="font-bold text-[10px] uppercase tracking-wider mb-2">Contact Us</p>
                    <div className="border-t border-white/20 pt-2 space-y-2">
                      <div className="flex items-start gap-1.5"><MapPin className="h-3 w-3 shrink-0 mt-0.5 text-white/70" /><span className="text-[9px] text-white/90">{flyerData.location}</span></div>
                      <div className="flex items-start gap-1.5"><Mail className="h-3 w-3 shrink-0 mt-0.5 text-white/70" /><span className="text-[9px] text-white/90">{flyerData.contactEmail}</span></div>
                      <div className="flex items-start gap-1.5"><Globe className="h-3 w-3 shrink-0 mt-0.5 text-white/70" /><span className="text-[9px] text-white/90">{flyerData.website}</span></div>
                      {flyerData.contactPhone && <div className="flex items-start gap-1.5"><Phone className="h-3 w-3 shrink-0 mt-0.5 text-white/70" /><span className="text-[9px] text-white/90">{flyerData.contactPhone}</span></div>}
                    </div>
                  </div>
                </div>
                <div className="mt-4 bg-gray-50 border-t border-gray-200 py-3 text-center">
                  <p className="text-gray-400 text-[8px]">Powered by Gradia • www.gradia.world</p>
                  <img src={gradiaLogo} alt="Gradia recruitment logo" className="h-4 mx-auto mt-1 opacity-60" />
                </div>
                <div className="h-2 bg-gradient-to-r from-[#0f4c75] to-[#3282b8]" />
              </div>
            ) : (
              // ===== Detailed (reference-image) preview =====
              <div ref={flyerRef} className="bg-white text-gray-800 relative" style={{ aspectRatio: "3/4" }}>
                {/* Top-right green accent */}
                <div className="absolute top-0 right-[20%] w-[28%] h-[15%]" style={{ background: GREEN, clipPath: "ellipse(80% 100% at 50% 0%)" }} />
                {/* Header logo + brand */}
                <div className="flex items-center gap-2 px-4 pt-4">
                  <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden">
                    <img src={gradiaLogo} alt={companyName} className="w-10 h-10 object-contain" />
                  </div>
                  <div>
                    <p className="text-lg font-bold" style={{ color: NAVY }}>{companyName}</p>
                    <p className="text-[8px] tracking-widest text-gray-500">YOUR NEXT STEP</p>
                  </div>
                </div>
                {/* Big WE'RE HIRING band */}
                <div className="mt-3 relative">
                  <div className="px-5 py-5 rounded-r-[60px] inline-block w-[70%]" style={{ background: NAVY }}>
                    <p className="text-white font-bold text-xl leading-none">WE'RE</p>
                    <p className="font-extrabold text-5xl leading-none mt-1" style={{ color: GREEN }}>HIRING</p>
                  </div>
                </div>
                {/* Position title */}
                <div className="px-5 mt-4">
                  <p className="font-bold text-base leading-tight" style={{ color: NAVY }}>{flyerData.positions}</p>
                  <div className="w-16 h-1 mt-2 rounded" style={{ background: GREEN }} />
                </div>

                {/* Two columns */}
                <div className="grid grid-cols-2 gap-3 px-5 mt-3 pb-24">
                  {/* Left: Responsibilities */}
                  <div>
                    <p className="font-bold text-sm mb-2" style={{ color: NAVY }}>Job Responsibilities:</p>
                    <ol className="space-y-1.5">
                      {respLines.slice(0, 8).map((line, i) => {
                        const colon = line.indexOf(":");
                        const title = colon > 0 ? line.slice(0, colon).trim() : `Item ${i + 1}`;
                        const detail = colon > 0 ? line.slice(colon + 1).trim() : line.trim();
                        return (
                          <li key={i} className="text-[9px] leading-snug">
                            <span className="font-semibold" style={{ color: NAVY }}>{i + 1}. {title}</span>
                            <p className="text-gray-700">{detail}</p>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                  {/* Right: Requirements */}
                  <div>
                    <p className="font-bold text-sm mb-2" style={{ color: NAVY }}>Requirements:</p>
                    <p className="font-semibold text-[10px] mb-1" style={{ color: NAVY }}>Educational Background</p>
                    <ul className="list-disc list-inside text-[9px] text-gray-700 space-y-0.5 mb-2">
                      {eduLines.map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                    <p className="font-semibold text-[10px] mb-1" style={{ color: NAVY }}>Experience</p>
                    <ul className="list-disc list-inside text-[9px] text-gray-700 space-y-0.5 mb-2">
                      {expLines.map((l, i) => <li key={i}>{l}</li>)}
                    </ul>
                    <p className="font-semibold text-[10px] mb-1" style={{ color: NAVY }}>Salary Range</p>
                    <ul className="list-disc list-inside text-[9px] text-gray-700 mb-2"><li>{flyerData.salaryText}</li></ul>
                    <p className="font-semibold text-[10px] mb-1" style={{ color: NAVY }}>More Information</p>
                    <div className="text-[9px] text-gray-700 space-y-0.5">
                      {moreLines.map((l, i) => <p key={i}>{l}</p>)}
                    </div>
                  </div>
                </div>

                {/* Footer pills */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 rounded-full px-3 py-2 flex-1" style={{ background: NAVY }}>
                    <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center">
                      <Mail className="h-3.5 w-3.5" style={{ color: NAVY }} />
                    </div>
                    <div className="text-white">
                      <p className="text-[10px] font-bold leading-none">Send your CV:</p>
                      <p className="text-[9px] leading-tight">Email: {flyerData.contactEmail}</p>
                    </div>
                  </div>
                  <div className="rounded-full px-4 py-2.5 font-bold text-white text-xs" style={{ background: GREEN }}>
                    APPLY NOW
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QRFlyerModal;
