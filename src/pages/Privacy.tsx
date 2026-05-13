import { Helmet } from "react-helmet-async";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";

const sections = [
  {
    title: "1. About This Privacy Policy",
    content: `This Privacy Policy explains how Gradia Consultancy Services ("Gradia," "we," "us") collects, uses, stores, and protects personal information when you use the Gradia platform. This policy applies to all users: Candidates, Employers, Freelancers, Sponsors, and Visitors.`,
  },
  {
    title: "2. Information We Collect",
    subtitle: "A. Registration & Profile Data",
    points: [
      "Full name, email address, phone number, date of birth, and gender provided during signup (Candidate, Employer, Freelancer, or Sponsor registration).",
      "Candidate profiles: educational qualifications (SSC, Intermediate, Degree, PG, PhD), work experience, family details, address information (present and permanent), and career preferences.",
      "Employer profiles: company name, company email, phone, website, industry category, state, district, pin code, and company description.",
      "Freelancer profiles: bio, tagline, skills, social links (GitHub, LinkedIn, Twitter, website), and portfolio project details.",
      "Sponsor profiles: company details, sponsorship tier preferences, stall reservations, and branding assets.",
    ],
  },
  {
    title: "",
    subtitle: "B. Resume & Document Data",
    points: [
      "Resumes uploaded in PDF, DOC, DOCX, JPG, or PNG format. These are parsed using AI to extract skills, experience, education, and contact details.",
      "Profile pictures uploaded and optionally cropped using the in-platform image editor.",
      "Mentorship documents, homework submissions, and portfolio media (images, videos) uploaded by freelancers and candidates.",
      "Interview recordings (audio/video) captured during Mock Interviews, AI Interview Sessions, and Demo Rounds with user consent.",
    ],
  },
  {
    title: "",
    subtitle: "C. Usage & Interaction Data",
    points: [
      "Pages visited, features used, time spent on the platform, and navigation patterns.",
      "Job applications submitted, interview stages completed, mock test scores, and AI feedback received.",
      "Search queries, job filters applied, and learning platform interactions.",
      "Chatbot conversations with the AI Sales Chatbot for platform inquiries.",
    ],
  },
  {
    title: "",
    subtitle: "D. Device & Technical Data",
    points: [
      "IP address (recorded during employer agreement signing and general platform access).",
      "Browser type, operating system, device type, and screen resolution.",
      "Cookies and local storage data for session management and user preferences.",
    ],
  },
  {
    title: "",
    subtitle: "E. Payment Data",
    points: [
      "Subscription plan selections, transaction IDs, payment status, and coupon codes applied.",
      "Payment processing is handled by Razorpay. Gradia does not store credit/debit card numbers, CVV, or banking credentials.",
    ],
  },
  {
    title: "3. How We Use Your Information",
    points: [
      "Profile Matching: Connecting candidates with relevant job opportunities based on skills, experience, location, and preferences.",
      "AI-Powered Features: Resume parsing, interview question generation, candidate evaluation scoring, job description generation, and learning course recommendations using Google Gemini and OpenAI models.",
      "Interview Pipeline: Managing the end-to-end interview process including Screening Tests, Technical Interviews, Demo Rounds, Viva, and HR Rounds.",
      "Communication: Sending registration confirmations, interview invitations, status notifications, offer letters, slot booking confirmations, and demo feedback via email.",
      "Mock Interviews: Providing AI-driven practice sessions with automated scoring, feedback, and stage-by-stage progress tracking.",
      "Employer Operations: Facilitating job posting, candidate management, application tracking, team management, and subscription billing.",
      "Freelancer Portfolios: Displaying public portfolios with project showcases, and enabling mentorship tools (homework assignment, document review, course tracking).",
      "Sponsor Engagement: Managing sponsorship packages, stall reservations, brand visibility analytics, and event reports.",
      "Platform Improvement: Analyzing usage patterns to enhance features, fix issues, and develop new capabilities.",
      "Admin & Moderation: Job moderation, user role management, audit logging, and platform-wide analytics for the admin and owner dashboards.",
    ],
  },
  {
    title: "4. Information Sharing & Disclosure",
    points: [
      "With Employers: Candidate profiles, resumes, interview scores, and AI evaluations are shared with employers only when a candidate applies to their job or is added to their interview pipeline.",
      "With Management Team: Demo round recordings and interview results may be shared with registered management reviewers for feedback and evaluation purposes.",
      "AI Service Providers: Resume data and interview responses are processed by Google Gemini and OpenAI APIs for AI-powered analysis. These providers process data per their own privacy policies.",
      "Payment Processor: Transaction details are shared with Razorpay for payment processing and verification.",
      "Email Services: Candidate and employer email addresses are used for transactional notifications through our email delivery system.",
      "Legal Compliance: We may disclose information when required by Indian law, court orders, or to protect the rights, safety, or property of Gradia and its users.",
      "Never Sold: Gradia does not sell, rent, or trade personal information to third parties for marketing or advertising purposes.",
    ],
  },
  {
    title: "5. Data Storage & Security",
    points: [
      "All data is stored on secure cloud infrastructure with encryption at rest and in transit.",
      "User authentication uses industry-standard practices including email verification, secure password hashing, and session management.",
      "File uploads (resumes, profile pictures, recordings, portfolio media) are stored in secure cloud storage buckets with access controls.",
      "Row-Level Security (RLS) policies ensure users can only access their own data. Employers can only view candidates who have applied to their jobs.",
      "Admin and owner access is role-restricted and logged for audit purposes.",
      "Regular security monitoring and updates are performed to address vulnerabilities.",
      "Employer agreement signatures are recorded with timestamps and IP addresses for legal verification.",
    ],
  },
  {
    title: "6. Cookies & Local Storage",
    points: [
      "Session cookies: Used to maintain your login session and authentication state.",
      "Preference cookies: Store UI preferences such as theme selection (light/dark mode) and dashboard layout settings.",
      "Analytics: We may use anonymized usage data to understand platform performance and user behavior patterns.",
      "You can manage cookies through your browser settings. Disabling cookies may affect platform functionality, particularly login and session management.",
    ],
  },
  {
    title: "7. Data Retention",
    points: [
      "Active accounts: All profile data, applications, interview results, and uploaded files are retained while the account is active.",
      "Inactive accounts: Accounts with no login activity for 24 months may be flagged for deletion. Users will be notified via email before any data is removed.",
      "Deleted accounts: Upon account deletion request, personal data is removed within 30 days. Some data may be retained in backups for up to 90 days.",
      "Interview recordings: Stored for 12 months after the interview date, then automatically purged unless retained by employer request.",
      "Payment records: Transaction records are retained for 7 years as required by Indian tax and financial regulations.",
      "Audit logs: Admin and system activity logs are retained for 3 years for compliance and troubleshooting purposes.",
      "Employer agreements: Digital agreement records are retained permanently as legal documents.",
    ],
  },
  {
    title: "8. Your Privacy Rights",
    points: [
      "Access: Request a copy of all personal data we hold about you by emailing privacy@gradia.co.in.",
      "Correction: Update or correct your personal information at any time through your profile settings (Edit Profile, Education Modal, Experience Modal, Address Modal, Family Modal).",
      "Deletion: Request complete deletion of your account and associated data. Active subscriptions will not be refunded upon deletion.",
      "Data Portability: Request your data in a machine-readable format (JSON/CSV) for transfer to another service.",
      "Withdraw Consent: Opt out of non-essential data processing. Note that withdrawing consent for core features may limit platform functionality.",
      "Opt-out of Communications: Unsubscribe from marketing emails at any time. Transactional emails (interview invitations, status updates) cannot be opted out while the account is active.",
      "Object to AI Processing: Request that your resume or interview responses not be processed by AI systems. Manual alternatives may have limited availability.",
    ],
  },
  {
    title: "9. Children's Privacy",
    content: `Gradia is intended for users aged 18 and above. We do not knowingly collect personal information from individuals under 18 years of age. If we become aware that a minor has registered, we will promptly delete their account and associated data.`,
  },
  {
    title: "10. Third-Party Links & Integrations",
    points: [
      "The platform may contain links to external job listings, company websites, learning resources, and sponsor pages.",
      "External job listings aggregated on Gradia link to third-party application pages. Gradia is not responsible for the privacy practices of these external sites.",
      "Freelancer portfolios may include links to GitHub, LinkedIn, and personal websites. These are user-provided and governed by respective platform policies.",
      "Gradia is not responsible for data handling by third-party services accessed through our platform.",
    ],
  },
  {
    title: "11. AI & Automated Decision-Making",
    points: [
      "Gradia uses AI models (Google Gemini and OpenAI) for resume analysis, interview evaluation, and candidate scoring. These are advisory tools, not final decision-makers.",
      "AI-generated ATS scores, interview ratings, and feedback are algorithmic outputs that may contain biases or inaccuracies.",
      "Employers are encouraged to use AI scores as one input among many in their hiring decisions, not as the sole criterion.",
      "AI Paper Detection for identifying potential malpractice in interviews uses pattern analysis. Results are flagged for human review.",
      "Users may request human review of any AI-generated assessment by contacting support.",
    ],
  },
  {
    title: "12. Changes to This Policy",
    content: `Gradia may update this Privacy Policy periodically to reflect changes in our practices, technology, or legal requirements. The updated version will be posted on this page with a revised effective date. For significant changes, registered users will be notified via email. Continued use of the platform after modifications constitutes acceptance of the updated policy.`,
  },
  {
    title: "13. Contact Information",
    content: `For privacy-related questions, data access requests, or concerns:\n\nPrivacy Team Email: privacy@gradia.co.in\nGeneral Support: info@gradiaa.com\nOffice Locations: Bangalore & Hyderabad, India\nBusiness Hours: Monday – Friday, 9:00 AM – 6:00 PM IST`,
  },
];

