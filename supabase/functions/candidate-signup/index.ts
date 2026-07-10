import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CandidateSignupRequest {
  email: string;
  password: string;
  fullName: string;
  mobile?: string;
  industryCategory?: string;
  primarySubject?: string;
  segment?: string;
  country?: string;
  referralCode?: string;
}


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const {
      email,
      password,
      fullName,
      mobile,
      industryCategory,
      primarySubject,
      segment,
      country,
      referralCode,
    }: CandidateSignupRequest = await req.json();


    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedName = fullName?.trim();
    const normalizedMobile = mobile?.trim() || null;

    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!password || password.length < 8) {
      return new Response(JSON.stringify({ error: "Password must be at least 8 characters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!normalizedName) {
      return new Response(JSON.stringify({ error: "Full name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let userId: string | null = null;

    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (existingProfile?.id) {
      return new Response(JSON.stringify({ error: "This email is already registered. Please login instead.", code: "already_registered" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: normalizedName,
        role: "candidate",
      },
    });

    if (createError) {
      const message = createError.message || "Failed to create account";
      const alreadyRegistered = message.toLowerCase().includes("already") && message.toLowerCase().includes("registered");
      return new Response(JSON.stringify({ error: alreadyRegistered ? "This email is already registered. Please login instead." : message, code: alreadyRegistered ? "already_registered" : "create_failed" }), {
        status: alreadyRegistered ? 409 : 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    userId = createdUser.user.id;

    const profilePayload = {
      id: userId,
      email: normalizedEmail,
      full_name: normalizedName,
      mobile: normalizedMobile,
      role: "candidate",
      category: industryCategory || null,
      primary_subject: primarySubject || null,
      segment: segment || null,
      country: country?.trim() || null,
      ...(referralCode ? { referred_by: referralCode.toUpperCase() } : {}),
    };

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(profilePayload, { onConflict: "id" });
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw profileError;
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "candidate" }, { onConflict: "user_id,role" });

    if (roleError) {
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw roleError;
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("candidate-signup error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed to create account" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});