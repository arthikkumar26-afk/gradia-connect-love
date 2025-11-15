import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { UserPlus, Mail, Lock, Building2, User, Phone, Globe, Check } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export default function SponsorSignup() {
  const [step, setStep] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    website: "",
    companyDescription: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Registration attempt:", formData, "Terms accepted:", acceptedTerms);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">
            {step === 1 ? "Become a Partner" : "Sponsorship Agreement"}
          </h1>
          <p className="text-muted-foreground">
            {step === 1 ? "Join our network of sponsors and grow your brand visibility" : "Review sponsorship details"}
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <div className={`h-2 w-16 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-2 w-16 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
          </div>
        </div>

        <Card className="p-8">
          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="companyName"
                      name="companyName"
                      type="text"
                      placeholder="Your Company Ltd."
                      value={formData.companyName}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Contact Name */}
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="contactName"
                      name="contactName"
                      type="text"
                      placeholder="John Doe"
                      value={formData.contactName}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="contact@company.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Website */}
              <div className="space-y-2">
                <Label htmlFor="website">Website (Optional)</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="website"
                    name="website"
                    type="url"
                    placeholder="https://yourcompany.com"
                    value={formData.website}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Company Description */}
              <div className="space-y-2">
                <Label htmlFor="companyDescription">Company Description *</Label>
                <Textarea
                  id="companyDescription"
                  name="companyDescription"
                  placeholder="Tell us about your company, what you do, and why you'd like to sponsor..."
                  value={formData.companyDescription}
                  onChange={handleChange}
                  rows={4}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full">
                Register as Sponsor
              </Button>

              <div className="text-center text-sm text-muted-foreground space-y-2">
                <p>
                  Already have an account?{" "}
                  <Link to="/sponsor/login" className="text-primary hover:underline font-medium">
                    Sign in here
                  </Link>
                </p>
                <p>
                  <Link to="/" className="hover:underline">
                    Back to homepage
                  </Link>
                </p>
              </div>
            </form>
          ) : (
            <div className="space-y-8">
              {/* Sponsorship Proposal */}
              <div>
                <h2 className="text-2xl font-bold mb-3">Sponsorship Proposal</h2>
                <p className="text-muted-foreground">
                  Partner with Gradia to reach thousands of talented professionals and grow your brand visibility in the recruitment industry. Our platform connects job seekers with employers across multiple sectors.
                </p>
              </div>

              {/* Benefits of Sponsorship */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Benefits of Sponsorship</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Brand Visibility</p>
                      <p className="text-sm text-muted-foreground">Logo placement across platform and marketing materials</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Lead Generation</p>
                      <p className="text-sm text-muted-foreground">Direct access to qualified candidates and employers</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Event Sponsorship</p>
                      <p className="text-sm text-muted-foreground">Featured presence at job fairs and career events</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Analytics Dashboard</p>
                      <p className="text-sm text-muted-foreground">Track sponsorship performance with detailed insights</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Content Marketing</p>
                      <p className="text-sm text-muted-foreground">Featured blog posts and social media promotion</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Dedicated Support</p>
                      <p className="text-sm text-muted-foreground">Personal account manager for all your needs</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms & Conditions */}
              <div>
                <h3 className="text-xl font-semibold mb-4">Terms & Conditions</h3>
                <div className="border rounded-lg p-6 bg-muted/30 max-h-64 overflow-y-auto space-y-4 text-sm">
                  <div>
                    <p className="font-semibold mb-1">1. Sponsorship Agreement</p>
                    <p className="text-muted-foreground">
                      By registering as a sponsor, you agree to enter into a sponsorship agreement with Gradia. Final terms will be determined based on your selected tier.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1">2. Payment Terms</p>
                    <p className="text-muted-foreground">
                      Payment is required within 30 days of invoice date. Sponsorship benefits begin upon receipt of payment.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1">3. Brand Guidelines</p>
                    <p className="text-muted-foreground">
                      Sponsors must provide logos and marketing materials that comply with our brand guidelines. We reserve the right to reject materials that don't meet quality standards.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1">4. Duration & Renewal</p>
                    <p className="text-muted-foreground">
                      Sponsorship periods are typically 12 months with options for renewal. Early termination may be subject to fees as outlined in your agreement.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1">5. Data Privacy</p>
                    <p className="text-muted-foreground">
                      All data shared will be handled in accordance with our privacy policy and applicable data protection regulations including GDPR.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1">6. Liability & Indemnification</p>
                    <p className="text-muted-foreground">
                      Gradia is not liable for any indirect damages resulting from the sponsorship agreement. Sponsors agree to indemnify Gradia against claims arising from sponsor content.
                    </p>
                  </div>
                </div>
              </div>

              {/* Terms Acceptance Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="border rounded-lg p-4 bg-muted/20">
                  <div className="flex items-start gap-3">
                    <Checkbox 
                      id="terms" 
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                      required
                      className="mt-0.5"
                    />
                    <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer font-normal">
                      I have read and agree to the Terms & Conditions, Sponsorship Proposal, and understand the benefits of sponsorship with Gradia. I acknowledge that final sponsorship terms will be finalized based on the selected tier.
                    </Label>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="lg" 
                    className="flex-1" 
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="flex-1" 
                    disabled={!acceptedTerms}
                  >
                    Complete Registration
                  </Button>
                </div>
              </form>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
