import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Image, Video, Palette, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import SponsorDashboardLayout from "./SponsorDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BrandingResource {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size: number | null;
  category: string | null;
  download_count: number;
  created_at: string;
}

export default function BrandingResources() {
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<BrandingResource[]>([]);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sponsorData } = await supabase
        .from("sponsors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!sponsorData) return;

      const { data, error } = await supabase
        .from("branding_resources")
        .select("*")
        .or(`sponsor_id.eq.${sponsorData.id},is_public.eq.true`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error("Error fetching resources:", error);
      toast.error("Failed to load resources");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (resource: BrandingResource) => {
    try {
      // Increment download count
      await supabase
        .from("branding_resources")
        .update({ download_count: resource.download_count + 1 })
        .eq("id", resource.id);

      // Open file in new tab
      window.open(resource.file_url, "_blank");
      toast.success("Download started");
    } catch (error) {
      console.error("Error downloading resource:", error);
      toast.error("Failed to download resource");
    }
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType.toLowerCase()) {
      case "logo":
        return Image;
      case "guideline":
        return FileText;
      case "template":
        return Palette;
      case "deck":
        return FileText;
      case "video":
        return Video;
      default:
        return Package;
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const kb = bytes / 1024;
    const mb = kb / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  const filterByCategory = (category: string) => {
    if (category === "all") return resources;
    return resources.filter((r) => r.category?.toLowerCase() === category);
  };

  if (loading) {
    return (
      <SponsorDashboardLayout activeTab="resources">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96" />
        </div>
      </SponsorDashboardLayout>
    );
  }

  return (
    <SponsorDashboardLayout activeTab="resources">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Branding Resources</h1>
          <p className="text-muted-foreground mt-1">Download logos, guidelines, and marketing materials</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Resources</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="marketing">Marketing</TabsTrigger>
            <TabsTrigger value="event">Event</TabsTrigger>
            <TabsTrigger value="support">Support</TabsTrigger>
          </TabsList>

          {["all", "branding", "marketing", "event", "support"].map((category) => (
            <TabsContent key={category} value={category} className="space-y-4 mt-6">
              {filterByCategory(category).length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No resources found in this category</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filterByCategory(category).map((resource) => {
                    const Icon = getFileIcon(resource.file_type);
                    return (
                      <Card key={resource.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <Icon className="h-8 w-8 text-primary" />
                            <Badge variant="outline">{resource.file_type}</Badge>
                          </div>
                          <CardTitle className="mt-4">{resource.title}</CardTitle>
                          <CardDescription>{resource.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{formatFileSize(resource.file_size)}</span>
                            <span>{resource.download_count} downloads</span>
                          </div>
                          <Button
                            className="w-full"
                            onClick={() => handleDownload(resource)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Help Section */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
            <CardDescription>Can't find what you're looking for?</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-4">
              If you need additional resources or have questions about branding guidelines, please contact our partnership team.
            </p>
            <Button variant="outline">Contact Support</Button>
          </CardContent>
        </Card>
      </div>
    </SponsorDashboardLayout>
  );
}
