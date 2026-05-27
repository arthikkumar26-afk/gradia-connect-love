import { useMemo, useRef, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, CheckCircle2, Package, Sparkles, Loader2, Copy } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  const [selected, setSelected] = useState<string[]>(WORKFLOW.map((s) => s.id));
  const [packName, setPackName] = useState("Custom Pack");
  const [price, setPrice] = useState<string>("4999");

  const sections = useMemo(
    () => WORKFLOW.filter((s) => selected.includes(s.id)),
    [selected]
  );

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const totalFeatures = sections.reduce(
    (acc, s) => acc + s.steps.reduce((a, st) => a + st.details.length, 0),
    0
  );

  const handleDownloadPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = margin;

    // jsPDF's built-in helvetica only supports WinAnsi. Strip/replace unsupported chars
    // (e.g. ₹, — , • , smart quotes) so we don't get garbled "&P&r&i&c&e" output.
    const sanitize = (s: string) =>
      String(s ?? "")
        .replace(/\u20B9/g, "Rs. ") // ₹
        .replace(/[\u2013\u2014]/g, "-") // – —
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2022/g, "-") // •
        .replace(/[^\x00-\x7F]/g, ""); // drop any remaining non-ASCII

    const text = (s: string, x: number, yy: number) => doc.text(sanitize(s), x, yy);

    const addPageIfNeeded = (needed: number) => {
      if (y + needed > pageH - margin) {
        doc.addPage();
        y = margin;
      }
    };

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    text("Gradia - Workflow Guide", margin, y);
    y += 24;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(30, 60, 120);
    text(`Pack: ${packName}`, margin, y);
    y += 16;
    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    text(`Price: Rs. ${price || "0"}`, margin, y);
    y += 14;
    text(
      `Included portals: ${sections.map((s) => s.name).join(", ") || "None"}`,
      margin,
      y
    );
    y += 14;
    text(`Total features: ${totalFeatures}`, margin, y);
    y += 22;

    sections.forEach((section, sIdx) => {
      addPageIfNeeded(40);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(30, 60, 120);
      text(`${sIdx + 1}. ${section.name}`, margin, y);
      y += 18;
      doc.setTextColor(0);

      section.steps.forEach((step, idx) => {
        addPageIfNeeded(40);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        text(`Step ${idx + 1}: ${step.title}`, margin + 10, y);
        y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        step.details.forEach((d) => {
          const lines = doc.splitTextToSize(sanitize(`- ${d}`), pageW - margin * 2 - 20);
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


    const safeName = (packName || "pack").replace(/[^a-z0-9]+/gi, "-");
    doc.save(`Gradia-Workflow-${safeName}.pdf`);
  };

  return (
    <AdminShell
      title="Workflow Guide"
      headerRight={
        <Button onClick={handleDownloadPDF} size="sm" className="gap-2" disabled={sections.length === 0}>
          <Download className="h-4 w-4" /> Download PDF
        </Button>
      }
    >
      <div ref={containerRef} className="max-w-5xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Gradia — Workflow Guide Builder</CardTitle>
            <p className="text-sm text-muted-foreground">
              Pick portals, set a pack name & price, and generate a tailored guide PDF.
            </p>
          </CardHeader>
        </Card>

        {/* Builder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5" /> Build Your Pack
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pack-name">Pack Name</Label>
                <Input
                  id="pack-name"
                  value={packName}
                  onChange={(e) => setPackName(e.target.value)}
                  placeholder="e.g. Starter Pack"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pack-price">Price (₹)</Label>
                <Input
                  id="pack-price"
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 4999"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Select Portals to Include</Label>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
                {WORKFLOW.map((s) => {
                  const checked = selected.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                        checked ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                      }`}
                    >
                      <Checkbox checked={checked} onCheckedChange={() => toggle(s.id)} />
                      <span className={`h-3 w-3 rounded-full ${s.color}`} />
                      <span className="text-sm font-medium">{s.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/40 p-3">
              <Badge variant="secondary">{sections.length} portals</Badge>
              <Badge variant="secondary">{totalFeatures} features</Badge>
              <Badge variant="secondary">₹{price || "0"}</Badge>
              <span className="text-sm text-muted-foreground ml-auto">
                Pack: <span className="font-medium text-foreground">{packName || "—"}</span>
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {sections.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Select at least one portal to preview features.
            </CardContent>
          </Card>
        ) : (
          sections.map((section, sIdx) => (
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
          ))
        )}
      </div>
    </AdminShell>
  );
}
