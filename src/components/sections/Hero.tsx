import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo, useEffect } from "react";
import { Search, ArrowRight, X, Loader2 } from "lucide-react";
import JobCard from "@/components/ui/JobCard";
import { sampleJobs, getFeaturedJobs, Job } from "@/data/sampleJobs";
import { supabase } from "@/integrations/supabase/client";

type FilterType = "all" | "software" | "education" | "remote" | "entry";

const Hero = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [dbJobs, setDbJobs] = useState<Job[]>([]);
  const [isLoadingDb, setIsLoadingDb] = useState(true);
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
            </div>
          </div>
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