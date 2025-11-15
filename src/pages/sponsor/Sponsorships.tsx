import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import SponsorDashboardLayout from "./SponsorDashboard";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Sponsorship {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  start_date: string;
  end_date: string;
  status: string;
  type: string;
  benefits: string[] | null;
  created_at: string;
}

export default function Sponsorships() {
  const [loading, setLoading] = useState(true);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);

  useEffect(() => {
    fetchSponsorships();
  }, []);

  const fetchSponsorships = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sponsorData } = await supabase
        .from("sponsors")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!sponsorData) return;

      const { data, error } = await supabase
        .from("sponsorships")
        .select("*")
        .eq("sponsor_id", sponsorData.id)
        .order("start_date", { ascending: false });

      if (error) throw error;
      setSponsorships(data || []);
    } catch (error) {
      console.error("Error fetching sponsorships:", error);
      toast.error("Failed to load sponsorships");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-900 border-green-300";
      case "completed":
        return "bg-blue-100 text-blue-900 border-blue-300";
      case "cancelled":
        return "bg-red-100 text-red-900 border-red-300";
      default:
        return "bg-gray-100 text-gray-900 border-gray-300";
    }
  };

  const filterSponsorships = (status: string) => {
    if (status === "all") return sponsorships;
    return sponsorships.filter((s) => s.status.toLowerCase() === status);
  };

  if (loading) {
    return (
      <SponsorDashboardLayout activeTab="sponsorships">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96" />
        </div>
      </SponsorDashboardLayout>
    );
  }

  return (
    <SponsorDashboardLayout activeTab="sponsorships">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Sponsorships</h1>
          <p className="text-muted-foreground mt-1">Manage your partnership agreements</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All ({sponsorships.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({filterSponsorships("active").length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({filterSponsorships("completed").length})</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled ({filterSponsorships("cancelled").length})</TabsTrigger>
          </TabsList>

          {["all", "active", "completed", "cancelled"].map((status) => (
            <TabsContent key={status} value={status} className="space-y-4 mt-6">
              {filterSponsorships(status).length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No {status !== "all" ? status : ""} sponsorships found</p>
                  </CardContent>
                </Card>
              ) : (
                filterSponsorships(status).map((sponsorship) => (
                  <Card key={sponsorship.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle>{sponsorship.title}</CardTitle>
                          <CardDescription>{sponsorship.description}</CardDescription>
                        </div>
                        <Badge className={getStatusColor(sponsorship.status)}>
                          {sponsorship.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {sponsorship.currency} {sponsorship.amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">Investment Amount</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(sponsorship.start_date), "MMM d, yyyy")}
                            </p>
                            <p className="text-xs text-muted-foreground">Start Date</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">
                              {format(new Date(sponsorship.end_date), "MMM d, yyyy")}
                            </p>
                            <p className="text-xs text-muted-foreground">End Date</p>
                          </div>
                        </div>
                      </div>

                      {sponsorship.benefits && sponsorship.benefits.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Benefits Included:</p>
                          <ul className="grid gap-2 md:grid-cols-2">
                            {sponsorship.benefits.map((benefit, index) => (
                              <li key={index} className="flex items-start gap-2 text-sm">
                                <span className="text-primary mt-0.5">✓</span>
                                <span>{benefit}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Badge variant="outline">{sponsorship.type}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </SponsorDashboardLayout>
  );
}
