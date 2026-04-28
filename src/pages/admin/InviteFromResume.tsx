import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Home, Users, CreditCard, UserCheck, UserX, Briefcase, Building2,
  ClipboardList, UserCog, MessageSquare, Ticket, Bell, BarChart3,
  FileText, Settings, ShieldCheck, Upload, Mail, Send, Loader2, FileUp,
  Sparkles, MapPin, Wand2, Search, Save, Database, Eye, FileEdit,
  Activity, RefreshCw, Clock, CheckCircle2, XCircle, UserPlus, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarTrigger,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", icon: Home, path: "/admin/dashboard" },
  { title: "Users", icon: Users, path: "/admin/users" },
  { title: "Subscribed Employers", icon: CreditCard, path: "/admin/subscribed-employers" },
  { title: "Subscribed Candidates", icon: UserCheck, path: "/admin/subscribed-candidates" },
  { title: "Candidate Resumes", icon: FileText, path: "/admin/candidate-resumes" },
  { title: "Unsubscribed Employers", icon: UserX, path: "/admin/unsubscribed-employers" },
  { title: "Unsubscribed Candidates", icon: UserX, path: "/admin/unsubscribed-candidates" },
  { title: "Job Moderation", icon: Briefcase, path: "/admin/jobs" },
  { title: "External Jobs", icon: Briefcase, path: "/admin/external-jobs" },
  { title: "Companies", icon: Building2, path: "/admin/companies" },
  { title: "Mock Interview", icon: ClipboardList, path: "/admin/mock-interview-pipeline" },
  { title: "Management", icon: UserCog, path: "/admin/management" },
  { title: "HR Negotiations", icon: MessageSquare, path: "/admin/hr-negotiations" },
  { title: "Coupons", icon: Ticket, path: "/admin/coupons" },
  { title: "AI Flyer Maker", icon: FileText, path: "/admin/flyer-maker" },
  { title: "Popup Ads", icon: Bell, path: "/admin/popup-ads" },
  { title: "Event Alerts", icon: Bell, path: "/admin/event-alerts" },
  { title: "Bulk Mail & Register", icon: FileUp, path: "/admin/bulk-mail-register" },
  { title: "Invite from Resume", icon: Mail, path: "/admin/invite-from-resume" },
  { title: "Reports", icon: BarChart3, path: "/admin/reports" },
  { title: "Audit Logs", icon: FileText, path: "/admin/audit" },
  { title: "Settings", icon: Settings, path: "/admin/settings" },
];

interface ParsedResume {
  full_name?: string | null;
  email?: string | null;
  mobile?: string | null;
  location?: string | null;
  skills?: string[] | null;
  experience_level?: string | null;
  preferred_role?: string | null;
  experience?: Array<{ designation?: string; organization?: string }>;
}

interface CandidateRow {
  id: string;
  full_name: string | null;
  email: string | null;
  mobile: string | null;
  location: string | null;
  resume_url: string | null;
  preferred_role: string | null;
}

const DRAFT_KEY = "invite_from_resume_draft_compact_v2";

const DEFAULT_SUBJECT = "Opportunity Update – Your Profile Review";

const buildSuggestedRoles = (p: ParsedResume | null): string[] => {
  if (!p) return [];
  const roles = new Set<string>();
  if (p.preferred_role) roles.add(p.preferred_role);
  (p.experience || []).forEach((e) => e.designation && roles.add(e.designation));
  (p.skills || []).forEach((s) => roles.add(`${s} Specialist`));
  return Array.from(roles);
};

const DEFAULT_CV_OPENINGS: { title: string; salary: string }[] = [
  { title: "Principal – State Board (Hyderabad)", salary: "₹60,000 – ₹90,000 / month" },
  { title: "Principal – State Board (Nizamabad)", salary: "₹55,000 – ₹85,000 / month" },
  { title: "Principal – CBSE Board", salary: "₹70,000 – ₹1,10,000 / month" },
  { title: "SME (Subject Matter Expert)", salary: "₹35,000 – ₹60,000 / month" },
  { title: "Resource Person", salary: "₹25,000 – ₹45,000 / month" },
  { title: "HOD / Senior Teacher", salary: "₹40,000 – ₹65,000 / month" },
];

const buildApplyUrl = (baseUrl: string, title: string) => {
  const fallback = "https://gradiaa.com/jobs-results";
  let base = baseUrl && /^https?:\/\//i.test(baseUrl) ? baseUrl : fallback;
  // Strip any existing query/hash so we cleanly attach the job title filter
  base = base.split("#")[0].split("?")[0];
  // If user pointed at /jobs, redirect to /jobs-results which supports ?q= filter
  base = base.replace(/\/jobs\/?$/i, "/jobs-results");
  // Normalize the title so the search returns matches even when the
  // displayed label includes board/location qualifiers like
  // "Principal – State Board (Hyderabad)".
  let cleanTitle = (title || "").trim();
  if (!cleanTitle) return base;
  // Remove anything in (), [], {}
  cleanTitle = cleanTitle.replace(/[\(\[\{][^\)\]\}]*[\)\]\}]/g, " ");
  // Split on dashes (en/em/hyphen) and keep only the core role (first chunk)
  cleanTitle = cleanTitle.split(/\s+[–—-]\s+/)[0];
  // Collapse whitespace
  cleanTitle = cleanTitle.replace(/\s+/g, " ").trim();
  if (!cleanTitle) return base;
  return `${base}?q=${encodeURIComponent(cleanTitle)}`;
};

