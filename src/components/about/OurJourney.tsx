import { Milestone } from "lucide-react";

const OurJourney = () => {
  const milestones = [
    {
      year: "2025",
      title: "The Beginning",
      description: "Founded with a vision to simplify hiring and create meaningful career pathways for talent across India."
    },
    {
      year: "2025",
      title: "Platform Launch",
      description: "Launched our digital platform with AI-powered matching, employer analytics, and real-time reporting dashboards."
    },
    {
      year: "2025",
      title: "Multi-Industry Expansion",
      description: "Expanded across Software, Civil Engineering, Film & Media, Education, and Legal sectors with 500+ partner companies."
    },
    {
      year: "2026",
      title: "Growing Ecosystem",
      description: "Scaling to 45+ cities with large-scale job melas, campus drives, and comprehensive training programs."
    },
    {
      year: "2026",
      title: "Innovation & Scale",
      description: "Advanced AI interviews, enhanced sponsor tools, and industry-specific hiring pipelines driving 35,000+ placements."
    },
    {
      year: "Now",
      title: "Building the Future",
      description: "Continuously expanding our ecosystem with new industries, deeper partnerships, and cutting-edge hiring technology."
    }
  ];

  return (
    <section className="py-10 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Our Journey
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From a simple idea to India's growing placement and partnership platform
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative">
            {/* Timeline line - centered on the year badge column */}
            <div className="absolute left-[60px] top-0 bottom-0 w-0.5 bg-border hidden md:block" />
            
            <div className="space-y-8">
              {milestones.map((milestone, index) => (
                <div 
                  key={index} 
                  className="relative flex items-start group"
                >
                  {/* Year badge - fixed width, centered */}
                  <div className="w-[120px] shrink-0 hidden md:flex justify-center pt-5">
                    <span className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/10 text-accent font-semibold text-sm">
                      <span className="w-2 h-2 rounded-full bg-accent" />
                      {milestone.year}
                    </span>
                  </div>
                  
                  {/* Content card */}
                  <div className="flex-1">
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
