import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  ShieldCheck, Home, Users, Briefcase, Building2, Settings, BarChart3,
  FileText, Bell, UserCheck, ClipboardList, UserCog, MessageSquare,
  CreditCard, Ticket, UserX, ArrowLeft, Sparkles, Loader2, Download,
  Image, RefreshCw, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const flyerStyles = [
  { value: "modern-corporate", label: "Modern Corporate" },
  { value: "bold-colorful", label: "Bold & Colorful" },
  { value: "minimal-clean", label: "Minimal & Clean" },
  { value: "tech-startup", label: "Tech Startup" },
  { value: "education-academic", label: "Education / Academic" },
  { value: "healthcare", label: "Healthcare" },
  { value: "banking-finance", label: "Banking & Finance" },
  { value: "creative-agency", label: "Creative Agency" },
  { value: "retail-ecommerce", label: "Retail / E-Commerce" },
  { value: "event-promotional", label: "Event / Promotional" },
];

const flyerSizes = [
  { value: "1080x1080", label: "Square (1080×1080) - Instagram" },
  { value: "1080x1920", label: "Portrait (1080×1920) - Stories" },
  { value: "1200x628", label: "Landscape (1200×628) - Facebook" },
  { value: "800x1200", label: "Poster (800×1200) - Print" },
  { value: "1920x1080", label: "Wide (1920×1080) - Banner" },
];

interface GeneratedFlyer {
  id: string;
  imageUrl: string;
  prompt: string;
  style: string;
  size: string;
  createdAt: Date;
}

