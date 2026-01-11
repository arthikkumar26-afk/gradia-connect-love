import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { 
  Search, 
  TrendingUp, 
  Users, 
  Building2, 
  Award,
  ArrowRight 
} from "lucide-react";
const Hero = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("");
  
  const stats = [
    { icon: Users, label: "Active Candidates", value: "50K+" },
    { icon: Building2, label: "Partner Companies", value: "2,500+" },
    { icon: TrendingUp, label: "Successful Placements", value: "25K+" },
    { icon: Award, label: "Years of Excellence", value: "10+" },
  ];

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

          {/* Call to Actions */}
          <div className="animate-scale-in flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button variant="cta" size="xl" className="shadow-glow" asChild>
              <Link to="/candidate/login">
                Apply Now
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button variant="professional" size="xl" className="bg-background/90 text-foreground hover:bg-background shadow-medium" asChild>
              <Link to="/employer/login">
                Post Job Now
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="animate-slide-up grid grid-cols-2 lg:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/20 rounded-lg mb-3">
                  <stat.icon className="h-6 w-6 text-accent" />
                </div>
                <div className="text-2xl md:text-3xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-primary-foreground/80">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1200 120"
          preserveAspectRatio="none"
          className="relative block w-full h-12 lg:h-20"
        >
          <path
            d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
            opacity=".25"
            className="fill-background"
          ></path>
          <path
            d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
            opacity=".5"
            className="fill-background"
          ></path>
          <path
            d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
            className="fill-background"
          ></path>
        </svg>
      </div>
    </section>
  );
};

export default Hero;