import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo, useEffect, useRef } from "react";
import { Search, ArrowRight, X, Loader2, Upload, Sparkles, MapPin, Briefcase } from "lucide-react";
import JobCard from "@/components/ui/JobCard";
import { sampleJobs, getFeaturedJobs, Job } from "@/data/sampleJobs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type FilterType = "all" | "software" | "education" | "remote" | "entry";

interface ResumeMatch {
  id: string;
  title: string;
  company: string;
  location?: string;
  type?: string;
  salary?: string;
  skills?: string[];
  score: number;
  reason: string;
}

const Hero = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [dbJobs, setDbJobs] = useState<Job[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resumeScanning, setResumeScanning] = useState(false);
  const [resumeFileName, setResumeFileName] = useState<string>("");
  const [resumeMatches, setResumeMatches] = useState<ResumeMatch[] | null>(null);
  const fallbackJobs = getFeaturedJobs();

  // Fetch featured jobs from database
  useEffect(() => {
    const fetchFeaturedJobs = async () => {
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('id, job_title, location, job_type, salary_range, experience_required, created_at, skills, description, employer_id')
          .eq('is_featured', true)
          .eq('moderation_status', 'approved')
          .order('created_at', { ascending: false })
          .limit(8);

        if (error) throw error;

        if (data && data.length > 0) {
          const employerIds = [...new Set(data.map(job => job.employer_id))];
          const { data: employers } = await supabase
            .from('profiles')
            .select('id, company_name, full_name')
            .in('id', employerIds);

          const employerMap = new Map(employers?.map(e => [e.id, e]) || []);

          const getPostedTime = (createdAt: string | null) => {
            if (!createdAt) return 'Recently';
            const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24));
            if (days === 0) return 'Today';
            if (days === 1) return '1 day ago';
            return `${days} days ago`;
          };

          const mappedJobs: Job[] = data.map(job => {
            const employer = employerMap.get(job.employer_id);
            const jobType = job.job_type?.toLowerCase() || '';
            const category: "software" | "education" = 
              (jobType.includes('teacher') || jobType.includes('education') || jobType.includes('principal'))
                ? "education" : "software";

            return {
              id: job.id,
              title: job.job_title,
              company: employer?.company_name || employer?.full_name || 'Company',
              location: job.location || 'Location not specified',
              type: (job.job_type as any) || 'full-time',
              category,
              salary: job.salary_range || undefined,
              experience: job.experience_required || 'Not specified',
              posted: getPostedTime(job.created_at),
              description: job.description || 'No description available',
              skills: job.skills || [],
              featured: true,
            };
          });

          setDbJobs(mappedJobs);
        }
      } catch (error) {
        console.error('Error fetching featured jobs:', error);
      } finally {
        setIsLoadingDb(false);
      }
    };

    fetchFeaturedJobs();
  }, []);

  // Use DB jobs if available, otherwise fallback
  const allFeaturedJobs = dbJobs.length > 0 ? dbJobs : fallbackJobs;

  const filteredJobs = useMemo(() => {
    // If search is active, search through all jobs
    let jobsToFilter = isSearchActive ? sampleJobs : allFeaturedJobs;
    
    // Apply search filter
    if (isSearchActive && (searchTerm || location)) {
      jobsToFilter = jobsToFilter.filter(job => {
        const searchLower = searchTerm.toLowerCase();
        const locationLower = location.toLowerCase();
        
        const matchesSearch = !searchTerm || 
          job.title.toLowerCase().includes(searchLower) ||
          job.company.toLowerCase().includes(searchLower) ||
          job.skills.some(skill => skill.toLowerCase().includes(searchLower)) ||
          job.description.toLowerCase().includes(searchLower) ||
          job.category.toLowerCase().includes(searchLower);
        
        const matchesLocation = !location || 
          job.location.toLowerCase().includes(locationLower);
        
        return matchesSearch && matchesLocation;
      });
    }
    
    // Apply category filter
    if (activeFilter !== "all") {
      jobsToFilter = jobsToFilter.filter(job => {
        switch (activeFilter) {
          case "software":
            return job.category === "software";
          case "education":
            return job.category === "education";
          case "remote":
            return job.location.toLowerCase().includes("remote");
          case "entry":
            return job.type === "fresher" || job.experience.toLowerCase().includes("fresher") || job.experience.toLowerCase().includes("entry");
          default:
            return true;
        }
      });
    }
    
    return jobsToFilter;
  }, [activeFilter, allFeaturedJobs, isSearchActive, searchTerm, location]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm || location) {
      setIsSearchActive(true);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setLocation("");
    setIsSearchActive(false);
    setActiveFilter("all");
  };

  const handleFilterClick = (filter: FilterType) => {
    setActiveFilter(activeFilter === filter ? "all" : filter);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!(lower.endsWith(".pdf") || lower.endsWith(".docx"))) {
      toast.error("Please upload a PDF or DOCX resume.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File too large (max 8 MB).");
      return;
    }
    setResumeScanning(true);
    setResumeFileName(file.name);
    setResumeMatches(null);
    try {
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
      }
      const fileBase64 = btoa(binary);
      const { data, error } = await supabase.functions.invoke("match-resume-to-jobs", {
        body: { fileBase64, fileName: file.name },
      });
      if (error || (data as any)?.error) {
        throw new Error((data as any)?.error || error?.message || "Scan failed");
      }
      const matches: ResumeMatch[] = (data as any)?.matches || [];
      setResumeMatches(matches);
      if (matches.length === 0) {
        toast.info("No matching jobs found for this resume yet.");
      } else {
        toast.success(`Found ${matches.length} suitable job${matches.length > 1 ? "s" : ""}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Could not scan resume");
    } finally {
      setResumeScanning(false);
    }
  };

  const scoreTone = (n: number) =>
    n >= 75 ? "bg-emerald-100 text-emerald-700"
    : n >= 50 ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";

  const handleSelectMatch = async (m: ResumeMatch) => {
    try {
      localStorage.setItem("pinnedSuitableJobId", m.id);
      // Cache the match payload so the dashboard can render it even if
      // the jobs table row is filtered out by status/RLS.
      localStorage.setItem("pinnedSuitableJobData", JSON.stringify({
        id: m.id,
        job_title: m.title,
        company_name: m.company,
        location: m.location || "",
        job_type: m.type || "",
        salary_range: m.salary || "",
        skills: m.skills || [],
        description: m.reason || "",
        status: "active",
      }));
    } catch {}
    const dest = "/candidate/dashboard?tab=jobs";
    const { data } = await supabase.auth.getUser();
    const role = (data.user?.user_metadata as any)?.role;
    if (data.user && (!role || role === "candidate")) {
      try {
        await supabase.from("profiles").update({ pinned_suitable_job_id: m.id }).eq("id", data.user.id);
      } catch {}
      navigate(dest);
    } else {
      navigate(`/candidate/signup?redirect=${encodeURIComponent(dest)}`);
    }
  };





  const filterButtons = [
    { id: "software" as FilterType, label: "Software Engineering" },
    { id: "education" as FilterType, label: "Education" },
    { id: "remote" as FilterType, label: "Remote" },
    { id: "entry" as FilterType, label: "Entry Level" },
  ];

  const getStatusText = () => {
    const parts = [];
    if (isSearchActive && searchTerm) parts.push(`"${searchTerm}"`);
    if (isSearchActive && location) parts.push(`in "${location}"`);
    if (activeFilter !== "all") {
      const filterLabel = filterButtons.find(f => f.id === activeFilter)?.label || activeFilter;
      parts.push(filterLabel);
    }
    return parts.length > 0 ? parts.join(" • ") : null;
  };

  return (
    <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
      {/* Animated sweeping color overlay */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="hero-color-sweep absolute inset-0" />
      </div>
      <div className="relative z-10 container mx-auto px-4 py-6 lg:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Headline - Centered, above search */}
          <div className="animate-fade-in text-center mb-8">
            <h1 className="text-lg md:text-xl font-semibold text-white/90 dark:text-white/90">
              Connect with Your <span className="text-transparent bg-gradient-to-r from-accent to-secondary bg-clip-text">Dream Career</span>
            </h1>
          </div>

          {/* Search Bar */}
          <div className="animate-slide-up max-w-2xl mx-auto mb-6">
            <div className="bg-background/95 backdrop-blur rounded-xl p-3 md:p-6 shadow-large">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2 md:gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    aria-label="Search by job title, company, or keywords"
                    placeholder="Job title, company, or keywords..."
                    className="pl-10 h-9 md:h-12 text-sm md:text-lg border border-input bg-background text-foreground"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex-1 relative">
                  <Input
                    aria-label="Search by location"
                    placeholder="Location (remote, city, country)"
                    className="h-9 md:h-12 text-sm md:text-lg border border-input bg-background text-foreground"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="hero" size="xl" className="h-9 md:h-12 px-6 md:px-8 text-sm md:text-base">
                  Search Jobs
                  <ArrowRight className="h-4 w-4 md:h-5 md:w-5 ml-2" />
                </Button>
              </form>
              
              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2 mt-3 md:mt-4 justify-center">
                {filterButtons.map((filter) => (
                  <Button
                    key={filter.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleFilterClick(filter.id)}
                    className={`transition-all duration-200 ${
                      activeFilter === filter.id
                        ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                        : "bg-background/50 border-accent/30 text-foreground hover:bg-accent hover:text-accent-foreground"
                    }`}
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>

              {/* Resume Upload — AI job match */}
              <div className="mt-4 pt-4 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="text-xs md:text-sm text-muted-foreground text-center sm:text-left">
                  <Sparkles className="h-3.5 w-3.5 inline text-primary mr-1" />
                  Upload your resume — AI finds jobs that fit you.
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,application/pdf"
                  className="hidden"
                  onChange={handleResumeUpload}
                />
                <Button
                  type="button"
                  variant="cta"
                  size="sm"
                  disabled={resumeScanning}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-2"
                >
                  {resumeScanning ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Scanning…</>
                  ) : (
                    <><Upload className="h-4 w-4" /> Upload Resume</>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* AI Resume Match Results */}
          {(resumeScanning || resumeMatches !== null) && (
            <div className="max-w-4xl mx-auto -mt-2 mb-8 animate-fade-in">
              <div className="bg-background/95 backdrop-blur rounded-xl p-4 md:p-5 shadow-large">
                <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-sm md:text-base font-semibold text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Suitable jobs for {resumeFileName || "your resume"}
                  </div>
                  {resumeMatches !== null && (
                    <Button variant="ghost" size="sm" onClick={() => { setResumeMatches(null); setResumeFileName(""); }} className="text-xs h-7">
                      <X className="h-3.5 w-3.5 mr-1" /> Clear
                    </Button>
                  )}
                </div>
                {resumeScanning ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="h-4 w-4 animate-spin" /> Analyzing resume against open positions…
                  </div>
                ) : resumeMatches && resumeMatches.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {resumeMatches.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleSelectMatch(m)}
                        className="text-left border border-border rounded-lg p-3 hover:border-primary/50 hover:bg-muted/30 transition group"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-foreground truncate group-hover:text-primary">{m.title}</div>
                            <div className="text-xs text-muted-foreground truncate">{m.company}</div>
                          </div>
                          <Badge className={`${scoreTone(m.score)} text-[11px] font-bold shrink-0`} variant="secondary">
                            {m.score}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-1">
                          {m.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</span>}
                          {m.type && <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" />{m.type}</span>}
                        </div>
                        {m.reason && <p className="text-[11px] text-muted-foreground line-clamp-2">{m.reason}</p>}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">No suitable jobs found right now. Try again later or browse all jobs below.</p>
                )}
              </div>
            </div>
          )}
        </div>


        {/* Jobs Section */}
        <div className="mt-16">
          {(isSearchActive || activeFilter !== "all") && (
            <div className="text-center mb-6 flex flex-col items-center gap-2">
              <p className="text-primary-foreground/80">
                Showing {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} {getStatusText() && `for ${getStatusText()}`}
              </p>
              {isSearchActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear Search
                </Button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {filteredJobs.length > 0 ? (
              filteredJobs.slice(0, 8).map((job) => (
                <div key={job.id} className="animate-fade-in">
                  <JobCard {...job} />
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-primary-foreground/70 text-lg">No jobs found. Try different keywords or filters.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSearch}
                  className="mt-4 text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10"
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>

          <div className="text-center">
            <Button variant="cta" size="lg" asChild>
              <Link to={isSearchActive ? `/jobs-results?q=${encodeURIComponent(searchTerm)}&location=${encodeURIComponent(location)}` : "/jobs"}>
                {isSearchActive && filteredJobs.length > 8 ? `View All ${filteredJobs.length} Results` : "View All Jobs"}
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;