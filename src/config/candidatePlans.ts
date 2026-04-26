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
    tagline: "Get started for free",
    priceLabel: "Free",
    perks: [
      "5 job applications per month",
      "1 mock interview per month",
      "Resume builder (1 download / month)",
      "Browse all jobs",
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
    tagline: "Most popular",
    priceLabel: "₹499 / month",
    highlight: true,
    perks: [
      "50 job applications per month",
      "10 mock interviews per month",
      "20 external HR contact unlocks",
      "5 mentor contact unlocks",
      "5 AI Job Apply runs",
      "Unlimited resume downloads",
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
    tagline: "Everything, no limits",
    priceLabel: "₹999 / month",
    perks: [
      "Unlimited job applications",
      "Unlimited mock interviews",
      "Unlimited external HR contact unlocks",
      "Unlimited mentor contact unlocks",
      "Unlimited AI Job Apply",
      "Priority email support",
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
