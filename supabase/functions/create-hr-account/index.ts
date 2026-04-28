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
    if (!profile || (profile.role !== "employer" && profile.role !== "admin" && profile.role !== "owner")) {
      return new Response(JSON.stringify({ error: "Only employers can create HR accounts" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { email, password, full_name, action } = body;

    if (action === "list") {
      const { data: links } = await admin
        .from("hr_employer_links")
        .select("id, hr_user_id, is_active, created_at, permissions")
        .eq("employer_user_id", employerId)
        .order("created_at", { ascending: false });
      const ids = (links ?? []).map(l => l.hr_user_id);
      const { data: profiles } = ids.length
        ? await admin.from("profiles").select("id,full_name,email").in("id", ids)
        : { data: [] as any[] };
      const map = Object.fromEntries((profiles ?? []).map(p => [p.id, p]));
      const merged = (links ?? []).map(l => ({ ...l, profile: map[l.hr_user_id] || null }));
      return new Response(JSON.stringify({ hr_accounts: merged }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "deactivate") {
      const { hr_user_id } = body;
      await admin.from("hr_employer_links").update({ is_active: false }).eq("hr_user_id", hr_user_id).eq("employer_user_id", employerId);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    return new Response(JSON.stringify({ ok: true, hr_user_id: hrId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
