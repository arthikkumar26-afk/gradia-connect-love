import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { EmployerProvider } from "./contexts/EmployerContext";
import { AuthProvider } from "./contexts/AuthContext";
import { lazy, Suspense, ComponentType } from "react";

// Retry wrapper for lazy imports — handles stale chunk hashes after redeploys.
// On chunk load failure, reload the page once to fetch fresh asset manifest.
const lazyWithRetry = <T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) =>
  lazy(async () => {
    const reloadKey = "lovable_chunk_reloaded";
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || err);
      const isChunkErr =
        msg.includes("Failed to fetch dynamically imported module") ||
        msg.includes("Importing a module script failed") ||
        msg.includes("ChunkLoadError") ||
        msg.includes("error loading dynamically imported module");
      if (isChunkErr && !sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, "1");
        window.location.reload();
        // Return a never-resolving promise so Suspense keeps showing fallback until reload
        return new Promise<{ default: T }>(() => {});
      }
      throw err;
    }
  });

// Layout - keep eagerly loaded
import Layout from "./components/layout/Layout";
import ScrollToTop from "./components/layout/ScrollToTop";

// Critical pages - eagerly loaded for fast first paint
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import SignupPortal from "./pages/SignupPortal";

// Lazy-loaded pages - split into chunks by section
const About = lazyWithRetry(() => import("./pages/About"));
const Contact = lazyWithRetry(() => import("./pages/Contact"));
const Careers = lazyWithRetry(() => import("./pages/Careers"));
const Blog = lazyWithRetry(() => import("./pages/Blog"));
const Companies = lazyWithRetry(() => import("./pages/Companies"));
const FAQ = lazyWithRetry(() => import("./pages/FAQ"));
const Privacy = lazyWithRetry(() => import("./pages/Privacy"));
const TermsOfService = lazyWithRetry(() => import("./pages/TermsOfService"));
const PlaceholderPage = lazyWithRetry(() => import("./components/PlaceholderPage"));
const JobsResults = lazyWithRetry(() => import("./pages/JobsResults"));
const Jobs = lazyWithRetry(() => import("./pages/Jobs"));
const JobsSoftware = lazyWithRetry(() => import("./pages/JobsSoftware"));
const JobsEducation = lazyWithRetry(() => import("./pages/JobsEducation"));
const EmployerLogin = lazyWithRetry(() => import("./pages/EmployerLogin"));
const EmployerDashboard = lazyWithRetry(() => import("./pages/EmployerDashboard"));
// HR panels removed — employer ↔ candidate connects directly
const CandidateLogin = lazyWithRetry(() => import("./pages/CandidateLogin"));
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/ResetPassword"));
const ProfileSuccess = lazyWithRetry(() => import("./pages/ProfileSuccess"));
const JobRequirements = lazyWithRetry(() => import("./pages/JobRequirements"));
const Registration = lazyWithRetry(() => import("./pages/employer/Registration"));
const Agreement = lazyWithRetry(() => import("./pages/employer/Agreement"));
const Benefits = lazyWithRetry(() => import("./pages/employer/Benefits"));
const Terms = lazyWithRetry(() => import("./pages/employer/Terms"));
const Plans = lazyWithRetry(() => import("./pages/employer/Plans"));
const Onboarding = lazyWithRetry(() => import("./pages/employer/Onboarding"));
const Pricing = lazyWithRetry(() => import("./pages/employer/Pricing"));
const PricingPage = lazyWithRetry(() => import("./pages/Pricing"));
const RequestDemo = lazyWithRetry(() => import("./pages/employer/RequestDemo"));
const DemoRequestsAdmin = lazyWithRetry(() => import("./pages/employer/DemoRequestsAdmin"));
const EmployerSignup = lazyWithRetry(() => import("./pages/employer/Signup"));
const CandidateSignup = lazyWithRetry(() => import("./pages/candidate/Signup"));
const FreelancerSignup = lazyWithRetry(() => import("./pages/freelancer/Signup"));
const FreelancerLogin = lazyWithRetry(() => import("./pages/freelancer/Login"));
const EduTechLanding = lazyWithRetry(() => import("./pages/edutech/EduTechLanding"));
const EduTechLogin = lazyWithRetry(() => import("./pages/edutech/EduTechLogin"));
const EduTechSignup = lazyWithRetry(() => import("./pages/edutech/EduTechSignup"));
const EduTechDashboard = lazyWithRetry(() => import("./pages/edutech/EduTechDashboard"));
const LearningPlatform = lazyWithRetry(() => import("./pages/LearningPlatform"));
const ResumeBuilder = lazyWithRetry(() => import("./pages/candidate/ResumeBuilder"));
const InterviewPrep = lazyWithRetry(() => import("./pages/candidate/InterviewPrep"));
const MockTest = lazyWithRetry(() => import("./pages/candidate/MockTest"));
const MockInterview = lazyWithRetry(() => import("./pages/candidate/MockInterview"));
const MockInterviewStart = lazyWithRetry(() => import("./pages/candidate/MockInterviewStart"));
const DemoRound = lazyWithRetry(() => import("./pages/candidate/DemoRound"));
const DemoFeedback = lazyWithRetry(() => import("./pages/candidate/DemoFeedback"));
const CareerCoaching = lazyWithRetry(() => import("./pages/candidate/CareerCoaching"));
const QuickRegister = lazyWithRetry(() => import("./pages/candidate/QuickRegister"));
const EmployerCreateProfile = lazyWithRetry(() => import("./pages/employer/CreateProfile"));
const TechLearning = lazyWithRetry(() => import("./pages/learning/TechLearning"));
const NonTechLearning = lazyWithRetry(() => import("./pages/learning/NonTechLearning"));
const EducationLearning = lazyWithRetry(() => import("./pages/learning/EducationLearning"));
const LanguagesLearning = lazyWithRetry(() => import("./pages/learning/LanguagesLearning"));
const AllCategories = lazyWithRetry(() => import("./pages/learning/AllCategories"));
const CandidateDashboard = lazyWithRetry(() => import("./pages/candidate/Dashboard"));
const EditProfile = lazyWithRetry(() => import("./pages/EditProfile"));
const PostJob = lazyWithRetry(() => import("./pages/employer/PostJob"));
const CreatePosition = lazyWithRetry(() => import("./pages/employer/CreatePosition"));
const CompanyJobs = lazyWithRetry(() => import("./pages/CompanyJobs"));
const JobApply = lazyWithRetry(() => import("./pages/JobApply"));
const Interview = lazyWithRetry(() => import("./pages/Interview"));
const BookSlot = lazyWithRetry(() => import("./pages/BookSlot"));
const CandidateProfilePage = lazyWithRetry(() => import("./pages/employer/CandidateProfile"));
const FreelancerDashboard = lazyWithRetry(() => import("./pages/freelancer/Dashboard"));
const PublicPortfolio = lazyWithRetry(() => import("./pages/freelancer/PublicPortfolio"));

