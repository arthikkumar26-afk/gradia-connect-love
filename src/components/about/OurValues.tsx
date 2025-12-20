import { Shield, Eye, TrendingUp, Heart, Handshake } from "lucide-react";

const OurValues = () => {
  const values = [
    {
      icon: Shield,
      title: "Transparency",
      description: "Clear communication and honest practices in every interaction"
    },
    {
      icon: Eye,
      title: "Integrity",
      description: "Upholding the highest ethical standards in all our dealings"
    },
    {
      icon: TrendingUp,
      title: "Growth-Focused",
      description: "Committed to continuous improvement and measurable outcomes"
    },
    {
      icon: Heart,
      title: "People-Centric",
      description: "Putting individuals at the heart of everything we do"
    },
    {
      icon: Handshake,
      title: "Long-Term Partnerships",
      description: "Building lasting relationships that create sustained value"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Our Values
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The principles that guide our actions and define our culture
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.slice(0, 3).map((value, index) => (
              <ValueCard key={index} value={value} />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 max-w-2xl mx-auto">
            {values.slice(3).map((value, index) => (
              <ValueCard key={index + 3} value={value} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const ValueCard = ({ value }: { value: { icon: any; title: string; description: string } }) => {
  return (
    <div className="group flex items-start gap-4 p-6 rounded-xl border border-border/50 bg-card hover:border-accent/30 hover:shadow-medium transition-all duration-300">
      <div className="w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
        <value.icon className="h-6 w-6 text-accent-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-foreground mb-1">
          {value.title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {value.description}
        </p>
      </div>
    </div>
  );
};

export default OurValues;
