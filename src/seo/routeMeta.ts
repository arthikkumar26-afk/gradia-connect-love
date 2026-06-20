// Per-route SEO metadata used by the build-time prerender plugin.
// Each entry generates a static <route>/index.html with replaced
// title, description, canonical, og:*, and twitter:* tags so non-JS
// social scrapers (LinkedIn, Slack, Facebook, WhatsApp) see accurate
// previews without needing to execute JavaScript.

export interface RouteMeta {
  path: string;          // e.g. "/about"
  title: string;
  description: string;
  ogType?: "website" | "article";
  ogImage?: string;
}

const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/NJf0leYKRLdRoELaBMpGJJsXBoX2/social-images/social-1768641108263-Gradia min logo - Copy.png";

export const SITE_ORIGIN = "https://gradia.world";
export const DEFAULT_IMAGE = DEFAULT_OG_IMAGE;

export const routeMeta: RouteMeta[] = [
  { path: "/", title: "Gradia — AI Hiring Platform for Candidates & Employers", description: "Gradia is an AI-powered hiring platform connecting candidates with employers across IT, Banking, Education and more. Find jobs, post roles, and hire faster." },
  { path: "/about", title: "About Gradia — Our Mission, Vision & Team", description: "Learn about Gradia's mission to transform hiring with AI, the team behind the platform, and the industries we serve." },
  { path: "/blog", title: "Gradia Blog — Hiring, Careers & AI Insights", description: "Articles and guides on modern hiring, candidate growth, AI in recruitment, and career development from the Gradia team." },
  { path: "/faq", title: "Gradia FAQ — Answers for Candidates & Employers", description: "Frequently asked questions about Gradia's hiring platform, pricing, AI screening, mock interviews, and employer tools." },
  { path: "/contact", title: "Contact Gradia — Support, Sales & Partnerships", description: "Get in touch with Gradia for career support, hiring solutions, partnerships, or general inquiries. Our team is here to help." },
  { path: "/pricing", title: "Gradia Pricing — Plans for Candidates & Employers", description: "Transparent pricing for candidates and employers. One-time registration for candidates, flexible plans for employers." },
  { path: "/careers", title: "Careers at Gradia — Join Our Team", description: "Explore open roles at Gradia and help build the future of AI-powered hiring." },
  { path: "/companies", title: "Hiring Companies on Gradia", description: "Browse companies hiring on Gradia across IT, Banking, Education, Film & Media, Civil Engineering and more." },
  { path: "/jobs", title: "Jobs on Gradia — Find Your Next Role", description: "Search jobs across industries and locations on Gradia. AI-matched roles for candidates at every stage of their career." },
  { path: "/jobs-results", title: "Job Search Results — Gradia", description: "Search results for jobs on Gradia. Filter by industry, location, and experience to find the right opportunity." },
  { path: "/jobs/software", title: "Software & IT Jobs on Gradia", description: "Browse software, engineering, and IT jobs hiring now on Gradia." },
  { path: "/jobs/education", title: "Education Jobs on Gradia", description: "Browse teaching, training, and education jobs hiring now on Gradia." },
  { path: "/learning", title: "Gradia Learning Platform — Upskill for Your Next Role", description: "Explore career coaching, skill-building, and curated learning paths to grow into your next role." },
  { path: "/learning/all", title: "All Learning Categories — Gradia", description: "Browse every learning category on Gradia: tech, non-tech, education, and languages." },
  { path: "/learning/tech", title: "Tech Learning Paths — Gradia", description: "Curated tech learning paths to build engineering, data, and product skills on Gradia." },
  { path: "/learning/non-tech", title: "Non-Tech Learning Paths — Gradia", description: "Curated learning paths for business, design, operations, and other non-tech careers on Gradia." },
  { path: "/learning/education", title: "Education Learning Paths — Gradia", description: "Learning paths for teachers, trainers, and education professionals on Gradia." },
  { path: "/learning/languages", title: "Language Learning Paths — Gradia", description: "Build language skills for global career opportunities on Gradia." },
  { path: "/login", title: "Login — Gradia", description: "Sign in to Gradia to manage your job applications, hiring pipeline, or organization dashboard." },
  { path: "/candidate/login", title: "Candidate Login — Gradia", description: "Sign in as a candidate to access your Gradia dashboard, applications, and mock interviews." },
  { path: "/candidate/signup", title: "Candidate Signup — Gradia", description: "Create a candidate account on Gradia to apply for jobs, take AI mock interviews, and grow your career." },
  { path: "/employer/login", title: "Employer Login — Gradia", description: "Sign in as an employer to post jobs and manage your hiring pipeline on Gradia." },
  { path: "/employer/signup", title: "Employer Signup — Gradia", description: "Create an employer account to start hiring on Gradia." },
  { path: "/employer/pricing", title: "Employer Pricing — Gradia", description: "Flexible employer plans for posting jobs and managing hiring on Gradia." },
  { path: "/employer/plans", title: "Employer Plans — Gradia", description: "Choose the right employer plan for your hiring volume on Gradia." },
  { path: "/employer/benefits", title: "Employer Benefits — Gradia", description: "Discover the benefits of hiring with Gradia: AI screening, structured pipelines, and faster time-to-hire." },
  { path: "/employer/terms", title: "Employer Terms — Gradia", description: "Terms and conditions for employers using Gradia's hiring platform and related services." },
  { path: "/employer/agreement", title: "Employer Agreement — Gradia", description: "Service agreement for employers using Gradia." },
  { path: "/employer/request-demo", title: "Request an Employer Demo — Gradia", description: "Request a personalized demo of Gradia's hiring platform for your team." },
  { path: "/hr/login", title: "HR Login — Gradia", description: "Sign in as an HR user to manage candidates and pipelines on Gradia." },
  { path: "/hr/portal", title: "HR Portal — Gradia", description: "Access the Gradia HR portal to manage hiring workflows." },
  { path: "/freelancer/login", title: "Freelancer Login — Gradia", description: "Sign in as a Gradia freelancer to manage your portfolio and projects." },
  { path: "/freelancer/signup", title: "Freelancer Signup — Gradia", description: "Sign up as a Gradia freelancer and start earning by helping candidates and employers." },
  { path: "/edutech", title: "Gradia EduTech — For Institutions", description: "EduTech tools on Gradia for institutions to manage student placements and campaigns." },
  { path: "/edutech/login", title: "EduTech Login — Gradia", description: "Sign in to the Gradia EduTech portal." },
  { path: "/edutech/signup", title: "EduTech Signup — Gradia", description: "Create an EduTech account on Gradia for your institution." },
  { path: "/signup", title: "Signup — Gradia", description: "Choose your account type and join Gradia as a candidate, employer, freelancer, or institution." },
  { path: "/forgot-password", title: "Forgot Password — Gradia", description: "Reset your Gradia account password." },
  { path: "/reset-password", title: "Reset Password — Gradia", description: "Set a new password for your Gradia account." },
  { path: "/privacy", title: "Privacy Policy — Gradia", description: "How Gradia collects, uses, and protects your personal information." },
  { path: "/terms", title: "Terms of Service — Gradia", description: "The terms governing your use of the Gradia platform." },
];
