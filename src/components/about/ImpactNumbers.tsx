import { useEffect, useState, useRef } from "react";
import { Users, Building2, CalendarCheck, MapPin, Award } from "lucide-react";

const ImpactNumbers = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const stats = [
    { icon: Users, value: 75000, suffix: "+", label: "Candidates Supported" },
    { icon: Building2, value: 500, suffix: "+", label: "Companies & Institutions" },
    { icon: CalendarCheck, value: 120, suffix: "+", label: "Job Melas Conducted" },
    { icon: MapPin, value: 45, suffix: "+", label: "Cities Covered" },
    { icon: Award, value: 35000, suffix: "+", label: "Successful Placements" }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 bg-gradient-hero">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
            Gradia in Numbers
          </h2>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Our impact speaks through the careers we've built and the partnerships we've forged
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className="text-center group"
              style={{ 
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.6s ease-out ${index * 0.1}s`
              }}
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-foreground/10 backdrop-blur-sm mb-4 group-hover:scale-110 transition-transform duration-300">
                <stat.icon className="h-8 w-8 text-primary-foreground" />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
                <AnimatedNumber value={stat.value} isVisible={isVisible} />
                {stat.suffix}
              </div>
              <div className="text-sm text-primary-foreground/70 font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const AnimatedNumber = ({ value, isVisible }: { value: number; isVisible: boolean }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, isVisible]);

  return <>{displayValue.toLocaleString()}</>;
};

export default ImpactNumbers;
