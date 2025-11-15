import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import SponsorDashboardLayout from "./SponsorDashboard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

interface AnalyticsData {
  date: string;
  page_views: number;
  logo_impressions: number;
  link_clicks: number;
  profile_visits: number;
  leads_generated: number;
}

export default function SponsorAnalytics() {
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([]);
  const [totals, setTotals] = useState({
    page_views: 0,
    logo_impressions: 0,
    link_clicks: 0,
    leads_generated: 0,
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sponsorData } = await supabase
        .from("sponsors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!sponsorData) return;

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("sponsor_analytics")
        .select("*")
        .eq("sponsor_id", sponsorData.id)
        .gte("date", thirtyDaysAgo)
        .order("date", { ascending: true });

      if (error) throw error;

      setAnalyticsData(data || []);

      // Calculate totals
      if (data) {
        const aggregated = data.reduce(
          (acc, curr) => ({
            page_views: acc.page_views + curr.page_views,
            logo_impressions: acc.logo_impressions + curr.logo_impressions,
            link_clicks: acc.link_clicks + curr.link_clicks,
            leads_generated: acc.leads_generated + curr.leads_generated,
          }),
          { page_views: 0, logo_impressions: 0, link_clicks: 0, leads_generated: 0 }
        );
        setTotals(aggregated);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SponsorDashboardLayout activeTab="analytics">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96" />
        </div>
      </SponsorDashboardLayout>
    );
  }

  return (
    <SponsorDashboardLayout activeTab="analytics">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your sponsorship performance</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.page_views.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Logo Impressions</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.logo_impressions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Link Clicks</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.link_clicks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Leads Generated</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.leads_generated.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
        </div>

        {/* Engagement Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Engagement Over Time</CardTitle>
            <CardDescription>Daily engagement metrics for the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="page_views" stroke="#10b981" name="Page Views" />
                <Line type="monotone" dataKey="logo_impressions" stroke="#3b82f6" name="Logo Impressions" />
                <Line type="monotone" dataKey="link_clicks" stroke="#8b5cf6" name="Link Clicks" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Comparison Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Metric Comparison</CardTitle>
            <CardDescription>Compare different engagement metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={(date) => new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="page_views" fill="#10b981" name="Page Views" />
                <Bar dataKey="link_clicks" fill="#8b5cf6" name="Link Clicks" />
                <Bar dataKey="leads_generated" fill="#f97316" name="Leads" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </SponsorDashboardLayout>
  );
}
