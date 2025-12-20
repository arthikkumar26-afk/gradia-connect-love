import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Briefcase, CalendarDays, Handshake, GraduationCap, ArrowRight } from "lucide-react";

const CoreOfferings = () => {
  const offerings = [
    {
      icon: Briefcase,
      title: "Placements & Hiring Solutions",
      description: "Connecting candidates with verified opportunities in tech and education sectors through our extensive network of partner companies.",
      link: "/jobs",
      linkText: "Browse Jobs"
    },
    {
      icon: CalendarDays,
      title: "Job Melas & Campus Drives",
      description: "Large-scale hiring events with transparent sponsor analytics, connecting hundreds of candidates with top employers in a single venue.",
      link: "/sponsors",
      linkText: "View Events"
    },
    {
      icon: Handshake,
      title: "Sponsorship & Partnerships",
      description: "Structured sponsorship programs with measurable ROI, dedicated relationship managers, and comprehensive post-event analytics.",
      link: "/sponsors",
      linkText: "Become a Sponsor"
    },
    {
      icon: GraduationCap,
      title: "Training & Skill Development",
      description: "Preparing candidates to meet real-world industry needs through curated learning paths, certifications, and practical workshops.",
      link: "/learning",
      linkText: "Start Learning"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What We Do
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive solutions for every step of your career journey
          </p>
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
