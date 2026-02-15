import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, DollarSign, TrendingUp, Users, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const RevenueAnalytics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    totalEmployers: 0,
    totalCandidates: 0,
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/owner/login"); return; }
      const { data: roleData } = await supabase
        .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'owner').single();
      if (!roleData) { navigate("/owner/login"); return; }
      setIsAuthorized(true);
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!isAuthorized) return;
    const fetchStats = async () => {
      const [subRes, empRes, candRes] = await Promise.all([
        supabase.from('subscriptions').select('id, status', { count: 'exact' }),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'employer'),
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'candidate'),
      ]);
      const allSubs = subRes.count || 0;
      const activeSubs = subRes.data?.filter(s => s.status === 'active').length || 0;
      setStats({
        totalSubscriptions: allSubs,
        activeSubscriptions: activeSubs,
        totalEmployers: empRes.count || 0,
        totalCandidates: candRes.count || 0,
      });
    };
    fetchStats();
  }, [isAuthorized]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!isAuthorized) return null;

  const cards = [
    { title: "Total Subscriptions", value: stats.totalSubscriptions, icon: DollarSign, color: "text-green-500" },
    { title: "Active Subscriptions", value: stats.activeSubscriptions, icon: TrendingUp, color: "text-blue-500" },
    { title: "Total Employers", value: stats.totalEmployers, icon: Building2, color: "text-purple-500" },
    { title: "Total Candidates", value: stats.totalCandidates, icon: Users, color: "text-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate("/owner/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Revenue Analytics</h1>
            <p className="text-muted-foreground">Financial reports & insights</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {cards.map((card, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-3xl font-bold text-foreground">{card.value}</p>
                  </div>
                  <card.icon className={`h-8 w-8 ${card.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
            <CardDescription>Subscription and payment data from the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Detailed revenue charts and reports will be available as more subscription data accumulates.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RevenueAnalytics;
