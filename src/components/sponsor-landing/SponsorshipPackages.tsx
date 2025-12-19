import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Crown, 
  Diamond, 
  Award, 
  Rocket, 
  Check, 
  Star,
  Users,
  BarChart3,
  Megaphone,
  FileText
} from "lucide-react";

const packages = [
  {
    id: "title",
    name: "Title Sponsor",
    icon: Crown,
    price: "₹15,00,000",
    priceNote: "per event",
    color: "from-amber-500 to-yellow-500",
    bgColor: "bg-gradient-to-br from-amber-50 to-yellow-50",
    borderColor: "border-amber-200",
    popular: false,
    exclusive: true,
    benefits: [
      { icon: Megaphone, text: "Event naming rights" },
      { icon: Star, text: "Prime branding across stages & banners" },
      { icon: Award, text: "Top-visibility premium stall (40 sqm)" },
      { icon: Users, text: "Full candidate data access (unlimited)" },
      { icon: FileText, text: "Dedicated Gradia hiring manager" },
      { icon: BarChart3, text: "Post-event hiring & ROI report" },
      { icon: Check, text: "VIP lounge access" },
      { icon: Check, text: "Stage presentation slot (30 mins)" },
      { icon: Check, text: "Social media feature (5 posts)" },
    ],
    cta: "Become Title Sponsor",
  },
  {
    id: "platinum",
    name: "Platinum Sponsor",
    icon: Diamond,
    price: "₹8,00,000",
    priceNote: "per event",
    color: "from-slate-600 to-slate-800",
    bgColor: "bg-gradient-to-br from-slate-50 to-slate-100",
    borderColor: "border-slate-300",
    popular: true,
    exclusive: false,
    benefits: [
      { icon: Award, text: "Premium stall placement (25 sqm)" },
      { icon: Users, text: "2 private interview rooms" },
      { icon: FileText, text: "Early access to resumes (48hr head start)" },
      { icon: BarChart3, text: "Advanced analytics dashboard" },
      { icon: Check, text: "Banner branding at entrance" },
      { icon: Check, text: "Resume downloads (up to 2000)" },
      { icon: Check, text: "Priority candidate shortlisting" },
      { icon: Check, text: "Social media mentions (3 posts)" },
    ],
    cta: "Reserve Platinum Slot",
  },
  {
    id: "gold",
    name: "Gold Sponsor",
    icon: Award,
    price: "₹4,00,000",
    priceNote: "per event",
    color: "from-teal-500 to-cyan-500",
    bgColor: "bg-gradient-to-br from-teal-50 to-cyan-50",
    borderColor: "border-teal-200",
    popular: false,
    exclusive: false,
    benefits: [
      { icon: Award, text: "Standard stall (15 sqm)" },
      { icon: FileText, text: "Resume access (up to 500)" },
      { icon: Users, text: "Candidate shortlisting tools" },
      { icon: Check, text: "Event-day branding" },
      { icon: Check, text: "Basic analytics report" },
      { icon: Check, text: "1 interview booth" },
      { icon: Check, text: "Logo on event materials" },
    ],
    cta: "Book Gold Package",
  },
  {
    id: "startup",
    name: "Startup / Education Partner",
    icon: Rocket,
    price: "₹1,50,000",
    priceNote: "per event",
    color: "from-violet-500 to-purple-500",
    bgColor: "bg-gradient-to-br from-violet-50 to-purple-50",
    borderColor: "border-violet-200",
    popular: false,
    exclusive: false,
    benefits: [
      { icon: Award, text: "Cost-effective stall (10 sqm)" },
      { icon: Users, text: "Shared pavilion space" },
      { icon: FileText, text: "Resume access (up to 200)" },
      { icon: Check, text: "Ideal for startups & colleges" },
      { icon: Check, text: "Basic branding package" },
      { icon: Check, text: "Event listing in catalog" },
    ],
    cta: "Join as Partner",
  },
];

export function SponsorshipPackages() {
  const [selectedPackage, setSelectedPackage] = useState<typeof packages[0] | null>(null);

  return (
    <section id="packages" className="py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
            Sponsorship Tiers
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Choose Your Partnership Level
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select a sponsorship package that aligns with your hiring goals and brand visibility needs.
          </p>
        </div>

        {/* Package Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg, index) => {
            const Icon = pkg.icon;
            return (
              <Card 
                key={pkg.id}
                className={`relative cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl ${pkg.bgColor} ${pkg.borderColor} border-2 overflow-hidden group`}
                onClick={() => setSelectedPackage(pkg)}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {pkg.popular && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white border-0">
                      Most Popular
                    </Badge>
                  </div>
                )}
                {pkg.exclusive && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0">
                      Exclusive
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${pkg.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{pkg.name}</h3>
                </CardHeader>

                <CardContent>
                  <div className="mb-6">
                    <span className="text-3xl font-bold text-foreground">{pkg.price}</span>
                    <span className="text-muted-foreground ml-2 text-sm">{pkg.priceNote}</span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {pkg.benefits.slice(0, 4).map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-teal-500 mt-0.5 flex-shrink-0" />
                        <span>{benefit.text}</span>
                      </li>
                    ))}
                    {pkg.benefits.length > 4 && (
                      <li className="text-sm text-teal-600 font-medium">
                        +{pkg.benefits.length - 4} more benefits
                      </li>
                    )}
                  </ul>

                  <Button 
                    className={`w-full bg-gradient-to-r ${pkg.color} hover:opacity-90 text-white border-0`}
                  >
                    {pkg.cta}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Compare link */}
        <div className="text-center mt-10">
          <Button variant="link" className="text-muted-foreground hover:text-foreground">
            Compare all features →
          </Button>
        </div>
      </div>

      {/* Package Detail Modal */}
      <Dialog open={!!selectedPackage} onOpenChange={() => setSelectedPackage(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedPackage && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${selectedPackage.color} flex items-center justify-center`}>
                    <selectedPackage.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <DialogTitle className="text-2xl">{selectedPackage.name}</DialogTitle>
                    <DialogDescription>
                      {selectedPackage.price} {selectedPackage.priceNote}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="mt-6">
                <h4 className="font-semibold mb-4 text-foreground">All Benefits Included:</h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedPackage.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <benefit.icon className="h-5 w-5 text-teal-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-foreground">{benefit.text}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 flex gap-4">
                  <Button className={`flex-1 bg-gradient-to-r ${selectedPackage.color} hover:opacity-90 text-white`}>
                    {selectedPackage.cta}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedPackage(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
