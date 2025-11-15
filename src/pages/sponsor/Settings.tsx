import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import SponsorDashboardLayout from "./SponsorDashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Mail, Phone, Globe, Upload } from "lucide-react";

interface SponsorProfile {
  id: string;
  company_name: string;
  company_description: string | null;
  website: string | null;
  logo_url: string | null;
  tier: string;
  status: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

export default function SponsorSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<SponsorProfile | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("sponsors")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("sponsors")
        .update({
          company_name: profile.company_name,
          company_description: profile.company_description,
          website: profile.website,
          contact_name: profile.contact_name,
          contact_email: profile.contact_email,
          contact_phone: profile.contact_phone,
        })
        .eq("id", profile.id);

      if (error) throw error;
      toast.success("Profile updated successfully");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SponsorDashboardLayout activeTab="settings">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96" />
        </div>
      </SponsorDashboardLayout>
    );
  }

  if (!profile) {
    return (
      <SponsorDashboardLayout activeTab="settings">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Profile not found</p>
          </CardContent>
        </Card>
      </SponsorDashboardLayout>
    );
  }

  return (
    <SponsorDashboardLayout activeTab="settings">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your sponsor profile and preferences</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Company Logo */}
          <Card>
            <CardHeader>
              <CardTitle>Company Logo</CardTitle>
              <CardDescription>Update your company logo that appears across the platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.logo_url || ""} alt={profile.company_name} />
                  <AvatarFallback>
                    <Building2 className="h-10 w-10" />
                  </AvatarFallback>
                </Avatar>
                <Button type="button" variant="outline">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload New Logo
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic information about your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input
                  id="company_name"
                  value={profile.company_name}
                  onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_description">Company Description</Label>
                <Textarea
                  id="company_description"
                  value={profile.company_description || ""}
                  onChange={(e) => setProfile({ ...profile, company_description: e.target.value })}
                  rows={4}
                  placeholder="Tell us about your company..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="website"
                    type="url"
                    value={profile.website || ""}
                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                    className="pl-10"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Primary contact details for partnership communications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Contact Name</Label>
                <Input
                  id="contact_name"
                  value={profile.contact_name || ""}
                  onChange={(e) => setProfile({ ...profile, contact_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_email">Contact Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contact_email"
                    type="email"
                    value={profile.contact_email || ""}
                    onChange={(e) => setProfile({ ...profile, contact_email: e.target.value })}
                    className="pl-10"
                    placeholder="contact@example.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="contact_phone"
                    type="tel"
                    value={profile.contact_phone || ""}
                    onChange={(e) => setProfile({ ...profile, contact_phone: e.target.value })}
                    className="pl-10"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={fetchProfile}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </SponsorDashboardLayout>
  );
}
