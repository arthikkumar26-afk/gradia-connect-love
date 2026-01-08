import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Save, RefreshCw, Eye, Palette } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface EmailTemplate {
  id?: string;
  employer_id: string;
  stage_name: string;
  template_type: string;
  subject: string;
  header_text: string;
  body_text: string;
  footer_text: string;
  primary_color: string;
  is_active: boolean;
}

const STAGES = [
  { name: "Resume Screening", icon: "📄" },
  { name: "AI Phone Interview", icon: "📞" },
  { name: "Technical Assessment", icon: "💻" },
  { name: "HR Round", icon: "👥" },
  { name: "Final Review", icon: "🎯" },
  { name: "Offer Stage", icon: "🎁" },
];

const DEFAULT_TEMPLATES: Record<string, Partial<EmailTemplate>> = {
  "Resume Screening": {
    subject: "📄 Resume Screening Complete - {{jobTitle}} at {{companyName}}",
    header_text: "Resume Review Complete!",
    body_text: "Your resume has been reviewed for the {{jobTitle}} position. Our AI system has analyzed your qualifications and experience.",
    footer_text: "Best regards,\nThe {{companyName}} Hiring Team",
    primary_color: "#10b981",
  },
  "AI Phone Interview": {
    subject: "📞 Phone Interview Complete - {{jobTitle}} at {{companyName}}",
    header_text: "Phone Interview Completed!",
    body_text: "Thank you for completing the AI phone screening for {{jobTitle}}. We've assessed your communication skills and role understanding.",
    footer_text: "Best regards,\nThe {{companyName}} Hiring Team",
    primary_color: "#3b82f6",
  },
  "Technical Assessment": {
    subject: "💻 Technical Assessment Complete - {{jobTitle}} at {{companyName}}",
    header_text: "Technical Assessment Done!",
    body_text: "Your technical assessment for {{jobTitle}} has been evaluated. We've reviewed your technical competencies and problem-solving abilities.",
    footer_text: "Best regards,\nThe {{companyName}} Hiring Team",
    primary_color: "#8b5cf6",
  },
  "HR Round": {
    subject: "👥 HR Round Complete - {{jobTitle}} at {{companyName}}",
    header_text: "HR Interview Complete!",
    body_text: "Thank you for the HR interview for {{jobTitle}}. We've evaluated your cultural fit and communication skills.",
    footer_text: "Best regards,\nThe {{companyName}} Hiring Team",
    primary_color: "#f59e0b",
  },
  "Final Review": {
    subject: "🎯 Final Review Complete - {{jobTitle}} at {{companyName}}",
    header_text: "Final Review Done!",
    body_text: "Your candidacy for {{jobTitle}} has completed the final review stage. All evaluations have been consolidated.",
    footer_text: "Best regards,\nThe {{companyName}} Hiring Team",
    primary_color: "#ec4899",
  },
  "Offer Stage": {
    subject: "🎁 Offer Stage - {{jobTitle}} at {{companyName}}",
    header_text: "Congratulations!",
    body_text: "We're excited to move forward with your application for {{jobTitle}}. You've successfully completed all interview stages!",
    footer_text: "Welcome to the team!\nThe {{companyName}} Hiring Team",
    primary_color: "#10b981",
  },
};

