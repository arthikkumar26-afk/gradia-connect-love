import { Badge } from "@/components/ui/badge";
import { Building2, Rocket, GraduationCap, Users, Clapperboard, HardHat, Scale } from "lucide-react";

const WhoWeWorkWith = () => {
  const partners = [
    {
      icon: Building2,
      title: "Software Companies",
      description: "Leading tech giants and established enterprises seeking top-tier talent"
    },
    {
      icon: Clapperboard,
      title: "Film & Media Industry",
      description: "Production houses, OTT platforms, and media companies hiring creative & technical talent"
    },
    {
      icon: HardHat,
      title: "Civil & Construction",
      description: "Engineering firms, infrastructure companies, and real estate developers"
    },
    {
      icon: GraduationCap,
      title: "Colleges & Universities",
      description: "Premier educational institutions preparing students for industry success"
    },
    {
      icon: Scale,
      title: "Legal & Government",
      description: "Law firms, government bodies, and PSU organizations with specialized hiring needs"
    },
    {
      icon: Rocket,
      title: "Startups",
      description: "Fast-growing startups building innovative solutions and disruptive products"
    },
    {
      icon: Users,
      title: "Training Partners",
      description: "Skill development organizations and certification providers"
    },
    {
      icon: Handshake,
      title: "Sponsors",
      description: "Organizations maximizing hiring ROI through strategic partnerships"
    }
  ];

  // Placeholder logos
  const logos = [
    "TechCorp", "InnovateLabs", "EduFirst", "SkillBridge", "FutureHire",
    "CareerPath", "TalentHub", "GrowthWorks", "LearnPro", "HireNow"
  ];

  return (
    <section className="py-12 bg-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Who We Work With
          </h2>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Building partnerships across industries to create meaningful career opportunities
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 mb-10">
          {partners.map((partner, index) => (
            <div 
              key={index} 
              className="group p-4 rounded-lg border border-border/50 bg-card hover:border-accent/30 hover:shadow-medium transition-all duration-300 text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-accent mx-auto mb-2 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <partner.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1 text-xs">
                {partner.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {partner.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhoWeWorkWith;
