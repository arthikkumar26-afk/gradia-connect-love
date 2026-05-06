import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Send, Eye, Loader2, Sparkles } from "lucide-react";

interface Props {
  hrName: string;
  companyName: string;
  hrEmail: string;
}

type TemplateKey = "intro" | "partnership" | "demo" | "talent" | "followup";

const TEMPLATES: Record<TemplateKey, { label: string; subject: string; body: (v: Vars) => string }> = {
  intro: {
    label: "Introduction & Onboarding",
    subject: "Partner with Gradia — Smart Hiring for {{company}}",
    body: (v) => `
      <h2 style="color:#1e3a8a;margin:0 0 12px;">Hello ${v.contactName || "Hiring Leader"},</h2>
      <p>Greetings from <strong>${v.fromCompany}</strong>!</p>
      <p>We came across <strong>${v.company}</strong> and believe Gradia can help you streamline your hiring with AI-powered candidate screening, automated pipelines, and a curated talent pool.</p>
      <h3 style="color:#1e3a8a;">Why employers choose Gradia:</h3>
      <ul style="line-height:1.7;color:#374151;">
        <li>AI-driven resume scrutiny &amp; shortlisting</li>
        <li>End-to-end interview pipeline management</li>
        <li>Access to 50,000+ pre-screened candidates</li>
        <li>Custom branding for your job postings</li>
      </ul>
      <p>We'd love to set up a quick onboarding call.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://gradiaa.com/employer/signup" style="background:#1e3a8a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">Create Employer Account</a>
      </div>
      <p style="font-size:13px;color:#6b7280;">Looking forward to partnering with ${v.company}.</p>
    `,
  },
  partnership: {
    label: "Strategic Partnership Proposal",
    subject: "Strategic Hiring Partnership Proposal for {{company}}",
    body: (v) => `
      <h2 style="color:#1e3a8a;">Dear ${v.contactName || "Team"},</h2>
      <p>I'm reaching out from <strong>${v.fromCompany}</strong> with a partnership proposal tailored for <strong>${v.company}</strong>.</p>
      <p>Our platform helps companies like yours:</p>
      <ul style="line-height:1.7;">
        <li>Reduce time-to-hire by up to 60%</li>
        <li>Cut recruitment costs significantly</li>
        <li>Get verified, role-matched candidates instantly</li>
      </ul>
      <p>We'd be glad to share a custom proposal for ${v.company}'s hiring needs.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://gradiaa.com/employer/request-demo" style="background:#047857;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">Request Custom Proposal</a>
      </div>
    `,
  },
  demo: {
    label: "Demo Request Invitation",
    subject: "See Gradia in action — Quick demo for {{company}}",
    body: (v) => `
      <h2 style="color:#1e3a8a;">Hi ${v.contactName || "there"},</h2>
      <p>Would you be open to a 20-minute demo of <strong>Gradia</strong> tailored for <strong>${v.company}</strong>?</p>
      <p>In the demo, we'll cover:</p>
      <ul style="line-height:1.7;">
        <li>AI candidate screening live walkthrough</li>
        <li>Custom interview pipelines for your roles</li>
        <li>Talent pool access &amp; bulk outreach</li>
        <li>Reporting &amp; analytics dashboard</li>
      </ul>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://gradiaa.com/employer/request-demo" style="background:#1e3a8a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">Book a Demo Slot</a>
      </div>
      <p style="font-size:13px;color:#6b7280;">Or simply reply with a time that works for you.</p>
    `,
  },
  talent: {
    label: "Talent Pool Access",
    subject: "Exclusive talent pool access for {{company}}",
    body: (v) => `
      <h2 style="color:#1e3a8a;">Hello ${v.contactName || "Hiring Team"},</h2>
      <p>Gradia's talent network includes thousands of pre-screened candidates across roles your team typically hires for at <strong>${v.company}</strong>.</p>
      <p>Get instant access to:</p>
      <ul style="line-height:1.7;">
        <li>Verified profiles with AI match scores</li>
        <li>Direct messaging with candidates</li>
        <li>Bulk shortlisting &amp; pipeline tools</li>
      </ul>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://gradiaa.com/employer/signup" style="background:#1e3a8a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">Unlock Talent Pool</a>
      </div>
    `,
  },
  followup: {
    label: "Follow-up / Reminder",
    subject: "Following up — Gradia for {{company}}",
    body: (v) => `
      <h2 style="color:#1e3a8a;">Hi ${v.contactName || "there"},</h2>
      <p>Just following up on my earlier note about partnering with <strong>${v.company}</strong>.</p>
      <p>Many similar companies have already onboarded to Gradia and seen measurable improvements in hiring speed and candidate quality.</p>
      <p>Would love to hear your thoughts — even a quick reply works.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="https://gradiaa.com/employer/signup" style="background:#1e3a8a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;display:inline-block;">Get Started</a>
      </div>
    `,
  },
};

interface Vars {
  company: string;
  contactName: string;
  fromCompany: string;
}

