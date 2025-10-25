import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import JobCard from "@/components/ui/JobCard";
import { getFeaturedJobs } from "@/data/sampleJobs";
import { ArrowRight, Briefcase } from "lucide-react";

const FeaturedJobs = () => {
  const featuredJobs = getFeaturedJobs();

  return (
    <section className="py-16 bg-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Briefcase className="h-6 w-6 text-accent" />
            <span className="text-sm font-medium text-accent uppercase tracking-wide">
              Featured Opportunities
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Trending Jobs This Week
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover hand-picked opportunities from our top partner companies. 
            These roles are actively hiring and perfect for your career growth.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
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
    </section>
  );
};

export default FeaturedJobs;