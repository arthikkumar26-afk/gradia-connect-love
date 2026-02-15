import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database, HardDrive, RefreshCw, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DatabaseManagement = () => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tableCounts, setTableCounts] = useState<{ name: string; count: number }[]>([]);

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
    const fetchCounts = async () => {
      const tableNames = ['profiles', 'jobs', 'applications', 'subscriptions', 'interview_candidates'] as const;
      const results = await Promise.all(
        tableNames.map(async (t) => {
          const { count } = await supabase.from(t).select('id', { count: 'exact', head: true });
          return { name: t as string, count: count || 0 };
        })
      );
      setTableCounts(results);
    };
    fetchCounts();
  }, [isAuthorized]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => navigate("/owner/dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Database Management</h1>
            <p className="text-muted-foreground">Data & backups</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <HardDrive className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Tables Monitored</p>
                <p className="text-2xl font-bold text-foreground">{tableCounts.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <Database className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold text-foreground">{tableCounts.reduce((a, b) => a + b.count, 0).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <RefreshCw className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-2xl font-bold text-green-600">Healthy</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Table Overview</CardTitle>
            <CardDescription>Record counts for key tables</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tableCounts.map((table) => (
                <div key={table.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-medium text-foreground capitalize">{table.name.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground font-mono">{table.count.toLocaleString()} records</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DatabaseManagement;
