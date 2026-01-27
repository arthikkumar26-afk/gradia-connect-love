import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, Handshake } from "lucide-react";

const AboutHero = () => {
  return (
    <section className="relative py-24 md:py-32 overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(0 0% 100%) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>
      
      {/* Floating shapes */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-80 h-80 bg-secondary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2 mb-8">
            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-sm text-white/90 font-medium">
              Building Careers. Creating Futures.
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Guiding Careers.
            <span className="block text-cyan-400">Empowering Organizations.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-white/85 max-w-3xl mx-auto mb-10 leading-relaxed">
            Gradia is a next-generation placement and partnership platform helping talent and 
            institutions grow together through meaningful career opportunities.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-slate-900 hover:bg-white/90 group"
              asChild
            >
              <Link to="/jobs">
                <Briefcase className="h-5 w-5 mr-2" />
                Explore Opportunities
                <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
              asChild
            >
              <Link to="/sponsors" className="text-white">
                <Handshake className="h-5 w-5 mr-2 text-white" />
                Partner with Gradia
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutHero;
