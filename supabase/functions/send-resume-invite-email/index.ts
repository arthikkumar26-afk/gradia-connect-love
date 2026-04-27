import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const admin = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteEmailRequest {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  candidateName?: string;
}

async function logInvite(row: Record<string, unknown>) {
  if (!admin) return null;
  try {
    const { data, error } = await admin
      .from("resume_invites")
      .insert(row)
      .select("id")
      .single();
    if (error) {
      console.error("resume_invites insert error:", error);
      return null;
    }
    return data?.id as string | null;
  } catch (e) {
    console.error("resume_invites insert exception:", e);
    return null;
  }
}

async function updateInvite(id: string, patch: Record<string, unknown>) {
  if (!admin || !id) return;
  try {
    const { error } = await admin.from("resume_invites").update(patch).eq("id", id);
    if (error) console.error("resume_invites update error:", error);
  } catch (e) {
    console.error("resume_invites update exception:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let inviteId: string | null = null;

  try {
    const body = (await req.json()) as InviteEmailRequest;
    const { to, subject, html, fromName, candidateName } = body;

    if (!to || !EMAIL_REGEX.test(to)) {
      return new Response(JSON.stringify({ error: "Invalid recipient email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!subject || typeof subject !== "string" || subject.length > 300) {
      return new Response(JSON.stringify({ error: "Invalid subject" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!html || typeof html !== "string" || html.length > 200_000) {
      return new Response(JSON.stringify({ error: "Invalid html body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pre-log as pending so the admin dashboard always shows the attempt
    inviteId = await logInvite({
      candidate_name: candidateName ?? null,
      recipient_email: to,
      subject,
      sender_name: fromName ?? "Gradia Hiring",
      status: "pending",
    });

    const sender = `${fromName || "Gradia Hiring"} <noreply@gradia.co.in>`;

    const result = await resend.emails.send({
      from: sender,
      to: [to],
      subject,
      html,
    });

    if ((result as any).error) {
      const msg = (result as any).error?.message || "Send failed";
      console.error("Resend error:", (result as any).error);
      if (inviteId) await updateInvite(inviteId, { status: "failed", error_message: msg });
      return new Response(JSON.stringify({ error: msg }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageId = (result as any).data?.id ?? null;
    if (inviteId) {
      await updateInvite(inviteId, {
        status: "sent",
        sent_at: new Date().toISOString(),
        resend_message_id: messageId,
      });
    }

    return new Response(JSON.stringify({ success: true, id: messageId, inviteId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("send-resume-invite-email error:", err);
    if (inviteId) {
      await updateInvite(inviteId, {
        status: "failed",
        error_message: err?.message ?? "Unknown error",
      });
    }
    return new Response(JSON.stringify({ error: err.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