// Admin & Owner Pages - lazy loaded
const AdminLogin = lazyWithRetry(() => import("./pages/admin/Login"));
const AdminDashboard = lazyWithRetry(() => import("./pages/admin/Dashboard"));
const JobModeration = lazyWithRetry(() => import("./pages/admin/JobModeration"));
const AdminUsers = lazyWithRetry(() => import("./pages/admin/Users"));
const AdminCompanies = lazyWithRetry(() => import("./pages/admin/Companies"));
const AdminReports = lazyWithRetry(() => import("./pages/admin/Reports"));
const AdminAuditLogs = lazyWithRetry(() => import("./pages/admin/AuditLogs"));
const AdminResumeAnalysisAudit = lazyWithRetry(() => import("./pages/admin/ResumeAnalysisAudit"));
const AdminSettings = lazyWithRetry(() => import("./pages/admin/AdminSettings"));
const AdminWorkflowGuide = lazyWithRetry(() => import("./pages/admin/WorkflowGuide"));
const SubscribedEmployers = lazyWithRetry(() => import("./pages/admin/SubscribedEmployers"));
const SubscribedCandidates = lazyWithRetry(() => import("./pages/admin/SubscribedCandidates"));
const OwnerLogin = lazyWithRetry(() => import("./pages/owner/Login"));
const OwnerDashboard = lazyWithRetry(() => import("./pages/owner/Dashboard"));
const OwnerInitialSetup = lazyWithRetry(() => import("./pages/owner/InitialSetup"));
const OwnerRevenueAnalytics = lazyWithRetry(() => import("./pages/owner/RevenueAnalytics"));
const OwnerSystemConfiguration = lazyWithRetry(() => import("./pages/owner/SystemConfiguration"));
const OwnerDatabaseManagement = lazyWithRetry(() => import("./pages/owner/DatabaseManagement"));
const OwnerAllJobsOverview = lazyWithRetry(() => import("./pages/owner/AllJobsOverview"));
const OwnerGrowthMetrics = lazyWithRetry(() => import("./pages/owner/GrowthMetrics"));
const MockInterviewPipeline = lazyWithRetry(() => import("./pages/admin/MockInterviewPipeline"));
const AdminManagement = lazyWithRetry(() => import("./pages/admin/Management"));
const ManagementFeedback = lazyWithRetry(() => import("./pages/admin/ManagementFeedback"));
const LiveDemoView = lazyWithRetry(() => import("./pages/admin/LiveDemoView"));

