import { Target, Eye } from "lucide-react";

const MissionVision = () => {
  return (
    <section className="py-20 bg-subtle">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Mission */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-accent opacity-5 rounded-2xl group-hover:opacity-10 transition-opacity duration-300" />
            <div className="relative p-10 rounded-2xl border border-border/50 bg-card">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-accent flex items-center justify-center">
                  <Target className="h-7 w-7 text-accent-foreground" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Our Mission
                </h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                To create meaningful career pathways for individuals while helping organizations 
                build strong, future-ready teams through transparent processes, reliable partnerships, 
                and measurable outcomes.
              </p>
            </div>
          </div>

          {/* Vision */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-accent opacity-5 rounded-2xl group-hover:opacity-10 transition-opacity duration-300" />
            <div className="relative p-10 rounded-2xl border border-border/50 bg-card">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-accent flex items-center justify-center">
                  <Eye className="h-7 w-7 text-accent-foreground" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                  Our Vision
                </h2>
              </div>
              <p className="text-lg text-muted-foreground leading-relaxed">
                To become India's most trusted platform for career growth, institutional hiring, 
                and talent partnerships — setting the standard for excellence in placement services 
                and sponsor engagement.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MissionVision;