export function EmailTemplatesEditor() {
  const [templates, setTemplates] = useState<Record<string, EmailTemplate>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeStage, setActiveStage] = useState(STAGES[0].name);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .eq("employer_id", user.id);

      if (error) throw error;

      const templateMap: Record<string, EmailTemplate> = {};
      
      // Initialize with defaults
      STAGES.forEach(stage => {
        const existing = data?.find(t => t.stage_name === stage.name);
        if (existing) {
          templateMap[stage.name] = existing as EmailTemplate;
        } else {
          templateMap[stage.name] = {
            employer_id: user.id,
            stage_name: stage.name,
            template_type: "stage_transition",
            subject: DEFAULT_TEMPLATES[stage.name]?.subject || "",
            header_text: DEFAULT_TEMPLATES[stage.name]?.header_text || "",
            body_text: DEFAULT_TEMPLATES[stage.name]?.body_text || "",
            footer_text: DEFAULT_TEMPLATES[stage.name]?.footer_text || "",
            primary_color: DEFAULT_TEMPLATES[stage.name]?.primary_color || "#10b981",
            is_active: true,
          };
        }
      });

      setTemplates(templateMap);
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Failed to load email templates");
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = (stageName: string, field: keyof EmailTemplate, value: any) => {
    setTemplates(prev => ({
      ...prev,
      [stageName]: {
        ...prev[stageName],
        [field]: value,
      },
    }));
  };

  const saveTemplate = async (stageName: string) => {
    setSaving(true);
    try {
      const template = templates[stageName];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (template.id) {
        // Update existing
        const { error } = await supabase
          .from("email_templates")
          .update({
            subject: template.subject,
            header_text: template.header_text,
            body_text: template.body_text,
            footer_text: template.footer_text,
            primary_color: template.primary_color,
            is_active: template.is_active,
          })
          .eq("id", template.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("email_templates")
          .insert({
            employer_id: user.id,
            stage_name: template.stage_name,
            template_type: template.template_type,
            subject: template.subject,
            header_text: template.header_text,
            body_text: template.body_text,
            footer_text: template.footer_text,
            primary_color: template.primary_color,
            is_active: template.is_active,
          })
          .select()
          .single();

        if (error) throw error;
        
        setTemplates(prev => ({
          ...prev,
          [stageName]: { ...prev[stageName], id: data.id },
        }));
      }

      toast.success(`Template for "${stageName}" saved!`);
    } catch (error) {
      console.error("Error saving template:", error);
      toast.error("Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = (stageName: string) => {
    const defaultTemplate = DEFAULT_TEMPLATES[stageName];
    if (defaultTemplate) {
      setTemplates(prev => ({
        ...prev,
        [stageName]: {
          ...prev[stageName],
          ...defaultTemplate,
        },
      }));
      toast.info("Reset to default template");
    }
  };

  const renderPreview = (template: EmailTemplate) => {
    const sampleData = {
      candidateName: "John Doe",
      jobTitle: "Senior Software Engineer",
      companyName: "Your Company",
      score: 85,
      feedback: "Excellent performance! Strong technical skills demonstrated.",
      nextStage: "Technical Assessment",
    };

    return (
      <div className="bg-white rounded-lg overflow-hidden shadow-lg max-w-lg mx-auto">
        <div 
          className="p-8 text-center text-white"
          style={{ background: `linear-gradient(135deg, ${template.primary_color} 0%, ${template.primary_color}dd 100%)` }}
        >
          <h1 className="text-2xl font-bold m-0">✅ {template.header_text}</h1>
        </div>
        <div className="p-6">
          <p>Dear {sampleData.candidateName},</p>
          <p className="my-4">
            {template.body_text
              .replace(/\{\{jobTitle\}\}/g, sampleData.jobTitle)
              .replace(/\{\{companyName\}\}/g, sampleData.companyName)}
          </p>
          <div 
            className="p-4 rounded-lg text-center my-4"
            style={{ 
              borderLeft: `4px solid ${template.primary_color}`,
              backgroundColor: `${template.primary_color}10`
            }}
          >
            <h3 className="font-bold" style={{ color: template.primary_color }}>Your Score</h3>
            <span className="text-2xl font-bold">{sampleData.score}%</span>
          </div>
          <div className="p-4 rounded-lg my-4 border-l-4 border-blue-500 bg-blue-50">
            <h3 className="font-bold text-blue-700">💬 Feedback</h3>
            <p className="m-0">{sampleData.feedback}</p>
          </div>
        </div>
        <div className="p-4 text-center text-muted-foreground text-sm bg-muted">
          <p className="whitespace-pre-line m-0">
            {template.footer_text.replace(/\{\{companyName\}\}/g, sampleData.companyName)}
          </p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading templates...</p>
        </CardContent>
      </Card>
    );
  }

  const currentTemplate = templates[activeStage];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Templates
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Customize the email notifications sent to candidates at each interview stage.
          Use {"{{candidateName}}"}, {"{{jobTitle}}"}, {"{{companyName}}"} as placeholders.
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={activeStage} onValueChange={setActiveStage}>
          <TabsList className="flex flex-wrap h-auto gap-1 mb-6">
            {STAGES.map(stage => (
              <TabsTrigger 
                key={stage.name} 
                value={stage.name}
                className="text-xs sm:text-sm"
              >
                <span className="mr-1">{stage.icon}</span>
                <span className="hidden sm:inline">{stage.name}</span>
                <span className="sm:hidden">{stage.name.split(" ")[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {STAGES.map(stage => (
            <TabsContent key={stage.name} value={stage.name} className="space-y-4">
              {currentTemplate && activeStage === stage.name && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={currentTemplate.is_active}
                        onCheckedChange={(checked) => updateTemplate(stage.name, "is_active", checked)}
                      />
                      <Label>Template Active</Label>
                      {currentTemplate.is_active ? (
                        <Badge variant="default" className="bg-green-500">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resetToDefault(stage.name)}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-1" />
                            Preview
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Email Preview - {stage.name}</DialogTitle>
                          </DialogHeader>
                          {renderPreview(currentTemplate)}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="subject">Email Subject</Label>
                      <Input
                        id="subject"
                        value={currentTemplate.subject}
                        onChange={(e) => updateTemplate(stage.name, "subject", e.target.value)}
                        placeholder="Email subject line..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="header">Header Text</Label>
                        <Input
                          id="header"
                          value={currentTemplate.header_text}
                          onChange={(e) => updateTemplate(stage.name, "header_text", e.target.value)}
                          placeholder="Header displayed in the email..."
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="color" className="flex items-center gap-2">
                          <Palette className="h-4 w-4" />
                          Primary Color
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="color"
                            type="color"
                            value={currentTemplate.primary_color}
                            onChange={(e) => updateTemplate(stage.name, "primary_color", e.target.value)}
                            className="w-16 h-10 p-1 cursor-pointer"
                          />
                          <Input
                            value={currentTemplate.primary_color}
                            onChange={(e) => updateTemplate(stage.name, "primary_color", e.target.value)}
                            placeholder="#10b981"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="body">Body Text</Label>
                      <Textarea
                        id="body"
                        value={currentTemplate.body_text}
                        onChange={(e) => updateTemplate(stage.name, "body_text", e.target.value)}
                        placeholder="Main email content..."
                        rows={4}
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="footer">Footer Text</Label>
                      <Textarea
                        id="footer"
                        value={currentTemplate.footer_text}
                        onChange={(e) => updateTemplate(stage.name, "footer_text", e.target.value)}
                        placeholder="Email footer/signature..."
                        rows={2}
                      />
                    </div>

                    <Button 
                      onClick={() => saveTemplate(stage.name)} 
                      disabled={saving}
                      className="w-full"
                    >
                      {saving ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Template
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}