const HRInviteEmployer = ({ hrName, companyName, hrEmail }: Props) => {
  const [tab, setTab] = useState("details");
  const [companyNameInput, setCompanyNameInput] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const [templateKey, setTemplateKey] = useState<TemplateKey>("intro");
  const [subject, setSubject] = useState("");
  const [editedHtml, setEditedHtml] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);

  const tpl = TEMPLATES[templateKey];

  const generatedHtml = useMemo(() => {
    const inner = tpl.body({
      company: companyNameInput || "your company",
      contactName,
      fromCompany: companyName || "Gradia",
    });
    return `<div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:24px;background:#fff;color:#111827;">
      ${inner}
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>
      <p style="font-size:13px;color:#6b7280;">
        Best regards,<br/>
        <strong>${hrName || "Hiring Team"}</strong><br/>
        ${companyName || "Gradia"}<br/>
        ${hrEmail || "info@gradiaa.com"}
      </p>
      ${notes ? `<p style="font-size:12px;color:#9ca3af;margin-top:16px;border-left:3px solid #e5e7eb;padding-left:10px;">${notes}</p>` : ""}
    </div>`;
  }, [tpl, companyNameInput, contactName, companyName, hrName, hrEmail, notes]);

  const finalHtml = editedHtml ?? generatedHtml;
  const finalSubject = (subject || tpl.subject).replace(/\{\{company\}\}/g, companyNameInput || "your company");

  const handleTemplateChange = (k: TemplateKey) => {
    setTemplateKey(k);
    setSubject(TEMPLATES[k].subject);
    setEditedHtml(null);
  };

  const saveEmployerLead = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("resume_invites").insert({
        sender_user_id: user?.id ?? null,
        candidate_name: contactName || companyNameInput,
        recipient_email: contactEmail,
        subject: `[Employer Lead] ${companyNameInput} — ${industry || "—"} — ${location || "—"} — ${phone || "—"} — ${website || "—"}`,
        status: "draft",
      });
      if (error) throw error;
      toast.success("Employer lead saved");
    } catch (err: any) {
      toast.error(err.message || "Could not save lead");
    } finally {
      setSaving(false);
    }
  };

  const handleSend = async () => {
    if (!contactEmail.includes("@")) { toast.error("Enter a valid contact email"); return; }
    if (!companyNameInput.trim()) { toast.error("Company name required"); return; }
    if (!finalSubject.trim()) { toast.error("Subject required"); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-resume-invite-email", {
        body: {
          to: contactEmail.trim(),
          subject: finalSubject.trim(),
          html: finalHtml,
          fromName: companyName || "Gradia",
          candidateName: contactName || companyNameInput,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Invitation sent to ${contactEmail}`);
      // Save as employer lead too
      saveEmployerLead();
    } catch (err: any) {
      toast.error(err.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Invite Employer
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Capture employer / company details and send branded invitation emails to onboard them onto Gradia.
          </p>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid grid-cols-3 w-full max-w-md mb-4">
              <TabsTrigger value="details"><Building2 className="h-3.5 w-3.5 mr-1" />Company Details</TabsTrigger>
              <TabsTrigger value="compose"><Sparkles className="h-3.5 w-3.5 mr-1" />Compose Email</TabsTrigger>
              <TabsTrigger value="preview"><Eye className="h-3.5 w-3.5 mr-1" />Preview &amp; Send</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Company Name *</Label>
                  <Input value={companyNameInput} onChange={e => setCompanyNameInput(e.target.value)} placeholder="Acme Corp" className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Contact Person</Label>
                  <Input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="HR / Hiring Manager" className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Contact Email *</Label>
                  <Input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="hiring@company.com" className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 ..." className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Website</Label>
                  <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://company.com" className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Industry</Label>
                  <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="IT / Education / Manufacturing" className="h-9 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Location</Label>
                  <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" className="h-9 text-sm" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-xs">Internal Notes (optional, appended to email footer)</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything specific about this employer..." className="text-sm" rows={3} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={saveEmployerLead} disabled={saving || !companyNameInput || !contactEmail}>
                  {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                  Save Lead
                </Button>
                <Button size="sm" onClick={() => setTab("compose")}>Next: Compose Email</Button>
              </div>
            </TabsContent>

            <TabsContent value="compose" className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Email Template</Label>
                  <Select value={templateKey} onValueChange={(v) => handleTemplateChange(v as TemplateKey)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(TEMPLATES) as TemplateKey[]).map(k => (
                        <SelectItem key={k} value={k}>{TEMPLATES[k].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Subject (use {"{{company}}"} placeholder)</Label>
                  <Input value={subject || tpl.subject} onChange={e => setSubject(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs">Email Body HTML (auto-generated — edit if needed)</Label>
                <Textarea
                  value={editedHtml ?? generatedHtml}
                  onChange={(e) => setEditedHtml(e.target.value)}
                  className="text-xs font-mono min-h-[260px]"
                />
                {editedHtml !== null && (
                  <Button variant="ghost" size="sm" className="mt-1 text-xs" onClick={() => setEditedHtml(null)}>
                    Reset to template
                  </Button>
                )}
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={() => setTab("details")}>Back</Button>
                <Button size="sm" onClick={() => setTab("preview")}>Next: Preview</Button>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="space-y-3">
              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">To:</span> {contactEmail || "—"} &nbsp;·&nbsp;
                <span className="font-medium text-foreground">Subject:</span> {finalSubject}
              </div>
              <div className="border rounded-lg overflow-hidden bg-white">
                <iframe
                  title="email-preview"
                  className="w-full h-[480px] bg-white"
                  srcDoc={finalHtml}
                />
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" size="sm" onClick={() => setTab("compose")}>Back</Button>
                <Button size="sm" onClick={handleSend} disabled={sending}>
                  {sending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                  Send Invitation
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default HRInviteEmployer;
