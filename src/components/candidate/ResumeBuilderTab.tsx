import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Eye, FileText, Plus, Trash2, Sparkles, Edit2, Check, RefreshCw, Layout, Palette } from "lucide-react";
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

const RESUME_TEMPLATES = [
  {
    id: "modern",
    name: "Modern",
    description: "Clean design",
    color: "from-blue-500 to-indigo-600",
    preview: "bg-gradient-to-br from-blue-50 to-indigo-100"
  },
  {
    id: "classic",
    name: "Classic",
    description: "Traditional style",
    color: "from-gray-600 to-gray-800",
    preview: "bg-gradient-to-br from-gray-50 to-gray-200"
  },
  {
    id: "creative",
    name: "Creative",
    description: "Bold layout",
    color: "from-purple-500 to-pink-500",
    preview: "bg-gradient-to-br from-purple-50 to-pink-100"
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Simple & elegant",
    color: "from-emerald-500 to-teal-600",
    preview: "bg-gradient-to-br from-emerald-50 to-teal-100"
  }
];

export default function ResumeBuilderTab() {
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("modern");
  const [isLoading, setIsLoading] = useState(false);
  const [mockTestData, setMockTestData] = useState<any>(null);
  const [newSkill, setNewSkill] = useState("");
  
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
    fetchUserProfile();
    fetchMockTestResults();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
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
          .eq('user_id', user.id)
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
          .eq('user_id', user.id)
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
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
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
          if (mockTests[0].score && mockTests[0].score >= 70) {
            const existingSkills = formData.skills;
            const newSkills = ["Problem Solving", "Quick Learner", "Analytical Skills"];
            const mergedSkills = [...new Set([...existingSkills, ...newSkills])];
            setFormData(prev => ({ ...prev, skills: mergedSkills }));
          }
        }
      }
    } catch (error) {
      console.error("Error fetching mock test results:", error);
    }
  };

  const handleSyncFromMockTest = async () => {
    setIsLoading(true);
    try {
      await fetchMockTestResults();
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
  };

  const handleExperienceChange = (index: number, field: keyof Experience, value: string) => {
    const updated = [...formData.experience];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, experience: updated }));
  };

  const handleEducationChange = (index: number, field: keyof Education, value: string) => {
    const updated = [...formData.education];
    updated[index] = { ...updated[index], [field]: value };
    setFormData(prev => ({ ...prev, education: updated }));
  };

  const addExperience = () => {
    setFormData(prev => ({
      ...prev,
      experience: [...prev.experience, { title: "", company: "", duration: "", description: "" }]
    }));
  };

  const removeExperience = (index: number) => {
    setFormData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index)
    }));
  };

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      education: [...prev.education, { degree: "", school: "", year: "" }]
    }));
  };

  const removeEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index)
    }));
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()]
      }));
      setNewSkill("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleExport = () => {
    toast({
      title: "Resume Downloaded!",
      description: "Your resume has been downloaded as PDF.",
    });
  };

  const getTemplateStyles = () => {
    switch (selectedTemplate) {
      case "modern":
        return { headerBg: "bg-gradient-to-r from-blue-600 to-indigo-600", headerText: "text-white", accent: "text-blue-600" };
      case "classic":
        return { headerBg: "bg-gray-800", headerText: "text-white", accent: "text-gray-700" };
      case "creative":
        return { headerBg: "bg-gradient-to-r from-purple-600 to-pink-600", headerText: "text-white", accent: "text-purple-600" };
      case "minimal":
        return { headerBg: "bg-emerald-600", headerText: "text-white", accent: "text-emerald-600" };
      default:
        return { headerBg: "bg-blue-600", headerText: "text-white", accent: "text-blue-600" };
    }
  };

  const templateStyles = getTemplateStyles();

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSyncFromMockTest} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Mock Test
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-4 w-4 mr-1" />
            {showPreview ? "Edit" : "Preview"}
          </Button>
          <Button size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            Export PDF
          </Button>
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
        <TabsList className="grid w-full grid-cols-2 max-w-[200px] h-8">
          <TabsTrigger value="edit" className="text-xs h-7">
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </TabsTrigger>
          <TabsTrigger value="templates" className="text-xs h-7">
            <Layout className="h-3 w-3 mr-1" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Choose Template
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {RESUME_TEMPLATES.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`cursor-pointer rounded-lg border-2 p-2 transition-all hover:shadow-md ${
                      selectedTemplate === template.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className={`h-14 rounded-md mb-1.5 ${template.preview} flex items-center justify-center`}>
                      <div className={`h-2 w-12 rounded bg-gradient-to-r ${template.color}`} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium">{template.name}</p>
                        <p className="text-[10px] text-muted-foreground">{template.description}</p>
                      </div>
                      {selectedTemplate === template.id && (
                        <Check className="h-3 w-3 text-primary" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Edit Tab */}
        <TabsContent value="edit">
          {!showPreview ? (
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
                        type="email" 
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Phone</Label>
                      <Input 
                        placeholder="+91 9876543210"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Location</Label>
                      <Input 
                        placeholder="City, State"
                        value={formData.location}
                        onChange={(e) => handleInputChange('location', e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Professional Summary</Label>
                    <Textarea
                      placeholder="Brief summary of your experience..."
                      rows={2}
                      value={formData.summary}
                      onChange={(e) => handleInputChange('summary', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Work Experience */}
              <Card>
                <CardHeader className="py-2 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Work Experience</CardTitle>
                    <Button size="sm" variant="outline" onClick={addExperience} className="h-6 text-xs px-2">
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 px-3 pb-3">
                  {formData.experience.map((exp, index) => (
                    <div key={index} className="space-y-2 p-2 border rounded-lg relative">
                      {formData.experience.length > 1 && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-1 right-1 h-5 w-5 p-0"
                          onClick={() => removeExperience(index)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Job Title</Label>
                          <Input 
                            placeholder="Software Engineer" 
                            value={exp.title}
                            onChange={(e) => handleExperienceChange(index, 'title', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Company</Label>
                          <Input 
                            placeholder="Tech Corp" 
                            value={exp.company}
                            onChange={(e) => handleExperienceChange(index, 'company', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Duration</Label>
                        <Input 
                          placeholder="Jan 2020 - Present" 
                          value={exp.duration}
                          onChange={(e) => handleExperienceChange(index, 'duration', e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Education */}
              <Card>
                <CardHeader className="py-2 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Education</CardTitle>
                    <Button size="sm" variant="outline" onClick={addEducation} className="h-6 text-xs px-2">
                      <Plus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 px-3 pb-3">
                  {formData.education.map((edu, index) => (
                    <div key={index} className="space-y-2 p-2 border rounded-lg relative">
                      {formData.education.length > 1 && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="absolute top-1 right-1 h-5 w-5 p-0"
                          onClick={() => removeEducation(index)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Degree</Label>
                          <Input 
                            placeholder="Bachelor of Science" 
                            value={edu.degree}
                            onChange={(e) => handleEducationChange(index, 'degree', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">School</Label>
                          <Input 
                            placeholder="University Name" 
                            value={edu.school}
                            onChange={(e) => handleEducationChange(index, 'school', e.target.value)}
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Year</Label>
                        <Input 
                          placeholder="2016 - 2020" 
                          value={edu.year}
                          onChange={(e) => handleEducationChange(index, 'year', e.target.value)}
                          className="h-7 text-xs"
                        />
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
                  <div className="flex gap-2">
                    <Input 
                      placeholder="e.g. JavaScript, React..." 
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                      className="h-7 text-xs"
                    />
                    <Button size="sm" onClick={addSkill} className="h-7 px-2">
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {formData.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="px-2 py-0.5 text-xs">
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
          ) : (
            /* Preview */
            <Card className="p-4 overflow-hidden">
              <div className="max-w-2xl mx-auto">
                <div className={`${templateStyles.headerBg} ${templateStyles.headerText} -mx-4 -mt-4 px-4 py-4 mb-4`}>
                  <h2 className="text-xl font-bold">{formData.fullName || "Your Name"}</h2>
                  <p className="text-xs opacity-90">
                    {[formData.email, formData.phone, formData.location].filter(Boolean).join(" | ") || "Contact Information"}
                  </p>
                </div>

                {formData.summary && (
                  <div className="mb-3">
                    <h3 className={`text-sm font-semibold mb-1 ${templateStyles.accent}`}>Professional Summary</h3>
                    <p className="text-xs text-muted-foreground">{formData.summary}</p>
                  </div>
                )}

                <Separator className="my-3" />

                {formData.experience.some(exp => exp.title || exp.company) && (
                  <div className="mb-3">
                    <h3 className={`text-sm font-semibold mb-2 ${templateStyles.accent}`}>Work Experience</h3>
                    <div className="space-y-2">
                      {formData.experience.filter(exp => exp.title || exp.company).map((exp, index) => (
                        <div key={index}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-xs font-semibold">{exp.title}</h4>
                              <p className="text-[10px] text-muted-foreground">{exp.company}</p>
                            </div>
                            <span className="text-[10px] text-muted-foreground">{exp.duration}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator className="my-3" />

                {formData.education.some(edu => edu.degree || edu.school) && (
                  <div className="mb-3">
                    <h3 className={`text-sm font-semibold mb-2 ${templateStyles.accent}`}>Education</h3>
                    <div className="space-y-1">
                      {formData.education.filter(edu => edu.degree || edu.school).map((edu, index) => (
                        <div key={index}>
                          <h4 className="text-xs font-semibold">{edu.degree}</h4>
                          <p className="text-[10px] text-muted-foreground">{edu.school} {edu.year && `- ${edu.year}`}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Separator className="my-3" />

                {formData.skills.length > 0 && (
                  <div>
                    <h3 className={`text-sm font-semibold mb-1 ${templateStyles.accent}`}>Skills</h3>
                    <div className="flex flex-wrap gap-1">
                      {formData.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
