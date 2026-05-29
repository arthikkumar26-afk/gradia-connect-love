import { useState, useEffect, useRef, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import SignupGuidedTour, { TourStep } from "@/components/signup/SignupGuidedTour";
import { useSearchParams } from "react-router-dom";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Users, Target, BarChart, Shield, Sparkles, Calendar, FileText, Award, Briefcase, GraduationCap, CheckCircle, Check, Upload, Wand2, Wallet, Star, CreditCard, Plus, Minus } from "lucide-react";
import { FEATURE_UNLOCKS, type UnlockFeature } from "@/config/featureUnlocks";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getRolesForPipeline } from "@/data/interviewPipelineConfig";
import { Loader2 } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/ui/PasswordStrengthIndicator";
import { Badge } from "@/components/ui/badge";
import { CouponInput } from "@/components/shared/CouponInput";
import { WhyPriceFAQ } from "@/components/shared/WhyPriceFAQ";
import { CANDIDATE_PLANS, CANDIDATE_PLAN_ORDER, type CandidatePlan } from "@/config/candidatePlans";
import { CANDIDATE_FREELANCER_COMBOS, FREELANCER_PLANS } from "@/config/freelancerPlans";
// Shared resend-confirmation helpers + hook so the candidate signup uses
// the exact same cooldown / rate-limit semantics as the candidate login,
// employer signup, and freelancer login flows.
import { useResendConfirmation } from "@/hooks/useResendConfirmation";
// Aggregated ARIA live-region announcer for inline form validation errors.
// Re-announces on every submit attempt (even with unchanged errors) so
// screen-reader users get consistent feedback per submit.
import { FormErrorAnnouncer } from "@/components/auth/FormErrorAnnouncer";
import { SKILLORY_VOUCHER_PRICE, SKILLORY_VOUCHER_POINTS } from "@/components/candidate/SkilloryVoucherCard";
import { Gift } from "lucide-react";

interface FormErrors {
  fullName?: string;
  email?: string;
  mobile?: string;
  password?: string;
  confirmPassword?: string;
}

type WizardStep = 'signup' | 'resume' | 'benefits' | 'agreement' | 'terms' | 'plan';

const wizardSteps = [
  { id: 'signup' as const, label: 'Create Account', stepNumber: 1 },
  { id: 'resume' as const, label: 'AI Resume Scan', stepNumber: 2 },
  { id: 'benefits' as const, label: 'Benefits', stepNumber: 3 },
  { id: 'agreement' as const, label: 'Agreement', stepNumber: 4 },
  { id: 'terms' as const, label: 'Terms & Conditions', stepNumber: 5 },
  { id: 'plan' as const, label: 'Choose Plan', stepNumber: 6 },
];

declare global {
  interface Window {
    Razorpay: any;
  }
}

// Keys we proactively clear on mount to prevent cross-browser stale-state divergence
const STALE_STORAGE_KEYS = [
  'candidateSignupWizardStep',
  'candidateOnboardingStep',
  'walletActivationPending',
];

