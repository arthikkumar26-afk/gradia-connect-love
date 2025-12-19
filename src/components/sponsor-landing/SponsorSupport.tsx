import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  UserCheck, 
  HeadphonesIcon, 
  MessageSquare, 
  Clock,
  Shield,
  Zap
} from "lucide-react";

const supportFeatures = [
  {
    icon: UserCheck,
    title: "Dedicated Relationship Manager",
    description: "A single point of contact for all your sponsorship needs. From planning to execution, your manager handles it all.",
  },
  {
    icon: HeadphonesIcon,
    title: "Event-Day Support Team",
    description: "On-ground support staff at your stall. Technical assistance, logistics help, and candidate flow management.",
  },
  {
    icon: MessageSquare,
    title: "Live Chat & Help Desk",
    description: "24/7 chat support for urgent queries. Access help desk through the sponsor portal anytime.",
  },
  {
    icon: Clock,
    title: "Priority Sponsor Assistance",
    description: "Skip the queue with priority support. Faster response times for platinum and title sponsors.",
  },
  {
    icon: Shield,
    title: "Pre-Event Readiness Check",
    description: "Comprehensive checklist review before the event. Ensure your branding, stall setup, and materials are perfect.",
  },
  {
    icon: Zap,
    title: "Real-Time Issue Resolution",
    description: "Instant escalation for critical issues. Our team ensures zero downtime during the event.",
  },
];

export function SponsorSupport() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
            Sponsor Support
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            White-Glove Support at Every Step
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From onboarding to post-event analysis, our dedicated team ensures your sponsorship experience is seamless.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {supportFeatures.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={i} 
                className="group hover:shadow-xl transition-all duration-300 border-2 border-transparent hover:border-teal-200 dark:hover:border-teal-800"
              >
                <CardContent className="p-6">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Icon className="h-7 w-7 text-teal-600 dark:text-teal-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Support Stats */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {[
            { value: "< 2hrs", label: "Avg. Response Time" },
            { value: "98%", label: "Satisfaction Rate" },
            { value: "24/7", label: "Support Availability" },
            { value: "500+", label: "Events Managed" },
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
