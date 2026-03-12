import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Search, Loader2, User, Mail, Phone, MapPin, Calendar, Briefcase,
  GraduationCap, Star, Globe, Download, ExternalLink, ChevronLeft, ChevronRight,
  Filter, ChevronDown, X
} from "lucide-react";

interface CandidateProfile {
  id: string;
  full_name: string;
  email: string;
  mobile: string | null;
  location: string | null;
  profile_picture: string | null;
  experience_level: string | null;
  preferred_role: string | null;
  highest_qualification: string | null;
  category: string | null;
  segment: string | null;
  current_state: string | null;
  current_district: string | null;
  gender: string | null;
  date_of_birth: string | null;
  languages: string[] | null;
  linkedin: string | null;
  resume_url: string | null;
  primary_subject: string | null;
  current_salary: number | null;
  expected_salary: number | null;
  registration_number: string | null;
  created_at: string | null;
  status: string;
}

const PAGE_SIZE = 20;

export default function EduTechCandidatesSection() {
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [expFilter, setExpFilter] = useState("all");
  const [genderFilter, setGenderFilter] = useState("all");
  const [qualificationFilter, setQualificationFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [skillSearch, setSkillSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [qualifications, setQualifications] = useState<string[]>([]);

  useEffect(() => {
    fetchCandidates();
  }, [page, categoryFilter, expFilter, genderFilter, qualificationFilter, stateFilter]);

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .eq("role", "candidate")
        .order("created_at", { ascending: false });

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }
      if (expFilter !== "all") {
        query = query.eq("experience_level", expFilter);
      }
      if (genderFilter !== "all") {
        query = query.eq("gender", genderFilter);
      }
      if (qualificationFilter !== "all") {
        query = query.eq("highest_qualification", qualificationFilter);
      }
      if (stateFilter !== "all") {
        query = query.eq("current_state", stateFilter);
      }

      const from = page * PAGE_SIZE;
      query = query.range(from, from + PAGE_SIZE - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      setCandidates(data || []);
      setTotalCount(count || 0);

      // Fetch distinct filter values once
      if (categories.length === 0) {
        const [catRes, stateRes, qualRes] = await Promise.all([
          supabase.from("profiles").select("category").eq("role", "candidate").not("category", "is", null),
          supabase.from("profiles").select("current_state").eq("role", "candidate").not("current_state", "is", null),
          supabase.from("profiles").select("highest_qualification").eq("role", "candidate").not("highest_qualification", "is", null),
        ]);
        if (catRes.data) {
          setCategories([...new Set(catRes.data.map(c => c.category).filter(Boolean) as string[])].sort());
        }
        if (stateRes.data) {
          setStates([...new Set(stateRes.data.map(c => c.current_state).filter(Boolean) as string[])].sort());
        }
        if (qualRes.data) {
          setQualifications([...new Set(qualRes.data.map(c => c.highest_qualification).filter(Boolean) as string[])].sort());
        }
      }
    } catch (err) {
      console.error("Error fetching candidates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = candidates.filter(c => {
    const q = search.trim().toLowerCase();
    const sk = skillSearch.trim().toLowerCase();
    const matchesSearch = !q || 
      c.full_name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      (c.mobile && c.mobile.includes(q)) ||
      (c.preferred_role && c.preferred_role.toLowerCase().includes(q)) ||
      (c.location && c.location.toLowerCase().includes(q)) ||
      (c.primary_subject && c.primary_subject.toLowerCase().includes(q));
    const matchesSkill = !sk || 
      (c.primary_subject && c.primary_subject.toLowerCase().includes(sk)) ||
      (c.preferred_role && c.preferred_role.toLowerCase().includes(sk)) ||
      (c.segment && c.segment.toLowerCase().includes(sk));
    return matchesSearch && matchesSkill;
  });

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const activeFilterCount = [categoryFilter, expFilter, genderFilter, qualificationFilter, stateFilter]
    .filter(f => f !== "all").length + (skillSearch.trim() ? 1 : 0);

  const clearAllFilters = () => {
    setCategoryFilter("all");
    setExpFilter("all");
    setGenderFilter("all");
    setQualificationFilter("all");
    setStateFilter("all");
    setSkillSearch("");
    setSearch("");
    setPage(0);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-lg font-semibold text-foreground">Candidates</h3>
        <Badge variant="secondary">{totalCount} total</Badge>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search name, email, role, location..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Collapsible Filters Panel */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Card className="border-border/60">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0 h-5">{activeFilterCount}</Badge>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-4 px-5">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Category</label>
                  <Select value={categoryFilter} onValueChange={v => { setCategoryFilter(v); setPage(0); }}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Experience */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Experience</label>
                  <Select value={expFilter} onValueChange={v => { setExpFilter(v); setPage(0); }}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="fresher">Fresher</SelectItem>
                      <SelectItem value="1-3 years">1-3 Years</SelectItem>
                      <SelectItem value="3-5 years">3-5 Years</SelectItem>
                      <SelectItem value="5+ years">5+ Years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Gender */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Gender</label>
                  <Select value={genderFilter} onValueChange={v => { setGenderFilter(v); setPage(0); }}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Qualification */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Qualification</label>
                  <Select value={qualificationFilter} onValueChange={v => { setQualificationFilter(v); setPage(0); }}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {qualifications.map(q => (
                        <SelectItem key={q} value={q}>{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* State */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">State</label>
                  <Select value={stateFilter} onValueChange={v => { setStateFilter(v); setPage(0); }}>
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All States</SelectItem>
                      {states.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Skill Search */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Skill</label>
                  <Input
                    placeholder="e.g. React, Java..."
                    value={skillSearch}
                    onChange={e => setSkillSearch(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {activeFilterCount > 0 && (
                <div className="flex justify-end mt-3">
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs h-7">
                    <X className="h-3 w-3 mr-1" /> Clear All Filters
                  </Button>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Candidates Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading candidates...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No candidates found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(c => (
            <Card
              key={c.id}
              className="border-border/50 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => setSelectedCandidate(c)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={c.profile_picture || undefined} alt={c.full_name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
                      {c.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate text-sm">{c.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.preferred_role || c.category || "Candidate"}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{c.email}</span>
                  </div>
                  {c.mobile && (
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3 w-3 flex-shrink-0" />
                      <span>{c.mobile}</span>
                    </div>
                  )}
                  {(c.location || c.current_state) && (
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{c.location || `${c.current_district || ""} ${c.current_state || ""}`.trim()}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {c.experience_level && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{c.experience_level}</Badge>
                  )}
                  {c.category && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{c.category}</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      <CandidateProfileModal
        candidate={selectedCandidate}
        open={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
      />
    </div>
  );
}

function CandidateProfileModal({
  candidate,
  open,
  onClose,
}: {
  candidate: CandidateProfile | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!candidate) return null;

  const infoRows: { icon: React.ElementType; label: string; value: string | null | undefined }[] = [
    { icon: Mail, label: "Email", value: candidate.email },
    { icon: Phone, label: "Mobile", value: candidate.mobile },
    { icon: MapPin, label: "Location", value: candidate.location || `${candidate.current_district || ""} ${candidate.current_state || ""}`.trim() || null },
    { icon: Briefcase, label: "Preferred Role", value: candidate.preferred_role },
    { icon: GraduationCap, label: "Qualification", value: candidate.highest_qualification },
    { icon: Star, label: "Experience", value: candidate.experience_level },
    { icon: Briefcase, label: "Category", value: candidate.category },
    { icon: Briefcase, label: "Segment", value: candidate.segment },
    { icon: User, label: "Gender", value: candidate.gender },
    { icon: Calendar, label: "Date of Birth", value: candidate.date_of_birth ? new Date(candidate.date_of_birth).toLocaleDateString() : null },
    { icon: Globe, label: "Languages", value: candidate.languages?.join(", ") || null },
    { icon: Briefcase, label: "Primary Subject", value: candidate.primary_subject },
    { icon: Briefcase, label: "Current Salary", value: candidate.current_salary ? `₹${candidate.current_salary.toLocaleString("en-IN")}` : null },
    { icon: Briefcase, label: "Expected Salary", value: candidate.expected_salary ? `₹${candidate.expected_salary.toLocaleString("en-IN")}` : null },
    { icon: Calendar, label: "Registered", value: candidate.created_at ? new Date(candidate.created_at).toLocaleDateString() : null },
    { icon: User, label: "Reg. Number", value: candidate.registration_number },
  ];

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={candidate.profile_picture || undefined} alt={candidate.full_name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {candidate.full_name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-lg">{candidate.full_name}</p>
              <p className="text-sm font-normal text-muted-foreground">{candidate.preferred_role || candidate.category || "Candidate"}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Separator />

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          {candidate.mobile && (
            <Button size="sm" variant="outline" asChild>
              <a href={`tel:${candidate.mobile}`}><Phone className="h-3.5 w-3.5 mr-1.5" /> Call</a>
            </Button>
          )}
          <Button size="sm" variant="outline" asChild>
            <a href={`mailto:${candidate.email}`}><Mail className="h-3.5 w-3.5 mr-1.5" /> Email</a>
          </Button>
          {candidate.linkedin && (
            <Button size="sm" variant="outline" asChild>
              <a href={candidate.linkedin} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1.5" /> LinkedIn</a>
            </Button>
          )}
          {candidate.resume_url && (
            <Button size="sm" variant="outline" asChild>
              <a href={candidate.resume_url} target="_blank" rel="noopener noreferrer"><Download className="h-3.5 w-3.5 mr-1.5" /> Resume</a>
            </Button>
          )}
        </div>

        <Separator />

        {/* Profile details */}
        <div className="space-y-3">
          {infoRows.filter(r => r.value).map((row, i) => {
            const Icon = row.icon;
            return (
              <div key={i} className="flex items-start gap-3">
                <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                  <p className="text-sm text-foreground">{row.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
