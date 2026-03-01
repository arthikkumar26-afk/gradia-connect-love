import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Users, MapPin, Briefcase, Mail, Phone, GraduationCap, X, Download, PhoneCall, FileText, Calendar, IndianRupee, Globe, Home, UserCheck, BookOpen, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";


interface CandidateProfile {
  id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  profile_picture: string | null;
  experience_level: string | null;
  preferred_role: string | null;
  location: string | null;
  current_state: string | null;
  current_district: string | null;
  segment: string | null;
  category: string | null;
  highest_qualification: string | null;
  status: string;
  created_at: string | null;
  resume_url: string | null;
  gender: string | null;
  date_of_birth: string | null;
  languages: string[] | null;
  primary_subject: string | null;
  current_salary: number | null;
  expected_salary: number | null;
  linkedin: string | null;
  alternate_number: string | null;
  preferred_state: string | null;
  preferred_district: string | null;
}

const industryOptions = [
  { value: "all", label: "All Industries" },
  { value: "education", label: "Education" },
  { value: "it_corporate", label: "IT Corporate" },
  { value: "non_it_corporate", label: "Non-IT Corporate" },
  { value: "legal", label: "Legal" },
  { value: "doctor", label: "Doctor" },
  { value: "civil", label: "Civil" },
];

export function AllCandidatesContent() {
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);

  useEffect(() => {
    fetchCandidates();
  }, [industryFilter]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("id, full_name, email, mobile, profile_picture, experience_level, preferred_role, location, current_state, current_district, segment, category, highest_qualification, status, created_at, resume_url, gender, date_of_birth, languages, primary_subject, current_salary, expected_salary, linkedin, alternate_number, preferred_state, preferred_district")
        .eq("role", "candidate")
        .order("created_at", { ascending: false });

      if (industryFilter !== "all") {
        // Map filter values to actual DB segment values (case-insensitive match)
        const segmentMap: Record<string, string> = {
          education: "Education",
          it_corporate: "IT Corporate",
          non_it_corporate: "Non-IT Corporate",
          legal: "Legal",
          doctor: "Doctor",
          civil: "Civil",
        };
        const dbSegment = segmentMap[industryFilter];
        if (dbSegment) {
          query = query.ilike("segment", dbSegment);
        }
      }

      const { data, error } = await query.limit(200);

      if (error) {
        console.error("Error fetching candidates:", error);
        return;
      }

      setCandidates(data || []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = candidates
    .filter((c) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.full_name?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.preferred_role?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.segment?.toLowerCase().includes(q)
      );
    })
    .filter((c, index, self) =>
      index === self.findIndex((other) =>
        other.email.toLowerCase() === c.email.toLowerCase() ||
        (c.mobile && other.mobile && other.mobile === c.mobile)
      )
    );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getSegmentLabel = (seg: string | null) => {
    if (!seg) return null;
    const found = industryOptions.find((o) => o.value === seg.toLowerCase().replace(/ /g, "_"));
    return found ? found.label : seg;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">All Candidates</h2>
          
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, role, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by Industry" />
          </SelectTrigger>
          <SelectContent>
            {industryOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Candidates List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <div className="h-16 w-16 rounded-full border-4 border-dashed border-border flex items-center justify-center">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">No candidates found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((candidate) => (
            <Card
              key={candidate.id}
              className="border-border hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedCandidate(candidate)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={candidate.profile_picture || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {getInitials(candidate.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-foreground truncate">
                        {candidate.full_name}
                      </h3>
                      <Badge
                        variant={candidate.status === "active" ? "default" : "secondary"}
                        className="text-[10px] shrink-0"
                      >
                        {candidate.status}
                      </Badge>
                    </div>

                    <div className="mt-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{candidate.email}</span>
                      </div>
                      {candidate.mobile && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{candidate.mobile}</span>
                        </div>
                      )}
                      {(candidate.current_state || candidate.location) && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {candidate.current_district && candidate.current_state
                              ? `${candidate.current_district}, ${candidate.current_state}`
                              : candidate.location || candidate.current_state}
                          </span>
                        </div>
                      )}
                      {candidate.preferred_role && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Briefcase className="h-3 w-3 shrink-0" />
                          <span className="truncate">{candidate.preferred_role}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {candidate.segment && (
                        <Badge variant="outline" className="text-[10px]">
                          {getSegmentLabel(candidate.segment)}
                        </Badge>
                      )}
                      {candidate.category && (
                        <Badge variant="outline" className="text-[10px]">
                          {candidate.category}
                        </Badge>
                      )}
                      {candidate.experience_level && (
                        <Badge variant="outline" className="text-[10px]">
                          {candidate.experience_level}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Candidate Detail Modal */}
      <CandidateDetailDialog
        candidate={selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        getSegmentLabel={getSegmentLabel}
      />
    </div>
  );
}

function CandidateDetailDialog({
  candidate,
  onClose,
  getSegmentLabel,
}: {
  candidate: CandidateProfile | null;
  onClose: () => void;
  getSegmentLabel: (seg: string | null) => string | null;
}) {
  const [education, setEducation] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any>(null);
  const [family, setFamily] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sendingProposal, setSendingProposal] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (candidate) {
      setLoading(true);
      Promise.all([
        supabase.from("educational_qualifications").select("*").eq("user_id", candidate.id).order("display_order", { ascending: true }),
        supabase.from("address_details").select("*").eq("user_id", candidate.id).maybeSingle(),
        supabase.from("family_details").select("*").eq("user_id", candidate.id).order("display_order", { ascending: true }),
      ]).then(([eduRes, addrRes, famRes]) => {
        setEducation(eduRes.data || []);
        setAddresses(addrRes.data || null);
        setFamily(famRes.data || []);
        setLoading(false);
      });
    }
  }, [candidate]);

  if (!candidate) return null;

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Dialog open={!!candidate} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Candidate Profile</DialogTitle>
        </DialogHeader>

        {/* Profile header */}
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={candidate.profile_picture || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-base">
              {getInitials(candidate.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-foreground">{candidate.full_name}</h3>
            {candidate.preferred_role && (
              <p className="text-sm text-muted-foreground">{candidate.preferred_role}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-1">
              {candidate.segment && (
                <Badge variant="outline" className="text-[10px]">{getSegmentLabel(candidate.segment)}</Badge>
              )}
              {candidate.experience_level && (
                <Badge variant="secondary" className="text-[10px]">{candidate.experience_level}</Badge>
              )}
              <Badge variant={candidate.status === "active" ? "default" : "secondary"} className="text-[10px]">
                {candidate.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-1">
          {candidate.mobile && (
            <Button size="sm" variant="outline" asChild>
              <a href={`tel:${candidate.mobile}`}>
                <PhoneCall className="h-4 w-4 mr-1.5" /> Call
              </a>
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <a href={`mailto:${candidate.email}`}>
              <Mail className="h-4 w-4 mr-1.5" /> Mail
            </a>
          </Button>
          {candidate.resume_url && (
            <Button size="sm" variant="outline" asChild>
              <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-1.5" /> Resume
              </a>
            </Button>
          )}
          {candidate.linkedin && (
            <Button size="sm" variant="outline" asChild>
              <a href={candidate.linkedin} target="_blank" rel="noopener noreferrer">
                <Globe className="h-4 w-4 mr-1.5" /> LinkedIn
              </a>
            </Button>
          )}
          <Button
            size="sm"
            variant="default"
            disabled={sendingProposal}
            onClick={async () => {
              setSendingProposal(true);
              try {
                // Get employer info
                const { data: employerProfile } = await supabase
                  .from("profiles")
                  .select("full_name, company_name, email")
                  .eq("id", user?.id || "")
                  .maybeSingle();

                const employerName = employerProfile?.company_name || employerProfile?.full_name || "An employer";

                const { error } = await supabase.functions.invoke("send-notification-email", {
                  body: {
                    to: candidate.email,
                    subject: `Job Proposal from ${employerName}`,
                    heading: "You've Received a Job Proposal! 🎉",
                    body: `Dear ${candidate.full_name},\n\nGreat news! ${employerName} has reviewed your profile and would like to send you a job proposal.\n\nThey are interested in your skills and experience and would like to discuss a potential opportunity with you.\n\nPlease log in to your Gradia account to view more details and respond.\n\nBest regards,\nGradia Team`,
                  },
                });

                if (error) throw error;
                toast.success(`Proposal notification sent to ${candidate.full_name}`);
              } catch (err) {
                console.error("Error sending proposal:", err);
                toast.error("Failed to send proposal notification");
              } finally {
                setSendingProposal(false);
              }
            }}
          >
            <Send className="h-4 w-4 mr-1.5" /> {sendingProposal ? "Sending..." : "Proposal"}
          </Button>
        </div>

        <Separator />

        {/* All Details */}
        <div className="space-y-4">
          {/* Personal Details */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Personal Details</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <DetailItem label="Email" value={candidate.email} />
              <DetailItem label="Phone" value={candidate.mobile} />
              <DetailItem label="Alternate Phone" value={candidate.alternate_number} />
              <DetailItem label="Gender" value={candidate.gender} />
              <DetailItem label="Date of Birth" value={candidate.date_of_birth ? new Date(candidate.date_of_birth).toLocaleDateString("en-IN") : null} />
              <DetailItem label="Qualification" value={candidate.highest_qualification} />
              <DetailItem label="Primary Subject" value={candidate.primary_subject} />
              <DetailItem label="Category / Segment" value={[candidate.category, candidate.segment].filter(Boolean).join(" • ") || null} />
              <DetailItem
                label="Current Location"
                value={
                  candidate.current_district && candidate.current_state
                    ? `${candidate.current_district}, ${candidate.current_state}`
                    : candidate.location || candidate.current_state
                }
              />
              <DetailItem
                label="Preferred Location"
                value={
                  candidate.preferred_district && candidate.preferred_state
                    ? `${candidate.preferred_district}, ${candidate.preferred_state}`
                    : candidate.preferred_state
                }
              />
              <DetailItem
                label="Current Salary"
                value={candidate.current_salary ? `₹${candidate.current_salary.toLocaleString()}` : null}
              />
              <DetailItem
                label="Expected Salary"
                value={candidate.expected_salary ? `₹${candidate.expected_salary.toLocaleString()}` : null}
              />
              <DetailItem label="Experience" value={candidate.experience_level} />
              <DetailItem label="Languages" value={candidate.languages?.join(", ")} />
              <DetailItem
                label="Registered"
                value={candidate.created_at ? new Date(candidate.created_at).toLocaleDateString("en-IN") : null}
              />
            </div>
          </div>

          {/* Education */}
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : education.length > 0 && (
            <div>
              <Separator className="mb-3" />
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
                <GraduationCap className="h-4 w-4 text-primary" /> Education
              </h4>
              <div className="space-y-2">
                {education.map((edu) => (
                  <Card key={edu.id} className="border-border">
                    <CardContent className="p-3">
                      <p className="text-sm font-semibold text-foreground">{edu.education_level}</p>
                      {edu.specialization && <p className="text-xs text-muted-foreground">{edu.specialization}</p>}
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1.5 text-xs">
                        {edu.school_college_name && <div><span className="text-muted-foreground">Institution:</span> <span className="text-foreground">{edu.school_college_name}</span></div>}
                        {edu.board_university && <div><span className="text-muted-foreground">Board/Uni:</span> <span className="text-foreground">{edu.board_university}</span></div>}
                        {edu.year_of_passing && <div><span className="text-muted-foreground">Year:</span> <span className="text-foreground">{edu.year_of_passing}</span></div>}
                        {edu.percentage_marks != null && <div><span className="text-muted-foreground">Marks:</span> <span className="text-foreground">{edu.percentage_marks}%</span></div>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Address */}
          {loading ? (
            <Skeleton className="h-16 w-full" />
          ) : addresses && (
            <div>
              <Separator className="mb-3" />
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
                <Home className="h-4 w-4 text-primary" /> Present Address
              </h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pl-5">
                <DetailItem label="Door/Flat No" value={addresses.present_door_flat_no} />
                <DetailItem label="Street" value={addresses.present_street} />
                <DetailItem label="Village/Area" value={addresses.present_village_area} />
                <DetailItem label="Mandal" value={addresses.present_mandal} />
                <DetailItem label="District" value={addresses.present_district} />
                <DetailItem label="State" value={addresses.present_state} />
                <DetailItem label="Pin Code" value={addresses.present_pin_code} />
              </div>
              {!addresses.same_as_present && (
                <div className="mt-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
                    <Home className="h-4 w-4 text-primary" /> Permanent Address
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pl-5">
                    <DetailItem label="Door/Flat No" value={addresses.permanent_door_flat_no} />
                    <DetailItem label="Street" value={addresses.permanent_street} />
                    <DetailItem label="Village/Area" value={addresses.permanent_village_area} />
                    <DetailItem label="Mandal" value={addresses.permanent_mandal} />
                    <DetailItem label="District" value={addresses.permanent_district} />
                    <DetailItem label="State" value={addresses.permanent_state} />
                    <DetailItem label="Pin Code" value={addresses.permanent_pin_code} />
                  </div>
                </div>
              )}
              {addresses.same_as_present && (
                <p className="text-xs text-muted-foreground italic pl-5 mt-1">Permanent address same as present</p>
              )}
            </div>
          )}

          {/* Family */}
          {loading ? (
            <Skeleton className="h-12 w-full" />
          ) : family.length > 0 && (
            <div>
              <Separator className="mb-3" />
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
                <UserCheck className="h-4 w-4 text-primary" /> Family Details
              </h4>
              <div className="space-y-2">
                {family.map((member) => (
                  <Card key={member.id} className="border-border">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-foreground">{member.name_as_per_aadhar || "—"}</p>
                            <Badge variant="outline" className="text-[10px]">{member.blood_relation}</Badge>
                            {member.is_dependent && <Badge variant="secondary" className="text-[10px]">Dependent</Badge>}
                          </div>
                          <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                            {member.age && <span>Age: {member.age}</span>}
                            {member.date_of_birth && <span>DOB: {new Date(member.date_of_birth).toLocaleDateString("en-IN")}</span>}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground break-words">{value}</p>
    </div>
  );
}
