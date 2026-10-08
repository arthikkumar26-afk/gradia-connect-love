import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// One-time admin helper: enables required events on the existing Razorpay webhook.
const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;
const auth = "Basic " + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

const REQUIRED_EVENTS = [
  "subscription.charged",
  "payment_link.paid",
  "payment_link.expired",
  "payment_link.cancelled",
  "qr_code.credited",
  "qr_code.expired",
  "qr_code.closed",
];

serve(async (req) => {
  // Simple guard: require a one-time token header
  if (req.headers.get("x-setup-token") !== "gradia-webhook-setup-2026") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  try {
    // 1. List existing webhooks
    const listRes = await fetch("https://api.razorpay.com/v1/webhooks", {
      headers: { Authorization: auth },
    });
    const list = await listRes.json();
    if (!listRes.ok) {
      return new Response(JSON.stringify({ error: "list failed", details: list }), { status: 500 });
    }

    const webhooks = list.items || [];
    const results: any[] = [];

    for (const wh of webhooks) {
      const currentEvents: string[] = Array.isArray(wh.events)
        ? wh.events
        : Object.keys(wh.events || {});
      const merged = Array.from(new Set([...currentEvents, ...REQUIRED_EVENTS]));
      const patchRes = await fetch(`https://api.razorpay.com/v1/webhooks/${wh.id}`, {
        method: "PATCH",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          url: wh.url,
          active: true,
          events: merged,
        }),
      });
      const patched = await patchRes.json();
      results.push({
        id: wh.id,
        url: wh.url,
        ok: patchRes.ok,
        events: patched.events || null,
        error: patchRes.ok ? null : patched,
      });
    }

    return new Response(JSON.stringify({ webhooks_found: webhooks.length, results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
