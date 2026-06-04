import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Lock, Star, Crown, Sparkles, Building2, User, Award, GraduationCap, Rocket, Zap } from "lucide-react";
import { WhyPriceFAQ } from "@/components/shared/WhyPriceFAQ";
import { PLANS } from "@/config/plans";
import { CANDIDATE_PLANS, CANDIDATE_PLAN_ORDER } from "@/config/candidatePlans";

const PricingPage = () => {
  const candidatePlans = PLANS.candidate;
  const employerPlans = PLANS.employer;

  const tabIcons: Record<string, React.ReactNode> = {
    candidates: <User className="h-4 w-4" />,
    employers: <Building2 className="h-4 w-4" />,
    freelancers: <Award className="h-4 w-4" />,
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
    <>
      <Helmet>
        <title>Pricing - Gradia</title>
        <meta name="description" content="Transparent pricing for candidates and employers. One-time registration for candidates, flexible plans for employers." />
        <link rel="canonical" href="https://gradiaa.com/pricing" />
      </Helmet>
      <div className="min-h-screen">
      {/* Hero */}
      <section className="py-16 md:py-24 bg-gradient-hero text-white text-center">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-4">
            Candidates choose Free, Starter, Advance, Pro Accelerator, or Elite. Employers & sponsors use wallet points.
          </p>
          <Badge variant="secondary" className="text-sm px-4 py-1.5">
            Candidate plans start at ₹0 • Premium growth plans available
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
            <div className="text-center max-w-2xl mx-auto mb-10">
              <p className="text-sm uppercase tracking-wider text-primary font-semibold mb-2">
                Unlock Interview Intelligence
              </p>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                Know your gaps. Fix them. Get selected.
              </h2>
              <p className="text-muted-foreground">
                Built for serious career growth — candidates with AI reports perform better.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {CANDIDATE_PLAN_ORDER.map((id) => {
                const p = CANDIDATE_PLANS[id];
                const isElite = p.tier === "elite";
                const isPro = p.tier === "pro";
                const isAdvance = p.tier === "advance";
                const isFree = p.tier === "free";
                const monthlyEquivalent = p.priceInr > 0
                  ? Math.round(p.priceInr / p.durationMonths)
                  : 0;

                const cardClass = isElite
                  ? "border-2 border-amber-400/60 bg-gradient-to-b from-amber-50/80 via-yellow-50/40 to-background dark:from-amber-950/30 dark:via-amber-900/10 shadow-[0_0_40px_-12px_rgba(245,158,11,0.45)]"
                  : isPro
                    ? "border-2 border-purple-400/60 bg-gradient-to-b from-purple-50/80 via-indigo-50/40 to-background dark:from-purple-950/30 dark:via-indigo-900/10 shadow-[0_0_40px_-12px_rgba(168,85,247,0.45)] lg:scale-[1.03]"
                    : isAdvance
                      ? "border-2 border-blue-400/50"
                      : "border border-border";

                const ctaClass = isElite
                  ? "bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-white hover:opacity-90 border-0"
                  : isPro
                    ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:opacity-90 border-0"
                    : "";

                return (
                  <Card key={id} className={`relative flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${cardClass}`}>
                    {p.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
                        <Badge className={`gap-1 px-3 py-1 text-[11px] font-semibold ${
                          isElite ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0" :
                          isPro ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0" :
                          "bg-blue-600 text-white border-0"
                        }`}>
                          {isElite ? <Crown className="h-3 w-3" /> : isPro ? <Sparkles className="h-3 w-3" /> : <Star className="h-3 w-3" />}
                          {p.badge}
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="text-center pb-3 pt-6">
                      <div className="flex items-center justify-center gap-2 mb-1">
                        {isElite && <Crown className="h-4 w-4 text-amber-500" />}
                        {isPro && <Rocket className="h-4 w-4 text-purple-600" />}
                        {isAdvance && <Zap className="h-4 w-4 text-blue-600" />}
                        <CardTitle className="text-lg font-bold">{p.name}</CardTitle>
                      </div>
                      <div className="mt-2">
                        <span className={`text-3xl font-extrabold ${isElite ? "bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent" : isPro ? "bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent" : "text-foreground"}`}>
                          ₹{p.priceInr.toLocaleString("en-IN")}
                        </span>
                      </div>
                      <CardDescription className="text-[11px] text-muted-foreground mt-1">
                        {p.durationMonths === 1 ? (isFree ? "Forever" : "/ month") : `${p.durationMonths} months`}
                      </CardDescription>
                      {monthlyEquivalent > 0 && p.durationMonths > 1 && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          ≈ ₹{monthlyEquivalent.toLocaleString("en-IN")}/month
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        For: {p.bestFor}
                      </p>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col px-4">
                      <ul className="space-y-1.5 flex-1 mb-3">
                        {p.perks.map((f) => (
                          <li key={f} className="flex items-start gap-1.5 text-xs text-foreground/90">
                            <Check className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${isElite ? "text-amber-600" : isPro ? "text-purple-600" : isAdvance ? "text-blue-600" : "text-primary"}`} />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>

                      {p.lockedPerks && p.lockedPerks.length > 0 && (
                        <div className="mb-3 rounded-md border border-dashed border-border bg-muted/40 p-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5 flex items-center gap-1">
                            <Lock className="h-3 w-3" /> Locked Features
                          </p>
                          <ul className="space-y-1">
                            {p.lockedPerks.map((f) => (
                              <li key={f} className="flex items-start gap-1.5 text-[11px] text-muted-foreground blur-[0.3px] opacity-80">
                                <Lock className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {p.mentoring && (
                        <div className="mb-3 rounded-md border border-amber-400/40 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20 p-2.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" /> 1-to-1 Mentoring Program
                          </p>
                          <ul className="space-y-1">
                            {p.mentoring.map((f) => (
                              <li key={f} className="flex items-start gap-1.5 text-[11px] text-foreground/80">
                                <Check className="h-3 w-3 mt-0.5 shrink-0 text-amber-600" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <Button asChild className={`w-full mt-auto ${ctaClass}`} variant={isPro || isElite ? "default" : isAdvance ? "default" : isFree ? "outline" : "default"}>
                        <Link to="/candidate/signup">{p.ctaLabel}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-10 grid gap-3 md:grid-cols-3 max-w-4xl mx-auto text-center">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">Improve Your Selection Chances</p>
                <p className="text-xs text-muted-foreground mt-1">Get AI-driven feedback that matters.</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">Track Your Career Growth</p>
                <p className="text-xs text-muted-foreground mt-1">Skill gaps, readiness, and progress in one place.</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold text-foreground">Built for serious career growth</p>
                <p className="text-xs text-muted-foreground mt-1">Trusted by candidates who get selected.</p>
              </div>
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
    </>
  );
};

export default PricingPage;
