// Single source of truth for subscription plans across the app.
// Used by the public Pricing page AND the admin Users plan dropdowns,
// so both stay perfectly in sync.

export type PlanRole = "candidate" | "employer" | "freelancer" | "sponsor" | "edutech";

export interface PlanDefinition {
  /** Stable id used in DB / dropdowns (lowercase). */
  id: string;
  /** Display label shown in UI. */
  name: string;
  /** Wallet points cost (₹5 = 1 pt). 0 = free tier. Not used for candidate per-feature unlocks. */
  points: number;
  /** Direct INR price (used by candidate per-feature unlocks & bundles). */
  priceInr?: number;
  /** Optional grouping tag for candidate (feature | bundle). */
  group?: "feature" | "bundle";
  popular?: boolean;
  features: string[];
  cta: string;
}

export const PLANS: Record<PlanRole, PlanDefinition[]> = {
  candidate: [
    { id: "starter", name: "Starter", points: 400, features: [
      "Unlimited job applications",
      "1× Resume PDF export",
      "AI ATS score & report",
      "Application tracker",
    ], cta: "/candidate/signup" },
    { id: "basic", name: "Basic", points: 1000, features: [
      "Everything in Starter",
      "1× AI Mock Interview (Aptitude + Technical)",
      "Basic AI feedback report",
      "Weak-topic insights",
    ], cta: "/candidate/signup" },
    { id: "pro", name: "Pro", points: 2000, popular: true, features: [
      "Everything in Basic",
      "2× AI Mock Interviews (Tech + HR rounds)",
      "Detailed AI feedback report",
      "Featured profile boost (1×)",
      "Priority application tag",
    ], cta: "/candidate/signup" },
    { id: "premium", name: "Premium", points: 5000, features: [
      "Everything in Pro",
      "5× AI Mock Interviews (Full pipeline)",
      "Coding / Demo / HR / Final rounds",
      "Unlimited resume exports",
      "Featured boost (3×) + Priority support",
      "30-day improvement roadmap",
    ], cta: "/candidate/signup" },
  ],
  employer: [
    { id: "starter", name: "Starter", points: 0, features: [
      "3 job posts",
      "1 team seat",
      "Basic applicant tracker",
      "Email support",
    ], cta: "/employer/signup" },
    { id: "growth", name: "Growth", points: 1000, popular: true, features: [
      "15 job posts",
      "5 team seats",
      "Screening tests",
      "Analytics dashboard",
      "Priority support",
    ], cta: "/employer/signup" },
    { id: "professional", name: "Professional", points: 3000, features: [
      "50 job posts",
      "15 team seats",
      "AI interview automation",
      "Advanced analytics",
      "Dedicated account manager",
      "API access",
    ], cta: "/employer/signup" },
    { id: "enterprise", name: "Enterprise", points: 5800, features: [
      "Unlimited job posts",
      "Unlimited seats",
      "Custom integrations",
      "SLA guarantee",
      "White-label options",
      "Dedicated support team",
    ], cta: "/contact" },
  ],
  freelancer: [
    { id: "starter", name: "Starter", points: 0, features: [
      "Portfolio page",
      "3 project listings",
      "Basic profile",
      "Community access",
    ], cta: "/freelancer/signup" },
    { id: "pro", name: "Pro", points: 300, popular: true, features: [
      "Unlimited projects",
      "Custom portfolio domain",
      "Priority in search",
      "Client messaging",
      "Analytics",
    ], cta: "/freelancer/signup" },
    { id: "premium", name: "Premium", points: 600, features: [
      "Everything in Pro",
      "Featured profile badge",
      "Mentorship tools",
      "Invoice management",
      "Dedicated support",
    ], cta: "/freelancer/signup" },
  ],
  sponsor: [
    { id: "silver", name: "Silver", points: 700, features: [
      "Logo on event banners",
      "1 stall reservation",
      "Basic candidate access",
      "Post-event report",
    ], cta: "/sponsors" },
    { id: "gold", name: "Gold", points: 1500, popular: true, features: [
      "Premium banner placement",
      "2 stall reservations",
      "Full candidate database",
      "Brand visibility package",
      "Social media promotion",
    ], cta: "/sponsors" },
    { id: "platinum", name: "Platinum", points: 3000, features: [
      "Title sponsorship",
      "3 stall reservations",
      "Exclusive candidate access",
      "Keynote speaking slot",
      "Full marketing toolkit",
      "Dedicated liaison",
    ], cta: "/sponsors" },
  ],
  edutech: [
    { id: "starter", name: "Starter", points: 0, features: [
      "Up to 50 students",
      "Basic dashboard",
      "Attendance tracking",
      "Email support",
    ], cta: "/edutech/login" },
    { id: "growth", name: "Growth", points: 1000, popular: true, features: [
      "Up to 500 students",
      "Placement tracking",
      "Payment management",
      "Analytics & reports",
      "Priority support",
    ], cta: "/edutech/login" },
    { id: "enterprise", name: "Enterprise", points: 3000, features: [
      "Unlimited students",
      "Multi-branch support",
      "Custom branding",
      "API integrations",
      "Dedicated manager",
      "White-label portal",
    ], cta: "/edutech/login" },
  ],
};

/** Plan ids selectable in admin dropdowns for a given role. */
export const getPlanIdsForRole = (role: PlanRole): string[] =>
  PLANS[role]?.map((p) => p.id) ?? [];

/** Lookup a plan definition by role + id. */
export const getPlan = (role: PlanRole, id: string): PlanDefinition | undefined =>
  PLANS[role]?.find((p) => p.id === id);
