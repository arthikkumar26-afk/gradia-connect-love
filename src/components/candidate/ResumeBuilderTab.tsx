import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Eye, FileText, Plus, Trash2, Sparkles, Edit2, Check, RefreshCw, Layout, Palette, Save, Loader2, Upload, TrendingUp, Crown, Zap, Lock, ImageIcon, X } from "lucide-react";
import ATSScoreCard from "./ATSScoreCard";
import { toast as sonnerToast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImageCropModal } from "@/components/ui/ImageCropModal";

interface Experience {
  title: string;
  company: string;
  duration: string;
  description: string;
}

interface Education {
  degree: string;
  school: string;
  year: string;
}

interface Project {
  name: string;
  technologies: string;
  duration: string;
  description: string;
}

interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  photoUrl?: string;
  photoPosition?: "left" | "right" | "none";
}

import { TEMPLATE_CONFIG, getTemplateComponent } from "./ResumeTemplates";

export default function ResumeBuilderTab() {
  const { toast } = useToast();
  
  const [selectedTemplate, setSelectedTemplate] = useState("executive");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [mockTestData, setMockTestData] = useState<any>(null);
  const [newSkill, setNewSkill] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [userPlan, setUserPlan] = useState<"basic" | "pro" | "premium">("basic");

  const [formData, setFormData] = useState<ResumeData>({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
    experience: [{ title: "", company: "", duration: "", description: "" }],
    education: [{ degree: "", school: "", year: "" }],
    skills: [],
    projects: [{ name: "", technologies: "", duration: "", description: "" }],
    photoUrl: "",
    photoPosition: "left",
  });
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [rawImageUrl, setRawImageUrl] = useState<string>("");

  useEffect(() => {
    loadSavedResume();
    fetchMockTestResults();
    // Listen for auth state to ensure user is ready before checking subscription
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        checkPremiumStatus();
      }
    });
    checkPremiumStatus(); // also try immediately in case already logged in
    return () => subscription.unsubscribe();
  }, []);

  const checkPremiumStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: activeSub, error } = await supabase
        .from('candidate_subscriptions')
        .select('id, plan, status, ends_at')
        .eq('candidate_id', user.id)
        .eq('status', 'active')
        .in('plan', ['premium', 'pro'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      console.log('Subscription check:', activeSub, error);

      // Validate ends_at — treat null ends_at as still active
      const isValid = activeSub && (
        !activeSub.ends_at || new Date(activeSub.ends_at) > new Date()
      );

      setIsPremiumUser(!!isValid);
      if (isValid) {
        setUserPlan(activeSub.plan as "pro" | "premium");
      } else {
        setUserPlan("basic");
      }
    } catch (err) {
      console.error('Error checking premium status:', err);
    }
  };

  const loadSavedResume = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Always fetch the latest email from profiles (source of truth)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email, mobile, full_name, location, current_district, current_state')
        .eq('id', user.id)
        .maybeSingle();

      const latestEmail = profileData?.email || user.email || "";

      // First try to load saved resume from database
      const { data: savedResume } = await supabase
        .from('candidate_resumes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (savedResume) {
        const expData = savedResume.experience as unknown as Experience[] | null;
        const eduData = savedResume.education as unknown as Education[] | null;
        
        setFormData({
          fullName: savedResume.full_name || profileData?.full_name || "",
          email: latestEmail, // Always use latest email from profile
          phone: savedResume.phone || profileData?.mobile || "",
          location: savedResume.location || profileData?.location || `${profileData?.current_district || ""}, ${profileData?.current_state || ""}`.replace(/^, |, $/g, "") || "",
          summary: savedResume.summary || "",
          experience: expData || [{ title: "", company: "", duration: "", description: "" }],
          education: eduData || [{ degree: "", school: "", year: "" }],
          skills: savedResume.skills || [],
          projects: (savedResume as any).projects || [{ name: "", technologies: "", duration: "", description: "" }],
        });
        setSelectedTemplate(savedResume.selected_template || "modern");
        return;
      }

      // If no saved resume, populate from profile
      await fetchUserProfile(user.id);
    } catch (error) {
      console.error("Error loading saved resume:", error);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profile) {
        setFormData(prev => ({
          ...prev,
          fullName: profile.full_name || "",
          email: profile.email || "",
          phone: profile.mobile || "",
          location: profile.location || `${profile.current_district || ""}, ${profile.current_state || ""}`.replace(/^, |, $/g, ""),
        }));
      }

      const { data: education } = await supabase
        .from('educational_qualifications')
        .select('*')
        .eq('user_id', userId)
        .order('display_order');
      
      if (education && education.length > 0) {
        setFormData(prev => ({
          ...prev,
          education: education.map(edu => ({
            degree: `${edu.education_level}${edu.specialization ? ` - ${edu.specialization}` : ""}`,
            school: edu.school_college_name || edu.board_university || "",
            year: edu.year_of_passing?.toString() || ""
          }))
        }));
      }

      const { data: experience } = await supabase
        .from('work_experience')
        .select('*')
        .eq('user_id', userId)
        .order('display_order');
      
      if (experience && experience.length > 0) {
        setFormData(prev => ({
          ...prev,
          experience: experience.map(exp => ({
            title: exp.designation || "",
            company: exp.organization || "",
            duration: `${exp.from_date || ""} - ${exp.to_date || "Present"}`,
            description: exp.department || ""
          }))
        }));
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const saveResume = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not logged in",
          description: "Please log in to save your resume.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('candidate_resumes')
        .upsert({
          user_id: user.id,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
          summary: formData.summary,
          experience: JSON.parse(JSON.stringify(formData.experience)),
          education: JSON.parse(JSON.stringify(formData.education)),
          skills: formData.skills,
          selected_template: selectedTemplate,
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setHasUnsavedChanges(false);
      toast({
        title: "Resume Saved!",
        description: "Your resume has been saved successfully.",
      });
    } catch (error) {
      console.error("Error saving resume:", error);
      toast({
        title: "Error",
        description: "Failed to save resume. Please try again.",
        variant: "destructive",
      });
    }
    setIsSaving(false);
  };

  const fetchMockTestResults = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: mockTests } = await supabase
          .from('mock_test_sessions')
          .select('*')
          .eq('candidate_id', user.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(1);
        
        if (mockTests && mockTests.length > 0) {
          setMockTestData(mockTests[0]);
        }
      }
    } catch (error) {
      console.error("Error fetching mock test results:", error);
    }
  };

  const handleSyncFromMockTest = async () => {
    setIsLoading(true);
    try {
      if (mockTestData && mockTestData.score && mockTestData.score >= 70) {
        const newSkills = ["Problem Solving", "Quick Learner", "Analytical Skills"];
        const mergedSkills = [...new Set([...formData.skills, ...newSkills])];
        setFormData(prev => ({ ...prev, skills: mergedSkills }));
        setHasUnsavedChanges(true);
      }
      toast({
        title: "Resume Updated!",
        description: "Skills updated based on mock test performance.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sync mock test data.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleInputChange = (field: keyof ResumeData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value as never }));
    setHasUnsavedChanges(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file.", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Image must be under 5MB.", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setRawImageUrl(url);
    setCropOpen(true);
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleCroppedPhoto = async (croppedBlob: Blob) => {
    setUploadingPhoto(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const path = `${user.id}/resume-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("profile-pictures")
        .upload(path, croppedBlob, { upsert: true, contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("profile-pictures").getPublicUrl(path);
      setFormData(prev => ({ ...prev, photoUrl: data.publicUrl }));
      setHasUnsavedChanges(true);
      toast({ title: "Photo ready", description: "Cropped to a clean square for your resume." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message || "Could not upload image.", variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
      if (rawImageUrl) {
        URL.revokeObjectURL(rawImageUrl);
        setRawImageUrl("");
      }
    }
  };

  const removePhoto = () => {
    setFormData(prev => ({ ...prev, photoUrl: "" }));
    setHasUnsavedChanges(true);
  };

  const handleExperienceChange = (index: number, field: keyof Experience, value: string) => {
    const updated = [...formData.experience];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, experience: updated }));
    setHasUnsavedChanges(true);
  };

  const handleEducationChange = (index: number, field: keyof Education, value: string) => {
    const updated = [...formData.education];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, education: updated }));
    setHasUnsavedChanges(true);
  };

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [...prev.experience, { title: "", company: "", duration: "", description: "" }]
    }));
    setHasUnsavedChanges(true);
  };

  const removeExperience = (index: number) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
    setHasUnsavedChanges(true);
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, { degree: "", school: "", year: "" }]
    }));
    setHasUnsavedChanges(true);
  };

  const removeEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
    setHasUnsavedChanges(true);
  };

  const handleProjectChange = (index: number, field: keyof Project, value: string) => {
    const updated = [...formData.projects];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, projects: updated }));
    setHasUnsavedChanges(true);
  };

  const addProject = () => {
    setFormData(prev => ({
      ...prev,
      projects: [...prev.projects, { name: "", technologies: "", duration: "", description: "" }]
    }));
    setHasUnsavedChanges(true);
  };

  const removeProject = (index: number) => {
    setFormData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index)
    }));
    setHasUnsavedChanges(true);
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill("");
      setHasUnsavedChanges(true);
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
    setHasUnsavedChanges(true);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    setHasUnsavedChanges(true);
  };

  const generatePDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      const addText = (text: string, x: number, fontSize: number, style: string = 'normal', color: [number, number, number] = [0, 0, 0]) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', style);
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(text, contentWidth - (x - margin));
        doc.text(lines, x, y);
        y += lines.length * (fontSize * 0.45) + 2;
      };

      // Header
      doc.setFillColor(26, 35, 50);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text(formData.fullName || 'Your Name', margin, 18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const contactParts = [formData.email, formData.phone, formData.location].filter(Boolean);
      doc.text(contactParts.join('  |  '), margin, 28);
      if (formData.experience[0]?.title) {
        doc.setFontSize(12);
        doc.text(formData.experience[0].title, margin, 36);
      }
      y = 50;

      // Summary
      if (formData.summary) {
        addText('PROFESSIONAL SUMMARY', margin, 12, 'bold', [30, 64, 175]);
        doc.setDrawColor(30, 64, 175);
        doc.line(margin, y, margin + 50, y);
        y += 4;
        addText(formData.summary, margin, 9, 'normal', [71, 85, 105]);
        y += 4;
      }

      // Experience
      if (formData.experience.some(e => e.title || e.company)) {
        addText('WORK EXPERIENCE', margin, 12, 'bold', [30, 64, 175]);
        doc.setDrawColor(30, 64, 175);
        doc.line(margin, y, margin + 50, y);
        y += 4;
        formData.experience.filter(e => e.title || e.company).forEach(exp => {
          if (y > 270) { doc.addPage(); y = 20; }
          addText(exp.title, margin, 10, 'bold', [15, 23, 42]);
          addText(`${exp.company}  |  ${exp.duration}`, margin, 9, 'normal', [100, 116, 139]);
          if (exp.description) addText(exp.description, margin, 9, 'normal', [71, 85, 105]);
          y += 2;
        });
        y += 2;
      }

      // Education
      if (formData.education.some(e => e.degree || e.school)) {
        if (y > 250) { doc.addPage(); y = 20; }
        addText('EDUCATION', margin, 12, 'bold', [30, 64, 175]);
        doc.setDrawColor(30, 64, 175);
        doc.line(margin, y, margin + 50, y);
        y += 4;
        formData.education.filter(e => e.degree || e.school).forEach(edu => {
          addText(edu.degree, margin, 10, 'bold', [15, 23, 42]);
          addText(`${edu.school}${edu.year ? '  |  ' + edu.year : ''}`, margin, 9, 'normal', [100, 116, 139]);
          y += 1;
        });
        y += 2;
      }

      // Projects
      if (formData.projects && formData.projects.some(p => p.name || p.description)) {
        if (y > 250) { doc.addPage(); y = 20; }
        addText('PROJECTS', margin, 12, 'bold', [30, 64, 175]);
        doc.setDrawColor(30, 64, 175);
        doc.line(margin, y, margin + 50, y);
        y += 4;
        formData.projects.filter(p => p.name || p.description).forEach(proj => {
          if (y > 270) { doc.addPage(); y = 20; }
          addText(proj.name, margin, 10, 'bold', [15, 23, 42]);
          const meta = [proj.technologies, proj.duration].filter(Boolean).join('  |  ');
          if (meta) addText(meta, margin, 9, 'normal', [100, 116, 139]);
          if (proj.description) addText(proj.description, margin, 9, 'normal', [71, 85, 105]);
          y += 2;
        });
        y += 2;
      }

      // Skills
      if (formData.skills.length > 0) {
        if (y > 260) { doc.addPage(); y = 20; }
        addText('SKILLS', margin, 12, 'bold', [30, 64, 175]);
        doc.setDrawColor(30, 64, 175);
        doc.line(margin, y, margin + 50, y);
        y += 4;
        addText(formData.skills.join('  •  '), margin, 9, 'normal', [71, 85, 105]);
      }

      doc.save(`${(formData.fullName || 'resume').replace(/\s+/g, '_')}_Resume.pdf`);
      toast({
        title: "Resume Downloaded!",
        description: "Your resume has been downloaded as PDF.",
      });
    } catch (error) {
      console.error('PDF export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const EXPORT_PDF_POINTS = 50;

  const handleExport = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please log in", description: "You need to be logged in to export your resume.", variant: "destructive" });
        return;
      }

      // Check if user has an active premium subscription — skip payment if so
      const { data: activeSub } = await supabase
        .from('candidate_subscriptions')
        .select('id, plan')
        .eq('candidate_id', user.id)
        .eq('status', 'active')
        .in('plan', ['premium', 'pro'])
        .maybeSingle();

      if (activeSub) {
        await generatePDF();
        return;
      }

      // Subscription-quota-based PDF export.
      // Plan limits (mirrors src/config/candidatePlans.ts):
      //   basic: 1 download / month
      //   pro / premium: unlimited
      const periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      const psDate = periodStart.toISOString().slice(0, 10);

      const monthlyLimit = activeSub ? Infinity : 1;

      const { data: usageRow } = await supabase
        .from('candidate_feature_usage')
        .select('id, used_count')
        .eq('candidate_id', user.id)
        .eq('feature', 'resume_download')
        .eq('period_start', psDate)
        .maybeSingle();

      const used = usageRow?.used_count ?? 0;
      if (monthlyLimit !== Infinity && used >= monthlyLimit) {
        toast({
          title: 'Monthly download limit reached',
          description: 'Free plan includes 1 resume PDF per month. Upgrade to Pro or Premium for unlimited downloads.',
          variant: 'destructive',
        });
        return;
      }

      // Increment usage
      if (usageRow) {
        await supabase
          .from('candidate_feature_usage')
          .update({ used_count: used + 1 })
          .eq('id', usageRow.id);
      } else {
        await supabase
          .from('candidate_feature_usage')
          .insert({
            candidate_id: user.id,
            feature: 'resume_download',
            period_start: psDate,
            used_count: 1,
          });
      }

      sonnerToast.success('Generating PDF using your plan quota...');
      await generatePDF();
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Export Failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    }
  };

  const handleUploadResume = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf,.docx,.doc,.jpg,.jpeg,.png";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      sonnerToast.loading("AI is analyzing your resume...", { id: "resume-upload" });

      try {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);

        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-resume`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: formDataUpload,
          }
        );

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Failed to parse resume");
        }

        const data = await response.json();

        // Map AI-extracted data to resume form
        setFormData(prev => ({
          fullName: data.full_name || prev.fullName,
          email: data.email || prev.email,
          phone: data.mobile || prev.phone,
          location: data.location || data.current_district || prev.location,
          summary: data.experience_summary || prev.summary,
          experience: data.experience && data.experience.length > 0
            ? data.experience.map((exp: any) => ({
                title: exp.designation || "",
                company: exp.organization || "",
                duration: `${exp.from_date || ""} - ${exp.to_date || "Present"}`,
                description: exp.department || "",
              }))
            : prev.experience,
          education: data.education && data.education.length > 0
            ? data.education.map((edu: any) => ({
                degree: `${edu.education_level || ""}${edu.specialization ? ` - ${edu.specialization}` : ""}`,
                school: edu.school_college_name || edu.board_university || "",
                year: edu.year_of_passing?.toString() || "",
              }))
            : prev.education,
          skills: data.skills && data.skills.length > 0
            ? [...new Set([...prev.skills, ...data.skills])]
            : data.skill_highlights && data.skill_highlights.length > 0
              ? [...new Set([...prev.skills, ...data.skill_highlights])]
              : prev.skills,
          projects: data.projects && data.projects.length > 0
            ? data.projects.map((proj: any) => ({
                name: proj.name || "",
                technologies: proj.technologies || "",
                duration: proj.duration || "",
                description: proj.description || "",
              }))
            : prev.projects,
        }));

        setHasUnsavedChanges(true);
        sonnerToast.success("Resume parsed successfully! Review and save your details.", { id: "resume-upload" });
      } catch (error: any) {
        console.error("Resume upload error:", error);
        sonnerToast.error(error.message || "Failed to analyze resume", { id: "resume-upload" });
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const SelectedTemplateComponent = getTemplateComponent(selectedTemplate);

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <Button variant="hero" size="sm" onClick={handleUploadResume} disabled={isUploading}>
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            {isUploading ? "Analyzing..." : "Upload Resume"}
          </Button>
          <Button 
            size="sm" 
            onClick={saveResume} 
            disabled={isSaving}
            variant={hasUnsavedChanges ? "default" : "outline"}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {hasUnsavedChanges ? "Save*" : "Save"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            {isPremiumUser ? "Export PDF" : "Export PDF - ₹50"}
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Banner */}
      {hasUnsavedChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-amber-700">You have unsaved changes</span>
          <Button size="sm" variant="ghost" className="h-6 text-xs text-amber-700" onClick={saveResume} disabled={isSaving}>
            Save now
          </Button>
        </div>
      )}

      {/* ATS Score Card */}
      <ATSScoreCard data={formData} />

      {/* Plan limit info */}
      <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2">
          {userPlan === "premium" ? (
            <Crown className="h-3.5 w-3.5 text-yellow-500" />
          ) : userPlan === "pro" ? (
            <Zap className="h-3.5 w-3.5 text-blue-500" />
          ) : (
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-xs font-medium text-foreground">
            ATS Resume Builder
          </span>
        </div>
        <div className="flex items-center gap-2">
          {userPlan === "premium" ? (
            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-[10px] px-2">
              <Crown className="h-2.5 w-2.5 mr-1" />
              Premium — Unlimited
            </Badge>
          ) : userPlan === "pro" ? (
            <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px] px-2">
              <Zap className="h-2.5 w-2.5 mr-1" />
              Pro — 5 Resumes
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] px-2 text-muted-foreground">
              Basic — Upgrade to build more
            </Badge>
          )}
        </div>
      </div>

      {/* Mock Test Insight Banner */}
      {mockTestData && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="py-2 px-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs font-medium">Mock Test: {mockTestData.score}% | {mockTestData.correct_answers}/{mockTestData.total_questions} correct</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                Skills auto-updated
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="edit" className="space-y-3">
        <TabsList className="grid w-full grid-cols-3 max-w-[300px] h-8">
          <TabsTrigger value="edit" className="text-xs h-7">
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs h-7">
            <Layout className="h-3 w-3 mr-1" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-xs h-7">
            <Eye className="h-3 w-3 mr-1" />
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Choose Template ({TEMPLATE_CONFIG.length} professional designs)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {TEMPLATE_CONFIG.map((template) => {
                  const TemplatePreview = template.component;
                  return (
                    <div
                      key={template.id}
                      onClick={() => handleTemplateChange(template.id)}
                      className={`cursor-pointer rounded-lg border-2 transition-all hover:shadow-lg overflow-hidden ${
                        selectedTemplate === template.id
                          ? "border-primary ring-2 ring-primary/20 shadow-md"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {/* Live mini preview */}
                      <div className="h-32 overflow-hidden relative">
                        <div className="transform scale-[0.25] origin-top-left w-[400%] h-[400%]">
                          <TemplatePreview data={formData} scale={true} />
                        </div>
                      </div>
                      <div className="p-1.5 bg-background flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium">{template.name}</p>
                          <p className="text-[10px] text-muted-foreground">{template.description}</p>
                        </div>
                        {selectedTemplate === template.id && (
                          <Check className="h-3 w-3 text-primary shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          {/* Live preview of selected template */}
          <Card className="mt-4 overflow-hidden">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm">Live Preview — {TEMPLATE_CONFIG.find(t => t.id === selectedTemplate)?.name} Template</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-w-3xl mx-auto border-t">
                <SelectedTemplateComponent data={formData} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preview Tab - full resume preview */}
        <TabsContent value="preview">
          <Card className="overflow-hidden">
            <div className="max-w-3xl mx-auto">
              <SelectedTemplateComponent data={formData} />
            </div>
          </Card>
        </TabsContent>

        {/* Edit Tab */}
        <TabsContent value="edit">
          <div className="grid gap-3">
            {/* Personal Information */}
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Full Name</Label>
                    <Input 
                      placeholder="John Doe" 
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Email</Label>
                    <Input 
                      placeholder="john@example.com" 
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Phone</Label>
                    <Input 
                      placeholder="+1 234 567 890" 
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Location</Label>
                    <Input 
                      placeholder="New York, NY" 
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Professional Summary</Label>
                  <Textarea 
                    placeholder="Brief professional summary..." 
                    value={formData.summary}
                    onChange={(e) => handleInputChange('summary', e.target.value)}
                    className="min-h-[60px] text-sm"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Profile Photo */}
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ImageIcon className="h-3.5 w-3.5" />
                  Profile Photo
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Optional — auto-cropped to a square so your resume header never looks stretched.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="flex flex-col sm:flex-row items-start gap-3">
                  <div className="relative">
                    {formData.photoUrl ? (
                      <div className="relative h-20 w-20 rounded-md overflow-hidden border bg-muted">
                        <img src={formData.photoUrl} alt="Resume photo" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="absolute top-0.5 right-0.5 bg-background/90 hover:bg-background rounded-full p-0.5 border shadow-sm"
                          aria-label="Remove photo"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-md border-2 border-dashed flex items-center justify-center bg-muted/30 text-muted-foreground">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-2 w-full">
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={photoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="h-7 text-xs"
                      >
                        <Upload className="h-3 w-3 mr-1.5" />
                        {uploadingPhoto ? "Uploading..." : formData.photoUrl ? "Replace Photo" : "Upload Photo"}
                      </Button>
                    </div>
                    <div>
                      <Label className="text-[11px] mb-1 block">Position on Resume</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {(["left", "right", "none"] as const).map((pos) => (
                          <Button
                            key={pos}
                            type="button"
                            size="sm"
                            variant={formData.photoPosition === pos ? "default" : "outline"}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, photoPosition: pos }));
                              setHasUnsavedChanges(true);
                            }}
                            className="h-6 text-[11px] px-2 capitalize"
                          >
                            {pos === "none" ? "Hide" : `${pos} edge`}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground">JPG / PNG, square works best. Max 5MB.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Experience */}
            <Card>
              <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Experience</CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addExperience}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                {formData.experience.map((exp, index) => (
                  <div key={index} className="border rounded-md p-2 space-y-1.5 relative">
                    <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-5 w-5 p-0" onClick={() => removeExperience(index)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input placeholder="Job Title" value={exp.title} onChange={(e) => handleExperienceChange(index, 'title', e.target.value)} className="h-7 text-xs" />
                      <Input placeholder="Company" value={exp.company} onChange={(e) => handleExperienceChange(index, 'company', e.target.value)} className="h-7 text-xs" />
                    </div>
                    <Input placeholder="Duration (e.g., 2020 - Present)" value={exp.duration} onChange={(e) => handleExperienceChange(index, 'duration', e.target.value)} className="h-7 text-xs" />
                    <Textarea placeholder="Description..." value={exp.description} onChange={(e) => handleExperienceChange(index, 'description', e.target.value)} className="min-h-[40px] text-xs" />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Education */}
            <Card>
              <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Education</CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addEducation}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                {formData.education.map((edu, index) => (
                  <div key={index} className="border rounded-md p-2 space-y-1.5 relative">
                    <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-5 w-5 p-0" onClick={() => removeEducation(index)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                    <Input placeholder="Degree" value={edu.degree} onChange={(e) => handleEducationChange(index, 'degree', e.target.value)} className="h-7 text-xs" />
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input placeholder="School/University" value={edu.school} onChange={(e) => handleEducationChange(index, 'school', e.target.value)} className="h-7 text-xs" />
                      <Input placeholder="Year" value={edu.year} onChange={(e) => handleEducationChange(index, 'year', e.target.value)} className="h-7 text-xs" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Projects */}
            <Card>
              <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Projects</CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={addProject}>
                  <Plus className="h-3 w-3 mr-1" /> Add Project
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                {formData.projects.map((proj, index) => (
                  <div key={index} className="border rounded-md p-2 space-y-1.5 relative">
                    <Button variant="ghost" size="sm" className="absolute top-1 right-1 h-5 w-5 p-0" onClick={() => removeProject(index)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input placeholder="Project Name" value={proj.name} onChange={(e) => handleProjectChange(index, 'name', e.target.value)} className="h-7 text-xs" />
                      <Input placeholder="Technologies Used" value={proj.technologies} onChange={(e) => handleProjectChange(index, 'technologies', e.target.value)} className="h-7 text-xs" />
                    </div>
                    <Input placeholder="Duration (e.g., Jan 2024 - Mar 2024)" value={proj.duration} onChange={(e) => handleProjectChange(index, 'duration', e.target.value)} className="h-7 text-xs" />
                    <Textarea placeholder="Project description, your role, key achievements..." value={proj.description} onChange={(e) => handleProjectChange(index, 'description', e.target.value)} className="min-h-[40px] text-xs" />
                  </div>
                ))}
                {formData.projects.length === 0 && (
                  <p className="text-xs text-muted-foreground">No projects added yet. Click "Add Project" to get started.</p>
                )}
              </CardContent>
            </Card>

            {/* Skills */}
            <Card>
              <CardHeader className="py-2 px-3">
                <CardTitle className="text-sm">Skills</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-3 pb-3">
                <div className="flex gap-1.5">
                  <Input 
                    placeholder="Add a skill..." 
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addSkill()}
                    className="h-7 text-xs"
                  />
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addSkill}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {formData.skills.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs py-0 flex items-center gap-0.5">
                      {skill}
                      <Trash2 
                        className="h-2.5 w-2.5 ml-1 cursor-pointer hover:text-destructive" 
                        onClick={() => removeSkill(skill)}
                      />
                    </Badge>
                  ))}
                  {formData.skills.length === 0 && (
                    <p className="text-xs text-muted-foreground">No skills added yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <ImageCropModal
        open={cropOpen}
        imageUrl={rawImageUrl}
        onClose={() => {
          setCropOpen(false);
          if (rawImageUrl) {
            URL.revokeObjectURL(rawImageUrl);
            setRawImageUrl("");
          }
        }}
        onCropComplete={(blob) => {
          setCropOpen(false);
          handleCroppedPhoto(blob);
        }}
      />
    </div>
  );
}
