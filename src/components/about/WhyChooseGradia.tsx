import { Check } from "lucide-react";

const WhyChooseGradia = () => {
  const reasons = [
    "Verified candidates & institutions with thorough background checks",
    "Structured hiring processes with clear timelines and expectations",
    "Sponsor-friendly analytics dashboards with real-time insights",
    "Dedicated relationship managers for personalized support",
    "End-to-end support from registration to placement",
    "Transparent pricing with no hidden fees",
    "Post-event reports with actionable hiring insights",
    "Multi-city presence with local expertise"
  ];

  return (
    <section className="py-20 bg-subtle">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Why Choose Gradia?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              We're not just another placement platform. Gradia combines technology with 
              human expertise to deliver exceptional outcomes for candidates, employers, 
              and sponsors alike.
            </p>
            
            <div className="grid grid-cols-1 gap-4">
              {reasons.map((reason, index) => (
                <div 
                  key={index} 
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-card transition-colors duration-200"
                >
                  <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 text-accent" />
                  </div>
                  <span className="text-foreground">
                    {reason}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            {/* Decorative card stack */}
            <div className="absolute -top-4 -right-4 w-full h-full rounded-2xl bg-accent/10 rotate-3" />
            <div className="absolute -top-2 -right-2 w-full h-full rounded-2xl bg-accent/20 rotate-1" />
            <div className="relative rounded-2xl bg-card border border-border/50 p-8 shadow-large">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center">
                    <span className="text-2xl font-bold text-accent-foreground">98%</span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Placement Success Rate</div>
                    <div className="text-sm text-muted-foreground">For active candidates</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center">
                    <span className="text-2xl font-bold text-accent-foreground">4.9</span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Sponsor Satisfaction</div>
                    <div className="text-sm text-muted-foreground">Average rating out of 5</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-accent flex items-center justify-center">
                    <span className="text-2xl font-bold text-accent-foreground">48h</span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground">Average Response Time</div>
                    <div className="text-sm text-muted-foreground">For support queries</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyChooseGradia;
