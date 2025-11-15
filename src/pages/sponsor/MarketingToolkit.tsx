import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FileText, Presentation, Image, Layout } from "lucide-react";

export default function MarketingToolkit() {
  const resources = [
    {
      icon: FileText,
      title: "Sponsor Brochure.pdf",
      description: "Complete overview of sponsorship benefits and opportunities",
      size: "3.2 MB",
      color: "text-blue-500"
    },
    {
      icon: Presentation,
      title: "Company Pitch Deck.pptx",
      description: "Professional presentation template with company overview",
      size: "8.7 MB",
      color: "text-orange-500"
    },
    {
      icon: Image,
      title: "Social Media Template Pack.zip",
      description: "Ready-to-use templates for all major platforms",
      size: "15.4 MB",
      color: "text-purple-500"
    },
    {
      icon: Layout,
      title: "Event Banners Collection.zip",
      description: "High-resolution banners in various sizes",
      size: "22.1 MB",
      color: "text-green-500"
    }
  ];

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Marketing Toolkit</h1>
          <p className="text-xl text-muted-foreground">
            Everything you need to promote your partnership with Gradia
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {resources.map((resource) => {
            const Icon = resource.icon;
            return (
              <Card key={resource.title} className="p-8 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-6">
                  <div className="p-4 bg-muted rounded-lg">
                    <Icon className={`h-8 w-8 ${resource.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{resource.title}</h3>
                    <p className="text-muted-foreground mb-4">{resource.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{resource.size}</span>
                      <Button>Download</Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Usage Guidelines */}
        <Card className="p-8 bg-primary/5">
          <h2 className="text-2xl font-bold mb-6">Usage Guidelines</h2>
          <div className="space-y-4 text-muted-foreground">
            <div className="flex items-start gap-3">
              <span className="text-xl">📝</span>
              <p>All materials are provided for promotional use by official partners only</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">✏️</span>
              <p>You may customize templates but must maintain brand guidelines</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">🔗</span>
              <p>When sharing on social media, tag @Gradia for maximum visibility</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">📧</span>
              <p>For custom materials, contact marketing@gradia.com</p>
            </div>
          </div>
        </Card>

        {/* Need More */}
        <div className="mt-12 text-center">
          <h3 className="text-2xl font-bold mb-4">Need Custom Marketing Materials?</h3>
          <p className="text-muted-foreground mb-6">
            Our marketing team can create custom assets tailored to your needs
          </p>
          <Button size="lg">Request Custom Materials</Button>
        </div>
      </div>
    </div>
  );
}
