import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserPlus, Users, Trash2, Mail } from "lucide-react";
import { toast } from "sonner";

interface HRAccount {
  id: string;
  hr_user_id: string;
  is_active: boolean;
  created_at: string;
  profile: { id: string; full_name: string; email: string } | null;
}

export const HRManagementContent = () => {
  const [hrAccounts, setHrAccounts] = useState<HRAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("create-hr-account", {
      body: { action: "list" },
    });
    if (error) toast.error(error.message);
    else setHrAccounts(data?.hr_accounts ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.full_name || !form.email || !form.password) {
      toast.error("Please fill all fields");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-hr-account", {
      body: { action: "create", ...form },
    });
    setCreating(false);
    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Failed to create HR account");
      return;
    }
    toast.success(`HR account created for ${form.email}`);
    setForm({ full_name: "", email: "", password: "" });
    setOpen(false);
    load();
  };

  const handleDeactivate = async (hr_user_id: string) => {
    if (!confirm("Deactivate this HR account? They will lose access immediately.")) return;
    const { error } = await supabase.functions.invoke("create-hr-account", {
      body: { action: "deactivate", hr_user_id },
    });
    if (error) toast.error(error.message);
    else { toast.success("HR account deactivated"); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> HR Management</h2>
          <p className="text-sm text-muted-foreground">Create HR sub-accounts linked to your company. They can manage jobs, candidates, and interviews — but not billing or company settings.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="h-4 w-4 mr-1" /> Add HR Account</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create HR Account</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Doe" />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="hr.jane@company.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Initial Password</Label>
                <Input type="text" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
                <p className="text-xs text-muted-foreground">Share this with the HR user securely. They can sign in at /hr/login.</p>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={creating}>
                {creating ? "Creating…" : "Create Account"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Your HR Accounts</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
           : hrAccounts.length === 0 ? <p className="text-sm text-muted-foreground">No HR accounts yet. Click "Add HR Account" to create one.</p>
           : (
            <div className="space-y-2">
              {hrAccounts.map(a => (
                <div key={a.id} className="border border-border rounded-md p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-pink-100 dark:bg-pink-900 flex items-center justify-center">
                      <Users className="h-4 w-4 text-pink-600 dark:text-pink-300" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{a.profile?.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> {a.profile?.email || "—"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Active" : "Inactive"}</Badge>
                    {a.is_active && (
                      <Button size="sm" variant="ghost" onClick={() => handleDeactivate(a.hr_user_id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HRManagementContent;
