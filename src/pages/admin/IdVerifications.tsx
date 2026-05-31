import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { BadgeCheck, ShieldCheck, FileText, Search, Loader2, XCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface IdProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
  govt_id_type: string | null;
  govt_id_number: string | null;
  govt_id_url: string | null;
  govt_id_verified: boolean | null;
  govt_id_submitted_at: string | null;
  govt_id_verified_at: string | null;
}

const ID_LABEL: Record<string, string> = {
  aadhaar: "Aadhaar",
  pan: "PAN",
  passport: "Passport",
  voter_id: "Voter ID",
  driving_license: "Driving License",
};

const IdVerifications = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<IdProfile[]>([]);
  const [q, setQ] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "verified">("pending");

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, govt_id_type, govt_id_number, govt_id_url, govt_id_verified, govt_id_submitted_at, govt_id_verified_at")
      .not("govt_id_submitted_at", "is", null)
      .order("govt_id_submitted_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
    } else {
      setRows((data || []) as IdProfile[]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const filtered = rows.filter(r => {
    if (tab === "pending" && r.govt_id_verified) return false;
    if (tab === "verified" && !r.govt_id_verified) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      r.full_name?.toLowerCase().includes(s) ||
      r.email?.toLowerCase().includes(s) ||
      r.govt_id_number?.toLowerCase().includes(s) ||
      r.role?.toLowerCase().includes(s)
    );
  });

  const approve = async (row: IdProfile) => {
    setActing(row.id);
    const { error } = await supabase
      .from("profiles")
      .update({ govt_id_verified: true, govt_id_verified_at: new Date().toISOString() })
      .eq("id", row.id);
    setActing(null);
    if (error) return toast({ title: "Approval failed", description: error.message, variant: "destructive" });
    toast({ title: "Approved ✓", description: `${row.full_name || row.email} now has the verified badge.` });
    fetchRows();
  };

  const revoke = async (row: IdProfile) => {
    setActing(row.id);
    const { error } = await supabase
      .from("profiles")
      .update({ govt_id_verified: false, govt_id_verified_at: null })
      .eq("id", row.id);
    setActing(null);
    if (error) return toast({ title: "Revoke failed", description: error.message, variant: "destructive" });
    toast({ title: "Verification revoked" });
    fetchRows();
  };

  const openDoc = async (row: IdProfile) => {
    if (!row.govt_id_url) {
      toast({ title: "No document uploaded", variant: "destructive" });
      return;
    }
    // If stored value is already a signed URL, just open it. Otherwise sign the path.
    if (row.govt_id_url.startsWith("http")) {
      window.open(row.govt_id_url, "_blank", "noopener");
      return;
    }
    const { data, error } = await supabase.storage
      .from("govt-id-documents")
      .createSignedUrl(row.govt_id_url, 60 * 10);
    if (error || !data?.signedUrl) {
      toast({ title: "Couldn't open document", description: error?.message, variant: "destructive" });
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const pendingCount = rows.filter(r => !r.govt_id_verified).length;
  const verifiedCount = rows.filter(r => r.govt_id_verified).length;

  return (
    <AdminShell
      title="ID Verifications"
      headerRight={
        <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      }
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Government ID Verification Requests
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Review user-submitted government IDs. Approving grants the verified tick on their profile.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name, email, ID number, role..." value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v: any) => setTab(v)}>
            <TabsList>
              <TabsTrigger value="pending">Pending ({pendingCount})</TabsTrigger>
              <TabsTrigger value="verified">Verified ({verifiedCount})</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  No {tab} verifications.
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>ID Type</TableHead>
                        <TableHead>ID Number</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(row => (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div className="font-medium">{row.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{row.email}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{row.role || "—"}</Badge>
                          </TableCell>
                          <TableCell>{ID_LABEL[row.govt_id_type || ""] || row.govt_id_type || "—"}</TableCell>
                          <TableCell className="font-mono text-xs">{row.govt_id_number || "—"}</TableCell>
                          <TableCell className="text-xs">
                            {row.govt_id_submitted_at ? format(new Date(row.govt_id_submitted_at), "dd MMM yyyy, HH:mm") : "—"}
                          </TableCell>
                          <TableCell>
                            {row.govt_id_verified ? (
                              <Badge className="bg-green-600 hover:bg-green-600 text-white">
                                <BadgeCheck className="h-3 w-3 mr-1" /> Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-500/50 text-amber-700">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2 whitespace-nowrap">
                            <Button size="sm" variant="outline" onClick={() => openDoc(row)}>
                              <FileText className="h-3.5 w-3.5 mr-1" /> View Doc
                            </Button>
                            {row.govt_id_verified ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={acting === row.id}
                                onClick={() => revoke(row)}
                              >
                                {acting === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (<><XCircle className="h-3.5 w-3.5 mr-1" /> Revoke</>)}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                disabled={acting === row.id}
                                onClick={() => approve(row)}
                              >
                                {acting === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (<><BadgeCheck className="h-3.5 w-3.5 mr-1" /> Approve</>)}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AdminShell>
  );
};

export default IdVerifications;
