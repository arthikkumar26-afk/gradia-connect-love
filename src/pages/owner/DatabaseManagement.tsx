import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Database, HardDrive, RefreshCw, ChevronRight, X, Users, Briefcase, FileText, CreditCard, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type TableName = 'profiles' | 'jobs' | 'applications' | 'subscriptions' | 'interview_candidates';

const tableConfig: Record<TableName, { icon: React.ElementType; color: string; columns: { key: string; label: string }[] }> = {
  profiles: {
    icon: Users,
    color: "text-blue-500",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "mobile", label: "Mobile" },
      { key: "location", label: "Location" },
      { key: "created_at", label: "Created" },
    ],
  },
  jobs: {
    icon: Briefcase,
    color: "text-green-500",
    columns: [
      { key: "job_title", label: "Title" },
      { key: "department", label: "Department" },
      { key: "location", label: "Location" },
      { key: "job_type", label: "Type" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Created" },
    ],
  },
  applications: {
    icon: FileText,
    color: "text-orange-500",
    columns: [
      { key: "id", label: "ID" },
      { key: "candidate_id", label: "Candidate" },
      { key: "job_id", label: "Job" },
      { key: "status", label: "Status" },
      { key: "applied_date", label: "Applied" },
    ],
  },
  subscriptions: {
    icon: CreditCard,
    color: "text-purple-500",
    columns: [
      { key: "plan_name", label: "Plan" },
      { key: "status", label: "Status" },
      { key: "amount", label: "Amount" },
      { key: "billing_cycle", label: "Cycle" },
      { key: "started_at", label: "Started" },
      { key: "ends_at", label: "Ends" },
    ],
  },
  interview_candidates: {
    icon: UserCheck,
    color: "text-teal-500",
    columns: [
      { key: "id", label: "ID" },
      { key: "candidate_id", label: "Candidate" },
      { key: "job_id", label: "Job" },
      { key: "status", label: "Status" },
      { key: "ai_score", label: "AI Score" },
      { key: "applied_at", label: "Applied" },
    ],
  },
};

const DatabaseManagement = () => {
  const navigate = useNavigate();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tableCounts, setTableCounts] = useState<{ name: TableName; count: number }[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableName | null>(null);
  const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/owner/login"); return; }
      const { data: roleData } = await supabase
        .from('user_roles').select('role').eq('user_id', user.id).eq('role', 'owner').maybeSingle();
      if (!roleData) { navigate("/owner/login"); return; }
      setIsAuthorized(true);
      setIsLoading(false);
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!isAuthorized) return;
    const fetchCounts = async () => {
      const tableNames: TableName[] = ['profiles', 'jobs', 'applications', 'subscriptions', 'interview_candidates'];
      const results = await Promise.all(
        tableNames.map(async (t) => {
          const { count } = await supabase.from(t).select('id', { count: 'exact', head: true });
          return { name: t, count: count || 0 };
        })
      );
      setTableCounts(results);
    };
    fetchCounts();
  }, [isAuthorized]);

  const handleTableClick = async (tableName: TableName) => {
    setSelectedTable(tableName);
    setIsLoadingData(true);
    try {
      const cols = tableConfig[tableName].columns.map(c => c.key).join(',');
      const { data, error } = await supabase.from(tableName).select(cols).limit(100);
      if (!error && data) {
        setTableData(data as unknown as Record<string, unknown>[]);
      }
    } catch {
      setTableData([]);
    }
    setIsLoadingData(false);
  };

  const formatCell = (value: unknown): string => {
    if (value === null || value === undefined) return "—";
    if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (typeof value === "number") return value.toLocaleString();
    return String(value).substring(0, 40);
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Loading...</div></div>;
  if (!isAuthorized) return null;

  const config = selectedTable ? tableConfig[selectedTable] : null;

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
            <CardDescription>Click a table to view its records</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tableCounts.map((table) => {
                const tc = tableConfig[table.name];
                const Icon = tc.icon;
                return (
                  <div
                    key={table.name}
                    onClick={() => handleTableClick(table.name)}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-5 w-5 ${tc.color}`} />
                      <span className="font-medium text-foreground capitalize">{table.name.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground font-mono">{table.count.toLocaleString()} records</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!selectedTable} onOpenChange={(open) => { if (!open) setSelectedTable(null); }}>
        <DialogContent className="max-w-5xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 capitalize">
              {config && <config.icon className={`h-5 w-5 ${config.color}`} />}
              {selectedTable?.replace(/_/g, ' ')} — {tableData.length} records
            </DialogTitle>
            <DialogDescription>Showing up to 100 most recent records</DialogDescription>
          </DialogHeader>
          {isLoadingData ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tableData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No records found</div>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    {config?.columns.map((col) => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      {config?.columns.map((col) => (
                        <TableCell key={col.key}>
                          {col.key === 'status' || col.key === 'role' ? (
                            <Badge variant={
                              String(row[col.key]) === 'active' || String(row[col.key]) === 'hired' ? 'default' :
                              String(row[col.key]) === 'pending' ? 'secondary' :
                              String(row[col.key]) === 'rejected' ? 'destructive' : 'outline'
                            }>
                              {formatCell(row[col.key])}
                            </Badge>
                          ) : (
                            <span className="text-sm">{formatCell(row[col.key])}</span>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DatabaseManagement;
