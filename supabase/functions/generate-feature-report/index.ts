// Generates a comprehensive feature report scanning the Gradia platform via Lovable AI.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const PLATFORM_CONTEXT = `
Gradia is a hiring + freelance + edutech + sponsor platform built on React + Supabase.

Core Portals & Capabilities:
- Candidate Portal: Signup (email/Google OAuth), AI resume parse, Profile (education/experience/skills),
  Wallet (₹5 = 1 pt via Razorpay), Feature Unlocks (Resume Builder, AI Job Apply, Mock Tests, Upskill,
  Mentor Contact 300pts), Job Discovery with weighted AI matching, One-click apply, Interview Pipeline
  (MCQ → AI Technical → Coding → HR → Management), Industry-specific stages (IT, Banking, Education,
  Civil, Film/Media), Live WebRTC recording, Mock Interviews (Gemini 3 Flash), Learning recommendations,
  Skillory Voucher Wallet, Freelancer Add-On coupons.
- Candidate Plans: Free, Starter, Advance (₹2,499), Pro, Elite. Freelance Add-Ons: Basic ₹2,999 (3mo),
  Plus ₹7,999 (6mo), Pro ₹14,999, Elite ₹34,999 — issues 100% coupon redeemable in Freelancer signup.
- Employer/HR: Registration, Agreement, Plan selection (wallet points), AI Vacancy Generator, Pipeline
  configuration (toggle optional rounds), Job moderation, Candidate Management, Talent Pool with
  multi-criteria filters, Interview Orchestration (slot booking, observer emails, feedback templates,
  PDF final review), Outsource Projects with custom budgets, AI Flyer Maker, Chapter-wise Q&A tool
  (pdfjs), Test Paper Assignments, Real-time notifications, HR Activity logs.
- Freelancer/Mentor: Role-specific signup with verification badge, AI Portfolio Builder,
  Resume→Portfolio conversion, Public Portfolio, Mentor listings (300pt contact unlock — credited
  to mentor wallet), Outsource project pickup, Mentorship management (dual-mode enrollment).
- EduTech Portal: Institute signup with user_id isolation, Bulk Campaigns (20MB attachments via
  Supabase URLs), Event invitations with Zoom links, Student management, Career Events.
- Sponsor Portal: Sponsorship tiers, Stall reservation, Brand Visibility, Candidate Leads,
  Analytics & ROI, Post-event deliverables, Marketing Toolkit, Collaboration opportunities.
- Admin/Owner: User & HR Management (with initial password store, safe deletion), Job & Content
  Moderation (popup ads, external jobs, event alerts, trending jobs), Plan Control, Coupon Management,
  Razorpay Webhooks, Subscription Activation Logs, Live Activity Monitor, Growth Metrics,
  Revenue Analytics, Audit Logs, Bulk Mail Register, AI Flyer Maker, Database management.

Technology Stack (when includeTechnology=true):
- Frontend: React 18, TypeScript, Vite, TailwindCSS, shadcn/ui, framer-motion, react-router.
- Backend: Supabase (Postgres + RLS), Edge Functions (Deno), Supabase Auth, Realtime, Storage buckets.
- AI: Lovable AI Gateway (Google Gemini 3 Flash, Gemini 3 Flash Image, GPT-5 family — no API keys),
  ElevenLabs SDK for voice.
- Payments: Razorpay (wallet point loading + feature unlocks).
- Email: Resend API, AWS SES (manual).
- Media: pdfjs-dist (PDF parsing), WebRTC streaming for live interview monitoring.
- Storage: AWS S3 (manual), Supabase Storage (profile-pictures, resumes, portfolio-media,
  mentorship-docs, interview-recordings, demo-videos, mock-test-recordings, campaign-attachments).

Indicative pricing (when includePrice=true):
- Wallet conversion: ₹5 = 1 point.
- Candidate Plans: Free ₹0, Starter ~₹499, Advance ₹2,499, Pro ~₹4,999, Elite ~₹9,999.
- Freelancer Add-Ons: Basic ₹2,999 / Plus ₹7,999 / Pro ₹14,999 / Elite ₹34,999.
- Feature unlocks (per feature, 1-month access via Razorpay): typically ₹99–₹499.
- Mentor contact unlock: 300 pts (₹1,500).
- Employer plans: tiered by company size & job volume (wallet-points based).
`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');
    const { includeTechnology = true, includePrice = true } = await req.json().catch(() => ({}));

    const system = `You are a senior product analyst. Produce a comprehensive, well-structured feature
report of the Gradia platform. Group features by portal. Use clear markdown with H2 per portal,
short bullets per feature.
${includeTechnology ? '- Include a "Technology" line under each portal section listing the relevant tech stack.' : '- Do NOT mention any technology, framework, library, or tooling names.'}
${includePrice ? '- Include a "Pricing" line per portal (or per feature where relevant) using the rupee amounts provided.' : '- Do NOT mention any prices, plans, or monetary amounts.'}
Finish with an "Overall Summary" section (3-5 bullets) highlighting unique selling points.`;

    const userMsg = `${PLATFORM_CONTEXT}

Generate the full feature report now.
- includeTechnology = ${includeTechnology}
- includePrice = ${includePrice}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: userMsg },
        ],
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `AI error ${res.status}: ${t}` }), {
        status: res.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = await res.json();
    const report = data?.choices?.[0]?.message?.content ?? '';
    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
