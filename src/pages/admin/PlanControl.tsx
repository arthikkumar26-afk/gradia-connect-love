import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, ArrowLeft, Search, RefreshCw, FileDown, Mail, Crown, Zap,
  CheckCircle, XCircle, History, Receipt,
} from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { AdminShell } from "@/components/admin/AdminShell";

type AccessRole = "admin" | "owner";

interface Props {
  accessRole: AccessRole;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

interface CandidateSub {
  id: string;
  candidate_id: string;
  plan: string;
  status: string;
  started_at: string;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

interface EmployerSub {
  id: string;
  employer_id: string;
  plan_id: string;
  plan_name: string;
  status: string;
  billing_cycle: string;
  amount: number;
  currency: string;
  started_at: string;
  ends_at: string | null;
  profile?: Profile;
}

interface ActivationLog {
  id: string;
  candidate_id: string | null;
  plan: string | null;
  previous_plan: string | null;
  source: string;
  payment_id: string | null;
  order_id: string | null;
  amount_paise: number | null;
  currency: string | null;
  activation_result: string;
  error_message: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  created_at: string;
}


const CANDIDATE_PLANS = ["free", "starter", "advance", "pro_accelerator", "elite"] as const;
const EMPLOYER_PLANS = ["starter", "growth", "enterprise"] as const;

const PlanControl = ({ accessRole }: Props) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);