const CouponManagement = lazyWithRetry(() => import("./pages/admin/CouponManagement"));
const UnsubscribedEmployers = lazyWithRetry(() => import("./pages/admin/UnsubscribedEmployers"));
const UnsubscribedCandidates = lazyWithRetry(() => import("./pages/admin/UnsubscribedCandidates"));
const ExternalJobs = lazyWithRetry(() => import("./pages/admin/ExternalJobs"));
const EventAlerts = lazyWithRetry(() => import("./pages/admin/EventAlerts"));
const PopupAds = lazyWithRetry(() => import("./pages/admin/PopupAds"));
const BulkMailRegister = lazyWithRetry(() => import("./pages/admin/BulkMailRegister"));
const AIFlyerMaker = lazyWithRetry(() => import("./pages/admin/AIFlyerMaker"));
const InviteFromResume = lazyWithRetry(() => import("./pages/admin/InviteFromResume"));
const CandidateResumes = lazyWithRetry(() => import("./pages/admin/CandidateResumes"));
const RazorpayWebhooks = lazyWithRetry(() => import("./pages/admin/RazorpayWebhooks"));
const SubscriptionActivationLogs = lazyWithRetry(() => import("./pages/admin/SubscriptionActivationLogs"));
const PlanControl = lazyWithRetry(() => import("./pages/admin/PlanControl"));
const AdminHRManagement = lazyWithRetry(() => import("./pages/admin/HRManagement"));
const AdminIdVerifications = lazyWithRetry(() => import("./pages/admin/IdVerifications"));
const OAuthConsent = lazyWithRetry(() => import("./pages/OAuthConsent"));


// Optimized QueryClient with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
  </div>
);

// Helper component for external redirects
const ExternalRedirect = ({ url }: { url: string }) => {
  window.location.href = url;
  return null;
};

