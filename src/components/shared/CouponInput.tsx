import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, Loader2, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CouponInputProps {
  originalAmount: number;
  userRole: "candidate" | "employer" | "wallet";
  onCouponApplied: (discount: number, finalAmount: number, couponId: string, couponCode: string) => void;
  onCouponRemoved: () => void;
}

interface CouponResult {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number | null;
  max_total_uses: number | null;
  max_uses_per_user: number;
  total_used: number;
  applicable_to: string;
  valid_until: string | null;
}

export const CouponInput = ({ originalAmount, userRole, onCouponApplied, onCouponRemoved }: CouponInputProps) => {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null);

  const validateCoupon = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError("");

    try {
      // Fetch coupon
      const { data: coupon, error: fetchErr } = await supabase
        .from("discount_coupons")
        .select("*")
        .eq("code", code.toUpperCase().trim())
        .eq("is_active", true)
        .maybeSingle();

      if (fetchErr || !coupon) {
        setError("Invalid or expired coupon code");
        return;
      }

      const c = coupon as CouponResult;

      // Check applicable_to
      if (c.applicable_to !== "both" && c.applicable_to !== userRole) {
        setError(`This coupon is not valid for ${userRole}s`);
        return;
      }

      // Check expiry
      if (c.valid_until && new Date(c.valid_until) < new Date()) {
        setError("This coupon has expired");
        return;
      }

      // Check total usage limit
      if (c.max_total_uses && c.total_used >= c.max_total_uses) {
        setError("This coupon has reached its usage limit");
        return;
      }

      // Check min order amount
      if (c.min_order_amount && originalAmount < c.min_order_amount) {
        setError(`Minimum order amount is ₹${c.min_order_amount}`);
        return;
      }

      // Check per-user usage
      if (user?.id) {
        const { data: userUsages } = await supabase
          .from("coupon_usages")
          .select("id")
          .eq("coupon_id", c.id)
          .eq("user_id", user.id);
        
        if (userUsages && userUsages.length >= c.max_uses_per_user) {
          setError("You have already used this coupon");
          return;
        }
      }

      // Calculate discount
      let discount = 0;
      if (c.discount_type === "percentage") {
        discount = Math.round((originalAmount * c.discount_value) / 100);
        if (c.max_discount_amount) {
          discount = Math.min(discount, c.max_discount_amount);
        }
      } else {
        discount = c.discount_value;
      }

      discount = Math.min(discount, originalAmount);
      const finalAmount = originalAmount - discount;

      setApplied({ code: c.code, discount });
      onCouponApplied(discount, finalAmount, c.id, c.code);
    } catch (err: any) {
      setError("Failed to validate coupon");
    } finally {
      setLoading(false);
    }
  };

  const removeCoupon = () => {
    setApplied(null);
    setCode("");
    setError("");
    onCouponRemoved();
  };

  if (applied) {
    return (
      <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400">
            <span className="font-mono">{applied.code}</span> applied — ₹{applied.discount} off
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={removeCoupon} className="h-7 text-xs">
          <X className="h-3 w-3 mr-1" /> Remove
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={code}
            onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
            placeholder="Enter coupon code"
            className="pl-9 uppercase font-mono"
            onKeyDown={e => e.key === "Enter" && validateCoupon()}
          />
        </div>
        <Button variant="outline" onClick={validateCoupon} disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
};
