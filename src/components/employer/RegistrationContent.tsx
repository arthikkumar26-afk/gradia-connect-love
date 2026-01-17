import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, MapPin, FileText, Gift, Save } from "lucide-react";
import { toast } from "sonner";
import { getAllStates, getDistrictsByState } from "@/data/indiaLocations";

export const RegistrationContent = () => {
  const [formData, setFormData] = useState({
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    companyWebsite: "",
    companyDescription: "",
    state: "",
    district: "",
    townCity: "",
    pinCode: "",
    tcAgreement: false,
    benefits: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === "state" ? { district: "" } : {}),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.companyName || !formData.state || !formData.district || !formData.tcAgreement) {
      toast.error("Please fill all required fields and accept T&C");
      return;
    }

    setIsSubmitting(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Registration details saved successfully!");
    } catch (error) {
      toast.error("Failed to save registration details");
    } finally {
      setIsSubmitting(false);
    }
  };

  const allStates = getAllStates();
  const availableDistricts = formData.state ? getDistrictsByState(formData.state) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Registration</h2>
          <p className="text-muted-foreground">Complete your company registration details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Company Details
            </CardTitle>
            <CardDescription>Basic information about your company</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                placeholder="Enter company name"
                value={formData.companyName}
                onChange={(e) => handleInputChange("companyName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Company Email</Label>
              <Input
                id="companyEmail"
                type="email"
                placeholder="company@example.com"
                value={formData.companyEmail}
                onChange={(e) => handleInputChange("companyEmail", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Company Phone</Label>
              <Input
                id="companyPhone"
                placeholder="+91 XXXXXXXXXX"
                value={formData.companyPhone}
                onChange={(e) => handleInputChange("companyPhone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyWebsite">Website</Label>
              <Input
                id="companyWebsite"
                placeholder="https://www.example.com"
                value={formData.companyWebsite}
                onChange={(e) => handleInputChange("companyWebsite", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyDescription">Company Description</Label>
              <Textarea
                id="companyDescription"
                placeholder="Brief description about your company..."
                rows={3}
                value={formData.companyDescription}
                onChange={(e) => handleInputChange("companyDescription", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Location Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Location Details
            </CardTitle>
            <CardDescription>Your company's address information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Select
                value={formData.state}
                onValueChange={(value) => handleInputChange("state", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {allStates.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">District *</Label>
              <Select
                value={formData.district}
                onValueChange={(value) => handleInputChange("district", value)}
                disabled={!formData.state}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.state ? "Select district" : "Select state first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableDistricts.map((district) => (
                    <SelectItem key={district} value={district}>
                      {district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="townCity">Town/City</Label>
              <Input
                id="townCity"
                placeholder="Enter town or city name"
                value={formData.townCity}
                onChange={(e) => handleInputChange("townCity", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pinCode">Pin Code</Label>
              <Input
                id="pinCode"
                placeholder="XXXXXX"
                maxLength={6}
                value={formData.pinCode}
                onChange={(e) => handleInputChange("pinCode", e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </CardContent>
        </Card>

        {/* T&C Agreement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Terms & Conditions Agreement
            </CardTitle>
            <CardDescription>Review and accept our terms</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg text-sm text-muted-foreground max-h-40 overflow-y-auto">
              <p className="mb-2">By registering with Gradia, you agree to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Provide accurate and truthful company information</li>
                <li>Comply with all applicable employment laws and regulations</li>
                <li>Maintain confidentiality of candidate information</li>
                <li>Use the platform only for legitimate hiring purposes</li>
                <li>Not discriminate based on race, gender, religion, or other protected characteristics</li>
                <li>Pay all applicable fees as per the subscription plan</li>
              </ul>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="tcAgreement"
                checked={formData.tcAgreement}
                onCheckedChange={(checked) => handleInputChange("tcAgreement", checked as boolean)}
              />
              <Label htmlFor="tcAgreement" className="text-sm cursor-pointer">
                I have read and agree to the Terms & Conditions *
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Benefits Offered
            </CardTitle>
            <CardDescription>List the benefits your company offers to employees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Enter benefits offered to employees (e.g., Health Insurance, PF, Gratuity, Transport, Food, etc.)"
              rows={5}
              value={formData.benefits}
              onChange={(e) => handleInputChange("benefits", e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              {["Health Insurance", "PF", "Gratuity", "Transport", "Food", "Bonus"].map((benefit) => (
                <Button
                  key={benefit}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const currentBenefits = formData.benefits;
                    if (!currentBenefits.includes(benefit)) {
                      handleInputChange(
                        "benefits",
                        currentBenefits ? `${currentBenefits}, ${benefit}` : benefit
                      );
                    }
                  }}
                >
                  + {benefit}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.tcAgreement}
          className="min-w-[200px]"
        >
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? "Saving..." : "Save Registration"}
        </Button>
      </div>
    </div>
  );
};
