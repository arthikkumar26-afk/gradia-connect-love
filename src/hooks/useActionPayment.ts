import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const loadRazorpayScript = (): Promise<boolean> =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export interface ActionPaymentArgs {
  actionKey: "mentor_contact_unlock" | "cv_unlock" | "interview_unlock" | "extra_mock_test";
  relatedUserId?: string;
  relatedEntityId?: string;
  metadata?: Record<string, any>;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

export const useActionPayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const startPayment = useCallback(async (args: ActionPaymentArgs): Promise<boolean> => {
    setIsProcessing(true);
    try {
      const ok = await loadRazorpayScript();
      if (!ok) {
        toast.error("Failed to load payment gateway");
        return false;
      }

      const { data, error } = await supabase.functions.invoke("create-action-payment", {
        body: {
          action_key: args.actionKey,
          related_user_id: args.relatedUserId,
          related_entity_id: args.relatedEntityId,
          metadata: args.metadata || {},
        },
      });

      if (error || !data?.order_id) {
        toast.error(error?.message || "Could not initiate payment");
        return false;
      }

      return await new Promise<boolean>((resolve) => {
        const rzp = new window.Razorpay({
          key: data.key_id,
          amount: data.amount,
          currency: data.currency,
          name: "Gradia",
          description: data.label,
          order_id: data.order_id,
          prefill: {
            name: args.userName || "",
            email: args.userEmail || "",
            contact: args.userPhone || "",
          },
          theme: { color: "#0066ff" },
          handler: async (response: any) => {
            const { data: verify, error: vErr } = await supabase.functions.invoke(
              "verify-action-payment",
              {
                body: {
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                },
              }
            );
            if (vErr || !verify?.success) {
              toast.error("Payment verification failed");
              resolve(false);
            } else {
              toast.success("Payment successful!");
              resolve(true);
            }
          },
          modal: {
            ondismiss: () => {
              toast.info("Payment cancelled");
              resolve(false);
            },
          },
        });
        rzp.open();
      });
    } catch (e: any) {
      toast.error(e?.message || "Payment failed");
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return { startPayment, isProcessing };
};
