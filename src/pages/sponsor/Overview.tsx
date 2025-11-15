import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Eye, MousePointer, Users, Calendar, ExternalLink, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import SponsorDashboardLayout from "./SponsorDashboard";
import { format } from "date-fns";

interface SponsorProfile {
  id: string;
  company_name: string;
  tier: string;
  status: string;
  joined_date: string;
  contract_end_date: string | null;
}

interface Sponsorship {
  id: string;
  title: string;
  status: string;
  start_date: string;
  end_date: string;
  amount: number;
}

interface Analytics {
  page_views: number;
  logo_impressions: number;
  link_clicks: number;
  leads_generated: number;
}

export default function SponsorOverview() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SponsorProfile | null>(null);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    page_views: 0,
    logo_impressions: 0,
    link_clicks: 0,
    leads_generated: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch sponsor profile
      const { data: sponsorData, error: sponsorError } = await supabase
        .from("sponsors")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (sponsorError) throw sponsorError;
      setProfile(sponsorData);

      if (sponsorData) {
        // Fetch sponsorships
        const { data: sponsorshipsData } = await supabase
          .from("sponsorships")
          .select("*")
          .eq("sponsor_id", sponsorData.id)
          .order("start_date", { ascending: false })
          .limit(5);

        setSponsorships(sponsorshipsData || []);

        // Fetch analytics (last 30 days aggregated)
        const { data: analyticsData } = await supabase
          .from("sponsor_analytics")
          .select("*")
          .eq("sponsor_id", sponsorData.id)
          .gte("date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);

        if (analyticsData) {
          const aggregated = analyticsData.reduce(
            (acc, curr) => ({
              page_views: acc.page_views + curr.page_views,
              logo_impressions: acc.logo_impressions + curr.logo_impressions,
              link_clicks: acc.link_clicks + curr.link_clicks,
              leads_generated: acc.leads_generated + curr.leads_generated,
            }),
            { page_views: 0, logo_impressions: 0, link_clicks: 0, leads_generated: 0 }
          );
          setAnalytics(aggregated);
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier.toLowerCase()) {
      case "platinum":
        return "bg-slate-100 text-slate-900 border-slate-300";
      case "gold":
        return "bg-yellow-100 text-yellow-900 border-yellow-300";
      case "silver":
        return "bg-gray-100 text-gray-900 border-gray-300";
      default:
        return "bg-amber-100 text-amber-900 border-amber-300";
    }
  };

  if (loading) {
    return (
      <SponsorDashboardLayout activeTab="overview">
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </SponsorDashboardLayout>
    );
  }

  return (
    <SponsorDashboardLayout activeTab="overview">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back, {profile?.company_name}!</h1>
            <p className="text-muted-foreground mt-1">Here's your partnership overview</p>
          </div>
          <Badge className={getTierColor(profile?.tier || "bronze")}>
            {profile?.tier.toUpperCase()} Partner
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Page Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.page_views.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Logo Impressions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.logo_impressions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Link Clicks</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.link_clicks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Generated</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.leads_generated.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sponsorships */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sponsorships</CardTitle>
            <CardDescription>Your latest partnership activities</CardDescription>
          </CardHeader>
          <CardContent>
            {sponsorships.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No sponsorships yet</p>
                <Button variant="outline" className="mt-4" asChild>
                  <a href="/sponsor/sponsorships">View All Sponsorships</a>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {sponsorships.map((sponsorship) => (
                  <div
                    key={sponsorship.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">{sponsorship.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(sponsorship.start_date), "MMM d, yyyy")} - {format(new Date(sponsorship.end_date), "MMM d, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={sponsorship.status === "active" ? "default" : "secondary"}>
                        {sponsorship.status}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`/sponsor/sponsorships#${sponsorship.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="justify-start" asChild>
              <a href="/sponsor/analytics">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Full Analytics
              </a>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="/sponsor/resources">
                <ExternalLink className="mr-2 h-4 w-4" />
                Download Resources
              </a>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <a href="/sponsor/settings">
                <ExternalLink className="mr-2 h-4 w-4" />
                Update Profile
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </SponsorDashboardLayout>
  );
}
