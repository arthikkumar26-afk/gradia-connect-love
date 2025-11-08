import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { EmployerProvider } from "./contexts/EmployerContext";

// Layout
import Layout from "./components/layout/Layout";

// Main Pages
import Index from "./pages/Index";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Careers from "./pages/Careers";
import Blog from "./pages/Blog";
import SuccessStories from "./pages/SuccessStories";
import FAQ from "./pages/FAQ";
import Privacy from "./pages/Privacy";
import PlaceholderPage from "./components/PlaceholderPage";
import JobsResults from "./pages/JobsResults";
import NotFound from "./pages/NotFound";
import EmployerLogin from "./pages/EmployerLogin";
import EmployerDashboard from "./pages/EmployerDashboard";
import CandidateLogin from "./pages/CandidateLogin";
import CreateProfile from "./pages/CreateProfile";
import ProfileSuccess from "./pages/ProfileSuccess";
import JobRequirements from "./pages/JobRequirements";
import Registration from "./pages/employer/Registration";
import Agreement from "./pages/employer/Agreement";
import Terms from "./pages/employer/Terms";
import Plans from "./pages/employer/Plans";
import Onboarding from "./pages/employer/Onboarding";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <EmployerProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
            {/* Main Pages */}
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/success-stories" element={<SuccessStories />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<PlaceholderPage title="Terms of Service" />} />
            <Route path="/sitemap" element={<PlaceholderPage title="Sitemap" />} />

            {/* Candidate Routes */}
            <Route path="/candidate" element={<PlaceholderPage title="Candidate Home" />} />
            <Route path="/jobs" element={<PlaceholderPage title="Browse Jobs" />} />
            <Route path="/jobs-results" element={<JobsResults />} />
            <Route path="/jobs/software" element={<PlaceholderPage title="Software Jobs" />} />
            <Route path="/jobs/education" element={<PlaceholderPage title="Education Jobs" />} />
            <Route path="/job/:id" element={<PlaceholderPage title="Job Details" />} />
            <Route path="/job/:id/apply" element={<PlaceholderPage title="Apply for Job" />} />
            <Route path="/candidate/signup" element={<CreateProfile />} />
            <Route path="/candidate/login" element={<CandidateLogin />} />
            <Route path="/candidate/apply" element={<CreateProfile />} />
            <Route path="/create-profile" element={<CreateProfile />} />
            <Route path="/signup" element={<CreateProfile />} />
            <Route path="/profile/success" element={<ProfileSuccess />} />
            <Route path="/candidate/dashboard" element={<PlaceholderPage title="Candidate Dashboard" />} />
            <Route path="/candidate/applications" element={<PlaceholderPage title="My Applications" />} />
            <Route path="/candidate/interview-prep" element={<PlaceholderPage title="Interview Prep" />} />
            <Route path="/candidate/resume-builder" element={<PlaceholderPage title="Resume Builder" />} />
            <Route path="/candidate/assessments" element={<PlaceholderPage title="Skill Assessments" />} />
            <Route path="/candidate/mock-interviews" element={<PlaceholderPage title="Mock Interviews" />} />
            <Route path="/candidate/salary-insights" element={<PlaceholderPage title="Salary Insights" />} />
            <Route path="/candidate/coaching" element={<PlaceholderPage title="Career Coaching" />} />

            {/* Employer Routes */}
            <Route path="/employer" element={<PlaceholderPage title="Employer Home" />} />
            <Route path="/employer/signup" element={<Registration />} />
            <Route path="/employer/login" element={<EmployerLogin />} />
            <Route path="/employer/agreement" element={<Agreement />} />
            <Route path="/employer/terms" element={<Terms />} />
            <Route path="/employer/plans" element={<Plans />} />
            <Route path="/employer/onboarding" element={<Onboarding />} />
            <Route path="/employer/dashboard" element={<EmployerDashboard />} />
            <Route path="/employer/post-job" element={<PlaceholderPage title="Post a Job" />} />
            <Route path="/employer/job-requirements" element={<JobRequirements />} />
            <Route path="/employer/shortlist" element={<PlaceholderPage title="Candidate Shortlist" />} />
            <Route path="/employer/campus-hiring" element={<PlaceholderPage title="Campus Hiring" />} />
            <Route path="/employer/partnerships" element={<PlaceholderPage title="Partnerships" />} />
            <Route path="/employer/pricing" element={<PlaceholderPage title="Pricing Plans" />} />
            <Route path="/employer/case-studies" element={<PlaceholderPage title="Case Studies" />} />
            <Route path="/employer/demo" element={<PlaceholderPage title="Request Demo" />} />

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
            <Route path="/admin" element={<PlaceholderPage title="Admin Dashboard" />} />
            <Route path="/admin/crm" element={<PlaceholderPage title="CRM Integrations" />} />
            <Route path="/admin/reports" element={<PlaceholderPage title="Reports & Analytics" />} />
            <Route path="/admin/audit" element={<PlaceholderPage title="Audit Logs" />} />

            {/* Support & Community Routes */}
            <Route path="/support" element={<PlaceholderPage title="Support Center" />} />
            <Route path="/ambassador" element={<PlaceholderPage title="Ambassador Program" />} />
            <Route path="/referral" element={<PlaceholderPage title="Referral Program" />} />
            <Route path="/partner-portal" element={<PlaceholderPage title="Partner Portal" />} />
            <Route path="/api" element={<PlaceholderPage title="API Documentation" />} />
            <Route path="/accessibility" element={<PlaceholderPage title="Accessibility" />} />
            <Route path="/press" element={<PlaceholderPage title="Press & Media" />} />
            <Route path="/community-guidelines" element={<PlaceholderPage title="Community Guidelines" />} />

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
    </EmployerProvider>
  </QueryClientProvider>
);

export default App;
