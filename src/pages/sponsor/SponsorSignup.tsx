import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { UserPlus, Mail, Lock, Building2, User, Phone, Globe, Check, CreditCard, Smartphone, Landmark } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function SponsorSignup() {
  const [step, setStep] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("");
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
    setStep(3);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Registration complete:", formData, "Payment method:", paymentMethod);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">
            {step === 1 ? "Become a Partner" : step === 2 ? "Sponsorship Agreement" : "Payment Method"}
          </h1>
          <p className="text-muted-foreground">
            {step === 1 ? "Join our network of sponsors and grow your brand visibility" : step === 2 ? "Review sponsorship details" : "Choose your payment method"}
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <div className={`h-2 w-16 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-2 w-16 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-2 w-16 rounded-full transition-colors ${step >= 3 ? "bg-primary" : "bg-muted"}`} />
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
          ) : step === 2 ? (
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
                <div className="border rounded-lg p-6 bg-muted/30 max-h-80 overflow-y-auto space-y-3">
                  <div>
                    <p className="font-semibold mb-1 text-sm">1. Sponsorship Agreement</p>
                    <p className="text-muted-foreground leading-relaxed text-[9px]">
                      By registering as a sponsor, you agree to enter into a sponsorship agreement with Gradia. Final terms will be determined based on your selected tier. This agreement constitutes a legally binding contract between you (the "Sponsor") and Gradia (the "Company"). The sponsorship package details, pricing, and deliverables will be outlined in a separate sponsorship agreement document.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1 text-sm">2. Payment Terms</p>
                    <p className="text-muted-foreground leading-relaxed text-[9px]">
                      Payment is required within 30 days of invoice date. Sponsorship benefits begin upon receipt of payment. Late payments may incur interest charges of 1.5% per month or the maximum rate permitted by law. All fees are non-refundable unless otherwise specified in writing. Payment methods include bank transfer, credit card, or other mutually agreed methods.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1 text-sm">3. Brand Guidelines & Content Approval</p>
                    <p className="text-muted-foreground leading-relaxed text-[9px]">
                      Sponsors must provide logos, images, and marketing materials that comply with our brand guidelines. We reserve the right to reject materials that don't meet quality standards or that conflict with our values and policies. All sponsor content must be submitted at least 5 business days before publication. Gradia retains final approval rights over all sponsor content displayed on the platform.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1 text-sm">4. Duration, Renewal & Termination</p>
                    <p className="text-muted-foreground leading-relaxed text-[9px]">
                      Sponsorship periods are typically 12 months with options for renewal. Either party may terminate this agreement with 60 days written notice. Early termination by the Sponsor may be subject to fees as outlined in your agreement, typically 50% of remaining contract value. Automatic renewal clauses apply unless written notice is provided 90 days before contract end date.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1 text-sm">5. Data Privacy & Protection</p>
                    <p className="text-muted-foreground leading-relaxed text-[9px]">
                      All data shared will be handled in accordance with our privacy policy and applicable data protection regulations including GDPR, CCPA, and other relevant laws. Sponsor data will be stored securely and used only for sponsorship-related purposes. We will not share sponsor information with third parties without explicit consent. Sponsors must comply with all applicable data protection laws when accessing user data through the platform.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1 text-sm">6. Intellectual Property Rights</p>
                    <p className="text-muted-foreground leading-relaxed text-[9px]">
                      Sponsors grant Gradia a non-exclusive, worldwide license to use sponsor logos, trademarks, and marketing materials for the purpose of fulfilling sponsorship obligations. Gradia retains all rights to its platform, content, and intellectual property. Neither party may use the other's trademarks or intellectual property beyond the scope of this agreement without prior written consent.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1 text-sm">7. Liability & Indemnification</p>
                    <p className="text-muted-foreground leading-relaxed text-[9px]">
                      Gradia is not liable for any indirect, incidental, special, or consequential damages resulting from the sponsorship agreement. Our total liability shall not exceed the total fees paid by the Sponsor in the 12 months preceding the claim. Sponsors agree to indemnify and hold harmless Gradia against any claims, damages, or expenses arising from sponsor content, materials, or violations of this agreement.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1 text-sm">8. Performance Metrics & Reporting</p>
                    <p className="text-muted-foreground leading-relaxed text-[9px]">
                      Gradia will provide sponsors with access to analytics and performance metrics as outlined in the sponsorship package. While we strive for accuracy, we do not guarantee specific results or metrics. Reports will be provided on a monthly basis unless otherwise agreed. Sponsors acknowledge that engagement and conversion rates may vary and are not guaranteed.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1 text-sm">9. Content Standards & Restrictions</p>
                    <p className="text-muted-foreground leading-relaxed text-[9px]">
                      All sponsor content must be truthful, not misleading, and comply with applicable advertising standards. Prohibited content includes discriminatory material, adult content, illegal products or services, and content that violates intellectual property rights. Gradia reserves the right to remove any content that violates these standards without refund or penalty.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1 text-sm">10. Force Majeure</p>
                    <p className="text-muted-foreground leading-relaxed text-[9px]">
                      Neither party shall be liable for delays or failures in performance resulting from circumstances beyond their reasonable control, including but not limited to acts of God, natural disasters, war, terrorism, labor disputes, or technical failures. During such events, both parties agree to make reasonable efforts to mitigate the impact and resume normal operations.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1 text-sm">11. Modifications to Terms</p>
                    <p className="text-muted-foreground leading-relaxed text-[9px]">
                      Gradia reserves the right to modify these terms with 30 days written notice. Continued participation in the sponsorship program after notification constitutes acceptance of the modified terms. Material changes that significantly affect sponsor benefits will require mutual written agreement.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-1 text-sm">12. Governing Law & Dispute Resolution</p>
                    <p className="text-muted-foreground leading-relaxed text-[9px]">
                      This agreement shall be governed by the laws of the jurisdiction in which Gradia is registered. Any disputes arising from this agreement shall first be addressed through good faith negotiations. If unresolved, disputes will be settled through binding arbitration in accordance with the rules of the applicable arbitration association. Each party bears their own legal costs unless otherwise determined by the arbitrator.
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
          ) : (
            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-4">Select Payment Method</h2>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  <div className="space-y-3">
                    {/* UPI Payment */}
                    <Label
                      htmlFor="upi"
                      className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === "upi" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value="upi" id="upi" />
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Smartphone className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">UPI Payment</p>
                          <p className="text-sm text-muted-foreground">Pay using Google Pay, PhonePe, Paytm, etc.</p>
                        </div>
                      </div>
                    </Label>

                    {/* Credit/Debit Card */}
                    <Label
                      htmlFor="card"
                      className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === "card" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value="card" id="card" />
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <CreditCard className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">Credit or Debit Card</p>
                          <p className="text-sm text-muted-foreground">Visa, Mastercard, Amex, and more</p>
                        </div>
                      </div>
                    </Label>

                    {/* Net Banking */}
                    <Label
                      htmlFor="netbanking"
                      className={`flex items-center gap-4 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        paymentMethod === "netbanking" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <RadioGroupItem value="netbanking" id="netbanking" />
                      <div className="flex items-center gap-3 flex-1">
                        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Landmark className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">Net Banking</p>
                          <p className="text-sm text-muted-foreground">Pay directly from your bank account</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex gap-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  size="lg" 
                  className="flex-1" 
                  onClick={() => setStep(2)}
                >
                  Back
                </Button>
                <Button 
                  type="submit" 
                  size="lg" 
                  className="flex-1" 
                  disabled={!paymentMethod}
                >
                  Proceed to Payment
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