const POINT_PACKAGES = [
  {
    points: 400,
    price: 2000,
    popular: false,
    name: 'Starter',
    tagline: 'Apply & self-prepare',
    rounds: 'No mock rounds',
    features: [
      'Apply to unlimited jobs',
      'Resume export (1×)',
      'AI ATS keyword score',
      'Application tracker dashboard',
    ],
    excluded: ['Mock interviews', 'AI feedback report', 'Featured profile boost'],
  },
  {
    points: 1000,
    price: 5000,
    popular: false,
    name: 'Basic',
    tagline: 'Get interview ready',
    rounds: '1× Mock Interview (Aptitude + 1 Technical)',
    features: [
      'Everything in Starter',
      '1× full Mock Interview',
      'Round 1 — Aptitude / Screening (15 MCQs)',
      'Round 2 — Core Technical (10 role-specific Qs)',
      'Basic AI feedback summary',
    ],
    excluded: ['Featured profile boost', 'Detailed feedback report'],
  },
  {
    points: 2000,
    price: 10000,
    popular: true,
    name: 'Pro',
    tagline: 'Most popular — best value',
    rounds: '2× Mock Interviews (Aptitude + Technical + HR)',
    features: [
      'Everything in Basic',
      '2× Mock Interviews — full 3-round flow',
      'Round 1 — Aptitude + Domain (20 Qs)',
      'Round 2 — Technical Deep-Dive (Coding/Demo/Case)',
      'Round 3 — HR Behavioral (video, STAR-method)',
      'Detailed AI feedback report',
      'Featured profile boost (1×) + priority tag',
    ],
    excluded: [],
  },
  {
    points: 5000,
    price: 25000,
    popular: false,
    name: 'Premium',
    tagline: 'Full pipeline rehearsal',
    rounds: '5× Mock Interviews — full pipeline',
    features: [
      'Everything in Pro',
      '5× Mock Interviews (full hiring pipeline)',
      'Aptitude + Technical + Coding/Demo + HR + Final',
      'Full AI feedback + 30-day improvement roadmap',
      'Unlimited resume exports',
      'Featured boost (3×) + priority support',
    ],
    excluded: [],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// EDUCATION POSITION → BAND → PACK PRICING
// Mirrors the official PACKs (Processing Charges) table provided by ops.
// Each position is mapped to its band + salary-range row, which yields the
// three subscription PLAN amounts (A / B / C) the candidate can pick.
// ─────────────────────────────────────────────────────────────────────────
type EducationPlanKey = 'A' | 'B' | 'C';
interface EducationPosition {
  title: string;
  band: 'Band 1' | 'Band 2' | 'Band 3' | 'Band 4';
  group: 'Group-I' | 'Group-II' | 'Group-III' | 'Group-IV';
  segment: string;
  salaryRange: string;
  annualPackage: string;
  prices: Record<EducationPlanKey, number>;
}

const EDUCATION_POSITIONS: EducationPosition[] = [
  // Group-I / Band 1 — Admin & Academics
  { title: 'Principal — State Board', band: 'Band 1', group: 'Group-I', segment: 'Admin & Academics', salaryRange: '₹50,000–80,000 pm', annualPackage: '₹3,00,000–5,00,000', prices: { A: 30000, B: 40000, C: 40000 } },
  { title: 'Principal — CBSE Board', band: 'Band 1', group: 'Group-I', segment: 'Admin & Academics', salaryRange: '₹90,000–1,50,000 pm', annualPackage: '₹8,00,000–10,00,000', prices: { A: 30000, B: 40000, C: 50000 } },
  { title: 'Cluster Principal', band: 'Band 1', group: 'Group-I', segment: 'Admin & Academics', salaryRange: '₹90,000–2,50,000 pm', annualPackage: '₹10,00,000–12,00,000', prices: { A: 30000, B: 40000, C: 50000 } },
  { title: 'Academic Head', band: 'Band 1', group: 'Group-I', segment: 'Admin & Academics', salaryRange: '₹1,00,000–1,50,000 pm', annualPackage: '₹8,00,000–10,00,000', prices: { A: 30000, B: 40000, C: 50000 } },
  { title: 'SME (Subject Matter Expert)', band: 'Band 1', group: 'Group-I', segment: 'Admin & Academics', salaryRange: '₹50,000–1,00,000 pm', annualPackage: '₹5,00,000–8,00,000', prices: { A: 30000, B: 40000, C: 40000 } },
  { title: 'Resource Person', band: 'Band 1', group: 'Group-I', segment: 'Admin & Academics', salaryRange: '₹50,000–90,000 pm', annualPackage: '₹5,00,000–8,00,000', prices: { A: 30000, B: 40000, C: 40000 } },

  // Group-II / Band 2 — High School Segment
  { title: 'Vice-Principal / Dean', band: 'Band 2', group: 'Group-II', segment: 'High School', salaryRange: '₹40,000–60,000 pm', annualPackage: '₹4,00,000–5,00,000', prices: { A: 25000, B: 30000, C: 40000 } },
  { title: 'Telugu Teacher (High School)', band: 'Band 2', group: 'Group-II', segment: 'High School', salaryRange: '₹30,000–40,000 pm', annualPackage: '₹3,00,000–4,00,000', prices: { A: 20000, B: 25000, C: 30000 } },
  { title: 'Hindi Teacher (High School)', band: 'Band 2', group: 'Group-II', segment: 'High School', salaryRange: '₹30,000–40,000 pm', annualPackage: '₹3,00,000–4,00,000', prices: { A: 20000, B: 25000, C: 30000 } },
  { title: 'English Teacher (High School)', band: 'Band 2', group: 'Group-II', segment: 'High School', salaryRange: '₹30,000–40,000 pm', annualPackage: '₹3,00,000–4,00,000', prices: { A: 20000, B: 25000, C: 30000 } },
  { title: 'Math Teacher (High School)', band: 'Band 2', group: 'Group-II', segment: 'High School', salaryRange: '₹30,000–50,000 pm', annualPackage: '₹4,00,000–5,00,000', prices: { A: 25000, B: 30000, C: 40000 } },
  { title: 'Physics Teacher (High School)', band: 'Band 2', group: 'Group-II', segment: 'High School', salaryRange: '₹30,000–50,000 pm', annualPackage: '₹4,00,000–5,00,000', prices: { A: 25000, B: 30000, C: 40000 } },
  { title: 'Chemistry Teacher (High School)', band: 'Band 2', group: 'Group-II', segment: 'High School', salaryRange: '₹30,000–50,000 pm', annualPackage: '₹4,00,000–5,00,000', prices: { A: 25000, B: 30000, C: 40000 } },
  { title: 'Biology Teacher (High School)', band: 'Band 2', group: 'Group-II', segment: 'High School', salaryRange: '₹30,000–40,000 pm', annualPackage: '₹3,00,000–4,00,000', prices: { A: 20000, B: 25000, C: 30000 } },
  { title: 'Social Teacher (High School)', band: 'Band 2', group: 'Group-II', segment: 'High School', salaryRange: '₹30,000–40,000 pm', annualPackage: '₹3,00,000–4,00,000', prices: { A: 20000, B: 25000, C: 30000 } },
  { title: 'Computer Teacher (High School)', band: 'Band 2', group: 'Group-II', segment: 'High School', salaryRange: '₹25,000–30,000 pm', annualPackage: '₹3,00,000–4,00,000', prices: { A: 20000, B: 25000, C: 30000 } },
  { title: 'P.E.T (Physical Education Teacher)', band: 'Band 2', group: 'Group-II', segment: 'High School', salaryRange: '₹20,000–30,000 pm', annualPackage: '₹3,00,000–4,00,000', prices: { A: 20000, B: 25000, C: 30000 } },
  { title: 'Softskill Trainer', band: 'Band 2', group: 'Group-II', segment: 'High School', salaryRange: '₹25,000–30,000 pm', annualPackage: '₹3,00,000–4,00,000', prices: { A: 20000, B: 25000, C: 30000 } },
  { title: 'Calligraphy Trainer', band: 'Band 2', group: 'Group-II', segment: 'High School', salaryRange: '₹30,000–40,000 pm', annualPackage: '₹3,00,000–4,00,000', prices: { A: 20000, B: 25000, C: 30000 } },

  // Group-III / Band 3 — Primary Segment
  { title: 'Vice-Principal (Primary)', band: 'Band 3', group: 'Group-III', segment: 'Primary', salaryRange: '₹20,000–35,000 pm', annualPackage: '₹3,00,000–4,00,000', prices: { A: 15000, B: 20000, C: 25000 } },
  { title: 'Mother Teacher (Primary)', band: 'Band 3', group: 'Group-III', segment: 'Primary', salaryRange: '₹15,000–20,000 pm', annualPackage: '₹2,00,000–3,00,000', prices: { A: 15000, B: 20000, C: 25000 } },
  { title: 'Telugu Teacher (Primary)', band: 'Band 3', group: 'Group-III', segment: 'Primary', salaryRange: '₹15,000–20,000 pm', annualPackage: '₹2,00,000–3,00,000', prices: { A: 15000, B: 20000, C: 25000 } },
  { title: 'Hindi Teacher (Primary)', band: 'Band 3', group: 'Group-III', segment: 'Primary', salaryRange: '₹15,000–20,000 pm', annualPackage: '₹2,00,000–3,00,000', prices: { A: 15000, B: 20000, C: 25000 } },
  { title: 'English Teacher (Primary)', band: 'Band 3', group: 'Group-III', segment: 'Primary', salaryRange: '₹15,000–20,000 pm', annualPackage: '₹2,00,000–3,00,000', prices: { A: 15000, B: 20000, C: 25000 } },
  { title: 'Math Teacher (Primary)', band: 'Band 3', group: 'Group-III', segment: 'Primary', salaryRange: '₹15,000–20,000 pm', annualPackage: '₹2,00,000–3,00,000', prices: { A: 15000, B: 20000, C: 25000 } },
  { title: 'Science Teacher (Primary)', band: 'Band 3', group: 'Group-III', segment: 'Primary', salaryRange: '₹15,000–20,000 pm', annualPackage: '₹2,00,000–3,00,000', prices: { A: 15000, B: 20000, C: 25000 } },
  { title: 'Social Teacher (Primary)', band: 'Band 3', group: 'Group-III', segment: 'Primary', salaryRange: '₹15,000–20,000 pm', annualPackage: '₹2,00,000–3,00,000', prices: { A: 15000, B: 20000, C: 25000 } },
  { title: 'Computer Teacher (Primary)', band: 'Band 3', group: 'Group-III', segment: 'Primary', salaryRange: '₹15,000–20,000 pm', annualPackage: '₹2,00,000–3,00,000', prices: { A: 15000, B: 20000, C: 25000 } },
  { title: 'P.E.T (Primary)', band: 'Band 3', group: 'Group-III', segment: 'Primary', salaryRange: '₹15,000–20,000 pm', annualPackage: '₹2,00,000–3,00,000', prices: { A: 15000, B: 20000, C: 25000 } },
  { title: 'Art & Craft Teacher (Primary)', band: 'Band 3', group: 'Group-III', segment: 'Primary', salaryRange: '₹10,000–20,000 pm', annualPackage: '₹2,00,000–3,00,000', prices: { A: 15000, B: 20000, C: 25000 } },

  // Group-IV / Band 4 — Pre-Primary Segment
  { title: 'Vice-Principal (Pre-Primary)', band: 'Band 4', group: 'Group-IV', segment: 'Pre-Primary', salaryRange: '₹20,000–30,000 pm', annualPackage: '₹2,00,000–3,00,000', prices: { A: 15000, B: 20000, C: 25000 } },
  { title: 'Mother Teacher (Pre-Primary)', band: 'Band 4', group: 'Group-IV', segment: 'Pre-Primary', salaryRange: '₹15,000–20,000 pm', annualPackage: '₹2,00,000–3,00,000', prices: { A: 15000, B: 20000, C: 25000 } },
  { title: 'Asso. Teacher (Pre-Primary)', band: 'Band 4', group: 'Group-IV', segment: 'Pre-Primary', salaryRange: '₹15,000–20,000 pm', annualPackage: '₹2,00,000–3,00,000', prices: { A: 15000, B: 20000, C: 25000 } },
];

const EDUCATION_PLAN_DETAILS: Record<EducationPlanKey, { name: string; tagline: string; features: string[]; popular?: boolean }> = {
  A: {
    name: 'Plan A',
    tagline: 'Essential — apply & screen',
    features: [
      'Apply to unlimited education jobs',
      'Resume export + AI ATS score',
      'CV-Screening + Written Test rounds',
      'Email support',
    ],
  },
  B: {
    name: 'Plan B',
    tagline: 'Most chosen — interview ready',
    popular: true,
    features: [
      'Everything in Plan A',
      'Demo + Viva / Segment Awareness round',
      'Core Team / Academic & Admin round',
      'Detailed AI feedback report',
    ],
  },
  C: {
    name: 'Plan C',
    tagline: 'Premium — full pipeline rehearsal',
    features: [
      'Everything in Plan B',
      'Panel + Management rounds (Band 1)',
      'HR-Round + On-Boarding rehearsal',
      'Priority support & featured profile',
    ],
  },
};

// Tier × deliverables matrix (mirrors invite email)
const TIER_MATRIX: { label: string; rows: { round: string; starter: string; basic: string; pro: string; premium: string }[] } = {
  label: 'What you unlock at every round',
  rows: [
    { round: 'Apply to jobs', starter: '✓', basic: '✓', pro: '✓', premium: '✓' },
    { round: 'Resume export', starter: '1×', basic: '1×', pro: '2×', premium: 'Unlimited' },
    { round: 'ATS score check', starter: '✓', basic: '✓', pro: '✓', premium: '✓' },
    { round: 'Mock interviews', starter: '—', basic: '1×', pro: '2×', premium: '5× (full pipeline)' },
    { round: 'Aptitude / Screening', starter: '—', basic: '✓', pro: '✓', premium: '✓' },
    { round: 'Technical Deep-Dive', starter: '—', basic: '✓', pro: '✓', premium: '✓' },
    { round: 'HR Behavioral (video)', starter: '—', basic: '—', pro: '✓', premium: '✓' },
    { round: 'Final / Management Sim', starter: '—', basic: '—', pro: '—', premium: '✓' },
    { round: 'AI feedback depth', starter: '—', basic: 'Basic', pro: 'Detailed', premium: 'Full + roadmap' },
    { round: 'Featured profile boost', starter: '—', basic: '—', pro: '1×', premium: '3×' },
  ],
};

interface SuggestedJob {
  id: string;
  title: string;
  company: string;
  location?: string;
  salary?: string;
  type?: string;
  url: string;
  matchReason?: string;
}

const benefits = [
  {
    icon: Briefcase,
    title: 'Access to Top Jobs',
    description: 'Browse and apply for thousands of verified job opportunities from leading companies across industries.',
  },
  {
    icon: Sparkles,
    title: 'AI-Powered Job Matching',
    description: 'Our AI technology matches you with jobs that fit your skills, experience, and career preferences.',
  },
  {
    icon: Calendar,
    title: 'Easy Interview Scheduling',
    description: 'Get interview invitations and schedule them at your convenience with automated reminders.',
  },
  {
    icon: FileText,
    title: 'Resume Builder',
    description: 'Create professional resumes with our easy-to-use builder and templates.',
  },
  {
    icon: GraduationCap,
    title: 'Skill Development',
    description: 'Access learning resources and courses to enhance your skills and increase your employability.',
  },
  {
    icon: Award,
    title: 'Mock Interviews',
    description: 'Practice with AI-powered mock interviews to prepare and boost your confidence.',
  },
  {
    icon: Target,
    title: 'Career Guidance',
    description: 'Get personalized career advice and insights to help you make informed decisions.',
  },
  {
    icon: CheckCircle,
    title: 'Application Tracking',
    description: 'Track all your job applications in one place and never miss an opportunity.',
  },
];

const CandidateSignup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || "";
  const prefillEmail = searchParams.get("email") || "";
  const prefillName = searchParams.get("name") || "";

  // Wizard step lives in memory only — never persisted to localStorage/sessionStorage
  // so that browser-specific storage (Edge vs Chrome) cannot resurrect stale steps.
  // The single source of truth for "is this user already onboarded?" is the backend
  // session returned by Supabase auth.
  const [currentStep, setCurrentStep] = useState<WizardStep>('signup');
  const [stepTourKey, setStepTourKey] = useState(0);
  const isFirstStepRef = useRef(true);

  // When user clicks Continue and lands on a new step, fire a one-step tour
  useEffect(() => {
    if (isFirstStepRef.current) {
      isFirstStepRef.current = false;
      return;
    }
    setStepTourKey((k) => k + 1);
  }, [currentStep]);

  const stepTourSteps: TourStep[] = useMemo(() => {
    const map: Record<WizardStep, { title: string; description: string }> = {
      signup: {
        title: "Create Your Account",
        description: "Fill in your name, email, mobile and password. Errors highlight inline.",
      },
      resume: {
        title: "AI Resume Scan",
        description: "Upload your resume (PDF/DOC). Our AI parses skills, experience and education automatically.",
      },
      benefits: {
        title: "Your Benefits",
        description: "Review what you unlock as a Gradia candidate, then click Continue to proceed.",
      },
      agreement: {
        title: "Candidate Agreement",
        description: "Read the agreement carefully. Tick the checkbox and click Continue when ready.",
      },
      terms: {
        title: "Terms & Conditions",
        description: "Scroll all the way down to enable the checkbox, then accept and continue.",
      },
      plan: {
        title: "Choose Your Plan",
        description: "Select a plan that fits your goals. You can also unlock individual features later.",
      },
    };
    const detail = map[currentStep];
    return [
      {
        selector: `[data-step="${currentStep}"]`,
        title: detail.title,
        description: detail.description,
        placement: "top",
      },
    ];
  }, [currentStep]);


  // Track if user just signed up in THIS tab session (to allow wizard flow to complete
  // without the auth-listener bouncing them to dashboard mid-flow).
  const [justSignedUp, setJustSignedUp] = useState(false);
  const justSignedUpRef = useRef(false);

  // One-shot purge of any stale onboarding-related keys left over from previous flows
  // (the legacy wallet activation step persisted state that caused Edge vs Chrome drift).
  useEffect(() => {
    try {
      STALE_STORAGE_KEYS.forEach((k) => {
        window.localStorage.removeItem(k);
        window.sessionStorage.removeItem(k);
      });
    } catch { /* storage may be blocked in some browsers — ignore */ }
  }, []);

  // Disable HTTP/browser caching for this route so every navigation re-evaluates
  // the auth/onboarding state from the backend instead of a cached HTML snapshot.
  useEffect(() => {
    const metas: HTMLMetaElement[] = [];
    const add = (httpEquiv: string, content: string) => {
      const m = document.createElement('meta');
      m.httpEquiv = httpEquiv;
      m.content = content;
      document.head.appendChild(m);
      metas.push(m);
    };
    add('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    add('Pragma', 'no-cache');
    add('Expires', '0');
    return () => { metas.forEach((m) => m.remove()); };
  }, []);

  // Form state (prefilled from invite link if present)
  const [fullName, setFullName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [industryCategory, setIndustryCategory] = useState("");
  const [primarySubject, setPrimarySubject] = useState("");
  const [segment, setSegment] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  // Bumped on every submit so the ARIA live announcer re-fires even when the
  // user resubmits with the same unresolved errors.
  const [submitCount, setSubmitCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Agreement state
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  
  // Terms state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsScrolledToEnd, setTermsScrolledToEnd] = useState(false);
  const termsScrollRef = useRef<HTMLDivElement>(null);
  
  // Retry error state
  const [retryError, setRetryError] = useState<string | null>(null);

  // Verification email resend cooldown is owned by the shared hook so the
  // ticker, rate-limit detection, and toast copy match every other auth
  // screen exactly. We only consume `applyExternalError` here because the
  // candidate signup arms the cooldown from a *signup* error (not a resend
  // call) — the helper guarantees we never start a timer for a non-rate-
  // limit failure (validation, network, unknown).
  const {
    resendCooldown,
    applyExternalError,
  } = useResendConfirmation({ flow: "candidate-signup" });

  // Resume step state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeParsing, setResumeParsing] = useState(false);
  const [resumeParsed, setResumeParsed] = useState<any | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [suggestedJobs, setSuggestedJobs] = useState<SuggestedJob[]>([]);

  // Plan / payment step state
  const [selectedPlanIdx, setSelectedPlanIdx] = useState<number>(1); // default Plan B (popular)
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [paying, setPaying] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [selectedAddons, setSelectedAddons] = useState<UnlockFeature[]>([]);
  // Detailed service add-ons (from pricing sheet). Each item has 3 tier prices; user picks one tier per item.
  const [selectedServiceTiers, setSelectedServiceTiers] = useState<Record<string, 0 | 1 | 2>>({});
  const [selectedCandidatePlan, setSelectedCandidatePlan] = useState<CandidatePlan>("free");
  const [includeSkilloryVoucher, setIncludeSkilloryVoucher] = useState(false);

  useEffect(() => {
    if ((window as any).Razorpay) { setRazorpayLoaded(true); return; }
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) { existing.addEventListener('load', () => setRazorpayLoaded(true)); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => setRazorpayLoaded(true);
    document.body.appendChild(s);
  }, []);

  const normalizedIndustryCategory = industryCategory.trim().toLowerCase();
  const matchesIndustryCategory = (...categories: string[]) =>
    categories.some((category) => normalizedIndustryCategory === category.trim().toLowerCase());

  // Backend-driven gating: once the AuthContext has finished loading the session,
  // route strictly based on the verified backend state.
  //   - Not authenticated  → stay on signup form (Step 1).
  //   - Authenticated AND not mid-wizard in this tab → go to dashboard.
  //   - Authenticated AND just signed up here → let the in-memory wizard continue.
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;
    if (justSignedUp || justSignedUpRef.current) return;
    if (currentStep !== 'signup') return;
    navigate('/candidate/dashboard', { replace: true });
  }, [authLoading, isAuthenticated, justSignedUp, currentStep, navigate]);

  // Scroll to top whenever the wizard advances to a new step.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [currentStep]);

  // (Resend cooldown ticker is owned by `useResendConfirmation`.)


  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (!/^[a-zA-Z\s]+$/.test(fullName.trim())) {
      newErrors.fullName = "Name should only contain letters";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^[6-9]\d{9}$/.test(mobile)) {
      newErrors.mobile = "Please enter a valid 10-digit mobile number";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Bump first so the announcer re-runs even if validation errors are
    // unchanged from the previous attempt.
    setSubmitCount((n) => n + 1);

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setRetryError(null);
    
    try {
      const isNetErr = (msg?: string) =>
        msg?.includes("Failed to fetch") || msg?.includes("NetworkError") || msg?.includes("TypeError") || msg?.includes("timed out");

      let signupData: { userId?: string; error?: string } | null = null;
      let signupError: any = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const signupPromise = supabase.functions.invoke('candidate-signup', {
            body: {
              email,
              password,
              fullName,
              mobile,
              industryCategory,
              primarySubject,
              segment,
              referralCode,
            },
          });
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Request timed out.")), 30000)
          );
          const result = await Promise.race([signupPromise, timeoutPromise]);
          signupData = result.data;
          signupError = result.error;
          // Try to extract the JSON error body from FunctionsHttpError
          if (signupError && (signupError as any).context?.json) {
            try {
              const body = await (signupError as any).context.json();
              if (body?.error) {
                signupData = { ...(signupData || {}), error: body.error };
              }
            } catch { /* ignore */ }
          }
          if (!signupError || !isNetErr(signupError.message)) break;
        } catch (err: any) {
          signupError = err;
          if (!isNetErr(err.message) || attempt >= 2) break;
        }

        if (attempt < 2) await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      }

      const signupMessage = signupData?.error || signupError?.message || '';
      // Detect Supabase email-send rate limit. Status 429 / "over_email_send_rate_limit"
      // can also surface here when the upstream confirmation email throttles.
      const isRateLimit = (msg?: string) =>
        !!msg && (
          msg.toLowerCase().includes("for security purposes") ||
          msg.toLowerCase().includes("rate limit") ||
          msg.toLowerCase().includes("only request this after") ||
          msg.toLowerCase().includes("over_email_send_rate")
        );
      // Pull the retry-after seconds out of Supabase's error message; falls
      // back to 60s. Capped at 10 min so a malformed value can't lock the UI.
      const getRetryAfterSeconds = (msg?: string): number => {
        const m = msg || '';
        const match =
          m.match(/after\s+(\d+)\s*seconds?/i) ||
          m.match(/in\s+(\d+)\s*seconds?/i) ||
          m.match(/(\d+)\s*seconds?/i);
        if (match) {
          const n = parseInt(match[1], 10);
          if (!Number.isNaN(n) && n > 0) return Math.min(n, 600);
        }
        return 60;
      };
      const formatRetryWindow = (seconds: number) => {
        if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
        const mins = Math.ceil(seconds / 60);
        return `${mins} minute${mins === 1 ? "" : "s"}`;
      };

      if (signupError || !signupData?.userId) {
        if (signupMessage.toLowerCase().includes("already registered") || signupMessage.toLowerCase().includes("already been registered")) {
          setErrors({ email: "This email is already registered. Please login instead." });
        } else if (isRateLimit(signupMessage)) {
          const retryAfter = getRetryAfterSeconds(signupMessage);
          const friendly = `Too many signup attempts for this email. Please try again in ${formatRetryWindow(retryAfter)}.`;
          console.warn("[candidate-signup] rate limit triggered", { email, retryAfter, raw: signupMessage });
          setRetryError(friendly);
          // Arm the resend cooldown via the shared hook so the verification
          // resend CTA respects the same upstream window. The hook's
          // `applyExternalError` only arms the timer for genuine rate-limit
          // errors — non-throttling failures are a no-op.
          applyExternalError({ status: 429, message: signupMessage });
          toast({
            title: "Please wait a moment",
            description: friendly,
            variant: "destructive",
          });
        } else if (isNetErr(signupMessage)) {
          setRetryError("Network issue detected. Please check your internet connection and try again.");
          toast({
            title: "Connection Error",
            description: "Unable to connect to the server. Please check your internet and try again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Signup Failed",
            description: signupMessage || "Could not create account. Please try again.",
            variant: "destructive",
          });
        }
        return;
      }

      // Mark wizard as in-progress BEFORE signing in to avoid the auth-state-change redirect race
      justSignedUpRef.current = true;
      setJustSignedUp(true);
      setCurrentStep('resume');

      let signInError: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        signInError = error;
        if (!signInError) break;
        // Rate-limited: wait the suggested seconds (capped) and retry once
        if (isRateLimit(signInError.message)) {
          const match = signInError.message.match(/(\d+)\s*seconds?/i);
          const waitMs = Math.min((match ? parseInt(match[1], 10) : 15) + 1, 20) * 1000;
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, waitMs));
            continue;
          }
          break;
        }
        if (!isNetErr(signInError.message)) break;
        if (attempt < 2) await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
      }

      if (signInError) {
        toast({
          title: "Account created",
          description: isRateLimit(signInError.message)
            ? "Please log in to continue (security cooldown active)."
            : "Please login once to continue your onboarding.",
        });
        navigate('/candidate/login');
        return;
      }

      refreshProfile().catch(err => console.error("Profile refresh error:", err));
      supabase.functions.invoke('send-welcome-email', {
        body: { email, fullName, role: 'candidate' }
      }).catch(err => console.error("Welcome email failed:", err));

      toast({
        title: "Account Created!",
        description: "Continue your onboarding to unlock your dashboard.",
      });
    } catch (error: any) {
      const isNetworkError = error.name === "TypeError" || error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError") || error.message?.includes("timed out");
      if (isNetworkError) {
        setRetryError("Network issue detected. Please check your internet connection and try again.");
        toast({
          title: "Connection Error",
          description: "Unable to connect to the server. Please check your internet and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "An error occurred during signup",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAgreementContinue = async () => {
    if (!agreementAccepted) {
      toast({ title: 'Please accept the agreement', variant: 'destructive' });
      return;
    }

    setCurrentStep('terms');
  };

  const handleTermsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 20 && !termsScrolledToEnd) {
      setTermsScrolledToEnd(true);
    }
  };

  const handleTermsContinue = async () => {
    if (!termsScrolledToEnd) {
      toast({ title: 'Please scroll to the end of the terms', variant: 'destructive' });
      return;
    }
    if (!termsAccepted) {
      toast({ title: 'Please accept the terms', variant: 'destructive' });
      return;
    }

    // Confirm session, then proceed to plan selection
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        toast({
          title: 'Session expired',
          description: 'Please log in to continue.',
        });
        navigate('/candidate/login', { replace: true });
        return;
      }
      await refreshProfile();
      setCurrentStep('plan');
    } catch (err: any) {
      console.error('Final onboarding step failed:', err);
      toast({
        title: 'Could not continue',
        description: err?.message || 'Please log in to continue.',
        variant: 'destructive',
      });
      navigate('/candidate/login', { replace: true });
    }
  };

  const goBack = () => {
    const stepOrder: WizardStep[] = ['signup', 'resume', 'benefits', 'agreement', 'terms', 'plan'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex <= 0) return;
    let prev = stepOrder[currentIndex - 1];
    // Once the account exists (user is authenticated), going back to the
    // 'signup' step would trigger the auth-gating effect and bounce the
    // user into the dashboard, skipping the plan/payment step.
    // Skip the signup step in that case so Back stays inside the wizard.
    if (prev === 'signup' && (isAuthenticated || justSignedUp || justSignedUpRef.current)) {
      if (currentIndex - 2 >= 0) {
        prev = stepOrder[currentIndex - 2];
      } else {
        return;
      }
    }
    setCurrentStep(prev);
  };

  // (Wallet activation step removed — onboarding finishes after Terms & Conditions.)

  // Resume scan: upload, AI parse, save to profile + related tables
  const handleResumeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const allowed = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'];
    if (!allowed.some(ext => f.name.toLowerCase().endsWith(ext))) {
      toast({ title: 'Invalid file', description: 'Upload PDF, Word, or image file', variant: 'destructive' });
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 20MB allowed', variant: 'destructive' });
      return;
    }
    setResumeFile(f);
    setResumeParsed(null);
    // Auto-trigger AI scan immediately after upload
    setTimeout(() => { handleResumeScan(f); }, 0);
  };

  const fetchSuggestedJobs = async (skills: string[], preferredRole: string, location: string) => {
    const candSkills = skills.map((s) => s.toLowerCase());
    const role = (preferredRole || '').toLowerCase();
    const loc = (location || '').toLowerCase().split(',')[0]?.trim() || '';

    const score = (job: { title: string; skills?: string[] | null; description?: string | null; location?: string | null }) => {
      const t = (job.title || '').toLowerCase();
      const d = (job.description || '').toLowerCase();
      const js = (job.skills || []).map((s) => s.toLowerCase());
      let s = 0;
      const reasons: string[] = [];
      if (role && (t.includes(role) || role.split(/\s+/).some((w) => w.length > 3 && t.includes(w)))) {
        s += 40;
        reasons.push('role match');
      }
      const overlap = candSkills.filter((sk) => js.includes(sk) || d.includes(sk));
      if (overlap.length) {
        s += Math.min(40, overlap.length * 8);
        reasons.push(`${overlap.length} skill${overlap.length > 1 ? 's' : ''} match`);
      }
      if (loc && job.location && job.location.toLowerCase().includes(loc)) {
        s += 20;
        reasons.push('location match');
      }
      return { score: s, reason: reasons.join(' · ') || 'general fit' };
    };

    const matches: SuggestedJob[] = [];

    const [{ data: internalJobs }, { data: externalJobs }] = await Promise.all([
      supabase.from('jobs').select('id, job_title, employer_id, location, salary_range, job_type, description, skills, status').eq('status', 'active').limit(120),
      supabase.from('external_jobs').select('id, job_title, company_name, location, salary_range, job_type, description, skills, apply_url, is_active').eq('is_active', true).limit(120),
    ]);

    const employerIds = [...new Set((internalJobs || []).map((j: any) => j.employer_id).filter(Boolean))];
    const employerMap = new Map<string, string>();
    if (employerIds.length) {
      const { data: emps } = await supabase.from('employer_registrations').select('employer_id, company_name').in('employer_id', employerIds);
      (emps || []).forEach((e: any) => employerMap.set(e.employer_id, e.company_name));
    }

    for (const j of internalJobs || []) {
      const r = score({ title: (j as any).job_title, skills: (j as any).skills, description: (j as any).description, location: (j as any).location });
      if (r.score > 0) {
        matches.push({
          id: (j as any).id,
          title: (j as any).job_title,
          company: employerMap.get((j as any).employer_id) || 'Verified Employer',
          location: (j as any).location || undefined,
          salary: (j as any).salary_range || undefined,
          type: (j as any).job_type || undefined,
          url: `/jobs/${(j as any).id}`,
          matchReason: r.reason,
        });
      }
    }
    for (const j of externalJobs || []) {
      const r = score({ title: (j as any).job_title, skills: (j as any).skills, description: (j as any).description, location: (j as any).location });
      if (r.score > 0) {
        matches.push({
          id: (j as any).id,
          title: (j as any).job_title,
          company: (j as any).company_name,
          location: (j as any).location || undefined,
          salary: (j as any).salary_range || undefined,
          type: (j as any).job_type || undefined,
          url: (j as any).apply_url,
          matchReason: r.reason,
        });
      }
    }

    matches.sort((a, b) => 0); // already roughly ordered by insert order; keep top 6
    setSuggestedJobs(matches.slice(0, 6));
  };

  const handleResumeScan = async (fileOverride?: File) => {
    const fileToScan = fileOverride || resumeFile;
    if (!fileToScan) {
      toast({ title: 'Please upload a resume first', variant: 'destructive' });
      return;
    }
    setResumeParsing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');
      const userId = session.user.id;

      // 1. Upload resume to storage
      const ext = fileToScan.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('resumes').upload(filePath, fileToScan, { upsert: true });
      if (upErr) console.warn('Resume upload error:', upErr);
      const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(filePath);
      const resumeUrl = urlData?.publicUrl || null;

      // 2. AI parse via edge function
      const formData = new FormData();
      formData.append('file', fileToScan);
      const parseResp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-resume`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );
      if (!parseResp.ok) {
        const errText = await parseResp.text();
        throw new Error(errText || 'Failed to parse resume');
      }
      const parsed = await parseResp.json();

      // 3. Update profile with extracted info (only fill empty fields)
      const profileUpdate: Record<string, any> = { resume_url: resumeUrl };
      if (parsed.full_name && !fullName) profileUpdate.full_name = parsed.full_name;
      if (parsed.mobile && !mobile) profileUpdate.mobile = String(parsed.mobile).replace(/\D/g, '').slice(-10);
      if (parsed.location) profileUpdate.location = parsed.location;
      if (parsed.current_state) profileUpdate.current_state = parsed.current_state;
      if (parsed.current_district) profileUpdate.current_district = parsed.current_district;
      if (parsed.linkedin) profileUpdate.linkedin = parsed.linkedin;
      if (parsed.website) profileUpdate.website = parsed.website;
      if (parsed.date_of_birth) profileUpdate.date_of_birth = parsed.date_of_birth;
      if (parsed.gender) profileUpdate.gender = parsed.gender;
      if (Array.isArray(parsed.skills) && parsed.skills.length) profileUpdate.skills = parsed.skills;
      if (Array.isArray(parsed.languages) && parsed.languages.length) profileUpdate.languages = parsed.languages;
      if (parsed.highest_qualification) profileUpdate.highest_qualification = parsed.highest_qualification;
      if (parsed.experience_level) profileUpdate.experience_level = parsed.experience_level;
      if (parsed.preferred_role) profileUpdate.preferred_role = parsed.preferred_role;

      await supabase.from('profiles').update(profileUpdate).eq('id', userId);

      // 4. Insert education rows
      if (Array.isArray(parsed.education) && parsed.education.length) {
        const eduRows = parsed.education
          .filter((e: any) => e?.education_level)
          .map((e: any, idx: number) => ({
            user_id: userId,
            education_level: String(e.education_level).slice(0, 100),
            school_college_name: e.school_college_name || null,
            specialization: e.specialization || null,
            board_university: e.board_university || null,
            year_of_passing: e.year_of_passing ? Number(e.year_of_passing) : null,
            percentage_marks: e.percentage_marks ? Number(e.percentage_marks) : null,
            display_order: idx,
          }));
        if (eduRows.length) {
          await supabase.from('educational_qualifications').insert(eduRows);
        }
      }

      setResumeParsed(parsed);
      // Fetch suggested jobs based on parsed skills (in background)
      fetchSuggestedJobs(
        Array.isArray(parsed.skills) ? parsed.skills : [],
        parsed.preferred_role || parsed.last_designation || '',
        parsed.location || ''
      ).catch((e) => console.warn('Suggested jobs fetch failed:', e));
      toast({
        title: '✨ Resume scanned successfully!',
        description: 'Your profile has been auto-filled with extracted info.',
      });
    } catch (err: any) {
      console.error('Resume scan error:', err);
      toast({
        title: 'Could not scan resume',
        description: err.message || 'Please try again or skip this step',
        variant: 'destructive',
      });
    } finally {
      setResumeParsing(false);
    }
  };

  const getCurrentStepIndex = () => {
    return wizardSteps.findIndex(s => s.id === currentStep);
  };

  // Progress indicator component
  const ProgressIndicator = () => {
    const currentIndex = getCurrentStepIndex();
    const displaySteps = wizardSteps.slice(1); // Skip 'signup' for display after signup

    if (currentStep === 'signup') return null;

    return (
      <div className="w-full max-w-3xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          {displaySteps.map((step, index) => {
            const actualIndex = index;
            const stepCurrentIndex = currentIndex - 1;
            const isCompleted = actualIndex < stepCurrentIndex;
            const isCurrent = actualIndex === stepCurrentIndex;
            
            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-primary text-primary-foreground'
                        : isCurrent
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </div>
                  <span
                    className={`mt-2 text-xs font-medium text-center ${
                      isCurrent ? 'text-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < displaySteps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 -mt-8 transition-colors ${
                      isCompleted ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render signup form step
  const renderSignupStep = () => (
    <div data-step="signup" className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-start">
      {/* Left Side - Benefits */}
      <div className="hidden md:block space-y-6 animate-fade-in sticky top-8">
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-accent transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        
        <div>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Launch Your Career Today
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join thousands of candidates who found their dream jobs with Gradia
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Briefcase className="h-6 w-6 text-accent" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Top Job Opportunities</h3>
              <p className="text-sm text-muted-foreground">
                Access verified jobs from leading companies across industries
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-accent" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Smart Job Matching</h3>
              <p className="text-sm text-muted-foreground">
                AI-powered matching to find jobs that fit your skills and preferences
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <BarChart className="h-6 w-6 text-accent" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Track Applications</h3>
              <p className="text-sm text-muted-foreground">
                Monitor all your applications and interview schedules in one place
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                <Shield className="h-6 w-6 text-accent" />
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">Verified Employers</h3>
              <p className="text-sm text-muted-foreground">
                Apply with confidence to companies verified by Gradia
              </p>
            </div>
          </div>
        </div>

        {/* Onboarding Steps */}
        <div className="mt-8 p-4 bg-card/50 rounded-lg border border-border">
          <h4 className="font-medium text-foreground mb-3">Your Journey to Success</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">1</div>
              <span className="font-medium">Create Account</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">2</div>
              <span>View Benefits</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">3</div>
              <span>Accept Agreement</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center text-xs">4</div>
              <span>Accept Terms & Conditions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="bg-card rounded-lg shadow-large p-8 animate-scale-in">
        <Link 
          to="/" 
          className="md:hidden inline-flex items-center text-sm text-muted-foreground hover:text-accent transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>

        <div className="flex justify-center mb-6">
          <img 
            src={gradiaLogo} 
            alt="Gradia - Your Next Step" 
            className="h-15 w-auto object-contain"
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create Candidate Account
          </h1>
          <p className="text-muted-foreground">
            Join Gradia to find your dream job
          </p>
        </div>

        <form onSubmit={handleSignupSubmit} className="space-y-5" noValidate>
          {/* Aggregated, polite live region. Announces every validation error
              after each submit attempt — re-announces on repeat submits via
              the bumped submitCount. */}
          <FormErrorAnnouncer
            id="candidate-signup-form-errors"
            errors={errors}
            submitCount={submitCount}
          />

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name <span className="text-destructive">*</span></Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow letters and spaces
                if (value === '' || /^[a-zA-Z\s]*$/.test(value)) {
                  setFullName(value);
                  if (errors.fullName) setErrors({ ...errors, fullName: undefined });
                }
              }}
              aria-invalid={!!errors.fullName}
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
              className={errors.fullName ? "border-destructive" : ""}
            />
            {errors.fullName && <p id="fullName-error" className="text-sm text-destructive">{errors.fullName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) setErrors({ ...errors, email: undefined });
              }}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <p id="email-error" className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="mobile">Mobile Number <span className="text-destructive">*</span></Label>
            <Input
              id="mobile"
              type="tel"
              placeholder="10-digit mobile number"
              value={mobile}
              onChange={(e) => {
                setMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
                if (errors.mobile) setErrors({ ...errors, mobile: undefined });
              }}
              aria-invalid={!!errors.mobile}
              aria-describedby={errors.mobile ? "mobile-error" : undefined}
              className={errors.mobile ? "border-destructive" : ""}
            />
            {errors.mobile && <p id="mobile-error" className="text-sm text-destructive">{errors.mobile}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
            <PasswordInput
              id="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              className={errors.password ? "border-destructive" : ""}
            />
            <PasswordStrengthIndicator password={password} />
            {errors.password && <p id="password-error" className="text-sm text-destructive">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password <span className="text-destructive">*</span></Label>
            <PasswordInput
              id="confirmPassword"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
              }}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? "confirmPassword-error" : undefined}
              className={errors.confirmPassword ? "border-destructive" : ""}
            />
            {errors.confirmPassword && <p id="confirmPassword-error" className="text-sm text-destructive">{errors.confirmPassword}</p>}
          </div>

          {/* Industry Category */}
          <div className="space-y-2">
            <Label htmlFor="industryCategory">Industry Category <span className="text-destructive">*</span></Label>
            <Select
              key={`industry-category-${industryCategory || 'none'}`}
              value={industryCategory || undefined}
              onValueChange={(val) => {
                setIndustryCategory(val.trim());
                setPrimarySubject("");
                setSegment("");
              }}
            >
              <SelectTrigger id="industryCategory" className="h-10">
                <SelectValue placeholder="Select Industry Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Education">Education</SelectItem>
                <SelectItem value="IT Corporate">IT Corporate</SelectItem>
                <SelectItem value="Legal">Legal</SelectItem>
                <SelectItem value="Doctor">Doctor</SelectItem>
                <SelectItem value="Civil Service">Civil Service</SelectItem>
                <SelectItem value="Real Estate & Infrastructure">Real Estate & Infrastructure</SelectItem>
                <SelectItem value="Freelance / Independent Professionals">Freelance / Independent Professionals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category-specific fields */}
          {industryCategory ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" key={`industry-fields-${normalizedIndustryCategory || 'none'}`}>
              {matchesIndustryCategory("Education") && (
                <>
                  <div className="space-y-2">
                    <Label>Segment</Label>
                    <Select value={segment || undefined} onValueChange={setSegment}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Segment" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="School">School</SelectItem>
                        <SelectItem value="Pre-University / Junior College">Pre-University / Junior College</SelectItem>
                        <SelectItem value="College / University">College / University</SelectItem>
                        <SelectItem value="Coaching / Tuition Centre">Coaching / Tuition Centre</SelectItem>
                        <SelectItem value="Ed-Tech / Online">Ed-Tech / Online</SelectItem>
                        <SelectItem value="Administration">Administration</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Primary Subject</Label>
                    <Select value={primarySubject || undefined} onValueChange={setPrimarySubject}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Mathematics">Mathematics</SelectItem>
                        <SelectItem value="Physics">Physics</SelectItem>
                        <SelectItem value="Chemistry">Chemistry</SelectItem>
                        <SelectItem value="Biology">Biology</SelectItem>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Hindi">Hindi</SelectItem>
                        <SelectItem value="Social Studies">Social Studies</SelectItem>
                        <SelectItem value="Computer Science">Computer Science</SelectItem>
                        <SelectItem value="Commerce / Accountancy">Commerce / Accountancy</SelectItem>
                        <SelectItem value="Economics">Economics</SelectItem>
                        <SelectItem value="History">History</SelectItem>
                        <SelectItem value="Geography">Geography</SelectItem>
                        <SelectItem value="Political Science">Political Science</SelectItem>
                        <SelectItem value="Languages">Languages</SelectItem>
                        <SelectItem value="Arts & Crafts">Arts & Crafts</SelectItem>
                        <SelectItem value="Physical Education">Physical Education</SelectItem>
                        <SelectItem value="Administration">Administration</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {industryCategory === "IT Corporate" && (
                <>
                  <div className="space-y-2">
                    <Label>Skills / Domain</Label>
                    <Select value={primarySubject || undefined} onValueChange={(val) => {
                      setPrimarySubject(val);
                      setSegment("");
                    }}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Skill" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Software Engineer">Software Engineer</SelectItem>
                        <SelectItem value="Cybersecurity">Cybersecurity</SelectItem>
                        <SelectItem value="Data & Artificial Intelligence">Data & Artificial Intelligence</SelectItem>
                        <SelectItem value="Cloud & Infrastructure">Cloud & Infrastructure</SelectItem>
                        <SelectItem value="Quality Assurance & Testing">Quality Assurance & Testing</SelectItem>
                        <SelectItem value="Product & Project Management">Product & Project Management</SelectItem>
                        <SelectItem value="UI/UX & Design">UI/UX & Design</SelectItem>
                        <SelectItem value="Business & IT Consulting">Business & IT Consulting</SelectItem>
                        <SelectItem value="IT Support & Operations">IT Support & Operations</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    <Select value={segment || undefined} onValueChange={setSegment} key={`desig-${primarySubject}`}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Designation" /></SelectTrigger>
                      <SelectContent>
                        {(() => {
                          const pipelineMap: Record<string, string> = {
                            'Software Engineer': 'software_engineer',
                            'Cybersecurity': 'cybersecurity',
                            'Data & Artificial Intelligence': 'data_ai',
                            'Cloud & Infrastructure': 'cloud_infrastructure',
                            'Quality Assurance & Testing': 'qa_testing',
                            'Product & Project Management': 'product_project_management',
                            'UI/UX & Design': 'ui_ux_design',
                            'Business & IT Consulting': 'business_it_consulting',
                            'IT Support & Operations': 'it_support_operations',
                          };
                          const pipelineKey = pipelineMap[primarySubject] || '';
                          const roles = getRolesForPipeline('it_corporate', pipelineKey);
                          return roles.map((role) => (
                            <SelectItem key={role.value} value={role.label}>{role.label}</SelectItem>
                          ));
                        })()}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {industryCategory === "Legal" && (
                <>
                  <div className="space-y-2">
                    <Label>Specialization</Label>
                    <Select value={primarySubject || undefined} onValueChange={setPrimarySubject}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Specialization" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Corporate Law">Corporate Law</SelectItem>
                        <SelectItem value="Criminal Law">Criminal Law</SelectItem>
                        <SelectItem value="Civil Law">Civil Law</SelectItem>
                        <SelectItem value="Family Law">Family Law</SelectItem>
                        <SelectItem value="Intellectual Property">Intellectual Property</SelectItem>
                        <SelectItem value="Tax Law">Tax Law</SelectItem>
                        <SelectItem value="Labour Law">Labour Law</SelectItem>
                        <SelectItem value="Constitutional Law">Constitutional Law</SelectItem>
                        <SelectItem value="Real Estate Law">Real Estate Law</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    <Select value={segment || undefined} onValueChange={setSegment}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Designation" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Advocate">Advocate</SelectItem>
                        <SelectItem value="Senior Advocate">Senior Advocate</SelectItem>
                        <SelectItem value="Legal Advisor">Legal Advisor</SelectItem>
                        <SelectItem value="Corporate Counsel">Corporate Counsel</SelectItem>
                        <SelectItem value="Paralegal">Paralegal</SelectItem>
                        <SelectItem value="Judge">Judge</SelectItem>
                        <SelectItem value="Notary">Notary</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {industryCategory === "Doctor" && (
                <>
                  <div className="space-y-2">
                    <Label>Specialization</Label>
                    <Select value={primarySubject || undefined} onValueChange={setPrimarySubject}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Specialization" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="General Medicine">General Medicine</SelectItem>
                        <SelectItem value="Cardiology">Cardiology</SelectItem>
                        <SelectItem value="Orthopedics">Orthopedics</SelectItem>
                        <SelectItem value="Pediatrics">Pediatrics</SelectItem>
                        <SelectItem value="Dermatology">Dermatology</SelectItem>
                        <SelectItem value="Neurology">Neurology</SelectItem>
                        <SelectItem value="Gynecology">Gynecology</SelectItem>
                        <SelectItem value="Ophthalmology">Ophthalmology</SelectItem>
                        <SelectItem value="ENT">ENT</SelectItem>
                        <SelectItem value="Dentistry">Dentistry</SelectItem>
                        <SelectItem value="Psychiatry">Psychiatry</SelectItem>
                        <SelectItem value="Surgery">Surgery</SelectItem>
                        <SelectItem value="Ayurveda">Ayurveda</SelectItem>
                        <SelectItem value="Homeopathy">Homeopathy</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Qualification</Label>
                    <Select value={segment || undefined} onValueChange={setSegment}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Qualification" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MBBS">MBBS</SelectItem>
                        <SelectItem value="MD">MD</SelectItem>
                        <SelectItem value="MS">MS</SelectItem>
                        <SelectItem value="DM">DM</SelectItem>
                        <SelectItem value="BDS">BDS</SelectItem>
                        <SelectItem value="BAMS">BAMS</SelectItem>
                        <SelectItem value="BHMS">BHMS</SelectItem>
                        <SelectItem value="Nursing">Nursing</SelectItem>
                        <SelectItem value="Pharmacist">Pharmacist</SelectItem>
                        <SelectItem value="Lab Technician">Lab Technician</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {industryCategory === "Civil Service" && (
                <>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={primarySubject || undefined} onValueChange={setPrimarySubject}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Department" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IAS">IAS</SelectItem>
                        <SelectItem value="IPS">IPS</SelectItem>
                        <SelectItem value="IFS">IFS</SelectItem>
                        <SelectItem value="IRS">IRS</SelectItem>
                        <SelectItem value="State Civil Services">State Civil Services</SelectItem>
                        <SelectItem value="Public Administration">Public Administration</SelectItem>
                        <SelectItem value="Revenue">Revenue</SelectItem>
                        <SelectItem value="Education Department">Education Department</SelectItem>
                        <SelectItem value="Health Department">Health Department</SelectItem>
                        <SelectItem value="Police">Police</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    <Select value={segment || undefined} onValueChange={setSegment}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Designation" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Officer">Officer</SelectItem>
                        <SelectItem value="Clerk">Clerk</SelectItem>
                        <SelectItem value="Inspector">Inspector</SelectItem>
                        <SelectItem value="Commissioner">Commissioner</SelectItem>
                        <SelectItem value="Secretary">Secretary</SelectItem>
                        <SelectItem value="Director">Director</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {industryCategory === "Real Estate & Infrastructure" && (
                <>
                  <div className="space-y-2">
                    <Label>Specialization</Label>
                    <Select value={primarySubject || undefined} onValueChange={setPrimarySubject}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Specialization" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                        <SelectItem value="Architecture">Architecture</SelectItem>
                        <SelectItem value="Interior Design">Interior Design</SelectItem>
                        <SelectItem value="Construction Management">Construction Management</SelectItem>
                        <SelectItem value="Property Management">Property Management</SelectItem>
                        <SelectItem value="Urban Planning">Urban Planning</SelectItem>
                        <SelectItem value="Structural Engineering">Structural Engineering</SelectItem>
                        <SelectItem value="Real Estate Sales">Real Estate Sales</SelectItem>
                        <SelectItem value="Surveying">Surveying</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Designation</Label>
                    <Select value={segment || undefined} onValueChange={setSegment}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Designation" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Site Engineer">Site Engineer</SelectItem>
                        <SelectItem value="Project Manager">Project Manager</SelectItem>
                        <SelectItem value="Architect">Architect</SelectItem>
                        <SelectItem value="Contractor">Contractor</SelectItem>
                        <SelectItem value="Real Estate Agent">Real Estate Agent</SelectItem>
                        <SelectItem value="Quantity Surveyor">Quantity Surveyor</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {industryCategory === "Freelance / Independent Professionals" && (
                <>
                  <div className="space-y-2">
                    <Label>Domain</Label>
                    <Select value={primarySubject || undefined} onValueChange={setPrimarySubject}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Domain" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Content Writing">Content Writing</SelectItem>
                        <SelectItem value="Graphic Design">Graphic Design</SelectItem>
                        <SelectItem value="Web Development">Web Development</SelectItem>
                        <SelectItem value="Digital Marketing">Digital Marketing</SelectItem>
                        <SelectItem value="Photography">Photography</SelectItem>
                        <SelectItem value="Video Editing">Video Editing</SelectItem>
                        <SelectItem value="Consulting">Consulting</SelectItem>
                        <SelectItem value="Translation">Translation</SelectItem>
                        <SelectItem value="Accounting">Accounting</SelectItem>
                        <SelectItem value="Tutoring">Tutoring</SelectItem>
                        <SelectItem value="Event Management">Event Management</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Work Type</Label>
                    <Select value={segment || undefined} onValueChange={setSegment}>
                      <SelectTrigger className="h-10"><SelectValue placeholder="Select Work Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Remote">Remote</SelectItem>
                        <SelectItem value="On-site">On-site</SelectItem>
                        <SelectItem value="Hybrid">Hybrid</SelectItem>
                        <SelectItem value="Project Based">Project Based</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          ) : null}


          {retryError && (
            <div
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive"
            >
              {retryError}
              {resendCooldown > 0 && (
                <span className="sr-only"> You can retry in {resendCooldown} seconds.</span>
              )}
            </div>
          )}

          <Button type="submit" variant="cta" size="lg" className="w-full" disabled={isLoading} onClick={() => setRetryError(null)}>
            {isLoading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating Account...</>
            ) : retryError ? "Retry" : "Continue"}
          </Button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-card px-4 text-muted-foreground">
              Already have an account?
            </span>
          </div>
        </div>

        <div className="text-center">
          <Button variant="outline" size="lg" className="w-full" asChild>
            <Link to="/candidate/login">Login</Link>
          </Button>
        </div>
      </div>

      <div className="mt-6 text-center text-sm text-muted-foreground md:col-span-2">
        <p>
          Looking to hire?{" "}
          <Link to="/employer/signup" className="text-accent hover:underline font-medium">
            Sign up as an Employer
          </Link>
        </p>
      </div>
    </div>
  );

  // Render benefits step
  const renderBenefitsStep = () => (
    <div data-step="benefits" className="w-full max-w-4xl">
      <ProgressIndicator />
      <Card className="w-full p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={gradiaLogo} alt="Gradia" className="h-16 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Benefits for Candidates</h1>
          <p className="text-muted-foreground mt-2">
            Discover the advantages of joining Gradia Connect for your career journey.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border/50 hover:border-primary/30 transition-colors"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <benefit.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <Button variant="outline" onClick={goBack} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
          <Button onClick={() => setCurrentStep('agreement')} className="flex-1">
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );

  // Render agreement step
  const renderAgreementStep = () => (
    <div data-step="agreement" className="w-full max-w-4xl">
      <ProgressIndicator />
      <Card className="w-full p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={gradiaLogo} alt="Gradia" className="h-16 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Candidate Agreement</h1>
          <p className="text-muted-foreground mt-2">
            Please review and accept the following agreement to continue.
          </p>
        </div>

        <ScrollArea className="h-[300px] rounded-md border p-6 mb-6 bg-muted/30">
          <div className="prose prose-sm max-w-none">
            <h2 className="text-xl font-semibold mb-4">Candidate Service Agreement</h2>
            
            <h3 className="text-lg font-semibold mt-6 mb-3">1. Introduction</h3>
            <p className="text-muted-foreground mb-4">
              This Service Agreement is entered into between the Candidate and Gradia Connect platform for the provision of job placement services.
            </p>
            <h3 className="text-lg font-semibold mt-6 mb-3">2. Services Provided</h3>
            <p className="text-muted-foreground mb-4">
              Our platform provides comprehensive job search solutions including job listings, application management, resume building, and interview preparation tools.
            </p>
            <h3 className="text-lg font-semibold mt-6 mb-3">3. Candidate Responsibilities</h3>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>Provide accurate and truthful information in your profile and applications</li>
              <li>Maintain professional conduct in all interactions with employers</li>
              <li>Keep your profile and resume updated</li>
              <li>Respond to employer communications in a timely manner</li>
            </ul>
            <h3 className="text-lg font-semibold mt-6 mb-3">4. Platform Usage</h3>
            <p className="text-muted-foreground mb-4">
              The platform is provided free for candidates. We may offer premium features in the future for enhanced job search capabilities.
            </p>
            <p className="text-muted-foreground mt-8 italic">Last updated: January 2025</p>
          </div>
        </ScrollArea>

        <div className="flex items-start gap-3 mb-6 p-4 bg-muted/50 rounded-md">
          <Checkbox id="accept-agreement" checked={agreementAccepted} onCheckedChange={(checked) => setAgreementAccepted(checked as boolean)} />
          <label htmlFor="accept-agreement" className="text-sm leading-relaxed cursor-pointer">
            I have read and agree to the Candidate Agreement
          </label>
        </div>

        {retryError && (
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive"
          >
            {retryError}
            {resendCooldown > 0 && (
              <span className="sr-only"> You can retry in {resendCooldown} seconds.</span>
            )}
          </div>
        )}

        <div className="flex gap-4">
          <Button variant="outline" onClick={goBack} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
          <Button onClick={handleAgreementContinue} disabled={!agreementAccepted || isLoading} className="flex-1">
            {isLoading ? 'Processing...' : 'I Agree & Continue'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );

  // Render terms step
  const renderTermsStep = () => (
    <div data-step="terms" className="w-full max-w-4xl">
      <ProgressIndicator />
      <Card className="w-full p-8 shadow-lg">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img src={gradiaLogo} alt="Gradia" className="h-16 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Terms & Conditions</h1>
          <p className="text-muted-foreground mt-2">Please read and accept the terms & conditions to complete your registration.</p>
        </div>

        <div ref={termsScrollRef} className="h-[400px] rounded-md border p-6 mb-6 bg-muted/30 overflow-y-auto" onScroll={handleTermsScroll}>
          <div className="prose prose-sm max-w-none">
            <h2 className="text-xl font-semibold mb-4">Terms and Conditions of Use</h2>
            <h3 className="text-lg font-semibold mt-6 mb-3">1. Acceptance of Terms</h3>
            <p className="text-muted-foreground mb-4">By accessing this platform, you agree to these Terms and Conditions.</p>
            <h3 className="text-lg font-semibold mt-6 mb-3">2. Account Registration</h3>
            <p className="text-muted-foreground mb-4">You must provide accurate information during registration and keep your account secure.</p>
            <h3 className="text-lg font-semibold mt-6 mb-3">3. Use of Platform</h3>
            <ul className="list-disc pl-6 text-muted-foreground mb-4 space-y-2">
              <li>No false or misleading information in profiles or applications</li>
              <li>No harassment of employers or other users</li>
              <li>No unauthorized access attempts</li>
              <li>No spamming or mass application submissions</li>
            </ul>
            <h3 className="text-lg font-semibold mt-6 mb-3">4. Privacy and Data</h3>
            <p className="text-muted-foreground mb-4">Your data is processed as per our Privacy Policy. Your profile may be visible to employers.</p>
            <h3 className="text-lg font-semibold mt-6 mb-3">5. Service Availability</h3>
            <p className="text-muted-foreground mb-4">We strive to maintain platform availability but do not guarantee uninterrupted access.</p>
            <h3 className="text-lg font-semibold mt-6 mb-3">6. Limitation of Liability</h3>
            <p className="text-muted-foreground mb-4">We are not responsible for employment outcomes or employer actions.</p>
            <h3 className="text-lg font-semibold mt-6 mb-3">7. Termination</h3>
            <p className="text-muted-foreground mb-4">We may terminate your account if you breach these Terms.</p>
            <p className="text-muted-foreground mt-8 italic">Last updated: January 2025</p>
          </div>
        </div>

        {!termsScrolledToEnd && (
          <div className="text-sm text-amber-600 mb-4 flex items-center gap-2">
            <span>⚠️</span><span>Please scroll to the end to enable the checkbox</span>
          </div>
        )}

        <div className="flex items-start gap-3 mb-6 p-4 bg-muted/50 rounded-md">
          <Checkbox id="accept-terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(checked as boolean)} disabled={!termsScrolledToEnd} />
          <label htmlFor="accept-terms" className={`text-sm cursor-pointer ${!termsScrolledToEnd ? 'text-muted-foreground' : ''}`}>
            I have read and accept the Terms & Conditions
          </label>
        </div>

        {retryError && (
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive"
          >
            {retryError}
            {resendCooldown > 0 && (
              <span className="sr-only"> You can retry in {resendCooldown} seconds.</span>
            )}
          </div>
        )}

        <div className="flex gap-4">
          <Button variant="outline" onClick={goBack} className="flex-1">
            <ArrowLeft className="mr-2 h-4 w-4" />Back
          </Button>
          <Button onClick={handleTermsContinue} disabled={!termsAccepted || isLoading || !termsScrolledToEnd} className="flex-1">
            {isLoading ? 'Processing...' : 'Accept & Get Started'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );

  // Render resume scan step
  const renderResumeStep = () => (
    <div data-step="resume" className="w-full max-w-3xl">
      <ProgressIndicator />
      <Card className="w-full p-8 shadow-lg">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img src={gradiaLogo} alt="Gradia" className="h-14 w-auto object-contain" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5" /> AI-Powered
          </div>
          <h1 className="text-3xl font-bold text-foreground">Upload Your Resume</h1>
          <p className="text-muted-foreground mt-2">
            Let our AI scan your resume and auto-fill your profile in seconds.
          </p>
        </div>

        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center mb-6 hover:border-accent/50 transition-colors">
          <input
            ref={resumeInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={handleResumeFileChange}
          />
          {!resumeFile ? (
            <>
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-foreground mb-1 font-medium">Drag & drop or click to upload</p>
              <p className="text-xs text-muted-foreground mb-4">PDF, DOC, DOCX, PNG, JPG (max 20MB)</p>
              <Button type="button" variant="outline" onClick={() => resumeInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Choose File
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <FileText className="h-10 w-10 mx-auto text-accent" />
              <p className="text-sm font-medium text-foreground truncate">{resumeFile.name}</p>
              <p className="text-xs text-muted-foreground">{(resumeFile.size / 1024).toFixed(1)} KB</p>
              <div className="flex justify-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => resumeInputRef.current?.click()} disabled={resumeParsing}>
                  Change
                </Button>
                {resumeParsing && (
                  <div className="inline-flex items-center text-sm text-accent">
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning with AI...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {resumeParsed && (
          <div className="mb-6 p-4 rounded-lg bg-accent/10 border border-accent/30">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-foreground mb-1">Profile auto-filled!</p>
                <ul className="text-muted-foreground text-xs space-y-0.5">
                  {resumeParsed.full_name && <li>✓ Name: {resumeParsed.full_name}</li>}
                  {Array.isArray(resumeParsed.skills) && resumeParsed.skills.length > 0 && (
                    <li>✓ {resumeParsed.skills.length} skills extracted</li>
                  )}
                  {Array.isArray(resumeParsed.education) && resumeParsed.education.length > 0 && (
                    <li>✓ {resumeParsed.education.length} education record(s) added</li>
                  )}
                  {Array.isArray(resumeParsed.experience) && resumeParsed.experience.length > 0 && (
                    <li>✓ {resumeParsed.experience.length} work experience(s) detected</li>
                  )}
                  {resumeParsed.experience_level && <li>✓ Experience level: {resumeParsed.experience_level}</li>}
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  You can edit and complete details later in your profile.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <Button onClick={() => setCurrentStep('benefits')} className="w-full" disabled={resumeParsing || (!!resumeFile && !resumeParsed)}>
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );

  // ---------- Candidate plan step ----------
  const selectedPlan = CANDIDATE_PLANS[selectedCandidatePlan];
  const selectedFreelancerCombo = CANDIDATE_FREELANCER_COMBOS[selectedCandidatePlan as keyof typeof CANDIDATE_FREELANCER_COMBOS];
  const selectedFreelancerPlan = selectedFreelancerCombo ? FREELANCER_PLANS[selectedFreelancerCombo.freelancerPlanId] : null;
  const REGISTRATION_FEE = selectedPlan.priceInr;
  const addonsTotal = selectedAddons.reduce((s, id) => s + FEATURE_UNLOCKS[id].price, 0);

  // Detailed service add-ons (from pricing reference sheet)
  const SERVICE_ADDONS: { id: string; label: string; group?: string; tiers: [number, number, number]; perks: string[] }[] = [
    { id: 'cv_screening', label: 'CV Screening', tiers: [3000, 4000, 5000], perks: ['Expert CV review & ATS check', 'Keyword & formatting fixes', 'Actionable improvement report'] },
    { id: 'cv_resume_builder', label: 'CV / Resume Builder', tiers: [5000, 6000, 7000], perks: ['ATS-friendly templates', 'Unlimited edits & downloads', 'Role-specific resume tips'] },
    { id: 'suitable_jobs', label: 'Suitable Jobs', tiers: [3000, 4000, 5000], perks: ['AI-matched job feed', 'Profile-based filtering', 'Daily refreshed openings'] },
    { id: 'ai_jobs_apply', label: 'AI - JOBs Apply', tiers: [5000, 6000, 7000], perks: ['Auto-apply to multiple jobs', 'Tailored cover notes', 'Hands-free job hunting'] },
    { id: 'mock_interviews', label: 'Mock Interviews', tiers: [3000, 4000, 4000], perks: ['Realistic AI interviews', 'Detailed performance feedback', 'Score & improvement reports'] },
    { id: 'pipeline_cv_discussion', label: 'CV Discussions', group: 'Interview Pipeline', tiers: [1000, 1500, 2000], perks: ['Walk-through of your CV', 'Strength & gap analysis', 'Interview-ready talking points'] },
    { id: 'pipeline_written_test', label: 'Written Test', group: 'Interview Pipeline', tiers: [2000, 2000, 2500], perks: ['Job-relevant test prep', 'Practice papers + answers', 'Performance scoring'] },
    { id: 'pipeline_stage_1', label: 'Stage-1', group: 'Interview Pipeline', tiers: [2000, 2000, 2500], perks: ['Screening round prep', 'Common Q&A drills', 'Live tracking & feedback'] },
    { id: 'pipeline_stage_2', label: 'Stage-2', group: 'Interview Pipeline', tiers: [1500, 2000, 2000], perks: ['Technical round prep', 'Concept revision support', 'Mock evaluation'] },
    { id: 'pipeline_stage_3', label: 'Stage-3', group: 'Interview Pipeline', tiers: [1500, 2000, 2500], perks: ['Manager round simulation', 'Behavioural Q&A coaching', 'Feedback & next steps'] },
    { id: 'pipeline_stage_4', label: 'Stage-4', group: 'Interview Pipeline', tiers: [2000, 2500, 3000], perks: ['Final round preparation', 'Negotiation guidance', 'Offer-stage support'] },
    { id: 'consolidated_feedback', label: 'Consolidated Feedback', tiers: [5000, 6000, 7000], perks: ['Full pipeline performance review', 'Strengths & weaknesses summary', 'Personalised next-step plan'] },
  ];
  const TIER_LABELS = ['Starter', 'Advance', 'Pro'] as const;

  const servicesTotal = Object.entries(selectedServiceTiers).reduce((sum, [id, tier]) => {
    const item = SERVICE_ADDONS.find((s) => s.id === id);
    return item ? sum + item.tiers[tier] : sum;
  }, 0);

  const voucherTotal = includeSkilloryVoucher ? SKILLORY_VOUCHER_PRICE : 0;
  const grandTotal = REGISTRATION_FEE + addonsTotal + servicesTotal + voucherTotal;
  const toggleAddon = (id: UnlockFeature) =>
    setSelectedAddons((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleServiceTier = (id: string, tier: 0 | 1 | 2) =>
    setSelectedServiceTiers((prev) => {
      const next = { ...prev };
      if (next[id] === tier) delete next[id];
      else next[id] = tier;
      return next;
    });

  const handlePayPlan = async () => {
    if (grandTotal <= 0) {
      toast({ title: 'Free plan activated', description: 'Your candidate account is ready.' });
      await refreshProfile();
      navigate('/candidate/dashboard', { replace: true });
      return;
    }
    if (!razorpayLoaded) {
      toast({ title: 'Payment gateway loading…', description: 'Please try again in a moment.' });
      return;
    }
    setPaying(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) {
        toast({ title: 'Session expired', description: 'Please sign in again.', variant: 'destructive' });
        navigate('/candidate/login', { replace: true });
        return;
      }
      const user = sessionData.session.user;
      const planSlug = selectedCandidatePlan;
      const addonLabels = selectedAddons.map((id) => FEATURE_UNLOCKS[id].shortLabel);
      const planLabel = addonLabels.length
        ? `${selectedPlan.name} + ${addonLabels.join(', ')}`
        : `${selectedPlan.name} Candidate Plan`;

      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: {
          amount: grandTotal,
          currency: 'INR',
          plan_id: planSlug,
          plan_name: planLabel,
          receipt: `cand_reg_${Date.now()}`,
        },
      });
      if (orderError || !orderData?.order_id) throw new Error(orderError?.message || 'Failed to create order');

      const options: any = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Gradia',
        description: planLabel,
        order_id: orderData.order_id,
        prefill: { name: fullName, email: user.email || email, contact: mobile },
        theme: { color: '#6366f1' },
        handler: async (response: any) => {
          try {
            const { data, error } = await supabase.functions.invoke('sync-candidate-subscription-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan: planSlug,
                amount: grandTotal,
                position: 'Registration',
                band: 'Registration',
                addons: selectedAddons,
              },
            });
            if (error || !data?.activated) {
              console.warn('[registration] activation flag not set:', error?.message || data?.message);
            }
            // Create Skillory voucher if included
            if (includeSkilloryVoucher) {
              try {
                const code = 'SKL-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Date.now().toString(36).toUpperCase().slice(-4);
                await supabase.from('skillory_vouchers').insert({
                  user_id: user.id,
                  voucher_code: code,
                  amount_paid: SKILLORY_VOUCHER_PRICE,
                  points_value: SKILLORY_VOUCHER_POINTS,
                  status: 'purchased',
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                });
                toast({ title: '🎁 Skillory Voucher added', description: `Code: ${code} — Redeem from your Wallet.` });
              } catch (e) {
                console.warn('[voucher] insert failed', e);
              }
            }
            toast({
              title: '🎉 Registration Successful!',
              description: 'Welcome to Gradia. Your candidate account is now active.',
            });
            await refreshProfile();
            navigate('/candidate/dashboard', { replace: true });
          } catch (err: any) {
            toast({
              title: 'Payment captured, activation pending',
              description: err?.message || 'Please contact support if your account does not activate.',
              variant: 'destructive',
            });
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        toast({
          title: 'Payment Failed',
          description: resp?.error?.description || 'Please try another method.',
          variant: 'destructive',
        });
        setPaying(false);
      });
      rzp.open();
    } catch (err: any) {
      console.error('Registration payment error:', err);
      toast({ title: 'Could not start payment', description: err?.message || 'Please try again.', variant: 'destructive' });
      setPaying(false);
    }
  };

  const renderPlanStep = () => {
    return (
      <div data-step="plan" className="w-full max-w-6xl">
        <ProgressIndicator />
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-foreground mb-2">Choose Candidate Plan</h2>
          <p className="text-muted-foreground text-sm">
            Select the candidate access tier that matches your career growth needs.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 items-start">
        <div className="space-y-4">
        <Card className="p-8 mb-0 text-center border-2 border-primary/30 shadow-xl">
          <Badge className="mb-4 gap-1 mx-auto w-fit">
            <Star className="h-3 w-3" /> Candidate Plans
          </Badge>
          <h3 className="text-xl font-bold text-foreground mb-2">{selectedPlan.name}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {selectedPlan.bestFor}
          </p>

          {/* Tier selector */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-5">
            {CANDIDATE_PLAN_ORDER.map((planId) => {
              const tier = CANDIDATE_PLANS[planId];
              const active = selectedCandidatePlan === planId;
              return (
                <button
                  type="button"
                  key={tier.id}
                  onClick={() => setSelectedCandidatePlan(planId)}
                  className={`rounded-lg border-2 p-3 text-center transition-all ${
                    active
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border bg-background hover:border-primary/50'
                  }`}
                >
                  <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    {tier.name}
                  </div>
                  <div className={`text-lg font-bold ${active ? 'text-primary' : 'text-foreground'}`}>
                    ₹{tier.priceInr.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-1">
                    {tier.durationMonths === 1 ? (tier.priceInr === 0 ? 'Forever' : '/ month') : `${tier.durationMonths} months`}
                  </div>
                  {(() => {
                    const combo = CANDIDATE_FREELANCER_COMBOS[planId as keyof typeof CANDIDATE_FREELANCER_COMBOS];
                    if (!combo) return null;
                    const freePlan = FREELANCER_PLANS[combo.freelancerPlanId];
                    return (
                      <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 px-1.5 py-1 text-[9px] font-semibold leading-tight text-primary">
                        + {freePlan.name} FREE
                      </div>
                    );
                  })()}
                </button>
              );
            })}
          </div>

          <div className="mb-5 rounded-lg border border-primary/20 bg-primary/5 p-3 text-left">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Gift className="h-4 w-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wide text-primary">Candidate + Freelancer Combo Packs</span>
              <Badge variant="secondary" className="text-[10px]">Advance and above</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.entries(CANDIDATE_FREELANCER_COMBOS).map(([candidatePlanId, combo]) => {
                const candidatePlan = CANDIDATE_PLANS[candidatePlanId as CandidatePlan];
                const freePlan = FREELANCER_PLANS[combo.freelancerPlanId];
                const active = selectedCandidatePlan === candidatePlanId;
                return (
                  <button
                    key={candidatePlanId}
                    type="button"
                    onClick={() => setSelectedCandidatePlan(candidatePlanId as CandidatePlan)}
                    className={`rounded-md border p-2 text-left transition-all ${
                      active ? 'border-primary bg-background shadow-sm' : 'border-border bg-background/70 hover:border-primary/50'
                    }`}
                  >
                    <p className="text-[11px] font-bold text-foreground">{candidatePlan.name}</p>
                    <p className="text-[10px] text-muted-foreground">{candidatePlan.priceLabel}</p>
                    <p className="mt-1 text-[11px] font-semibold text-primary">
                      + {freePlan.name} FREE
                    </p>
                    <p className="text-[10px] text-muted-foreground line-through">
                      {freePlan.priceLabel}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <div className="text-5xl font-bold text-primary">
              ₹{REGISTRATION_FEE.toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedPlan.priceLabel} · {selectedPlan.tagline}
            </p>
          </div>

          {/* Inline summary + pay */}
          <div className="text-left border-t pt-4 mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Candidate Plan</span>
              <span className="text-foreground">₹{REGISTRATION_FEE.toLocaleString('en-IN')}</span>
            </div>
            {selectedAddons.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Add-ons ({selectedAddons.length})</span>
                <span className="text-foreground">₹{addonsTotal.toLocaleString('en-IN')}</span>
              </div>
            )}
            {servicesTotal > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Services ({Object.keys(selectedServiceTiers).length})</span>
                <span className="text-foreground">₹{servicesTotal.toLocaleString('en-IN')}</span>
              </div>
            )}
            {includeSkilloryVoucher && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Skillory Voucher</span>
                <span className="text-foreground">₹{SKILLORY_VOUCHER_PRICE.toLocaleString('en-IN')}</span>
              </div>
            )}
            {selectedFreelancerCombo && selectedFreelancerPlan && (
              <div className="flex items-center justify-between gap-3 text-sm bg-primary/5 border border-primary/20 rounded-md px-2 py-1.5">
                <span className="text-foreground flex items-center gap-1 min-w-0">
                  🎁 <span className="font-semibold truncate">{selectedFreelancerPlan.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0">({selectedFreelancerCombo.couponLabel})</span>
                </span>
                <span className="text-primary font-semibold shrink-0">
                  FREE <span className="text-[10px] text-muted-foreground line-through ml-1">₹{selectedFreelancerPlan.priceInr.toLocaleString('en-IN')}</span>
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 mt-2 border-t">
              <div>
                <p className="text-sm text-muted-foreground">Amount due</p>
                <p className="text-base font-bold text-foreground">Candidate Account</p>
              </div>
              <p className="text-2xl font-bold text-primary">
                ₹{grandTotal.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="flex gap-2 pt-3">
              <Button variant="ghost" onClick={() => setCurrentStep('terms')} disabled={paying} className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handlePayPlan} disabled={paying || (grandTotal > 0 && !razorpayLoaded)} className="flex-1">
                {paying ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</>
                ) : grandTotal <= 0 ? (
                  <><CheckCircle className="h-4 w-4 mr-2" /> Start Free</>
                ) : (
                  <><CreditCard className="h-4 w-4 mr-2" /> Pay ₹{grandTotal.toLocaleString('en-IN')}</>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center pt-2">
              Payment is required to activate your account. Powered by Razorpay (secure).
            </p>
          </div>
        </Card>

        {/* Skillory Voucher add-on */}
        <Card className={`p-4 border-2 transition-all ${includeSkilloryVoucher ? 'border-purple-500 bg-purple-500/5' : 'border-purple-400/40 bg-gradient-to-br from-purple-500/5 via-card to-pink-500/5'}`}>
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0">
              <Gift className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h4 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                    Skillory Voucher
                    <Badge variant="secondary" className="bg-purple-500/15 text-purple-700 dark:text-purple-300 text-[10px]">
                      <Sparkles className="h-3 w-3 mr-1" /> Special
                    </Badge>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Add ₹{SKILLORY_VOUCHER_PRICE.toLocaleString('en-IN')} · Worth <strong className="text-foreground">{SKILLORY_VOUCHER_POINTS.toLocaleString('en-IN')} wallet points</strong> on Skillory.in
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIncludeSkilloryVoucher((v) => !v)}
                  className={`flex items-center gap-1 h-9 px-3 rounded-md border text-xs font-semibold transition-all ${
                    includeSkilloryVoucher
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-background text-foreground border-border hover:border-purple-500/60'
                  }`}
                  title={includeSkilloryVoucher ? 'Remove voucher' : 'Add voucher'}
                >
                  {includeSkilloryVoucher ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  ₹{SKILLORY_VOUCHER_PRICE.toLocaleString('en-IN')}
                </button>
              </div>
            </div>
          </div>
        </Card>
        </div>

        {/* Right column: what's included + upsell */}
        <div className="space-y-4">
          <Card className="p-6 border-2 border-primary/20">
            <div className="flex items-center justify-between mb-3 gap-2">
              <h4 className="font-bold text-foreground text-base">What's included in {selectedPlan.name}</h4>
              <Badge variant="secondary" className="text-[10px] shrink-0">{selectedPlan.priceLabel}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-4">{selectedPlan.tagline}</p>
            <ul className="space-y-2">
              {selectedPlan.perks.map((perk) => (
                <li key={perk} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>
            {selectedPlan.lockedPerks && selectedPlan.lockedPerks.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Not included</p>
                <ul className="space-y-1.5">
                  {selectedPlan.lockedPerks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-xs text-muted-foreground line-through">
                      <span className="mt-0.5">✕</span><span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedPlan.mentoring && selectedPlan.mentoring.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary mb-2">
                  <Sparkles className="h-3 w-3 inline mr-1" /> Premium Mentorship
                </p>
                <ul className="space-y-1.5">
                  {selectedPlan.mentoring.map((m) => (
                    <li key={m} className="flex items-start gap-2 text-xs text-foreground">
                      <Star className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedFreelancerCombo && selectedFreelancerPlan && (
              <div className="mt-4 pt-4 border-t">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-primary">🎁 Freelancer Combo Bonus</span>
                  <Badge variant="secondary" className="text-[10px]">
                    ₹{selectedFreelancerPlan.priceInr.toLocaleString('en-IN')} value FREE
                  </Badge>
                </div>
                <p className="text-xs text-foreground mb-2">
                  Includes <span className="font-semibold">{selectedFreelancerPlan.name}</span> via {selectedFreelancerCombo.couponLabel} — redeem on the Freelancer platform.
                </p>
                <ul className="space-y-1.5">
                  {selectedFreelancerPlan.perks.slice(0, 4).map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs text-foreground">
                      <Star className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>


          {/* Upsell to next higher tier */}
          {(() => {
            const idx = CANDIDATE_PLAN_ORDER.indexOf(selectedCandidatePlan);
            const recommendedId =
              CANDIDATE_PLAN_ORDER.slice(idx + 1).find((p) => CANDIDATE_PLANS[p].highlight || CANDIDATE_PLANS[p].badge)
              ?? CANDIDATE_PLAN_ORDER[idx + 1];
            if (!recommendedId) return null;
            const rec = CANDIDATE_PLANS[recommendedId];
            const extraPerks = rec.perks.filter((p) => !selectedPlan.perks.includes(p)).slice(0, 5);
            return (
              <Card className="p-5 border-2 border-primary bg-gradient-to-br from-primary/5 via-card to-primary/10">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-[11px] font-bold uppercase tracking-wide text-primary">Recommended Upgrade</span>
                  {rec.badge && <Badge className="text-[10px]">{rec.badge}</Badge>}
                </div>
                <h4 className="font-bold text-foreground text-lg mb-1">{rec.name} — {rec.priceLabel}</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Get more value with {rec.tagline.toLowerCase()}. You'll also unlock:
                </p>
                <ul className="space-y-1.5 mb-4">
                  {extraPerks.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-xs text-foreground">
                      <CheckCircle className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => setSelectedCandidatePlan(recommendedId)}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-2" /> Upgrade to {rec.name}
                </Button>
              </Card>
            );
          })()}
        </div>

        </div>

      </div>
    );
  };


  return (
    <>
      <Helmet>
        <title>Candidate Sign Up - Gradia</title>
        <meta name="description" content="Create a Gradia candidate profile, get matched with jobs, and unlock AI-powered career tools." />
        <link rel="canonical" href="https://gradiaa.com/candidate/signup" />
      </Helmet>
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4 py-12">
      <SignupGuidedTour
        storageKey={`gradia.candidate.signup.step.${currentStep}`}
        runKey={stepTourKey}
        steps={stepTourSteps}
      />
      {currentStep === 'signup' && renderSignupStep()}
      {currentStep === 'resume' && renderResumeStep()}
      {currentStep === 'benefits' && renderBenefitsStep()}
      {currentStep === 'agreement' && renderAgreementStep()}
      {currentStep === 'terms' && renderTermsStep()}
      {currentStep === 'plan' && renderPlanStep()}
    </div>

    </>
  );
};

export default CandidateSignup;
