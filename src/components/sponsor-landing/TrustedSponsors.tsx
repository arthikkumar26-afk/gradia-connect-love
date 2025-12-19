import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Quote, Star, MapPin, Building2, GraduationCap } from "lucide-react";

const testimonials = [
  {
    quote: "Gradia's job mela helped us hire 45 engineers in a single event. The candidate quality and ROI tracking made our recruitment team's job effortless.",
    author: "Rajesh Menon",
    role: "VP Engineering",
    company: "TechCorp Solutions",
    image: "/placeholder.svg",
    rating: 5,
  },
  {
    quote: "As a startup, we were skeptical about job melas. But Gradia's targeted candidate pool and affordable stall options gave us access to talent we couldn't reach otherwise.",
    author: "Priya Krishnan",
    role: "Co-Founder & CEO",
    company: "InnovateLabs",
    image: "/placeholder.svg",
    rating: 5,
  },
  {
    quote: "The analytics dashboard is a game-changer. We can see exactly how our sponsorship translates to hires. Highly recommend for data-driven HR teams.",
    author: "Arun Sharma",
    role: "Head of Talent",
    company: "GlobalTech India",
    image: "/placeholder.svg",
    rating: 5,
  },
];

const sponsorLogos = [
  "TechCorp", "InnovateLabs", "GlobalTech", "SoftServe", "DataDriven",
  "CloudFirst", "AIVentures", "CyberSecure", "FinTech Pro", "EduTech Plus",
  "StartupHub", "DevOps Inc"
];

const stats = [
  { icon: Building2, value: "500+", label: "Partner Companies" },
  { icon: GraduationCap, value: "200+", label: "Educational Institutions" },
  { icon: MapPin, value: "15+", label: "Cities Covered" },
];

export function TrustedSponsors() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
            Trusted Partners
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Trusted by Industry Leaders
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Join 500+ companies who have successfully hired through Gradia's platform.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mb-16">
          {stats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="h-7 w-7 text-teal-600 dark:text-teal-400" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            );
          })}
        </div>

        {/* Logo Cloud */}
        <div className="mb-16 py-8 border-y">
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-6">
            {sponsorLogos.map((logo, i) => (
              <div 
                key={i} 
                className="text-xl font-bold text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
              >
                {logo}
              </div>
            ))}
          </div>
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, i) => (
            <Card key={i} className="hover:shadow-xl transition-all duration-300 border-2 hover:border-teal-200 dark:hover:border-teal-800">
              <CardContent className="p-6">
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <div className="relative mb-6">
                  <Quote className="absolute -top-2 -left-2 h-8 w-8 text-teal-200 dark:text-teal-800" />
                  <p className="text-muted-foreground text-sm leading-relaxed pl-6">
                    "{testimonial.quote}"
                  </p>
                </div>

                {/* Author */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-bold">
                    {testimonial.author.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">{testimonial.author}</div>
                    <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                    <div className="text-xs text-teal-600 dark:text-teal-400">{testimonial.company}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
