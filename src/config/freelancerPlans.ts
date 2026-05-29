// Freelance add-on plans offered inside the candidate subscription tab.
// Purchasing one generates a 100%-off coupon redeemable on the Freelancer platform.

export type FreelancerPlan = "basic" | "plus" | "pro" | "elite";

export interface FreelancerPlanDef {
  id: FreelancerPlan;
  name: string;
  priceLabel: string;
  priceInr: number;
  durationMonths: number;
  bestFor: string;
  badge?: string;
  highlight?: boolean;
  perks: string[];
}

export const FREELANCER_PLANS: Record<FreelancerPlan, FreelancerPlanDef> = {
  basic: {
    id: "basic",
    name: "Freelancer Basic",
    priceLabel: "₹2,999 / 3 months",
    priceInr: 2999,
    durationMonths: 3,
    bestFor: "Starting freelance journey",
    perks: [
      "Freelancer Dashboard",
      "Public Portfolio",
      "AI Portfolio Builder",
      "Resume → Portfolio Conversion",
      "Access to Employer Projects",
      "Basic Gig Creation",
      "Shared Portfolio Links",
      "Skill-Based Recommendations",
    ],
  },
  plus: {
    id: "plus",
    name: "Freelancer Plus",
    priceLabel: "₹7,999 / 6 months",
    priceInr: 7999,
    durationMonths: 6,
    bestFor: "Growing freelance income",
    badge: "Most Chosen",
    highlight: true,
    perks: [
      "Everything in Basic",
      "AI Portfolio Optimization",
      "Priority Project Matching",
      "Advanced Gig Visibility",
      "AI Bio & Proposal Writing",
      "Direct Project Alerts",
      "Client Proposal Templates",
      "Portfolio Analytics",
      "Profile Branding",
    ],
  },
  pro: {
    id: "pro",
    name: "Freelancer Pro",
    priceLabel: "₹14,999 / year",
    priceInr: 14999,
    durationMonths: 12,
    bestFor: "Serious freelance growth",
    badge: "Most Popular",
    perks: [
      "Everything in Plus",
      "Verified Freelancer Badge",
      "Featured Freelancer Placement",
      "Premium Client Matching",
      "Advanced AI Proposal Generation",
      "Priority Employer Visibility",
      "1-on-1 Freelance Guidance",
      "Advanced Portfolio Branding",
      "AI Personal Branding",
      "Priority Support",
    ],
  },
  elite: {
    id: "elite",
    name: "Freelancer Elite",
    priceLabel: "₹34,999 / year",
    priceInr: 34999,
    durationMonths: 12,
    bestFor: "Building premium freelance business",
    badge: "Premium Creator Access",
    perks: [
      "Unlimited Project Visibility",
      "Dedicated Freelance Mentor",
      "High-Value Client Access",
      "Featured Homepage Placement",
      "Personal Portfolio Website",
      "Advanced AI Client Matching",
      "Premium Verification",
      "WhatsApp Priority Support",
      "Personal Brand Strategy",
      "Monthly Growth Sessions",
      "Executive Creator Positioning",
    ],
  },
};

export const FREELANCER_PLAN_ORDER: FreelancerPlan[] = ["basic", "plus", "pro", "elite"];

export const CANDIDATE_FREELANCER_COMBOS = {
  advance: {
    freelancerPlanId: "basic" as FreelancerPlan,
    label: "Freelancer Basic Combo",
    couponLabel: "100% FREE coupon",
  },
  pro_accelerator: {
    freelancerPlanId: "plus" as FreelancerPlan,
    label: "Freelancer Plus Combo",
    couponLabel: "100% FREE coupon",
  },
  elite: {
    freelancerPlanId: "pro" as FreelancerPlan,
    label: "Freelancer Pro Combo",
    couponLabel: "100% FREE coupon",
  },
} as const;
