import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Users, MapPin, Briefcase, Mail, Phone, GraduationCap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

  useEffect(() => {
    fetchCandidates();
  }, [industryFilter]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("id, full_name, email, mobile, profile_picture, experience_level, preferred_role, location, current_state, current_district, segment, category, highest_qualification, status, created_at")
        .eq("role", "candidate")
        .order("created_at", { ascending: false });

      if (industryFilter !== "all") {
        query = query.eq("segment", industryFilter);
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

  const filtered = candidates.filter((c) => {
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
  });

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getSegmentLabel = (seg: string | null) => {
    if (!seg) return null;
    const found = industryOptions.find((o) => o.value === seg);
    return found ? found.label : seg;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">All Candidates</h2>
          <Badge variant="secondary" className="text-xs">{filtered.length}</Badge>
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
            <Card key={candidate.id} className="border-border hover:shadow-md transition-shadow">
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
                      {candidate.highest_qualification && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <GraduationCap className="h-3 w-3 shrink-0" />
                          <span className="truncate">{candidate.highest_qualification}</span>
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
    </div>
  );
}
