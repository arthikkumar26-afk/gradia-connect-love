import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, ArrowRight, Briefcase } from "lucide-react";
import JobCard from "@/components/ui/JobCard";
import { getFeaturedJobs } from "@/data/sampleJobs";

const Hero = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  const featuredJobs = getFeaturedJobs();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (location) params.set('location', location);
    navigate(`/jobs-results?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
      <div className="relative z-10 container mx-auto px-4 py-12 lg:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Search Bar */}
          <div className="animate-slide-up max-w-2xl mx-auto mb-6">
            <div className="bg-background/95 backdrop-blur rounded-xl p-6 shadow-large">
              <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Job title, company, or keywords..."
                    className="pl-10 h-12 text-lg border-0 bg-background"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex-1 relative">
                  <Input
                    placeholder="Location (remote, city, country)"
                    className="h-12 text-lg border-0 bg-background"
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
                <Button variant="outline" size="sm" className="bg-background/50 border-accent/30 text-foreground hover:bg-accent hover:text-accent-foreground">
                  Software Engineering
                </Button>
                <Button variant="outline" size="sm" className="bg-background/50 border-accent/30 text-foreground hover:bg-accent hover:text-accent-foreground">
                  Education
                </Button>
                <Button variant="outline" size="sm" className="bg-background/50 border-accent/30 text-foreground hover:bg-accent hover:text-accent-foreground">
                  Remote
                </Button>
                <Button variant="outline" size="sm" className="bg-background/50 border-accent/30 text-foreground hover:bg-accent hover:text-accent-foreground">
                  Entry Level
                </Button>
              </div>
            </div>
          </div>

          {/* Headline - Small, left-aligned, below search */}
          <div className="animate-fade-in text-left max-w-2xl mb-8 pl-4">
            <h1 className="text-lg md:text-xl font-semibold text-primary-foreground/90">
              Connect with Your <span className="text-transparent bg-gradient-to-r from-accent to-secondary bg-clip-text">Dream Career</span>
            </h1>
          </div>
        </div>

        {/* Trending Jobs Section */}
        <div className="mt-16">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-4">
              <Briefcase className="h-6 w-6 text-accent" />
              <span className="text-sm font-medium text-accent uppercase tracking-wide">
                Featured Opportunities
              </span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Trending Jobs This Week
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {featuredJobs.map((job) => (
              <div key={job.id} className="animate-fade-in">
                <JobCard {...job} />
              </div>
            ))}
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