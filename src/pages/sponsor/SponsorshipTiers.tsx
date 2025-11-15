import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function SponsorshipTiers() {
  const tiers = [
    {
      name: "Silver",
      price: "₹35,000",
      period: "/year",
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
      price: "₹75,000",
      period: "/year",
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
      price: "₹1,50,000",
      period: "/year",
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
          <p className="text-xl text-muted-foreground">
            Choose the perfect sponsorship plan for your brand
          </p>
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
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
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
