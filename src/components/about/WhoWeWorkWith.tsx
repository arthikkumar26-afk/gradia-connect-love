import { Badge } from "@/components/ui/badge";
import { Building2, Rocket, GraduationCap, Users, Handshake } from "lucide-react";

const WhoWeWorkWith = () => {
  const partners = [
    {
      icon: Building2,
      title: "Software Companies",
      description: "Leading tech giants and established enterprises seeking top-tier talent"
    },
    {
      icon: Rocket,
      title: "Startups",
      description: "Fast-growing startups building innovative solutions and disruptive products"
    },
    {
      icon: GraduationCap,
      title: "Colleges & Universities",
      description: "Premier educational institutions preparing students for industry success"
    },
    {
      icon: Users,
      title: "Training Partners",
      description: "Skill development organizations and certification providers"
    },
    {
      icon: Handshake,
      title: "Sponsors",
      description: "Organizations looking to maximize their hiring ROI through strategic partnerships"
    }
  ];

  // Placeholder logos
  const logos = [
    "TechCorp", "InnovateLabs", "EduFirst", "SkillBridge", "FutureHire",
    "CareerPath", "TalentHub", "GrowthWorks", "LearnPro", "HireNow"
  ];

  return (
    <section className="py-20 bg-subtle">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Who We Work With
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Building partnerships across industries to create meaningful career opportunities
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-16">
          {partners.map((partner, index) => (
            <div 
              key={index} 
              className="group p-6 rounded-xl border border-border/50 bg-card hover:border-accent/30 hover:shadow-medium transition-all duration-300 text-center"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-accent mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <partner.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 text-sm">
                {partner.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {partner.description}
              </p>
            </div>
          ))}
        </div>

        {/* Logo cloud */}
        <div className="border-t border-border/50 pt-12">
          <p className="text-center text-sm text-muted-foreground mb-8">
            Trusted by leading organizations
          </p>
          <div className="flex flex-wrap justify-center gap-8">
            {logos.map((logo, index) => (
              <div 
                key={index}
                className="flex items-center justify-center w-28 h-12 rounded-lg bg-muted/50 px-4"
              >
                <span className="text-sm font-semibold text-muted-foreground">
                  {logo}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhoWeWorkWith;
