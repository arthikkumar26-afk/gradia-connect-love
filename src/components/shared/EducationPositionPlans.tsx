import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Star, CreditCard, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// ─────────────────────────────────────────────────────────────────────────
// EDUCATION POSITION → BAND → PACK PRICING
// Mirrors the official PACKs (Processing Charges) table provided by ops.
// ─────────────────────────────────────────────────────────────────────────
export type EducationPlanKey = "A" | "B" | "C";
export interface EducationPosition {
  title: string;
  band: "Band 1" | "Band 2" | "Band 3" | "Band 4";
  group: "Group-I" | "Group-II" | "Group-III" | "Group-IV";
  segment: string;
  salaryRange: string;
  annualPackage: string;
  prices: Record<EducationPlanKey, number>;
}

export const EDUCATION_POSITIONS: EducationPosition[] = [
  // Group-I / Band 1 — Admin & Academics
  { title: "Principal — State Board", band: "Band 1", group: "Group-I", segment: "Admin & Academics", salaryRange: "₹50,000–80,000 pm", annualPackage: "₹3,00,000–5,00,000", prices: { A: 30000, B: 40000, C: 40000 } },
  { title: "Principal — CBSE Board", band: "Band 1", group: "Group-I", segment: "Admin & Academics", salaryRange: "₹90,000–1,50,000 pm", annualPackage: "₹8,00,000–10,00,000", prices: { A: 30000, B: 40000, C: 50000 } },
  { title: "Cluster Principal", band: "Band 1", group: "Group-I", segment: "Admin & Academics", salaryRange: "₹90,000–2,50,000 pm", annualPackage: "₹10,00,000–12,00,000", prices: { A: 30000, B: 40000, C: 50000 } },
  { title: "Academic Head", band: "Band 1", group: "Group-I", segment: "Admin & Academics", salaryRange: "₹1,00,000–1,50,000 pm", annualPackage: "₹8,00,000–10,00,000", prices: { A: 30000, B: 40000, C: 50000 } },
  { title: "SME (Subject Matter Expert)", band: "Band 1", group: "Group-I", segment: "Admin & Academics", salaryRange: "₹50,000–1,00,000 pm", annualPackage: "₹5,00,000–8,00,000", prices: { A: 30000, B: 40000, C: 40000 } },
  { title: "Resource Person", band: "Band 1", group: "Group-I", segment: "Admin & Academics", salaryRange: "₹50,000–90,000 pm", annualPackage: "₹5,00,000–8,00,000", prices: { A: 30000, B: 40000, C: 40000 } },

  // Group-II / Band 2 — High School
  { title: "Vice-Principal / Dean", band: "Band 2", group: "Group-II", segment: "High School", salaryRange: "₹40,000–60,000 pm", annualPackage: "₹4,00,000–5,00,000", prices: { A: 25000, B: 30000, C: 40000 } },
  { title: "Telugu Teacher (High School)", band: "Band 2", group: "Group-II", segment: "High School", salaryRange: "₹30,000–40,000 pm", annualPackage: "₹3,00,000–4,00,000", prices: { A: 20000, B: 25000, C: 30000 } },
  { title: "Hindi Teacher (High School)", band: "Band 2", group: "Group-II", segment: "High School", salaryRange: "₹30,000–40,000 pm", annualPackage: "₹3,00,000–4,00,000", prices: { A: 20000, B: 25000, C: 30000 } },
  { title: "English Teacher (High School)", band: "Band 2", group: "Group-II", segment: "High School", salaryRange: "₹30,000–40,000 pm", annualPackage: "₹3,00,000–4,00,000", prices: { A: 20000, B: 25000, C: 30000 } },
  { title: "Math Teacher (High School)", band: "Band 2", group: "Group-II", segment: "High School", salaryRange: "₹30,000–50,000 pm", annualPackage: "₹4,00,000–5,00,000", prices: { A: 25000, B: 30000, C: 40000 } },
  { title: "Physics Teacher (High School)", band: "Band 2", group: "Group-II", segment: "High School", salaryRange: "₹30,000–50,000 pm", annualPackage: "₹4,00,000–5,00,000", prices: { A: 25000, B: 30000, C: 40000 } },
  { title: "Chemistry Teacher (High School)", band: "Band 2", group: "Group-II", segment: "High School", salaryRange: "₹30,000–50,000 pm", annualPackage: "₹4,00,000–5,00,000", prices: { A: 25000, B: 30000, C: 40000 } },
  { title: "Biology Teacher (High School)", band: "Band 2", group: "Group-II", segment: "High School", salaryRange: "₹30,000–40,000 pm", annualPackage: "₹3,00,000–4,00,000", prices: { A: 20000, B: 25000, C: 30000 } },
  { title: "Social Teacher (High School)", band: "Band 2", group: "Group-II", segment: "High School", salaryRange: "₹30,000–40,000 pm", annualPackage: "₹3,00,000–4,00,000", prices: { A: 20000, B: 25000, C: 30000 } },
  { title: "Computer Teacher (High School)", band: "Band 2", group: "Group-II", segment: "High School", salaryRange: "₹25,000–30,000 pm", annualPackage: "₹3,00,000–4,00,000", prices: { A: 20000, B: 25000, C: 30000 } },
  { title: "P.E.T (Physical Education Teacher)", band: "Band 2", group: "Group-II", segment: "High School", salaryRange: "₹20,000–30,000 pm", annualPackage: "₹3,00,000–4,00,000", prices: { A: 20000, B: 25000, C: 30000 } },
  { title: "Softskill Trainer", band: "Band 2", group: "Group-II", segment: "High School", salaryRange: "₹25,000–30,000 pm", annualPackage: "₹3,00,000–4,00,000", prices: { A: 20000, B: 25000, C: 30000 } },
  { title: "Calligraphy Trainer", band: "Band 2", group: "Group-II", segment: "High School", salaryRange: "₹30,000–40,000 pm", annualPackage: "₹3,00,000–4,00,000", prices: { A: 20000, B: 25000, C: 30000 } },

  // Group-III / Band 3 — Primary
  { title: "Vice-Principal (Primary)", band: "Band 3", group: "Group-III", segment: "Primary", salaryRange: "₹20,000–35,000 pm", annualPackage: "₹3,00,000–4,00,000", prices: { A: 15000, B: 20000, C: 25000 } },
  { title: "Mother Teacher (Primary)", band: "Band 3", group: "Group-III", segment: "Primary", salaryRange: "₹15,000–20,000 pm", annualPackage: "₹2,00,000–3,00,000", prices: { A: 15000, B: 20000, C: 25000 } },
  { title: "Telugu Teacher (Primary)", band: "Band 3", group: "Group-III", segment: "Primary", salaryRange: "₹15,000–20,000 pm", annualPackage: "₹2,00,000–3,00,000", prices: { A: 15000, B: 20000, C: 25000 } },
  { title: "Hindi Teacher (Primary)", band: "Band 3", group: "Group-III", segment: "Primary", salaryRange: "₹15,000–20,000 pm", annualPackage: "₹2,00,000–3,00,000", prices: { A: 15000, B: 20000, C: 25000 } },
  { title: "English Teacher (Primary)", band: "Band 3", group: "Group-III", segment: "Primary", salaryRange: "₹15,000–20,000 pm", annualPackage: "₹2,00,000–3,00,000", prices: { A: 15000, B: 20000, C: 25000 } },
  { title: "Math Teacher (Primary)", band: "Band 3", group: "Group-III", segment: "Primary", salaryRange: "₹15,000–20,000 pm", annualPackage: "₹2,00,000–3,00,000", prices: { A: 15000, B: 20000, C: 25000 } },
  { title: "Science Teacher (Primary)", band: "Band 3", group: "Group-III", segment: "Primary", salaryRange: "₹15,000–20,000 pm", annualPackage: "₹2,00,000–3,00,000", prices: { A: 15000, B: 20000, C: 25000 } },
  { title: "Social Teacher (Primary)", band: "Band 3", group: "Group-III", segment: "Primary", salaryRange: "₹15,000–20,000 pm", annualPackage: "₹2,00,000–3,00,000", prices: { A: 15000, B: 20000, C: 25000 } },
  { title: "Computer Teacher (Primary)", band: "Band 3", group: "Group-III", segment: "Primary", salaryRange: "₹15,000–20,000 pm", annualPackage: "₹2,00,000–3,00,000", prices: { A: 15000, B: 20000, C: 25000 } },
  { title: "P.E.T (Primary)", band: "Band 3", group: "Group-III", segment: "Primary", salaryRange: "₹15,000–20,000 pm", annualPackage: "₹2,00,000–3,00,000", prices: { A: 15000, B: 20000, C: 25000 } },
  { title: "Art & Craft Teacher (Primary)", band: "Band 3", group: "Group-III", segment: "Primary", salaryRange: "₹10,000–20,000 pm", annualPackage: "₹2,00,000–3,00,000", prices: { A: 15000, B: 20000, C: 25000 } },

  // Group-IV / Band 4 — Pre-Primary
  { title: "Vice-Principal (Pre-Primary)", band: "Band 4", group: "Group-IV", segment: "Pre-Primary", salaryRange: "₹20,000–30,000 pm", annualPackage: "₹2,00,000–3,00,000", prices: { A: 15000, B: 20000, C: 25000 } },
  { title: "Mother Teacher (Pre-Primary)", band: "Band 4", group: "Group-IV", segment: "Pre-Primary", salaryRange: "₹15,000–20,000 pm", annualPackage: "₹2,00,000–3,00,000", prices: { A: 15000, B: 20000, C: 25000 } },
  { title: "Asso. Teacher (Pre-Primary)", band: "Band 4", group: "Group-IV", segment: "Pre-Primary", salaryRange: "₹15,000–20,000 pm", annualPackage: "₹2,00,000–3,00,000", prices: { A: 15000, B: 20000, C: 25000 } },
];

