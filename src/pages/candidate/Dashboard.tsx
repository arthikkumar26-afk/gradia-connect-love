import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useMentorship } from "@/hooks/useMentorship";
import { filterJobsBySector } from "@/utils/sectorFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { 
  LayoutDashboard,
  Briefcase,
  MapPin,
  Calendar,
  LogOut,
  User,
  FileText,
  ClipboardList,
  TrendingUp,
  Menu,
  X,
  Settings,
  BookOpen,
  GraduationCap,
  Award,
  Sparkles,
  CheckCircle,
  Upload,
  RefreshCw,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Target,
  Lightbulb,
  ExternalLink,
  Video,
  Star,
  Download,
  Users,
  Crown,
  Check,
  Zap,
  Rocket,
  Mail,
  Lock,
  Palette,
  Wallet,
  Coins,
  CheckCircle2,
  Phone,
  MessageCircle,
  BarChart3,
  ChevronDown,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { JobApplicationModal } from "@/components/candidate/JobApplicationModal";
import { ApplicationsTab } from "@/components/candidate/ApplicationsTab";
import { InterviewPipelineTab } from "@/components/candidate/InterviewPipelineTab";
import { EducationModal, EducationRecord } from "@/components/candidate/EducationModal";
import ExperienceModal from "@/components/candidate/ExperienceModal";
import FamilyModal from "@/components/candidate/FamilyModal";
import AddressModal, { AddressData } from "@/components/candidate/AddressModal";
import ResumeBuilderTab from "@/components/candidate/ResumeBuilderTab";
import { MockInterviewTab } from "@/components/candidate/MockInterviewTab";
import AIJobApplyTab from "@/components/candidate/AIJobApplyTab";
import { useProfilePdfExport } from "@/hooks/useProfilePdfExport";
import { CouponInput } from "@/components/shared/CouponInput";
import ExternalJobListings from "@/components/candidate/ExternalJobListings";
import AILearningRecommendations from "@/components/candidate/AILearningRecommendations";
import GraphicDesignChallenge from "@/components/candidate/GraphicDesignChallenge";
import SubscriptionTab from "@/components/candidate/SubscriptionTab";
import PaymentStatusPanel from "@/components/candidate/PaymentStatusPanel";
import { LockedFeatureOverlay } from "@/components/candidate/LockedFeatureOverlay";
import FeatureUnlocksPanel from "@/components/candidate/FeatureUnlocksPanel";
import { useFeatureUnlocks } from "@/hooks/useFeatureUnlocks";
import EducationPositionPlans from "@/components/shared/EducationPositionPlans";
import { useActionPayment } from "@/hooks/useActionPayment";
import { useCandidateSubscription } from "@/hooks/useCandidateSubscription";
import { CANDIDATE_PLANS, FEATURE_LABELS, type CandidateFeature } from "@/config/candidatePlans";

interface FamilyRecord {
  id?: string;
  blood_relation: string;
  name_as_per_aadhar: string;
  date_of_birth: string;
  is_dependent: boolean;
  age: number | null;
}

interface ExperienceRecord {
  id?: string;
  organization: string;
  department: string;
  designation: string;
  from_date: string;
  to_date: string;
  salary_per_month: number | null;
  place: string;
  reference_name: string;
  reference_mobile: string;
  worked_with_narayana: boolean;
  narayana_emp_id: string;
}

interface ResumeAnalysis {
  overall_score: number;
  strengths: string[];
  improvements: string[];
  experience_summary: string;
  skill_highlights: string[];
  career_level: string;
}

interface Job {
  id: string;
  job_title: string;
  department: string;
  description: string;
  experience_required: string;
  job_type: string;
  location: string;
  salary_range: string;
  posted_date: string;
  employer_id: string;
}

