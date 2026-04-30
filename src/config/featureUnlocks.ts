// Pay-to-unlock feature catalog for the candidate dashboard.
// All amounts are in INR, charged once via Razorpay. Unlocks last 1 month.

export type UnlockFeature =
  | "resume"
  | "jobs"
  | "aijobapply"
  | "pipeline"
  | "mocktest"
  | "upskill";

export interface FeatureUnlockDefinition {
  id: UnlockFeature;
  label: string;
  shortLabel: string;
  price: number;
  tagline: string;
  perks: string[];
}

export const FEATURE_UNLOCKS: Record<UnlockFeature, FeatureUnlockDefinition> = {
  resume: {
    id: "resume",
    label: "Resume Builder",
    shortLabel: "Resume",
    price: 4999,
    tagline: "ATS-friendly resumes + premium templates",
    perks: ["ATS-optimised templates", "Instant download & editing", "Unlimited revisions for 1 month"],
  },
  jobs: {
    id: "jobs",
    label: "Suitable Jobs (AI Matching)",
    shortLabel: "Suitable Jobs",
    price: 6999,
    tagline: "Personalised job recommendations powered by AI",
    perks: ["AI-matched job feed", "Smart profile-based filtering", "Daily refresh of openings"],
  },
  aijobapply: {
    id: "aijobapply",
    label: "AI Job Apply",
    shortLabel: "AI Apply",
    price: 8999,
    tagline: "One-click auto-apply across multiple jobs",
    perks: ["Auto-apply to multiple jobs daily", "Tailored cover notes", "Hands-free job hunting"],
  },
  pipeline: {
    id: "pipeline",
    label: "Interview Pipeline Tracker",
    shortLabel: "Pipeline",
    price: 5999,
    tagline: "Track every application & interview stage",
    perks: ["Stage-by-stage tracking", "Status & feedback timeline", "Organised job journey dashboard"],
  },
  mocktest: {
    id: "mocktest",
    label: "Mock Tests / Interviews",
    shortLabel: "Mock Interviews",
    price: 9999,
    tagline: "Real interview simulations + AI scoring",
    perks: ["Realistic AI-driven interviews", "Detailed performance feedback", "Score & improvement reports"],
  },
  upskill: {
    id: "upskill",
    label: "Upskill Yourself",
    shortLabel: "Upskill",
    price: 12999,
    tagline: "Job-ready training, courses & certifications",
    perks: ["Skill-based learning modules", "Industry certifications", "Career-ready training tracks"],
  },
};

export interface BundleDefinition {
  id: string;
  name: string;
  badge?: string;
  price: number;
  features: UnlockFeature[];
  description: string;
}

const sumIndividual = (ids: UnlockFeature[]) =>
  ids.reduce((s, id) => s + FEATURE_UNLOCKS[id].price, 0);

export const FEATURE_BUNDLES: BundleDefinition[] = [
  {
    id: "starter",
    name: "Starter Pack",
    price: 9999,
    features: ["resume", "jobs"],
    description: "Resume Builder + Suitable Jobs",
  },
  {
    id: "accelerator",
    name: "Job Accelerator Pack",
    badge: "Most Popular",
    price: 17999,
    features: ["resume", "aijobapply", "jobs"],
    description: "Resume + AI Apply + Job Matching",
  },
  {
    id: "career_pro",
    name: "Career Pro Pack",
    price: 29999,
    features: ["resume", "jobs", "aijobapply", "pipeline", "mocktest"],
    description: "All features except Upskilling",
  },
  {
    id: "total_value",
    name: "Total Value Pack",
    badge: "Best Value",
    price: 45000,
    features: ["resume", "jobs", "aijobapply", "pipeline", "mocktest", "upskill"],
    description: "Full Access Bundle — every feature unlocked",
  },
];

export const bundleSavings = (b: BundleDefinition) =>
  Math.max(0, sumIndividual(b.features) - b.price);