const renderJobRow = (
  label: string,
  title: string,
  salary: string,
  applyUrl: string,
) => {
  const safeUrl = buildApplyUrl(applyUrl, title);
  const displayTitle = `${label ? `${label}. ` : ""}${title}`;
  const salaryText = salary || "Negotiable";
  const ariaLabel = `Apply for ${displayTitle.replace(/"/g, "&quot;")} — Salary ${salaryText.replace(/"/g, "&quot;")}`;
  return `
    <tr>
      <td data-label="Vacancy" style="border:1px solid #e5e7eb;padding:12px 14px;font-size:14px;line-height:1.5;vertical-align:middle;word-break:break-word;">
        ${label ? `<strong>${label}.</strong> ` : ""}${title}
      </td>
      <td data-label="Salary" style="border:1px solid #e5e7eb;padding:12px 14px;font-size:13px;color:#047857;font-weight:600;vertical-align:middle;white-space:nowrap;">
        ${salaryText}
      </td>
      <td data-label="Action" style="border:1px solid #e5e7eb;padding:12px 14px;text-align:center;vertical-align:middle;white-space:nowrap;">
        <a href="${safeUrl}" role="button" aria-label="${ariaLabel}" title="${ariaLabel}" style="background:#1e3a8a;color:#ffffff;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:6px;display:inline-block;min-width:96px;text-align:center;">Apply Now</a>
      </td>
    </tr>`;
};

