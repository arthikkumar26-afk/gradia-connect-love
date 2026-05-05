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

interface Props {
  open: boolean;
  onClose: () => void;
  candidateId: string | null;
  resumeUrl?: string | null;
}

export const FullCandidateProfileDialog = ({ open, onClose, candidateId, resumeUrl }: Props) => {
  const [loading, setLoading] = useState(false);
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
      setProfile(p);
      setEducation(edu || []);
      setExperience(exp || []);
      setAddress(addr);
      setLoading(false);
    };
    load();
  }, [open, candidateId]);

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
              {resumeUrl && (
                <div className="flex flex-col gap-2">
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
                </div>
              )}
            </div>

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