// Main Routes Component with Layout
const MainRoutes = () => (
  <Layout>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Main Pages */}
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/sitemap" element={<PlaceholderPage title="Sitemap" />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />


        {/* Candidate Routes */}
        <Route path="/candidate" element={<PlaceholderPage title="Candidate Home" />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs-results" element={<JobsResults />} />
        <Route path="/jobs/software" element={<JobsSoftware />} />
        <Route path="/jobs/education" element={<JobsEducation />} />
        <Route path="/job/:id" element={<PlaceholderPage title="Job Details" />} />
        <Route path="/job/:jobId/apply" element={<JobApply />} />
        <Route path="/candidate/signup" element={<CandidateSignup />} />
        <Route path="/candidate/login" element={<CandidateLogin />} />
        <Route path="/candidate/forgot-password" element={<ForgotPassword />} />
        <Route path="/candidate/create-profile" element={<Navigate to="/candidate/signup" replace />} />
        <Route path="/candidate/apply" element={<Navigate to="/candidate/signup" replace />} />
        <Route path="/create-profile" element={<Navigate to="/candidate/signup" replace />} />
        <Route path="/signup" element={<SignupPortal />} />
        <Route path="/candidate/quick-register" element={<QuickRegister />} />
        <Route path="/profile/success" element={<ProfileSuccess />} />
        <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
        <Route path="/profile/edit" element={<EditProfile />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/candidate/applications" element={<PlaceholderPage title="My Applications" />} />
        <Route path="/candidate/interview-prep" element={<InterviewPrep />} />
        <Route path="/candidate/mock-test/:sessionId" element={<MockTest />} />
        <Route path="/candidate/mock-interview/:sessionId/:stageOrder" element={<MockInterview />} />
        <Route path="/candidate/mock-interview-start/:type" element={<MockInterviewStart />} />
        <Route path="/candidate/demo-round" element={<DemoRound />} />
        <Route path="/candidate/demo-feedback" element={<DemoFeedback />} />
        <Route path="/candidate/resume-builder" element={<ResumeBuilder />} />
        <Route path="/candidate/assessments" element={<PlaceholderPage title="Skill Assessments" />} />
        <Route path="/candidate/mock-interviews" element={<PlaceholderPage title="Mock Interviews" />} />
        <Route path="/candidate/salary-insights" element={<PlaceholderPage title="Salary Insights" />} />
        <Route path="/candidate/coaching" element={<CareerCoaching />} />

        {/* Learning Platform Routes */}
        <Route path="/learning" element={<ExternalRedirect url="https://skillory.life" />} />
        <Route path="/learning/tech" element={<TechLearning />} />
        <Route path="/learning/non-tech" element={<NonTechLearning />} />
        <Route path="/learning/education" element={<EducationLearning />} />
        <Route path="/learning/languages" element={<LanguagesLearning />} />
        <Route path="/learning/all-categories" element={<AllCategories />} />

        {/* Employer Routes */}
        <Route path="/employer" element={<PlaceholderPage title="Employer Home" />} />
        <Route path="/employer/signup" element={<EmployerSignup />} />
        <Route path="/employer/login" element={<EmployerLogin />} />
        <Route path="/employer/forgot-password" element={<ForgotPassword />} />
        <Route path="/employer/create-profile" element={<EmployerCreateProfile />} />
        <Route path="/employer/benefits" element={<Benefits />} />
        <Route path="/employer/agreement" element={<Agreement />} />
        <Route path="/employer/terms" element={<Terms />} />
        <Route path="/employer/plans" element={<Plans />} />
        <Route path="/employer/onboarding" element={<Onboarding />} />
        <Route path="/employer/dashboard" element={<EmployerDashboard />} />
        {/* HR panels disabled — employer ↔ candidate now connects directly */}
        <Route path="/hr/*" element={<Navigate to="/" replace />} />
        <Route path="/employer/candidate/:candidateId" element={<CandidateProfilePage />} />
        <Route path="/learning-platform" element={<LearningPlatform />} />
        <Route path="/employer/post-job" element={<PostJob />} />
        <Route path="/employer/create-position" element={<CreatePosition />} />
        <Route path="/employer/job-requirements" element={<JobRequirements />} />

        <Route path="/employer/shortlist" element={<PlaceholderPage title="Candidate Shortlist" />} />
        <Route path="/employer/campus-hiring" element={<PlaceholderPage title="Campus Hiring" />} />
        <Route path="/employer/partnerships" element={<PlaceholderPage title="Partnerships" />} />
        <Route path="/employer/pricing" element={<Pricing />} />
        <Route path="/employer/demo" element={<RequestDemo />} />
        <Route path="/employer/demo-admin" element={<DemoRequestsAdmin />} />

        {/* EduTech Routes */}
        <Route path="/edutech" element={<EduTechLanding />} />
        <Route path="/edutech/login" element={<EduTechLogin />} />
        <Route path="/edutech/signup" element={<EduTechSignup />} />
        <Route path="/edutech/dashboard" element={<EduTechDashboard />} />

        {/* Freelancer Routes */}
        <Route path="/freelancer/signup" element={<FreelancerSignup />} />
        <Route path="/freelancer/login" element={<FreelancerLogin />} />
        <Route path="/freelancer/dashboard" element={<FreelancerDashboard />} />
        <Route path="/freelancer/edit-profile" element={<EditProfile />} />
        <Route path="/portfolio/:userId" element={<PublicPortfolio />} />

        {/* Public Company Jobs */}
        <Route path="/company/:employerId/jobs" element={<CompanyJobs />} />

        {/* Service Routes */}
        <Route path="/services/placement" element={<PlaceholderPage title="Placement Services" />} />
        <Route path="/services/fast-track" element={<PlaceholderPage title="Fast Track Hiring" />} />
        <Route path="/services/volume-hiring" element={<PlaceholderPage title="Volume Hiring" />} />
        <Route path="/services/staffing" element={<PlaceholderPage title="Staffing Solutions" />} />
        <Route path="/services/training" element={<PlaceholderPage title="Training Programs" />} />
        <Route path="/services/assessments" element={<PlaceholderPage title="Skills Assessments" />} />
        <Route path="/services/background-checks" element={<PlaceholderPage title="Background Checks" />} />

        {/* Resource Routes */}
        <Route path="/events" element={<PlaceholderPage title="Events" />} />
        <Route path="/workshops" element={<PlaceholderPage title="Workshops" />} />
        <Route path="/library" element={<PlaceholderPage title="Resource Library" />} />
        <Route path="/downloads" element={<PlaceholderPage title="Downloads" />} />
        <Route path="/newsletter" element={<PlaceholderPage title="Newsletter" />} />
        <Route path="/testimonials" element={<PlaceholderPage title="Video Testimonials" />} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/jobs" element={<JobModeration />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/subscribed-employers" element={<SubscribedEmployers />} />
        <Route path="/admin/subscribed-candidates" element={<SubscribedCandidates />} />
        <Route path="/admin/candidate-resumes" element={<CandidateResumes />} />
        <Route path="/admin/unsubscribed-employers" element={<UnsubscribedEmployers />} />
        <Route path="/admin/unsubscribed-candidates" element={<UnsubscribedCandidates />} />
        <Route path="/admin/companies" element={<AdminCompanies />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/resume-analysis-audit" element={<AdminResumeAnalysisAudit />} />
        <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
        <Route path="/admin/audit" element={<AdminAuditLogs />} />
        <Route path="/admin/razorpay-webhooks" element={<RazorpayWebhooks />} />
        <Route path="/admin/subscription-activations" element={<SubscriptionActivationLogs />} />
        <Route path="/admin/plan-control" element={<PlanControl accessRole="admin" />} />
        <Route path="/owner/plan-control" element={<PlanControl accessRole="owner" />} />
        <Route path="/admin/settings" element={<AdminSettings />} />
        <Route path="/admin/id-verifications" element={<AdminIdVerifications />} />
        <Route path="/owner/id-verifications" element={<AdminIdVerifications />} />
        <Route path="/admin/workflow-guide" element={<AdminWorkflowGuide />} />
        <Route path="/admin/mock-interview-pipeline" element={<MockInterviewPipeline />} />
        <Route path="/admin/management" element={<AdminManagement />} />
        <Route path="/admin/feedback" element={<ManagementFeedback />} />
        <Route path="/admin/live-demo" element={<LiveDemoView />} />
        
        <Route path="/admin/hr-management" element={<AdminHRManagement />} />
        <Route path="/admin/coupons" element={<CouponManagement />} />
        <Route path="/admin/external-jobs" element={<ExternalJobs />} />
        <Route path="/admin/event-alerts" element={<EventAlerts />} />
        <Route path="/admin/popup-ads" element={<PopupAds />} />
        <Route path="/admin/bulk-mail-register" element={<BulkMailRegister />} />
        <Route path="/admin/invite-from-resume" element={<InviteFromResume />} />
        <Route path="/admin/flyer-maker" element={<AIFlyerMaker />} />
        <Route path="/admin/crm" element={<PlaceholderPage title="CRM Integrations" />} />
        <Route path="/admin" element={<AdminDashboard />} />

        {/* Owner Routes */}
        <Route path="/owner/login" element={<OwnerLogin />} />
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
        <Route path="/owner/setup" element={<OwnerInitialSetup />} />
        <Route path="/owner/revenue-analytics" element={<OwnerRevenueAnalytics />} />
        <Route path="/owner/system-configuration" element={<OwnerSystemConfiguration />} />
        <Route path="/owner/database-management" element={<OwnerDatabaseManagement />} />
        <Route path="/owner/all-jobs" element={<OwnerAllJobsOverview />} />
        <Route path="/owner/growth-metrics" element={<OwnerGrowthMetrics />} />
        <Route path="/owner" element={<OwnerDashboard />} />

        {/* Support & Community Routes */}
        <Route path="/support" element={<PlaceholderPage title="Support Center" />} />
        <Route path="/ambassador" element={<PlaceholderPage title="Ambassador Program" />} />
        <Route path="/referral" element={<PlaceholderPage title="Referral Program" />} />
        <Route path="/partner-portal" element={<PlaceholderPage title="Partner Portal" />} />
        <Route path="/api" element={<PlaceholderPage title="API Documentation" />} />
        <Route path="/accessibility" element={<PlaceholderPage title="Accessibility" />} />
        <Route path="/press" element={<PlaceholderPage title="Press & Media" />} />
        <Route path="/community-guidelines" element={<PlaceholderPage title="Community Guidelines" />} />

        {/* Interview & Booking pages */}
        <Route path="/interview" element={<Interview />} />
        <Route path="/book-slot" element={<BookSlot />} />

        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  </Layout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <EmployerProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <MainRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </EmployerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
