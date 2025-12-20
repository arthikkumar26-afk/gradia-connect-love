import { Card, CardContent } from "@/components/ui/card";
import { Users, Building2, BarChart3 } from "lucide-react";

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

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Who We Are
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Gradia is a career and hiring ecosystem built to bridge the gap between skilled 
            individuals and forward-thinking organizations. We work closely with software 
            companies, startups, and educational institutions to deliver reliable hiring, 
            transparent sponsorships, and measurable outcomes.
          </p>
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
