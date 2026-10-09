import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Mail,
  Phone,
  MapPin,
  Briefcase,
  GraduationCap,
  User,
  FileText,
  Eye,
  Download,
  Calendar,
  Languages,
  Home,
} from "lucide-react";

import { Bot, Loader2, ChevronDown, Ban, RefreshCw, CalendarClock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import MockInterviewHistory from "@/components/shared/MockInterviewHistory";
import PaymentRequestPanel from "./PaymentRequestPanel";
import MeetingInvitePanel from "./MeetingInvitePanel";

interface Props {
  open: boolean;
  onClose: () => void;
  candidateId: string | null;
  resumeUrl?: string | null;
  jobTitle?: string | null;
  jobId?: string | null;
  /** Show the payment request (amount + send payment mail) panel. */
  paymentMode?: boolean;
}

export const FullCandidateProfileDialog = ({ open, onClose, candidateId, resumeUrl, jobTitle, jobId, paymentMode }: Props) => {
  const [sendingScreening, setSendingScreening] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const screeningAction = async (action: "send" | "cancel" | "resend" | "reschedule") => {
    if (!candidateId) return;
    if (action === "cancel" && !window.confirm("Cancel this candidate's AI screening round? The candidate will be emailed about the cancellation.")) return;
    setSendingScreening(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-ai-screening", {
        body: { action, candidateId, jobTitle: jobTitle || null, appUrl: window.location.origin },
      });
      if (error || data?.error) throw new Error(typeof data?.error === "string" ? data.error : error?.message);
      const messages: Record<string, string> = {
        send: "AI screening round sent to candidate",
        cancel: "Screening round cancelled and candidate notified",
        resend: "Screening invitation re-sent to candidate",
        reschedule: "Screening rescheduled — new link sent to candidate",
      };
      toast.success(data.emailSent ? messages[action] : "Done, but the email could not be sent");
      setHistoryKey((k) => k + 1);
    } catch (e: any) {
      toast.error(e.message || "Could not process the screening request");
    } finally {
      setSendingScreening(false);
    }
  };
  const sendScreening = () => screeningAction("send");

  const [loading, setLoading] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [education, setEducation] = useState<any[]>([]);
  const [experience, setExperience] = useState<any[]>([]);
  const [address, setAddress] = useState<any>(null);

  useEffect(() => {
    if (!open || !candidateId) return;
    const load = async () => {
      setLoading(true);
      const [{ data: p }, { data: edu }, { data: exp }, { data: addr }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", candidateId).maybeSingle(),
        supabase
          .from("educational_qualifications")
          .select("*")
          .eq("user_id", candidateId)
          .order("display_order", { ascending: true }),
        supabase
          .from("work_experience")
          .select("*")
          .eq("user_id", candidateId)
          .order("display_order", { ascending: true }),
        supabase.from("address_details").select("*").eq("user_id", candidateId).maybeSingle(),
      ]);

      // Render the database profile immediately; enrich with AI in the background
      setProfile(p);
      setEducation(edu || []);
      setExperience(exp || []);
      setAddress(addr);
      setLoading(false);

      // If the profile is sparse, extract details from the resume with AI (non-blocking)
      const sparse =
        resumeUrl &&
        ((edu || []).length === 0 || (exp || []).length === 0 || !p?.mobile || !p?.location);
      if (sparse) {
        setAiParsing(true);
        try {
          const { data: aiData, error: aiError } = await supabase.functions.invoke(
            "ai-parse-resume-profile",
            { body: { resumeUrl } }
          );
          const ai = aiData?.profile;
          if (!aiError && ai) {
            const fill = (current: any, aiValue: any) =>
              current === null || current === undefined || current === "" ? aiValue : current;
            setProfile((prev: any) =>
              prev
                ? {
                    ...prev,
                    full_name: fill(prev.full_name, ai.full_name),
                    email: fill(prev.email, ai.email),
                    mobile: fill(prev.mobile, ai.phone),
                    location: fill(prev.location, ai.location),
                    preferred_role: fill(prev.preferred_role, ai.preferred_role),
                    experience_level: fill(prev.experience_level, ai.experience_level),
                    languages:
                      Array.isArray(prev.languages) && prev.languages.length > 0
                        ? prev.languages
                        : ai.languages,
                    highest_qualification: fill(prev.highest_qualification, ai.highest_qualification),
                    current_salary: fill(prev.current_salary, ai.current_salary),
                    expected_salary: fill(prev.expected_salary, ai.expected_salary),
                    skills:
                      Array.isArray(prev.skills) && prev.skills.length > 0 ? prev.skills : ai.skills,
                  }
                : prev
            );
            if ((edu || []).length === 0 && Array.isArray(ai.education)) {
              setEducation(ai.education.map((e: any, i: number) => ({ id: `ai-edu-${i}`, ...e })));
            }
            if ((exp || []).length === 0 && Array.isArray(ai.experience)) {
              setExperience(ai.experience.map((w: any, i: number) => ({ id: `ai-exp-${i}`, ...w })));
            }
          }
        } catch (e) {
          console.error("AI resume parse failed:", e);
        } finally {
          setAiParsing(false);
        }
      }
    };
    load();
  }, [open, candidateId, resumeUrl]);

  const Section = ({ icon: Icon, title, children }: any) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-1">
        <Icon className="h-4 w-4 text-primary" /> {title}
      </div>
      <div className="pl-1">{children}</div>
    </div>
  );

  const Field = ({ label, value }: { label: string; value: any }) => {
    if (value === null || value === undefined || value === "") return null;
    return (
      <div className="grid grid-cols-3 gap-2 text-sm py-0.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="col-span-2 text-foreground">{String(value)}</span>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {profile?.full_name || "Candidate Profile"}
          </DialogTitle>
          <DialogDescription>
            Complete profile, education, experience and contact details.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : !profile ? (
          <p className="text-center text-muted-foreground py-8">Profile not found.</p>
        ) : (
          <div className="space-y-5 py-2">
            {aiParsing && (
              <p className="text-xs text-primary flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                AI is reading the resume to fill in missing details...
              </p>
            )}
            {/* Header card */}
            <div className="flex items-start justify-between flex-wrap gap-3 p-3 rounded-lg bg-muted/40 border border-border">
              <div className="flex items-center gap-3">
                {profile.profile_picture ? (
                  <img
                    src={profile.profile_picture}
                    alt={profile.full_name}
                    className="h-14 w-14 rounded-full object-cover border"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-foreground">{profile.full_name}</h3>
                  {profile.preferred_role && (
                    <p className="text-sm text-muted-foreground">{profile.preferred_role}</p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.experience_level && (
                      <Badge variant="secondary" className="text-xs">
                        {profile.experience_level}
                      </Badge>
                    )}
                    {profile.gender && (
                      <Badge variant="outline" className="text-xs">
                        {profile.gender}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {resumeUrl && (
                  <>
                    <Button size="sm" asChild>
                      <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-3.5 w-3.5 mr-1" /> View CV
                      </a>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={resumeUrl} download>
                        <Download className="h-3.5 w-3.5 mr-1" /> Download
                      </a>
                    </Button>
                  </>
                )}
                <div className="flex">
                  <Button size="sm" variant="secondary" className="rounded-r-none" onClick={sendScreening} disabled={sendingScreening}>
                    {sendingScreening ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Bot className="h-3.5 w-3.5 mr-1" />
                    )}
                    Send AI Screening
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="secondary" className="rounded-l-none border-l border-border px-1.5" disabled={sendingScreening} aria-label="More screening options">
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => screeningAction("resend")}>
                        <RefreshCw className="h-3.5 w-3.5 mr-2" /> Resend invitation
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => screeningAction("reschedule")}>
                        <CalendarClock className="h-3.5 w-3.5 mr-2" /> Reschedule (new link)
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => screeningAction("cancel")}>
                        <Ban className="h-3.5 w-3.5 mr-2" /> Cancel round
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {paymentMode && candidateId && (
              <PaymentRequestPanel candidateId={candidateId} jobId={jobId} jobTitle={jobTitle} />
            )}

            {candidateId && <MeetingInvitePanel candidateId={candidateId} jobTitle={jobTitle} />}

            {/* AI Screening status & recordings */}
            {candidateId && (
              <MockInterviewHistory key={historyKey} candidateId={candidateId} viewerRole="employer" />
            )}

            {/* Contact */}
            <Section icon={Mail} title="Contact">
              <Field label="Email" value={profile.email} />
              <Field label="Mobile" value={profile.mobile} />
              <Field label="Alternate" value={profile.alternate_number} />
              <Field label="LinkedIn" value={profile.linkedin} />
              <Field label="Website" value={profile.website} />
            </Section>

            {/* Personal */}
            <Section icon={User} title="Personal">
              <Field label="Date of Birth" value={profile.date_of_birth} />
              <Field
                label="Languages"
                value={Array.isArray(profile.languages) ? profile.languages.join(", ") : profile.languages}
              />
              <Field label="Highest Qualification" value={profile.highest_qualification} />
              <Field label="Category" value={profile.category} />
            </Section>

            {/* Location */}
            <Section icon={MapPin} title="Location">
              <Field label="Current" value={profile.location} />
              <Field label="Current State" value={profile.current_state} />
              <Field label="Current District" value={profile.current_district} />
              <Field label="Preferred State" value={profile.preferred_state} />
              <Field label="Preferred District" value={profile.preferred_district} />
            </Section>

            {/* Job preferences */}
            <Section icon={Briefcase} title="Job Preferences">
              <Field label="Preferred Role" value={profile.preferred_role} />
              <Field label="Office Type" value={profile.office_type} />
              <Field label="Segment" value={profile.segment} />
              <Field label="Program" value={profile.program} />
              <Field label="Classes Handled" value={profile.classes_handled} />
              <Field label="Primary Subject" value={profile.primary_subject} />
              <Field label="Current Salary" value={profile.current_salary} />
              <Field label="Expected Salary" value={profile.expected_salary} />
              <Field label="Available From" value={profile.available_from} />
            </Section>

            {/* Skills */}
            {Array.isArray(profile.skills) && profile.skills.length > 0 && (
              <Section icon={FileText} title="Skills">
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((s: string, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {s}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}

            {/* Education */}
            <Section icon={GraduationCap} title={`Education (${education.length})`}>
              {education.length === 0 ? (
                <p className="text-sm text-muted-foreground">No education records.</p>
              ) : (
                <div className="space-y-2">
                  {education.map((e) => (
                    <div key={e.id} className="p-2 rounded border border-border bg-card">
                      <div className="font-medium text-sm">{e.education_level}</div>
                      <div className="text-xs text-muted-foreground">
                        {[e.school_college_name, e.specialization, e.board_university]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {e.year_of_passing && `Year: ${e.year_of_passing}`}
                        {e.percentage_marks ? ` • ${e.percentage_marks}%` : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Experience */}
            <Section icon={Briefcase} title={`Work Experience (${experience.length})`}>
              {experience.length === 0 ? (
                <p className="text-sm text-muted-foreground">No experience records.</p>
              ) : (
                <div className="space-y-2">
                  {experience.map((w) => (
                    <div key={w.id} className="p-2 rounded border border-border bg-card">
                      <div className="font-medium text-sm">
                        {w.designation || "—"} {w.organization && `@ ${w.organization}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[w.department, w.place].filter(Boolean).join(" • ")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {w.from_date || "?"} → {w.to_date || "Present"}
                        {w.salary_per_month ? ` • ₹${w.salary_per_month}/mo` : ""}
                      </div>
                      {w.reference_name && (
                        <div className="text-xs text-muted-foreground">
                          Ref: {w.reference_name} {w.reference_mobile && `(${w.reference_mobile})`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Address */}
            {address && (
              <Section icon={Home} title="Address Details">
                <div className="text-sm">
                  <div className="font-medium mb-1">Present Address</div>
                  <div className="text-muted-foreground">
                    {[
                      address.present_door_flat_no,
                      address.present_street,
                      address.present_village_area,
                      address.present_mandal,
                      address.present_district,
                      address.present_state,
                      address.present_pin_code,
                    ]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </div>
                  <div className="font-medium mt-2 mb-1">Permanent Address</div>
                  <div className="text-muted-foreground">
                    {address.same_as_present
                      ? "Same as present"
                      : [
                          address.permanent_door_flat_no,
                          address.permanent_street,
                          address.permanent_village_area,
                          address.permanent_mandal,
                          address.permanent_district,
                          address.permanent_state,
                          address.permanent_pin_code,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                  </div>
                </div>
              </Section>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FullCandidateProfileDialog;
