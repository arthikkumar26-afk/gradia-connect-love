import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { EmployerProvider } from "./contexts/EmployerContext";
import { AuthProvider } from "./contexts/AuthContext";

// Layout
import Layout from "./components/layout/Layout";

// Main Pages
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Careers from "./pages/Careers";
import Blog from "./pages/Blog";
import Companies from "./pages/Companies";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";
import PlaceholderPage from "./components/PlaceholderPage";
import JobsResults from "./pages/JobsResults";
import Jobs from "./pages/Jobs";
import JobsSoftware from "./pages/JobsSoftware";
import JobsEducation from "./pages/JobsEducation";
import NotFound from "./pages/NotFound";
import EmployerLogin from "./pages/EmployerLogin";
import EmployerDashboard from "./pages/EmployerDashboard";
import CandidateLogin from "./pages/CandidateLogin";
import Login from "./pages/Login";
import ProfileSuccess from "./pages/ProfileSuccess";
import JobRequirements from "./pages/JobRequirements";
import Registration from "./pages/employer/Registration";
import Agreement from "./pages/employer/Agreement";
import Terms from "./pages/employer/Terms";
import Plans from "./pages/employer/Plans";
import Onboarding from "./pages/employer/Onboarding";
import Pricing from "./pages/employer/Pricing";
import RequestDemo from "./pages/employer/RequestDemo";
import DemoRequestsAdmin from "./pages/employer/DemoRequestsAdmin";
import EmployerSignup from "./pages/employer/Signup";
import LearningPlatform from "./pages/LearningPlatform";
import ResumeBuilder from "./pages/candidate/ResumeBuilder";
import InterviewPrep from "./pages/candidate/InterviewPrep";
import CareerCoaching from "./pages/candidate/CareerCoaching";
import CandidateSignup from "./pages/candidate/Signup";
import QuickRegister from "./pages/candidate/QuickRegister";
import CandidateCreateProfile from "./pages/candidate/CreateProfile";
import EmployerCreateProfile from "./pages/employer/CreateProfile";
import TechLearning from "./pages/learning/TechLearning";
import NonTechLearning from "./pages/learning/NonTechLearning";
import EducationLearning from "./pages/learning/EducationLearning";
import LanguagesLearning from "./pages/learning/LanguagesLearning";
import AllCategories from "./pages/learning/AllCategories";
import CandidateDashboard from "./pages/candidate/Dashboard";
import EditProfile from "./pages/EditProfile";
import PostJob from "./pages/employer/PostJob";
import CompanyJobs from "./pages/CompanyJobs";
import Interview from "./pages/Interview";
import CandidateProfilePage from "./pages/employer/CandidateProfile";

// Admin & Owner Pages
import AdminLogin from "./pages/admin/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import TrendingJobsAdmin from "./pages/admin/TrendingJobs";
import JobModeration from "./pages/admin/JobModeration";
import AdminUsers from "./pages/admin/Users";
import AdminCompanies from "./pages/admin/Companies";
import AdminReports from "./pages/admin/Reports";
import AdminAuditLogs from "./pages/admin/AuditLogs";
import AdminSettings from "./pages/admin/AdminSettings";
import OwnerLogin from "./pages/owner/Login";
import OwnerDashboard from "./pages/owner/Dashboard";
import OwnerInitialSetup from "./pages/owner/InitialSetup";

