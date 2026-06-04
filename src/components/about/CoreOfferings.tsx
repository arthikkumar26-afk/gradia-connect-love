import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Briefcase, CalendarDays, GraduationCap, ArrowRight, HardHat, Clapperboard, Building, Cpu } from "lucide-react";

const CoreOfferings = () => {
  const offerings = [
    {
      icon: Briefcase,
      title: "Placements & Hiring Solutions",
      description: "Connecting candidates with verified opportunities across software, civil engineering, film production, education, legal, and more through our extensive industry network.",
      link: "/jobs",
      linkText: "Browse Jobs"
    },
    {
      icon: CalendarDays,
      title: "Job Melas & Campus Drives",
      description: "Large-scale multi-industry hiring events — from IT campuses to civil engineering firms and media houses — connecting hundreds of candidates with top employers.",
      link: "/jobs",
      linkText: "View Events"
    },
    {
      icon: GraduationCap,
      title: "Training & Skill Development",
      description: "Industry-specific training in tech, construction management, media production, teaching methodologies, and more through curated learning paths.",
      link: "/learning",
      linkText: "Start Learning"
    }
  ];

  const hiringDomains = [
    { icon: Cpu, label: "Software & IT", count: "200+" },
    { icon: HardHat, label: "Civil Engineering", count: "80+" },
    { icon: Clapperboard, label: "Film & Media", count: "50+" },
    { icon: Building, label: "Construction & Infra", count: "60+" },
  ];

  return (
    <section className="py-10 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What We Do
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive solutions for every step of your career journey — across every industry
          </p>
        </div>

        {/* Live Vacancy Domains */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {hiringDomains.map((domain, i) => (
            <div key={i} className="relative overflow-hidden rounded-xl border border-border/50 bg-card p-5 text-center hover:border-accent/40 hover:shadow-lg transition-all duration-300 group">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-accent mb-3 group-hover:scale-110 transition-transform">
                <domain.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <div className="text-2xl font-bold text-foreground">{domain.count}</div>
              <div className="text-sm text-muted-foreground font-medium">{domain.label} Vacancies</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {offerings.map((offering, index) => (
            <Card 
              key={index} 
              className="group border-border/50 hover:border-accent/30 hover:shadow-large transition-all duration-300 overflow-hidden"
            >
              <CardContent className="p-8">
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-xl bg-gradient-accent flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <offering.icon className="h-7 w-7 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      {offering.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {offering.description}
                    </p>
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-accent hover:text-accent-hover group/btn"
                      asChild
                    >
                      <Link to={offering.link}>
                        {offering.linkText}
                        <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CoreOfferings;