const buildEmailHtml = (opts: {
  candidateName: string;
  jobRoles: string[];
  jobSalaries: string[];
  cvOpenings: { title: string; salary: string }[];
  applyUrl: string;
  adminName: string;
  companyName: string;
  contactInfo: string;
  showSubscription: boolean;
  showTerms: boolean;
}) => {
  const { candidateName, jobRoles, jobSalaries, cvOpenings, applyUrl, adminName, companyName, contactInfo, showSubscription, showTerms } = opts;

  const cvOpeningsRows = cvOpenings
    .filter((o) => o.title && o.title.trim())
    .slice(0, 3)
    .map((o) => renderJobRow("", o.title, o.salary, applyUrl))
    .join("");

  const roleCount = Math.min(3, Math.max(jobRoles.length, jobSalaries.length, 1));
  const roleList = Array.from({ length: roleCount }, (_, i) =>
    renderJobRow("", jobRoles[i] || `Suitable Role ${i + 1}`, jobSalaries[i] || "", applyUrl)
  ).join("");

  const moreButton = `
    <div style="text-align:center;margin-top:14px;margin-bottom:6px;">
      <a href="https://gradiaa.com/jobs" role="button" aria-label="View more jobs on Gradia jobs portal" title="View more jobs on Gradia" style="background:#1e3a8a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:6px;display:inline-block;min-width:160px;text-align:center;">More Jobs →</a>
    </div>`;

  const subscriptionBlock = showSubscription ? `
    <h3 style="color:#dc2626;margin-top:24px;text-align:center;font-size:22px;font-style:italic;">Subscription Plans</h3>
    <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:8px;table-layout:fixed;margin-top:8px;">
      <tr style="vertical-align:top;">
        <td style="width:25%;border:1px solid #e5e7eb;border-radius:8px;padding:12px;background:#ffffff;vertical-align:top;">
          <div style="text-align:center;font-weight:700;color:#1e3a8a;font-size:15px;margin-bottom:8px;">Basic</div>
          <div style="font-size:12px;line-height:1.6;color:#111827;">
            <div>✔ Apply to job</div>
            <div>✔ Resume export (1×)</div>
            <div>✔ ATS score check</div>
            <div style="color:#9ca3af;">✘ Mock interview</div>
            <div style="color:#9ca3af;">✘ AI feedback report</div>
            <div style="color:#9ca3af;">✘ Featured profile boost</div>
          </div>
        </td>
        <td style="width:25%;border:1px solid #1e3a8a;border-radius:8px;padding:12px;background:#ffffff;vertical-align:top;">
          <div style="text-align:center;font-weight:700;color:#1e3a8a;font-size:15px;margin-bottom:8px;">Standard</div>
          <div style="font-size:12px;line-height:1.6;color:#111827;">
            <div>✔ Apply to job</div>
            <div>✔ Resume export (1×)</div>
            <div>✔ ATS score check</div>
            <div><strong>✔ 1× Mock Interview</strong></div>
            <div style="color:#6b7280;font-size:11px;margin-left:12px;">(Aptitude + 1 Technical round)</div>
            <div>✔ Basic AI feedback</div>
            <div style="color:#9ca3af;">✘ Featured boost</div>
          </div>
        </td>
        <td style="width:25%;border:1px solid #f59e0b;border-radius:8px;padding:12px;background:#fffbeb;vertical-align:top;">
          <div style="text-align:center;font-weight:700;color:#b45309;font-size:15px;margin-bottom:4px;">Premium</div>
          <div style="text-align:center;margin-bottom:8px;"><span style="background:#f59e0b;color:#ffffff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:10px;">POPULAR</span></div>
          <div style="font-size:12px;line-height:1.6;color:#111827;">
            <div>✔ Apply to job</div>
            <div>✔ Resume export (2×)</div>
            <div>✔ ATS score check</div>
            <div><strong>✔ 2× Mock Interviews</strong></div>
            <div style="color:#6b7280;font-size:11px;margin-left:12px;">(Aptitude + Technical + HR rounds)</div>
            <div>✔ Detailed AI feedback report</div>
            <div>✔ Featured profile boost (1×)</div>
            <div>✔ Priority application tag</div>
          </div>
        </td>
        <td style="width:25%;border:1px solid #047857;border-radius:8px;padding:12px;background:#ffffff;vertical-align:top;">
          <div style="text-align:center;font-weight:700;color:#047857;font-size:15px;margin-bottom:8px;">Professional</div>
          <div style="font-size:12px;line-height:1.6;color:#111827;">
            <div>✔ Apply to job</div>
            <div>✔ Unlimited resume exports</div>
            <div>✔ ATS score check</div>
            <div><strong>✔ 5× Mock Interviews</strong></div>
            <div style="color:#6b7280;font-size:11px;margin-left:12px;">(Aptitude + Technical + Coding/Demo + HR + Final rounds)</div>
            <div>✔ Full AI feedback + improvement plan</div>
            <div>✔ Featured profile boost (3×)</div>
            <div>✔ Priority support &amp; faster shortlisting</div>
          </div>
        </td>
      </tr>
    </table>` : "";




  const termsBlock = showTerms ? `
    <h3 style="color:#1e3a8a;margin-top:24px;">📜 Terms &amp; Conditions</h3>
    <ul style="font-size:13px;line-height:1.7;color:#4b5563;margin:0 0 0 18px;padding:0;">
      <li>Submission of your resume/CV does not guarantee job placement or interview selection.</li>
      <li>Interview scheduling is subject to employer requirements and availability.</li>
      <li>The information provided in your resume/CV must be accurate and truthful.</li>
      <li>We may share your profile with potential employers for relevant job opportunities.</li>
      <li>Communication regarding opportunities will be sent via email or phone.</li>
    </ul>
    <p style="font-size:13px;line-height:1.6;color:#4b5563;margin-top:10px;">We will keep you updated shortly. If you have any questions, please feel free to contact us.</p>` : "";

  const uniqueRef = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:680px;margin:0 auto;padding:24px;color:#111827;background:#ffffff;">
  <style>
    @media only screen and (max-width: 480px) {
      .gradia-job-table { font-size: 13px !important; }
      .gradia-job-table thead { display: none !important; }
      .gradia-job-table tr {
        display: block !important;
        margin-bottom: 12px !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 6px !important;
        overflow: hidden !important;
      }
      .gradia-job-table td {
        display: block !important;
        width: 100% !important;
        border: 0 !important;
        border-bottom: 1px solid #f1f5f9 !important;
        padding: 10px 14px !important;
        text-align: left !important;
        white-space: normal !important;
      }
      .gradia-job-table td:last-child { border-bottom: 0 !important; text-align: center !important; }
      .gradia-job-table td::before {
        content: attr(data-label) ": ";
        font-weight: 700;
        color: #475569;
        display: inline-block;
        margin-right: 6px;
      }
      .gradia-job-table td:last-child::before { content: ""; margin: 0; }
      .gradia-more-btn { width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;font-size:1px;line-height:1px;mso-hide:all;overflow:hidden;">Job opportunities for ${candidateName} — ${uniqueRef}</span>
  <h2 style="color:#1e3a8a;margin:0 0 14px;font-size:18px;">Dear ${candidateName},</h2>
  <p style="font-size:13px;line-height:1.6;">Greetings,</p>
  <p style="font-size:13px;line-height:1.6;">Thank you for submitting your resume through our GRADIA job portal. We appreciate your interest in opportunities with us.</p>
  <p style="font-size:13px;line-height:1.6;">Our team is currently reviewing your profile and will schedule the interview process soon. You will receive further details shortly. Based on your qualifications and experience, we will also guide you toward suitable job opportunities.</p>
  <p style="font-size:13px;line-height:1.6;">If you have any questions or need assistance, feel free to contact us.</p>

  <h3 id="cv-openings-heading" style="color:#1e3a8a;margin-top:24px;font-weight:600;">Based on your CV, suitable openings:</h3>
  <table class="gradia-job-table" role="table" aria-labelledby="cv-openings-heading" style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
    <caption style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;">Suitable job openings based on your CV</caption>
    <thead>
      <tr style="background:#f3f4f6;">
        <th scope="col" style="border:1px solid #e5e7eb;padding:10px;text-align:left;">Vacancy</th>
        <th scope="col" style="border:1px solid #e5e7eb;padding:10px;text-align:left;">Salary</th>
        <th scope="col" style="border:1px solid #e5e7eb;padding:10px;text-align:center;">Action</th>
      </tr>
    </thead>
    <tbody>${cvOpeningsRows}</tbody>
  </table>
  ${moreButton.replace('<a ', '<a class="gradia-more-btn" ')}

  <h3 id="suitable-jobs-heading" style="color:#1e3a8a;margin-top:24px;font-weight:600;">Suitable Jobs according to your qualifications &amp; Experience:</h3>
  <table class="gradia-job-table" role="table" aria-labelledby="suitable-jobs-heading" style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px;">
    <caption style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;">Suitable jobs matching your qualifications and experience</caption>
    <thead>
      <tr style="background:#f3f4f6;">
        <th scope="col" style="border:1px solid #e5e7eb;padding:10px;text-align:left;">Vacancy</th>
        <th scope="col" style="border:1px solid #e5e7eb;padding:10px;text-align:left;">Salary</th>
        <th scope="col" style="border:1px solid #e5e7eb;padding:10px;text-align:center;">Action</th>
      </tr>
    </thead>
    <tbody>${roleList}</tbody>
  </table>
  ${moreButton.replace('<a ', '<a class="gradia-more-btn" ')}

  <p style="font-size:14px;margin-top:16px;"><strong>Before applying for the job, would you like to attend the interview process and assess your suitability for the position?</strong></p>
  <p style="font-size:14px;margin-top:12px;"><strong>Please confirm your preference:</strong></p>
  

  <h3 style="color:#1e3a8a;margin-top:24px;">⚖️ Comparison Overview</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px;">
    <tr style="background:#f3f4f6;">
      <th style="border:1px solid #e5e7eb;padding:8px;text-align:center;color:#047857;">With GRADIA</th>
      <th style="border:1px solid #e5e7eb;padding:8px;text-align:center;color:#dc2626;">Without GRADIA</th>
    </tr>
    <tr>
      <td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;"><u>Internal Interview Process</u></td>
      <td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;">Interview will be conducted by management</td>
    </tr>
    <tr>
      <td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;">Review Your Feedback</td>
      <td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;">Decision will be based on the employer</td>
    </tr>
    <tr>
      <td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;">Strengths and Weaknesses</td>
      <td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;">Selected – Direct joining</td>
    </tr>
    <tr>
      <td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;">Areas for Improvement</td>
      <td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;">Rejected – No further opportunity</td>
    </tr>
    <tr>
      <td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;">Selected – Recommended to Management</td>
      <td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;">No suggestions or recommendations provided</td>
    </tr>
    <tr>
      <td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;">Rejected – Suggested for Training/Improvement</td>
      <td style="border:1px solid #e5e7eb;padding:8px;vertical-align:top;">&nbsp;</td>
    </tr>
    <tr>
      <td style="border:1px solid #e5e7eb;padding:10px;text-align:center;">
        <a href="https://gradiaa.com/candidate/signup?mode=with-interview" style="background:#1e3a8a;color:#ffffff;text-decoration:none;font-size:12px;font-weight:600;padding:8px 14px;border-radius:6px;display:inline-block;">Sign Up – With Interview</a>
      </td>
      <td style="border:1px solid #e5e7eb;padding:10px;text-align:center;">
        <a href="https://gradiaa.com/candidate/signup?mode=without-interview" style="background:#047857;color:#ffffff;text-decoration:none;font-size:12px;font-weight:600;padding:8px 14px;border-radius:6px;display:inline-block;">Sign Up – Without Interview</a>
      </td>
    </tr>
  </table>

  ${subscriptionBlock}

  ${termsBlock}

  <p style="font-size:15px;margin-top:24px;">We will keep you updated shortly.</p>

  <div style="text-align:center;margin:28px 0 20px;">
    <a href="https://gradiaa.com/candidate/signup" style="display:inline-block;background:#1e3a8a;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:16px;font-weight:600;font-family:Arial,sans-serif;">🚀 Get Started</a>
  </div>

  <p style="font-size:15px;margin-top:16px;">Best regards,<br/><strong>${adminName}</strong><br/>${companyName}<br/>${contactInfo}</p>
</div>`;
};

const InviteFromResume = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);
  const [sending, setSending] = useState(false);
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<ParsedResume | null>(null);

  const [activeTab, setActiveTab] = useState("resume");

  // Recipient + roles
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [jobRoles, setJobRoles] = useState<string[]>(["", "", "", "", ""]);
  const [jobSalaries, setJobSalaries] = useState<string[]>(["", "", "", "", ""]);
  const [cvOpenings, setCvOpenings] = useState<{ title: string; salary: string }[]>(DEFAULT_CV_OPENINGS);
  const [applyUrl, setApplyUrl] = useState<string>("https://gradiaa.com/jobs-results");

  // Email
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [adminName, setAdminName] = useState("Gradia Hiring Team");
  const [companyName, setCompanyName] = useState("Gradia");
  const [contactInfo, setContactInfo] = useState("info@gradiaa.com");
  const [showSubscription, setShowSubscription] = useState(true);
  const [showTerms, setShowTerms] = useState(true);
  const [editedHtml, setEditedHtml] = useState<string | null>(null);

  // Bulk send
  const bulkFileRef = useRef<HTMLInputElement>(null);
  type BulkRow = {
    id: string;
    fileName: string;
    name: string;
    email: string;
    status: "pending" | "parsing" | "ready" | "sending" | "sent" | "failed";
    error?: string;
    parsed?: ParsedResume | null;
    suggestedRoles?: string[];
  };
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [expandedReviewIds, setExpandedReviewIds] = useState<Set<string>>(new Set());
  const [selectedPreviewId, setSelectedPreviewId] = useState<string | null>(null);

  // Invite status tracking
  type InviteRecord = {
    id: string;
    candidate_name: string | null;
    recipient_email: string;
    subject: string | null;
    status: "pending" | "sent" | "failed" | "accepted";
    error_message: string | null;
    sent_at: string | null;
    accepted_at: string | null;
    created_at: string;
  };
  const [invites, setInvites] = useState<InviteRecord[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [inviteStatusFilter, setInviteStatusFilter] = useState<"all" | "pending" | "sent" | "accepted" | "failed">("all");
  const [inviteSearch, setInviteSearch] = useState("");

  const loadInvites = async () => {
    setInvitesLoading(true);
    try {
      const { data, error } = await supabase
        .from("resume_invites")
        .select("id,candidate_name,recipient_email,subject,status,error_message,sent_at,accepted_at,created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      setInvites((data || []) as InviteRecord[]);
    } catch (err: any) {
      toast.error(err.message || "Failed to load invite status");
    } finally {
      setInvitesLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/admin/login"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const has = roles?.some((r) => r.role === "admin" || r.role === "owner");
      if (!has) { navigate("/admin/login"); return; }
      setAuthorized(true); setLoading(false);

      // load draft
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw);
          if (d.candidateName) setCandidateName(d.candidateName);
          if (d.candidateEmail) setCandidateEmail(d.candidateEmail);
          if (d.jobRoles) setJobRoles(d.jobRoles);
          if (d.jobSalaries) setJobSalaries(d.jobSalaries);
          if (d.cvOpenings) setCvOpenings(d.cvOpenings);
          if (d.applyUrl) setApplyUrl(d.applyUrl);
          if (d.subject) setSubject(d.subject);
          if (d.adminName) setAdminName(d.adminName);
          if (d.companyName) setCompanyName(d.companyName);
          if (d.contactInfo) setContactInfo(d.contactInfo);
          if (typeof d.editedHtml === "string") setEditedHtml(d.editedHtml);
          if (typeof d.showSubscription === "boolean") setShowSubscription(d.showSubscription);
          if (typeof d.showTerms === "boolean") setShowTerms(d.showTerms);
        }
      } catch { /* ignore */ }
    })();
  }, [navigate]);

  // Auto-load invite history when Status tab is opened
  useEffect(() => {
    if (activeTab === "status" && authorized) {
      loadInvites();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, authorized]);

  const handleBulkFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBulkParsing(true);
    const initial: BulkRow[] = files.map((f) => ({
      id: `${f.name}-${f.size}-${Math.random().toString(36).slice(2, 8)}`,
      fileName: f.name,
      name: "",
      email: "",
      status: "parsing",
    }));
    setBulkRows((prev) => [...prev, ...initial]);
    setExpandedReviewIds((prev) => {
      const next = new Set(prev);
      initial.forEach((r) => next.add(r.id));
      return next;
    });

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const rowId = initial[i].id;
      try {
        const fd = new FormData();
        fd.append("file", file);
        const { data, error } = await supabase.functions.invoke("parse-resume", { body: fd });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        const name = data?.full_name || "";
        const email = data?.email || "";
        setBulkRows((prev) => prev.map((r) => r.id === rowId ? {
          ...r,
          name,
          email,
          status: email ? "ready" : "failed",
          error: email ? undefined : "No email found in resume",
        } : r));
      } catch (err: any) {
        setBulkRows((prev) => prev.map((r) => r.id === rowId ? {
          ...r,
          status: "failed",
          error: err.message || "Parse failed",
        } : r));
      }
    }
    setBulkParsing(false);
    if (e.target) e.target.value = "";
    toast.success(`Parsed ${files.length} resume${files.length > 1 ? "s" : ""}`);
  };

  const removeBulkRow = (id: string) => {
    setBulkRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateBulkRow = (id: string, patch: Partial<BulkRow>) => {
    setBulkRows((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r));
  };

  const clearBulk = () => setBulkRows([]);

  const sendBulk = async () => {
    const recipients = bulkRows.filter((r) => r.email && r.email.includes("@") && r.status !== "sent");
    if (!recipients.length) {
      toast.error("No valid recipients to send to");
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject is required (set it in the Preview tab)");
      return;
    }
    setBulkSending(true);
    let successCount = 0;
    let failCount = 0;
    for (const row of recipients) {
      updateBulkRow(row.id, { status: "sending" });
      try {
        const personalizedHtml = buildEmailHtml({
          candidateName: row.name || "Candidate",
          jobRoles,
          jobSalaries,
          cvOpenings,
          applyUrl,
          adminName,
          companyName,
          contactInfo,
          showSubscription,
          showTerms,
        });
        const { data, error } = await supabase.functions.invoke("send-resume-invite-email", {
          body: { to: row.email.trim(), subject: subject.trim(), html: personalizedHtml, fromName: companyName, candidateName: row.name || null },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        updateBulkRow(row.id, { status: "sent" });
        successCount++;
        await new Promise((r) => setTimeout(r, 250));
      } catch (err: any) {
        updateBulkRow(row.id, { status: "failed", error: err.message || "Send failed" });
        failCount++;
      }
    }
    setBulkSending(false);
    toast.success(`Bulk send complete: ${successCount} sent, ${failCount} failed`);
  };

  const applyParsed = (p: ParsedResume) => {
    setParsed(p);
    if (p.full_name) setCandidateName(p.full_name);
    if (p.email) setCandidateEmail(p.email);
    const suggested = buildSuggestedRoles(p);
    if (suggested.length) {
      setJobRoles((prev) => prev.map((r, i) => suggested[i] || r));
    }
    setEditedHtml(null);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data, error } = await supabase.functions.invoke("parse-resume", { body: fd });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      applyParsed(data);
      toast.success("Resume parsed successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to parse resume");
    } finally {
      setParsing(false);
    }
  };

  const generatedHtml = useMemo(
    () =>
      buildEmailHtml({
        candidateName: candidateName || "Candidate",
        jobRoles,
        jobSalaries,
        cvOpenings,
        applyUrl,
        adminName,
        companyName,
        contactInfo,
        showSubscription,
        showTerms,
      }),
    [candidateName, jobRoles, jobSalaries, cvOpenings, applyUrl, adminName, companyName, contactInfo, showSubscription, showTerms]
  );

  const finalHtml = editedHtml ?? generatedHtml;

  const handleSaveDraft = () => {
    const payload = {
      candidateName, candidateEmail, jobRoles, jobSalaries, cvOpenings, applyUrl, subject,
      adminName, companyName, contactInfo, editedHtml,
      showSubscription, showTerms,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    toast.success("Draft saved locally");
  };

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setEditedHtml(null);
    toast.success("Draft cleared");
  };

  const handleSend = async () => {
    if (!candidateEmail || !candidateEmail.includes("@")) {
      toast.error("Enter a valid recipient email"); return;
    }
    if (!subject.trim()) { toast.error("Subject is required"); return; }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-resume-invite-email", {
        body: { to: candidateEmail.trim(), subject: subject.trim(), html: finalHtml, fromName: companyName, candidateName: candidateName || null },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Email sent to ${candidateEmail}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const pendingBulkRecipients = bulkRows.filter((r) => r.email && r.email.includes("@") && r.status !== "sent");
  const singleRecipientReady = candidateEmail.includes("@") && pendingBulkRecipients.length === 0;
  const pendingRecipientCount = pendingBulkRecipients.length || (singleRecipientReady ? 1 : 0);
  const sentBulkCount = bulkRows.filter((r) => r.status === "sent").length;
  const handleSendCurrent = () => {
    if (pendingBulkRecipients.length > 0) {
      sendBulk();
      return;
    }
    handleSend();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!authorized) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-muted/30">
        <Sidebar>
          <SidebarContent className="flex flex-col h-full">
            <div className="p-4 border-b">
              <Link to="/admin/dashboard" className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                <span className="font-bold">Admin Panel</span>
              </Link>
            </div>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild isActive={location.pathname === item.path}>
                        <Link to={item.path}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            <div className="mt-auto p-4 border-t">
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 overflow-auto">
          <header className="bg-background border-b px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-primary" />
                Invite from Resume
              </h1>
              <p className="text-sm text-muted-foreground">Upload or pick a candidate → auto-generate a branded invite → preview, edit and send.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleSaveDraft}><Save className="h-4 w-4 mr-2" />Save Draft</Button>
          </header>

          <div className="p-6 max-w-6xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full max-w-2xl mx-auto mb-6">
                <TabsTrigger value="resume"><FileText className="h-4 w-4 mr-2" />Resume Info</TabsTrigger>
                <TabsTrigger value="preview"><Eye className="h-4 w-4 mr-2" />Email Preview</TabsTrigger>
                <TabsTrigger value="send"><Send className="h-4 w-4 mr-2" />Send</TabsTrigger>
                <TabsTrigger value="status"><Activity className="h-4 w-4 mr-2" />Invite Status</TabsTrigger>
              </TabsList>

              {/* TAB 1: RESUME INFO */}
              <TabsContent value="resume" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Upload className="h-4 w-4" /> Upload Resume
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        onClick={() => fileRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/50 transition"
                      >
                        <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                        <p className="font-medium text-sm">{fileName || "Click to upload PDF / DOCX / Image"}</p>
                        <p className="text-xs text-muted-foreground mt-1">AI extracts name, email, role, skills.</p>
                      </div>
                      <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.png,.jpg,.jpeg" onChange={handleFile} className="hidden" />
                      {parsing && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Analyzing resume…
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Send className="h-4 w-4" /> Bulk Mail Send
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload multiple resumes from your device. We'll auto-extract each candidate's name &amp; email and send the invite to all of them.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div
                        onClick={() => bulkFileRef.current?.click()}
                        className="border-2 border-dashed border-border rounded-xl p-5 text-center cursor-pointer hover:bg-muted/50 transition"
                      >
                        <FileUp className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="font-medium text-sm">Click to select multiple resumes</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF / DOCX / Image — select many at once</p>
                      </div>
                      <input
                        ref={bulkFileRef}
                        type="file"
                        multiple
                        accept=".pdf,.docx,.doc,.png,.jpg,.jpeg"
                        onChange={handleBulkFiles}
                        className="hidden"
                      />

                      {bulkParsing && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Parsing resumes…
                        </div>
                      )}

                      {bulkRows.length > 0 && (
                        <>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {bulkRows.length} file{bulkRows.length > 1 ? "s" : ""} ·{" "}
                              {bulkRows.filter((r) => r.status === "ready").length} ready ·{" "}
                              {bulkRows.filter((r) => r.status === "sent").length} sent ·{" "}
                              {bulkRows.filter((r) => r.status === "failed").length} failed
                            </span>
                            <Button variant="ghost" size="sm" onClick={clearBulk} disabled={bulkSending}>
                              Clear
                            </Button>
                          </div>
                          <div className="border rounded-md max-h-56 overflow-auto divide-y">
                            {bulkRows.map((r) => (
                              <div key={r.id} className="px-3 py-2 text-xs space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium truncate flex-1">{r.fileName}</span>
                                  <Badge
                                    variant={
                                      r.status === "sent" ? "default"
                                        : r.status === "failed" ? "destructive"
                                        : r.status === "ready" ? "secondary"
                                        : "outline"
                                    }
                                    className="text-[10px]"
                                  >
                                    {r.status}
                                  </Badge>
                                  <button
                                    onClick={() => removeBulkRow(r.id)}
                                    disabled={bulkSending}
                                    className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                                  >
                                    ×
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                  <Input
                                    value={r.name}
                                    onChange={(e) => updateBulkRow(r.id, { name: e.target.value })}
                                    placeholder="Name"
                                    className="h-7 text-xs"
                                    disabled={bulkSending || r.status === "sent"}
                                  />
                                  <Input
                                    value={r.email}
                                    onChange={(e) => updateBulkRow(r.id, {
                                      email: e.target.value,
                                      status: e.target.value.includes("@") && r.status === "failed" ? "ready" : r.status,
                                    })}
                                    placeholder="email@example.com"
                                    className="h-7 text-xs"
                                    disabled={bulkSending || r.status === "sent"}
                                  />
                                </div>
                                {r.error && <p className="text-[10px] text-destructive">{r.error}</p>}
                              </div>
                            ))}
                          </div>
                          <Button
                            className="w-full"
                            onClick={sendBulk}
                            disabled={bulkSending || bulkParsing || bulkRows.filter((r) => r.email && r.status !== "sent").length === 0}
                          >
                            {bulkSending ? (
                              <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending bulk emails…</>
                            ) : (
                              <><Send className="h-4 w-4 mr-2" />Send to {bulkRows.filter((r) => r.email && r.status !== "sent").length} recipient(s)</>
                            )}
                          </Button>
                          <p className="text-[10px] text-muted-foreground">
                            Tip: configure subject &amp; sections in the <strong>Email Preview</strong> tab before sending. Each email is personalized with the candidate's name.
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Sparkles className="h-4 w-4 text-primary" /> Email Content (Roles, Salaries &amp; Openings)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label className="mb-2 block">Apply Now Link (used for all "Apply Now" buttons in the email)</Label>
                      <Input
                        value={applyUrl}
                        onChange={(e) => setApplyUrl(e.target.value)}
                        placeholder="https://gradiaa.com/jobs-results"
                      />
                    </div>

                    <div>
                      <Label className="mb-2 block">Suggested Job Roles &amp; Salaries (editable)</Label>
                      <div className="space-y-2">
                        {jobRoles.map((r, i) => (
                          <div key={i} className="grid grid-cols-12 gap-2 items-center">
                            <span className="text-xs font-semibold col-span-1 text-center">{String.fromCharCode(65 + i)}.</span>
                            <Input
                              className="col-span-7"
                              value={r}
                              onChange={(e) => setJobRoles((prev) => prev.map((x, idx) => idx === i ? e.target.value : x))}
                              placeholder={`Job role ${i + 1}`}
                            />
                            <Input
                              className="col-span-4"
                              value={jobSalaries[i] || ""}
                              onChange={(e) => setJobSalaries((prev) => prev.map((x, idx) => idx === i ? e.target.value : x))}
                              placeholder="Salary (e.g. ₹40k–₹60k)"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-2 block">CV-Based Suitable Openings (editable)</Label>
                      <div className="space-y-2">
                        {cvOpenings.map((o, i) => (
                          <div key={i} className="grid grid-cols-12 gap-2 items-center">
                            <Input
                              className="col-span-8"
                              value={o.title}
                              onChange={(e) => setCvOpenings((prev) => prev.map((x, idx) => idx === i ? { ...x, title: e.target.value } : x))}
                              placeholder={`Opening ${i + 1}`}
                            />
                            <Input
                              className="col-span-4"
                              value={o.salary}
                              onChange={(e) => setCvOpenings((prev) => prev.map((x, idx) => idx === i ? { ...x, salary: e.target.value } : x))}
                              placeholder="Salary"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button onClick={() => setActiveTab("preview")}>
                        Continue to Preview <Eye className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 2: PREVIEW */}
              <TabsContent value="preview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="lg:col-span-1 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2"><FileEdit className="h-4 w-4" />Email Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>Subject</Label>
                        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                      </div>
                      <div>
                        <Label>From / Admin Name</Label>
                        <Input value={adminName} onChange={(e) => setAdminName(e.target.value)} />
                      </div>
                      <div>
                        <Label>Company</Label>
                        <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                      </div>
                      <div>
                        <Label>Contact Info</Label>
                        <Input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />
                      </div>

                      <div className="pt-2 border-t space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Sections</p>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">Subscription Plans</Label>
                          <Switch checked={showSubscription} onCheckedChange={setShowSubscription} />
                        </div>
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-normal">Terms &amp; Conditions</Label>
                          <Switch checked={showTerms} onCheckedChange={setShowTerms} />
                        </div>
                      </div>

                      <div className="pt-2 border-t flex flex-col gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditedHtml(null)}>
                          Reset to Auto-Generated
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleClearDraft}>
                          Clear Draft
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="lg:col-span-2 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" />Live Preview</CardTitle>
                      <Badge variant={editedHtml ? "default" : "secondary"} className="text-[10px]">
                        {editedHtml ? "Custom edited" : "Auto-generated"}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg bg-white max-h-[480px] overflow-auto">
                        <div dangerouslySetInnerHTML={{ __html: finalHtml }} />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><FileEdit className="h-4 w-4" />HTML Editor (Advanced)</CardTitle>
                    <p className="text-xs text-muted-foreground">Edit raw HTML for full control. Changes override the auto-generated preview.</p>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={finalHtml}
                      onChange={(e) => setEditedHtml(e.target.value)}
                      className="font-mono text-xs min-h-[280px]"
                    />
                    <div className="flex justify-end mt-3">
                      <Button onClick={() => setActiveTab("send")}>
                        Continue to Send <Send className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TAB 3: SEND */}
              <TabsContent value="send" className="space-y-6">
                <Card className="shadow-sm max-w-2xl mx-auto">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><Send className="h-4 w-4 text-primary" />Review &amp; Send</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Recipients</span>
                        <span className="font-medium">
                          {pendingRecipientCount} pending
                          {sentBulkCount > 0 && ` · ${sentBulkCount} already sent`}
                        </span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Subject</span>
                        <span className="font-medium truncate max-w-[60%]">{subject}</span>
                      </div>
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Sender</span>
                        <span className="font-medium">{adminName} · {companyName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sections enabled</span>
                        <span className="font-medium text-xs">
                          {[showSubscription && "Subscription", showTerms && "Terms"].filter(Boolean).join(", ") || "Core only"}
                        </span>
                      </div>
                    </div>

                    {bulkRows.length > 0 && (
                      <div className="space-y-3">
                        <div className="border rounded-md max-h-60 overflow-auto divide-y">
                          {bulkRows.map((r) => {
                            const isSelected = selectedPreviewId === r.id;
                            return (
                              <div
                                key={r.id}
                                className={`text-xs px-3 py-2 flex items-center justify-between gap-2 ${isSelected ? "bg-primary/10" : "hover:bg-muted/50"}`}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium truncate">{r.name || r.fileName}</p>
                                  <p className="text-muted-foreground truncate">{r.email || "no email"}</p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Badge
                                    variant={
                                      r.status === "sent" ? "default"
                                        : r.status === "failed" ? "destructive"
                                        : r.status === "ready" ? "secondary"
                                        : "outline"
                                    }
                                    className="text-[10px]"
                                  >
                                    {r.status}
                                  </Badge>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={isSelected ? "default" : "outline"}
                                    className="h-7 text-[11px]"
                                    onClick={() => setSelectedPreviewId(isSelected ? null : r.id)}
                                  >
                                    <Eye className="h-3 w-3 mr-1" />
                                    {isSelected ? "Hide" : "Preview"}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {(() => {
                          const r = bulkRows.find((x) => x.id === selectedPreviewId);
                          if (!r) {
                            return (
                              <div className="border rounded-md p-4 text-center text-xs text-muted-foreground bg-muted/30">
                                Select a resume above and click <strong>Preview</strong> to see its personalized email.
                              </div>
                            );
                          }
                          const personalizedHtml = buildEmailHtml({
                            candidateName: r.name || r.fileName?.replace(/\.[^.]+$/, "") || "Candidate",
                            jobRoles,
                            jobSalaries,
                            cvOpenings,
                            applyUrl,
                            adminName,
                            companyName,
                            contactInfo,
                            showSubscription,
                            showTerms,
                          });
                          return (
                            <div className="border rounded-md bg-muted/20 p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold truncate">{r.name || r.fileName}</p>
                                  <p className="text-[11px] text-muted-foreground truncate">{r.email || "no email"}</p>
                                </div>
                                <Badge variant="outline" className="text-[10px] shrink-0">Email Preview</Badge>
                              </div>
                              <div className="flex flex-col gap-1 text-[11px]">
                                <div><span className="text-muted-foreground">To: </span><span className="font-medium">{r.email || "—"}</span></div>
                                <div><span className="text-muted-foreground">Subject: </span><span className="font-medium">{subject}</span></div>
                                <div><span className="text-muted-foreground">From: </span><span className="font-medium">{companyName} &lt;noreply@gradia.co.in&gt;</span></div>
                                {r.error && (
                                  <div className="text-destructive">Error: {r.error}</div>
                                )}
                              </div>
                              {!r.email && (
                                <div className="text-[11px] text-amber-600">⚠ No email detected — preview shown but cannot send to this resume until an email is added.</div>
                              )}
                              <div className="border rounded bg-background max-h-96 overflow-auto">
                                <iframe
                                  title={`preview-${r.id}`}
                                  srcDoc={personalizedHtml}
                                  className="w-full h-96 border-0"
                                  sandbox=""
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}

                    {bulkRows.length === 0 && (
                      <div className="bg-muted/50 border rounded-md p-4 text-center text-xs text-muted-foreground">
                        {singleRecipientReady ? (
                          <>Ready to send to <strong>{candidateName || "Candidate"}</strong> ({candidateEmail}).</>
                        ) : (
                          <>No recipients yet. Go to <strong>Resume Info</strong> tab and upload a resume or use <strong>Bulk Mail Send</strong>.</>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button variant="outline" className="flex-1" onClick={handleSaveDraft}>
                        <Save className="h-4 w-4 mr-2" />Save as Draft
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleSendCurrent}
                        disabled={bulkSending || bulkParsing || sending || pendingRecipientCount === 0}
                      >
                        {bulkSending || sending ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending…</>
                        ) : (
                          <><Send className="h-4 w-4 mr-2" />Send to {pendingRecipientCount} recipient(s)</>
                        )}
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground text-center">
                      Each email is personalized with the candidate's name and sent from <strong>noreply@gradia.co.in</strong>.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Invite Status Dashboard */}
              <TabsContent value="status" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5 text-primary" />
                          Invite Status
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Track every invitation: pending, sent, accepted (signed up), or failed.
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={loadInvites} disabled={invitesLoading}>
                        {invitesLoading ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Refreshing</>
                        ) : (
                          <><RefreshCw className="h-4 w-4 mr-2" />Refresh</>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Summary Stats */}
                    {(() => {
                      const total = invites.length;
                      const pending = invites.filter((i) => i.status === "pending").length;
                      const sent = invites.filter((i) => i.status === "sent").length;
                      const accepted = invites.filter((i) => i.status === "accepted").length;
                      const failed = invites.filter((i) => i.status === "failed").length;
                      const cards: Array<{ key: typeof inviteStatusFilter; label: string; value: number; icon: any; color: string }> = [
                        { key: "all", label: "Total", value: total, icon: Mail, color: "text-foreground" },
                        { key: "pending", label: "Pending", value: pending, icon: Clock, color: "text-amber-600" },
                        { key: "sent", label: "Sent", value: sent, icon: CheckCircle2, color: "text-blue-600" },
                        { key: "accepted", label: "Accepted", value: accepted, icon: UserPlus, color: "text-emerald-600" },
                        { key: "failed", label: "Failed", value: failed, icon: XCircle, color: "text-destructive" },
                      ];
                      return (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                          {cards.map((c) => {
                            const Icon = c.icon;
                            const active = inviteStatusFilter === c.key;
                            return (
                              <button
                                key={c.key}
                                type="button"
                                onClick={() => setInviteStatusFilter(c.key)}
                                className={`text-left p-3 rounded-lg border transition-all ${
                                  active ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                    {c.label}
                                  </span>
                                  <Icon className={`h-4 w-4 ${c.color}`} />
                                </div>
                                <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Search */}
                    <div className="relative">
                      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search by name or email…"
                        value={inviteSearch}
                        onChange={(e) => setInviteSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>

                    {/* List */}
                    {invitesLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (() => {
                      const q = inviteSearch.trim().toLowerCase();
                      const filtered = invites.filter((i) => {
                        if (inviteStatusFilter !== "all" && i.status !== inviteStatusFilter) return false;
                        if (!q) return true;
                        return (
                          i.recipient_email.toLowerCase().includes(q) ||
                          (i.candidate_name || "").toLowerCase().includes(q)
                        );
                      });
                      if (!filtered.length) {
                        return (
                          <div className="text-center py-10 text-sm text-muted-foreground border rounded-lg">
                            No invites found for the current filter.
                          </div>
                        );
                      }
                      const statusBadge = (s: InviteRecord["status"]) => {
                        switch (s) {
                          case "accepted":
                            return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Accepted</Badge>;
                          case "sent":
                            return <Badge className="bg-blue-600 hover:bg-blue-600 text-white">Sent</Badge>;
                          case "pending":
                            return <Badge className="bg-amber-500 hover:bg-amber-500 text-white">Pending</Badge>;
                          case "failed":
                            return <Badge variant="destructive">Failed</Badge>;
                        }
                      };
                      const fmt = (d: string | null) => d ? new Date(d).toLocaleString() : "—";
                      return (
                        <div className="border rounded-lg overflow-hidden">
                          <div className="max-h-[480px] overflow-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50 sticky top-0">
                                <tr className="text-left">
                                  <th className="px-3 py-2 font-medium">Candidate</th>
                                  <th className="px-3 py-2 font-medium">Email</th>
                                  <th className="px-3 py-2 font-medium">Status</th>
                                  <th className="px-3 py-2 font-medium">Sent</th>
                                  <th className="px-3 py-2 font-medium">Accepted</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filtered.map((i) => (
                                  <tr key={i.id} className="border-t hover:bg-muted/30">
                                    <td className="px-3 py-2">
                                      <div className="font-medium">{i.candidate_name || "—"}</div>
                                      {i.error_message && (
                                        <div className="text-[11px] text-destructive truncate max-w-[200px]" title={i.error_message}>
                                          {i.error_message}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-muted-foreground">{i.recipient_email}</td>
                                    <td className="px-3 py-2">{statusBadge(i.status)}</td>
                                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmt(i.sent_at || i.created_at)}</td>
                                    <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{fmt(i.accepted_at)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="px-3 py-2 border-t bg-muted/30 text-[11px] text-muted-foreground">
                            Showing {filtered.length} of {invites.length} invite(s)
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default InviteFromResume;
