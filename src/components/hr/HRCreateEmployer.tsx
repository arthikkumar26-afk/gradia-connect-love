import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, UserPlus, Loader2, Check, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

// Wallet-points pricing (₹5 = 1 pt). Mirrors employer plans in src/config/plans.ts
const PLANS = [
  { id: "starter", name: "Starter", points: 1000, features: ["3 job posts", "1 team seat", "Basic ATS", "Email support"] },
  { id: "growth", name: "Growth", points: 3000, popular: true, features: ["15 job posts", "5 team seats", "Screening tests", "Analytics"] },
  { id: "professional", name: "Professional", points: 5800, features: ["50 job posts", "15 seats", "AI interviews", "Advanced analytics"] },
  { id: "enterprise", name: "Enterprise", points: 12000, features: ["Unlimited posts", "Unlimited seats", "Custom integrations", "SLA"] },
];

interface Props {
  onCreated?: () => void;
}

const HRCreateEmployer = ({ onCreated }: Props) => {
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [planId, setPlanId] = useState("starter");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [creating, setCreating] = useState(false);

  const generatePassword = () => {
    const s = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let out = "";
    for (let i = 0; i < 12; i++) out += s[Math.floor(Math.random() * s.length)];
    setPassword(out + "@1");
  };

  const handleCreate = async () => {
    if (!companyName.trim() || !fullName.trim() || !email.includes("@") || password.length < 8) {
      toast.error("Fill company name, contact name, valid email and password (8+ chars).");
      return;
    }
    setCreating(true);
    try {
      const plan = PLANS.find(p => p.id === planId)!;
      const price = billingCycle === "yearly" ? Math.round(plan.price * 12 * 0.85) : plan.price;
      const { data, error } = await supabase.functions.invoke("create-employer-account", {
        body: {
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          company_name: companyName.trim(),
          phone: phone.trim() || null,
          website: website.trim() || null,
          industry: industry.trim() || null,
          location: location.trim() || null,
          plan_id: plan.id,
          plan_name: plan.name,
          plan_price: price,
          billing_cycle: billingCycle,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Employer ${companyName} created${data?.email_sent ? " — credentials emailed" : ""}.`);
      // Reset
      setCompanyName(""); setFullName(""); setEmail(""); setPassword("");
      setPhone(""); setWebsite(""); setIndustry(""); setLocation("");
      setPlanId("starter"); setBillingCycle("monthly");
      onCreated?.();
    } catch (e: any) {
      toast.error(e.message || "Failed to create employer");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" /> Create Employer Account
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Onboard a new employer with login credentials and an initial plan. They'll appear in <strong>Employers Data</strong> after creation.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Company & contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Company Name *</Label>
            <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Primary Contact Name *</Label>
            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="HR Manager" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Login Email *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="hiring@acme.com" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Temporary Password *</Label>
            <div className="flex gap-2">
              <Input value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters" className="h-9 text-sm" />
              <Button type="button" variant="outline" size="sm" onClick={generatePassword}>Generate</Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 ..." className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Website</Label>
            <Input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://acme.com" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Industry</Label>
            <Input value={industry} onChange={e => setIndustry(e.target.value)} placeholder="IT / Education / Manufacturing" className="h-9 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Location</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" className="h-9 text-sm" />
          </div>
        </div>

        {/* Plan selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <Label className="text-sm font-semibold">Select Plan</Label>
            <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
              <button type="button" onClick={() => setBillingCycle("monthly")} className={cn("px-3 py-1 text-xs rounded", billingCycle === "monthly" ? "bg-background shadow font-medium" : "text-muted-foreground")}>Monthly</button>
              <button type="button" onClick={() => setBillingCycle("yearly")} className={cn("px-3 py-1 text-xs rounded", billingCycle === "yearly" ? "bg-background shadow font-medium" : "text-muted-foreground")}>Yearly · Save 15%</button>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {PLANS.map(p => {
              const active = planId === p.id;
              const price = billingCycle === "yearly" ? Math.round(p.price * 12 * 0.85) : p.price;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPlanId(p.id)}
                  className={cn(
                    "border rounded-lg p-3 text-left transition relative",
                    active ? "border-primary ring-2 ring-primary/30 bg-primary/5" : "border-border hover:border-primary/40"
                  )}
                >
                  {p.popular && <span className="absolute -top-2 right-2 text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">POPULAR</span>}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{p.name}</span>
                    {active && <Check className="h-3.5 w-3.5 text-primary" />}
                  </div>
                  <div className="text-lg font-bold">
                    {p.price === 0 ? "Free" : `₹${price.toLocaleString()}`}
                    {p.price > 0 && <span className="text-[10px] text-muted-foreground font-normal">/{billingCycle === "yearly" ? "yr" : "mo"}</span>}
                  </div>
                  <ul className="mt-2 space-y-0.5">
                    {p.features.slice(0, 3).map(f => (
                      <li key={f} className="text-[10px] text-muted-foreground flex items-start gap-1">
                        <Check className="h-2.5 w-2.5 text-primary mt-0.5 shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Building2 className="h-4 w-4 mr-1.5" />}
            Create Employer Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default HRCreateEmployer;