// Account Settings Section Component
const AccountSettingsSection = ({ user }: { user: any }) => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { toast } = useToast();

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: "Success", description: "Password updated successfully." });
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const netErr = err?.name === "TypeError" || err?.message?.includes("NetworkError") || err?.message?.includes("Failed to fetch");
      toast({ title: netErr ? "Connection Error" : "Error", description: netErr ? "Network issue. Please check your internet." : (err.message || "Failed to update password."), variant: "destructive" });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Account Settings</h2>
        <p className="text-muted-foreground mt-1">Manage your login credentials</p>
      </div>

      {/* Login Email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            Login Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Your account email address</Label>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md border">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground font-medium">{user?.email || "—"}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              This is your login email. To change it, please contact support.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={isChangingPassword} className="w-full sm:w-auto">
              {isChangingPassword ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

const isNetworkError = (err: any) => 
  err?.name === "TypeError" || err?.message?.includes("NetworkError") || err?.message?.includes("Failed to fetch");

const friendlyError = (err: any, fallback: string) => 
  isNetworkError(err) ? "Network issue. Please check your internet and try again." : (err?.message || fallback);

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { user, profile, isAuthenticated, logout, isLoading: authLoading, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { exportProfileToPdf } = useProfilePdfExport();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [applicationCount, setApplicationCount] = useState(0);
  const [interviewCount, setInterviewCount] = useState(0);
  const [walletPoints, setWalletPoints] = useState<number>(0);
  const [searchParams] = useSearchParams();
  const [activeMenu, setActiveMenu] = useState(() => searchParams.get("tab") || "dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const featureUnlocks = useFeatureUnlocks();
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [selectedMentorProfile, setSelectedMentorProfile] = useState<any>(null);
  const [selectedEnrolledMentor, setSelectedEnrolledMentor] = useState<any>(null);
  const { enrollments: dbCandidateMentorships, loading: candidateMentorshipLoading, uploadDocument: candidateUploadDoc, updateHomeworkStatus } = useMentorship("candidate");
  
  // Mentorship request state
  const [realFreelancerMentors, setRealFreelancerMentors] = useState<any[]>([]);
  const [mentorRequestTopic, setMentorRequestTopic] = useState("");
  const [mentorRequestMessage, setMentorRequestMessage] = useState("");
  const [sendingMentorRequest, setSendingMentorRequest] = useState(false);
  const [showMentorRequestForm, setShowMentorRequestForm] = useState<any>(null);

  // Mentor contact unlock state (private 1-on-1 paid sessions — ₹1500 via Razorpay unlocks contact)
  const MENTOR_UNLOCK_PRICE = 1500;
  const [mentorUnlocks, setMentorUnlocks] = useState<Record<string, boolean>>({});
  const [unlockingMentorId, setUnlockingMentorId] = useState<string | null>(null);
  const [unlockConfirmMentor, setUnlockConfirmMentor] = useState<any>(null);
  const [unlockedContactView, setUnlockedContactView] = useState<any>(null);


  // Education state
  const [educationRecords, setEducationRecords] = useState<EducationRecord[]>([]);
  const [isEducationModalOpen, setIsEducationModalOpen] = useState(false);
  const [editingEducation, setEditingEducation] = useState<EducationRecord | null>(null);
  const [isEducationLoading, setIsEducationLoading] = useState(false);

  // Experience state
  const [experienceRecords, setExperienceRecords] = useState<ExperienceRecord[]>([]);
  const [isExperienceModalOpen, setIsExperienceModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<ExperienceRecord | null>(null);
  const [isExperienceLoading, setIsExperienceLoading] = useState(false);

  // Family state
  const [familyRecords, setFamilyRecords] = useState<FamilyRecord[]>([]);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<FamilyRecord | null>(null);
  const [isFamilyLoading, setIsFamilyLoading] = useState(false);

  // Address state
  const [addressData, setAddressData] = useState<AddressData | null>(null);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);

  // Mock test state
  const [mockTestSessions, setMockTestSessions] = useState<any[]>([]);
  const [isStartingMockTest, setIsStartingMockTest] = useState(false);
  const [courseSuggestions, setCourseSuggestions] = useState<{[key: string]: any}>({});
  const [loadingCourseSuggestions, setLoadingCourseSuggestions] = useState<{[key: string]: boolean}>({});
  
  // Upskill course suggestions based on mock interview performance
  const [upskillCourseSuggestions, setUpskillCourseSuggestions] = useState<any[]>([]);
  const [mockInterviewSessions, setMockInterviewSessions] = useState<any[]>([]);
  const [mockInterviewStageResults, setMockInterviewStageResults] = useState<any[]>([]);
  const [isLoadingUpskillCourses, setIsLoadingUpskillCourses] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const { startPayment: startActionPayment } = useActionPayment();
  const candidateSub = useCandidateSubscription();
  const [candidateSubscription, setCandidateSubscription] = useState<any>(null);
  const [candidateCoupon, setCandidateCoupon] = useState<{ discount: number; finalAmount: number; couponId: string; couponCode: string; plan: string } | null>(null);

  const fetchActiveCandidateSubscription = async () => {
    if (!profile?.id) return null;
    try {
      const { data } = await supabase
        .from("candidate_subscriptions")
        .select("*")
        .eq("candidate_id", profile.id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setCandidateSubscription(data);
      return data;
    } catch (e) {
      console.warn("Error fetching subscription:", e);
      return null;
    }
  };

  // Fetch current candidate subscription
  useEffect(() => {
    fetchActiveCandidateSubscription();
  }, [profile?.id]);

  // Fetch real freelancer mentors
  useEffect(() => {
    const fetchFreelancerMentors = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, email, mobile, location, highest_qualification, experience_level, profile_picture, preferred_role, primary_subject")
          .eq("role", "freelancer")
          .limit(20);
        if (data) setRealFreelancerMentors(data);
      } catch (e) {
        console.warn("Error fetching freelancer mentors:", e);
      }
    };
    fetchFreelancerMentors();
  }, []);

  const sendMentorshipRequest = async (mentorId: string, mentorName: string) => {
    if (!profile?.id || !mentorRequestTopic.trim()) {
      toast({ title: "Please enter a topic", variant: "destructive" });
      return;
    }
    setSendingMentorRequest(true);
    try {
      const { error } = await supabase.from("mentorship_requests").insert({
        candidate_id: profile.id,
        mentor_id: mentorId,
        topic: mentorRequestTopic.trim(),
        message: mentorRequestMessage.trim() || null,
        status: "pending",
      });
      if (error) throw error;
      toast({ title: "Request Sent! 🎉", description: `Your mentorship request has been sent to ${mentorName}.` });
      setShowMentorRequestForm(null);
      setMentorRequestTopic("");
      setMentorRequestMessage("");
    } catch (err: any) {
      toast({ title: isNetworkError(err) ? "Connection Error" : "Error", description: friendlyError(err, "Failed to send request"), variant: "destructive" });
    } finally {
      setSendingMentorRequest(false);
    }
  };

  // Fetch which mentors this candidate has already unlocked (in this session).
  // Lifetime unlock storage was removed with the wallet system; access is gated per-month by the subscription quota.
  useEffect(() => {
    setMentorUnlocks({});
  }, [profile?.id]);

  // Use a subscription-quota mentor unlock instead of a per-action payment
  const handleUnlockMentorContact = async (mentor: any) => {
    if (!profile?.id) return;
    setUnlockingMentorId(mentor.id);
    try {
      const limit = candidateSub.limitFor("mentor_unlock");
      const remaining = candidateSub.remainingFor("mentor_unlock");
      if (limit === 0) {
        toast({
          title: "Not in your plan",
          description: "Mentor contact unlocks are part of Pro and Premium plans.",
          variant: "destructive",
        });
        return;
      }
      if (limit !== Infinity && remaining <= 0) {
        toast({
          title: "Monthly quota reached",
          description: "Upgrade your plan for more mentor contact unlocks this month.",
          variant: "destructive",
        });
        return;
      }
      const ok = await candidateSub.consume("mentor_unlock");
      if (!ok) {
        toast({ title: "Unlock failed", description: "Quota exceeded.", variant: "destructive" });
        return;
      }

      setMentorUnlocks((prev) => ({ ...prev, [mentor.id]: true }));
      setUnlockConfirmMentor(null);
      setUnlockedContactView(mentor);
      toast({
        title: "🎉 Contact Unlocked!",
        description: `${mentor.full_name}'s contact details are now visible. ${limit === Infinity ? "" : `${Math.max(0, remaining - 1)} unlocks left this month.`}`,
      });
    } catch (err: any) {
      toast({ title: "Unlock failed", description: err.message || "Please try again", variant: "destructive" });
    } finally {
      setUnlockingMentorId(null);
    }
  };

  const hasUsedTrial = false;
  const isActiveSub = candidateSubscription?.status === "active";

  // Trial removed - direct subscription only

  const recordCandidateCouponUsage = async (
    plan: string,
    originalAmount: number,
  ) => {
    if (!profile?.id) return;
    if (candidateCoupon?.plan === plan) {
      await supabase.from("coupon_usages").insert({
        coupon_id: candidateCoupon.couponId,
        user_id: profile.id,
        user_role: "candidate",
        plan_name: plan,
        discount_applied: candidateCoupon.discount,
        original_amount: originalAmount,
        final_amount: candidateCoupon.finalAmount,
      });
      await supabase.rpc("increment_coupon_usage" as any, { coupon_id_input: candidateCoupon.couponId });
      setCandidateCoupon(null);
    }
  };

  const syncCandidateSubscriptionPayment = async ({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    plan,
    chargedAmount,
    originalAmount,
  }: {
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    plan: string;
    chargedAmount: number;
    originalAmount: number;
  }) => {
    const { data, error } = await supabase.functions.invoke("sync-candidate-subscription-payment", {
      body: {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature,
        plan,
        amount: chargedAmount,
      },
    });

    if (error || !data?.activated) {
      throw new Error(error?.message || data?.message || "Payment completed, but subscription activation is still syncing");
    }

    await recordCandidateCouponUsage(plan, originalAmount);
    setCandidateSubscription(data.subscription || await fetchActiveCandidateSubscription());

    toast({
      title: `✅ ${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Activated`,
      description: `Payment of ₹${chargedAmount} confirmed. Your dashboard benefits are now active.`,
    });
    setUpgradingPlan(null);
    return data;
  };

  const handleCandidateUpgrade = async (plan: string, planPrice: number) => {
    if (!profile?.id) return;
    setUpgradingPlan(plan);
    try {
      // Determine final price (apply coupon if present for this plan)
      const amountToCharge =
        candidateCoupon?.plan === plan ? candidateCoupon.finalAmount : planPrice;

      toast({ title: "Opening payment…", description: `Pay ₹${amountToCharge} via Razorpay to activate ${plan}` });

      // Ensure we have a fresh session token before invoking the edge function
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        toast({ title: "Session expired", description: "Please sign in again to continue.", variant: "destructive" });
        setUpgradingPlan(null);
        return;
      }
      // Refresh proactively if token expires within 60s
      const expiresAt = sessionData.session.expires_at ?? 0;
      if (expiresAt && expiresAt * 1000 - Date.now() < 60_000) {
        await supabase.auth.refreshSession();
      }

      // Create Razorpay order
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        "create-razorpay-order",
        {
          body: {
            amount: amountToCharge,
            currency: "INR",
            plan_id: plan,
            plan_name: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan`,
            receipt: `sub_${plan}_${profile.id.slice(0, 8)}_${Date.now().toString().slice(-6)}`,
          },
        },
      );

      if (orderError || !orderData?.order_id) {
        throw new Error(orderError?.message || orderData?.error || "Failed to create payment order");
      }

      // Load Razorpay checkout script if not present
      if (!(window as any).Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load payment gateway"));
          document.body.appendChild(script);
        });
      }

      const options = {
        key: orderData.key_id,
        amount: amountToCharge * 100,
        currency: "INR",
        name: "Gradia",
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan Subscription`,
        order_id: orderData.order_id,
        prefill: {
          name: profile?.full_name || "",
          email: profile?.email || "",
          contact: (profile as any)?.mobile || "",
        },
        notes: {
          user_id: profile.id,
        },
        handler: async (response: any) => {
          try {
            try { rzp.close(); } catch {}
            await syncCandidateSubscriptionPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              plan,
              chargedAmount: amountToCharge,
              originalAmount: planPrice,
            });
          } catch (err: any) {
            try { rzp.close(); } catch {}
            toast({
              title: "❌ Subscription activation failed",
              description: err.message || "Your payment was received but the plan could not be activated. Please contact support with your payment ID.",
              variant: "destructive",
            });
            setUpgradingPlan(null);
          }
        },
        theme: { color: "#10b981" },
        modal: {
          ondismiss: () => {
            // Razorpay's handler() doesn't always fire (esp. UPI). Poll briefly to see
            // if the payment was captured and activate the plan from the backend.
            const startedPolling = Date.now();
            const pollInterval = setInterval(async () => {
              if (Date.now() - startedPolling > 30000) {
                clearInterval(pollInterval);
                setUpgradingPlan(null);
                return;
              }
              try {
                await syncCandidateSubscriptionPayment({
                  razorpayOrderId: orderData.order_id,
                  plan,
                  chargedAmount: amountToCharge,
                  originalAmount: planPrice,
                });
                clearInterval(pollInterval);
              } catch {
                // Payment may still be pending, or the user may have closed without paying.
              }
            }, 3000);
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast({
        title: isNetworkError(error) ? "Connection Error" : "Error",
        description: friendlyError(error, "Failed to start payment"),
        variant: "destructive",
      });
      setUpgradingPlan(null);
    }
  };


  // Load resume analysis from database and migrate localStorage data if needed
  useEffect(() => {
    const fetchResumeAnalysis = async () => {
      if (!profile?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('resume_analyses')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching resume analysis:', error);
          // Fallback to localStorage if database fetch fails
          const storedAnalysis = localStorage.getItem('resumeAnalysis');
          if (storedAnalysis) {
            setResumeAnalysis(JSON.parse(storedAnalysis));
          }
          return;
        }
        
        if (data) {
          setResumeAnalysis({
            overall_score: data.overall_score || 0,
            career_level: data.career_level || '',
            experience_summary: data.experience_summary || '',
            strengths: data.strengths || [],
            improvements: data.improvements || [],
            skill_highlights: data.skill_highlights || []
          });
        } else {
          // Check localStorage for users who registered before database storage
          const storedAnalysis = localStorage.getItem('resumeAnalysis');
          if (storedAnalysis) {
            const parsedAnalysis = JSON.parse(storedAnalysis);
            setResumeAnalysis(parsedAnalysis);
            
            // Migrate localStorage data to database
            try {
              const { error: migErr } = await supabase.functions.invoke('save-resume-analysis', {
                body: { user_id: profile.id, analysis: parsedAnalysis }
              });
              if (!migErr) {
                console.log('Successfully migrated resume analysis to database');
                localStorage.removeItem('resumeAnalysis');
              }
            } catch (migrationError) {
              console.error('Error migrating resume analysis:', migrationError);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching resume analysis:', e);
      }
    };
    
    fetchResumeAnalysis();
  }, [profile?.id]);

  // Fetch educational qualifications
  useEffect(() => {
    const fetchEducation = async () => {
      if (!profile?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('educational_qualifications')
          .select('*')
          .eq('user_id', profile.id)
          .order('display_order', { ascending: true });
        
        if (error) {
          console.error('Error fetching education:', error);
          return;
        }
        
        setEducationRecords(data || []);
      } catch (e) {
        console.error('Error fetching education:', e);
      }
    };
    
    fetchEducation();
  }, [profile?.id]);

  // Handle save education
  const handleSaveEducation = async (data: EducationRecord) => {
    if (!profile?.id) return;
    
    setIsEducationLoading(true);
    try {
      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('educational_qualifications')
          .update({
            education_level: data.education_level,
            school_college_name: data.school_college_name,
            specialization: data.specialization,
            board_university: data.board_university,
            year_of_passing: data.year_of_passing,
            percentage_marks: data.percentage_marks,
          })
          .eq('id', data.id);
        
        if (error) throw error;
        
        setEducationRecords(prev => 
          prev.map(rec => rec.id === data.id ? { ...rec, ...data } : rec)
        );
        toast({ title: "Success", description: "Education updated successfully" });
      } else {
        // Insert new
        const { data: newRecord, error } = await supabase
          .from('educational_qualifications')
          .insert({
            user_id: profile.id,
            education_level: data.education_level,
            school_college_name: data.school_college_name,
            specialization: data.specialization,
            board_university: data.board_university,
            year_of_passing: data.year_of_passing,
            percentage_marks: data.percentage_marks,
            display_order: educationRecords.length,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setEducationRecords(prev => [...prev, newRecord]);
        toast({ title: "Success", description: "Education added successfully" });
      }
      
      setIsEducationModalOpen(false);
      setEditingEducation(null);
    } catch (error: any) {
      console.error('Error saving education:', error);
      toast({ 
        title: isNetworkError(error) ? "Connection Error" : "Error", 
        description: friendlyError(error, "Failed to save education"),
        variant: "destructive" 
      });
    } finally {
      setIsEducationLoading(false);
    }
  };

  // Handle delete education
  const handleDeleteEducation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('educational_qualifications')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setEducationRecords(prev => prev.filter(rec => rec.id !== id));
      toast({ title: "Success", description: "Education deleted successfully" });
    } catch (error: any) {
      console.error('Error deleting education:', error);
      toast({ 
        title: isNetworkError(error) ? "Connection Error" : "Error", 
        description: friendlyError(error, "Failed to delete education"),
        variant: "destructive" 
      });
    }
  };

  // Fetch work experience
  useEffect(() => {
    const fetchExperience = async () => {
      if (!profile?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('work_experience')
          .select('*')
          .eq('user_id', profile.id)
          .order('display_order', { ascending: true });
        
        if (error) {
          console.error('Error fetching experience:', error);
          return;
        }
        
        setExperienceRecords(data || []);
      } catch (e) {
        console.error('Error fetching experience:', e);
      }
    };
    
    fetchExperience();
  }, [profile?.id]);

  // Handle save experience
  const handleSaveExperience = async (data: ExperienceRecord) => {
    if (!profile?.id) return;
    
    setIsExperienceLoading(true);
    try {
      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('work_experience')
          .update({
            organization: data.organization,
            department: data.department,
            designation: data.designation,
            from_date: data.from_date || null,
            to_date: data.to_date || null,
            salary_per_month: data.salary_per_month,
            place: data.place,
            reference_name: data.reference_name,
            reference_mobile: data.reference_mobile,
            worked_with_narayana: data.worked_with_narayana,
            narayana_emp_id: data.narayana_emp_id,
          })
          .eq('id', data.id);
        
        if (error) throw error;
        
        setExperienceRecords(prev => 
          prev.map(rec => rec.id === data.id ? { ...rec, ...data } : rec)
        );
        toast({ title: "Success", description: "Experience updated successfully" });
      } else {
        // Insert new
        const { data: newRecord, error } = await supabase
          .from('work_experience')
          .insert({
            user_id: profile.id,
            organization: data.organization,
            department: data.department,
            designation: data.designation,
            from_date: data.from_date || null,
            to_date: data.to_date || null,
            salary_per_month: data.salary_per_month,
            place: data.place,
            reference_name: data.reference_name,
            reference_mobile: data.reference_mobile,
            worked_with_narayana: data.worked_with_narayana,
            narayana_emp_id: data.narayana_emp_id,
            display_order: experienceRecords.length,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setExperienceRecords(prev => [...prev, newRecord]);
        toast({ title: "Success", description: "Experience added successfully" });
      }
      
      setIsExperienceModalOpen(false);
      setEditingExperience(null);
    } catch (error: any) {
      console.error('Error saving experience:', error);
      toast({ 
        title: isNetworkError(error) ? "Connection Error" : "Error", 
        description: friendlyError(error, "Failed to save experience"),
        variant: "destructive" 
      });
    } finally {
      setIsExperienceLoading(false);
    }
  };

  // Handle delete experience
  const handleDeleteExperience = async (id: string) => {
    try {
      const { error } = await supabase
        .from('work_experience')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setExperienceRecords(prev => prev.filter(rec => rec.id !== id));
      toast({ title: "Success", description: "Experience deleted successfully" });
    } catch (error: any) {
      console.error('Error deleting experience:', error);
      toast({ 
        title: isNetworkError(error) ? "Connection Error" : "Error", 
        description: friendlyError(error, "Failed to delete experience"),
        variant: "destructive" 
      });
    }
  };

  // Fetch family details
  useEffect(() => {
    const fetchFamily = async () => {
      if (!profile?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('family_details')
          .select('*')
          .eq('user_id', profile.id)
          .order('display_order', { ascending: true });
        
        if (error) {
          console.error('Error fetching family:', error);
          return;
        }
        
        setFamilyRecords(data || []);
      } catch (e) {
        console.error('Error fetching family:', e);
      }
    };
    
    fetchFamily();
  }, [profile?.id]);

  // Handle save family
  const handleSaveFamily = async (data: FamilyRecord) => {
    if (!profile?.id) return;
    
    setIsFamilyLoading(true);
    try {
      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('family_details')
          .update({
            blood_relation: data.blood_relation,
            name_as_per_aadhar: data.name_as_per_aadhar,
            date_of_birth: data.date_of_birth || null,
            is_dependent: data.is_dependent,
            age: data.age,
          })
          .eq('id', data.id);
        
        if (error) throw error;
        
        setFamilyRecords(prev => 
          prev.map(rec => rec.id === data.id ? { ...rec, ...data } : rec)
        );
        toast({ title: "Success", description: "Family member updated successfully" });
      } else {
        // Insert new
        const { data: newRecord, error } = await supabase
          .from('family_details')
          .insert({
            user_id: profile.id,
            blood_relation: data.blood_relation,
            name_as_per_aadhar: data.name_as_per_aadhar,
            date_of_birth: data.date_of_birth || null,
            is_dependent: data.is_dependent,
            age: data.age,
            display_order: familyRecords.length,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setFamilyRecords(prev => [...prev, newRecord]);
        toast({ title: "Success", description: "Family member added successfully" });
      }
      
      setIsFamilyModalOpen(false);
      setEditingFamily(null);
    } catch (error: any) {
      console.error('Error saving family:', error);
      toast({ 
        title: isNetworkError(error) ? "Connection Error" : "Error", 
        description: friendlyError(error, "Failed to save family member"),
        variant: "destructive" 
      });
    } finally {
      setIsFamilyLoading(false);
    }
  };

  // Handle delete family
  const handleDeleteFamily = async (id: string) => {
    try {
      const { error } = await supabase
        .from('family_details')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      setFamilyRecords(prev => prev.filter(rec => rec.id !== id));
      toast({ title: "Success", description: "Family member deleted successfully" });
    } catch (error: any) {
      console.error('Error deleting family:', error);
      toast({ 
        title: isNetworkError(error) ? "Connection Error" : "Error", 
        description: friendlyError(error, "Failed to delete family member"),
        variant: "destructive" 
      });
    }
  };

  // Fetch address details
  useEffect(() => {
    const fetchAddress = async () => {
      if (!profile?.id) return;
      
      try {
        const { data, error } = await supabase
          .from('address_details')
          .select('*')
          .eq('user_id', profile.id)
          .maybeSingle();
        
        if (error) {
          console.error('Error fetching address:', error);
          return;
        }
        
        if (data) {
          setAddressData(data);
        }
      } catch (e) {
        console.error('Error fetching address:', e);
      }
    };
    
    fetchAddress();
  }, [profile?.id]);

  // Handle save address
  const handleSaveAddress = async (data: AddressData) => {
    if (!profile?.id) return;
    
    try {
      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('address_details')
          .update({
            present_door_flat_no: data.present_door_flat_no,
            present_street: data.present_street,
            present_village_area: data.present_village_area,
            present_mandal: data.present_mandal,
            present_district: data.present_district,
            present_state: data.present_state,
            present_pin_code: data.present_pin_code,
            permanent_door_flat_no: data.permanent_door_flat_no,
            permanent_street: data.permanent_street,
            permanent_village_area: data.permanent_village_area,
            permanent_mandal: data.permanent_mandal,
            permanent_district: data.permanent_district,
            permanent_state: data.permanent_state,
            permanent_pin_code: data.permanent_pin_code,
            same_as_present: data.same_as_present,
          })
          .eq('id', data.id);
        
        if (error) throw error;
        
        setAddressData({ ...data });
        toast({ title: "Success", description: "Address updated successfully" });
      } else {
        // Insert new
        const { data: newRecord, error } = await supabase
          .from('address_details')
          .insert({
            user_id: profile.id,
            present_door_flat_no: data.present_door_flat_no,
            present_street: data.present_street,
            present_village_area: data.present_village_area,
            present_mandal: data.present_mandal,
            present_district: data.present_district,
            present_state: data.present_state,
            present_pin_code: data.present_pin_code,
            permanent_door_flat_no: data.permanent_door_flat_no,
            permanent_street: data.permanent_street,
            permanent_village_area: data.permanent_village_area,
            permanent_mandal: data.permanent_mandal,
            permanent_district: data.permanent_district,
            permanent_state: data.permanent_state,
            permanent_pin_code: data.permanent_pin_code,
            same_as_present: data.same_as_present,
          })
          .select()
          .single();
        
        if (error) throw error;
        
        setAddressData(newRecord);
        toast({ title: "Success", description: "Address saved successfully" });
      }
      
      setIsAddressModalOpen(false);
    } catch (error: any) {
      console.error('Error saving address:', error);
      toast({ 
        title: isNetworkError(error) ? "Connection Error" : "Error", 
        description: friendlyError(error, "Failed to save address"),
        variant: "destructive" 
      });
    }
  };

  const handleReanalyzeResume = async () => {
    if (!profile?.resume_url || !profile?.id) {
      toast({
        title: "No Resume Found",
        description: "Please upload a resume first to analyze it.",
        variant: "destructive",
      });
      return;
    }

    setIsReanalyzing(true);
    
    try {
      // Fetch the resume file from the URL
      const response = await fetch(profile.resume_url);
      if (!response.ok) {
        throw new Error("Failed to fetch resume file");
      }
      
      const blob = await response.blob();
      const fileName = profile.resume_url.split('/').pop() || 'resume.pdf';
      const file = new File([blob], fileName, { type: blob.type || 'application/pdf' });
      
      // Create form data and send to parse-resume function
      const formData = new FormData();
      formData.append('file', file);
      
      const { data: analysisDataRaw, error: parseError } = await supabase.functions.invoke('parse-resume', {
        body: formData,
      });
      
      if (parseError) {
        throw new Error(parseError.message || "Failed to analyze resume");
      }
      
      const analysisData = analysisDataRaw;
      
      // Save the new analysis to the database
      await supabase.functions.invoke('save-resume-analysis', {
        body: { user_id: profile.id, analysis: analysisData }
      });
      
      // Update local state
      setResumeAnalysis({
        overall_score: analysisData.overall_score || 0,
        career_level: analysisData.career_level || '',
        experience_summary: analysisData.experience_summary || '',
        strengths: analysisData.strengths || [],
        improvements: analysisData.improvements || [],
        skill_highlights: analysisData.skill_highlights || []
      });
      
      toast({
        title: "Resume Re-analyzed!",
        description: `Your new AI score is ${analysisData.overall_score}/100`,
      });
      
    } catch (error: any) {
      console.error('Error re-analyzing resume:', error);
      const isNetworkError = error.message?.includes("NetworkError") || error.message?.includes("Failed to fetch") || error.name === "TypeError";
      toast({
        title: "Analysis Failed",
        description: isNetworkError 
          ? "Network issue. Please check your internet connection and try again." 
          : (error.message || "Could not re-analyze your resume. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsReanalyzing(false);
    }
  };

  // Handle resume upload and AI auto-fill profile
  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile?.id) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File",
        description: "Please upload a PDF, Word document, or image file.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive"
      });
      return;
    }

    setIsUploadingResume(true);

    try {
      toast({
        title: "Analyzing Resume",
        description: "AI is extracting your profile details...",
      });

      // First upload the file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/resume_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('Upload error:', uploadError);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      const resumeUrl = urlData?.publicUrl;

      // Parse resume with AI
      const formDataToSend = new FormData();
      formDataToSend.append('file', file);

      const { data, error: parseErr } = await supabase.functions.invoke('parse-resume', {
        body: formDataToSend,
      });

      if (parseErr) {
        throw new Error(parseErr.message || 'Failed to parse resume');
      }

      console.log('AI parsed resume data:', data);

      // Update profile with extracted data
      const profileUpdate: any = {};
      
      if (data.full_name) profileUpdate.full_name = data.full_name;
      if (data.email) profileUpdate.email = data.email;
      if (data.mobile) profileUpdate.mobile = data.mobile;
      if (data.date_of_birth) profileUpdate.date_of_birth = data.date_of_birth;
      if (data.gender) profileUpdate.gender = data.gender;
      if (data.location) profileUpdate.location = data.location;
      if (data.current_state) profileUpdate.current_state = data.current_state;
      if (data.current_district) profileUpdate.current_district = data.current_district;
      if (data.linkedin) profileUpdate.linkedin = data.linkedin;
      if (data.website) profileUpdate.website = data.website;
      if (data.languages && Array.isArray(data.languages)) profileUpdate.languages = data.languages;
      if (data.highest_qualification) profileUpdate.highest_qualification = data.highest_qualification;
      if (data.experience_level) profileUpdate.experience_level = data.experience_level;
      if (data.preferred_role) profileUpdate.preferred_role = data.preferred_role;
      if (resumeUrl) profileUpdate.resume_url = resumeUrl;

      // Update profile in database
      if (Object.keys(profileUpdate).length > 0) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update(profileUpdate)
          .eq('id', profile.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
        }
      }

      // Save education records if extracted
      if (data.education && Array.isArray(data.education) && data.education.length > 0) {
        for (let i = 0; i < data.education.length; i++) {
          const edu = data.education[i];
          if (edu.education_level) {
            await supabase.from('educational_qualifications').upsert({
              user_id: profile.id,
              education_level: edu.education_level,
              school_college_name: edu.school_college_name || null,
              specialization: edu.specialization || null,
              board_university: edu.board_university || null,
              year_of_passing: edu.year_of_passing || null,
              percentage_marks: edu.percentage_marks || null,
              display_order: i,
            }, { onConflict: 'user_id,education_level' });
          }
        }
        // Refresh education records
        const { data: newEducation } = await supabase
          .from('educational_qualifications')
          .select('*')
          .eq('user_id', profile.id)
          .order('display_order');
        if (newEducation) setEducationRecords(newEducation);
      }

      // Save work experience if extracted
      if (data.experience && Array.isArray(data.experience) && data.experience.length > 0) {
        console.log('Saving work experience records:', data.experience.length);
        
        // Delete existing experience records first to prevent duplicates
        await supabase.from('work_experience').delete().eq('user_id', profile.id);
        
        // Helper to normalize date strings from AI (YYYY-MM, YYYY-MM-DD, "Present", etc.) to valid date or null
        const normalizeDate = (dateStr: string | null | undefined): string | null => {
          if (!dateStr || dateStr.toLowerCase() === 'present' || dateStr.toLowerCase() === 'current' || dateStr.toLowerCase() === 'till date') {
            return null;
          }
          // If already YYYY-MM-DD
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
          // If YYYY-MM, append -01
          if (/^\d{4}-\d{2}$/.test(dateStr)) return `${dateStr}-01`;
          // If just YYYY, append -01-01
          if (/^\d{4}$/.test(dateStr)) return `${dateStr}-01-01`;
          return null;
        };

        for (let i = 0; i < data.experience.length; i++) {
          const exp = data.experience[i];
          if (exp.organization || exp.designation) {
            const { error: expError } = await supabase.from('work_experience').insert({
              user_id: profile.id,
              organization: exp.organization || 'Unknown Organization',
              designation: exp.designation || null,
              department: exp.department || null,
              from_date: normalizeDate(exp.from_date),
              to_date: normalizeDate(exp.to_date),
              place: exp.place || null,
              salary_per_month: exp.salary_per_month || null,
              display_order: i,
            });
            if (expError) {
              console.error('Error inserting experience record:', expError, exp);
            }
          }
        }
        // Refresh experience records
        const { data: newExperience } = await supabase
          .from('work_experience')
          .select('*')
          .eq('user_id', profile.id)
          .order('display_order');
        if (newExperience) setExperienceRecords(newExperience);
      }

      // Save resume analysis
      setResumeAnalysis({
        overall_score: data.overall_score || 0,
        career_level: data.career_level || '',
        experience_summary: data.experience_summary || '',
        strengths: data.strengths || [],
        improvements: data.improvements || [],
        skill_highlights: data.skill_highlights || data.skills || []
      });

      // Save analysis to database
      await supabase.functions.invoke('save-resume-analysis', {
        body: {
          user_id: profile.id,
          analysis: {
            overall_score: data.overall_score,
            career_level: data.career_level,
            experience_summary: data.experience_summary,
            strengths: data.strengths,
            improvements: data.improvements,
            skill_highlights: data.skill_highlights || data.skills
          }
        }
      });

      // Refresh profile
      await refreshProfile();

      toast({
        title: "Profile Updated!",
        description: `AI extracted your details. Resume score: ${data.overall_score || 0}/100`,
      });

    } catch (error: any) {
      console.error('Error uploading resume:', error);
      const isNetworkError = error.message?.includes("NetworkError") || error.message?.includes("Failed to fetch") || error.name === "TypeError";
      toast({
        title: "Upload Failed",
        description: isNetworkError 
          ? "Network issue. Please check your internet connection and try again." 
          : (error.message || "Could not process your resume. Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsUploadingResume(false);
      // Reset file input
      if (resumeInputRef.current) {
        resumeInputRef.current.value = '';
      }
    }
  };

  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "wallet", label: "My Subscription", icon: Crown },
    { id: "resume", label: "Resume Builder", icon: FileText },
    { id: "jobs", label: "Suitable Jobs", icon: Briefcase },
    { id: "aijobapply", label: "AI Job Apply", icon: Rocket },
    { id: "applications", label: "My Applications", icon: ClipboardList },
    { id: "pipeline", label: "Interview Pipeline", icon: TrendingUp },
    { id: "mocktest", label: "Attend Mock Test", icon: Target },
    { id: "upskill", label: "Upskill Yourself", icon: Lightbulb },
    // { id: "mentors", label: "Mentors", icon: Users }, // hidden per request
    { id: "externaljobs", label: "External Job Listings", icon: ExternalLink },
    // { id: "freelancer", label: "Freelancer", icon: Zap, link: "/freelancer/login" }, // temporarily hidden
    
    { id: "upgrade", label: "Upgrade Plans", icon: Crown },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const dashboardCards = [
    {
      title: "Available Jobs",
      value: jobs.length.toString(),
      subtitle: "Open positions",
      icon: Briefcase,
      gradient: "from-primary/20 to-primary/5",
    },
    {
      title: "Applications",
      value: applicationCount.toString(),
      subtitle: "Submitted",
      icon: FileText,
      gradient: "from-accent/20 to-accent/5",
    },
    {
      title: "Active Interviews",
      value: interviewCount.toString(),
      subtitle: "In progress",
      icon: TrendingUp,
      gradient: "from-success/20 to-success/5",
    },
    {
      title: "Plan",
      value: candidateSub.planDef.name,
      subtitle: candidateSub.planDef.priceLabel,
      icon: Crown,
      gradient: "from-secondary/20 to-secondary/5",
    },
  ];

  const fetchApplicationCount = async () => {
    if (!profile?.id) return;
    const { count } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', profile.id);
    setApplicationCount(count || 0);
  };

  // Wallet system removed — kept as a no-op so existing call sites compile.
  const fetchWalletBalance = async () => {
    setWalletPoints(0);
  };

  const fetchInterviewCount = async () => {
    if (!profile?.id) return;
    // Get application job_ids to only count pipeline entries with matching applications
    const { data: apps } = await supabase
      .from('applications')
      .select('job_id')
      .eq('candidate_id', profile.id);
    
    if (!apps || apps.length === 0) {
      setInterviewCount(0);
      return;
    }

    const jobIds = apps.map(a => a.job_id);
    const { count } = await supabase
      .from('interview_candidates')
      .select('*', { count: 'exact', head: true })
      .eq('candidate_id', profile.id)
      .eq('status', 'active')
      .in('job_id', jobIds);
    setInterviewCount(count || 0);
  };

  // Fetch mock test sessions
  const fetchMockTestSessions = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('mock_test_sessions')
        .select('*')
        .eq('candidate_id', profile.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMockTestSessions(data || []);
    } catch (e) {
      console.error('Error fetching mock test sessions:', e);
    }
  };

  // Handle starting a mock test
  const handleStartMockTest = async () => {
    if (!profile?.id || !profile?.email) {
      toast({
        title: "Profile Required",
        description: "Please complete your profile first.",
        variant: "destructive"
      });
      return;
    }

    setIsStartingMockTest(true);
    try {
      // Create a new mock test session
      const { data: session, error: sessionError } = await supabase
        .from('mock_test_sessions')
        .insert({
          candidate_id: profile.id,
          status: 'pending',
          total_questions: 10
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Send email invitation
      const { error: emailError } = await supabase.functions.invoke('send-mock-test-invitation', {
        body: {
          candidateEmail: profile.email,
          candidateName: profile.full_name,
          sessionId: session.id,
          appUrl: window.location.origin
        }
      });

      if (emailError) {
        console.error('Email error:', emailError);
        toast({
          title: "Email Failed",
          description: "Could not send invitation email. Please try again.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Invitation Sent! 📧",
          description: "Check your email to start the mock interview test."
        });
      }

      // Refresh the list
      fetchMockTestSessions();
    } catch (error: any) {
      console.error('Error starting mock test:', error);
      toast({
        title: isNetworkError(error) ? "Connection Error" : "Error",
        description: friendlyError(error, "Could not start mock test. Please try again."),
        variant: "destructive"
      });
    } finally {
      setIsStartingMockTest(false);
    }
  };

  // Fetch course suggestions for a completed mock test
  const fetchCourseSuggestions = async (session: any) => {
    if (session.status !== 'completed' || courseSuggestions[session.id]) return;
    
    setLoadingCourseSuggestions(prev => ({ ...prev, [session.id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('suggest-courses', {
        body: {
          testResults: {
            score: session.score,
            total_questions: session.total_questions,
            correct_answers: session.correct_answers,
            questions: session.questions,
            answers: session.answers
          },
          candidateProfile: {
            preferred_role: profile?.preferred_role,
            primary_subject: profile?.primary_subject
          }
        }
      });

      if (error) throw error;
      
      setCourseSuggestions(prev => ({ ...prev, [session.id]: data }));
    } catch (error: any) {
      console.error('Error fetching course suggestions:', error);
      if (!isNetworkError(error)) {
        toast({
          title: "Could not load suggestions",
          description: friendlyError(error, "Unable to fetch course recommendations."),
          variant: "destructive"
        });
      }
    } finally {
      setLoadingCourseSuggestions(prev => ({ ...prev, [session.id]: false }));
    }
  };

  // Fetch mock interview stage results and generate upskill course suggestions
  const fetchMockInterviewCourseSuggestions = async () => {
    if (!profile?.id) return;
    
    setIsLoadingUpskillCourses(true);
    try {
      // Get all mock interview sessions for this candidate
      const { data: allSessions } = await supabase
        .from('mock_interview_sessions')
        .select('*')
        .eq('candidate_id', profile.id)
        .order('created_at', { ascending: false });

      if (allSessions && allSessions.length > 0) {
        setMockInterviewSessions(allSessions);
      }

      // Get the most recent completed mock interview session
      const recentSession = allSessions?.find(s => s.status === 'completed') || allSessions?.[0];

      if (!recentSession) {
        setIsLoadingUpskillCourses(false);
        return;
      }

      // Get all stage results for all sessions
      const sessionIds = allSessions?.map(s => s.id) || [];
      const { data: allResultsData } = await supabase
        .from('mock_interview_stage_results')
        .select('*')
        .in('session_id', sessionIds)
        .order('stage_order', { ascending: true });

      if (allResultsData) {
        setMockInterviewStageResults(allResultsData);
        
        // Generate course suggestions based on improvements from the most recent session
        const recentSessionResults = allResultsData.filter((r: any) => r.session_id === recentSession.id);
        const improvements = recentSessionResults.flatMap((r: any) => r.improvements || []);
        const overallScore = recentSessionResults.length > 0 
          ? recentSessionResults.filter((r: any) => r.ai_score !== undefined && r.stage_order !== 1 && r.stage_order !== 2 && r.stage_order !== 4)
              .reduce((sum: number, r: any) => sum + (r.ai_score || 0), 0) / 
            (recentSessionResults.filter((r: any) => r.ai_score !== undefined && r.stage_order !== 1 && r.stage_order !== 2 && r.stage_order !== 4).length || 1)
          : 0;

        const courses: any[] = [];

        // Communication-related improvements
        if (improvements.some((i: string) => i.toLowerCase().includes('communication') || i.toLowerCase().includes('speaking') || i.toLowerCase().includes('voice') || i.toLowerCase().includes('clarity'))) {
          courses.push({
            id: 'comm-1',
            title: 'Effective Communication for Educators',
            description: 'Master clear and impactful communication techniques for teaching.',
            duration: '6 hours',
            level: 'Beginner',
            rating: 4.7,
            category: 'Communication Skills',
            url: 'https://skillory.in'
          });
        }

        // Subject knowledge improvements
        if (improvements.some((i: string) => i.toLowerCase().includes('knowledge') || i.toLowerCase().includes('content') || i.toLowerCase().includes('subject') || i.toLowerCase().includes('depth'))) {
          courses.push({
            id: 'subj-1',
            title: 'Deep Dive into Subject Mastery',
            description: 'Strengthen your subject knowledge with expert-led courses.',
            duration: '12 hours',
            level: 'Intermediate',
            rating: 4.8,
            category: 'Subject Expertise',
            url: 'https://skillory.in'
          });
        }

        // Teaching/presentation improvements
        if (improvements.some((i: string) => i.toLowerCase().includes('teaching') || i.toLowerCase().includes('presentation') || i.toLowerCase().includes('demo') || i.toLowerCase().includes('engagement') || i.toLowerCase().includes('interactive'))) {
          courses.push({
            id: 'teach-1',
            title: 'Modern Teaching Techniques',
            description: 'Learn interactive teaching methods to engage students effectively.',
            duration: '8 hours',
            level: 'Intermediate',
            rating: 4.6,
            category: 'Teaching Methods',
            url: 'https://skillory.in'
          });
          courses.push({
            id: 'teach-2',
            title: 'Presentation Skills Masterclass',
            description: 'Deliver compelling presentations and demonstrations with confidence.',
            duration: '5 hours',
            level: 'Beginner',
            rating: 4.5,
            category: 'Presentation Skills',
            url: 'https://skillory.in'
          });
        }

        // Time management improvements
        if (improvements.some((i: string) => i.toLowerCase().includes('time') || i.toLowerCase().includes('pace') || i.toLowerCase().includes('planning'))) {
          courses.push({
            id: 'time-1',
            title: 'Time Management for Teachers',
            description: 'Optimize your lesson planning and classroom time management.',
            duration: '4 hours',
            level: 'Beginner',
            rating: 4.4,
            category: 'Productivity',
            url: 'https://skillory.in'
          });
        }

        // Confidence improvements
        if (improvements.some((i: string) => i.toLowerCase().includes('confidence') || i.toLowerCase().includes('nervous') || i.toLowerCase().includes('calm'))) {
          courses.push({
            id: 'conf-1',
            title: 'Building Confidence in the Classroom',
            description: 'Overcome nervousness and project confidence while teaching.',
            duration: '3 hours',
            level: 'Beginner',
            rating: 4.6,
            category: 'Personal Development',
            url: 'https://skillory.in'
          });
        }

        // Low score - general improvement courses
        if (overallScore < 70 && courses.length === 0) {
          courses.push({
            id: 'gen-1',
            title: 'Complete Teacher Training Program',
            description: 'Comprehensive program covering all aspects of effective teaching.',
            duration: '20 hours',
            level: 'Beginner',
            rating: 4.8,
            category: 'Teaching Foundation',
            url: 'https://skillory.in'
          });
          courses.push({
            id: 'gen-2',
            title: 'Interview Preparation for Educators',
            description: 'Practice and perfect your teaching interview skills.',
            duration: '6 hours',
            level: 'Intermediate',
            rating: 4.5,
            category: 'Career Development',
            url: 'https://skillory.in'
          });
        }

        // Add default courses if none matched
        if (courses.length === 0 && recentSessionResults.length > 0) {
          courses.push({
            id: 'def-1',
            title: 'Advanced Teaching Strategies',
            description: 'Take your teaching to the next level with advanced methodologies.',
            duration: '10 hours',
            level: 'Advanced',
            rating: 4.7,
            category: 'Professional Growth',
            url: 'https://skillory.in'
          });
        }

        setUpskillCourseSuggestions(courses);
      }
    } catch (error) {
      console.error('Error fetching mock interview course suggestions:', error);
    } finally {
      setIsLoadingUpskillCourses(false);
    }
  };

  // Fetch mock interview data on dashboard load (for PDF export) and upskill tab
  useEffect(() => {
    if ((activeMenu === 'upskill' || activeMenu === 'dashboard') && profile?.id && mockInterviewSessions.length === 0) {
      fetchMockInterviewCourseSuggestions();
    }
  }, [activeMenu, profile?.id]);

  // Track if we've already shown the profile required toast to prevent loops
  const [hasShownProfileToast, setHasShownProfileToast] = useState(false);
  // Track if we're waiting for profile to load after signup
  const [isWaitingForProfile, setIsWaitingForProfile] = useState(false);

  useEffect(() => {
    // Wait for auth loading to complete
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      navigate("/candidate/login", { replace: true });
      return;
    }

    // If authenticated but no profile exists, try to refresh it
    if (!profile) {
      // Only proceed with redirect logic once, and wait for potential sync
      if (!hasShownProfileToast && !isWaitingForProfile) {
        setIsWaitingForProfile(true);
        
        // Try to refresh profile first
        refreshProfile().then(() => {
          // Wait a bit more for state to update
          setTimeout(() => {
            setIsWaitingForProfile(false);
          }, 500);
        }).catch(() => {
          setIsWaitingForProfile(false);
        });
        
        // Set a longer timeout before redirecting
        const timer = setTimeout(() => {
          // Only redirect if still no profile after refresh attempt
          setHasShownProfileToast(true);
          toast({
            title: "Profile Required",
            description: "Please complete your profile to continue.",
          });
          navigate("/candidate/signup", { replace: true });
        }, 3000); // Wait 3 seconds for profile sync
        
        return () => clearTimeout(timer);
      }
      return;
    }

    if (profile.role !== "candidate") {
      // Non-candidates should not access this page
      toast({
        title: "Access Denied",
        description: "This dashboard is for candidates only.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    fetchJobs();
    fetchApplicationCount();
    fetchInterviewCount();
    fetchMockTestSessions();
    // Wallet realtime subscription removed — candidate area is now subscription-only.

    // Subscribe to real-time job updates
    const channel = supabase
      .channel('jobs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs'
        },
        (payload) => {
          console.log('Real-time job update:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new.status === 'active') {
            // Add new active job to the list
            setJobs(prev => [payload.new as Job, ...prev].slice(0, 10));
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.status === 'active') {
              // Update existing job or add if newly activated
              setJobs(prev => {
                const exists = prev.some(job => job.id === payload.new.id);
                if (exists) {
                  return prev.map(job => job.id === payload.new.id ? payload.new as Job : job);
                } else {
                  return [payload.new as Job, ...prev].slice(0, 10);
                }
              });
            } else {
              // Remove job if no longer active
              setJobs(prev => prev.filter(job => job.id !== payload.new.id));
            }
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted job
            setJobs(prev => prev.filter(job => job.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, profile, navigate]);

  const handleApply = (job: Job) => {
    setSelectedJob(job);
    setIsApplicationModalOpen(true);
  };

  const handleApplicationSubmitted = () => {
    fetchApplicationCount();
    fetchInterviewCount();
  };

  const handleViewPipeline = (applicationId: string) => {
    setActiveMenu("pipeline");
  };

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "active")
        .order("posted_date", { ascending: false });

      if (error) throw error;
      
      const allJobs = data || [];

      // ── Hard cross-sector filter ───────────────────────────────────────────
      // Logic extracted to src/utils/sectorFilter.ts (covered by unit tests).
      const sectorFilteredJobs = filterJobsBySector(allJobs, profile);


      // Score and rank jobs based on candidate's profile
      const scoredJobs = sectorFilteredJobs.map((job) => {
        let score = 0;
        const matchReasons: string[] = [];
        
        if (profile) {
          // Match by preferred role (job title contains preferred role)
          if (profile.preferred_role && job.job_title) {
            const preferredRoleLower = profile.preferred_role.toLowerCase();
            const jobTitleLower = job.job_title.toLowerCase();
            const jobDeptLower = job.department?.toLowerCase() || '';
            const descLower = job.description?.toLowerCase() || '';
            
            if (jobTitleLower.includes(preferredRoleLower) || preferredRoleLower.includes(jobTitleLower)) {
              score += 30;
              matchReasons.push('role');
            } else if (jobDeptLower.includes(preferredRoleLower) || descLower.includes(preferredRoleLower)) {
              score += 15;
              matchReasons.push('role_partial');
            }
          }
          
          // Match by location (preferred district/state)
          if (job.location) {
            const jobLocationLower = job.location.toLowerCase();
            if (profile.preferred_district && jobLocationLower.includes(profile.preferred_district.toLowerCase())) {
              score += 20;
              matchReasons.push('location_district');
            } else if (profile.preferred_state && jobLocationLower.includes(profile.preferred_state.toLowerCase())) {
              score += 15;
              matchReasons.push('location_state');
            } else if (profile.preferred_district_2 && jobLocationLower.includes(profile.preferred_district_2.toLowerCase())) {
              score += 15;
              matchReasons.push('location_district2');
            } else if (profile.preferred_state_2 && jobLocationLower.includes(profile.preferred_state_2.toLowerCase())) {
              score += 10;
              matchReasons.push('location_state2');
            } else if (profile.current_district && jobLocationLower.includes(profile.current_district.toLowerCase())) {
              score += 10;
              matchReasons.push('location_current');
            } else if (profile.current_state && jobLocationLower.includes(profile.current_state.toLowerCase())) {
              score += 5;
              matchReasons.push('location_current_state');
            }
          }
          
          // Match by primary subject for education jobs
          if (profile.primary_subject && job.job_title) {
            const subjectLower = profile.primary_subject.toLowerCase();
            const jobTitleLower = job.job_title.toLowerCase();
            const descLower = job.description?.toLowerCase() || '';
            if (jobTitleLower.includes(subjectLower) || descLower.includes(subjectLower)) {
              score += 25;
              matchReasons.push('subject');
            }
          }
          
          // Match by segment (education/software)
          if (profile.segment && job.department) {
            const segmentLower = profile.segment.toLowerCase();
            const deptLower = job.department.toLowerCase();
            if (deptLower.includes(segmentLower) || segmentLower.includes(deptLower)) {
              score += 15;
              matchReasons.push('segment');
            }
          }
          
          // Match by experience level
          if (profile.experience_level && job.experience_required) {
            const expLower = profile.experience_level.toLowerCase();
            const jobExpLower = job.experience_required.toLowerCase();
            
            // Check if fresher and job is for freshers/0-1 years
            if ((expLower.includes('fresher') || expLower === '0') && 
                (jobExpLower.includes('fresher') || jobExpLower.includes('0-1') || jobExpLower.includes('entry'))) {
              score += 20;
              matchReasons.push('experience');
            } else if (expLower.includes('1-3') && jobExpLower.includes('1-3')) {
              score += 20;
              matchReasons.push('experience');
            } else if (expLower.includes('3-5') && (jobExpLower.includes('3-5') || jobExpLower.includes('2-5'))) {
              score += 20;
              matchReasons.push('experience');
            } else if (expLower.includes('5+') && (jobExpLower.includes('5+') || jobExpLower.includes('5-'))) {
              score += 20;
              matchReasons.push('experience');
            }
          }
          
          // Match by skills from resume analysis against job skills array
          const jobSkills = (job as any).skills as string[] | null;
          if (jobSkills && jobSkills.length > 0 && resumeAnalysis?.skill_highlights) {
            const candidateSkills = resumeAnalysis.skill_highlights.map((s: string) => s.toLowerCase());
            const matchedSkills = jobSkills.filter((skill: string) => 
              candidateSkills.some((cs: string) => cs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs))
            );
            if (matchedSkills.length > 0) {
              score += Math.min(30, matchedSkills.length * 8);
              matchReasons.push('skills');
            }
          }
          
          // Also match candidate skills against job description/requirements text
          if (resumeAnalysis?.skill_highlights && resumeAnalysis.skill_highlights.length > 0) {
            const descLower = job.description?.toLowerCase() || '';
            const reqLower = job.requirements?.toLowerCase() || '';
            const combinedText = descLower + ' ' + reqLower;
            if (combinedText.length > 0) {
              const descMatchedSkills = resumeAnalysis.skill_highlights.filter((skill: string) =>
                combinedText.includes(skill.toLowerCase())
              );
              if (descMatchedSkills.length > 0 && !matchReasons.includes('skills')) {
                score += Math.min(20, descMatchedSkills.length * 5);
                matchReasons.push('skills_desc');
              }
            }
          }

          // Match by languages
          if (profile.languages && profile.languages.length > 0 && job.description) {
            const descLower = job.description.toLowerCase();
            const matchedLangs = profile.languages.filter((lang: string) => descLower.includes(lang.toLowerCase()));
            if (matchedLangs.length > 0) {
              score += Math.min(10, matchedLangs.length * 5);
              matchReasons.push('languages');
            }
          }

          // Match by highest qualification
          if (profile.highest_qualification && job.requirements) {
            const qualLower = profile.highest_qualification.toLowerCase();
            const reqLower = job.requirements.toLowerCase();
            if (reqLower.includes(qualLower)) {
              score += 15;
              matchReasons.push('qualification');
            }
          }
          
          // Bonus for classes handled matching education jobs
          if (profile.classes_handled && job.job_title) {
            const classesLower = profile.classes_handled.toLowerCase();
            const jobTitleLower = job.job_title.toLowerCase();
            const descLower = job.description?.toLowerCase() || '';
            if (jobTitleLower.includes(classesLower) || descLower.includes(classesLower)) {
              score += 10;
              matchReasons.push('classes');
            }
          }
        }
        
        return { ...job, matchScore: score, matchReasons };
      });
      
      // Sort by score (descending) and take top jobs
      const sortedJobs = scoredJobs.sort((a, b) => b.matchScore - a.matchScore);
      
      // If no strong matches, show all jobs with at least some relevance or just recent jobs
      const suitableJobs = sortedJobs.filter(job => job.matchScore > 0);
      
      // If we have suitable jobs, show them; otherwise show recent jobs
      if (suitableJobs.length > 0) {
        setJobs(suitableJobs.slice(0, 10) as Job[]);
      } else {
        // Show recent jobs as fallback recommendations
        setJobs(sortedJobs.slice(0, 10) as Job[]);
      }
    } catch (error: any) {
      if (!isNetworkError(error)) {
        toast({
          title: "Error",
          description: friendlyError(error, "Failed to load jobs"),
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPageTitle = () => {
    switch (activeMenu) {
      case "dashboard": return `Welcome, ${profile?.full_name || 'User'}`;
      case "applications": return "My Applications";
      case "pipeline": return "Interview Pipeline";
      case "jobs": return "Suitable Jobs";
      case "resume": return "Resume Builder";
      
      case "upgrade": return "Upgrade Plans";
      case "settings": return "Settings";
      default: return `Welcome, ${profile?.full_name || 'User'}`;
    }
  };

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-subtle">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If not authenticated or no profile after loading, the useEffect will handle redirect
  if (!profile) {
    return null;
  }

  return (
    <div className="bg-subtle flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? "w-64" : "w-0"
        } bg-card border-r border-border transition-all duration-300 overflow-hidden flex flex-col fixed top-[64px] left-0 h-[calc(100vh-64px)] z-40`}
      >

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeMenu === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if ((item as any).link) {
                    navigate((item as any).link);
                    return;
                  }
                  setActiveMenu(item.id);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? "bg-accent/10 text-accent font-medium border-l-4 border-accent -ml-1 pl-5"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm whitespace-nowrap">{item.label}</span>
                {item.id === "applications" && applicationCount > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs flex-shrink-0">
                    {applicationCount}
                  </Badge>
                )}
                {item.id === "pipeline" && interviewCount > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs flex-shrink-0">
                    {interviewCount}
                  </Badge>
                )}
                {item.id === "wallet" && (
                  <Badge variant="secondary" className="ml-auto text-xs flex-shrink-0 bg-primary/10 text-primary border-primary/20">
                    {candidateSub.planDef.name}
                  </Badge>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-border">
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 overflow-hidden ${sidebarOpen ? "ml-64" : "ml-0"}`}>
        {/* Top Header */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-muted-foreground hover:text-foreground"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            {/* Profile Badge */}
            <div className="flex items-center gap-3 mr-4">
              {profile?.profile_picture ? (
                <img 
                  src={profile.profile_picture} 
                  alt={profile.full_name || 'Profile'} 
                  className="h-10 w-10 rounded-full object-cover border-2 border-border"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center border-2 border-border">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground">Candidate</p>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              {getPageTitle()}
            </h1>
          </div>

          {activeMenu === "dashboard" && (
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                onClick={async () => {
                  if (!profile) return;
                  // Fetch interview pipeline data
                  let interviewPipelineResults: any[] = [];
                  try {
                    const { data: icData } = await supabase
                      .from('interview_candidates')
                      .select('id, job_id, status, current_stage_id, applied_at, job:jobs(job_title, employer_id, employer:profiles!jobs_employer_id_fkey(company_name))')
                      .eq('candidate_id', profile.id);

                    if (icData && icData.length > 0) {
                      const { data: allStages } = await supabase
                        .from('interview_stages')
                        .select('id, name, stage_order')
                        .order('stage_order');

                      interviewPipelineResults = await Promise.all(icData.map(async (ic: any) => {
                        const { data: events } = await supabase
                          .from('interview_events')
                          .select('id, stage_id, status, completed_at, ai_score, notes')
                          .eq('interview_candidate_id', ic.id);

                        const eventIds = (events || []).map((e: any) => e.id);
                        let responses: any[] = [];
                        if (eventIds.length > 0) {
                          const { data: respData } = await supabase
                            .from('interview_responses')
                            .select('interview_event_id, score, total_questions, correct_answers, time_taken_seconds')
                            .in('interview_event_id', eventIds);
                          responses = respData || [];
                        }

                        const { data: mgmtReviews } = await supabase
                          .from('management_reviews')
                          .select('reviewer_name, overall_rating, teaching_skills_rating, communication_rating, subject_knowledge_rating, recommendation, feedback_text, status, feedback_type')
                          .eq('interview_candidate_id', ic.id);

                        const allowedStages = ['Written Test', 'Segment Feedback', 'Admin & Academic Feedback', 'Management Round Feedback', 'HR Feedback'];
                        const currentStage = (allStages || []).find((s: any) => s.id === ic.current_stage_id);
                        const currentStageOrder = currentStage?.stage_order ?? -1;

                        const feedbackTypeMap: Record<string, string> = {
                          'Segment Feedback': 'segment',
                          'Admin & Academic Feedback': 'admin_academic',
                          'Core Team Feedback': 'core_team',
                          'Management Round Feedback': 'management',
                          'HR Feedback': 'hr',
                        };

                        const stageReviews = (allStages || [])
                          .filter((s: any) => allowedStages.includes(s.name))
                          .map((stage: any) => {
                            const stageEvents = (events || []).filter((e: any) => e.stage_id === stage.id);
                            const event = stageEvents.find((e: any) => e.status === 'completed' || e.status === 'passed') || stageEvents[0] || null;
                            const isCompleted = event?.status === 'completed' || event?.status === 'passed';
                            const isSkipped = !isCompleted && stage.stage_order < currentStageOrder;

                            const review: any = {
                              stageName: stage.name,
                              stageOrder: stage.stage_order,
                              score: event?.ai_score || null,
                              status: isSkipped ? 'skipped' : (event?.status || null),
                              completedAt: event?.completed_at || null,
                              notes: event?.notes || null,
                            };

                            if (stage.name === 'Written Test' && event) {
                              const resp = responses.find((r: any) => r.interview_event_id === event.id);
                              if (resp) {
                                review.totalQuestions = resp.total_questions;
                                review.correctAnswers = resp.correct_answers;
                                review.timeTaken = resp.time_taken_seconds;
                                review.score = resp.score || review.score;
                              }
                            }

                            const feedbackTypeForStage = feedbackTypeMap[stage.name];
                            if (feedbackTypeForStage) {
                              const submittedReviews = (mgmtReviews || []).filter((r: any) =>
                                r.status === 'submitted' && r.feedback_type === feedbackTypeForStage
                              );
                              if (submittedReviews.length > 0) {
                                review.reviews = submittedReviews.map((r: any) => ({
                                  reviewerName: r.reviewer_name,
                                  overallRating: r.overall_rating,
                                  teachingRating: r.teaching_skills_rating,
                                  communicationRating: r.communication_rating,
                                  knowledgeRating: r.subject_knowledge_rating,
                                  recommendation: r.recommendation,
                                  feedbackText: r.feedback_text,
                                }));
                                const avgRating = submittedReviews.reduce((sum: number, r: any) => sum + (r.overall_rating || 0), 0) / submittedReviews.length;
                                review.score = Math.round((avgRating / 5) * 100);
                              }
                            }
                            return review;
                          });

                        return {
                          jobTitle: (ic.job as any)?.job_title || 'Unknown Job',
                          companyName: (ic.job as any)?.employer?.company_name || '-',
                          appliedAt: ic.applied_at,
                          overallStatus: ic.status,
                          stageReviews,
                        };
                      }));
                    }
                  } catch (err) {
                    console.error('Error fetching pipeline for PDF:', err);
                  }

                  exportProfileToPdf({
                    profile: profile as any,
                    resumeAnalysis,
                    educationRecords,
                    experienceRecords,
                    familyRecords,
                    addressData,
                    mockTestResults: mockTestSessions,
                    mockInterviewSessions,
                    mockInterviewStageResults,
                    interviewPipelineResults,
                  });
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" onClick={() => navigate("/profile/edit")}>
                <User className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          )}
        </header>



        {/* Dashboard Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            {/* Dashboard View */}
            {activeMenu === "dashboard" && (
              <>
                {/* Registration Number Banner */}

                {/* AI Resume Analysis Section */}
                <Card className="mb-6 overflow-hidden border-border">
                  <CardHeader className="bg-gradient-to-r from-accent/10 via-primary/5 to-accent/10 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-accent/20 rounded-lg">
                          <Sparkles className="h-5 w-5 text-accent" />
                        </div>
                        <CardTitle className="text-lg font-semibold text-foreground">
                          AI Detected Profile Details
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          ref={resumeInputRef}
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={handleResumeUpload}
                          className="hidden"
                        />
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => resumeInputRef.current?.click()}
                          disabled={isUploadingResume}
                        >
                          {isUploadingResume ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-2" />
                          )}
                          {isUploadingResume ? 'Analyzing...' : (profile?.resume_url ? 'Update Resume' : 'Upload Resume')}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Profile Picture & Resume Score */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-4">
                        {/* Profile Picture */}
                        <div className="flex-shrink-0">
                          {profile?.profile_picture ? (
                            <div className="w-28 h-28 rounded-full border-4 border-accent/30 overflow-hidden shadow-lg">
                              <img 
                                src={profile.profile_picture} 
                                alt={profile?.full_name || 'Profile'} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-28 h-28 rounded-full border-4 border-dashed border-border bg-muted flex items-center justify-center">
                              <User className="h-12 w-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        {/* Resume Score */}
                        <div className="flex flex-col items-center flex-shrink-0">
                          <div className="relative w-20 h-20 flex-shrink-0">
                            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                              <circle
                                cx="40"
                                cy="40"
                                r="32"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="transparent"
                                className="text-muted"
                              />
                              <circle
                                cx="40"
                                cy="40"
                                r="32"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="transparent"
                            strokeDasharray={201}
                            strokeDashoffset={201 * (1 - ((resumeAnalysis?.overall_score ?? 0) / 100))}
                            className="text-accent transition-all duration-1000"
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xl font-bold text-foreground">
                                {resumeAnalysis?.overall_score ?? 0}%
                              </span>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-muted-foreground mt-1">Resume Score</span>
                        </div>
                      </div>

                      {/* Detected Profile Details - Table Format */}
                      <div className="flex-1">
                        
                        <div className="border border-border rounded-lg overflow-hidden">
                          <table className="w-full text-sm">
                            <tbody>
                              {/* Row 0: Registration Number */}
                              <tr className="border-b border-border bg-accent/5">
                                <td className="px-3 py-2 bg-accent/10 font-medium text-accent w-1/4">REG. NUMBER</td>
                                <td className="px-3 py-2 text-accent font-bold tracking-wider" colSpan={3}>{profile?.registration_number || '-'}</td>
                                <td className="px-3 py-2 text-right">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => {
                                      navigator.clipboard.writeText(profile?.registration_number || '');
                                      toast({ title: "Copied!", description: "Registration number copied to clipboard" });
                                    }}
                                  >
                                    Copy
                                  </Button>
                                </td>
                              </tr>
                              {/* Row 1: Name and Date */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground w-1/4">NAME</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.full_name || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground w-1/6">Date</td>
                                <td className="px-3 py-2 text-foreground">{profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-IN') : '-'}</td>
                              </tr>
                              {/* Row 2: Current State and Current District */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">CURRENT STATE</td>
                                <td className="px-3 py-2 text-foreground">{profile?.current_state || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">CURRENT DISTRICT</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.current_district || '-'}</td>
                              </tr>
                              {/* Row 3: DOB and Gender */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">DOB</td>
                                <td className="px-3 py-2 text-foreground">{profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">GENDER</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.gender || '-'}</td>
                              </tr>
                              {/* Row 4: Qualification and Office Type */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">QUALIFICATION</td>
                                <td className="px-3 py-2 text-foreground">{profile?.highest_qualification || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">OFFICE TYPE</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.office_type || '-'}</td>
                              </tr>
                              {/* Row 5: Industry Category */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">INDUSTRY CATEGORY</td>
                                <td className="px-3 py-2 text-foreground" colSpan={4}>{profile?.category || '-'}</td>
                              </tr>
                              {/* Row 5a: Segment/Designation and Primary Subject/Skill */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">
                                  {profile?.category === 'IT Corporate' ? 'DESIGNATION' :
                                   profile?.category === 'Legal' ? 'DESIGNATION' :
                                   profile?.category === 'Doctor' ? 'QUALIFICATION' :
                                   profile?.category === 'Civil Service' ? 'DESIGNATION' :
                                   profile?.category === 'Real Estate & Infrastructure' ? 'DESIGNATION' :
                                   profile?.category === 'Freelance / Independent Professionals' ? 'WORK TYPE' :
                                   'SEGMENT'}
                                </td>
                                <td className="px-3 py-2 text-foreground">{profile?.segment || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">
                                  {profile?.category === 'IT Corporate' ? 'SKILLS / DOMAIN' :
                                   profile?.category === 'Legal' ? 'SPECIALIZATION' :
                                   profile?.category === 'Doctor' ? 'SPECIALIZATION' :
                                   profile?.category === 'Civil Service' ? 'DEPARTMENT' :
                                   profile?.category === 'Real Estate & Infrastructure' ? 'SPECIALIZATION' :
                                   profile?.category === 'Freelance / Independent Professionals' ? 'DOMAIN' :
                                   'PRIMARY SUBJECT'}
                                </td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.primary_subject || '-'}</td>
                              </tr>
                              {/* Row 5b: Current Salary and Expected Salary */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">CURRENT SALARY</td>
                                <td className="px-3 py-2 text-foreground">{(profile as any)?.current_salary ? `₹${Number((profile as any).current_salary).toLocaleString('en-IN')}` : '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">EXPECTED SALARY</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{(profile as any)?.expected_salary ? `₹${Number((profile as any).expected_salary).toLocaleString('en-IN')}` : '-'}</td>
                              </tr>
                              {/* Row 5c: Available From and Program */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">AVAILABLE FROM</td>
                                <td className="px-3 py-2 text-foreground">{(profile as any)?.available_from ? new Date((profile as any).available_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">PROGRAM</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.program || '-'}</td>
                              </tr>
                              {/* Education-specific rows - only show for Education category */}
                              {profile?.category === 'Education' && (
                                <>
                                  <tr className="border-b border-border">
                                    <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">CLASSES HANDLED</td>
                                    <td className="px-3 py-2 text-foreground">{profile?.classes_handled || '-'}</td>
                                    <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">BATCH</td>
                                    <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.batch || '-'}</td>
                                  </tr>
                                </>
                              )}
                              {/* Languages Known */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">LANGUAGES KNOWN</td>
                                <td className="px-3 py-2 text-foreground" colSpan={4}>{profile?.languages?.length ? profile.languages.join(', ') : '-'}</td>
                              </tr>
                              {/* Row 8: Preferred State 1 and District 1 */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">PREFERRED STATE</td>
                                <td className="px-3 py-2 text-foreground">{profile?.preferred_state || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">PREFERRED DISTRICT</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.preferred_district || '-'}</td>
                              </tr>
                              {/* Row 9: Preferred State 2 and District 2 */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">PREFERRED STATE 2</td>
                                <td className="px-3 py-2 text-foreground">{profile?.preferred_state_2 || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">PREFERRED DISTRICT 2</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.preferred_district_2 || '-'}</td>
                              </tr>
                              {/* Row 10: Mobile 1 and Mobile 2 */}
                              <tr className="border-b border-border">
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">MOBILE-1</td>
                                <td className="px-3 py-2 text-foreground">{profile?.mobile || '-'}</td>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">MOBILE-2</td>
                                <td className="px-3 py-2 text-foreground" colSpan={2}>{profile?.alternate_number || '-'}</td>
                              </tr>
                              {/* Row 11: Email */}
                              <tr>
                                <td className="px-3 py-2 bg-muted/30 font-medium text-muted-foreground">e-Mail</td>
                                <td className="px-3 py-2 text-foreground" colSpan={4}>{profile?.email || '-'}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate("/profile/edit")}
                          >
                            <User className="h-4 w-4 mr-2" />
                            Edit Profile
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Resume Analysis - Separate Card (Always Visible) */}
                <Card className="mb-6 overflow-hidden border-green-200 dark:border-green-800">
                  <CardHeader className="bg-gradient-to-r from-green-100 via-emerald-50 to-green-100 dark:from-green-950 dark:via-emerald-950 dark:to-green-950 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                          <Sparkles className="h-5 w-5 text-green-600" />
                        </div>
                        <CardTitle className="text-lg font-semibold text-foreground">
                          AI Resume Analysis
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="text-3xl font-bold text-green-600">
                            {resumeAnalysis?.overall_score ?? '-'}<span className="text-sm text-muted-foreground">/100</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Overall Score</p>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="border border-green-200 dark:border-green-800 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <tbody>
                          {/* Score Progress */}
                          <tr className="border-b border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                            <td className="px-4 py-3 font-medium text-green-700 dark:text-green-400 w-1/4">SCORE</td>
                            <td className="px-4 py-3" colSpan={3}>
                              <div className="flex items-center gap-3">
                                <Progress value={resumeAnalysis?.overall_score ?? 0} className="flex-1 h-3" />
                                <span className="text-sm font-semibold text-green-600 min-w-[50px] text-right">
                                  {resumeAnalysis?.overall_score ?? 0}%
                                </span>
                              </div>
                            </td>
                          </tr>
                          {/* Career Level */}
                          <tr className="border-b border-green-200 dark:border-green-800">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-muted-foreground">CAREER LEVEL</td>
                            <td className="px-4 py-3 text-foreground" colSpan={3}>
                              {resumeAnalysis?.career_level ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                  {resumeAnalysis.career_level}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground italic">Not analyzed yet</span>
                              )}
                            </td>
                          </tr>
                          {/* Experience Summary */}
                          <tr className="border-b border-green-200 dark:border-green-800">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-muted-foreground align-top">EXPERIENCE SUMMARY</td>
                            <td className="px-4 py-3 text-foreground" colSpan={3}>
                              {resumeAnalysis?.experience_summary || <span className="text-muted-foreground italic">Not analyzed yet</span>}
                            </td>
                          </tr>
                          {/* Strengths */}
                          <tr className="border-b border-green-200 dark:border-green-800">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-muted-foreground align-top">STRENGTHS</td>
                            <td className="px-4 py-3" colSpan={3}>
                              {resumeAnalysis?.strengths && resumeAnalysis.strengths.length > 0 ? (
                                <ul className="space-y-1.5">
                                  {resumeAnalysis.strengths.map((strength, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                      <span className="text-foreground">{strength}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-muted-foreground italic">Not analyzed yet</span>
                              )}
                            </td>
                          </tr>
                          {/* Areas for Improvement */}
                          <tr className="border-b border-green-200 dark:border-green-800">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-muted-foreground align-top">AREAS TO IMPROVE</td>
                            <td className="px-4 py-3" colSpan={3}>
                              {resumeAnalysis?.improvements && resumeAnalysis.improvements.length > 0 ? (
                                <ul className="space-y-1.5">
                                  {resumeAnalysis.improvements.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <TrendingUp className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                      <span className="text-foreground">{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-muted-foreground italic">Not analyzed yet</span>
                              )}
                            </td>
                          </tr>
                          {/* Skill Highlights */}
                          <tr>
                            <td className="px-4 py-3 bg-muted/30 font-medium text-muted-foreground align-top">KEY SKILLS</td>
                            <td className="px-4 py-3" colSpan={3}>
                              {resumeAnalysis?.skill_highlights && resumeAnalysis.skill_highlights.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {resumeAnalysis.skill_highlights.map((skill, idx) => (
                                    <Badge key={idx} variant="outline" className="bg-primary/5 text-primary border-primary/30">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">Not analyzed yet</span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Educational Qualification Table */}
                <Card className="overflow-hidden border-border shadow-soft">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                          <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-foreground">Educational Qualification</CardTitle>
                          <p className="text-sm text-muted-foreground">Your academic background</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingEducation(null);
                          setIsEducationModalOpen(true);
                        }}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 overflow-x-auto">
                    <div className="border border-border rounded-lg overflow-hidden min-w-[700px]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">EDUCATION</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">SCHOOL/COLLEGE NAME</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">SPECIALIZATION</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">BOARD/UNIVERSITY</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">YEAR</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">% MARKS</th>
                            <th className="px-4 py-3 text-center font-semibold text-foreground border-b border-border">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {educationRecords.length > 0 ? (
                            educationRecords.map((record) => (
                              <tr key={record.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-foreground font-medium">
                                  {record.education_level}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {record.school_college_name || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {record.specialization || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {record.board_university || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {record.year_of_passing || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {record.percentage_marks !== null ? `${record.percentage_marks}%` : <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setEditingEducation(record);
                                        setIsEducationModalOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => record.id && handleDeleteEducation(record.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p>No education records added yet.</p>
                                <Button
                                  variant="link"
                                  onClick={() => {
                                    setEditingEducation(null);
                                    setIsEducationModalOpen(true);
                                  }}
                                  className="mt-1"
                                >
                                  Add your first qualification
                                </Button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Previous Experience Table */}
                <Card className="overflow-hidden border-border shadow-soft">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-b border-orange-200 dark:border-orange-800">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                          <Briefcase className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-foreground">Previous Experience</CardTitle>
                          <p className="text-sm text-muted-foreground">Your work history</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingExperience(null);
                          setIsExperienceModalOpen(true);
                        }}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 overflow-x-auto">
                    <div className="border border-border rounded-lg overflow-hidden min-w-[900px]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-3 py-3 text-left font-semibold text-foreground border-b border-border">ORGANIZATION</th>
                            <th className="px-3 py-3 text-left font-semibold text-foreground border-b border-border">DEPT & DESIGNATION</th>
                            <th className="px-3 py-3 text-left font-semibold text-foreground border-b border-border">FROM DATE</th>
                            <th className="px-3 py-3 text-left font-semibold text-foreground border-b border-border">TO DATE</th>
                            <th className="px-3 py-3 text-left font-semibold text-foreground border-b border-border">SALARY (PM)</th>
                            <th className="px-3 py-3 text-left font-semibold text-foreground border-b border-border">PLACE</th>
                            <th className="px-3 py-3 text-left font-semibold text-foreground border-b border-border">REF. NAME & MOBILE</th>
                            <th className="px-3 py-3 text-center font-semibold text-foreground border-b border-border">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {experienceRecords.length > 0 ? (
                            experienceRecords.map((record) => (
                              <tr key={record.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                                <td className="px-3 py-3 text-foreground font-medium">
                                  <div>{record.organization}</div>
                                  {record.worked_with_narayana && (
                                    <Badge variant="outline" className="text-xs mt-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
                                      Narayana {record.narayana_emp_id && `(${record.narayana_emp_id})`}
                                    </Badge>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-foreground">
                                  {record.department || record.designation ? (
                                    <div>
                                      {record.department && <div className="text-muted-foreground text-xs">{record.department}</div>}
                                      {record.designation && <div>{record.designation}</div>}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground italic">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-foreground">
                                  {record.from_date || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-3 py-3 text-foreground">
                                  {record.to_date || <span className="text-muted-foreground italic">Present</span>}
                                </td>
                                <td className="px-3 py-3 text-foreground">
                                  {record.salary_per_month !== null ? `₹${record.salary_per_month.toLocaleString()}` : <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-3 py-3 text-foreground">
                                  {record.place || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-3 py-3 text-foreground">
                                  {record.reference_name || record.reference_mobile ? (
                                    <div>
                                      {record.reference_name && <div>{record.reference_name}</div>}
                                      {record.reference_mobile && <div className="text-muted-foreground text-xs">{record.reference_mobile}</div>}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground italic">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setEditingExperience(record);
                                        setIsExperienceModalOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => record.id && handleDeleteExperience(record.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                                <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p>No experience records added yet.</p>
                                <Button
                                  variant="link"
                                  onClick={() => {
                                    setEditingExperience(null);
                                    setIsExperienceModalOpen(true);
                                  }}
                                  className="mt-1"
                                >
                                  Add your first work experience
                                </Button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Family Details Table */}
                <Card className="overflow-hidden border-border shadow-soft">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-b border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                          <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-foreground">Family Details</CardTitle>
                          <p className="text-sm text-muted-foreground">Your family members information</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          setEditingFamily(null);
                          setIsFamilyModalOpen(true);
                        }}
                        className="gap-1"
                      >
                        <Plus className="h-4 w-4" />
                        Add
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 overflow-x-auto">
                    <div className="border border-border rounded-lg overflow-hidden min-w-[600px]">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">BLOOD RELATION</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">NAME AS PER AADHAR</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">DOB</th>
                            <th className="px-4 py-3 text-center font-semibold text-foreground border-b border-border">IS DEPENDENT</th>
                            <th className="px-4 py-3 text-center font-semibold text-foreground border-b border-border">AGE</th>
                            <th className="px-4 py-3 text-center font-semibold text-foreground border-b border-border">ACTIONS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {familyRecords.length > 0 ? (
                            familyRecords.map((record) => (
                              <tr key={record.id} className="border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 text-foreground font-medium">
                                  {record.blood_relation}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {record.name_as_per_aadhar || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3 text-foreground">
                                  {record.date_of_birth || <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <Badge variant={record.is_dependent ? "default" : "outline"} className={record.is_dependent ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : ""}>
                                    {record.is_dependent ? "Yes" : "No"}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-center text-foreground">
                                  {record.age !== null ? record.age : <span className="text-muted-foreground italic">-</span>}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => {
                                        setEditingFamily(record);
                                        setIsFamilyModalOpen(true);
                                      }}
                                    >
                                      <Pencil className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => record.id && handleDeleteFamily(record.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                                <p>No family members added yet.</p>
                                <Button
                                  variant="link"
                                  onClick={() => {
                                    setEditingFamily(null);
                                    setIsFamilyModalOpen(true);
                                  }}
                                  className="mt-1"
                                >
                                  Add your first family member
                                </Button>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Address Details Table */}
                <Card className="overflow-hidden border-border shadow-soft">
                  <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30 border-b border-teal-200 dark:border-teal-800">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/50 rounded-lg">
                          <MapPin className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-foreground">Address Details</CardTitle>
                          <p className="text-sm text-muted-foreground">Your present and permanent address</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsAddressModalOpen(true)}
                        className="gap-1"
                      >
                        <Pencil className="h-4 w-4" />
                        {addressData ? "Edit" : "Add"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 overflow-x-auto">
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border w-1/4"></th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">PRESENT ADDRESS</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground border-b border-border">PERMANENT ADDRESS</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-primary">D.No. / Flat No.</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.present_door_flat_no || <span className="text-muted-foreground italic">-</span>}</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.permanent_door_flat_no || <span className="text-muted-foreground italic">-</span>}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-primary">Street</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.present_street || <span className="text-muted-foreground italic">-</span>}</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.permanent_street || <span className="text-muted-foreground italic">-</span>}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-primary">Village / Area</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.present_village_area || <span className="text-muted-foreground italic">-</span>}</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.permanent_village_area || <span className="text-muted-foreground italic">-</span>}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-primary">Mandal</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.present_mandal || <span className="text-muted-foreground italic">-</span>}</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.permanent_mandal || <span className="text-muted-foreground italic">-</span>}</td>
                          </tr>
                          <tr className="border-b border-border">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-primary">District</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.present_district || <span className="text-muted-foreground italic">-</span>}</td>
                            <td className="px-4 py-3 text-foreground">{addressData?.permanent_district || <span className="text-muted-foreground italic">-</span>}</td>
                          </tr>
                          <tr className="border-b-0">
                            <td className="px-4 py-3 bg-muted/30 font-medium text-primary">State & Pin Code</td>
                            <td className="px-4 py-3 text-foreground">
                              {addressData?.present_state || addressData?.present_pin_code ? (
                                <>{addressData.present_state}{addressData.present_state && addressData.present_pin_code ? " - " : ""}{addressData.present_pin_code}</>
                              ) : (
                                <span className="text-muted-foreground italic">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {addressData?.permanent_state || addressData?.permanent_pin_code ? (
                                <>{addressData.permanent_state}{addressData.permanent_state && addressData.permanent_pin_code ? " - " : ""}{addressData.permanent_pin_code}</>
                              ) : (
                                <span className="text-muted-foreground italic">-</span>
                              )}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Mock Test Results Section */}
                {mockTestSessions.filter(s => s.status === 'completed').length > 0 && (
                  <Card className="mt-6 overflow-hidden border-border shadow-soft">
                    <CardHeader className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-b border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg">
                            <Target className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <CardTitle className="text-lg text-foreground">Mock Test Results</CardTitle>
                            <p className="text-sm text-muted-foreground">Your completed mock test performance</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveMenu("mocktest")}
                          className="gap-1"
                        >
                          <Target className="h-4 w-4" />
                          Take New Test
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="space-y-4">
                        {mockTestSessions
                          .filter(s => s.status === 'completed')
                          .slice(0, 3)
                          .map((session) => {
                            const scorePercent = session.score || 0;
                            const isPassed = scorePercent >= 60;
                            return (
                              <div 
                                key={session.id} 
                                className={`p-4 rounded-lg border ${
                                  isPassed 
                                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                                    : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
                                }`}
                              >
                                <div className="flex items-center justify-between flex-wrap gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${
                                      isPassed 
                                        ? 'bg-green-100 dark:bg-green-900/50' 
                                        : 'bg-amber-100 dark:bg-amber-900/50'
                                    }`}>
                                      {isPassed ? (
                                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                                      ) : (
                                        <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-foreground">Mock Test</h4>
                                        <Badge variant={isPassed ? "default" : "secondary"} className={
                                          isPassed 
                                            ? "bg-green-500 text-white" 
                                            : "bg-amber-500 text-white"
                                        }>
                                          {isPassed ? "Passed" : "Needs Improvement"}
                                        </Badge>
                                      </div>
                                      <p className="text-sm text-muted-foreground">
                                        {new Date(session.completed_at || session.created_at).toLocaleDateString('en-IN', {
                                          day: 'numeric',
                                          month: 'short',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="text-center">
                                      <div className={`text-2xl font-bold ${
                                        isPassed ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                                      }`}>
                                        {scorePercent.toFixed(0)}%
                                      </div>
                                      <div className="text-xs text-muted-foreground">Score</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-lg font-semibold text-foreground">
                                        {session.correct_answers || 0}/{session.total_questions || 10}
                                      </div>
                                      <div className="text-xs text-muted-foreground">Correct</div>
                                    </div>
                                    {session.time_taken_seconds && (
                                      <div className="text-center">
                                        <div className="text-lg font-semibold text-foreground">
                                          {Math.floor(session.time_taken_seconds / 60)}m {session.time_taken_seconds % 60}s
                                        </div>
                                        <div className="text-xs text-muted-foreground">Time</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Progress bar */}
                                <div className="mt-3">
                                  <Progress 
                                    value={scorePercent} 
                                    className={`h-2 ${isPassed ? '[&>div]:bg-green-500' : '[&>div]:bg-amber-500'}`}
                                  />
                                </div>
                                {/* View recording button */}
                                {session.recording_url && (
                                  <div className="mt-3 flex justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(session.recording_url, '_blank')}
                                      className="gap-1.5"
                                    >
                                      <Video className="h-3.5 w-3.5" />
                                      View Recording
                                    </Button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        {mockTestSessions.filter(s => s.status === 'completed').length > 3 && (
                          <div className="text-center pt-2">
                            <Button 
                              variant="link" 
                              onClick={() => setActiveMenu("mocktest")}
                              className="text-sm"
                            >
                              View all {mockTestSessions.filter(s => s.status === 'completed').length} completed tests
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* AI Learning Recommendations after Mock Test */}
                {mockInterviewStageResults.length > 0 && (
                  <div className="mt-6">
                    <AILearningRecommendations 
                      stageResults={mockInterviewStageResults} 
                      candidateProfile={profile}
                      compact={true}
                    />
                  </div>
                )}

                {/* Personalized Job Recommendations */}
                <Card className="mt-6 overflow-hidden border-border">
                  <CardHeader className="bg-gradient-to-r from-accent/10 via-primary/5 to-accent/10 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-accent/20 rounded-lg">
                          <Sparkles className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-foreground">
                            Personalized Job Recommendations
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Jobs matching your skills and preferences
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setActiveMenu("jobs")}>
                        View All Jobs
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    {jobs.length > 0 ? (
                      <div className="grid gap-4">
                        {jobs.slice(0, 4).map((job) => {
                          // Generate human-readable match reasons
                          const matchReasons: string[] = [];
                          const jobWithScore = job as Job & { matchScore?: number; matchReasons?: string[] };
                          
                          if (profile?.preferred_role && job.job_title) {
                            const preferredRoleLower = profile.preferred_role.toLowerCase();
                            const jobTitleLower = job.job_title.toLowerCase();
                            const jobDeptLower = job.department?.toLowerCase() || '';
                            if (jobTitleLower.includes(preferredRoleLower) || preferredRoleLower.includes(jobTitleLower) || jobDeptLower.includes(preferredRoleLower)) {
                              matchReasons.push(`Matches your preferred role: ${profile.preferred_role}`);
                            }
                          }
                          
                          if (job.location && profile) {
                            const jobLocationLower = job.location.toLowerCase();
                            if (profile.preferred_district && jobLocationLower.includes(profile.preferred_district.toLowerCase())) {
                              matchReasons.push(`Located in your preferred district: ${profile.preferred_district}`);
                            } else if (profile.preferred_state && jobLocationLower.includes(profile.preferred_state.toLowerCase())) {
                              matchReasons.push(`Located in your preferred state: ${profile.preferred_state}`);
                            } else if (profile.current_district && jobLocationLower.includes(profile.current_district.toLowerCase())) {
                              matchReasons.push(`Near your current location`);
                            } else if (profile.current_state && jobLocationLower.includes(profile.current_state.toLowerCase())) {
                              matchReasons.push(`In your current state: ${profile.current_state}`);
                            }
                          }
                          
                          if (profile?.primary_subject && job.job_title) {
                            const subjectLower = profile.primary_subject.toLowerCase();
                            const jobTitleLower = job.job_title.toLowerCase();
                            const descLower = job.description?.toLowerCase() || '';
                            if (jobTitleLower.includes(subjectLower) || descLower.includes(subjectLower)) {
                              matchReasons.push(`Related to your subject: ${profile.primary_subject}`);
                            }
                          }
                          
                          if (profile?.segment && job.department) {
                            const segmentLower = profile.segment.toLowerCase();
                            const deptLower = job.department.toLowerCase();
                            if (deptLower.includes(segmentLower) || segmentLower.includes(deptLower)) {
                              matchReasons.push(`Matches your ${profile.segment} background`);
                            }
                          }
                          
                          // Check for skill matches
                          const jobSkills = (job as any).skills as string[] | null;
                          if (jobSkills && jobSkills.length > 0 && resumeAnalysis?.skill_highlights) {
                            const candidateSkills = resumeAnalysis.skill_highlights.map((s: string) => s.toLowerCase());
                            const matchedSkills = jobSkills.filter((skill: string) => 
                              candidateSkills.some((cs: string) => cs.includes(skill.toLowerCase()) || skill.toLowerCase().includes(cs))
                            );
                            if (matchedSkills.length > 0) {
                              matchReasons.push(`${matchedSkills.length} skills match: ${matchedSkills.slice(0, 3).join(', ')}${matchedSkills.length > 3 ? '...' : ''}`);
                            }
                          }

                          // Check skills against job description
                          if (resumeAnalysis?.skill_highlights && resumeAnalysis.skill_highlights.length > 0 && !matchReasons.some(r => r.includes('skills match'))) {
                            const descLower = job.description?.toLowerCase() || '';
                            const reqLower = (job as any).requirements?.toLowerCase() || '';
                            const combinedText = descLower + ' ' + reqLower;
                            if (combinedText.length > 0) {
                              const descMatchedSkills = resumeAnalysis.skill_highlights.filter((skill: string) =>
                                combinedText.includes(skill.toLowerCase())
                              );
                              if (descMatchedSkills.length > 0) {
                                matchReasons.push(`Your skills match: ${descMatchedSkills.slice(0, 3).join(', ')}${descMatchedSkills.length > 3 ? '...' : ''}`);
                              }
                            }
                          }

                          // Check qualification match
                          if (profile?.highest_qualification && (job as any).requirements) {
                            const qualLower = profile.highest_qualification.toLowerCase();
                            const reqLower = (job as any).requirements.toLowerCase();
                            if (reqLower.includes(qualLower)) {
                              matchReasons.push(`Matches your qualification: ${profile.highest_qualification}`);
                            }
                          }
                          
                          // Use stored matchScore or calculate based on reasons
                          const matchScore = jobWithScore.matchScore 
                            ? Math.min(95, 50 + Math.round(jobWithScore.matchScore * 0.5)) 
                            : Math.min(95, 55 + (matchReasons.length * 10));
                          
                          // Default reason if no matches found but job is shown
                          if (matchReasons.length === 0) {
                            matchReasons.push('Recently posted opportunity');
                          }
                          
                          return (
                            <Card 
                              key={job.id} 
                              className="p-4 hover:shadow-lg transition-all duration-300 border-border hover:border-accent/30 bg-gradient-to-r from-background to-muted/20"
                            >
                              <div className="flex flex-col sm:flex-row justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-start gap-3">
                                    <div className="p-2 bg-accent/10 rounded-lg shrink-0">
                                      <Briefcase className="h-5 w-5 text-accent" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-semibold text-foreground">{job.job_title}</h4>
                                        <Badge variant="secondary" className="bg-accent/10 text-accent text-xs">
                                          {matchScore}% Match
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                                        {job.department && (
                                          <span className="flex items-center gap-1">
                                            <Briefcase className="h-3 w-3" />
                                            {job.department}
                                          </span>
                                        )}
                                        {job.location && (
                                          <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {job.location}
                                          </span>
                                        )}
                                        {job.salary_range && (
                                          <span className="text-accent font-medium">
                                            {job.salary_range}
                                          </span>
                                        )}
                                      </div>
                                      
                                      {/* Match Reasons */}
                                      <div className="mt-2 flex flex-wrap gap-1.5">
                                        {matchReasons.slice(0, 2).map((reason, idx) => (
                                          <span 
                                            key={idx}
                                            className="inline-flex items-center gap-1 text-xs bg-success/10 text-success px-2 py-0.5 rounded-full"
                                          >
                                            <CheckCircle className="h-3 w-3" />
                                            {reason}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center sm:items-start gap-2 sm:flex-col">
                                  <Button 
                                    variant="cta" 
                                    size="sm" 
                                    onClick={() => handleApply(job)}
                                    className="w-full sm:w-auto"
                                  >
                                    Apply Now
                                  </Button>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    Posted {new Date(job.posted_date).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    ) : isLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-3"></div>
                        <p className="text-sm text-muted-foreground">Loading job recommendations...</p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-3">
                          <Briefcase className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h4 className="font-medium text-foreground mb-1">No jobs available</h4>
                        <p className="text-sm text-muted-foreground mb-4">
                          Check back later or update your profile to match more opportunities
                        </p>
                        <Button variant="outline" size="sm" onClick={() => navigate('/profile/edit')}>
                          Update Profile
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Mock Test & Upskill Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                  {/* Attend Mock Test */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Target className="h-4 w-4 text-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">Attend Mock Test</h3>
                    </div>
                    <Card className="border-border">
                      <CardContent className="py-4 text-center">
                        <h4 className="text-sm font-semibold text-foreground mb-1">Ready to Test Your Skills?</h4>
                        <p className="text-xs text-muted-foreground mb-3">
                          Take a mock interview to practice and get feedback.
                        </p>
                        <Button 
                          variant="cta" 
                          size="sm"
                          onClick={() => setActiveMenu("mocktest")}
                          className="gap-1.5"
                        >
                          <Target className="h-3 w-3" />
                          Start Mock Interview
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Upskill Yourself */}
                  <div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className="h-4 w-4 text-foreground" />
                      <h3 className="text-sm font-semibold text-foreground">Upskill Yourself</h3>
                    </div>
                    <Card className="border-border">
                      <CardContent className="py-4 text-center">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <GraduationCap className="h-5 w-5 text-amber-500" />
                        </div>
                        <h4 className="text-sm font-semibold text-foreground mb-1">Improve Your Weak Points</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          Recommended platforms to enhance your skills
                        </p>
                        <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-1 h-7 text-xs px-2"
                            onClick={() => window.open('https://skillory.in', '_blank')}
                          >
                            Skillory <ExternalLink className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                        <Button 
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('https://skillory.in', '_blank')}
                        >
                          Explore Courses
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}

            {/* Applications View */}
            {activeMenu === "applications" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">My Applications</h2>
                    <p className="text-sm text-muted-foreground">Track your job applications</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveMenu("jobs")}>
                    Find More Jobs
                  </Button>
                </div>
                {profile?.id && (
                  <ApplicationsTab 
                    candidateId={profile.id} 
                    onViewPipeline={handleViewPipeline}
                  />
                )}
              </div>
            )}

            {/* Interview Pipeline View */}
            {activeMenu === "pipeline" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Interview Pipeline</h2>
                  <p className="text-sm text-muted-foreground">Track your interview progress</p>
                </div>
                {profile?.id && (
                  featureUnlocks.isUnlocked("pipeline") ? (
                    <InterviewPipelineTab candidateId={profile.id} />
                  ) : (
                    <LockedFeatureOverlay
                      feature="pipeline"
                      onUnlocked={featureUnlocks.refresh}
                      onOpenAllPlans={() => setActiveMenu("upgrade")}
                    >
                      <InterviewPipelineTab candidateId={profile.id} />
                    </LockedFeatureOverlay>
                  )
                )}
              </div>
            )}

            {/* Suitable Jobs View */}
            {activeMenu === "jobs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Suitable Jobs</h2>
                    <p className="text-sm text-muted-foreground">Jobs matching your profile preferences</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={fetchJobs}
                      disabled={isLoading}
                      title="Refresh jobs"
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate('/jobs-results')}>
                      View All Jobs
                    </Button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading jobs...</p>
                  </div>
                ) : jobs.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Suitable Jobs Found
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      No jobs matching your profile preferences right now. Complete your profile or browse all jobs.
                    </p>
                    <Button variant="outline" onClick={() => navigate('/jobs-results')}>
                      Browse All Jobs
                    </Button>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {jobs.map((job) => (
                      <Card key={job.id} className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                              {job.job_title}
                            </h3>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Briefcase className="h-4 w-4" />
                                {job.department}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {job.location}
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                Posted {formatDate(job.posted_date)}
                              </div>
                            </div>
                          </div>
                          <Badge variant="secondary">{job.job_type}</Badge>
                        </div>

                        <p className="text-muted-foreground mb-4 line-clamp-2">
                          {job.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            {job.experience_required && (
                              <Badge variant="outline">{job.experience_required}</Badge>
                            )}
                            {job.salary_range && (
                              <Badge variant="outline">{job.salary_range}</Badge>
                            )}
                          </div>
                          <Button variant="cta" onClick={() => handleApply(job)}>Apply Now</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Mock Test & Upskill Sections - Side by Side */}
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Attend Mock Test */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Attend Mock Test</h3>
                    </div>
                    <Card className="p-6 h-full">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">Ready to Test Your Skills?</h4>
                          <p className="text-sm text-muted-foreground">
                            Take a mock interview to practice and get feedback before the real interview.
                          </p>
                        </div>
                        <Button 
                          variant="cta" 
                          onClick={handleStartMockTest}
                          disabled={isStartingMockTest}
                          className="gap-2 mt-2"
                        >
                          {isStartingMockTest ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Target className="h-4 w-4" />
                              Start Mock Interview
                            </>
                          )}
                        </Button>
                      </div>
                    </Card>
                  </div>

                  {/* Upskill Yourself */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      <h3 className="text-lg font-semibold text-foreground">Upskill Yourself</h3>
                    </div>
                    <Card className="p-6 h-full">
                      <div className="flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                          <GraduationCap className="h-8 w-8 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-foreground mb-1">Improve Your Weak Points</h4>
                          <p className="text-sm text-muted-foreground mb-3">
                            Recommended platforms to enhance your skills
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            <a 
                              href="https://skillory.in" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
                            >
                              Skillory <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => window.open('https://skillory.in', '_blank')}
                          className="gap-2 mt-2"
                        >
                          Explore Courses
                        </Button>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            )}

            {/* AI Job Apply */}
            {activeMenu === "aijobapply" && (
              featureUnlocks.isUnlocked("aijobapply") ? (
                <AIJobApplyTab
                  profile={profile}
                  resumeAnalysis={resumeAnalysis}
                  onNavigateToResume={() => setActiveMenu("resume")}
                  onNavigateToUpgrade={() => setActiveMenu("upgrade")}
                />
              ) : (
                <LockedFeatureOverlay
                  feature="aijobapply"
                  onUnlocked={featureUnlocks.refresh}
                  onOpenAllPlans={() => setActiveMenu("upgrade")}
                >
                  <AIJobApplyTab
                    profile={profile}
                    resumeAnalysis={resumeAnalysis}
                    onNavigateToResume={() => setActiveMenu("resume")}
                    onNavigateToUpgrade={() => setActiveMenu("upgrade")}
                  />
                </LockedFeatureOverlay>
              )
            )}

            {/* Attend Mock Test - Standalone Section */}
            {activeMenu === "mocktest" && (
              featureUnlocks.isUnlocked("mocktest") ? (
                <MockInterviewTab />
              ) : (
                <LockedFeatureOverlay
                  feature="mocktest"
                  onUnlocked={featureUnlocks.refresh}
                  onOpenAllPlans={() => setActiveMenu("upgrade")}
                >
                  <MockInterviewTab />
                </LockedFeatureOverlay>
              )
            )}

            {/* Graphic Design Challenge */}
            {activeMenu === "designchallenge" && (
              <GraphicDesignChallenge />
            )}

            {/* Upskill Yourself - Standalone Section */}
            {activeMenu === "upskill" && (() => {
              // Aggregate weak areas with supporting evidence (source + detail)
              type DrilldownDetail = {
                label: string; // e.g. "Resume section" or "Question 3 (Technical Round)"
                content: string; // exact text from resume / question text
                meta?: string; // optional extra (your answer, expected, etc.)
              };
              type WeakArea = {
                text: string;
                source: "Resume" | "Mock Interview";
                evidence: string;
                score?: number;
                details?: DrilldownDetail[];
              };
              const weakAreasDetailed: WeakArea[] = [];

              // Heuristic to map an improvement string to the resume section it relates to
              const resumeSectionFor = (imp: string): { section: string; text: string } => {
                const lower = imp.toLowerCase();
                const ra: any = resumeAnalysis || {};
                if (/skill|technolog|stack|tool/.test(lower)) {
                  const skills = Array.isArray(ra.skill_highlights) ? ra.skill_highlights.join(", ") : "";
                  return { section: "Skills", text: skills || "(no skills listed on resume)" };
                }
                if (/experience|work|role|job|project/.test(lower)) {
                  return { section: "Experience", text: ra.experience_summary || "(no experience summary on resume)" };
                }
                if (/career|level|seniority/.test(lower)) {
                  return { section: "Career Level", text: ra.career_level || "(not detected)" };
                }
                if (/strength|highlight/.test(lower)) {
                  const s = Array.isArray(ra.strengths) ? ra.strengths.join("; ") : "";
                  return { section: "Strengths", text: s || "(none captured)" };
                }
                return { section: "Overall Resume", text: ra.experience_summary || "(no resume summary available)" };
              };

              if (Array.isArray(resumeAnalysis?.improvements)) {
                resumeAnalysis.improvements.forEach((imp: string) => {
                  const score = (resumeAnalysis as any)?.score ?? (resumeAnalysis as any)?.overall_score;
                  const sec = resumeSectionFor(imp);
                  weakAreasDetailed.push({
                    text: imp,
                    source: "Resume",
                    evidence: typeof score === "number"
                      ? `From AI resume analysis (overall score ${score}/100)`
                      : "From AI resume analysis",
                    details: [
                      { label: `Resume section: ${sec.section}`, content: sec.text, meta: "AI flagged this section as needing improvement." },
                    ],
                  });
                });
              }

              // Build detail list for a mock interview stage — pick lowest-scoring questions if available
              const buildStageDetails = (s: any, stageName: string): DrilldownDetail[] => {
                const questions: any[] = Array.isArray(s?.questions) ? s.questions
                  : Array.isArray(s?.question_results) ? s.question_results
                  : Array.isArray(s?.answers) ? s.answers : [];
                if (!questions.length) return [];
                const scored = questions
                  .map((q: any, idx: number) => ({
                    idx: idx + 1,
                    text: q?.question || q?.question_text || q?.prompt || q?.text || `Question ${idx + 1}`,
                    answer: q?.answer || q?.user_answer || q?.response || "",
                    score: typeof q?.score === "number" ? q.score
                      : typeof q?.rating === "number" ? q.rating
                      : (q?.is_correct === false ? 0 : (q?.is_correct === true ? 100 : null)),
                  }));
                const weakOnes = scored.filter(q => typeof q.score === "number" && q.score < 60);
                const picks = (weakOnes.length ? weakOnes : scored).slice(0, 3);
                return picks.map(q => ({
                  label: `Q${q.idx} • ${stageName}${typeof q.score === "number" ? ` • ${q.score}%` : ""}`,
                  content: String(q.text),
                  meta: q.answer ? `Your answer: ${String(q.answer).slice(0, 240)}` : undefined,
                }));
              };

              (mockInterviewStageResults || []).forEach((s: any) => {
                const stageName = s?.stage_name || s?.name || "Interview Stage";
                const score = typeof s?.score === "number" ? s.score : undefined;
                const stageDetails = buildStageDetails(s, stageName);
                if (typeof score === "number" && score < 60) {
                  weakAreasDetailed.push({
                    text: `${stageName} performance needs improvement`,
                    source: "Mock Interview",
                    evidence: `Scored ${score}% in the ${stageName} round (below 60% threshold)`,
                    score,
                    details: stageDetails.length ? stageDetails : [{ label: stageName, content: `Round score: ${score}%. No question-level data was recorded for this round.` }],
                  });
                }
                if (Array.isArray(s?.weaknesses)) {
                  s.weaknesses.forEach((w: string) => weakAreasDetailed.push({
                    text: w,
                    source: "Mock Interview",
                    evidence: `Flagged in ${stageName}${typeof score === "number" ? ` (score ${score}%)` : ""}`,
                    score,
                    details: stageDetails,
                  }));
                }
                if (Array.isArray(s?.improvements)) {
                  s.improvements.forEach((w: string) => weakAreasDetailed.push({
                    text: w,
                    source: "Mock Interview",
                    evidence: `Suggested in ${stageName}${typeof score === "number" ? ` (score ${score}%)` : ""}`,
                    score,
                    details: stageDetails,
                  }));
                }
              });

              const seen = new Set<string>();
              const uniqueWeakAreas = weakAreasDetailed.filter(w => {
                const key = `${w.source}::${w.text}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return Boolean(w.text);
              }).slice(0, 8);

              // Score breakdown — Resume sections vs Mock Interview rounds
              const resumeScore = typeof (resumeAnalysis as any)?.score === "number" ? (resumeAnalysis as any).score : null;
              const resumeWeakCount = uniqueWeakAreas.filter(w => w.source === "Resume").length;
              const mockWeakCount = uniqueWeakAreas.filter(w => w.source === "Mock Interview").length;

              const mockRounds = (mockInterviewStageResults || []).map((s: any) => ({
                name: s?.stage_name || s?.name || "Round",
                score: typeof s?.score === "number" ? s.score : null,
              }));
              const scoredRounds = mockRounds.filter(r => typeof r.score === "number") as { name: string; score: number }[];
              const mockAvg = scoredRounds.length
                ? Math.round(scoredRounds.reduce((sum, r) => sum + r.score, 0) / scoredRounds.length)
                : null;
              const weakRounds = scoredRounds.filter(r => r.score < 60);
              const strongRounds = scoredRounds.filter(r => r.score >= 75);

              const scoreBadgeClass = (n: number | null) =>
                n == null ? "bg-muted text-muted-foreground"
                  : n >= 75 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : n >= 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300";


              // Skillory suggested courses — all open skilory.in
              const skilloryCourses = (upskillCourseSuggestions && upskillCourseSuggestions.length > 0)
                ? upskillCourseSuggestions.map((c: any) => ({
                    title: c.title,
                    description: c.description,
                    category: c.category,
                    level: c.level,
                    duration: c.duration,
                  }))
                : [
                    { title: "Communication & Soft Skills Mastery", description: "Sharpen interview communication, clarity and confidence.", category: "Soft Skills", level: "Beginner", duration: "4 weeks" },
                    { title: "Aptitude & Reasoning Bootcamp", description: "Quantitative, logical and verbal reasoning practice.", category: "Aptitude", level: "Intermediate", duration: "6 weeks" },
                    { title: "Resume & LinkedIn Optimization", description: "Build an ATS-friendly resume and a recruiter-ready profile.", category: "Career", level: "Beginner", duration: "2 weeks" },
                    { title: "Domain Fundamentals Refresher", description: "Strengthen the core concepts most asked in interviews for your role.", category: "Domain", level: "Intermediate", duration: "5 weeks" },
                    { title: "Mock Interview Practice Track", description: "Guided mock interviews with feedback to fix recurring weak areas.", category: "Interview Prep", level: "All Levels", duration: "4 weeks" },
                    { title: "Problem Solving & Case Studies", description: "Apply structured thinking to real-world scenarios.", category: "Problem Solving", level: "Advanced", duration: "6 weeks" },
                  ];

              return (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Upskill Yourself</h2>
                    <p className="text-sm text-muted-foreground">Your weak areas and Skillory-suggested courses to fix them</p>
                  </div>

                  {/* Score Breakdown */}
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Score Breakdown</h3>
                      <Badge variant="outline" className={`ml-auto text-[10px] ${scoreBadgeClass(resumeScore != null && mockAvg != null ? Math.round((resumeScore + mockAvg) / 2) : resumeScore ?? mockAvg)}`}>
                        Total weak areas: {uniqueWeakAreas.length}
                      </Badge>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Resume Sections */}
                      <div className="rounded-lg border border-border p-4 bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            <h4 className="text-sm font-semibold text-foreground">Resume Sections</h4>
                          </div>
                          <Badge className={`text-[10px] ${scoreBadgeClass(resumeScore)}`}>
                            {resumeScore != null ? `${resumeScore}/100` : "Not analyzed"}
                          </Badge>
                        </div>
                        {resumeScore != null ? (
                          <>
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-3">
                              <div className="h-full bg-blue-500" style={{ width: `${resumeScore}%` }} />
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between p-2 rounded bg-background border border-border">
                                <span className="text-muted-foreground">Weak items</span>
                                <span className="font-semibold text-foreground">{resumeWeakCount}</span>
                              </div>
                              <div className="flex justify-between p-2 rounded bg-background border border-border">
                                <span className="text-muted-foreground">Strengths</span>
                                <span className="font-semibold text-foreground">{Array.isArray((resumeAnalysis as any)?.strengths) ? (resumeAnalysis as any).strengths.length : 0}</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">Upload your resume to see section-level scoring.</p>
                        )}
                      </div>

                      {/* Mock Interview Rounds */}
                      <div className="rounded-lg border border-border p-4 bg-muted/30">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Video className="h-4 w-4 text-purple-600" />
                            <h4 className="text-sm font-semibold text-foreground">Mock Interview Rounds</h4>
                          </div>
                          <Badge className={`text-[10px] ${scoreBadgeClass(mockAvg)}`}>
                            {mockAvg != null ? `Avg ${mockAvg}%` : "No attempts"}
                          </Badge>
                        </div>
                        {scoredRounds.length > 0 ? (
                          <>
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden mb-3">
                              <div className="h-full bg-purple-500" style={{ width: `${mockAvg ?? 0}%` }} />
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="flex flex-col p-2 rounded bg-background border border-border">
                                <span className="text-muted-foreground text-[10px]">Rounds</span>
                                <span className="font-semibold text-foreground">{scoredRounds.length}</span>
                              </div>
                              <div className="flex flex-col p-2 rounded bg-background border border-border">
                                <span className="text-muted-foreground text-[10px]">Weak (&lt;60)</span>
                                <span className="font-semibold text-red-600">{weakRounds.length}</span>
                              </div>
                              <div className="flex flex-col p-2 rounded bg-background border border-border">
                                <span className="text-muted-foreground text-[10px]">Strong (≥75)</span>
                                <span className="font-semibold text-emerald-600">{strongRounds.length}</span>
                              </div>
                            </div>
                            <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto pr-1">
                              {scoredRounds.map((r, i) => (
                                <div key={i} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="text-foreground truncate flex-1">{r.name}</span>
                                  <div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div className={`h-full ${r.score >= 75 ? "bg-emerald-500" : r.score >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${r.score}%` }} />
                                  </div>
                                  <span className={`font-medium tabular-nums w-10 text-right ${r.score >= 75 ? "text-emerald-600" : r.score >= 60 ? "text-amber-600" : "text-red-600"}`}>{r.score}%</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">Take a mock interview to see per-round performance.</p>
                        )}
                      </div>
                    </div>

                    {/* Weak area split summary */}
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                        <div className="text-xs text-muted-foreground">From Resume</div>
                        <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{resumeWeakCount}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                        <div className="text-xs text-muted-foreground">From Interviews</div>
                        <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{mockWeakCount}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                        <div className="text-xs text-muted-foreground">Total Weak Areas</div>
                        <div className="text-lg font-bold text-amber-700 dark:text-amber-300">{uniqueWeakAreas.length}</div>
                      </div>
                    </div>
                  </Card>

                  {/* Weak Areas */}
                  <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="h-5 w-5 text-amber-500" />
                      <h3 className="font-semibold text-foreground">Your Weak Areas</h3>
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        {uniqueWeakAreas.length} found
                      </Badge>
                    </div>
                    {uniqueWeakAreas.length > 0 ? (
                      <div className="space-y-3">
                        {uniqueWeakAreas.map((item, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] ${item.source === "Resume" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300"}`}
                                >
                                  {item.source}
                                </Badge>
                                {typeof item.score === "number" && (
                                  <Badge variant="outline" className="text-[10px]">
                                    Score: {item.score}%
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-foreground font-medium">{item.text}</p>
                              <p className="text-xs text-muted-foreground italic">📌 {item.evidence}</p>
                              {item.details && item.details.length > 0 && (
                                <Collapsible>
                                  <CollapsibleTrigger className="group mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                                    <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]:rotate-180" />
                                    View source evidence ({item.details.length})
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-2 space-y-2">
                                    {item.details.map((d, di) => (
                                      <div
                                        key={di}
                                        className={`rounded-md border p-2.5 text-xs ${
                                          item.source === "Resume"
                                            ? "border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-900/20"
                                            : "border-purple-200 bg-purple-50/60 dark:border-purple-800 dark:bg-purple-900/20"
                                        }`}
                                      >
                                        <div className={`font-semibold mb-1 ${item.source === "Resume" ? "text-blue-700 dark:text-blue-300" : "text-purple-700 dark:text-purple-300"}`}>
                                          {d.label}
                                        </div>
                                        <p className="text-foreground whitespace-pre-wrap break-words">"{d.content}"</p>
                                        {d.meta && (
                                          <p className="mt-1 text-[11px] text-muted-foreground italic">{d.meta}</p>
                                        )}
                                      </div>
                                    ))}
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Complete a mock interview or upload your resume so we can highlight specific weak areas with supporting evidence.
                      </p>
                    )}
                  </Card>

                  {/* Skillory Suggested Courses */}
                  <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5">
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">Skillory Suggested Courses</h3>
                            <p className="text-xs text-muted-foreground">Curated to address your weak areas</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-primary/10 text-primary">
                          <GraduationCap className="h-3 w-3 mr-1" />
                          {skilloryCourses.length} Courses
                        </Badge>
                      </div>
                      {isLoadingUpskillCourses ? (
                        <div className="flex items-center justify-center gap-2 py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span className="text-muted-foreground">Loading personalized course recommendations...</span>
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          {skilloryCourses.map((course, idx) => (
                            <a
                              key={idx}
                              href="https://skilory.in"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-4 rounded-lg border bg-background hover:shadow-md hover:border-primary/50 transition-all group"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <Badge variant="outline" className="text-xs">{course.category}</Badge>
                                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                              <h4 className="font-semibold text-sm mb-1 group-hover:text-primary transition-colors line-clamp-2">
                                {course.title}
                              </h4>
                              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                                {course.description}
                              </p>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{course.duration}</span>
                                <Badge variant="secondary" className="text-xs">{course.level}</Badge>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 text-center">
                        <a
                          href="https://skilory.in"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          Browse all courses on Skillory <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })()}


            {/* My Mentors */}
            {activeMenu === "mentors" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">My Mentors</h2>
                  <p className="text-sm text-muted-foreground">View your enrolled mentors, homework assignments and submitted documents</p>
                </div>

                {/* Enrolled Mentors */}
                {(dbCandidateMentorships.length > 0 ? dbCandidateMentorships.map((e, idx) => {
                  const name = e.mentor_profile?.full_name || "Mentor";
                  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                  const colors = ["bg-blue-500", "bg-purple-500", "bg-emerald-500", "bg-orange-500"];
                  return {
                    id: e.id, name, expertise: e.topic, avatar: initials, color: colors[idx % colors.length],
                    rating: 4.8, sessions: e.sessions_completed, nextSession: e.next_session || "TBD", status: e.status,
                    bio: "", email: e.mentor_profile?.email || "", phone: e.mentor_profile?.mobile || "",
                    location: e.mentor_profile?.location || "", experience: e.mentor_profile?.experience_level || "",
                    qualification: e.mentor_profile?.highest_qualification || "", skills: [] as string[], workExperience: [] as any[],
                    courses: (e.courses || []).map(c => ({
                      title: c.title, progress: c.total_modules > 0 ? Math.round((c.completed_modules / c.total_modules) * 100) : 0,
                      totalModules: c.total_modules, completedModules: c.completed_modules, status: c.status,
                    })),
                    homework: (e.homework || []).map(h => ({
                      title: h.title, dueDate: h.due_date, status: h.status, score: h.score,
                    })),
                    submissions: (e.documents || []).map(d => ({
                      name: d.file_name, date: d.created_at.split("T")[0], status: d.review_status as any, score: d.score, url: d.file_url,
                    })),
                    enrollmentId: e.id,
                  };
                }) : [
                  {
                    id: "1", name: "Rajesh Kumar", expertise: "Full Stack Development", avatar: "RK", color: "bg-blue-500",
                    rating: 4.9, sessions: 12, nextSession: "Tomorrow, 4 PM", status: "active",
                    bio: "Senior Full Stack Developer with 10+ years experience in building scalable web applications.",
                    email: "rajesh.kumar@mentor.com", phone: "+91 9876543210", location: "Hyderabad",
                    experience: "10 years", qualification: "M.Tech, Computer Science - IIT Bombay",
                    skills: ["React", "Node.js", "TypeScript", "MongoDB", "AWS", "Docker"],
                    workExperience: [
                      { company: "Tech Solutions Inc.", role: "Senior Developer", duration: "2020 - Present", description: "Leading a team of 8 developers." },
                    ],
                    courses: [
                      { title: "Full Stack Web Development", progress: 65, totalModules: 20, completedModules: 13, status: "in_progress" },
                    ],
                    homework: [
                      { title: "Build a REST API with Node.js", dueDate: "2026-02-25", status: "pending" as const },
                      { title: "React CRUD Application", dueDate: "2026-02-20", status: "submitted" as const },
                      { title: "Database Schema Design", dueDate: "2026-02-15", status: "reviewed" as const, score: 85 },
                    ],
                    submissions: [
                      { name: "React_CRUD_Assignment.pdf", date: "2026-02-20", status: "reviewed" as const, score: 85 },
                      { name: "DB_Schema_Design.docx", date: "2026-02-15", status: "reviewed" as const, score: 78 },
                    ],
                    enrollmentId: "",
                  },
                  {
                    id: "2", name: "Priya Sharma", expertise: "Data Science & AI", avatar: "PS", color: "bg-purple-500",
                    rating: 4.8, sessions: 8, nextSession: "Wed, 6 PM", status: "active",
                    bio: "Data Scientist with expertise in ML and statistical analysis.",
                    email: "priya.sharma@mentor.com", phone: "+91 9123456789", location: "Bangalore",
                    experience: "7 years", qualification: "M.Sc Data Science - IISc Bangalore",
                    skills: ["Python", "TensorFlow", "Pandas", "SQL"],
                    workExperience: [
                      { company: "AI Research Labs", role: "Lead Data Scientist", duration: "2021 - Present", description: "Leading ML research." },
                    ],
                    courses: [
                      { title: "Data Science with Python", progress: 40, totalModules: 15, completedModules: 6, status: "in_progress" },
                    ],
                    homework: [
                      { title: "Pandas Data Analysis Project", dueDate: "2026-02-26", status: "pending" as const },
                      { title: "SQL Query Exercises", dueDate: "2026-02-18", status: "reviewed" as const, score: 80 },
                    ],
                    submissions: [
                      { name: "Pandas_Data_Analysis.ipynb", date: "2026-02-18", status: "reviewed" as const, score: 80 },
                    ],
                    enrollmentId: "",
                  },
                ]).map((mentor) => (
                  <Card key={mentor.id} className="overflow-hidden">
                    {/* Mentor Header - Clickable */}
                    <div className="p-5 border-b border-border cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setSelectedEnrolledMentor(mentor)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`h-11 w-11 rounded-full ${mentor.color} text-white flex items-center justify-center text-sm font-bold`}>
                            {mentor.avatar}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground hover:text-primary transition-colors">{mentor.name}</h3>
                            <p className="text-xs text-muted-foreground">{mentor.expertise}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-xs text-amber-500">
                            <Star className="h-3 w-3 fill-current" /> {mentor.rating}
                          </span>
                          <Badge variant={mentor.status === "active" ? "default" : "secondary"} className="text-xs capitalize">
                            {mentor.status}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Video className="h-3 w-3" /> {mentor.sessions} sessions</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Next: {mentor.nextSession}</span>
                      </div>
                    </div>

                    {/* Homework Assignments */}
                    <div className="p-5 border-b border-border">
                      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-primary" /> Homework Assignments
                      </h4>
                      <div className="space-y-2">
                        {mentor.homework.map((hw, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{hw.title}</p>
                              <p className="text-xs text-muted-foreground">Due: {hw.dueDate}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {hw.status === "reviewed" && (
                                <Badge className="text-xs gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                                  <CheckCircle className="h-3 w-3" /> {(hw as any).score}%
                                </Badge>
                              )}
                              {hw.status === "submitted" && (
                                <Badge variant="secondary" className="text-xs">Submitted</Badge>
                              )}
                              {hw.status === "pending" && (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Pending</Badge>
                              )}
                              {hw.status !== "pending" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={() => toast({ title: "Opening Assignment", description: hw.title })}
                                  title="View Assignment"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => toast({ title: "Downloading...", description: hw.title })}
                                title={`Download ${hw.title}`}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Uploaded Documents */}
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                          <FileText className="h-4 w-4 text-accent" /> Uploaded Documents
                        </h4>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background text-xs text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                          <Upload className="h-3.5 w-3.5" /> Upload File
                          <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.zip" className="hidden" onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file && (mentor as any).enrollmentId) {
                              await candidateUploadDoc((mentor as any).enrollmentId, null, file);
                            } else if (file) {
                              toast({ title: "Document Uploaded", description: file.name });
                            }
                          }} />
                        </label>
                      </div>
                      {mentor.submissions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {mentor.submissions.map((sub, idx) => (
                            <div key={idx} className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border border-border">
                              <FileText className="h-4 w-4 text-accent flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">{sub.name}</p>
                                <p className="text-xs text-muted-foreground">{sub.date}</p>
                              </div>
                              {sub.status === "reviewed" ? (
                                <Badge className="text-xs gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                                  <CheckCircle className="h-3 w-3" /> {sub.score}%
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Pending Review</Badge>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 flex-shrink-0"
                                onClick={() => { if ((sub as any).url) { window.open((sub as any).url, '_blank'); } else { toast({ title: "Downloading...", description: sub.name }); } }}
                                title={`Download ${sub.name}`}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}

                {/* Enrolled Mentor Profile Dialog */}
                <Dialog open={!!selectedEnrolledMentor} onOpenChange={(open) => !open && setSelectedEnrolledMentor(null)}>
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    {selectedEnrolledMentor && (
                      <>
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-3">
                            <div className={`h-12 w-12 rounded-full ${selectedEnrolledMentor.color} text-white flex items-center justify-center text-base font-bold`}>
                              {selectedEnrolledMentor.avatar}
                            </div>
                            <div>
                              <span className="block">{selectedEnrolledMentor.name}</span>
                              <span className="block text-sm font-normal text-muted-foreground">{selectedEnrolledMentor.expertise}</span>
                            </div>
                          </DialogTitle>
                        </DialogHeader>

                        <div className="space-y-5 mt-2">
                          {/* Bio */}
                          <p className="text-sm text-muted-foreground">{selectedEnrolledMentor.bio}</p>

                          {/* Stats */}
                          <div className="grid grid-cols-4 gap-3">
                            <div className="text-center p-3 rounded-lg bg-muted/50 border border-border">
                              <p className="text-lg font-bold text-foreground">{selectedEnrolledMentor.rating}</p>
                              <p className="text-xs text-muted-foreground">Rating</p>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-muted/50 border border-border">
                              <p className="text-lg font-bold text-foreground">{selectedEnrolledMentor.sessions}</p>
                              <p className="text-xs text-muted-foreground">Sessions</p>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-muted/50 border border-border">
                              <p className="text-lg font-bold text-foreground">{selectedEnrolledMentor.experience}</p>
                              <p className="text-xs text-muted-foreground">Experience</p>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-muted/50 border border-border">
                              <Badge variant={selectedEnrolledMentor.status === "active" ? "default" : "secondary"} className="text-xs capitalize">
                                {selectedEnrolledMentor.status}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">Status</p>
                            </div>
                          </div>

                          {/* Personal Details */}
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Personal Details</h4>
                            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                              <tbody>
                                <tr className="border-b border-border">
                                  <td className="px-4 py-2.5 text-muted-foreground font-medium bg-muted/30 w-36">Email</td>
                                  <td className="px-4 py-2.5 text-foreground">{selectedEnrolledMentor.email}</td>
                                </tr>
                                <tr className="border-b border-border">
                                  <td className="px-4 py-2.5 text-muted-foreground font-medium bg-muted/30">Phone</td>
                                  <td className="px-4 py-2.5 text-foreground">{selectedEnrolledMentor.phone}</td>
                                </tr>
                                <tr className="border-b border-border">
                                  <td className="px-4 py-2.5 text-muted-foreground font-medium bg-muted/30">Location</td>
                                  <td className="px-4 py-2.5 text-foreground">{selectedEnrolledMentor.location}</td>
                                </tr>
                                <tr className="border-b border-border">
                                  <td className="px-4 py-2.5 text-muted-foreground font-medium bg-muted/30">Qualification</td>
                                  <td className="px-4 py-2.5 text-foreground">{selectedEnrolledMentor.qualification}</td>
                                </tr>
                                <tr>
                                  <td className="px-4 py-2.5 text-muted-foreground font-medium bg-muted/30">Next Session</td>
                                  <td className="px-4 py-2.5 text-foreground">{selectedEnrolledMentor.nextSession}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Skills */}
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Skills</h4>
                            <div className="flex flex-wrap gap-2">
                              {selectedEnrolledMentor.skills?.map((skill: string) => (
                                <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                              ))}
                            </div>
                          </div>

                          {/* Work Experience */}
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Work Experience</h4>
                            <div className="space-y-3">
                              {selectedEnrolledMentor.workExperience?.map((exp: any, idx: number) => (
                                <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border">
                                  <p className="font-medium text-sm text-foreground">{exp.role}</p>
                                  <p className="text-xs text-primary">{exp.company} · {exp.duration}</p>
                                  <p className="text-xs text-muted-foreground mt-1">{exp.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Course Status */}
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" /> Course Status</h4>
                            <div className="space-y-3">
                              {selectedEnrolledMentor.courses?.map((course: any, idx: number) => (
                                <div key={idx} className="p-3 rounded-lg bg-muted/30 border border-border">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="font-medium text-sm text-foreground">{course.title}</p>
                                    <Badge variant={course.status === "completed" ? "default" : "secondary"} className="text-xs capitalize">
                                      {course.status === "in_progress" ? "In Progress" : "Completed"}
                                    </Badge>
                                  </div>
                                  <Progress value={course.progress} className="h-2 mb-1" />
                                  <p className="text-xs text-muted-foreground">{course.completedModules}/{course.totalModules} modules · {course.progress}% complete</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Homework Assignments */}
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /> Homework Assignments</h4>
                            <div className="space-y-2">
                              {selectedEnrolledMentor.homework?.map((hw: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{hw.title}</p>
                                    <p className="text-xs text-muted-foreground">Due: {hw.dueDate}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {hw.status === "reviewed" && (
                                      <Badge className="text-xs gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                                        <CheckCircle className="h-3 w-3" /> {hw.score}%
                                      </Badge>
                                    )}
                                    {hw.status === "submitted" && <Badge variant="secondary" className="text-xs">Submitted</Badge>}
                                    {hw.status === "pending" && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Pending</Badge>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Uploaded Documents */}
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Upload className="h-4 w-4 text-accent" /> Uploaded Documents</h4>
                            <div className="space-y-2">
                              {selectedEnrolledMentor.submissions?.map((sub: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-3 p-3 rounded-md bg-muted/30 border border-border">
                                  <FileText className="h-4 w-4 text-accent flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">{sub.name}</p>
                                    <p className="text-xs text-muted-foreground">{sub.date}</p>
                                  </div>
                                  {sub.status === "reviewed" ? (
                                    <Badge className="text-xs gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
                                      <CheckCircle className="h-3 w-3" /> {sub.score}%
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs">Pending</Badge>
                                  )}
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { if ((sub as any).url) { window.open((sub as any).url, '_blank'); } else { toast({ title: "Downloading...", description: sub.name }); } }}>
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-3 pt-2">
                            <Button className="flex-1 gap-2" onClick={() => toast({ title: "Message Sent", description: `Contacting ${selectedEnrolledMentor.name}...` })}>
                              <Mail className="h-4 w-4" /> Contact Mentor
                            </Button>
                            <Button variant="outline" className="flex-1 gap-2" onClick={() => toast({ title: "Session Scheduled", description: `Next: ${selectedEnrolledMentor.nextSession}` })}>
                              <Calendar className="h-4 w-4" /> Schedule Session
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            )}

            {activeMenu === "resume" && (
              featureUnlocks.isUnlocked("resume") ? (
                <ResumeBuilderTab />
              ) : (
                <LockedFeatureOverlay
                  feature="resume"
                  onUnlocked={featureUnlocks.refresh}
                  onOpenAllPlans={() => setActiveMenu("upgrade")}
                >
                  <ResumeBuilderTab />
                </LockedFeatureOverlay>
              )
            )}



            {/* External Job Listings */}
            {activeMenu === "externaljobs" && (
              <ExternalJobListings />
            )}

            {/* Subscription */}
            {activeMenu === "wallet" && profile?.id && (
              <SubscriptionTab />
            )}

            {/* Upgrade Plans */}
            {activeMenu === "upgrade" && (
              <div className="space-y-6">
                {profile?.id && <PaymentStatusPanel userId={profile.id} />}

                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full">
                    <Crown className="h-5 w-5" />
                    <span className="font-semibold">Upgrade Your Experience</span>
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Choose Your Position & Plan</h2>
                  <p className="text-muted-foreground text-sm">
                    Select your target education position — pricing is set by your band & salary range.
                  </p>
                </div>

                <EducationPositionPlans
                  prefill={{
                    name: profile?.full_name || "",
                    email: profile?.email || "",
                    mobile: (profile as any)?.mobile || "",
                  }}
                  onActivated={async () => {
                    try { await refreshProfile?.(); } catch {}
                  }}
                />
              </div>
            )}


            {/* Settings - Account Settings */}
            {activeMenu === "settings" && (
              <AccountSettingsSection user={user} />
            )}
          </div>
        </main>
      </div>

      {/* Application Modal */}
      <JobApplicationModal
        job={selectedJob}
        open={isApplicationModalOpen}
        onOpenChange={setIsApplicationModalOpen}
        candidateId={profile?.id || ''}
        candidateProfile={profile}
        onApplicationSubmitted={handleApplicationSubmitted}
      />

      {/* Education Modal */}
      <EducationModal
        isOpen={isEducationModalOpen}
        onClose={() => {
          setIsEducationModalOpen(false);
          setEditingEducation(null);
        }}
        onSave={handleSaveEducation}
        editingRecord={editingEducation}
        isLoading={isEducationLoading}
      />

      {/* Experience Modal */}
      <ExperienceModal
        isOpen={isExperienceModalOpen}
        onClose={() => {
          setIsExperienceModalOpen(false);
          setEditingExperience(null);
        }}
        onSave={handleSaveExperience}
        editingRecord={editingExperience}
      />

      {/* Family Modal */}
      <FamilyModal
        isOpen={isFamilyModalOpen}
        onClose={() => {
          setIsFamilyModalOpen(false);
          setEditingFamily(null);
        }}
        onSave={handleSaveFamily}
        editingRecord={editingFamily}
      />

      {/* Address Modal */}
      <AddressModal
        isOpen={isAddressModalOpen}
        onClose={() => setIsAddressModalOpen(false)}
        onSave={handleSaveAddress}
        existingData={addressData}
      />
    </div>
  );
};

export default CandidateDashboard;
