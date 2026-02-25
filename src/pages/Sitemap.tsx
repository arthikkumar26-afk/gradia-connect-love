import { Link } from "react-router-dom";
import { MapPin, Briefcase, Building2, GraduationCap, BookOpen, Users, Headphones, Code } from "lucide-react";

const sections = [
  {
    title: "For Candidates",
    icon: Briefcase,
    links: [
      { name: "Browse All Jobs", path: "/jobs" },
      { name: "Software Jobs", path: "/jobs/software" },
      { name: "Education Jobs", path: "/jobs/education" },
      { name: "Candidate Signup", path: "/candidate/signup" },
      { name: "Candidate Login", path: "/candidate/login" },
      { name: "Candidate Dashboard", path: "/candidate/dashboard" },
      { name: "Resume Builder", path: "/candidate/resume-builder" },
      { name: "Interview Prep", path: "/candidate/interview-prep" },
      { name: "Career Coaching", path: "/candidate/coaching" },
      { name: "Salary Insights", path: "/candidate/salary-insights" },
      { name: "Quick Register", path: "/candidate/quick-register" },
    ],
  },
  {
    title: "For Employers",
    icon: Building2,
    links: [
      { name: "Employer Signup", path: "/employer/signup" },
      { name: "Employer Login", path: "/employer/login" },
      { name: "Employer Dashboard", path: "/employer/dashboard" },
      { name: "Post a Job", path: "/employer/post-job" },
      { name: "Pricing Plans", path: "/employer/pricing" },
      { name: "Request Demo", path: "/employer/demo" },
      { name: "Campus Hiring", path: "/employer/campus-hiring" },
      { name: "Partnerships", path: "/employer/partnerships" },
      { name: "Employer Benefits", path: "/employer/benefits" },
      { name: "Terms & Conditions", path: "/employer/terms" },
    ],
  },
  {
    title: "For Freelancers",
    icon: Code,
    links: [
      { name: "Freelancer Signup", path: "/freelancer/signup" },
      { name: "Freelancer Login", path: "/freelancer/login" },
      { name: "Freelancer Dashboard", path: "/freelancer/dashboard" },
    ],
  },
  {
    title: "Learning",
    icon: GraduationCap,
    links: [
      { name: "Tech Learning", path: "/learning/tech" },
      { name: "Non-Tech Learning", path: "/learning/non-tech" },
      { name: "Education & Teaching", path: "/learning/education" },
      { name: "Languages & Communication", path: "/learning/languages" },
      { name: "All Categories", path: "/learning/all-categories" },
    ],
  },
  {
    title: "Company",
    icon: Users,
    links: [
      { name: "About Us", path: "/about" },
      { name: "Careers", path: "/careers" },
      { name: "Blog", path: "/blog" },
      { name: "Press & Media", path: "/press" },
      { name: "Contact", path: "/contact" },
      { name: "Community Guidelines", path: "/community-guidelines" },
      { name: "Ambassador Program", path: "/ambassador" },
      { name: "Partner Portal", path: "/partner-portal" },
      { name: "Companies", path: "/companies" },
    ],
  },
  {
    title: "Resources",
    icon: BookOpen,
    links: [
      { name: "Events & Workshops", path: "/events" },
      { name: "FAQ", path: "/faq" },
      { name: "Signup Portal", path: "/signup" },
    ],
  },
  {
    title: "Support & Legal",
    icon: Headphones,
    links: [
      { name: "Help Center", path: "/support" },
      { name: "Privacy Policy", path: "/privacy" },
      { name: "Terms of Service", path: "/terms" },
      { name: "Accessibility", path: "/accessibility" },
      { name: "API Documentation", path: "/api" },
    ],
  },
];

const Sitemap = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-xl bg-accent/10 mb-4">
            <MapPin className="h-7 w-7 text-accent" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Sitemap</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            A complete overview of all pages available on Gradia.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.title}>
                <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3 text-base">
                  <Icon className="h-4 w-4 text-accent" />
                  {section.title}
                </h2>
                <ul className="space-y-1.5">
                  {section.links.map((link) => (
                    <li key={link.path}>
                      <Link
                        to={link.path}
                        className="text-sm text-muted-foreground hover:text-accent transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Sitemap;
