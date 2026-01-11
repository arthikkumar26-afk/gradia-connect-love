import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Search, ArrowRight } from "lucide-react";

const Hero = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (location) params.set('location', location);
    navigate(`/jobs-results?${params.toString()}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
      <div className="relative z-10 container mx-auto px-4 py-20 lg:py-32">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 text-balance">
              Connect with Your
              <span className="block text-transparent bg-gradient-to-r from-accent to-secondary bg-clip-text">
                Dream Career
              </span>
            </h1>
          </div>

          {/* Search Bar */}
          <div className="animate-slide-up max-w-2xl mx-auto mb-12">
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
        </div>
      </div>
    </section>
  );
};

export default Hero;