const Privacy = () => {
  return (
    <>
      <Helmet>
        <title>Privacy Policy - Gradia</title>
        <meta name="description" content="Gradia's privacy policy explains how we collect, use, and protect your personal information across our recruitment platform." />
        <link rel="canonical" href="https://gradiaa.com/privacy" />
      </Helmet>
      <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Effective Date: February 25, 2026 · Last Updated: February 25, 2026</p>
          <p className="text-sm text-muted-foreground mt-2">
            Your privacy is important to us. This policy describes how Gradia collects, uses, and protects your personal information across all platform features.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <div key={i}>
              {section.title && <h2 className="text-lg font-semibold text-foreground mb-3">{section.title}</h2>}
              {section.subtitle && <h3 className="text-base font-medium text-foreground mb-2">{section.subtitle}</h3>}
              {section.content && (
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
              )}
              {section.points && (
                <ul className="space-y-2">
                  {section.points.map((point, j) => (
                    <li key={j} className="flex gap-2 text-sm text-muted-foreground leading-relaxed">
                      <span className="text-accent mt-0.5 flex-shrink-0">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
              {i < sections.length - 1 && section.title && <Separator className="mt-8" />}
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-lg bg-muted/30 border border-border text-center">
          <p className="text-sm text-muted-foreground">
            By using Gradia, you agree to this Privacy Policy and our{" "}
            <Link to="/terms" className="text-accent hover:underline">Terms & Conditions</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
