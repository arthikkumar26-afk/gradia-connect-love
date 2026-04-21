import { useState, useEffect, useRef } from "react";
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
import { ArrowLeft, ArrowRight, Users, Target, BarChart, Shield, Sparkles, Calendar, FileText, Award, Briefcase, GraduationCap, CheckCircle, Check, Upload, Wand2, Wallet, Star, CreditCard } from "lucide-react";
import gradiaLogo from "@/assets/gradia-logo.png";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getRolesForPipeline } from "@/data/interviewPipelineConfig";
import { Loader2 } from "lucide-react";
import { PasswordStrengthIndicator } from "@/components/ui/PasswordStrengthIndicator";
import { Badge } from "@/components/ui/badge";
import { CouponInput } from "@/components/shared/CouponInput";

interface FormErrors {
  fullName?: string;
  email?: string;
  mobile?: string;
  password?: string;
  confirmPassword?: string;
}

type WizardStep = 'signup' | 'resume' | 'benefits' | 'agreement' | 'terms' | 'wallet';

const wizardSteps = [
  { id: 'signup' as const, label: 'Create Account', stepNumber: 1 },
  { id: 'resume' as const, label: 'AI Resume Scan', stepNumber: 2 },
  { id: 'benefits' as const, label: 'Benefits', stepNumber: 3 },
  { id: 'agreement' as const, label: 'Agreement', stepNumber: 4 },
  { id: 'terms' as const, label: 'Terms & Conditions', stepNumber: 5 },
  { id: 'wallet' as const, label: 'Activate Wallet', stepNumber: 6 },
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
  const { isAuthenticated, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || "";
  const prefillEmail = searchParams.get("email") || "";
  const prefillName = searchParams.get("name") || "";
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('signup');
  
  // Track if user just signed up (to allow wizard flow to complete)
  const [justSignedUp, setJustSignedUp] = useState(false);
  const justSignedUpRef = useRef(false);
  
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
  const [isLoading, setIsLoading] = useState(false);
  
  // Agreement state
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  
  // Terms state
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsScrolledToEnd, setTermsScrolledToEnd] = useState(false);
  const termsScrollRef = useRef<HTMLDivElement>(null);
  
  // Retry error state
  const [retryError, setRetryError] = useState<string | null>(null);

  // Resume step state
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeParsing, setResumeParsing] = useState(false);
  const [resumeParsed, setResumeParsed] = useState<any | null>(null);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  // Wallet step state
  const [walletPkg, setWalletPkg] = useState<typeof POINT_PACKAGES[0]>(POINT_PACKAGES[2]);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [walletPaying, setWalletPaying] = useState(false);
  const [suggestedJobs, setSuggestedJobs] = useState<SuggestedJob[]>([]);

  const normalizedIndustryCategory = industryCategory.trim().toLowerCase();
  const matchesIndustryCategory = (...categories: string[]) =>
    categories.some((category) => normalizedIndustryCategory === category.trim().toLowerCase());

  useEffect(() => {
    // Only redirect to dashboard if already authenticated AND not in the middle of signup wizard
    // If user just signed up, let them complete the wizard flow
    if (isAuthenticated && currentStep === 'signup' && !justSignedUp && !justSignedUpRef.current) {
      navigate('/candidate/dashboard');
    }
  }, [isAuthenticated, navigate, currentStep, justSignedUp]);

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
      if (signupError || !signupData?.userId) {
        if (signupMessage.toLowerCase().includes("already registered") || signupMessage.toLowerCase().includes("already been registered")) {
          setErrors({ email: "This email is already registered. Please login instead." });
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
        if (!signInError || !isNetErr(signInError.message)) break;
        if (attempt < 2) await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
      }

      if (signInError) {
        toast({
          title: "Account created",
          description: "Please login once to continue your onboarding.",
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

    // Move to wallet activation step (payment required to access dashboard)
    setCurrentStep('wallet');
  };

  const goBack = () => {
    const stepOrder: WizardStep[] = ['signup', 'resume', 'benefits', 'agreement', 'terms', 'wallet'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  // Wallet activation: load points via Razorpay, apply coupon, then unlock dashboard
  const finalAmount = Math.max(0, walletPkg.price - couponDiscount);

  const handleWalletPayment = async () => {
    setWalletPaying(true);
    try {
      // Try a few times — session may still be propagating after signup
      let session = (await supabase.auth.getSession()).data.session;
      for (let i = 0; i < 3 && !session?.user; i++) {
        await new Promise(r => setTimeout(r, 500));
        session = (await supabase.auth.getSession()).data.session;
      }
      if (!session?.user) {
        // Last resort: re-establish session if we still have credentials in scope
        if (email && password) {
          await supabase.auth.signInWithPassword({ email, password });
          session = (await supabase.auth.getSession()).data.session;
        }
      }
      if (!session?.user) throw new Error('Session expired. Please log in again to continue.');
      const userId = session.user.id;

      // Ensure wallet exists
      let { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!wallet) {
        const { data: newWallet } = await supabase
          .from('wallets')
          .insert({ user_id: userId, cash_balance: 0, points_balance: 100, rewards_balance: 10 })
          .select()
          .single();
        wallet = newWallet;
      }

      if (!wallet) throw new Error('Could not initialize wallet');

      // If 100% discount → free unlock, no payment needed
      if (finalAmount === 0) {
        await creditPointsAndFinish(wallet, 0);
        return;
      }

      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-razorpay-order', {
        body: { amount: finalAmount, currency: 'INR', receipt: `signup_${userId.slice(0, 8)}` },
      });
      if (orderError || !orderData?.order_id) {
        throw new Error(orderError?.message || orderData?.error || 'Failed to create payment order');
      }

      // Load Razorpay script if needed
      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load payment gateway'));
          document.body.appendChild(script);
        });
      }

      const options = {
        key: orderData.key_id,
        amount: finalAmount * 100,
        currency: 'INR',
        name: 'Gradia',
        description: `Activate Wallet — ${walletPkg.points} Points`,
        order_id: orderData.order_id,
        prefill: { email, contact: mobile, name: fullName },
        handler: async (response: any) => {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            });
            if (verifyError || !verifyData?.verified) {
              throw new Error('Payment verification failed');
            }
            await creditPointsAndFinish(wallet!, finalAmount);
          } catch (err: any) {
            toast({ title: 'Payment Error', description: err.message || 'Verification failed', variant: 'destructive' });
            setWalletPaying(false);
          }
        },
        theme: { color: '#10b981' },
        modal: { ondismiss: () => setWalletPaying(false) },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error('Wallet activation failed', err);
      toast({ title: 'Error', description: err.message || 'Payment failed', variant: 'destructive' });
      setWalletPaying(false);
    }
  };

  const creditPointsAndFinish = async (wallet: any, amountPaid: number) => {
    try {
      const newBalance = (wallet.points_balance || 0) + walletPkg.points;
      await supabase.from('wallets').update({ points_balance: newBalance }).eq('id', wallet.id);

      await supabase.from('wallet_transactions').insert({
        wallet_id: wallet.id,
        transaction_type: 'credit',
        category: 'point_purchase',
        amount: amountPaid,
        points: walletPkg.points,
        description: `Signup activation — ${walletPkg.points} points${couponCode ? ` (coupon ${couponCode})` : ''}`,
      });

      // Record coupon usage if applied
      if (couponId && wallet.user_id) {
        await Promise.all([
          supabase.from('coupon_usages').insert({
            coupon_id: couponId,
            user_id: wallet.user_id,
            user_role: 'candidate',
            original_amount: walletPkg.price,
            discount_applied: couponDiscount,
            final_amount: amountPaid,
            plan_name: `${walletPkg.points} pts`,
          }),
          supabase.rpc('increment_coupon_usage', { coupon_id_input: couponId }),
        ]);
      }

      await refreshProfile();
      toast({ title: '🎉 Welcome to Gradia!', description: `${walletPkg.points} points added. Your dashboard is ready.` });
      navigate('/candidate/dashboard');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to credit points', variant: 'destructive' });
      setWalletPaying(false);
    }
  };

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
  };

  const handleResumeScan = async () => {
    if (!resumeFile) {
      toast({ title: 'Please upload a resume first', variant: 'destructive' });
      return;
    }
    setResumeParsing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Not authenticated');
      const userId = session.user.id;

      // 1. Upload resume to storage
      const ext = resumeFile.name.split('.').pop();
      const filePath = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('resumes').upload(filePath, resumeFile, { upsert: true });
      if (upErr) console.warn('Resume upload error:', upErr);
      const { data: urlData } = supabase.storage.from('resumes').getPublicUrl(filePath);
      const resumeUrl = urlData?.publicUrl || null;

      // 2. AI parse via edge function
      const formData = new FormData();
      formData.append('file', resumeFile);
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
    <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-start">
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

        <form onSubmit={handleSignupSubmit} className="space-y-5">
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
              className={errors.fullName ? "border-destructive" : ""}
            />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
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
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
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
              className={errors.mobile ? "border-destructive" : ""}
            />
            {errors.mobile && <p className="text-sm text-destructive">{errors.mobile}</p>}
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
              className={errors.password ? "border-destructive" : ""}
            />
            <PasswordStrengthIndicator password={password} />
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
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
              className={errors.confirmPassword ? "border-destructive" : ""}
            />
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
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
            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              {retryError}
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
    <div className="w-full max-w-4xl">
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
    <div className="w-full max-w-4xl">
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
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">
            {retryError}
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
    <div className="w-full max-w-4xl">
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

        {retryError && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-sm text-destructive">{retryError}</div>}

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
    <div className="w-full max-w-3xl">
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
                {!resumeParsed && (
                  <Button type="button" size="sm" onClick={handleResumeScan} disabled={resumeParsing}>
                    {resumeParsing ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning...</>
                    ) : (
                      <><Wand2 className="h-4 w-4 mr-2" /> Scan with AI</>
                    )}
                  </Button>
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
          <Button variant="ghost" onClick={() => setCurrentStep('benefits')} className="flex-1" disabled={resumeParsing}>
            Skip for now
          </Button>
          <Button onClick={() => setCurrentStep('benefits')} className="flex-1" disabled={resumeParsing || (!!resumeFile && !resumeParsed)}>
            Continue
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );

  // Render wallet activation popup-style step
  const renderWalletStep = () => (
    <div className="w-full max-w-3xl">
      <ProgressIndicator />
      <Card className="w-full p-8 shadow-large border-primary/20">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Wallet className="h-10 w-10 text-primary" />
            </div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5" /> Final Step
          </div>
          <h1 className="text-3xl font-bold text-foreground">Activate Your Wallet</h1>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Load wallet points to unlock your dashboard. Use points for mock interviews, resume exports, subscriptions, and premium features. <span className="font-medium text-foreground">₹5 = 1 point.</span>
          </p>
        </div>

        {/* Point packages */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {POINT_PACKAGES.map((pkg) => {
            const isSelected = walletPkg.points === pkg.points;
            return (
              <Card
                key={pkg.points}
                onClick={() => { setWalletPkg(pkg); setCouponDiscount(0); setCouponId(null); setCouponCode(null); }}
                className={`relative cursor-pointer transition-all hover:shadow-md flex flex-col ${
                  isSelected ? 'border-primary ring-2 ring-primary/30' : 'border-border'
                }`}
              >
                {pkg.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] bg-primary text-primary-foreground">
                    Best Value
                  </Badge>
                )}
                <div className="p-4 text-center space-y-1 border-b border-border">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{pkg.name}</div>
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    <div className="text-xl font-bold text-foreground">{pkg.points.toLocaleString('en-IN')}</div>
                    <span className="text-[10px] text-muted-foreground">pts</span>
                  </div>
                  <div className="text-base font-semibold text-primary">₹{pkg.price.toLocaleString('en-IN')}</div>
                  <p className="text-[10px] text-muted-foreground italic">{pkg.tagline}</p>
                </div>
                <ul className="p-3 space-y-1.5 text-left flex-1">
                  {pkg.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-foreground/80 leading-snug">
                      <Check className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>

        {/* Selected pack — what you'll unlock */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              You're activating the <span className="text-primary">{walletPkg.name}</span> pack — here's what you'll get inside your dashboard:
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {walletPkg.features.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <span>{f}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 pt-3 border-t border-primary/20">
            💡 Points are spent on usage — e.g. 500 pts per AI Mock Interview (full pipeline), 150 pts per Resume PDF. Unused points never expire.
          </p>
        </div>

        {/* AI Mock Interview pipeline preview */}
        <div className="rounded-lg border border-border bg-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">
              What's inside an AI Mock Interview (500 pts unlocks the full pipeline)
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3">
            Pipeline rounds adapt to your department once you set your preferred role. Examples:
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-md border border-border/60 p-3 bg-background">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-[10px]">Education / Teaching</Badge>
                <span className="text-[10px] text-muted-foreground">7 rounds</span>
              </div>
              <ol className="space-y-1 text-[11px] text-foreground/80">
                {[
                  'CV / Resume Screening',
                  'Written Test (10 MCQs)',
                  'Demo Round (live teaching)',
                  'Segment / Subject Round',
                  'Management Round',
                  'HR Round',
                  'Final Review & Offer',
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="rounded-md border border-border/60 p-3 bg-background">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-[10px]">IT / Software</Badge>
                <span className="text-[10px] text-muted-foreground">6 rounds</span>
              </div>
              <ol className="space-y-1 text-[11px] text-foreground/80">
                {[
                  'CV / Resume Screening',
                  'Written Test (MCQs)',
                  'Coding Test (timed)',
                  'Technical Interview',
                  'HR Round',
                  'Final Review & Offer',
                ].map((s, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            Other supported pipelines: Civil Engineering, Film & Media (Audition + Showreel), Banking & Finance, Legal, Doctor, Real Estate, Freelance.
          </p>
        </div>

        {/* Coupon input */}
        <div className="mb-4">
          <Label className="text-sm mb-2 block">Have a coupon code?</Label>
          <CouponInput
            originalAmount={walletPkg.price}
            userRole="wallet"
            onCouponApplied={(discount, _final, id, code) => {
              setCouponDiscount(discount);
              setCouponId(id);
              setCouponCode(code);
            }}
            onCouponRemoved={() => {
              setCouponDiscount(0);
              setCouponId(null);
              setCouponCode(null);
            }}
          />
        </div>

        {/* Order summary */}
        <div className="rounded-lg border bg-muted/40 p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{walletPkg.points} wallet points</span>
            <span className="font-medium">₹{walletPkg.price.toLocaleString('en-IN')}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Coupon discount{couponCode ? ` (${couponCode})` : ''}</span>
              <span>− ₹{couponDiscount.toLocaleString('en-IN')}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="font-semibold text-foreground">Total payable</span>
            <span className="text-lg font-bold text-primary">₹{finalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <Button
          onClick={handleWalletPayment}
          disabled={walletPaying}
          className="w-full"
          size="lg"
        >
          {walletPaying ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing payment...</>
          ) : (
            <><CreditCard className="h-4 w-4 mr-2" /> Pay ₹{finalAmount.toLocaleString('en-IN')} & Unlock Dashboard</>
          )}
        </Button>

        <p className="text-[11px] text-center text-muted-foreground mt-3">
          🔒 Secure payment via Razorpay • Points never expire • Required to access your candidate dashboard
        </p>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background px-4 py-12">
      {currentStep === 'signup' && renderSignupStep()}
      {currentStep === 'resume' && renderResumeStep()}
      {currentStep === 'benefits' && renderBenefitsStep()}
      {currentStep === 'agreement' && renderAgreementStep()}
      {currentStep === 'terms' && renderTermsStep()}
      {currentStep === 'wallet' && renderWalletStep()}
    </div>
  );
};

export default CandidateSignup;
