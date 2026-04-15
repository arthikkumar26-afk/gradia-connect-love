import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, MapPin, Download, Check, Star, Crown, Gem, Zap, Shield } from "lucide-react";

export default function EventSponsorshipDeck() {
  const packages = [
    {
      tier: "Bronze",
      points: "5,000 pts",
      icon: Shield,
      color: "text-amber-700",
      benefits: [
        "Logo on event website",
        "1 complimentary pass",
        "Social media mention (1 post)",
        "Website listing with link"
      ]
    },
    {
      tier: "Silver",
      points: "12,000 pts",
      icon: Star,
      color: "text-gray-400",
      benefits: [
        "All Bronze benefits",
        "3 complimentary passes",
        "Booth space (2x2m)",
        "Social media mentions (3 posts)",
        "Logo on printed materials"
      ]
    },
    {
      tier: "Gold",
      points: "25,000 pts",
      icon: Zap,
      color: "text-yellow-500",
      popular: true,
      benefits: [
        "All Silver benefits",
        "5 complimentary passes",
        "Premium booth space (3x3m)",
        "Speaking opportunity (5 min)",
        "Logo on event t-shirts",
        "Email blast to attendees"
      ]
    },
    {
      tier: "Platinum",
      points: "50,000 pts",
      icon: Gem,
      color: "text-blue-400",
      benefits: [
        "All Gold benefits",
        "10 complimentary passes",
        "Large booth space (4x4m)",
        "Keynote speaking slot (15 min)",
        "Logo on stage backdrop",
        "Dedicated newsletter feature",
        "VIP networking access"
      ]
    },
    {
      tier: "Diamond",
      points: "1,00,000 pts",
      icon: Crown,
      color: "text-purple-400",
      benefits: [
        "All Platinum benefits",
        "20 complimentary passes",
        "Premium booth (6x6m) with branding",
        "Keynote speaking slot (30 min)",
        "Title sponsor recognition",
        "Exclusive branding on all materials",
        "Post-event attendee data access",
        "Year-round website banner",
        "Priority stall location"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4">Exclusive Event</Badge>
          <h1 className="text-5xl font-bold mb-4">TechWave Summit 2025</h1>
          <p className="text-xl text-muted-foreground">
            India's Premier Technology & Innovation Conference
          </p>
        </div>

        {/* Event Details */}
        <Card className="p-8 mb-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <Calendar className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Event Date</h3>
                <p className="text-muted-foreground">12 July 2025</p>
                <p className="text-sm text-muted-foreground">9:00 AM - 6:00 PM</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <MapPin className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Venue</h3>
                <p className="text-muted-foreground">Bangalore International Convention Centre</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Users className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold mb-1">Expected Audience</h3>
                <p className="text-muted-foreground">3,000+ attendees</p>
                <p className="text-sm text-muted-foreground">CTOs, VPs, Engineers</p>
              </div>
            </div>
          </div>
        </Card>

        {/* About Event */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6">About TechWave Summit</h2>
          <Card className="p-8">
            <p className="text-muted-foreground mb-4">
              TechWave Summit is India's largest gathering of technology leaders, featuring keynotes from industry pioneers, hands-on workshops, and unparalleled networking opportunities.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">50+</div>
                <div className="text-sm text-muted-foreground">Expert Speakers</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">30+</div>
                <div className="text-sm text-muted-foreground">Technical Sessions</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary mb-2">100+</div>
                <div className="text-sm text-muted-foreground">Companies Attending</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Sponsorship Packages */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-2 text-center">Sponsorship Packages</h2>
          <p className="text-center text-muted-foreground mb-8">Choose a tier that fits your brand goals. All values in sponsorship points.</p>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-5">
            {packages.map((pkg) => {
              const Icon = pkg.icon;
              return (
                <Card key={pkg.tier} className={`p-5 relative ${pkg.popular ? 'border-primary ring-2 ring-primary/20' : ''}`}>
                  {pkg.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs">Most Popular</Badge>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-5 w-5 ${pkg.color}`} />
                    <h3 className="text-lg font-bold">{pkg.tier}</h3>
                  </div>
                  <div className="text-2xl font-bold text-primary mb-4">{pkg.points}</div>
                  <ul className="space-y-2 mb-5">
                    {pkg.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-xs">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" size="sm" variant={pkg.popular ? "default" : "outline"}>
                    Select {pkg.tier}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Download CTA */}
        <Card className="p-8 text-center bg-primary/5">
          <h2 className="text-2xl font-bold mb-4">Get the Complete Event Deck</h2>
          <p className="text-muted-foreground mb-6">
            Download our comprehensive sponsorship deck with detailed information, audience demographics, and media coverage plans.
          </p>
          <Button size="lg">
            <Download className="mr-2 h-5 w-5" />
            Download Event Deck (PDF)
          </Button>
        </Card>
      </div>
    </div>
  );
}