  const [candidateSubs, setCandidateSubs] = useState<CandidateSub[]>([]);
  const [employerSubs, setEmployerSubs] = useState<EmployerSub[]>([]);
  const [history, setHistory] = useState<ActivationLog[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"candidates" | "employers" | "history">("candidates");

  // Plan-change dialog
  const [planDlgOpen, setPlanDlgOpen] = useState(false);
  const [planTarget, setPlanTarget] = useState<{
    type: "candidate" | "employer";
    id: string;
    userId: string;
    currentPlan: string;
    name: string;
    email: string;
  } | null>(null);
  const [newPlan, setNewPlan] = useState<string>("");
  const [planSubmitting, setPlanSubmitting] = useState(false);

  // Resend invoice dialog
  const [resendOpen, setResendOpen] = useState(false);
  const [resendTarget, setResendTarget] = useState<ActivationLog | null>(null);
  const [resendBusy, setResendBusy] = useState(false);

  /** Auth check */
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate(accessRole === "owner" ? "/owner/login" : "/admin/login");
        return;
      }
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", accessRole === "owner" ? ["owner"] : ["admin", "owner"])
        .maybeSingle();
      if (!role) {
        toast({ title: "Access denied", variant: "destructive" });
        navigate("/");
        return;
      }
      setAuthorized(true);
      setAuthChecked(true);
    })();
  }, [accessRole, navigate, toast]);

  /** Data fetch */
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [candRes, empRes, logRes] = await Promise.all([
        supabase.from("candidate_subscriptions").select("*").order("updated_at", { ascending: false }),
        supabase.from("subscriptions").select("*").order("updated_at", { ascending: false }),
        supabase.from("subscription_activation_logs").select("*").order("created_at", { ascending: false }).limit(500),
      ]);

      const candIds = Array.from(new Set((candRes.data || []).map(s => s.candidate_id)));
      const empIds = Array.from(new Set((empRes.data || []).map(s => s.employer_id)));
      const allIds = Array.from(new Set([...candIds, ...empIds, ...((logRes.data || []).map(l => l.candidate_id).filter(Boolean) as string[])]));

      let profilesMap: Record<string, Profile> = {};
      if (allIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, role")
          .in("id", allIds);
        (profiles || []).forEach(p => { profilesMap[p.id] = p as Profile; });
      }

      setCandidateSubs((candRes.data || []).map(s => ({ ...s, profile: profilesMap[s.candidate_id] })) as CandidateSub[]);
      setEmployerSubs((empRes.data || []).map(s => ({ ...s, profile: profilesMap[s.employer_id] })) as EmployerSub[]);
      setHistory((logRes.data || []) as ActivationLog[]);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authorized) fetchAll(); }, [authorized]);

  /** Filters */
  const q = search.trim().toLowerCase();
  const filteredCandidates = useMemo(() => candidateSubs.filter(s => {
    if (!q) return true;
    return s.profile?.email?.toLowerCase().includes(q) ||
      s.profile?.full_name?.toLowerCase().includes(q) ||
      s.plan.toLowerCase().includes(q) ||
      s.status.toLowerCase().includes(q);
  }), [candidateSubs, q]);

  const filteredEmployers = useMemo(() => employerSubs.filter(s => {
    if (!q) return true;
    return s.profile?.email?.toLowerCase().includes(q) ||
      s.profile?.full_name?.toLowerCase().includes(q) ||
      s.plan_name.toLowerCase().includes(q) ||
      s.status.toLowerCase().includes(q);
  }), [employerSubs, q]);

  const filteredHistory = useMemo(() => history.filter(h => {
    if (!q) return true;
    const profile = h.candidate_id ? candidateSubs.find(c => c.candidate_id === h.candidate_id)?.profile : undefined;
    return h.payment_id?.toLowerCase().includes(q) ||
      h.order_id?.toLowerCase().includes(q) ||
      h.plan?.toLowerCase().includes(q) ||
      profile?.email?.toLowerCase().includes(q);
  }), [history, candidateSubs, q]);

  /** Plan change */
  const openPlanChange = (
    type: "candidate" | "employer",
    sub: CandidateSub | EmployerSub,
  ) => {
    if (type === "candidate") {
      const c = sub as CandidateSub;
      setPlanTarget({
        type, id: c.id, userId: c.candidate_id,
        currentPlan: c.plan,
        name: c.profile?.full_name || "—",
        email: c.profile?.email || "—",
      });
      setNewPlan(c.plan);
    } else {
      const e = sub as EmployerSub;
      setPlanTarget({
        type, id: e.id, userId: e.employer_id,
        currentPlan: e.plan_id,
        name: e.profile?.full_name || "—",
        email: e.profile?.email || "—",
      });
      setNewPlan(e.plan_id);
    }
    setPlanDlgOpen(true);
  };

  const submitPlanChange = async () => {
    if (!planTarget || !newPlan) return;
    if (newPlan === planTarget.currentPlan) {
      toast({ title: "Same plan selected" });
      return;
    }
    setPlanSubmitting(true);
    const previousPlan = planTarget.currentPlan;
    const { data: { user: actor } } = await supabase.auth.getUser();
    const nowIso = new Date().toISOString();
    const endsIso = new Date(Date.now() + 30 * 86400_000).toISOString();
    const baseLog = {
      candidate_id: planTarget.type === "candidate" ? planTarget.userId : null,
      plan: newPlan,
      previous_plan: previousPlan,
      source: planTarget.type === "candidate"
        ? "admin_manual_activation"
        : "admin_manual_activation_employer",
      actor_user_id: actor?.id ?? null,
      actor_email: actor?.email ?? null,
      subscription_id: planTarget.id,
      payload_summary: {
        target_user_id: planTarget.userId,
        target_name: planTarget.name,
        target_email: planTarget.email,
        type: planTarget.type,
      },
    };
    try {
      if (planTarget.type === "candidate") {
        // Deactivate any other active/trial rows for this candidate so the
        // app's "active subscription" lookup resolves to exactly one row.
        const { error: deactErr } = await supabase
          .from("candidate_subscriptions")
          .update({ status: "inactive", updated_at: nowIso })
          .eq("candidate_id", planTarget.userId)
          .neq("id", planTarget.id)
          .in("status", ["active", "trial"]);
        if (deactErr) throw deactErr;

        // Activate the selected row with the new plan.
        const { error } = await supabase
          .from("candidate_subscriptions")
          .update({
            plan: newPlan,
            status: "active",
            started_at: nowIso,
            ends_at: endsIso,
            updated_at: nowIso,
          })
          .eq("id", planTarget.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan_id: newPlan,
            plan_name: newPlan.charAt(0).toUpperCase() + newPlan.slice(1),
            status: "active",
            updated_at: nowIso,
          })
          .eq("id", planTarget.id);
        if (error) throw error;
      }

      await supabase.from("subscription_activation_logs").insert({
        ...baseLog,
        activation_result: "success",
      });

      toast({
        title: "Plan updated",
        description: `${planTarget.name} → ${newPlan}`,
      });
      setPlanDlgOpen(false);
      fetchAll();
    } catch (e: any) {
      await supabase.from("subscription_activation_logs").insert({
        ...baseLog,
        activation_result: "failed",
        error_message: e?.message ?? String(e),
      });
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setPlanSubmitting(false);
    }
  };


  /** Invoice helpers */
  const buildInvoicePdf = (log: ActivationLog, profile?: Profile) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const W = doc.internal.pageSize.getWidth();
    const dt = new Date(log.created_at);
    const tail = (log.payment_id || log.id).replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
    const invoiceNo = `GRD-${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, "0")}-${tail}`;

    // Brand bar
    doc.setFillColor(30, 111, 217);
    doc.rect(0, 0, W, 56, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Gradia", 36, 36);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("TAX INVOICE", W - 36, 36, { align: "right" });

    // Body
    doc.setTextColor(33, 37, 41);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Invoice #: ${invoiceNo}`, 36, 90);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${format(dt, "dd MMM yyyy, hh:mm a")}`, 36, 108);

    doc.setFont("helvetica", "bold");
    doc.text("Billed To", 36, 144);
    doc.setFont("helvetica", "normal");
    doc.text(profile?.full_name || "—", 36, 162);
    doc.text(profile?.email || "—", 36, 178);

    doc.setFont("helvetica", "bold");
    doc.text("Payment Details", 320, 144);
    doc.setFont("helvetica", "normal");
    doc.text(`Plan: ${log.plan || "—"}`, 320, 162);
    doc.text(`Payment ID: ${log.payment_id || "—"}`, 320, 178);
    doc.text(`Order ID: ${log.order_id || "—"}`, 320, 194);

    // Amount box
    doc.setFillColor(245, 247, 250);
    doc.rect(36, 230, W - 72, 60, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Amount Paid", 52, 260);
    const amount = log.amount_paise ? (log.amount_paise / 100).toFixed(2) : "0.00";
    doc.text(`${log.currency || "INR"} ${amount}`, W - 52, 260, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Status: ${log.activation_result.toUpperCase()}`, 52, 280);

    // Footer
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(9);
    doc.text("Gradia Hiring Pvt Ltd · info@gradiaa.com · www.gradiaa.com", W / 2, 800, { align: "center" });

    return { doc, invoiceNo };
  };

  const downloadInvoice = (log: ActivationLog) => {
    const profile = log.candidate_id ? candidateSubs.find(c => c.candidate_id === log.candidate_id)?.profile : undefined;
    const { doc, invoiceNo } = buildInvoicePdf(log, profile);
    doc.save(`${invoiceNo}.pdf`);
  };

  const submitResend = async () => {
    if (!resendTarget) return;
    const profile = resendTarget.candidate_id ? candidateSubs.find(c => c.candidate_id === resendTarget.candidate_id)?.profile : undefined;
    if (!profile?.email) {
      toast({ title: "No recipient email on file", variant: "destructive" });
      return;
    }
    setResendBusy(true);
    try {
      const amount = resendTarget.amount_paise ? resendTarget.amount_paise / 100 : 0;
      const { error } = await supabase.functions.invoke("send-payment-receipt", {
        body: {
          user_id: resendTarget.candidate_id,
          email: profile.email,
          name: profile.full_name,
          payment_id: resendTarget.payment_id || resendTarget.id,
          order_id: resendTarget.order_id,
          amount,
          item_name: `${(resendTarget.plan || "Subscription").toUpperCase()} Plan`,
          item_description: `Gradia ${resendTarget.plan || ""} subscription`,
          item_type: "subscription",
          user_role: profile.role,
          paid_at: resendTarget.created_at,
        },
      });
      if (error) throw error;
      toast({ title: "Invoice emailed", description: profile.email });
      setResendOpen(false);
    } catch (e: any) {
      toast({ title: "Email failed", description: e.message, variant: "destructive" });
    } finally {
      setResendBusy(false);
    }
  };

  /** Render */
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }
  if (!authorized) return null;

  const backPath = accessRole === "owner" ? "/owner/dashboard" : "/admin/dashboard";

  const headerControls = (
    <>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, plan…" className="pl-8 h-9 w-72" />
      </div>
      <Button size="sm" variant="outline" onClick={fetchAll} disabled={loading}>
        <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh
      </Button>
    </>
  );

  const pageBody = (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">

          <Stat label="Active Candidates" value={candidateSubs.filter(s => s.status === "active").length} />
          <Stat label="Active Employers" value={employerSubs.filter(s => s.status === "active").length} />
          <Stat label="Payments Logged" value={history.length} />
          <Stat label="Failed Activations" value={history.filter(h => h.activation_result !== "success").length} />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="candidates">Candidates ({filteredCandidates.length})</TabsTrigger>
            <TabsTrigger value="employers">Employers ({filteredEmployers.length})</TabsTrigger>
            <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1.5" />Payment History ({filteredHistory.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="candidates" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Ends</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCandidates.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{s.profile?.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{s.profile?.email || "—"}</div>
                        </TableCell>
                        <TableCell>{planBadge(s.plan)}</TableCell>
                        <TableCell>{statusBadge(s.status)}</TableCell>
                        <TableCell className="text-xs">{format(new Date(s.started_at), "dd MMM yyyy")}</TableCell>
                        <TableCell className="text-xs">{s.ends_at ? format(new Date(s.ends_at), "dd MMM yyyy") : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openPlanChange("candidate", s)}>
                            Upgrade / Change
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredCandidates.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">No candidate subscriptions</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employers" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employer</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cycle</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Ends</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployers.map(s => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{s.profile?.full_name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{s.profile?.email || "—"}</div>
                        </TableCell>
                        <TableCell>{planBadge(s.plan_id || s.plan_name)}</TableCell>
                        <TableCell>{statusBadge(s.status)}</TableCell>
                        <TableCell className="text-xs capitalize">{s.billing_cycle}</TableCell>
                        <TableCell className="text-xs">{s.currency} {Number(s.amount).toLocaleString("en-IN")}</TableCell>
                        <TableCell className="text-xs">{s.ends_at ? format(new Date(s.ends_at), "dd MMM yyyy") : "—"}</TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => openPlanChange("employer", s)}>
                            Upgrade / Change
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredEmployers.length === 0 && (
                      <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">No employer subscriptions</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Plan change</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead className="text-right">Invoice</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.map(h => {
                      const profile = h.candidate_id ? candidateSubs.find(c => c.candidate_id === h.candidate_id)?.profile : undefined;
                      return (
                        <TableRow key={h.id}>
                          <TableCell className="text-xs">{format(new Date(h.created_at), "dd MMM yyyy, hh:mm a")}</TableCell>
                          <TableCell>
                            <div className="text-sm">{profile?.full_name || "—"}</div>
                            <div className="text-xs text-muted-foreground">{profile?.email || "—"}</div>
                          </TableCell>
                          <TableCell className="text-xs">
                            {h.previous_plan ? (
                              <span className="text-muted-foreground">{h.previous_plan} → </span>
                            ) : null}
                            <span className="font-medium">{h.plan || "—"}</span>
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="capitalize">
                              {(h.source || "").replace(/_/g, " ") || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {h.actor_email ? (
                              <span title={h.actor_user_id ?? ""}>{h.actor_email}</span>
                            ) : h.source?.startsWith("admin_") ? (
                              <span className="text-muted-foreground">admin</span>
                            ) : (
                              <span className="text-muted-foreground">system</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs">
                            {h.amount_paise ? `${h.currency || "INR"} ${(h.amount_paise / 100).toFixed(2)}` : "—"}
                          </TableCell>
                          <TableCell className="text-xs font-mono">{h.payment_id || "—"}</TableCell>
                          <TableCell>
                            {resultBadge(h.activation_result)}
                            {h.error_message ? (
                              <div className="text-[10px] text-destructive mt-1 max-w-[220px] truncate" title={h.error_message}>
                                {h.error_message}
                              </div>
                            ) : null}
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => downloadInvoice(h)}>
                                <FileDown className="h-3.5 w-3.5 mr-1" />PDF
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => { setResendTarget(h); setResendOpen(true); }}>
                                <Mail className="h-3.5 w-3.5 mr-1" />Email
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredHistory.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">No payment history</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </>
    );

  const dialogs = (
    <>
      {/* Plan-change dialog */}
      <Dialog open={planDlgOpen} onOpenChange={setPlanDlgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change plan</DialogTitle>
            <DialogDescription>
              {planTarget?.name} ({planTarget?.email}) — current: <strong>{planTarget?.currentPlan}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium">New plan</label>
            <Select value={newPlan} onValueChange={setNewPlan}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(planTarget?.type === "candidate" ? CANDIDATE_PLANS : EMPLOYER_PLANS).map(p => (
                  <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Sets the subscription as active and (for candidates) extends end date by 30 days.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDlgOpen(false)} disabled={planSubmitting}>Cancel</Button>
            <Button onClick={submitPlanChange} disabled={planSubmitting}>
              {planSubmitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Apply change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resend invoice dialog */}
      <Dialog open={resendOpen} onOpenChange={setResendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Re-send invoice</DialogTitle>
            <DialogDescription>
              Email a fresh PDF invoice for payment <code className="text-xs">{resendTarget?.payment_id}</code>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResendOpen(false)} disabled={resendBusy}>Cancel</Button>
            <Button onClick={submitResend} disabled={resendBusy}>
              {resendBusy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Mail className="h-4 w-4 mr-1" />}
              Send email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (accessRole === "admin") {
    return (
      <AdminShell title="Plan Control" headerRight={headerControls}>
        {pageBody}
        {dialogs}
      </AdminShell>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm"><Link to={backPath}><ArrowLeft className="h-4 w-4 mr-1" />Back</Link></Button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" />Plan Control</h1>
              <p className="text-xs text-muted-foreground">Upgrade, change, view payment history & invoices</p>
            </div>
          </div>
          <div className="flex items-center gap-2">{headerControls}</div>
        </div>
      </header>
      <main className="p-6 max-w-[1400px] mx-auto">
        {pageBody}
      </main>
      {dialogs}
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <Card><CardContent className="p-4">
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </CardContent></Card>
);

const planBadge = (plan: string) => {
  const p = plan.toLowerCase();
  if (p === "elite" || p === "enterprise") return <Badge className="bg-amber-500/10 text-amber-700 border-amber-200"><Crown className="h-3 w-3 mr-1" />{plan}</Badge>;
  if (p === "pro_accelerator" || p === "growth") return <Badge className="bg-purple-500/10 text-purple-700 border-purple-200"><Crown className="h-3 w-3 mr-1" />{plan}</Badge>;
  if (p === "advance") return <Badge className="bg-blue-500/10 text-blue-700 border-blue-200"><Zap className="h-3 w-3 mr-1" />{plan}</Badge>;
  if (p === "starter") return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-200"><Zap className="h-3 w-3 mr-1" />{plan}</Badge>;
  return <Badge variant="secondary">{plan}</Badge>;
};

const statusBadge = (status: string) => {
  const s = status.toLowerCase();
  if (s === "active") return <Badge className="bg-green-500/10 text-green-700 border-green-200">Active</Badge>;
  if (s === "cancelled" || s === "expired") return <Badge className="bg-red-500/10 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" />{status}</Badge>;
  if (s === "trial") return <Badge className="bg-blue-500/10 text-blue-700 border-blue-200">Trial</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
};

const resultBadge = (result: string) => {
  const r = result.toLowerCase();
  if (r === "success") return <Badge className="bg-green-500/10 text-green-700 border-green-200">Success</Badge>;
  if (r === "pending") return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-200">Pending</Badge>;
  return <Badge className="bg-red-500/10 text-red-700 border-red-200">{result}</Badge>;
};

export default PlanControl;
