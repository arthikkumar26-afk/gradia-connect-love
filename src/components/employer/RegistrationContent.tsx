import { useState, useEffect } from "react";
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
import { Building2, MapPin, FileText, Gift, Save, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { getAllStates, getDistrictsByState } from "@/data/indiaLocations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

// Zod validation schema
const registrationSchema = z.object({
  companyName: z.string()
    .trim()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must be less than 100 characters"),
  companyEmail: z.string()
    .trim()
    .email("Invalid email address")
    .max(255, "Email must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  companyPhone: z.string()
    .trim()
    .max(15, "Phone number must be less than 15 characters")
    .regex(/^[+]?[\d\s-]*$/, "Invalid phone number format")
    .optional()
    .or(z.literal("")),
  companyWebsite: z.string()
    .trim()
    .url("Invalid website URL")
    .max(255, "Website URL must be less than 255 characters")
    .optional()
    .or(z.literal("")),
  companyDescription: z.string()
    .trim()
    .max(1000, "Description must be less than 1000 characters")
    .optional()
    .or(z.literal("")),
  state: z.string()
    .trim()
    .min(1, "State is required"),
  district: z.string()
    .trim()
    .min(1, "District is required"),
  townCity: z.string()
    .trim()
    .max(100, "Town/City must be less than 100 characters")
    .optional()
    .or(z.literal("")),
  pinCode: z.string()
    .trim()
    .regex(/^\d{6}$/, "Pin code must be exactly 6 digits")
    .optional()
    .or(z.literal("")),
  tcAgreement: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms & Conditions" }),
  }),
  benefits: z.string()
    .trim()
    .max(500, "Benefits must be less than 500 characters")
    .optional()
    .or(z.literal("")),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

export const RegistrationContent = () => {
  const { user } = useAuth();
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

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [existingRegistration, setExistingRegistration] = useState<boolean>(false);

  // Fetch existing registration on mount
  useEffect(() => {
    const fetchExistingRegistration = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('employer_registrations')
          .select('*')
          .eq('employer_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setExistingRegistration(true);
          setFormData({
            companyName: data.company_name || "",
            companyEmail: data.company_email || "",
            companyPhone: data.company_phone || "",
            companyWebsite: data.company_website || "",
            companyDescription: data.company_description || "",
            state: data.state || "",
            district: data.district || "",
            townCity: data.town_city || "",
            pinCode: data.pin_code || "",
            tcAgreement: data.tc_accepted || false,
            benefits: data.benefits || "",
          });
        }
      } catch (error) {
        console.error("Error fetching registration:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingRegistration();
  }, [user?.id]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === "state" ? { district: "" } : {}),
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    try {
      registrationSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error("Please fix the validation errors");
      return;
    }

    if (!user?.id) {
      toast.error("You must be logged in to save registration");
      return;
    }

    setIsSubmitting(true);
    try {
      const registrationData = {
        employer_id: user.id,
        company_name: formData.companyName.trim(),
        company_email: formData.companyEmail.trim() || null,
        company_phone: formData.companyPhone.trim() || null,
        company_website: formData.companyWebsite.trim() || null,
        company_description: formData.companyDescription.trim() || null,
        state: formData.state,
        district: formData.district,
        town_city: formData.townCity.trim() || null,
        pin_code: formData.pinCode.trim() || null,
        tc_accepted: formData.tcAgreement,
        tc_accepted_at: formData.tcAgreement ? new Date().toISOString() : null,
        benefits: formData.benefits.trim() || null,
      };

      let error;
      if (existingRegistration) {
        // Update existing registration
        const result = await supabase
          .from('employer_registrations')
          .update(registrationData)
          .eq('employer_id', user.id);
        error = result.error;
      } else {
        // Insert new registration
        const result = await supabase
          .from('employer_registrations')
          .insert(registrationData);
        error = result.error;
      }

      if (error) throw error;

      setExistingRegistration(true);
      toast.success(existingRegistration 
        ? "Registration updated successfully!" 
        : "Registration saved successfully!"
      );
    } catch (error: any) {
      console.error("Error saving registration:", error);
      toast.error(error.message || "Failed to save registration");
    } finally {
      setIsSubmitting(false);
    }
  };

  const allStates = getAllStates();
  const availableDistricts = formData.state ? getDistrictsByState(formData.state) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading registration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Registration</h2>
          <p className="text-muted-foreground">
            {existingRegistration 
              ? "Update your company registration details" 
              : "Complete your company registration details"
            }
          </p>
        </div>
        {existingRegistration && (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Registered</span>
          </div>
        )}
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
                className={errors.companyName ? "border-destructive" : ""}
                maxLength={100}
              />
              {errors.companyName && (
                <p className="text-xs text-destructive">{errors.companyName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Company Email</Label>
              <Input
                id="companyEmail"
                type="email"
                placeholder="company@example.com"
                value={formData.companyEmail}
                onChange={(e) => handleInputChange("companyEmail", e.target.value)}
                className={errors.companyEmail ? "border-destructive" : ""}
                maxLength={255}
              />
              {errors.companyEmail && (
                <p className="text-xs text-destructive">{errors.companyEmail}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Company Phone</Label>
              <Input
                id="companyPhone"
                placeholder="+91 XXXXXXXXXX"
                value={formData.companyPhone}
                onChange={(e) => handleInputChange("companyPhone", e.target.value)}
                className={errors.companyPhone ? "border-destructive" : ""}
                maxLength={15}
              />
              {errors.companyPhone && (
                <p className="text-xs text-destructive">{errors.companyPhone}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyWebsite">Website</Label>
              <Input
                id="companyWebsite"
                placeholder="https://www.example.com"
                value={formData.companyWebsite}
                onChange={(e) => handleInputChange("companyWebsite", e.target.value)}
                className={errors.companyWebsite ? "border-destructive" : ""}
                maxLength={255}
              />
              {errors.companyWebsite && (
                <p className="text-xs text-destructive">{errors.companyWebsite}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyDescription">Company Description</Label>
              <Textarea
                id="companyDescription"
                placeholder="Brief description about your company..."
                rows={3}
                value={formData.companyDescription}
                onChange={(e) => handleInputChange("companyDescription", e.target.value)}
                className={errors.companyDescription ? "border-destructive" : ""}
                maxLength={1000}
              />
              {errors.companyDescription && (
                <p className="text-xs text-destructive">{errors.companyDescription}</p>
              )}
              <p className="text-xs text-muted-foreground text-right">
                {formData.companyDescription.length}/1000
              </p>
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
                <SelectTrigger className={errors.state ? "border-destructive" : ""}>
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
              {errors.state && (
                <p className="text-xs text-destructive">{errors.state}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="district">District *</Label>
              <Select
                value={formData.district}
                onValueChange={(value) => handleInputChange("district", value)}
                disabled={!formData.state}
              >
                <SelectTrigger className={errors.district ? "border-destructive" : ""}>
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
              {errors.district && (
                <p className="text-xs text-destructive">{errors.district}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="townCity">Town/City</Label>
              <Input
                id="townCity"
                placeholder="Enter town or city name"
                value={formData.townCity}
                onChange={(e) => handleInputChange("townCity", e.target.value)}
                className={errors.townCity ? "border-destructive" : ""}
                maxLength={100}
              />
              {errors.townCity && (
                <p className="text-xs text-destructive">{errors.townCity}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pinCode">Pin Code</Label>
              <Input
                id="pinCode"
                placeholder="XXXXXX"
                maxLength={6}
                value={formData.pinCode}
                onChange={(e) => handleInputChange("pinCode", e.target.value.replace(/\D/g, ""))}
                className={errors.pinCode ? "border-destructive" : ""}
              />
              {errors.pinCode && (
                <p className="text-xs text-destructive">{errors.pinCode}</p>
              )}
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
            <div className="flex items-start space-x-2">
              <Checkbox
                id="tcAgreement"
                checked={formData.tcAgreement}
                onCheckedChange={(checked) => handleInputChange("tcAgreement", checked as boolean)}
                className={errors.tcAgreement ? "border-destructive" : ""}
              />
              <div className="space-y-1">
                <Label htmlFor="tcAgreement" className="text-sm cursor-pointer leading-tight">
                  I have read and agree to the Terms & Conditions *
                </Label>
                {errors.tcAgreement && (
                  <p className="text-xs text-destructive">{errors.tcAgreement}</p>
                )}
              </div>
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
              className={errors.benefits ? "border-destructive" : ""}
              maxLength={500}
            />
            {errors.benefits && (
              <p className="text-xs text-destructive">{errors.benefits}</p>
            )}
            <p className="text-xs text-muted-foreground text-right">
              {formData.benefits.length}/500
            </p>
            <div className="flex flex-wrap gap-2">
              {["Health Insurance", "PF", "Gratuity", "Transport", "Food", "Bonus"].map((benefit) => (
                <Button
                  key={benefit}
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => {
                    const currentBenefits = formData.benefits;
                    if (!currentBenefits.includes(benefit)) {
                      const newBenefits = currentBenefits ? `${currentBenefits}, ${benefit}` : benefit;
                      if (newBenefits.length <= 500) {
                        handleInputChange("benefits", newBenefits);
                      }
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
          disabled={isSubmitting}
          className="min-w-[200px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {existingRegistration ? "Update Registration" : "Save Registration"}
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
