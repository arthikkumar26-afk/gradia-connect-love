import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const email = "info@cyberhubit.com";
    const password = "Cyberhub@123";
    const fullName = "CyberHub IT";
    const role = "edutech";

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });

    if (createError) {
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Create profile
    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      email,
      full_name: fullName,
      role,
    });

    // Create user_roles entry
    await supabaseAdmin.from("user_roles").upsert(
      { user_id: userId, role },
      { onConflict: "user_id,role" }
    );

    // Create premium subscription (enterprise plan, annual)
    const now = new Date();
    const endsAt = new Date(now);
    endsAt.setFullYear(endsAt.getFullYear() + 1);

    await supabaseAdmin.from("subscriptions").insert({
      employer_id: userId,
      plan_id: "enterprise",
      plan_name: "Enterprise",
      amount: 0,
      status: "active",
      billing_cycle: "annual",
      started_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      payment_method: "owner_assigned",
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `EduTech account created: ${email}`,
      userId 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
