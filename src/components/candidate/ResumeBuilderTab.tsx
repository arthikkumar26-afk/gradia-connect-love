import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Eye, FileText, Plus, Trash2, Sparkles, Edit2, Check, RefreshCw, Layout, Palette, Save, Loader2, Upload } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
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
  
  const [formData, setFormData] = useState<ResumeData>({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
    experience: [{ title: "", company: "", duration: "", description: "" }],
    education: [{ degree: "", school: "", year: "" }],
    skills: [],
  });

  useEffect(() => {
    loadSavedResume();
    fetchMockTestResults();
  }, []);

  const loadSavedResume = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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
          fullName: savedResume.full_name || "",
          email: savedResume.email || "",
          phone: savedResume.phone || "",
          location: savedResume.location || "",
          summary: savedResume.summary || "",
          experience: expData || [{ title: "", company: "", duration: "", description: "" }],
          education: eduData || [{ degree: "", school: "", year: "" }],
          skills: savedResume.skills || [],
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
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleExport = () => {
    toast({
      title: "Resume Downloaded!",
      description: "Your resume has been downloaded as PDF.",
    });
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
          <Button variant="outline" size="sm" onClick={handleSyncFromMockTest} disabled={isLoading || !mockTestData}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Mock Test
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
            Export PDF
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
    </div>
  );
}
