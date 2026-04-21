import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  email: string;
  fullName?: string;
  skills?: string[];
  preferredRole?: string;
  experienceLevel?: string;
  lastDesignation?: string;
  location?: string;
  maxJobs?: number;
}

interface MatchedJob {
  id: string;
  title: string;
  company: string;
  location?: string;
  salary?: string;
  type?: string;
  url: string;
  source: "internal" | "external";
  matchScore: number;
  matchReason?: string;
}

const SITE_URL = "https://gradia.world";

function scoreJob(
  job: { title: string; skills?: string[] | null; description?: string | null; location?: string | null },
  candidate: { skills: string[]; preferredRole: string; lastDesignation: string; location: string }
): { score: number; reason: string } {
  const titleLower = (job.title || "").toLowerCase();
  const descLower = (job.description || "").toLowerCase();
  const jobSkills = (job.skills || []).map((s) => s.toLowerCase());
  const candSkills = candidate.skills.map((s) => s.toLowerCase());

  let score = 0;
  const reasons: string[] = [];

  // Role match
  const role = (candidate.preferredRole || candidate.lastDesignation || "").toLowerCase();
  if (role && (titleLower.includes(role) || role.split(/\s+/).some((w) => w.length > 3 && titleLower.includes(w)))) {
    score += 40;
    reasons.push("role match");
  }

  // Skill overlap
  const overlap = candSkills.filter((s) => jobSkills.includes(s) || descLower.includes(s));
  if (overlap.length > 0) {
    score += Math.min(40, overlap.length * 8);
    reasons.push(`${overlap.length} skill${overlap.length > 1 ? "s" : ""} match`);
  }

  // Location
  if (candidate.location && job.location && job.location.toLowerCase().includes(candidate.location.toLowerCase().split(",")[0].trim())) {
    score += 20;
    reasons.push("location match");
  }

  return { score, reason: reasons.join(", ") || "general fit" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: InviteRequest = await req.json();
    const { email, fullName, skills = [], preferredRole = "", experienceLevel = "", lastDesignation = "", location = "" } = body;
    const maxJobs = Math.min(body.maxJobs || 6, 10);

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "Valid email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch internal active jobs
    const { data: internalJobs } = await supabase
      .from("jobs")
      .select("id, job_title, employer_id, location, salary_range, job_type, description, skills, status")
      .eq("status", "active")
      .limit(200);

    // Fetch employer names
    const employerIds = [...new Set((internalJobs || []).map((j) => j.employer_id).filter(Boolean))];
    const { data: employers } = employerIds.length
      ? await supabase.from("employer_registrations").select("employer_id, company_name").in("employer_id", employerIds)
      : { data: [] as any[] };
    const employerMap = new Map((employers || []).map((e: any) => [e.employer_id, e.company_name]));

    // Fetch external jobs
    const { data: externalJobs } = await supabase
      .from("external_jobs")
      .select("id, job_title, company_name, location, salary_range, job_type, description, skills, apply_url, is_active")
      .eq("is_active", true)
      .limit(200);

    const candidate = { skills, preferredRole, lastDesignation, location };

    const allMatches: MatchedJob[] = [];

    for (const j of internalJobs || []) {
      const { score, reason } = scoreJob(
        { title: j.job_title, skills: j.skills, description: j.description, location: j.location },
        candidate
      );
      if (score > 0) {
        allMatches.push({
          id: j.id,
          title: j.job_title,
          company: employerMap.get(j.employer_id) || "Verified Employer",
          location: j.location || undefined,
          salary: j.salary_range || undefined,
          type: j.job_type || undefined,
          url: `${SITE_URL}/jobs/${j.id}`,
          source: "internal",
          matchScore: score,
          matchReason: reason,
        });
      }
    }

    for (const j of externalJobs || []) {
      const { score, reason } = scoreJob(
        { title: j.job_title, skills: j.skills, description: j.description, location: j.location },
        candidate
      );
      if (score > 0) {
        allMatches.push({
          id: j.id,
          title: j.job_title,
          company: j.company_name,
          location: j.location || undefined,
          salary: j.salary_range || undefined,
          type: j.job_type || undefined,
          url: j.apply_url,
          source: "external",
          matchScore: score,
          matchReason: reason,
        });
      }
    }

    allMatches.sort((a, b) => b.matchScore - a.matchScore);
    const topMatches = allMatches.slice(0, maxJobs);

    if (topMatches.length === 0) {
      // Fallback: top 5 most recent active jobs
      for (const j of (internalJobs || []).slice(0, 5)) {
        topMatches.push({
          id: j.id,
          title: j.job_title,
          company: employerMap.get(j.employer_id) || "Verified Employer",
          location: j.location || undefined,
          salary: j.salary_range || undefined,
          type: j.job_type || undefined,
          url: `${SITE_URL}/jobs/${j.id}`,
          source: "internal",
          matchScore: 0,
          matchReason: "featured opportunity",
        });
      }
    }

    const signupParams = new URLSearchParams({ email });
    if (fullName) signupParams.set("name", fullName);
    const signupUrl = `${SITE_URL}/candidate/signup?${signupParams.toString()}`;
    const greetingName = fullName?.trim() || email.split("@")[0];
    const headlineRole = preferredRole || lastDesignation || "your next role";

    // AI-suggested role ideas based on resume skills (in addition to matched real jobs)
    let aiSuggestedRoles: Array<{ title: string; why: string }> = [];
    if (LOVABLE_API_KEY && skills.length > 0) {
      try {
        const roleRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: `Suggest 4 specific job titles that fit this candidate. Last role: ${lastDesignation || "n/a"}. Experience: ${experienceLevel || "n/a"}. Skills: ${skills.slice(0, 12).join(", ")}. Reply ONLY as compact JSON: [{"title":"...","why":"one short reason (max 12 words)"}]. No prose.`,
              },
            ],
          }),
        });
        if (roleRes.ok) {
          const j = await roleRes.json();
          const txt = j.choices?.[0]?.message?.content?.trim() || "";
          const cleaned = txt.replace(/```json|```/g, "").trim();
          const start = cleaned.indexOf("[");
          const end = cleaned.lastIndexOf("]");
          if (start >= 0 && end > start) {
            const parsed = JSON.parse(cleaned.slice(start, end + 1));
            if (Array.isArray(parsed)) aiSuggestedRoles = parsed.slice(0, 4).filter((r: any) => r?.title);
          }
        }
      } catch (_e) { /* ignore */ }
    }

    // Optional: AI-crafted personalized intro line
    let personalIntro = `Based on your background${lastDesignation ? ` as ${lastDesignation}` : ""}${experienceLevel ? ` (${experienceLevel})` : ""}, we've handpicked opportunities matching your profile.`;
    if (LOVABLE_API_KEY && skills.length > 0) {
      try {
        const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "user",
                content: `Write ONE warm professional sentence (max 30 words) inviting a candidate named ${greetingName} to explore matched jobs on Gradia. Their last role: ${lastDesignation || "professional"}. Top skills: ${skills.slice(0, 5).join(", ")}. Don't use emojis. No preamble.`,
              },
            ],
          }),
        });
        if (aiRes.ok) {
          const j = await aiRes.json();
          const txt = j.choices?.[0]?.message?.content?.trim();
          if (txt && txt.length < 300) personalIntro = txt.replace(/^["']|["']$/g, "");
        }
      } catch (_e) { /* ignore */ }
    }

    const jobCardsHtml = topMatches
      .map(
        (j) => `
        <tr><td style="padding:0 0 14px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;">
            <tr><td style="padding:16px 18px;">
              <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px;">${j.title}</div>
              <div style="font-size:13px;color:#475569;margin-bottom:8px;">${j.company}${j.location ? ` &middot; ${j.location}` : ""}</div>
              <div style="font-size:12px;color:#64748b;margin-bottom:10px;">
                ${j.type ? `<span style="background:#f1f5f9;padding:2px 8px;border-radius:4px;margin-right:6px;">${j.type}</span>` : ""}
                ${j.salary ? `<span style="background:#ecfeff;color:#0e7490;padding:2px 8px;border-radius:4px;margin-right:6px;">${j.salary}</span>` : ""}
                ${j.matchReason ? `<span style="color:#16a34a;">✓ ${j.matchReason}</span>` : ""}
              </div>
              <a href="${j.url}" style="display:inline-block;background:#ea580c;color:#ffffff;text-decoration:none;padding:8px 16px;border-radius:6px;font-size:13px;font-weight:600;">View & Apply →</a>
            </td></tr>
          </table>
        </td></tr>`
      )
      .join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Opportunities for you</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="background:linear-gradient(135deg,#0f4c75 0%,#1e3a5f 100%);padding:32px 28px;border-radius:12px 12px 0 0;color:#fff;text-align:center;">
          <h1 style="margin:0;font-size:24px;font-weight:700;">Hi ${greetingName}, opportunities are waiting</h1>
          <p style="margin:8px 0 0;font-size:14px;opacity:0.9;">Curated for ${headlineRole}</p>
        </td></tr>
        <tr><td style="background:#ffffff;padding:28px 28px 8px;">
          <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#334155;">${personalIntro}</p>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#334155;">Create your free Gradia account to apply, track applications, and unlock more matches.</p>
          <div style="text-align:center;margin:8px 0 24px;">
            <a href="${signupUrl}" style="display:inline-block;background:#0f4c75;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">Create your account</a>
          </div>
        </td></tr>
        <tr><td style="background:#ffffff;padding:20px 28px 6px;">
          <h2 style="margin:8px 0 12px;font-size:16px;color:#0f172a;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">💎 Your Wallet Points — What You Unlock Per Role</h2>
          <p style="margin:0 0 12px;font-size:13px;color:#475569;line-height:1.6;">No single package fits all — pick a pack based on the role you're targeting. Job applications, resume scoring & ATS matching are <strong>always free</strong>. Points are spent only when you confirm a premium action.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:14px;border-collapse:collapse;">
            <tr style="background:#0f4c75;color:#fff;">
              <td style="padding:8px 10px;font-size:11px;font-weight:600;border:1px solid #0f4c75;">Suggested Position</td>
              <td style="padding:8px 10px;font-size:11px;font-weight:600;text-align:center;border:1px solid #0f4c75;">Starter<br/><span style="font-weight:400;opacity:0.85;">200 pts</span></td>
              <td style="padding:8px 10px;font-size:11px;font-weight:600;text-align:center;border:1px solid #0f4c75;">Basic<br/><span style="font-weight:400;opacity:0.85;">500 pts</span></td>
              <td style="padding:8px 10px;font-size:11px;font-weight:600;text-align:center;border:1px solid #0f4c75;background:#0a3a5c;">Pro ★<br/><span style="font-weight:400;opacity:0.85;">1,000 pts</span></td>
              <td style="padding:8px 10px;font-size:11px;font-weight:600;text-align:center;border:1px solid #0f4c75;">Premium<br/><span style="font-weight:400;opacity:0.85;">2,500 pts</span></td>
            </tr>
            ${topMatches.map((j: any, i: number) => `
            <tr style="background:${i % 2 === 0 ? "#f8fafc" : "#ffffff"};">
              <td style="padding:10px;font-size:12px;color:#0f172a;font-weight:600;border:1px solid #e2e8f0;vertical-align:top;">
                ${j.job_title || j.title || "Suggested Role"}
                <div style="font-size:10px;color:#64748b;font-weight:400;margin-top:2px;">${j.company_name || j.company || ""}</div>
              </td>
              <td style="padding:10px;font-size:11px;color:#475569;text-align:center;border:1px solid #e2e8f0;vertical-align:top;line-height:1.5;">
                Apply ✓<br/>Resume Export<br/><span style="color:#94a3b8;">No mock interview</span>
              </td>
              <td style="padding:10px;font-size:11px;color:#475569;text-align:center;border:1px solid #e2e8f0;vertical-align:top;line-height:1.5;">
                Apply ✓<br/>Resume Export<br/><strong style="color:#0f4c75;">1× Mock Interview</strong>
              </td>
              <td style="padding:10px;font-size:11px;color:#0f172a;text-align:center;border:1px solid #fbbf24;background:#fffbeb;vertical-align:top;line-height:1.5;">
                Apply ✓<br/>Resume Export ×2<br/><strong>2× Mock Interviews</strong><br/>Featured Boost
              </td>
              <td style="padding:10px;font-size:11px;color:#475569;text-align:center;border:1px solid #e2e8f0;vertical-align:top;line-height:1.5;">
                Apply ✓<br/>Unlimited Exports<br/><strong style="color:#0f4c75;">5× Mock Interviews</strong><br/>Featured Boost ×3<br/>Priority Support
              </td>
            </tr>`).join("")}
          </table>
        </td></tr>
        ${aiSuggestedRoles.length > 0 ? `
        <tr><td style="background:#ffffff;padding:20px 28px 6px;">
          <h2 style="margin:8px 0 12px;font-size:16px;color:#0f172a;border-bottom:2px solid #e5e7eb;padding-bottom:8px;">AI-suggested roles for your skill set</h2>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${aiSuggestedRoles.map(r => `
              <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;">
                <div style="font-size:14px;font-weight:600;color:#0f172a;">${r.title}</div>
                <div style="font-size:12px;color:#64748b;margin-top:2px;">${r.why || ""}</div>
              </td></tr>
            `).join("")}
          </table>
        </td></tr>` : ""}
        <tr><td style="background:#ffffff;padding:20px 28px;">
          <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
            Once you sign up, your profile will be auto-prefilled from your resume so you can apply with a single click.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:18px;text-align:center;border-radius:0 0 12px 12px;color:#6b7280;font-size:12px;">
          © ${new Date().getFullYear()} Gradia. Need help? <a href="mailto:support@gradia.co.in" style="color:#ea580c;">support@gradia.co.in</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Gradia Hiring <noreply@gradia.co.in>",
        to: [email],
        subject: `${greetingName}, ${topMatches.length} job${topMatches.length > 1 ? "s" : ""} matching your profile on Gradia`,
        html,
      }),
    });

    const result = await emailRes.json();
    if (result.error) {
      return new Response(JSON.stringify({ error: result.error.message || "Failed to send email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, emailId: result.id, matchedJobs: topMatches.length, jobs: topMatches }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("invite-candidate-from-resume error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