const AIFlyerMaker = () => {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("modern-corporate");
  const [size, setSize] = useState("1080x1080");
  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFlyers, setGeneratedFlyers] = useState<GeneratedFlyer[]>([]);

  const menuItems = [
    { title: "Dashboard", icon: Home, path: "/admin/dashboard" },
    { title: "Users", icon: Users, path: "/admin/users" },
    { title: "Subscribed Employers", icon: CreditCard, path: "/admin/subscribed-employers" },
    { title: "Subscribed Candidates", icon: UserCheck, path: "/admin/subscribed-candidates" },
    { title: "Unsubscribed Employers", icon: UserX, path: "/admin/unsubscribed-employers" },
    { title: "Unsubscribed Candidates", icon: UserX, path: "/admin/unsubscribed-candidates" },
    { title: "Job Moderation", icon: Briefcase, path: "/admin/jobs" },
    { title: "External Jobs", icon: Briefcase, path: "/admin/external-jobs" },
    { title: "Companies", icon: Building2, path: "/admin/companies" },
    { title: "Mock Interview", icon: ClipboardList, path: "/admin/mock-interview-pipeline" },
    { title: "Management", icon: UserCog, path: "/admin/management" },
    { title: "Coupons", icon: Ticket, path: "/admin/coupons" },
    { title: "AI Flyer Maker", icon: Image, path: "/admin/flyer-maker" },
    { title: "Popup Ads", icon: Bell, path: "/admin/popup-ads" },
    { title: "Event Alerts", icon: Bell, path: "/admin/event-alerts" },
    { title: "Bulk Mail & Register", icon: FileText, path: "/admin/bulk-mail-register" },
    { title: "Reports", icon: BarChart3, path: "/admin/reports" },
    { title: "Audit Logs", icon: FileText, path: "/admin/audit" },
    { title: "Settings", icon: Settings, path: "/admin/settings" },
  ];

  const buildPrompt = () => {
    let fullPrompt = prompt;
    if (companyName) fullPrompt += `. Company: ${companyName}`;
    if (jobTitle) fullPrompt += `. Position: ${jobTitle}`;
    if (location) fullPrompt += `. Location: ${location}`;
    return fullPrompt;
  };

  const handleGenerate = async () => {
    const fullPrompt = buildPrompt();
    if (!fullPrompt || fullPrompt.trim().length < 5) {
      toast.error("Please enter a description for the flyer (at least 5 characters).");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-flyer-image", {
        body: { prompt: fullPrompt, style, size },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.imageUrl) {
        const newFlyer: GeneratedFlyer = {
          id: crypto.randomUUID(),
          imageUrl: data.imageUrl,
          prompt: fullPrompt,
          style,
          size,
          createdAt: new Date(),
        };
        setGeneratedFlyers((prev) => [newFlyer, ...prev]);
        toast.success("Flyer image generated successfully!");
      }
    } catch (err: any) {
      console.error("Flyer generation error:", err);
      toast.error(err.message || "Failed to generate flyer image.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (flyer: GeneratedFlyer) => {
    try {
      const link = document.createElement("a");
      link.href = flyer.imageUrl;
      link.download = `flyer-${flyer.id.slice(0, 8)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Downloading flyer image...");
    } catch {
      toast.error("Failed to download. Try right-clicking the image and saving.");
    }
  };

  const handleDelete = (id: string) => {
    setGeneratedFlyers((prev) => prev.filter((f) => f.id !== id));
    toast.success("Flyer removed.");
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-muted/30">
        <Sidebar className="border-r border-border">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary">
                <ShieldCheck className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">Gradia Admin</h1>
                <p className="text-xs text-muted-foreground">Management Panel</p>
              </div>
            </div>
          </div>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <button
                          onClick={() => navigate(item.path)}
                          className={`flex items-center gap-3 w-full ${
                            item.path === "/admin/flyer-maker" ? "bg-primary/10 text-primary font-medium" : ""
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 overflow-auto">
          <div className="p-4 md:p-6">
            <div className="flex items-center gap-3 mb-6">
              <SidebarTrigger />
              <Button variant="ghost" size="sm" onClick={() => navigate("/admin/dashboard")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="h-6 w-6 text-primary" />
                  AI Flyer Maker
                </h1>
                <p className="text-sm text-muted-foreground">
                  Generate professional ad flyer images using AI
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Controls */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Flyer Details</CardTitle>
                  <CardDescription>Describe the flyer you want to create</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Company Name (optional)</Label>
                    <Input
                      placeholder="e.g., Gradia Technologies"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Job Title / Position (optional)</Label>
                    <Input
                      placeholder="e.g., Senior Software Engineer"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Location (optional)</Label>
                    <Input
                      placeholder="e.g., Hyderabad, India"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Description / Content *</Label>
                    <Textarea
                      placeholder="Describe what the flyer should contain. E.g.: Hiring teachers for CBSE school, salary 30k-50k, walk-in interview on 20th April..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={4}
                    />
                  </div>
                  <div>
                    <Label>Style</Label>
                    <Select value={style} onValueChange={setStyle}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {flyerStyles.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Size</Label>
                    <Select value={size} onValueChange={setSize}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {flyerSizes.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Flyer
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Right: Generated Flyers */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">
                    Generated Flyers ({generatedFlyers.length})
                  </h2>
                  {generatedFlyers.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setGeneratedFlyers([]);
                        toast.success("All flyers cleared.");
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" /> Clear All
                    </Button>
                  )}
                </div>

                {generatedFlyers.length === 0 && !isGenerating && (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <Image className="h-16 w-16 text-muted-foreground/40 mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground mb-2">
                        No flyers generated yet
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-md">
                        Fill in the details on the left and click "Generate Flyer" to create
                        AI-powered advertisement images.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {isGenerating && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                      <p className="text-muted-foreground">Generating your flyer image with AI...</p>
                      <p className="text-xs text-muted-foreground mt-1">This may take 15-30 seconds</p>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {generatedFlyers.map((flyer) => (
                    <Card key={flyer.id} className="overflow-hidden">
                      <div className="relative group">
                        <img
                          src={flyer.imageUrl}
                          alt="Generated flyer"
                          className="w-full h-auto object-contain bg-muted"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button size="sm" variant="secondary" onClick={() => handleDownload(flyer)}>
                            <Download className="h-4 w-4 mr-1" /> Download
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setPrompt(flyer.prompt.split(". Company:")[0]);
                              setStyle(flyer.style);
                              setSize(flyer.size);
                              toast.info("Settings loaded. Click Generate to create a variation.");
                            }}
                          >
                            <RefreshCw className="h-4 w-4 mr-1" /> Regenerate
                          </Button>
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground line-clamp-2">{flyer.prompt}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {flyerStyles.find((s) => s.value === flyer.style)?.label || flyer.style}
                          </span>
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                            {flyer.size}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="ml-auto h-6 w-6"
                            onClick={() => handleDelete(flyer.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AIFlyerMaker;
