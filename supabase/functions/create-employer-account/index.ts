import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;
    const { data: callerProfile } = await admin.from("profiles").select("role,full_name,company_name").eq("id", callerId).maybeSingle();
    if (!callerProfile || !["hr", "hr_manager", "admin", "owner"].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "Only HR / Admin can create employer accounts" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      email, password, full_name, company_name, phone, website, industry, location,
      plan_id, plan_name, plan_price, billing_cycle = "monthly",
    } = body;

    if (!email || !password || !full_name || !company_name) {
      return new Response(JSON.stringify({ error: "email, password, full_name, company_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (String(password).length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "employer", full_name, company_name },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Failed to create user" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const empId = created.user.id;

    // Profile
    await admin.from("profiles").upsert({
      id: empId,
      email,
      full_name,
      company_name,
      mobile: phone || null,
      role: "employer",
    }, { onConflict: "id" });

    // user_roles
    await admin.from("user_roles").upsert({ user_id: empId, role: "employer" } as any, { onConflict: "user_id,role" });

    // Optional employer_registrations row (lightweight)
    if (industry || location) {
      try {
        await admin.from("employer_registrations").insert({
          employer_id: empId,
          company_name,
          company_email: email,
          company_phone: phone || null,
          company_website: website || null,
          industry_category: industry || null,
          state: location || "",
          district: location || "",
          tc_accepted: true,
          tc_accepted_at: new Date().toISOString(),
        });
      } catch (_) { /* non-blocking */ }
    }

    // Subscription record (initial plan)
    if (plan_id) {
      try {
        const months = billing_cycle === "yearly" ? 12 : 1;
        const ends_at = plan_price > 0
          ? new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString()
          : null;
        await admin.from("subscriptions").insert({
          employer_id: empId,
          plan_id,
          plan_name: plan_name || plan_id,
          amount: Number(plan_price) || 0,
          currency: "INR",
          billing_cycle,
          status: "active",
          started_at: new Date().toISOString(),
          ends_at,
          payment_method: "manual_hr_assignment",
          auto_renew: false,
        });
      } catch (e) { console.error("subscription insert failed", e); }
    }

    // Send credentials email
    let emailSent = false; let emailError: string | null = null;
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const loginUrl = "https://gradiaa.com/employer/login";
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color:#1e3a8a;">Welcome to Gradia — Employer Portal</h2>
            <p>Hi ${full_name},</p>
            <p>An employer account has been created for <strong>${company_name}</strong> on the Gradia Hiring Platform.</p>
            <div style="background:#f4f4f5;border-radius:8px;padding:16px;margin:20px 0;">
              <p style="margin:0 0 8px;"><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
              <p style="margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
              <p style="margin:0 0 8px;"><strong>Temporary Password:</strong> <code>${password}</code></p>
              ${plan_name ? `<p style="margin:0;"><strong>Plan:</strong> ${plan_name}${plan_price ? ` (₹${plan_price}/${billing_cycle})` : " (Free)"}</p>` : ""}
            </div>
            <p style="color:#666;font-size:13px;">Please change your password after first login.</p>
            <p style="color:#999;font-size:12px;margin-top:30px;">— The Gradia Team</p>
          </div>
        `;
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "Gradia Hiring <noreply@gradia.co.in>",
            to: [email],
            subject: `Your Employer account on Gradia — ${company_name}`,
            html,
          }),
        });
        if (resp.ok) emailSent = true;
        else emailError = `Resend ${resp.status}: ${await resp.text()}`;
      } else { emailError = "RESEND_API_KEY not configured"; }
    } catch (e: any) { emailError = e?.message ?? String(e); }

    return new Response(JSON.stringify({ ok: true, employer_id: empId, email_sent: emailSent, email_error: emailError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
