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
    const employerId = userData.user.id;

    // Verify caller is an employer
    const { data: profile } = await admin.from("profiles").select("role,email,company_name,full_name").eq("id", employerId).maybeSingle();
    if (!profile || !["employer", "admin", "owner"].includes(profile.role)) {
      return new Response(JSON.stringify({ error: "Only employers/admins can manage HR accounts" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const isPrivileged = profile.role === "admin" || profile.role === "owner";

    const body = await req.json();
    const { email, password, full_name, action } = body;

    if (action === "list") {
      let linksQuery = admin
        .from("hr_employer_links")
        .select("id, hr_user_id, employer_user_id, is_active, created_at, permissions")
        .order("created_at", { ascending: false });
      if (!isPrivileged) linksQuery = linksQuery.eq("employer_user_id", employerId);
      const { data: links } = await linksQuery;
      const hrIds = (links ?? []).map(l => l.hr_user_id);
      const empIds = Array.from(new Set((links ?? []).map(l => l.employer_user_id)));
      const allIds = Array.from(new Set([...hrIds, ...empIds]));
      const { data: profiles } = allIds.length
        ? await admin.from("profiles").select("id,full_name,email,company_name").in("id", allIds)
        : { data: [] as any[] };
      const map = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
      const merged = (links ?? []).map(l => ({
        ...l,
        profile: map[l.hr_user_id] || null,
        employer_profile: map[l.employer_user_id] || null,
      }));
      return new Response(JSON.stringify({ hr_accounts: merged }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "deactivate") {
      const { hr_user_id } = body;
      const q = admin.from("hr_employer_links").update({ is_active: false }).eq("hr_user_id", hr_user_id);
      if (!isPrivileged) q.eq("employer_user_id", employerId);
      await q;
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Verify HR is owned by this employer (helper) — admins/owners bypass
    const verifyOwnership = async (hr_user_id: string) => {
      if (isPrivileged) return true;
      const { data: link } = await admin
        .from("hr_employer_links")
        .select("id")
        .eq("hr_user_id", hr_user_id)
        .eq("employer_user_id", employerId)
        .maybeSingle();
      return !!link;
    };

    if (action === "reset_password") {
      const { hr_user_id, new_password, send_email } = body;
      if (!hr_user_id || !new_password) {
        return new Response(JSON.stringify({ error: "hr_user_id and new_password required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (String(new_password).length < 8) {
        return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!(await verifyOwnership(hr_user_id))) {
        return new Response(JSON.stringify({ error: "Not authorized for this HR account" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: updErr } = await admin.auth.admin.updateUserById(hr_user_id, { password: new_password });
      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Optionally email new credentials
      let emailSent = false; let emailError: string | null = null;
      if (send_email) {
        try {
          const { data: hrProf } = await admin.from("profiles").select("email, full_name").eq("id", hr_user_id).maybeSingle();
          const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
          if (RESEND_API_KEY && hrProf?.email) {
            const companyName = profile.company_name || profile.full_name || "your employer";
            const loginUrl = "https://gradiaa.com/hr/login";
            const html = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #111;">Your Gradia HR password was reset</h2>
                <p>Hi ${hrProf.full_name || ""},</p>
                <p><strong>${companyName}</strong> has reset your HR account password.</p>
                <div style="background:#f4f4f5; border-radius:8px; padding:16px; margin:20px 0;">
                  <p style="margin:0 0 8px;"><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
                  <p style="margin:0 0 8px;"><strong>Email:</strong> ${hrProf.email}</p>
                  <p style="margin:0;"><strong>New Password:</strong> <code>${new_password}</code></p>
                </div>
                <p style="color:#666; font-size:13px;">For security, please change your password after signing in.</p>
              </div>
            `;
            const resp = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
              body: JSON.stringify({
                from: "Gradia Hiring <noreply@gradia.co.in>",
                to: [hrProf.email],
                subject: `Your HR account password was reset`,
                html,
              }),
            });
            if (resp.ok) emailSent = true; else emailError = `Resend ${resp.status}: ${await resp.text()}`;
          }
        } catch (e: any) { emailError = e?.message ?? String(e); }
      }
      return new Response(JSON.stringify({ ok: true, email_sent: emailSent, email_error: emailError }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_email") {
      const { hr_user_id, new_email } = body;
      if (!hr_user_id || !new_email || !String(new_email).includes("@")) {
        return new Response(JSON.stringify({ error: "hr_user_id and valid new_email required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!(await verifyOwnership(hr_user_id))) {
        return new Response(JSON.stringify({ error: "Not authorized for this HR account" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: updErr } = await admin.auth.admin.updateUserById(hr_user_id, {
        email: new_email,
        email_confirm: true,
      });
      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await admin.from("profiles").update({ email: new_email }).eq("id", hr_user_id);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Default: create
    if (!email || !password || !full_name) {
      return new Response(JSON.stringify({ error: "email, password, full_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the auth user with role=hr
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: "hr", full_name },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "Failed to create user" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const hrId = created.user.id;

    // Ensure profile row says hr
    await admin.from("profiles").upsert({
      id: hrId,
      email,
      full_name,
      role: "hr",
      company_name: profile.company_name ?? null,
    }, { onConflict: "id" });

    // user_roles entry
    await admin.from("user_roles").upsert({ user_id: hrId, role: "hr" } as any, { onConflict: "user_id,role" });

    // Link
    await admin.from("hr_employer_links").upsert({
      hr_user_id: hrId,
      employer_user_id: employerId,
      created_by: employerId,
      is_active: true,
    }, { onConflict: "hr_user_id" });

    // Send credentials email via Resend
    let emailSent = false;
    let emailError: string | null = null;
    try {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY) {
        const companyName = profile.company_name || profile.full_name || "your employer";
        const loginUrl = "https://gradiaa.com/hr/login";
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #111;">Welcome to Gradia HR Portal</h2>
            <p>Hi ${full_name},</p>
            <p><strong>${companyName}</strong> has created an HR account for you on Gradia. You can now manage jobs, candidates, and interviews on their behalf.</p>
            <div style="background:#f4f4f5; border-radius:8px; padding:16px; margin:20px 0;">
              <p style="margin:0 0 8px;"><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
              <p style="margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
              <p style="margin:0;"><strong>Temporary Password:</strong> <code>${password}</code></p>
            </div>
            <p style="color:#666; font-size:13px;">For security, please change your password after your first login.</p>
            <p style="color:#999; font-size:12px; margin-top:30px;">— The Gradia Team</p>
          </div>
        `;
        const resp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Gradia Hiring <noreply@gradia.co.in>",
            to: [email],
            subject: `Your HR account for ${companyName} on Gradia`,
            html,
          }),
        });
        if (resp.ok) emailSent = true;
        else emailError = `Resend ${resp.status}: ${await resp.text()}`;
      } else {
        emailError = "RESEND_API_KEY not configured";
      }
    } catch (e: any) {
      emailError = e?.message ?? String(e);
    }

    return new Response(JSON.stringify({ ok: true, hr_user_id: hrId, email_sent: emailSent, email_error: emailError }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
