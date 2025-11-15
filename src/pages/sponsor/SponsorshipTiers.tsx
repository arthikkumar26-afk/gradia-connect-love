import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";

export default function SponsorshipTiers() {
  const tiers = [
    {
      name: "Silver",
      price: "₹25,000",
      period: "/year",
      features: [
        "Logo placement",
        "Monthly newsletter mention",
        "Access to sponsor toolkit"
      ]
    },
    {
      name: "Gold",
      price: "₹55,000",
      period: "/year",
      popular: true,
      features: [
        "All Silver benefits",
        "Blog feature",
        "Event promotion",
        "Featured client listing"
      ]
    },
    {
      name: "Platinum",
      price: "₹95,000",
      period: "/year",
      features: [
        "All Gold benefits",
        "Sponsored webinar",
        "Custom marketing campaign",
        "Priority support"
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
                  { feature: "Logo Placement", silver: true, gold: true, platinum: true },
                  { feature: "Newsletter Mention", silver: true, gold: true, platinum: true },
                  { feature: "Sponsor Toolkit", silver: true, gold: true, platinum: true },
                  { feature: "Blog Feature", silver: false, gold: true, platinum: true },
                  { feature: "Event Promotion", silver: false, gold: true, platinum: true },
                  { feature: "Sponsored Webinar", silver: false, gold: false, platinum: true },
                  { feature: "Custom Marketing", silver: false, gold: false, platinum: true },
                  { feature: "Priority Support", silver: false, gold: false, platinum: true }
                ].map((row) => (
                  <tr key={row.feature} className="border-b">
                    <td className="py-4 px-4">{row.feature}</td>
                    <td className="text-center py-4 px-4">
                      {row.silver ? <Check className="h-5 w-5 text-primary mx-auto" /> : "—"}
                    </td>
                    <td className="text-center py-4 px-4">
                      {row.gold ? <Check className="h-5 w-5 text-primary mx-auto" /> : "—"}
                    </td>
                    <td className="text-center py-4 px-4">
                      {row.platinum ? <Check className="h-5 w-5 text-primary mx-auto" /> : "—"}
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
