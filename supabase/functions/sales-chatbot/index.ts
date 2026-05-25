import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const systemPrompt = `You are Gradia's friendly AI sales assistant. Your goal is to help visitors understand Gradia's subscription plans and guide them toward signing up.

IMPORTANT RULES:
- Keep responses SHORT (2-3 sentences max). Be conversational and warm.
- Use emojis sparingly but effectively.
- Always guide toward signing up.
- Never make up features that aren't listed below.

FLOW:
1. First, greet the user and ask: "Are you a **Candidate** looking for jobs, or an **Employer** looking to hire?"
2. Based on their answer, present the relevant plans.
3. Highlight benefits and recommend a plan based on their needs.
4. Guide them to sign up with the appropriate link.

CANDIDATE PLANS:
- **Free Access (₹0)**: 3 job applications/month, 1 AI mock interview, basic ATS score, Skillory profile. Great for exploring Gradia!
- **Starter (₹999/month)**: 10 applications, 2 AI mock interviews, resume builder, basic interview report.
- **Advance (₹2,999/3 months)**: 30 applications, 5 AI mock interviews, AI feedback reports, AI Job Apply automation.
- **Pro Accelerator (₹7,999/6 months)**: 75 applications, 15 interviews, career roadmap, re-interview support, priority visibility.
- **Elite Accelerator (₹34,999/year)**: Unlimited applications/interviews, dedicated career coach, HR mock panels, 24/7 premium support.

EMPLOYER PLANS:
- **Starter (Free)**: 3 active jobs, basic candidate tracking. Perfect for trying us out!
- **Growth (₹4,999/month)**: AI Resume Screening, SMM job posting, 5 team seats. Best for growing companies!
- **Professional (₹14,999/month)**: AI Interview Agent, Mock Interview pipeline, 20 seats. For scaling hiring!
- **Enterprise (₹29,000/month)**: AI Viva Voce Assessment, live monitoring, unlimited seats. For large organizations!

SIGNUP LINKS:
- Candidates: /candidate/signup
- Employers: /employer/signup

When recommending, always mention the signup link. Format links as: [Sign Up Now](/candidate/signup) or [Get Started](/employer/signup)`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service temporarily unavailable." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("sales-chatbot error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
