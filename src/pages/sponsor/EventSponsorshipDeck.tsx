import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, MapPin, Download, Check } from "lucide-react";

export default function EventSponsorshipDeck() {
  const packages = [
    {
      tier: "Silver",
      price: "₹50,000",
      benefits: [
        "Logo on event materials",
        "2 complimentary passes",
        "Social media mention",
        "Website listing"
      ]
    },
    {
      tier: "Gold",
      price: "₹1,25,000",
      benefits: [
        "All Silver benefits",
        "5 complimentary passes",
        "Booth space (3x3m)",
        "Speaking opportunity (5 min)",
        "Logo on event t-shirts"
      ]
    },
    {
      tier: "Platinum",
      price: "₹2,50,000",
      benefits: [
        "All Gold benefits",
        "10 complimentary passes",
        "Premium booth space (6x6m)",
        "Keynote speaking slot (20 min)",
        "Title sponsor recognition",
        "Logo on stage backdrop"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-6xl">
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
          <h2 className="text-3xl font-bold mb-8 text-center">Sponsorship Packages</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <Card key={pkg.tier} className="p-6">
                <h3 className="text-2xl font-bold mb-2">{pkg.tier}</h3>
                <div className="text-3xl font-bold text-primary mb-6">{pkg.price}</div>
                <ul className="space-y-3 mb-6">
                  {pkg.benefits.map((benefit) => (
                    <li key={benefit} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" variant={pkg.tier === "Gold" ? "default" : "outline"}>
                  Select {pkg.tier}
                </Button>
              </Card>
            ))}
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
