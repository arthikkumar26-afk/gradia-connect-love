import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Award,
  TrendingUp,
  Users,
  Target,
  BarChart3,
  Megaphone,
  Calendar,
  Gift,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const benefits = [
  {
    icon: TrendingUp,
    title: "Brand Visibility",
    description: "Get featured across our platform, job fairs, and marketing materials to reach thousands of candidates and employers.",
  },
  {
    icon: Users,
    title: "Talent Network Access",
    description: "Connect directly with a diverse pool of qualified candidates and top employers in your industry.",
  },
  {
    icon: Target,
    title: "Targeted Marketing",
    description: "Promote your brand to specific demographics, industries, and regions that align with your goals.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Track your sponsorship performance with detailed analytics on impressions, clicks, and leads generated.",
  },
  {
    icon: Megaphone,
    title: "Event Sponsorship",
    description: "Sponsor job melas, workshops, and career events to showcase your brand to engaged audiences.",
  },
  {
    icon: Calendar,
    title: "Priority Scheduling",
    description: "Get priority access to premium event slots and exclusive sponsorship opportunities throughout the year.",
  },
];

const sponsorshipOptions = [
  {
    tier: "Bronze",
    price: "₹25,000",
    period: "per quarter",
    features: [
      "Logo on website",
      "Social media mentions",
      "Monthly analytics report",
      "1 Job mela booth",
    ],
    recommended: false,
  },
  {
    tier: "Silver",
    price: "₹50,000",
    period: "per quarter",
    features: [
      "Everything in Bronze",
      "Featured partner page",
      "Quarterly newsletters",
      "2 Job mela booths",
      "Email campaign inclusion",
    ],
    recommended: true,
  },
  {
    tier: "Gold",
    price: "₹1,00,000",
    period: "per quarter",
    features: [
      "Everything in Silver",
      "Homepage banner ads",
      "Priority event scheduling",
      "Unlimited job mela booths",
      "Dedicated account manager",
      "Custom branding materials",
    ],
    recommended: false,
  },
];

export default function SponsorBenefits() {
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const handleContinue = () => {
    if (selectedTier) {
      // Navigate to dashboard with selected tier
      navigate("/sponsor/dashboard");
    }
  };

  const handleSkip = () => {
    navigate("/sponsor/dashboard");
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Award className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Welcome to Gradia Connect Partner Program</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            As a sponsor, you'll unlock exclusive benefits that help grow your brand and connect with top talent.
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-semibold text-center mb-8">What You Get as a Partner</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;
              return (
                <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">{benefit.title}</h3>
                      <p className="text-sm text-muted-foreground">{benefit.description}</p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Sponsorship Tiers */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-center mb-2">Choose Your Partnership Level</h2>
          <p className="text-center text-muted-foreground mb-8">
            Select a tier to get started or explore your dashboard first
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {sponsorshipOptions.map((option) => (
              <Card
                key={option.tier}
                className={`p-6 cursor-pointer transition-all ${
                  selectedTier === option.tier
                    ? "ring-2 ring-primary shadow-lg"
                    : "hover:shadow-md"
                } ${option.recommended ? "border-primary" : ""}`}
                onClick={() => setSelectedTier(option.tier)}
              >
                {option.recommended && (
                  <div className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full w-fit mb-4">
                    Most Popular
                  </div>
                )}
                <h3 className="text-xl font-bold mb-1">{option.tier}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{option.price}</span>
                  <span className="text-muted-foreground text-sm"> {option.period}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {option.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  variant={selectedTier === option.tier ? "default" : "outline"}
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTier(option.tier);
                  }}
                >
                  {selectedTier === option.tier ? "Selected" : `Select ${option.tier}`}
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!selectedTier}
            className="min-w-[200px]"
          >
            Continue with {selectedTier || "Selection"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button variant="ghost" size="lg" onClick={handleSkip}>
            Skip for now
          </Button>
        </div>

        {/* Additional Info */}
        <div className="mt-12 text-center">
          <Card className="inline-flex items-center gap-3 p-4 bg-muted/50">
            <Gift className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Special Offer:</span> Sign up for an annual plan and get 2 months free!
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
