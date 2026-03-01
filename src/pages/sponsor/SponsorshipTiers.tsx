import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function SponsorshipTiers() {
  const [isAnnual, setIsAnnual] = useState(false);

  const tiers = [
    {
      name: "Silver",
      monthlyPrice: "₹3,500",
      annualPrice: "₹35,000",
      features: [
        "Logo on posters at 4 job melas/year",
        "Access to 200 resumes per mela",
        "Small logo size (10x10 cm)",
        "Monthly job mela updates",
        "Basic analytics dashboard"
      ]
    },
    {
      name: "Gold",
      monthlyPrice: "₹7,500",
      annualPrice: "₹75,000",
      popular: true,
      features: [
        "Logo on posters at 8 job melas/year",
        "Access to 500 resumes per mela",
        "Medium logo size (20x20 cm)",
        "Priority logo placement on posters",
        "Featured in event announcements",
        "Quarterly performance reports",
        "Dedicated account manager"
      ]
    },
    {
      name: "Platinum",
      monthlyPrice: "₹15,000",
      annualPrice: "₹1,50,000",
      features: [
        "Logo on posters at 12 job melas/year",
        "Unlimited resume access from all melas",
        "Large logo size (30x30 cm)",
        "Top placement on all posters/banners",
        "Company booth space at job melas",
        "Pre-screening of candidates",
        "Custom branding materials",
        "Priority support 24/7"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Sponsorship Tiers</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Choose the perfect sponsorship plan for your brand
          </p>
          <div className="inline-flex items-center gap-3 bg-muted rounded-full p-1">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${!isAnnual ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${isAnnual ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Annual <span className="text-xs opacity-80">(Save ~17%)</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {tiers.map((tier) => (
            <Card key={tier.name} className={`p-8 relative ${tier.popular ? 'border-primary shadow-lg' : ''}`}>
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">{isAnnual ? tier.annualPrice : tier.monthlyPrice}</span>
                  <span className="text-muted-foreground">{isAnnual ? '/year' : '/month'}</span>
                </div>
              </div>
              <ul className="space-y-3 mb-8">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button className="w-full" variant={tier.popular ? "default" : "outline"}>
                Choose {tier.name}
              </Button>
            </Card>
          ))}
        </div>

        {/* Comparison Table */}
        <Card className="p-8">
          <h2 className="text-2xl font-bold mb-6">Feature Comparison</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-4 px-4">Feature</th>
                  <th className="text-center py-4 px-4">Silver</th>
                  <th className="text-center py-4 px-4">Gold</th>
                  <th className="text-center py-4 px-4">Platinum</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: "Job Melas per Year", silver: "4", gold: "8", platinum: "12" },
                  { feature: "Resume Access per Mela", silver: "200", gold: "500", platinum: "Unlimited" },
                  { feature: "Logo Size on Posters", silver: "Small (10x10cm)", gold: "Medium (20x20cm)", platinum: "Large (30x30cm)" },
                  { feature: "Logo Placement Priority", silver: false, gold: true, platinum: true },
                  { feature: "Company Booth Space", silver: false, gold: false, platinum: true },
                  { feature: "Pre-screening Service", silver: false, gold: false, platinum: true },
                  { feature: "Custom Branding Materials", silver: false, gold: false, platinum: true },
                  { feature: "Dedicated Account Manager", silver: false, gold: true, platinum: true },
                  { feature: "Analytics Dashboard", silver: "Basic", gold: "Advanced", platinum: "Premium" },
                  { feature: "Priority Support", silver: false, gold: false, platinum: true }
                ].map((row) => (
                  <tr key={row.feature} className="border-b">
                    <td className="py-4 px-4">{row.feature}</td>
                    <td className="text-center py-4 px-4">
                      {typeof row.silver === 'boolean' 
                        ? (row.silver ? <Check className="h-5 w-5 text-primary mx-auto" /> : "—")
                        : row.silver
                      }
                    </td>
                    <td className="text-center py-4 px-4">
                      {typeof row.gold === 'boolean' 
                        ? (row.gold ? <Check className="h-5 w-5 text-primary mx-auto" /> : "—")
                        : row.gold
                      }
                    </td>
                    <td className="text-center py-4 px-4">
                      {typeof row.platinum === 'boolean' 
                        ? (row.platinum ? <Check className="h-5 w-5 text-primary mx-auto" /> : "—")
                        : row.platinum
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
