import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Globe, 
  Megaphone, 
  Mail, 
  Video, 
  Image, 
  Mic,
  Users,
  TrendingUp
} from "lucide-react";

const brandingOptions = [
  {
    id: "homepage",
    icon: Globe,
    title: "Homepage Sponsor Highlight",
    description: "Featured logo on Gradia homepage carousel",
    reach: "50,000+ monthly visitors",
    value: "High",
    price: 50000,
  },
  {
    id: "banner",
    icon: Image,
    title: "Event Banner Branding",
    description: "Your logo on all event banners and standees",
    reach: "10,000+ event attendees",
    value: "Very High",
    price: 75000,
  },
  {
    id: "social",
    icon: Megaphone,
    title: "Social Media Promotions",
    description: "Dedicated posts on LinkedIn, Twitter, Instagram",
    reach: "25,000+ followers",
    value: "Medium",
    price: 30000,
  },
  {
    id: "email",
    icon: Mail,
    title: "Email Campaign Inclusion",
    description: "Feature in newsletters sent to candidates",
    reach: "100,000+ subscribers",
    value: "High",
    price: 40000,
  },
  {
    id: "stage",
    icon: Mic,
    title: "Stage Announcements",
    description: "MC mentions and stage branding",
    reach: "5,000+ attendees per event",
    value: "Medium",
    price: 25000,
  },
  {
    id: "video",
    icon: Video,
    title: "Video Promotions",
    description: "Feature in event recap and promo videos",
    reach: "20,000+ video views",
    value: "High",
    price: 60000,
  },
];

export function BrandVisibility() {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(["homepage", "banner"]);

  const toggleOption = (id: string) => {
    setSelectedOptions(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const totalPrice = brandingOptions
    .filter(opt => selectedOptions.includes(opt.id))
    .reduce((sum, opt) => sum + opt.price, 0);

  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
            Add-On Services
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Maximize Your Brand Visibility
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Enhance your sponsorship with premium branding add-ons. Select the options that best fit your marketing goals.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Options Grid */}
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
            {brandingOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedOptions.includes(option.id);
              return (
                <Card 
                  key={option.id}
                  className={`cursor-pointer transition-all duration-300 ${
                    isSelected 
                      ? 'ring-2 ring-teal-500 bg-teal-50/50 dark:bg-teal-950/30' 
                      : 'hover:shadow-lg'
                  }`}
                  onClick={() => toggleOption(option.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isSelected 
                          ? 'bg-gradient-to-br from-teal-500 to-cyan-500' 
                          : 'bg-muted'
                      }`}>
                        <Icon className={`h-6 w-6 ${isSelected ? 'text-white' : 'text-muted-foreground'}`} />
                      </div>
                      <Switch 
                        checked={isSelected}
                        onCheckedChange={() => toggleOption(option.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    <h3 className="font-semibold text-foreground mb-1">{option.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{option.description}</p>

                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{option.reach}</span>
                      </div>
                      <Badge 
                        variant={option.value === "Very High" ? "default" : "secondary"}
                        className={option.value === "Very High" ? "bg-gradient-to-r from-teal-500 to-cyan-500 border-0" : ""}
                      >
                        {option.value}
                      </Badge>
                    </div>

                    <div className="mt-3 text-right">
                      <span className="text-lg font-bold text-foreground">₹{option.price.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Summary Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-teal-400" />
                  Selected Add-Ons
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedOptions.length === 0 ? (
                  <p className="text-slate-400 text-sm">No add-ons selected</p>
                ) : (
                  <>
                    {brandingOptions
                      .filter(opt => selectedOptions.includes(opt.id))
                      .map((opt) => (
                        <div key={opt.id} className="flex items-center justify-between py-2 border-b border-white/10">
                          <span className="text-sm text-slate-300">{opt.title}</span>
                          <span className="text-white font-medium">₹{opt.price.toLocaleString()}</span>
                        </div>
                      ))}

                    <div className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-400">Total Reach</span>
                        <span className="text-white font-semibold">200,000+</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Total Price</span>
                        <span className="text-2xl font-bold text-teal-400">
                          ₹{totalPrice.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4">
                  <Label className="text-xs text-slate-400">
                    Add these options to your sponsorship package during checkout.
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
