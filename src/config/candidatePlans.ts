// Candidate subscription plans (5 tiers) and per-feature monthly limits.
// Use Infinity for unlimited.

export type CandidatePlan = "free" | "starter" | "advance" | "pro_accelerator" | "elite";

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
  /** Display price label (e.g. "₹0", "₹999 / month") */
  priceLabel: string;
  /** Numeric price in INR for billing */
  priceInr: number;
  /** Duration in months (used to compute per-month equivalent) */
  durationMonths: number;
  /** Best-for headline */
  bestFor: string;
  /** Primary CTA label */
  ctaLabel: string;
  /** Optional badge (e.g. "Most Popular", "Most Chosen") */
  badge?: string;
  /** Highlight as the hero card */
  highlight?: boolean;
  /** Visual treatment hint */
  tier: "free" | "starter" | "advance" | "pro" | "elite";
  /** Included features */
  perks: string[];
  /** Locked feature copy shown on Free tier */
  lockedPerks?: string[];
  /** Extra Elite-only mentoring program */
  mentoring?: string[];
  limits: Record<CandidateFeature, number>;
}

export const CANDIDATE_PLANS: Record<CandidatePlan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free Access",
    tagline: "Explore the Gradia platform",
    priceLabel: "₹0",
    priceInr: 0,
    durationMonths: 1,
    bestFor: "Exploring Gradia platform",
    ctaLabel: "Start Free",
    tier: "free",
    perks: [
      "3 Job Applications / Month",
      "Basic ATS Resume Score",
      "1 Resume PDF Download",
      "Weekly Job Alerts",
      "Limited Interview Prep Access",
      "Skillory Profile Creation",
      "Basic Dashboard Access",
    ],
    lockedPerks: [
      "AI Job Apply",
      "Advanced Interview Reports",
      "Career Roadmap",
      "Re-Interview Support",
      "Priority Visibility",
    ],
    limits: {
      job_apply: 3,
      external_job_unlock: 0,
      mock_interview: Infinity,
      mentor_unlock: 0,
      ai_job_apply: 0,
      resume_download: 1,
    },
  },
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Quick interview preparation",
    priceLabel: "₹999 / month",
    priceInr: 999,
    durationMonths: 1,
    bestFor: "Quick interview preparation",
    ctaLabel: "Start Your Journey",
    tier: "starter",
    perks: [
      "10 Job Applications",
      "Resume Builder",
      "Basic ATS Optimization",
      "Weekly Job Alerts",
      "Basic Interview Report",
      "Skillory Access",
      "Interview Prep Basics",
    ],
    limits: {
      job_apply: 10,
      external_job_unlock: 0,
      mock_interview: Infinity,
      mentor_unlock: 0,
      ai_job_apply: 0,
      resume_download: 5,
    },
  },
  advance: {
    id: "advance",
    name: "Advance",
    tagline: "Active job seekers",
    priceLabel: "₹2,499 / 3 months",
    priceInr: 2499,
    durationMonths: 3,
    bestFor: "Active job seekers",
    ctaLabel: "Upgrade to Advance",
    badge: "Most Chosen",
    tier: "advance",
    perks: [
      "30 Job Applications",
      "AI Interview Feedback Reports",
      "ATS Keyword Optimization",
      "Resume PDF Exports",
      "AI Job Apply Automation",
      "Personalized Alerts",
      "Interview Prep Library",
      "Skillory Recommendations",
      "Career Insights Dashboard",
    ],
    limits: {
      job_apply: 30,
      external_job_unlock: 5,
      mock_interview: Infinity,
      mentor_unlock: 1,
      ai_job_apply: 3,
      resume_download: 20,
    },
  },
  pro_accelerator: {
    id: "pro_accelerator",
    name: "Pro Accelerator",
    tagline: "Serious career growth",
    priceLabel: "₹7,999 / 6 months",
    priceInr: 7999,
    durationMonths: 6,
    bestFor: "Serious career growth",
    ctaLabel: "Activate Career Accelerator",
    badge: "Most Popular",
    highlight: true,
    tier: "pro",
    perks: [
      "75 Job Applications",
      "Advanced AI Interview Analysis",
      "Personalized Career Roadmap",
      "Re-Interview Support",
      "Featured Candidate Profile",
      "Skill Gap Analysis",
      "Daily Alerts",
      "AI Job Apply Automation",
      "Priority Support",
      "Advanced Interview Intelligence",
    ],
    limits: {
      job_apply: 75,
      external_job_unlock: 15,
      mock_interview: Infinity,
      mentor_unlock: 3,
      ai_job_apply: 10,
      resume_download: Infinity,
    },
  },
  elite: {
    id: "elite",
    name: "Elite Accelerator",
    tagline: "Long-term career acceleration & premium mentorship",
    priceLabel: "₹34,999 / year",
    priceInr: 34999,
    durationMonths: 12,
    bestFor: "Long-term career acceleration & premium mentorship",
    ctaLabel: "Join Elite Accelerator",
    badge: "Highest Success Potential",
    tier: "elite",
    perks: [
      "Unlimited Job Applications",
      "Unlimited Resume Exports",
      "Dedicated Career Coach",
      "Real HR Mock Panels",
      "Direct Recruiter Visibility",
      "Priority Placement Visibility",
      "WhatsApp Priority Support",
      "Early Job Mela Access",
      "Personalized Learning Roadmap",
      "Advanced Skillory Integration",
      "24/7 Premium Support",
      "Executive-Level Interview Preparation",
    ],
    mentoring: [
      "Dedicated personal mentor",
      "Weekly 1-on-1 mentorship sessions",
      "Personalized interview strategy",
      "Career growth guidance",
      "Resume & LinkedIn review",
      "Mock HR + technical mentoring",
      "Direct doubt-solving support",
      "Progress tracking & improvement planning",
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

export const CANDIDATE_PLAN_ORDER: CandidatePlan[] = [
  "free",
  "starter",
  "advance",
  "pro_accelerator",
  "elite",
];

export const FEATURE_LABELS: Record<CandidateFeature, string> = {
  job_apply: "Job Applications",
  external_job_unlock: "External HR Contact Unlocks",
  mock_interview: "Mock Interviews",
  mentor_unlock: "Mentor Contact Unlocks",
  ai_job_apply: "AI Job Apply",
  resume_download: "Resume Downloads",
};
