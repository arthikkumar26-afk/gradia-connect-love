// Notify candidates and employer for job lifecycle events.
// Events: job_posted, job_updated, job_closed
// - Finds matching candidates by category/preferred_role/location
// - Inserts candidate_notifications rows (in-app)
// - Sends email to each matched candidate
// - For job_posted: also inserts an employer_notifications row + emails employer
//   with the AI-matched profile list (auto-scan)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const norm = (s?: string | null) => (s || "").toLowerCase().trim();

interface Body {
  event: "job_posted" | "job_updated" | "job_closed";
  jobId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { event, jobId } = (await req.json()) as Body;
    if (!event || !jobId) {
      return json({ error: "event & jobId required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Load job
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .select("id, job_title, location, category, preferred_role, experience_required, skills, employer_id, status")
      .eq("id", jobId)
      .maybeSingle();
    if (jobErr || !job) return json({ error: "Job not found" }, 404);

    // Load employer
    const { data: employer } = await supabase
      .from("profiles")
      .select("id, full_name, company_name, email")
      .eq("id", job.employer_id)
      .maybeSingle();

    const employerName =
      (employer as any)?.company_name || (employer as any)?.full_name || "Employer";

    // Choose audience
    let candidates: any[] = [];
    if (event === "job_closed") {
      // Only candidates who applied
      const { data } = await supabase
        .from("interview_candidates")
        .select("candidate:profiles!interview_candidates_candidate_id_fkey(id, full_name, email)")
        .eq("job_id", jobId);
      candidates = ((data as any[]) || [])
        .map((r) => r.candidate)
        .filter(Boolean);
    } else {
      // Match
      const { data: cands } = await supabase
        .from("profiles")
        .select("id, full_name, email, preferred_role, primary_subject, location, category, experience_level")
        .eq("role", "candidate")
        .limit(2000);
      const jt = norm(job.job_title);
      const jloc = norm(job.location).split(",")[0];
      candidates = ((cands as any[]) || [])
        .map((c) => {
          let s = 0;
          if (jt && c.preferred_role && (jt.includes(norm(c.preferred_role)) || norm(c.preferred_role).includes(jt))) s += 50;
          if (jloc && c.location && norm(c.location).includes(jloc)) s += 20;
          if (c.primary_subject && jt.includes(norm(c.primary_subject))) s += 15;
          if (job.category && c.category && norm(job.category) === norm(c.category)) s += 15;
          return { ...c, _score: s };
        })
        .filter((c) => c._score >= 35 && c.email)
        .sort((a, b) => b._score - a._score)
        .slice(0, 50);
    }

    // Build notification text
    const titleByEvent: Record<string, string> = {
      job_posted: `New job: ${job.job_title} at ${employerName}`,
      job_updated: `Job updated: ${job.job_title} at ${employerName}`,
      job_closed: `Job closed: ${job.job_title}`,
    };
    const msgByEvent: Record<string, string> = {
      job_posted: `${employerName} just posted a new role you may match: ${job.job_title}${job.location ? ` (${job.location})` : ""}.`,
      job_updated: `${employerName} updated the role ${job.job_title}. Check the latest details.`,
      job_closed: `The role ${job.job_title} at ${employerName} has been closed. Thank you for your interest.`,
    };

    // Insert candidate notifications (bulk)
    if (candidates.length > 0) {
      const rows = candidates.map((c) => ({
        candidate_id: c.id,
        type: event,
        title: titleByEvent[event],
        message: msgByEvent[event],
        job_id: job.id,
        job_title: job.job_title,
        employer_name: employerName,
        link: `/jobs?job=${job.id}`,
      }));
      // Insert in chunks to be safe
      for (let i = 0; i < rows.length; i += 200) {
        await supabase.from("candidate_notifications").insert(rows.slice(i, i + 200));
      }
    }

    // Send candidate emails (in parallel, capped)
    const emailJobs = candidates.slice(0, 50).map(async (c) => {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:20px;color:#111;">
          <h2 style="color:#1e3a8a;margin:0 0 8px;">${titleByEvent[event]}</h2>
          <p>Hi ${c.full_name || "there"},</p>
          <p>${msgByEvent[event]}</p>
          <div style="background:#f4f4f5;padding:14px;border-radius:8px;margin:16px 0;font-size:13px;">
            <p style="margin:0 0 6px;"><strong>Role:</strong> ${job.job_title}</p>
            ${job.location ? `<p style="margin:0 0 6px;"><strong>Location:</strong> ${job.location}</p>` : ""}
            ${job.experience_required ? `<p style="margin:0;"><strong>Experience:</strong> ${job.experience_required}</p>` : ""}
          </div>
          <div style="text-align:center;margin:20px 0;">
            <a href="https://gradiaa.com/jobs?job=${job.id}" style="background:#1e3a8a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;display:inline-block;">View Job</a>
          </div>
          <p style="font-size:12px;color:#6b7280;">— Gradia</p>
        </div>`;
      try {
        await supabase.functions.invoke("send-resume-invite-email", {
          body: {
            to: c.email,
            subject: titleByEvent[event],
            html,
            fromName: "Gradia",
            candidateName: c.full_name || "Candidate",
          },
        });
      } catch (e) {
        console.warn("candidate email failed", c.email, e);
      }
    });

    // Auto-scan: alert employer with matched candidates on job_posted
    if (event === "job_posted" && employer && candidates.length > 0) {
      const top = candidates.slice(0, 20);
      await supabase.from("employer_notifications").insert({
        employer_id: job.employer_id,
        type: "candidate_suggestion",
        title: `${top.length} AI-matched candidate${top.length === 1 ? "" : "s"} for ${job.job_title}`,
        message: `We auto-scanned your new vacancy "${job.job_title}" and found ${top.length} matching profile${top.length === 1 ? "" : "s"}. Open Suggested Candidates to review.`,
        job_title: job.job_title,
        recipient_email: (employer as any).email || null,
      });

      const empEmail = (employer as any).email;
      if (empEmail) {
        const rows = top
          .map(
            (c) =>
              `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;">${c.full_name || "Candidate"}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;">${c.preferred_role || c.primary_subject || "—"}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;">${c.location || "—"}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;"><strong>${Math.min(100, c._score)}%</strong></td></tr>`,
          )
          .join("");
        const html = `
          <div style="font-family:Arial,sans-serif;max-width:680px;margin:0 auto;padding:20px;color:#111;">
            <h2 style="color:#1e3a8a;margin:0 0 8px;">${top.length} AI-matched candidates for ${job.job_title}</h2>
            <p>Hi ${employerName},</p>
            <p>We auto-scanned your new vacancy <strong>${job.job_title}</strong>${job.location ? ` (${job.location})` : ""} and found <strong>${top.length}</strong> matching candidates.</p>
            <table style="width:100%;border-collapse:collapse;margin:14px 0;font-size:13px;">
              <thead><tr style="background:#f4f4f5;"><th align="left" style="padding:6px 8px;">Candidate</th><th align="left" style="padding:6px 8px;">Role</th><th align="left" style="padding:6px 8px;">Location</th><th align="right" style="padding:6px 8px;">Match</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <div style="text-align:center;margin:20px 0;">
              <a href="https://gradiaa.com/employer/suggested-candidates" style="background:#1e3a8a;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block;">View Suggested Candidates</a>
            </div>
          </div>`;
        try {
          await supabase.functions.invoke("send-resume-invite-email", {
            body: {
              to: empEmail,
              subject: `${top.length} AI-matched candidates for ${job.job_title}`,
              html,
              fromName: "Gradia",
              candidateName: employerName,
            },
          });
        } catch (e) {
          console.warn("employer email failed", e);
        }
      }
    }

    await Promise.allSettled(emailJobs);

    return json({ ok: true, notified: candidates.length });
  } catch (e: any) {
    console.error("notify-job-event error", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
