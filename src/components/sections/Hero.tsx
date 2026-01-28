import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { Search, ArrowRight, Briefcase } from "lucide-react";
import JobCard from "@/components/ui/JobCard";
import { getFeaturedJobs } from "@/data/sampleJobs";

type FilterType = "all" | "software" | "education" | "remote" | "entry";

const Hero = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const allFeaturedJobs = getFeaturedJobs();

  const filteredJobs = useMemo(() => {
    if (activeFilter === "all") return allFeaturedJobs;
    
    return allFeaturedJobs.filter(job => {
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
  }, [activeFilter, allFeaturedJobs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (location) params.set('location', location);
    navigate(`/jobs-results?${params.toString()}`);
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

  return (
    <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
      <div className="relative z-10 container mx-auto px-4 py-6 lg:py-8">
        <div className="max-w-4xl mx-auto">
          {/* Headline - Centered, above search */}
          <div className="animate-fade-in text-center mb-8">
            <h1 className="text-lg md:text-xl font-semibold text-primary-foreground/90">
              Connect with Your <span className="text-transparent bg-gradient-to-r from-accent to-secondary bg-clip-text">Dream Career</span>
            </h1>
          </div>

          {/* Search Bar */}
          <div className="animate-slide-up max-w-2xl mx-auto mb-6">
            <div className="bg-background/95 backdrop-blur rounded-xl p-6 shadow-large">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Job title, company, or keywords..."
                    className="pl-10 h-12 text-lg border border-input bg-background text-foreground"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Location (remote, city, country)"
                    className="h-12 text-lg border border-input bg-background text-foreground"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
                <Button type="submit" variant="hero" size="xl" className="h-12 px-8">
                  Search Jobs
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </form>
              
              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
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
          {activeFilter !== "all" && (
            <div className="text-center mb-6">
              <p className="text-primary-foreground/80">
                Showing {filteredJobs.length} {activeFilter === "software" ? "Software Engineering" : activeFilter === "education" ? "Education" : activeFilter === "remote" ? "Remote" : "Entry Level"} jobs
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {filteredJobs.length > 0 ? (
              filteredJobs.map((job) => (
                <div key={job.id} className="animate-fade-in">
                  <JobCard {...job} />
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-primary-foreground/70 text-lg">No jobs found for this filter. Try another category.</p>
              </div>
            )}
          </div>

          <div className="text-center">
            <Button variant="cta" size="lg" asChild>
              <Link to="/jobs">
                View All Jobs
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