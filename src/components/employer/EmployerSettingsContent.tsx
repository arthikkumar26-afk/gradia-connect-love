import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, MapPin, Gift, Save, Loader2, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { getAllStates, getDistrictsByState } from "@/data/indiaLocations";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface RegistrationData {
  company_name: string;
  company_email: string;
  company_phone: string;
  company_website: string;
  company_description: string;
  industry_category: string;
  state: string;
  district: string;
  town_city: string;
  pin_code: string;
  benefits: string;
}

export const EmployerSettingsContent = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<RegistrationData>({
    company_name: "",
    company_email: "",
    company_phone: "",
    company_website: "",
    company_description: "",
    industry_category: "",
    state: "",
    district: "",
    town_city: "",
    pin_code: "",
    benefits: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasRegistration, setHasRegistration] = useState(false);
  const [registrationId, setRegistrationId] = useState<string | null>(null);

  useEffect(() => {
    fetchRegistration();
  }, [user?.id]);

  const fetchRegistration = async () => {
    if (!user?.id) { setIsLoading(false); return; }

    try {
      // Fetch both registration and profile in parallel
      const [regResult, profileResult] = await Promise.all([
        supabase
          .from("employer_registrations")
          .select("*")
          .eq("employer_id", user.id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("company_name, company_description, website, mobile, email")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (regResult.error) throw regResult.error;

      if (regResult.data) {
        setHasRegistration(true);
        setRegistrationId(regResult.data.id);
        setFormData({
          company_name: regResult.data.company_name || "",
          company_email: regResult.data.company_email || "",
          company_phone: regResult.data.company_phone || "",
          company_website: regResult.data.company_website || "",
          company_description: regResult.data.company_description || "",
          industry_category: (regResult.data as any).industry_category || "",
          state: regResult.data.state || "",
          district: regResult.data.district || "",
          town_city: regResult.data.town_city || "",
          pin_code: regResult.data.pin_code || "",
          benefits: regResult.data.benefits || "",
        });
      } else if (profileResult.data) {
        // Pre-fill from profile data so employer can complete registration from Settings
        const profile = profileResult.data;
        setHasRegistration(false);
        setFormData(prev => ({
          ...prev,
          company_name: profile.company_name || "",
          company_description: profile.company_description || "",
          company_website: profile.website || "",
          company_phone: profile.mobile || "",
          company_email: profile.email || "",
        }));
      }
    } catch (err) {
      console.error("Error fetching registration:", err);
      toast.error("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof RegistrationData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      ...(field === "state" ? { district: "" } : {}),
    }));
  };

  const handleSave = async () => {
    if (!user?.id) { toast.error("Not authenticated"); return; }
    if (!formData.company_name.trim()) { toast.error("Company name is required"); return; }
    if (!formData.state) { toast.error("State is required"); return; }
    if (!formData.district) { toast.error("District is required"); return; }

    setIsSubmitting(true);
    try {
      const payload = {
        employer_id: user.id,
        company_name: formData.company_name.trim(),
        company_email: formData.company_email.trim() || null,
        company_phone: formData.company_phone.trim() || null,
        company_website: formData.company_website.trim() || null,
        company_description: formData.company_description.trim() || null,
        industry_category: formData.industry_category || null,
        state: formData.state,
        district: formData.district,
        town_city: formData.town_city.trim() || null,
        pin_code: formData.pin_code.trim() || null,
        benefits: formData.benefits.trim() || null,
      };

      if (hasRegistration) {
        const { error } = await supabase
          .from("employer_registrations")
          .update(payload as any)
          .eq("employer_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("employer_registrations")
          .insert(payload as any);
        if (error) throw error;
        setHasRegistration(true);
      }

      toast.success(hasRegistration ? "Profile updated successfully!" : "Company profile created successfully!");
    } catch (err: any) {
      console.error("Error saving:", err);
      toast.error(err.message || "Failed to save changes");
    } finally {
      setIsSubmitting(false);
    }
  };

  const allStates = getAllStates();
  const availableDistricts = formData.state ? getDistrictsByState(formData.state) : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading your profile...</span>
      </div>
    );
  }

  // Show the form even if no registration yet — let them create one from Settings

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 ${hasRegistration ? "text-primary" : "text-amber-500"}`}>
          {hasRegistration ? <CheckCircle className="h-5 w-5" /> : <Info className="h-5 w-5" />}
          <span className="text-sm font-medium">
            {hasRegistration ? "Registered Profile" : "Complete your company profile"}
          </span>
        </div>
        <Button onClick={handleSave} disabled={isSubmitting} className="gap-2">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
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
              <Label htmlFor="company_name">Company Name *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => handleChange("company_name", e.target.value)}
                placeholder="Enter company name"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_email">Company Email</Label>
              <Input
                id="company_email"
                type="email"
                value={formData.company_email}
                onChange={(e) => handleChange("company_email", e.target.value)}
                placeholder="company@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_phone">Company Phone</Label>
              <Input
                id="company_phone"
                value={formData.company_phone}
                onChange={(e) => handleChange("company_phone", e.target.value)}
                placeholder="+91 XXXXXXXXXX"
                maxLength={15}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_website">Website</Label>
              <Input
                id="company_website"
                value={formData.company_website}
                onChange={(e) => handleChange("company_website", e.target.value)}
                placeholder="https://www.example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry_category">Industry Category</Label>
              <Select
                value={formData.industry_category || undefined}
                onValueChange={(v) => handleChange("industry_category", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Industry Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Education">Education</SelectItem>
                  <SelectItem value="IT Corporate">IT Corporate</SelectItem>
                  <SelectItem value="Legal">Legal</SelectItem>
                  <SelectItem value="Doctor">Doctor</SelectItem>
                  <SelectItem value="Civil Service">Civil Service</SelectItem>
                  <SelectItem value="Real Estate & Infrastructure">Real Estate & Infrastructure</SelectItem>
                  <SelectItem value="Freelance / Independent Professionals">Freelance / Independent Professionals</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_description">Company Description</Label>
              <Textarea
                id="company_description"
                value={formData.company_description}
                onChange={(e) => handleChange("company_description", e.target.value)}
                placeholder="Brief description about your company..."
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.company_description.length}/1000
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
                onValueChange={(v) => handleChange("state", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {allStates.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="district">District *</Label>
              <Select
                value={formData.district}
                onValueChange={(v) => handleChange("district", v)}
                disabled={!formData.state}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.state ? "Select district" : "Select state first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableDistricts.map((d) => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="town_city">Town / City</Label>
              <Input
                id="town_city"
                value={formData.town_city}
                onChange={(e) => handleChange("town_city", e.target.value)}
                placeholder="Enter town or city name"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin_code">Pin Code</Label>
              <Input
                id="pin_code"
                value={formData.pin_code}
                onChange={(e) => handleChange("pin_code", e.target.value.replace(/\D/g, ""))}
                placeholder="XXXXXX"
                maxLength={6}
              />
            </div>
          </CardContent>
        </Card>

        {/* Benefits */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Employee Benefits
            </CardTitle>
            <CardDescription>Describe the benefits your company offers</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.benefits}
              onChange={(e) => handleChange("benefits", e.target.value)}
              placeholder="e.g., Health insurance, flexible hours, remote work options..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {formData.benefits.length}/500
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSubmitting} size="lg" className="gap-2">
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
};
