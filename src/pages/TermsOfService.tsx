import { Helmet } from "react-helmet-async";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";

const sections = [
  {
    title: "1. About Gradia Platform",
    content: `Gradia is a recruitment and career development platform connecting candidates with employers across the Software and Education sectors. By registering or using any feature of the Gradia platform, you agree to the following Terms and Conditions. These apply to all roles: Candidates, Employers, Freelancers, Sponsors, and Visitors.`,
  },
  {
    title: "2. Registration & Account Responsibilities",
    points: [
      "Users must register with a valid email address and verify their identity through email confirmation before accessing the platform.",
      "Candidates, Employers, and Freelancers each have separate signup flows. Users must select the correct role during registration.",
      "Each user is responsible for keeping their login credentials secure. Gradia is not liable for unauthorized account access due to shared or compromised passwords.",
      "Providing false information during registration (name, qualifications, experience, company details) may result in immediate account suspension.",
      "Employers must complete company registration including company name, state, district, and industry category before posting jobs.",
    ],
  },
  {
    title: "3. Candidate Terms",
    points: [
      "Candidates can create detailed profiles including personal details, educational qualifications, work experience, family details, and address information.",
      "Resume uploads are parsed using AI technology. While Gradia strives for accuracy, candidates must verify and correct AI-extracted data before submission.",
      "The Resume Builder tool generates downloadable resumes. Gradia does not guarantee that any resume format will be accepted by all employers.",
      "Mock Interviews are AI-driven practice sessions across configurable pipelines (Written Test, Technical Interview, Demo Round, HR Round). Results and scores are for self-improvement only and do not represent actual employer evaluations.",
      "Mock Test scores, AI feedback, and Interview Prep recommendations are advisory. Gradia does not guarantee job placement based on these scores.",
      "Candidates can apply to jobs via the platform or through QR code scanning at job fairs. Each application is tracked and visible in the candidate dashboard.",
      "Candidate subscription plans (if purchased) provide enhanced features. Subscription fees are processed via Razorpay and are non-refundable once activated, unless stated otherwise in the specific plan.",
      "Career Coaching content and AI Learning Recommendations are for guidance purposes only and do not constitute certified professional advice.",
    ],
  },
  {
    title: "4. Employer Terms",
    points: [
      "Employers must sign the Gradia Service Agreement before accessing hiring features. This agreement is digitally recorded with timestamp and IP address.",
      "Job postings must contain accurate details including job title, description, requirements, salary range, and location. Misleading or discriminatory postings will be removed.",
      "All job postings are subject to admin moderation. Gradia reserves the right to approve, reject, or request modifications to any listing.",
      "The AI Interview Pipeline (Screening Test → Technical Interview → Demo Round → Viva → HR Round) is automated. Employers can configure which stages use AI-generated questions.",
      "Employer Dashboard features including Candidate Management, Interview Scheduling, Offer Letter Generation, and Background Verification (BGV) are tools provided as-is. Gradia does not guarantee the accuracy of AI-driven candidate scoring.",
      "Email templates for interview invitations, stage transitions, and offer letters can be customized. Employers are responsible for the content of all communications sent through the platform.",
      "Employer subscription and pricing plans are billed as per the selected tier. Plan features, limits, and pricing are subject to change with prior notice.",
      "Discount coupons applied during subscription purchase are validated in real-time. Expired, invalid, or fully-used coupons will be rejected.",
    ],
  },
  {
    title: "5. Freelancer Terms",
    points: [
      "Freelancers can build public portfolios showcasing projects with descriptions, tech stacks, images, and videos.",
      "Portfolio content (including uploaded media) is the sole responsibility of the freelancer. Gradia does not verify the authenticity of freelancer project claims.",
      "Mentorship features allow freelancers to manage students, assign homework, review submissions, and track progress. Gradia is not a party to any mentorship agreements or payments between freelancers and students.",
      "Freelancers are independent contractors, not employees of Gradia. The platform provides tools for visibility and engagement but does not guarantee project assignments or income.",
      "AI-powered resume analysis for portfolio generation is a convenience feature. Freelancers should review and edit AI-generated content before publishing.",
    ],
  },
  {
    title: "6. Sponsor & Partner Terms",
    points: [
      "Sponsors can register for event sponsorship packages including stall reservations, brand visibility, and candidate access at Gradia job fairs.",
      "Sponsorship tiers (Gold, Silver, Bronze, etc.) have defined deliverables. Gradia will make reasonable efforts to fulfill all commitments but is not liable for event-day variations.",
      "Sponsor analytics (page views, logo impressions, link clicks, leads generated) are tracked and reported. These metrics are approximate and for informational purposes.",
      "Branding resources and marketing toolkits provided to sponsors are for event-related use only and may not be repurposed without written consent.",
    ],
  },
  {
    title: "7. AI-Powered Features Disclaimer",
    points: [
      "Gradia uses AI (powered by Google Gemini and OpenAI models) for resume parsing, interview question generation, candidate evaluation, job description generation, and learning recommendations.",
      "AI-generated scores, feedback, and suggestions are algorithmic outputs and may contain inaccuracies. They should not be the sole basis for hiring or career decisions.",
      "AI Paper Detection in interviews is designed to flag potential malpractice. False positives may occur; employers should exercise human judgment alongside AI findings.",
      "The AI Sales Chatbot provides general platform information and is not a substitute for official customer support.",
      "Gradia continuously improves its AI models but does not guarantee error-free or bias-free outputs.",
    ],
  },
  {
    title: "8. Payments, Subscriptions & Refunds",
    points: [
      "All payments on Gradia are processed securely through Razorpay. Gradia does not store credit/debit card details.",
      "Subscription plans for Candidates and Employers activate immediately upon successful payment verification.",
      "Refund requests must be raised within 7 days of purchase by contacting info@gradiaa.com. Refunds are processed at Gradia's discretion and may take 5–10 business days.",
      "Failed payment transactions are not charged. If an amount is debited but the subscription is not activated, users should contact support with their transaction ID.",
      "Pricing is displayed in Indian Rupees (₹). Applicable taxes (GST) are included as per Indian tax regulations.",
    ],
  },
  {
    title: "9. Data Storage & File Uploads",
    points: [
      "Users can upload resumes (PDF, DOC, DOCX, JPG, PNG), profile pictures, interview recordings, demo videos, portfolio media, and mentorship documents.",
      "Maximum file sizes and supported formats are enforced at upload. Files exceeding limits will be rejected.",
      "Uploaded files are stored securely in cloud storage. Profile pictures and resumes in public buckets are accessible via generated URLs.",
      "Gradia reserves the right to scan uploaded content for malware and remove any files that violate platform policies.",
      "Upon account deletion, uploaded files may be retained for up to 30 days for backup purposes before permanent removal.",
    ],
  },
  {
    title: "10. Interview & Assessment Recordings",
    points: [
      "Mock interviews, AI interviews, and demo rounds may be recorded (audio/video) with user consent at the start of each session.",
      "Recordings are stored securely and are accessible to the candidate and the relevant employer (for live interviews).",
      "Live Interview Monitoring allows employers to observe ongoing AI interviews. Candidates are informed of this capability before starting.",
      "Gradia does not share interview recordings with third parties unless required by law or with explicit user consent.",
    ],
  },
  {
    title: "11. Communication & Notifications",
    points: [
      "Gradia sends transactional emails for registration, interview invitations, status updates, offer letters, and slot bookings via the platform's email system.",
      "Users consent to receive these communications by creating an account. Marketing emails include an unsubscribe option.",
      "SMS or WhatsApp notifications, if enabled in future, will require separate opt-in consent.",
      "Gradia is not responsible for email delivery failures caused by user-side spam filters or incorrect email addresses.",
    ],
  },
  {
    title: "12. Prohibited Activities",
    points: [
      "Creating multiple accounts to bypass platform limits or abuse free-tier features.",
      "Scraping, crawling, or using automated tools to extract data from the platform.",
      "Posting fake job listings, fraudulent company profiles, or misleading candidate information.",
      "Using the interview system to harass, discriminate, or unfairly evaluate candidates.",
      "Sharing login credentials or allowing unauthorized persons to access your account.",
      "Attempting to reverse-engineer, hack, or exploit platform vulnerabilities.",
      "Using Gradia's communication tools for spam, phishing, or unsolicited marketing.",
    ],
  },
  {
    title: "13. Intellectual Property",
    points: [
      "The Gradia brand, logo, UI design, codebase, and proprietary algorithms are the intellectual property of Gradia Consultancy Services.",
      "User-generated content (profiles, resumes, portfolios, job posts) remains the property of the respective user.",
      "By uploading content, users grant Gradia a non-exclusive, royalty-free license to display, process, and store such content for platform operations.",
      "Question papers, answer keys, and assessment materials uploaded by admins or employers are confidential and must not be redistributed.",
    ],
  },
  {
    title: "14. Platform Availability & Limitations",
    points: [
      "Gradia aims for 99.9% uptime but does not guarantee uninterrupted service. Scheduled maintenance will be communicated in advance when possible.",
      "Features may be added, modified, or deprecated based on platform evolution. Users will be notified of significant changes.",
      "Gradia is not liable for data loss, service interruptions, or errors caused by third-party integrations (payment gateways, AI providers, email services).",
    ],
  },
  {
    title: "15. Account Termination",
    points: [
      "Users may delete their account by contacting info@gradiaa.com. Active subscriptions will not be refunded upon voluntary termination.",
      "Gradia may suspend or permanently ban accounts that violate these Terms, engage in fraudulent activity, or harm other users.",
      "Employers whose job postings are repeatedly flagged or rejected may have their posting privileges revoked.",
      "Upon termination, access to dashboard data, interview results, and uploaded files will be revoked.",
    ],
  },
  {
    title: "16. Limitation of Liability",
    points: [
      "Gradia provides the platform 'as is' and 'as available' without any warranties, express or implied.",
      "Gradia is not responsible for hiring decisions made by employers or career decisions made by candidates based on platform data.",
      "Total liability of Gradia shall not exceed the subscription amount paid by the user in the preceding 12 months.",
      "Gradia is not liable for any indirect, consequential, or punitive damages arising from platform use.",
    ],
  },
  {
    title: "17. Governing Law & Jurisdiction",
    points: [
      "These Terms are governed by the laws of the Republic of India.",
      "Any disputes shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana, India.",
      "Users agree to attempt amicable resolution through Gradia's support channels before initiating legal proceedings.",
    ],
  },
  {
    title: "18. Changes to Terms",
    content: `Gradia reserves the right to update these Terms at any time. The updated version will be posted on this page with a revised effective date. Continued use of the platform after modifications constitutes acceptance of the updated Terms. For major changes, registered users will be notified via email.`,
  },
  {
    title: "19. Contact Information",
    content: `For questions, concerns, or disputes regarding these Terms and Conditions:\n\nEmail: info@gradiaa.com\nOffice Locations: Bangalore & Hyderabad, India\nBusiness Hours: Monday – Friday, 9:00 AM – 6:00 PM IST`,
  },
];

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Terms & Conditions</h1>
          <p className="text-sm text-muted-foreground">Effective Date: February 25, 2026 · Last Updated: February 25, 2026</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please read these terms carefully before using the Gradia platform. By registering or using any of our services, you acknowledge that you have read, understood, and agree to be bound by these Terms & Conditions.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-lg font-semibold text-foreground mb-3">{section.title}</h2>
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
              {i < sections.length - 1 && <Separator className="mt-8" />}
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 rounded-lg bg-muted/30 border border-border text-center">
          <p className="text-sm text-muted-foreground">
            By using Gradia, you agree to these Terms & Conditions and our{" "}
            <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
