import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { safeErrorMessage } from "../_shared/safeError.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { candidateId, subject, body, hrName } = await req.json();
    if (!candidateId || !subject || !body) throw new Error("candidateId, subject, body required");

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name, email, preferred_role")
      .eq("id", candidateId)
      .maybeSingle();

    if (error || !profile?.email) throw new Error("Candidate email not found");

    const candidateName = profile.full_name || "Candidate";
    const replacements: Record<string, string> = {
      candidate_name: candidateName,
      job_title: profile.preferred_role || "the role",
      company_name: "Gradia",
      hr_name: hrName || "HR Team",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
    };

    const fill = (str: string) =>
      str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key) => replacements[key] ?? `{{${key}}}`);

    const finalSubject = fill(subject);
    const finalBody = fill(body);
    const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#222;line-height:1.6;white-space:pre-wrap">${finalBody.replace(/</g, "&lt;")}</div>`;

    const resend = new Resend(RESEND_API_KEY);
    const fromName = (hrName ? `${hrName} via Gradia HR` : "Gradia HR").slice(0, 100);
    const result = await resend.emails.send({
      from: `${fromName} <onboarding@resend.dev>`,
      to: [profile.email],
      subject: finalSubject,
      html,
    });

    if ((result as any)?.error) {
      const errMsg = (result as any).error.message || JSON.stringify((result as any).error);
      console.error("Resend send error:", errMsg);
      throw new Error(errMsg);
    }

    return new Response(
      JSON.stringify({ success: true, to: profile.email, id: (result as any)?.data?.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: safeErrorMessage(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
