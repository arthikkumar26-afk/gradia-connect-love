import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  GraduationCap, Users, BarChart3, Megaphone, CalendarCheck, Mail,
  CheckCircle, Star, ArrowRight, Building2, Globe, TrendingUp,
  Layers, ShieldCheck, MonitorPlay, BookOpen, Rocket, Target,
  BanknoteIcon, LayoutGrid, Zap
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Building2,
    title: "Institute Registration",
    description: "Register your training institute, coaching center, or edutech company on Gradia's platform.",
  },
  {
    icon: Users,
    title: "Candidate Follow-up",
    description: "Track candidates who attended your training programs and monitor their placement journey.",
  },
  {
    icon: Megaphone,
    title: "Banner Ads & Featured Listings",
    description: "Display your institute banners on Gradia homepage and get featured course listings for maximum visibility.",
  },
  {
    icon: Mail,
    title: "Email & SMS Campaigns",
    description: "Send promotional campaigns to Gradia's verified candidate pool to attract more students.",
  },
  {
    icon: CalendarCheck,
    title: "Job Mela Stall Booking",
    description: "Reserve stalls at Gradia's pan-India job mela events to promote your institute directly.",
  },
  {
    icon: BarChart3,
    title: "Analytics & ROI Dashboard",
    description: "Track impressions, clicks, enrollments, and campaign ROI with real-time analytics.",
  },
  {
    icon: MonitorPlay,
    title: "Course Showcase",
    description: "List your courses, workshops, and certifications to attract the right audience.",
  },
  {
    icon: ShieldCheck,
    title: "Verified Institute Badge",
    description: "Get a verified badge after background checks to build trust with prospective students.",
  },
  {
    icon: Globe,
    title: "Pan-India Reach",
    description: "Access Gradia's nationwide candidate network across all industries and categories.",
  },
];

const marketingAddons = [
  { name: "Homepage Banner Ad (1 week)", price: "₹2,999", icon: LayoutGrid },
  { name: "Featured Course Listing (1 month)", price: "₹1,499", icon: Star },
  { name: "Email Campaign (5,000 candidates)", price: "₹3,499", icon: Mail },
  { name: "SMS Campaign (2,000 candidates)", price: "₹1,999", icon: Zap },
  { name: "Job Mela Stall (per event)", price: "₹7,999", icon: CalendarCheck },
  { name: "Social Media Feature Post", price: "₹999", icon: Megaphone },
];

const plans = [
  {
    name: "Starter",
    monthlyPrice: "₹0",
    annualPrice: "₹0",
    description: "Get started with basic visibility",
    popular: false,
    features: [
      "Institute profile listing",
      "Up to 3 course listings",
      "Basic analytics dashboard",
      "Community support",
      "Gradia candidate directory access",
    ],
    cta: "Get Started Free",
  },
  {
    name: "Growth",
    monthlyPrice: "₹4,999",
    annualPrice: "₹49,990",
    description: "Scale your marketing reach",
    popular: true,
    features: [
      "Everything in Starter",
      "Up to 15 course listings",
      "1 homepage banner ad / month",
      "2 email campaigns / month",
      "Candidate follow-up tracker",
      "Verified institute badge",
      "Priority search visibility",
      "Dedicated relationship manager",
    ],
    cta: "Start Growing",
  },
  {
    name: "Enterprise",
    monthlyPrice: "₹14,999",
    annualPrice: "₹1,49,990",
    description: "Full marketing suite for large institutes",
    popular: false,
    features: [
      "Everything in Growth",
      "Unlimited course listings",
      "4 homepage banner ads / month",
      "Unlimited email & SMS campaigns",
      "Job Mela stall priority booking",
      "Custom branding on listings",
      "Advanced analytics & reports",
      "API access for integrations",
      "White-label candidate portal",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
  },
];

const stats = [
  { value: "500+", label: "Training Institutes" },
  { value: "2L+", label: "Candidate Network" },
  { value: "50+", label: "Job Mela Events / Year" },
  { value: "95%", label: "Client Satisfaction" },
];

const testimonials = [
  {
    name: "Rajesh Kumar",
    role: "Director, TechSkill Academy",
    text: "Gradia's EduTech portal helped us reach 3x more students. The banner ads and email campaigns are incredibly effective.",
    rating: 5,
  },
  {
    name: "Priya Sharma",
    role: "CEO, NextGen Coaching",
    text: "The candidate follow-up feature is a game-changer. We can track our trained students' placement journey seamlessly.",
    rating: 5,
  },
  {
    name: "Amit Patel",
    role: "Founder, SkillBridge Institute",
    text: "Job Mela stall bookings directly from the platform saved us so much time. Highly recommend to all institutes!",
    rating: 4,
  },
];

export default function EduTechLanding() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
              <Rocket className="h-3.5 w-3.5 mr-1.5" />
              For Training Institutes & EduTech Companies
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Grow Your Institute with Gradia EduTech
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Register your institute, showcase courses, track trained candidates, and run powerful marketing campaigns — all from one platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8" asChild>
                <Link to="/edutech/signup">
                  Register Your Institute
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                <Link to="/contact">Request a Demo</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-b bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything Your Institute Needs</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From registration to marketing to candidate tracking — a complete suite for training institutes.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} className="hover:shadow-lg transition-all hover:-translate-y-1 border-border/50">
                <CardHeader>
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Subscription Plans</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
              Choose the plan that fits your institute's growth stage. Upgrade anytime.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Label htmlFor="billing-toggle" className={`text-sm font-medium ${!isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>
                Monthly
              </Label>
              <Switch id="billing-toggle" checked={isAnnual} onCheckedChange={setIsAnnual} />
              <Label htmlFor="billing-toggle" className={`text-sm font-medium ${isAnnual ? 'text-primary' : 'text-muted-foreground'}`}>
                Annual
              </Label>
              {isAnnual && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Save ~17%
                </Badge>
              )}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <Card
                key={plan.name}
                className={`relative flex flex-col ${plan.popular ? 'border-primary shadow-xl ring-2 ring-primary/20 scale-105' : 'border-border/50'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-4">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">
                      {isAnnual ? plan.annualPrice : plan.monthlyPrice}
                    </span>
                    <span className="text-muted-foreground text-sm ml-1">
                      {plan.monthlyPrice === "₹0" ? "" : isAnnual ? "/year" : "/month"}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <ul className="space-y-3 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pay-per-Campaign Add-ons */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Pay-per-Campaign Add-ons</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Need extra marketing power? Purchase individual campaigns on top of your plan.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {marketingAddons.map((addon) => (
              <Card key={addon.name} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <addon.icon className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm mb-1">{addon.name}</h3>
                      <p className="text-xl font-bold text-primary">{addon.price}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4">
                    Purchase
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Register", desc: "Sign up your institute with basic details", icon: Building2 },
              { step: "2", title: "List Courses", desc: "Add your courses, workshops & certifications", icon: BookOpen },
              { step: "3", title: "Run Campaigns", desc: "Use banner ads, emails & SMS to reach candidates", icon: Target },
              { step: "4", title: "Track & Grow", desc: "Monitor ROI, follow up with candidates", icon: TrendingUp },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="h-14 w-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Trusted by Institutes</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t) => (
              <Card key={t.name} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 italic">"{t.text}"</p>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Grow Your Institute?</h2>
          <p className="text-lg opacity-90 mb-8 max-w-xl mx-auto">
            Join 500+ training institutes already using Gradia to reach more students and boost placements.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8" asChild>
              <Link to="/edutech/signup">Register Now — It's Free</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/contact">Talk to Sales</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