// Sponsor Pages
import SponsorOverview from "./pages/sponsor/Overview";
import Sponsorships from "./pages/sponsor/Sponsorships";
import SponsorAnalytics from "./pages/sponsor/Analytics";
import BrandingResources from "./pages/sponsor/Resources";
import CandidateLeads from "./pages/sponsor/CandidateLeads";
import MyStalls from "./pages/sponsor/MyStalls";
import Messages from "./pages/sponsor/Messages";
import Billing from "./pages/sponsor/Billing";
import SponsorSettings from "./pages/sponsor/Settings";
import BecomePartner from "./pages/sponsor/BecomePartner";
import SponsorshipTiers from "./pages/sponsor/SponsorshipTiers";
import CollaborationOpportunities from "./pages/sponsor/CollaborationOpportunities";
import SubmitProposal from "./pages/sponsor/SubmitProposal";
import FeaturedClients from "./pages/sponsor/FeaturedClients";
import SuccessStories from "./pages/sponsor/SuccessStories";
import PartnerTestimonials from "./pages/sponsor/PartnerTestimonials";
import BrandingGuidelines from "./pages/sponsor/BrandingGuidelines";
import MarketingToolkit from "./pages/sponsor/MarketingToolkit";
import EventSponsorshipDeck from "./pages/sponsor/EventSponsorshipDeck";
import SupportPortal from "./pages/sponsor/SupportPortal";
import JobMelaCalendar from "./pages/sponsor/JobMelaCalendar";
import SponsorLogin from "./pages/sponsor/SponsorLogin";
import SponsorSignup from "./pages/sponsor/SponsorSignup";
import SponsorBenefits from "./pages/sponsor/SponsorBenefits";
import SponsorLanding from "./pages/sponsor/SponsorLanding";
import EventReport from "./pages/sponsor/EventReport";

const queryClient = new QueryClient();

