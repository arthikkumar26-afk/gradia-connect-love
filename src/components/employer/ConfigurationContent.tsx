import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Server, Database, Globe, Shield, Cpu, Code2, Layers, Palette, Zap, Lock, Cloud } from "lucide-react";
import jsPDF from "jspdf";

const techStack = [
  {
    category: "Frontend Framework",
    icon: Code2,
    items: [
      { name: "React 18", description: "Component-based UI library for building interactive user interfaces with virtual DOM and hooks-based state management." },
      { name: "TypeScript", description: "Statically-typed superset of JavaScript providing compile-time error detection, better IDE support, and improved code maintainability." },
      { name: "Vite", description: "Next-generation build tool offering lightning-fast HMR (Hot Module Replacement), optimized bundling, and near-instant dev server startup." },
    ],
  },
  {
    category: "UI & Styling",
    icon: Palette,
    items: [
      { name: "Tailwind CSS", description: "Utility-first CSS framework enabling rapid UI development with consistent design tokens, responsive design, and dark mode support." },
      { name: "shadcn/ui", description: "Accessible, customizable component library built on Radix UI primitives with full keyboard navigation and screen reader support." },
      { name: "Lucide Icons", description: "Beautifully crafted open-source icon library providing consistent, scalable SVG icons across the application." },
      { name: "Framer Motion", description: "Production-ready animation library for React, powering smooth page transitions and micro-interactions." },
    ],
  },
  {
    category: "Backend & Database",
    icon: Database,
    items: [
      { name: "Lovable Cloud", description: "Fully managed cloud backend providing database, authentication, file storage, and serverless functions with automatic scaling." },
      { name: "PostgreSQL", description: "Enterprise-grade relational database with Row Level Security (RLS) policies for fine-grained data access control." },
      { name: "Edge Functions (Deno)", description: "Serverless TypeScript functions running at the edge for AI processing, email delivery, payment handling, and third-party API integrations." },
    ],
  },
  {
    category: "Authentication & Security",
    icon: Shield,
    items: [
      { name: "JWT Authentication", description: "Secure token-based authentication with automatic refresh, session persistence, and role-based access control (RBAC)." },
      { name: "Row Level Security (RLS)", description: "Database-level security policies ensuring users can only access their own data, with separate policies for candidates, employers, and admins." },
      { name: "Role-Based Access", description: "Multi-role system (Candidate, Employer, Admin, Owner, Sponsor) with granular permissions and route-level protection." },
    ],
  },
  {
    category: "AI & Automation",
    icon: Cpu,
    items: [
      { name: "Lovable AI Models", description: "Integrated AI capabilities including GPT-5, Gemini 2.5 Pro/Flash for resume analysis, interview question generation, and candidate evaluation." },
      { name: "ElevenLabs TTS", description: "AI-powered text-to-speech for realistic voice synthesis in automated interview sessions." },
      { name: "Automated Interview Pipeline", description: "Multi-stage AI-driven interview process with automated scoring, feedback generation, and candidate progression." },
    ],
  },
  {
    category: "Integrations & Services",
    icon: Zap,
    items: [
      { name: "Razorpay", description: "Payment gateway integration for subscription billing, employer plan purchases, and secure payment processing with Indian Rupee support." },
      { name: "Resend Email", description: "Transactional email service for interview invitations, application notifications, offer letters, and automated status updates." },
      { name: "QR Code Generation", description: "Dynamic QR code generation for quick candidate registration, job application links, and event check-ins." },
    ],
  },
  {
    category: "Data & State Management",
    icon: Layers,
    items: [
      { name: "TanStack React Query", description: "Powerful data-fetching and caching library with automatic background refetching, optimistic updates, and infinite queries." },
      { name: "React Context API", description: "Centralized state management for authentication, employer context, and theme preferences across the application." },
      { name: "React Hook Form + Zod", description: "Performant form handling with schema-based validation, providing type-safe form submissions and real-time error feedback." },
    ],
  },
  {
    category: "Infrastructure & DevOps",
    icon: Cloud,
    items: [
      { name: "Lovable Platform", description: "AI-powered development platform with instant preview, automatic deployments, and collaborative editing capabilities." },
      { name: "CDN & Edge Delivery", description: "Global content delivery network ensuring fast load times with asset optimization, compression, and edge caching." },
      { name: "Real-time Subscriptions", description: "WebSocket-based real-time data synchronization for live interview monitoring, application notifications, and dashboard updates." },
    ],
  },
];

const generatePDF = () => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 20;

  // Title
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 128, 128);
  doc.text("Portal Technology Configuration", margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`, margin, y);
  y += 8;

  // Divider
  doc.setDrawColor(0, 128, 128);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  techStack.forEach((section) => {
    // Check page overflow
    if (y > 260) {
      doc.addPage();
      y = 20;
    }

    // Section header
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 100, 100);
    doc.text(section.category, margin, y);
    y += 7;

    section.items.forEach((item) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }

      // Item name
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(`- ${item.name}`, margin + 4, y);
      y += 5;

      // Item description with word wrap
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const lines = doc.splitTextToSize(item.description, contentWidth - 10);
      doc.text(lines, margin + 8, y);
      y += lines.length * 4.5 + 3;
    });

    y += 4;
  });

  // Footer
  if (y > 270) {
    doc.addPage();
    y = 20;
  }
  doc.setDrawColor(0, 128, 128);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text("Confidential - Portal Technology Configuration Report", margin, y);

  doc.save("Portal_Technology_Configuration.pdf");
};

export const ConfigurationContent = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Portal Technology Configuration</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Complete technology stack and infrastructure details used to build this portal.
          </p>
        </div>
        <Button onClick={generatePDF} variant="default" size="lg">
          <Download className="h-5 w-5 mr-2" />
          Download PDF
        </Button>
      </div>

      {/* Tech Stack Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {techStack.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.category} className="overflow-hidden">
              <CardHeader className="pb-3 bg-muted/30">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="p-1.5 rounded-md bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  {section.category}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {section.items.map((item) => (
                  <div key={item.name} className="flex items-start gap-3">
                    <Badge variant="secondary" className="mt-0.5 shrink-0 text-xs font-semibold">
                      {item.name}
                    </Badge>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
