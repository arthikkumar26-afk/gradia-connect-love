// Candidate subscription plans and per-feature monthly limits.
// Use Infinity for unlimited.

export type CandidatePlan = "basic" | "pro" | "premium";

export type CandidateFeature =
  | "job_apply"
  | "external_job_unlock"
  | "mock_interview"
  | "mentor_unlock"
  | "ai_job_apply"
  | "resume_download";

export interface PlanDefinition {
  id: CandidatePlan;
  name: string;
  tagline: string;
  priceLabel: string; // display only
  highlight?: boolean;
  perks: string[];
  limits: Record<CandidateFeature, number>;
}

export const CANDIDATE_PLANS: Record<CandidatePlan, PlanDefinition> = {
  basic: {
    id: "basic",
    name: "Basic",
    tagline: "Kickstart your job search",
    priceLabel: "₹4,999 / year",
    perks: [
      "5 job applications per month",
      "1 mock interview per month",
      "Resume builder with 1 PDF download / month",
      "Browse all jobs across India",
      "Basic ATS resume score insights",
      "Email job alerts (weekly digest)",
      "Community support",
    ],
    limits: {
      job_apply: 5,
      external_job_unlock: 0,
      mock_interview: 1,
      mentor_unlock: 0,
      ai_job_apply: 0,
      resume_download: 1,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Most popular — accelerate your hiring",
    priceLabel: "₹14,999 / year",
    highlight: true,
    perks: [
      "50 job applications per month",
      "10 mock interviews per month (with AI feedback)",
      "20 external HR contact unlocks",
      "5 mentor contact unlocks for 1-on-1 guidance",
      "5 AI Job Apply auto-runs per month",
      "Unlimited resume downloads & template switching",
      "Advanced ATS scoring + keyword optimisation",
      "Daily personalised job alerts",
      "Interview prep library & answer keys",
      "Priority email support (24h response)",
    ],
    limits: {
      job_apply: 50,
      external_job_unlock: 20,
      mock_interview: 10,
      mentor_unlock: 5,
      ai_job_apply: 5,
      resume_download: Infinity,
    },
  },
  premium: {
    id: "premium",
    name: "Premium",
    tagline: "Everything unlocked, no limits",
    priceLabel: "₹24,999 / year",
    perks: [
      "Unlimited job applications",
      "Unlimited mock interviews with detailed AI reports",
      "Unlimited external HR contact unlocks",
      "Unlimited mentor contact unlocks",
      "Unlimited AI Job Apply automation",
      "Unlimited resume downloads (all premium templates)",
      "Featured candidate profile to recruiters",
      "Dedicated career coach & 1-on-1 mock HR rounds",
      "Personalised learning roadmap & course recommendations",
      "Early access to job melas & exclusive events",
      "Priority placement in employer searches",
      "24/7 priority support (chat + email)",
    ],
    limits: {
      job_apply: Infinity,
      external_job_unlock: Infinity,
      mock_interview: Infinity,
      mentor_unlock: Infinity,
      ai_job_apply: Infinity,
      resume_download: Infinity,
    },
  },
};

export const FEATURE_LABELS: Record<CandidateFeature, string> = {
  job_apply: "Job Applications",
  external_job_unlock: "External HR Contact Unlocks",
  mock_interview: "Mock Interviews",
  mentor_unlock: "Mentor Contact Unlocks",
  ai_job_apply: "AI Job Apply",
  resume_download: "Resume Downloads",
};