export const EDUCATION_PLAN_DETAILS: Record<
  EducationPlanKey,
  { name: string; tagline: string; features: string[]; popular?: boolean }
> = {
  A: {
    name: "Plan A",
    tagline: "Essential — apply & screen",
    features: [
      "Apply to unlimited education jobs",
      "Resume export + AI ATS score",
      "CV-Screening + Written Test rounds",
      "Email support",
    ],
  },
  B: {
    name: "Plan B",
    tagline: "Most chosen — interview ready",
    popular: true,
    features: [
      "Everything in Plan A",
      "Demo + Viva / Segment Awareness round",
      "Core Team / Academic & Admin round",
      "Detailed AI feedback report",
    ],
  },
  C: {
    name: "Plan C",
    tagline: "Premium — full pipeline rehearsal",
    features: [
      "Everything in Plan B",
      "Panel + Management rounds (Band 1)",
      "HR-Round + On-Boarding rehearsal",
      "Priority support & featured profile",
    ],
  },
};

interface EducationPositionPlansProps {
  /** Profile data for Razorpay prefill */
  prefill?: { name?: string; email?: string; mobile?: string };
  /** Called after a payment is successfully verified & subscription activated */
  onActivated?: () => void;
}

/**
 * Position-aware plan picker used in candidate signup wizard AND in the
 * dashboard "Upgrade Plans" tab. Pricing is driven by the official PACKs
 * table — candidate first picks a target position (which resolves a band &
 * salary range), then chooses Plan A/B/C from that row.
 */
