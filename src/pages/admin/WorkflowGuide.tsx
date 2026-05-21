import { useRef } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle2 } from "lucide-react";
import jsPDF from "jspdf";

type Step = { title: string; details: string[] };
type Section = { id: string; name: string; color: string; steps: Step[] };

const WORKFLOW: Section[] = [
  {
    id: "candidate",
    name: "Candidate Journey",
    color: "bg-blue-500",
    steps: [
      { title: "Signup / Login", details: [
        "Candidate registers via email or Google OAuth.",
        "Uploads resume — auto-saved to candidate list (even if signup is incomplete).",
        "Resume parsed via AI to pre-fill profile.",
      ]},
      { title: "Profile Completion", details: [
        "Add education, experience, skills, preferred role, location.",
        "Profile visible in HR/Employer talent pool.",
      ]},
      { title: "Wallet & Feature Unlocks", details: [
        "Load wallet points via Razorpay (₹5 = 1 pt).",
        "Unlock features: Resume Builder, AI Job Apply, Mock Tests, Upskill, Mentor Contact (300 pts).",
      ]},
      { title: "Job Discovery & Apply", details: [
        "Browse jobs; AI matching applies weighted scoring (-999 cross-sector penalty).",
        "One-click apply triggers confirmation email + AI resume analysis.",
      ]},
      { title: "Interview Pipeline", details: [
        "Auto-progress through MCQ → AI Technical → Coding → HR → Management rounds.",
        "Industry-specific stages (IT, Banking, Education, Civil, Film).",
        "Live WebRTC recording & monitoring.",
      ]},
      { title: "Mock Interviews & Learning", details: [
        "Practice mock interviews (Gemini 3 Flash).",
        "AI feedback, scoring, learning recommendations.",
      ]},
    ],
  },
  {
    id: "employer",
    name: "Employer / HR Journey",
    color: "bg-emerald-500",
    steps: [
      { title: "Registration & Onboarding", details: [
        "Company registration, agreement, plan selection.",
        "Subscription via wallet points.",
      ]},
      { title: "Post a Job (AI Assisted)", details: [
        "AI Vacancy Generator drafts JD.",
        "Configure pipeline stages (toggle optional rounds).",
        "Submit for admin moderation.",
      ]},
      { title: "Candidate Management", details: [
        "View applicants, AI scan profiles, transfer candidates.",
        "Talent pool with multi-criteria filters.",
      ]},
      { title: "Interview Orchestration", details: [
        "Schedule slots, send observer emails, run live rounds.",
        "Feedback templates per round; PDF final review export.",
      ]},
      { title: "Outsource Projects & Flyers", details: [
        "Post outsource projects with custom budgets.",
        "AI Flyer Maker for marketing.",
      ]},
    ],
  },
  {
    id: "freelancer",
    name: "Freelancer / Mentor",
    color: "bg-purple-500",
    steps: [
      { title: "Freelancer Signup & Verification", details: [
        "Role-specific signup; verification badge.",
      ]},
      { title: "Portfolio & AI Resume Parse", details: [
        "AI auto-populates portfolio from resume.",
      ]},
      { title: "Mentorship & Outsourcing", details: [
        "List as mentor (300 pts unlock reveals contact).",
        "Pick up outsource projects.",
      ]},
    ],
  },
  {
    id: "edutech",
    name: "EduTech Portal",
    color: "bg-amber-500",
    steps: [
      { title: "Institute Signup", details: [
        "Manage students with user_id isolation.",
      ]},
      { title: "Bulk Campaigns", details: [
        "Send bulk emails (20MB attachments via Supabase URLs).",
        "Event invitations with Zoom links.",
      ]},
    ],
  },
  {
    id: "sponsor",
    name: "Sponsor Portal",
    color: "bg-pink-500",
    steps: [
      { title: "Sponsor Onboarding", details: [
        "Choose sponsorship tier, reserve stalls.",
      ]},
      { title: "Analytics & ROI", details: [
        "Track lead generation, brand visibility, post-event deliverables.",
      ]},
    ],
  },
  {
    id: "admin",
    name: "Admin / Owner Operations",
    color: "bg-rose-500",
    steps: [
      { title: "User & HR Management", details: [
        "Manage all users, HR accounts, role assignment.",
        "Alert unpaid users via one-click email.",
      ]},
      { title: "Job & Content Moderation", details: [
        "Approve/reject jobs, external jobs, popup ads, event alerts.",
      ]},
      { title: "Finance & Plans", details: [
        "Plan Control, Coupons, Razorpay Webhooks, Subscription logs.",
      ]},
      { title: "Live Monitoring & Analytics", details: [
        "Live activity monitor, growth metrics, revenue analytics, audit logs.",
      ]},
      { title: "System Configuration", details: [
        "Database management, system configuration, bulk mail register.",
      ]},
    ],
  },
];

export default function WorkflowGuide() {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;

    const addPageIfNeeded = (needed: number) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Gradia — Complete Workflow Guide", margin, y);
    y += 24;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text("Step-by-step flow of how the platform works across all portals.", margin, y);
    y += 20;
    doc.setTextColor(0);

    WORKFLOW.forEach((section, sIdx) => {
      addPageIfNeeded(40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 60, 120);
      doc.text(`${sIdx + 1}. ${section.name}`, margin, y);
      y += 18;
      doc.setTextColor(0);

      section.steps.forEach((step, idx) => {
        addPageIfNeeded(40);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text(`Step ${idx + 1}: ${step.title}`, margin + 10, y);
        y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        step.details.forEach((d) => {
          const lines = doc.splitTextToSize(`• ${d}`, pageW - margin * 2 - 20);
          lines.forEach((ln: string) => {
            addPageIfNeeded(14);
            doc.text(ln, margin + 20, y);
            y += 12;
          });
        });
        y += 6;
      });
      y += 10;
    });

    doc.save("Gradia-Workflow-Guide.pdf");
  };

  return (
    <AdminShell
      title="Workflow Guide"
      headerRight={
        <Button onClick={handleDownloadPDF} size="sm" className="gap-2">
          <Download className="h-4 w-4" /> Download PDF
        </Button>
      }
    >
      <div ref={containerRef} className="max-w-5xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Gradia — Complete Workflow Guide</CardTitle>
            <p className="text-sm text-muted-foreground">
              End-to-end view of how every portal in the platform works, step by step.
            </p>
          </CardHeader>
        </Card>

        {WORKFLOW.map((section, sIdx) => (
          <Card key={section.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-3 space-y-0">
              <div className={`h-10 w-10 rounded-lg ${section.color} flex items-center justify-center text-white font-bold`}>
                {sIdx + 1}
              </div>
              <div>
                <CardTitle className="text-lg">{section.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{section.steps.length} steps</p>
              </div>
            </CardHeader>
            <CardContent>
              <ol className="relative border-l-2 border-muted ml-4 space-y-5">
                {section.steps.map((step, idx) => (
                  <li key={idx} className="ml-6">
                    <span className="absolute -left-[11px] flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-sm">{step.title}</h4>
                      <Badge variant="secondary" className="text-[10px]">Step {idx + 1}</Badge>
                    </div>
                    <ul className="space-y-1">
                      {step.details.map((d, di) => (
                        <li key={di} className="flex gap-2 text-sm text-muted-foreground">
                          <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        ))}
      </div>
    </AdminShell>
  );
}
