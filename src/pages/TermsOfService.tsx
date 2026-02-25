import { Separator } from "@/components/ui/separator";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing or using the Gradia platform ("Platform"), including our website, mobile applications, and services, you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Platform. These Terms apply to all users, including candidates, employers, freelancers, and visitors.`,
  },
  {
    title: "2. Definitions",
    content: `"Gradia" refers to Gradia Consultancy Services and its affiliates.\n"User" refers to any individual or entity that accesses or uses the Platform.\n"Candidate" refers to job seekers registered on the Platform.\n"Employer" refers to companies or individuals posting jobs or hiring through the Platform.\n"Freelancer" refers to independent professionals offering services through the Platform.\n"Services" refers to all features, tools, and functionalities provided by Gradia.`,
  },
  {
    title: "3. User Accounts",
    content: `To access certain features, you must create an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You agree to provide accurate, current, and complete information during registration. Gradia reserves the right to suspend or terminate accounts that violate these Terms or contain false information.`,
  },
  {
    title: "4. Candidate Terms",
    content: `Candidates may create profiles, upload resumes, apply for jobs, and access interview preparation tools. All information submitted must be truthful and accurate. Candidates are solely responsible for the content of their profiles and resumes. Gradia does not guarantee employment or placement. Mock interviews, assessments, and AI-generated feedback are provided for guidance only and do not constitute professional advice.`,
  },
  {
    title: "5. Employer Terms",
    content: `Employers may post job listings, review candidate profiles, and manage hiring pipelines. Job postings must comply with applicable employment laws and must not contain discriminatory language. Employers are responsible for the accuracy of their company information and job descriptions. Gradia reserves the right to review, edit, or remove job postings that violate our policies. Subscription fees, if applicable, are non-refundable unless stated otherwise in the specific plan terms.`,
  },
  {
    title: "6. Freelancer Terms",
    content: `Freelancers may create portfolios, submit proposals, and offer mentorship services. Freelancers are independent contractors and not employees of Gradia. All project agreements and payments between freelancers and clients are the responsibility of the respective parties. Gradia is not liable for disputes arising from freelancer-client engagements.`,
  },
  {
    title: "7. Payments & Subscriptions",
    content: `Certain features require paid subscriptions or one-time payments. All prices are displayed in Indian Rupees (₹) unless stated otherwise. Payments are processed through secure third-party payment gateways. Refund policies are governed by the specific plan or service terms. Discount coupons are subject to their individual terms and expiration dates.`,
  },
  {
    title: "8. Intellectual Property",
    content: `All content, designs, logos, trademarks, and software on the Platform are the property of Gradia or its licensors. Users may not copy, modify, distribute, or reproduce any Platform content without prior written consent. Content uploaded by users (resumes, portfolios, job posts) remains the property of the respective user, but users grant Gradia a non-exclusive license to display and process such content for Platform operations.`,
  },
  {
    title: "9. Prohibited Conduct",
    content: `Users shall not:\n• Use the Platform for unlawful purposes or to violate any laws.\n• Post false, misleading, or fraudulent information.\n• Harass, abuse, or threaten other users.\n• Attempt to gain unauthorized access to Platform systems.\n• Use automated tools to scrape or extract data.\n• Interfere with the proper functioning of the Platform.\n• Impersonate any person or entity.\n• Upload malicious software or harmful content.`,
  },
  {
    title: "10. Privacy & Data Protection",
    content: `Your use of the Platform is also governed by our Privacy Policy. By using the Platform, you consent to the collection, use, and processing of your data as described therein. Gradia implements industry-standard security measures to protect user data. We do not sell personal information to third parties.`,
  },
  {
    title: "11. AI & Automated Features",
    content: `Gradia uses artificial intelligence for resume parsing, interview assessments, job matching, and other features. AI-generated results are provided as suggestions and should not be considered definitive evaluations. Gradia does not guarantee the accuracy of AI-powered features and is not liable for decisions made based on AI outputs.`,
  },
  {
    title: "12. Limitation of Liability",
    content: `Gradia provides the Platform "as is" without warranties of any kind, express or implied. To the maximum extent permitted by law, Gradia shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform. Gradia's total liability shall not exceed the amount paid by you, if any, for accessing the Platform in the 12 months preceding the claim.`,
  },
  {
    title: "13. Termination",
    content: `Gradia may suspend or terminate your access to the Platform at any time, with or without cause, and with or without notice. Upon termination, your right to use the Platform ceases immediately. Provisions that by their nature should survive termination shall remain in effect, including intellectual property, limitation of liability, and dispute resolution clauses.`,
  },
  {
    title: "14. Modifications to Terms",
    content: `Gradia reserves the right to modify these Terms at any time. Changes will be posted on this page with an updated effective date. Continued use of the Platform after changes constitutes acceptance of the revised Terms. We encourage users to review these Terms periodically.`,
  },
  {
    title: "15. Governing Law & Disputes",
    content: `These Terms are governed by the laws of India. Any disputes arising from these Terms or your use of the Platform shall be subject to the exclusive jurisdiction of courts in Hyderabad, Telangana, India. Users agree to attempt resolution through good-faith negotiation before pursuing legal action.`,
  },
  {
    title: "16. Contact Us",
    content: `If you have questions about these Terms of Service, please contact us at:\n\nEmail: support@gradia.co.in\nLocations: Bangalore & Hyderabad\nBusiness Hours: Mon–Fri, 9 AM – 6 PM IST`,
  },
];

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Last updated: February 25, 2026</p>
        </div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <div key={i}>
              <h2 className="text-lg font-semibold text-foreground mb-2">{section.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{section.content}</p>
              {i < sections.length - 1 && <Separator className="mt-8" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
