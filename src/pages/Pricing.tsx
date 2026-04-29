import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Star, Zap, Crown, Rocket, Building2, User, Award, GraduationCap, Handshake } from "lucide-react";
import { WhyPriceFAQ } from "@/components/shared/WhyPriceFAQ";

const PricingPage = () => {
  const candidatePlans = [
    {
      name: "Starter",
      points: 400,
      popular: false,
      features: [
        "Unlimited job applications",
        "1× Resume PDF export",
        "AI ATS score & report",
        "Application tracker",
      ],
      cta: "/candidate/signup",
    },
    {
      name: "Basic",
      points: 1000,
      popular: false,
      features: [
        "Everything in Starter",
        "1× AI Mock Interview (Aptitude + Technical)",
        "Basic AI feedback report",
        "Weak-topic insights",
      ],
      cta: "/candidate/signup",
    },
    {
      name: "Pro",
      points: 2000,
      popular: true,
      features: [
        "Everything in Basic",
        "2× AI Mock Interviews (Tech + HR rounds)",
        "Detailed AI feedback report",
        "Featured profile boost (1×)",
        "Priority application tag",
      ],
      cta: "/candidate/signup",
    },
    {
      name: "Premium",
      points: 5000,
      popular: false,
      features: [
        "Everything in Pro",
        "5× AI Mock Interviews (Full pipeline)",
        "Coding / Demo / HR / Final rounds",
        "Unlimited resume exports",
        "Featured boost (3×) + Priority support",
        "30-day improvement roadmap",
      ],
      cta: "/candidate/signup",
    },
  ];

  const employerPlans = [
    {
      name: "Starter",
      points: 0,
      popular: false,
      features: [
        "3 job posts",
        "1 team seat",
        "Basic applicant tracker",
        "Email support",
      ],
      cta: "/employer/signup",
    },
    {
      name: "Growth",
      points: 1000,
      popular: true,
      features: [
        "15 job posts",
        "5 team seats",
        "Screening tests",
        "Analytics dashboard",
        "Priority support",
      ],
      cta: "/employer/signup",
    },
    {
      name: "Professional",
      points: 3000,
      popular: false,
      features: [
        "50 job posts",
        "15 team seats",
        "AI interview automation",
        "Advanced analytics",
        "Dedicated account manager",
        "API access",
      ],
      cta: "/employer/signup",
    },
    {
      name: "Enterprise",
      points: 5800,
      popular: false,
      features: [
        "Unlimited job posts",
        "Unlimited seats",
        "Custom integrations",
        "SLA guarantee",
        "White-label options",
        "Dedicated support team",
      ],
      cta: "/contact",
    },
  ];

  const freelancerPlans = [
    {
      name: "Starter",
      points: 0,
      popular: false,
      features: [
        "Portfolio page",
        "3 project listings",
        "Basic profile",
        "Community access",
      ],
      cta: "/freelancer/signup",
    },
    {
      name: "Pro",
      points: 300,
      popular: true,
      features: [
        "Unlimited projects",
        "Custom portfolio domain",
        "Priority in search",
        "Client messaging",
        "Analytics",
      ],
      cta: "/freelancer/signup",
    },
    {
      name: "Premium",
      points: 600,
      popular: false,
      features: [
        "Everything in Pro",
        "Featured profile badge",
        "Mentorship tools",
        "Invoice management",
        "Dedicated support",
      ],
      cta: "/freelancer/signup",
    },
  ];

  const sponsorPlans = [
    {
      name: "Silver",
      points: 700,
      popular: false,
      features: [
        "Logo on event banners",
        "1 stall reservation",
        "Basic candidate access",
        "Post-event report",
      ],
      cta: "/sponsors",
    },
    {
      name: "Gold",
      points: 1500,
      popular: true,
      features: [
        "Premium banner placement",
        "2 stall reservations",
        "Full candidate database",
        "Brand visibility package",
        "Social media promotion",
      ],
      cta: "/sponsors",
    },
    {
      name: "Platinum",
      points: 3000,
      popular: false,
      features: [
        "Title sponsorship",
        "3 stall reservations",
        "Exclusive candidate access",
        "Keynote speaking slot",
        "Full marketing toolkit",
        "Dedicated liaison",
      ],
      cta: "/sponsors",
    },
  ];

  const edutechPlans = [
    {
      name: "Starter",
      points: 0,
      popular: false,
      features: [
        "Up to 50 students",
        "Basic dashboard",
        "Attendance tracking",
        "Email support",
      ],
      cta: "/edutech/login",
    },
    {
      name: "Growth",
      points: 1000,
      popular: true,
      features: [
        "Up to 500 students",
        "Placement tracking",
        "Payment management",
        "Analytics & reports",
        "Priority support",
      ],
      cta: "/edutech/login",
    },
    {
      name: "Enterprise",
      points: 3000,
      popular: false,
      features: [
        "Unlimited students",
        "Multi-branch support",
        "Custom branding",
        "API integrations",
        "Dedicated manager",
        "White-label portal",
      ],
      cta: "/edutech/login",
    },
  ];

  const tabIcons: Record<string, React.ReactNode> = {
    candidates: <User className="h-4 w-4" />,
    employers: <Building2 className="h-4 w-4" />,
    freelancers: <Award className="h-4 w-4" />,
    sponsors: <Handshake className="h-4 w-4" />,
    edutech: <GraduationCap className="h-4 w-4" />,
  };

  const renderPlans = (plans: typeof candidatePlans) => (
    <div className={`grid gap-6 ${plans.length === 2 ? 'md:grid-cols-2 max-w-3xl mx-auto' : plans.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
      {plans.map((plan) => {
        const isFree = plan.points === 0;
        return (
          <Card
            key={plan.name}
            className={`relative flex flex-col transition-all duration-300 hover:shadow-lg ${
              plan.popular ? "border-primary shadow-md scale-[1.02]" : "border-border"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground gap-1 px-3 py-1">
                  <Star className="h-3 w-3" /> Most Popular
                </Badge>
              </div>
            )}
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold text-foreground">
                  {isFree ? "Free" : `${plan.points.toLocaleString("en-IN")} pts`}
                </span>
                {!isFree && (
                  <span className="text-muted-foreground text-sm ml-1">/month</span>
                )}
              </div>
              {!isFree && (
                <CardDescription className="text-xs text-muted-foreground mt-1">
                  ≈ ₹{(plan.points * 5).toLocaleString("en-IN")} equivalent
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                asChild
              >
                <Link to={plan.cta}>
                  {isFree ? "Get Started Free" : "Choose Plan"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-hero text-white text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Simple, Points-Based Pricing
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-4">
            All plans use wallet points. Load points via payment gateway and use them for any service.
          </p>
          <Badge variant="secondary" className="text-sm px-4 py-1.5">
            ₹5,000 = 1,000 Points
          </Badge>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 container mx-auto px-4">
        <Tabs defaultValue="candidates" className="w-full">
          <TabsList className="flex flex-wrap justify-center gap-1 mb-10 h-auto bg-transparent">
            {[
              { value: "candidates", label: "Candidates" },
              { value: "employers", label: "Employers" },
              { value: "sponsors", label: "Sponsors" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-5 py-2.5 rounded-full border border-border"
              >
                {tabIcons[tab.value]}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="candidates">{renderPlans(candidatePlans)}</TabsContent>
          <TabsContent value="employers">{renderPlans(employerPlans)}</TabsContent>
          <TabsContent value="sponsors">{renderPlans(sponsorPlans)}</TabsContent>
        </Tabs>
      </section>

      {/* Why this price FAQ */}
      <section className="pb-16 container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <WhyPriceFAQ />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-muted/50 text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-foreground">Need a Custom Plan?</h2>
          <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
            Contact us for enterprise-grade solutions tailored to your organization's needs.
          </p>
          <Button size="lg" asChild>
            <Link to="/contact">Contact Sales</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default PricingPage;
