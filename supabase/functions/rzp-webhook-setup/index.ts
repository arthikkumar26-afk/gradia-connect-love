import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// One-time admin helper: ensures a Razorpay webhook exists pointing at the
// app's razorpay-webhook edge function with all required events enabled.
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET")!;
const auth = "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

const TARGET_URL = "https://cybqlimobxpjygwcdojv.supabase.co/functions/v1/razorpay-webhook";

const REQUIRED_EVENTS = [
  "payment.captured",
  "payment.failed",
  "subscription.charged",
  "payment_link.paid",
  "payment_link.expired",
  "payment_link.cancelled",
  "qr_code.credited",
  "qr_code.expired",
  "qr_code.closed",
];

serve(async (req) => {
  if (req.headers.get("x-setup-token") !== "gradia-webhook-setup-2026") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    const listRes = await fetch("https://api.razorpay.com/v1/webhooks", {
      headers: { Authorization: auth },
    });
    const list = await listRes.json();
    const webhooks = list.items || [];

    const existing = webhooks.find((w: any) => w.url === TARGET_URL);

    if (existing) {
      // Update events on the correct webhook
      const patchRes = await fetch(`https://api.razorpay.com/v1/webhooks/${existing.id}`, {
        method: "PATCH",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({ url: TARGET_URL, active: true, events: REQUIRED_EVENTS }),
      });
      const patched = await patchRes.json();
      return new Response(
        JSON.stringify({ action: "updated", ok: patchRes.ok, webhook: patched }),
        { status: patchRes.ok ? 200 : 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // Create a new webhook
    const createRes = await fetch("https://api.razorpay.com/v1/webhooks", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        url: TARGET_URL,
        active: true,
        secret: WEBHOOK_SECRET,
        alert_email: "support@gradia.co.in",
        events: REQUIRED_EVENTS,
      }),
    });
    const created = await createRes.json();
    return new Response(
      JSON.stringify({ action: "created", ok: createRes.ok, webhook: created }),
      { status: createRes.ok ? 200 : 500, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
