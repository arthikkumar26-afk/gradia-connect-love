import { Link } from "react-router-dom";
import { UserPlus, Building2, MessageCircle, GraduationCap } from "lucide-react";

const AboutCTA = () => {
  const actions = [
    {
      icon: UserPlus,
      label: "Apply with Gradia",
      description: "Start your career journey",
      link: "/candidate/signup",
    },
    {
      icon: Building2,
      label: "Hire Through Gradia",
      description: "Find verified talent",
      link: "/employer/signup",
    },
    {
      icon: GraduationCap,
      label: "EduTech Portal",
      description: "For training institutes",
      link: "/edutech",
    },
    {
      icon: MessageCircle,
      label: "Contact Us",
      description: "Get in touch",
      link: "/contact",
    },
  ];

  return (
    <section className="py-12 bg-gradient-hero relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(0 0% 100%) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
      </div>

      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Let's Build the Future Together
          </h2>
          <p className="text-lg md:text-xl text-white/85 mb-12 max-w-2xl mx-auto leading-relaxed">
            Whether you're looking to advance your career, hire exceptional talent,
            or grow your skills — we're here to help.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {actions.map((action, index) => (
              <Link key={index} to={action.link} className="group">
                <div className="p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-300 h-full">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="font-semibold text-white mb-1">
                    {action.label}
                  </div>
                  <div className="text-sm text-white/70">
                    {action.description}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutCTA;
