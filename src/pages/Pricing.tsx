import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Star, Zap, Crown, Rocket, Building2, User, Award, GraduationCap, Handshake } from "lucide-react";
import { WhyPriceFAQ } from "@/components/shared/WhyPriceFAQ";
import { PLANS } from "@/config/plans";

const PricingPage = () => {
  const candidatePlans = PLANS.candidate;
  const employerPlans = PLANS.employer;
  const freelancerPlans = PLANS.freelancer;
  const sponsorPlans = PLANS.sponsor;
  const edutechPlans = PLANS.edutech;

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
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-4">
            Candidates pay a one-time ₹5,000 registration fee. Employers & sponsors use wallet points.
          </p>
          <Badge variant="secondary" className="text-sm px-4 py-1.5">
            ₹5,000 Registration • Instant Dashboard Access
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

          <TabsContent value="candidates">
            <div className="max-w-2xl mx-auto">
              <Card className="relative border-primary shadow-lg">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground gap-1 px-3 py-1">
                    <Star className="h-3 w-3" /> One-Time Registration
                  </Badge>
                </div>
                <CardHeader className="text-center pb-2 pt-8">
                  <CardTitle className="text-2xl">Candidate Registration</CardTitle>
                  <div className="mt-4">
                    <span className="text-5xl font-bold text-foreground">₹5,000</span>
                    <span className="text-muted-foreground text-sm ml-2">one-time</span>
                  </div>
                  <CardDescription className="text-sm text-muted-foreground mt-2">
                    Pay once at signup to activate your candidate dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col">
                  <ul className="space-y-3 mb-6">
                    {[
                      "Full access to your candidate dashboard",
                      "Browse all jobs across India",
                      "Build & manage your professional profile",
                      "Apply to jobs and track applications",
                      "Unlock premium features anytime from the dashboard",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" size="lg" asChild>
                    <Link to="/candidate/signup">Sign Up & Pay ₹5,000</Link>
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Secure payment via Razorpay. Dashboard unlocks instantly after payment.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
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
