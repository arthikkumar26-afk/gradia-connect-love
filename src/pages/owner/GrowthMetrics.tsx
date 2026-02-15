import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Users, Briefcase, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const GrowthMetrics = () => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalJobs: 0,
    totalApplications: 0,
    totalEmployers: 0,
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
    const fetchMetrics = async () => {
      const [usersRes, jobsRes, appsRes, empRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('jobs').select('id', { count: 'exact', head: true }),
        supabase.from('applications').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'employer'),
      ]);
      setMetrics({
        totalUsers: usersRes.count || 0,
        totalJobs: jobsRes.count || 0,
        totalApplications: appsRes.count || 0,
        totalEmployers: empRes.count || 0,
      });
    };
    fetchMetrics();
  }, [isAuthorized]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!isAuthorized) return null;

  const cards = [
    { title: "Total Users", value: metrics.totalUsers, icon: Users, color: "text-blue-500" },
    { title: "Total Jobs Posted", value: metrics.totalJobs, icon: Briefcase, color: "text-green-500" },
    { title: "Total Applications", value: metrics.totalApplications, icon: TrendingUp, color: "text-purple-500" },
    { title: "Registered Employers", value: metrics.totalEmployers, icon: Building2, color: "text-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate("/owner/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Growth Metrics</h1>
            <p className="text-muted-foreground">Track platform growth</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {cards.map((card, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-3xl font-bold text-foreground">{card.value.toLocaleString()}</p>
                  </div>
                  <card.icon className={`h-8 w-8 ${card.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Growth Trends</CardTitle>
            <CardDescription>Platform growth over time</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Detailed growth charts will be displayed as more data is collected over time.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GrowthMetrics;
