import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, BarChart3, Clapperboard, HardHat, Cpu, GraduationCap, Landmark } from "lucide-react";

const WhoWeAre = () => {
  const highlights = [
    {
      icon: Users,
      title: "Talent-First Approach",
      description: "We prioritize candidate success by matching skills, aspirations, and career goals with the right opportunities."
    },
    {
      icon: Building2,
      title: "Institution & Industry Collaboration",
      description: "Bridging the gap between educational institutions and forward-thinking companies for mutual growth."
    },
    {
      icon: BarChart3,
      title: "Data-Driven Hiring & Partnerships",
      description: "Leveraging analytics and insights to ensure transparent, measurable outcomes for all stakeholders."
    }
  ];

  const industries = [
    { icon: HardHat, name: "Civil Engineering" },
    { icon: Clapperboard, name: "Film & Media" },
    { icon: Cpu, name: "Software & IT" },
    { icon: GraduationCap, name: "Education" },
    { icon: Landmark, name: "Government & PSU" },
    { icon: Landmark, name: "Government & PSU" },
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Who We Are
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Gradia is a career and hiring ecosystem built to bridge the gap between skilled 
            individuals and forward-thinking organizations. From <strong className="text-foreground">software companies</strong> and <strong className="text-foreground">civil engineering firms</strong> to the <strong className="text-foreground">film & entertainment industry</strong>, 
            we connect talent across every sector — including education, healthcare, government, and beyond.
          </p>
        </div>

        {/* Industries We Serve */}
        <div className="mb-16">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-8">
            Industries We Serve
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {industries.map((ind, i) => (
              <div 
                key={i} 
                className="flex items-center gap-2.5 px-5 py-3 rounded-full border border-border/60 bg-card hover:border-accent/40 hover:shadow-md transition-all duration-300"
              >
                <ind.icon className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium text-foreground">{ind.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {highlights.map((item, index) => (
            <Card 
              key={index} 
              className="group border-border/50 hover:border-accent/30 hover:shadow-large transition-all duration-300 bg-card"
            >
              <CardContent className="p-8 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-accent mb-6 group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="h-8 w-8 text-accent-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {item.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhoWeAre;