export const EducationPositionPlans = ({ prefill, onActivated }: EducationPositionPlansProps) => {
  const { toast } = useToast();
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [selectedPlanIdx, setSelectedPlanIdx] = useState<number>(1); // default Plan B
  const [paying, setPaying] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  useEffect(() => {
    if ((window as any).Razorpay) {
      setRazorpayLoaded(true);
      return;
    }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      existing.addEventListener("load", () => setRazorpayLoaded(true));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(s);
  }, []);

  const planLetters: EducationPlanKey[] = ["A", "B", "C"];
  const selectedPositionObj = EDUCATION_POSITIONS.find((p) => p.title === selectedPosition) || null;
  const selectedPlanLetter: EducationPlanKey =
    selectedPlanIdx === 0 ? "A" : selectedPlanIdx === 1 ? "B" : "C";
  const activePlanPrice = selectedPositionObj ? selectedPositionObj.prices[selectedPlanLetter] : 0;
  const activePlanName = EDUCATION_PLAN_DETAILS[selectedPlanLetter].name;

  const handlePayPlan = async () => {
    if (!selectedPositionObj) {
      toast({
        title: "Select a position first",
        description: "Please choose your target position to see pricing.",
        variant: "destructive",
      });
      return;
    }
    if (!razorpayLoaded) {
      toast({ title: "Payment gateway loading…", description: "Please try again in a moment." });
      return;
    }
    setPaying(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) {
        toast({ title: "Session expired", description: "Please sign in again.", variant: "destructive" });
        setPaying(false);
        return;
      }
      const user = sessionData.session.user;
      const planSlug =
        selectedPlanLetter === "A" ? "starter" : selectedPlanLetter === "B" ? "basic" : "pro";
      const planLabel = `${activePlanName} (${selectedPositionObj.band})`;

      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "create-razorpay-order",
        {
          body: {
            amount: activePlanPrice,
            currency: "INR",
            plan_id: planSlug,
            plan_name: planLabel,
            receipt: `cand_${planSlug}_${Date.now()}`,
          },
        },
      );
      if (orderError || !orderData?.order_id) throw new Error(orderError?.message || "Failed to create order");

      const options: any = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Gradia",
        description: `${planLabel} — ${selectedPositionObj.title}`,
        order_id: orderData.order_id,
        prefill: {
          name: prefill?.name || "",
          email: prefill?.email || user.email || "",
          contact: prefill?.mobile || "",
        },
        theme: { color: "#6366f1" },
        handler: async (response: any) => {
          try {
            const { data, error } = await supabase.functions.invoke(
              "sync-candidate-subscription-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  plan: planSlug,
                  amount: activePlanPrice,
                  position: selectedPositionObj.title,
                  band: selectedPositionObj.band,
                },
              },
            );
            if (error || !data?.activated) {
              throw new Error(error?.message || data?.message || "Subscription activation failed");
            }
            toast({
              title: `🎉 ${activePlanName} Activated!`,
              description: `Your ${activePlanName} for ${selectedPositionObj.title} is now active.`,
            });
            onActivated?.();
          } catch (err: any) {
            toast({
              title: "Payment captured, activation pending",
              description: err?.message || "Please contact support if your plan does not activate.",
              variant: "destructive",
            });
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", (resp: any) => {
        toast({
          title: "Payment Failed",
          description: resp?.error?.description || "Please try another method.",
          variant: "destructive",
        });
        setPaying(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error("Plan payment error:", err);
      toast({
        title: "Could not start payment",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
      setPaying(false);
    }
  };

  return (
    <div className="w-full">
      {/* Position selector */}
      <Card className="p-5 max-w-3xl mx-auto mb-6">
        <Label className="text-sm font-semibold mb-2 block">Target Position</Label>
        <Select value={selectedPosition} onValueChange={setSelectedPosition}>
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Select the position you're applying for…" />
          </SelectTrigger>
          <SelectContent className="max-h-[320px]">
            {(["Group-I", "Group-II", "Group-III", "Group-IV"] as const).map((grp) => {
              const items = EDUCATION_POSITIONS.filter((p) => p.group === grp);
              if (!items.length) return null;
              const sample = items[0];
              return (
                <div key={grp}>
                  <div className="px-2 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {grp} · {sample.band} · {sample.segment}
                  </div>
                  {items.map((p) => (
                    <SelectItem key={p.title} value={p.title}>
                      {p.title}
                    </SelectItem>
                  ))}
                </div>
              );
            })}
          </SelectContent>
        </Select>

        {selectedPositionObj && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-2 rounded-md bg-muted/40">
              <p className="text-muted-foreground">Band</p>
              <p className="font-semibold text-foreground">{selectedPositionObj.band}</p>
            </div>
            <div className="p-2 rounded-md bg-muted/40">
              <p className="text-muted-foreground">Segment</p>
              <p className="font-semibold text-foreground">{selectedPositionObj.segment}</p>
            </div>
            <div className="p-2 rounded-md bg-muted/40">
              <p className="text-muted-foreground">Salary Range</p>
              <p className="font-semibold text-foreground">{selectedPositionObj.salaryRange}</p>
            </div>
            <div className="p-2 rounded-md bg-muted/40">
              <p className="text-muted-foreground">Annual Package</p>
              <p className="font-semibold text-foreground">{selectedPositionObj.annualPackage}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Plan A / B / C cards */}
      {!selectedPositionObj ? (
        <Card className="p-8 max-w-3xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            👆 Select a position above to see your subscription plans.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {planLetters.map((letter, idx) => {
              const detail = EDUCATION_PLAN_DETAILS[letter];
              const price = selectedPositionObj.prices[letter];
              const isSelected = selectedPlanIdx === idx;
              return (
                <Card
                  key={letter}
                  onClick={() => setSelectedPlanIdx(idx)}
                  className={`p-5 relative flex flex-col cursor-pointer transition-all ${
                    isSelected ? "ring-2 ring-primary shadow-xl scale-[1.02]" : "hover:shadow-md"
                  } ${detail.popular ? "border-primary" : ""}`}
                >
                  {detail.popular && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                      <Star className="h-3 w-3" /> Most Popular
                    </Badge>
                  )}
                  <div className="text-center mb-4">
                    <h3 className="text-lg font-bold text-foreground">{detail.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3">{detail.tagline}</p>
                    <div className="text-3xl font-bold text-primary">₹{price.toLocaleString("en-IN")}</div>
                    <p className="text-xs text-muted-foreground mt-1">one-time processing</p>
                  </div>
                  <ul className="space-y-2 mb-4 flex-1">
                    {detail.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <div
                    className={`text-center text-xs font-medium ${
                      isSelected ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {isSelected ? "✓ Selected" : "Click to select"}
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-5 max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Selected</p>
                <p className="text-lg font-bold text-foreground">
                  {activePlanName} · {selectedPositionObj.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedPositionObj.band} · {selectedPositionObj.salaryRange}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Amount due</p>
                <p className="text-2xl font-bold text-primary">₹{activePlanPrice.toLocaleString("en-IN")}</p>
              </div>
            </div>
            <Button onClick={handlePayPlan} disabled={paying || !razorpayLoaded} className="w-full">
              {paying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" /> Pay ₹{activePlanPrice.toLocaleString("en-IN")}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Secure payment via Razorpay.
            </p>
          </Card>
        </>
      )}
    </div>
  );
};

export default EducationPositionPlans;
