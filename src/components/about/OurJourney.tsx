import { Milestone } from "lucide-react";

const OurJourney = () => {
  const milestones = [
    {
      year: "2019",
      title: "The Beginning",
      description: "Founded with a vision to simplify hiring and create meaningful career pathways for talent across India."
    },
    {
      year: "2020",
      title: "Multi-City Expansion",
      description: "Expanded operations to 10+ cities, conducting our first large-scale multi-location job melas."
    },
    {
      year: "2021",
      title: "Tech Platform Launch",
      description: "Launched our digital platform with sponsor analytics, candidate tracking, and real-time reporting dashboards."
    },
    {
      year: "2022",
      title: "Education Partnerships",
      description: "Partnered with 100+ educational institutions, integrating campus placements into our ecosystem."
    },
    {
      year: "2023",
      title: "Growing Ecosystem",
      description: "Crossed 50,000+ placements with 500+ partner organizations and expanded to 45+ cities."
    },
    {
      year: "2024",
      title: "Innovation & Scale",
      description: "Launched advanced AI-powered matching, enhanced sponsor tools, and comprehensive training programs."
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Our Journey
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From a simple idea to India's growing placement and partnership platform
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border hidden md:block" />
            
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div 
                  key={index} 
                  className="relative flex gap-8 group"
                >
                  {/* Timeline dot */}
                  <div className="hidden md:flex absolute left-8 w-4 h-4 rounded-full bg-accent border-4 border-background shadow-md -translate-x-1/2 mt-1.5 group-hover:scale-125 transition-transform duration-300" />
                  
                  {/* Year badge */}
                  <div className="w-20 shrink-0 text-right hidden md:block">
                    <span className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent font-semibold text-sm">
                      {milestone.year}
                    </span>
                  </div>
                  
                  {/* Content card */}
                  <div className="flex-1 pl-0 md:pl-8">
                    <div className="p-6 rounded-xl border border-border/50 bg-card hover:border-accent/30 hover:shadow-medium transition-all duration-300">
                      <div className="flex items-center gap-3 mb-2 md:hidden">
                        <span className="px-3 py-1 rounded-full bg-accent/10 text-accent font-semibold text-sm">
                          {milestone.year}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {milestone.title}
                      </h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {milestone.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OurJourney;
