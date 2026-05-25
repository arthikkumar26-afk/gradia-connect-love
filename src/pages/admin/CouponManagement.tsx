import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Ticket, Users, Tag, RefreshCw, Trash2, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CANDIDATE_PLANS, CANDIDATE_PLAN_ORDER } from "@/config/candidatePlans";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  applicable_to: string;
  max_total_uses: number | null;
  max_uses_per_user: number;
  total_used: number;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  created_at: string;
}

interface CouponUsage {
  id: string;
  coupon_id: string;
  user_id: string;
  user_role: string;
  plan_name: string | null;
  discount_applied: number;
  original_amount: number;
  final_amount: number;
  used_at: string;
}

const CouponManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [usages, setUsages] = useState<CouponUsage[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [couponCodesMap, setCouponCodesMap] = useState<Record<string, string>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: "",
    min_order_amount: "",
    max_discount_amount: "",
    applicable_to: "both",
    max_total_uses: "",
    max_uses_per_user: "1",
    valid_until: "",
    applicable_packages: [] as string[],
  });

  // Form state
  const candidatePackages = CANDIDATE_PLAN_ORDER.map((id) => {
    const plan = CANDIDATE_PLANS[id];
    return `${plan.name} (${plan.priceLabel})`;
  });
  const employerPackages = ["Growth (₹4,999/mo)", "Professional (₹14,999/mo)", "Enterprise (₹29,000/mo)"];
  const freelancerPackages: string[] = []; // temporarily hidden
  const walletPackages = ["200 pts", "500 pts", "1,000 pts", "2,000 pts"];

  const [form, setForm] = useState({
    code: "",
    applicable_packages: [] as string[],
    discount_type: "percentage",
    discount_value: "",
    min_order_amount: "",
    max_discount_amount: "",
    applicable_to: "both",
    max_total_uses: "",
    max_uses_per_user: "1",
    valid_until: "",
  });

  const getAvailablePackages = (applicableTo?: string) => {
    const target = applicableTo || form.applicable_to;
    if (target === "candidate") return candidatePackages;
    if (target === "employer") return employerPackages;
    if (target === "freelancer") return freelancerPackages;
    if (target === "wallet") return walletPackages;
    return [...candidatePackages, ...employerPackages, ...freelancerPackages, ...walletPackages];
  };

  const togglePackage = (pkg: string) => {
    setForm(prev => ({
      ...prev,
      applicable_packages: prev.applicable_packages.includes(pkg)
        ? prev.applicable_packages.filter(p => p !== pkg)
        : [...prev.applicable_packages, pkg],
    }));
  };

  const toggleEditPackage = (pkg: string) => {
    setEditForm(prev => ({
      ...prev,
      applicable_packages: prev.applicable_packages.includes(pkg)
        ? prev.applicable_packages.filter(p => p !== pkg)
        : [...prev.applicable_packages, pkg],
    }));
  };

  const openEditDialog = (c: Coupon) => {
    setEditCoupon(c);
    setEditForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_order_amount: c.min_order_amount ? String(c.min_order_amount) : "",
      max_discount_amount: c.max_discount_amount ? String(c.max_discount_amount) : "",
      applicable_to: c.applicable_to,
      max_total_uses: c.max_total_uses ? String(c.max_total_uses) : "",
      max_uses_per_user: String(c.max_uses_per_user),
      valid_until: c.valid_until ? c.valid_until.slice(0, 16) : "",
      applicable_packages: c.description ? c.description.split(", ").filter(Boolean) : [],
    });
  };

  const handleEdit = async () => {
    if (!editCoupon) return;
    setEditSaving(true);
    try {
      const { error } = await supabase.from("discount_coupons").update({
        code: editForm.code.toUpperCase().trim(),
        description: editForm.applicable_packages.length > 0 ? editForm.applicable_packages.join(", ") : null,
        discount_type: editForm.discount_type,
        discount_value: parseFloat(editForm.discount_value),
        min_order_amount: editForm.min_order_amount ? parseFloat(editForm.min_order_amount) : 0,
        max_discount_amount: editForm.max_discount_amount ? parseFloat(editForm.max_discount_amount) : null,
        applicable_to: editForm.applicable_to,
        max_total_uses: editForm.max_total_uses ? parseInt(editForm.max_total_uses) : null,
        max_uses_per_user: parseInt(editForm.max_uses_per_user) || 1,
        valid_until: editForm.valid_until || null,
      }).eq("id", editCoupon.id);
      if (error) throw error;
      toast({ title: "Coupon Updated!", description: `Code: ${editForm.code.toUpperCase()}` });
      setEditCoupon(null);
      fetchCoupons();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/admin/login"); return; }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "owner"]);
    if (!data || data.length === 0) { navigate("/admin/login"); return; }
    setIsAuthorized(true);
    setIsLoading(false);
    fetchCoupons();
    fetchUsages();
  };

  const fetchCoupons = async () => {
    const { data } = await supabase
      .from("discount_coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setCoupons(data as Coupon[]);
  };

  const fetchUsages = async () => {
    const { data } = await supabase
      .from("coupon_usages")
      .select("*")
      .order("used_at", { ascending: false });
    if (data) {
      setUsages(data as CouponUsage[]);
      const userIds = [...new Set((data as CouponUsage[]).map(u => u.user_id))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);
        if (profiles) {
          const map: Record<string, string> = {};
          profiles.forEach(p => { map[p.id] = `${p.full_name} (${p.email})`; });
          setUsersMap(map);
        }
      }
      const couponIds = [...new Set((data as CouponUsage[]).map(u => u.coupon_id))];
      if (couponIds.length > 0) {
        const { data: cpns } = await supabase
          .from("discount_coupons")
          .select("id, code")
          .in("id", couponIds);
        if (cpns) {
          const map: Record<string, string> = {};
          cpns.forEach(c => { map[(c as any).id] = (c as any).code; });
          setCouponCodesMap(map);
        }
      }
    }
  };

  const handleCreate = async () => {
    if (!form.code) {
      toast({ title: "Error", description: "Coupon code is required", variant: "destructive" });
      return;
    }
    if (form.discount_type !== "free_points" && !form.discount_value) {
      toast({ title: "Error", description: "Discount value is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("discount_coupons").insert({
        code: form.code.toUpperCase().trim(),
        description: form.applicable_packages.length > 0 ? form.applicable_packages.join(", ") : null,
        discount_type: form.discount_type,
        discount_value: form.discount_type === "free_points" ? 100 : parseFloat(form.discount_value),
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : 0,
        max_discount_amount: form.max_discount_amount ? parseFloat(form.max_discount_amount) : null,
        applicable_to: form.applicable_to,
        max_total_uses: form.max_total_uses ? parseInt(form.max_total_uses) : null,
        max_uses_per_user: parseInt(form.max_uses_per_user) || 1,
        valid_until: form.valid_until || null,
        created_by: user?.id,
      });
      if (error) throw error;
      toast({ title: "Coupon Created!", description: `Code: ${form.code.toUpperCase()}` });
      setShowCreate(false);
      setForm({ code: "", applicable_packages: [], discount_type: "percentage", discount_value: "", min_order_amount: "", max_discount_amount: "", applicable_to: "both", max_total_uses: "", max_uses_per_user: "1", valid_until: "" });
      fetchCoupons();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleCoupon = async (id: string, isActive: boolean) => {
    await supabase.from("discount_coupons").update({ is_active: !isActive }).eq("id", id);
    fetchCoupons();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("discount_coupons").delete().eq("id", id);
    fetchCoupons();
    toast({ title: "Coupon deleted" });
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!isAuthorized) return null;

  const renderCouponFormFields = (
    formState: typeof form,
    setFormState: (v: any) => void,
    togglePkg: (pkg: string) => void
  ) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Coupon Code *</Label>
          <Input value={formState.code} onChange={e => setFormState({...formState, code: e.target.value})} placeholder="e.g. SAVE20" className="uppercase" />
        </div>
        <div>
          <Label>Discount Type</Label>
          <Select value={formState.discount_type} onValueChange={v => setFormState({...formState, discount_type: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
              <SelectItem value="bonus_points">Bonus Wallet Points (Fixed)</SelectItem>
              <SelectItem value="free_points">Free Points (User Chooses Amount)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {formState.discount_type === "free_points" && (
        <div className="rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Free Points Coupon:</strong> Candidates redeem this code in their wallet and choose how many points to add — completely free. Set an optional max cap below.
        </div>
      )}
      {formState.discount_type !== "bonus_points" && formState.discount_type !== "free_points" && (
        <div>
          <Label>Applicable Packages</Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {getAvailablePackages(formState.applicable_to).map(pkg => (
              <Badge
                key={pkg}
                variant={formState.applicable_packages.includes(pkg) ? "default" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => togglePkg(pkg)}
              >
                {pkg}
              </Badge>
            ))}
          </div>
          {formState.applicable_packages.length === 0 && (
            <p className="text-xs text-muted-foreground mt-1">All packages if none selected</p>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        {formState.discount_type !== "free_points" && (
          <div>
            <Label>
              {formState.discount_type === "bonus_points" ? "Points to Award *" : "Discount Value *"}
            </Label>
            <Input
              type="number"
              value={formState.discount_value}
              onChange={e => setFormState({...formState, discount_value: e.target.value})}
              placeholder={formState.discount_type === "percentage" ? "e.g. 20" : formState.discount_type === "bonus_points" ? "e.g. 500" : "e.g. 500"}
            />
          </div>
        )}
        {formState.discount_type === "free_points" && (
          <div>
            <Label>Max Points Per Redemption</Label>
            <Input
              type="number"
              value={formState.max_discount_amount}
              onChange={e => setFormState({...formState, max_discount_amount: e.target.value})}
              placeholder="Optional — leave empty for unlimited"
            />
          </div>
        )}
        {formState.discount_type !== "bonus_points" && formState.discount_type !== "free_points" && (
          <div>
            <Label>Max Discount (₹)</Label>
            <Input type="number" value={formState.max_discount_amount} onChange={e => setFormState({...formState, max_discount_amount: e.target.value})} placeholder="Optional cap" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Applicable To</Label>
          <Select value={formState.applicable_to} onValueChange={v => setFormState({...formState, applicable_to: v})}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="both">All Users</SelectItem>
              <SelectItem value="candidate">Candidates Only</SelectItem>
              <SelectItem value="employer">Employers Only</SelectItem>
              {/* Freelancers temporarily hidden */}
              <SelectItem value="wallet">Wallet Top-up Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Min Order Amount (₹)</Label>
          <Input type="number" value={formState.min_order_amount} onChange={e => setFormState({...formState, min_order_amount: e.target.value})} placeholder="0" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Max Total Uses</Label>
          <Input type="number" value={formState.max_total_uses} onChange={e => setFormState({...formState, max_total_uses: e.target.value})} placeholder="Unlimited" />
        </div>
        <div>
          <Label>Max Uses Per User</Label>
          <Input type="number" value={formState.max_uses_per_user} onChange={e => setFormState({...formState, max_uses_per_user: e.target.value})} placeholder="1" />
        </div>
      </div>
      <div>
        <Label>Valid Until</Label>
        <Input type="datetime-local" value={formState.valid_until} onChange={e => setFormState({...formState, valid_until: e.target.value})} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Ticket className="h-6 w-6 text-primary" /> Coupon Management
            </h1>
            <p className="text-muted-foreground text-sm">Create and manage discount coupons</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={() => { fetchCoupons(); fetchUsages(); }}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate("/admin/dashboard")}>Back to Dashboard</Button>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" /> Create Coupon</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto z-[1100]">
                <DialogHeader>
                  <DialogTitle>Create New Coupon</DialogTitle>
                </DialogHeader>
                {renderCouponFormFields(form, setForm, togglePackage)}
                <Button onClick={handleCreate} disabled={saving} className="w-full">
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Create Coupon
                </Button>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="coupons">
          <TabsList>
            <TabsTrigger value="coupons" className="gap-2"><Tag className="h-4 w-4" /> All Coupons</TabsTrigger>
            <TabsTrigger value="usage" className="gap-2"><Users className="h-4 w-4" /> Usage History</TabsTrigger>
          </TabsList>

          <TabsContent value="coupons">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Coupons ({coupons.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead></TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>For</TableHead>
                        <TableHead>Used</TableHead>
                        <TableHead>Valid Until</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coupons.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No coupons created yet</TableCell></TableRow>
                      ) : coupons.map(c => (
                        <>
                          <TableRow key={c.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}>
                            <TableCell className="w-8">
                              {expandedId === c.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                            </TableCell>
                            <TableCell className="font-mono font-bold">{c.code}</TableCell>
                            <TableCell>
                              {c.discount_type === "percentage" ? `${c.discount_value}%` : c.discount_type === "bonus_points" ? `+${c.discount_value} pts` : c.discount_type === "free_points" ? `Free Points${c.max_discount_amount ? ` (max ${c.max_discount_amount})` : " (unlimited)"}` : `₹${c.discount_value}`}
                              {c.discount_type !== "bonus_points" && c.discount_type !== "free_points" && c.max_discount_amount && <span className="text-xs text-muted-foreground ml-1">(max ₹{c.max_discount_amount})</span>}
                            </TableCell>
                            <TableCell><Badge variant="outline" className="capitalize text-xs">{c.applicable_to}</Badge></TableCell>
                            <TableCell>{c.total_used}/{c.max_total_uses || "∞"}</TableCell>
                            <TableCell className="text-xs">{c.valid_until ? format(new Date(c.valid_until), "dd MMM yyyy") : "No expiry"}</TableCell>
                            <TableCell>
                              <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : "Inactive"}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(c)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Switch checked={c.is_active} onCheckedChange={() => toggleCoupon(c.id, c.is_active)} />
                                <Button variant="ghost" size="icon" onClick={() => deleteCoupon(c.id)} className="text-destructive h-8 w-8">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {expandedId === c.id && (
                            <TableRow key={`${c.id}-expand`}>
                              <TableCell colSpan={8} className="bg-muted/30 p-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Discount Type</p>
                                    <p className="font-medium capitalize text-foreground">{c.discount_type}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Discount Value</p>
                                    <p className="font-medium text-foreground">{c.discount_type === "percentage" ? `${c.discount_value}%` : `₹${c.discount_value}`}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Max Discount</p>
                                    <p className="font-medium text-foreground">{c.max_discount_amount ? `₹${c.max_discount_amount}` : "No cap"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Min Order</p>
                                    <p className="font-medium text-foreground">{c.min_order_amount ? `₹${c.min_order_amount}` : "₹0"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Max Total Uses</p>
                                    <p className="font-medium text-foreground">{c.max_total_uses || "Unlimited"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Max Per User</p>
                                    <p className="font-medium text-foreground">{c.max_uses_per_user}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Created</p>
                                    <p className="font-medium text-foreground">{format(new Date(c.created_at), "dd MMM yyyy HH:mm")}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Applicable Packages</p>
                                    <p className="font-medium text-foreground">{c.description || "All packages"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Valid From</p>
                                    <p className="font-medium text-foreground">{format(new Date(c.valid_from), "dd MMM yyyy HH:mm")}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Valid Until</p>
                                    <p className="font-medium text-foreground">{c.valid_until ? format(new Date(c.valid_until), "dd MMM yyyy HH:mm") : "No expiry"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Times Used</p>
                                    <p className="font-medium text-foreground">{c.total_used}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Status</p>
                                    <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : "Inactive"}</Badge>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Coupon Usage History ({usages.length})</CardTitle>
                <CardDescription>Track which users used which coupons</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Coupon</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Original</TableHead>
                        <TableHead>Discount</TableHead>
                        <TableHead>Final</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usages.length === 0 ? (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No coupon usage yet</TableCell></TableRow>
                      ) : usages.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="text-sm max-w-[200px] truncate">{usersMap[u.user_id] || u.user_id.slice(0, 8)}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize text-xs">{u.user_role}</Badge></TableCell>
                          <TableCell className="font-mono font-bold">{couponCodesMap[u.coupon_id] || "—"}</TableCell>
                          <TableCell>{u.plan_name || "—"}</TableCell>
                          <TableCell>₹{u.original_amount}</TableCell>
                          <TableCell className="text-green-600">-₹{u.discount_applied}</TableCell>
                          <TableCell className="font-semibold">₹{u.final_amount}</TableCell>
                          <TableCell className="text-xs">{format(new Date(u.used_at), "dd MMM yyyy HH:mm")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Coupon Dialog */}
      <Dialog open={!!editCoupon} onOpenChange={open => { if (!open) setEditCoupon(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto z-[1100]">
          <DialogHeader>
            <DialogTitle>Edit Coupon — {editCoupon?.code}</DialogTitle>
          </DialogHeader>
          {renderCouponFormFields(editForm, setEditForm, toggleEditPackage)}
          <Button onClick={handleEdit} disabled={editSaving} className="w-full">
            {editSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Pencil className="h-4 w-4 mr-2" />}
            Save Changes
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CouponManagement;