// Main Routes Component with Layout
const MainRoutes = () => (
  <Layout>
    <Routes>
      {/* Main Pages */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/careers" element={<Careers />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/companies" element={<Companies />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<PlaceholderPage title="Terms of Service" />} />
      <Route path="/sitemap" element={<PlaceholderPage title="Sitemap" />} />

      {/* Candidate Routes */}
      <Route path="/candidate" element={<PlaceholderPage title="Candidate Home" />} />
      <Route path="/jobs" element={<Jobs />} />
      <Route path="/jobs-results" element={<JobsResults />} />
      <Route path="/jobs/software" element={<JobsSoftware />} />
      <Route path="/jobs/education" element={<JobsEducation />} />
      <Route path="/job/:id" element={<PlaceholderPage title="Job Details" />} />
      <Route path="/job/:id/apply" element={<PlaceholderPage title="Apply for Job" />} />
      <Route path="/candidate/signup" element={<CandidateSignup />} />
      <Route path="/candidate/login" element={<CandidateLogin />} />
      <Route path="/candidate/create-profile" element={<CandidateCreateProfile />} />
      <Route path="/candidate/apply" element={<CandidateCreateProfile />} />
      <Route path="/create-profile" element={<CandidateCreateProfile />} />
      <Route path="/signup" element={<CandidateSignup />} />
      <Route path="/candidate/quick-register" element={<QuickRegister />} />
      <Route path="/profile/success" element={<ProfileSuccess />} />
      <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
      <Route path="/profile/edit" element={<EditProfile />} />
      <Route path="/edit-profile" element={<EditProfile />} />
      <Route path="/candidate/applications" element={<PlaceholderPage title="My Applications" />} />
      <Route path="/candidate/interview-prep" element={<InterviewPrep />} />
      <Route path="/candidate/resume-builder" element={<ResumeBuilder />} />
      <Route path="/candidate/assessments" element={<PlaceholderPage title="Skill Assessments" />} />
      <Route path="/candidate/mock-interviews" element={<PlaceholderPage title="Mock Interviews" />} />
      <Route path="/candidate/salary-insights" element={<PlaceholderPage title="Salary Insights" />} />
      <Route path="/candidate/coaching" element={<CareerCoaching />} />

      {/* Learning Platform Routes */}
      <Route path="/learning/tech" element={<TechLearning />} />
      <Route path="/learning/non-tech" element={<NonTechLearning />} />
      <Route path="/learning/education" element={<EducationLearning />} />
      <Route path="/learning/languages" element={<LanguagesLearning />} />
      <Route path="/learning/all-categories" element={<AllCategories />} />

      {/* Employer Routes */}
      <Route path="/employer" element={<PlaceholderPage title="Employer Home" />} />
      <Route path="/employer/signup" element={<EmployerSignup />} />
      <Route path="/employer/login" element={<EmployerLogin />} />
      <Route path="/employer/create-profile" element={<EmployerCreateProfile />} />
      <Route path="/employer/agreement" element={<Agreement />} />
      <Route path="/employer/terms" element={<Terms />} />
      <Route path="/employer/plans" element={<Plans />} />
      <Route path="/employer/onboarding" element={<Onboarding />} />
      <Route path="/employer/dashboard" element={<EmployerDashboard />} />
      <Route path="/employer/candidate/:candidateId" element={<CandidateProfilePage />} />
      <Route path="/learning-platform" element={<LearningPlatform />} />
      <Route path="/employer/post-job" element={<PostJob />} />
      <Route path="/employer/job-requirements" element={<JobRequirements />} />
      <Route path="/employer/shortlist" element={<PlaceholderPage title="Candidate Shortlist" />} />
      <Route path="/employer/campus-hiring" element={<PlaceholderPage title="Campus Hiring" />} />
      <Route path="/employer/partnerships" element={<PlaceholderPage title="Partnerships" />} />
      <Route path="/employer/pricing" element={<Pricing />} />
      <Route path="/employer/demo" element={<RequestDemo />} />
      <Route path="/employer/demo-admin" element={<DemoRequestsAdmin />} />

      {/* Public Company Jobs (QR Code destination) */}
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
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/trending-jobs" element={<TrendingJobsAdmin />} />
      <Route path="/admin/jobs" element={<JobModeration />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/companies" element={<AdminCompanies />} />
      <Route path="/admin/reports" element={<AdminReports />} />
      <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
      <Route path="/admin/audit" element={<AdminAuditLogs />} />
      <Route path="/admin/settings" element={<AdminSettings />} />
      <Route path="/admin/crm" element={<PlaceholderPage title="CRM Integrations" />} />

      {/* Owner Routes */}
      <Route path="/owner/login" element={<OwnerLogin />} />
      <Route path="/owner/dashboard" element={<OwnerDashboard />} />
      <Route path="/owner/setup" element={<OwnerInitialSetup />} />
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

      {/* Sponsor Portal Routes */}
      <Route path="/sponsor/dashboard" element={<SponsorOverview />} />
      <Route path="/sponsor/sponsorships" element={<Sponsorships />} />
      <Route path="/sponsor/analytics" element={<SponsorAnalytics />} />
      <Route path="/sponsor/resources" element={<BrandingResources />} />
      <Route path="/sponsor/leads" element={<CandidateLeads />} />
      <Route path="/sponsor/stalls" element={<MyStalls />} />
      <Route path="/sponsor/event-report/:eventId" element={<EventReport />} />
      <Route path="/sponsor/messages" element={<Messages />} />
      <Route path="/sponsor/billing" element={<Billing />} />
      <Route path="/sponsor/settings" element={<SponsorSettings />} />
      
      {/* Partnership & Sponsorship Pages */}
      <Route path="/become-a-partner" element={<SponsorSignup />} />
      <Route path="/sponsor/signup" element={<SponsorSignup />} />
      <Route path="/sponsor/become-partner" element={<SponsorSignup />} />
      <Route path="/sponsors/become-partner" element={<SponsorSignup />} />
      <Route path="/sponsorship-tiers" element={<SponsorshipTiers />} />
      <Route path="/job-mela-calendar" element={<JobMelaCalendar />} />
      <Route path="/sponsor/login" element={<SponsorLogin />} />
      <Route path="/sponsor/benefits" element={<SponsorBenefits />} />
      <Route path="/sponsors" element={<SponsorLanding />} />
      <Route path="/collaboration-opportunities" element={<CollaborationOpportunities />} />
      <Route path="/partnership-proposal" element={<SubmitProposal />} />
      <Route path="/featured-clients" element={<FeaturedClients />} />
      <Route path="/success-stories" element={<SuccessStories />} />
      <Route path="/partner-testimonials" element={<PartnerTestimonials />} />
      <Route path="/branding-guidelines" element={<BrandingGuidelines />} />
      <Route path="/marketing-toolkit" element={<MarketingToolkit />} />
      <Route path="/event-sponsorship-deck" element={<EventSponsorshipDeck />} />
      <Route path="/sponsor-support-portal" element={<SupportPortal />} />

      {/* Interview page - standalone */}
      <Route path="/interview" element={<Interview />} />

      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
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
            <MainRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </EmployerProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;