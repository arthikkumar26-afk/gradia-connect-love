import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const candidateLinks = [
    { name: "Browse All Jobs", path: "/jobs" },
    { name: "Software Jobs", path: "/jobs/software" },
    { name: "Education Jobs", path: "/jobs/education" },
    { name: "Resume Builder", path: "/candidate/resume-builder" },
    { name: "Interview Prep", path: "/candidate/interview-prep" },
    { name: "Career Coaching", path: "/candidate/coaching" },
    { name: "Salary Insights", path: "/candidate/salary-insights" },
  ];

  const employerLinks = [
    { name: "Post a Job", path: "/employer/post-job" },
    { name: "Employer Dashboard", path: "/employer/dashboard" },
    { name: "Campus Hiring", path: "/employer/campus-hiring" },
    { name: "Partnerships", path: "/employer/partnerships" },
    { name: "Pricing Plans", path: "/employer/pricing" },
    { name: "Case Studies", path: "/employer/case-studies" },
    { name: "Request Demo", path: "/employer/demo" },
  ];

  const learningLinks = [
    { name: "Tech Learning", path: "/learning/tech" },
    { name: "Non-Tech Learning", path: "/learning/non-tech" },
    { name: "Education & Teaching", path: "/learning/education" },
    { name: "Languages & Communication", path: "/learning/languages" },
    { name: "All Categories", path: "/learning/all-categories" },
    { name: "Blog", path: "/blog" },
    { name: "Events & Workshops", path: "/events" },
  ];

  const companyLinks = [
    { name: "About Us", path: "/about" },
    { name: "Careers", path: "/careers" },
    { name: "Press", path: "/press" },
    { name: "Contact", path: "/contact" },
    { name: "Community Guidelines", path: "/community-guidelines" },
    { name: "Ambassador Program", path: "/ambassador" },
    { name: "Partner Portal", path: "/partner-portal" },
  ];

  const supportLinks = [
    { name: "Help Center", path: "/support" },
    { name: "API Documentation", path: "/api" },
    { name: "Privacy Policy", path: "/privacy" },
    { name: "Terms of Service", path: "/terms" },
    { name: "Accessibility", path: "/accessibility" },
    { name: "Sitemap", path: "/sitemap" },
  ];

  return (
    <footer className="bg-subtle border-t border-border">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-8">
          {/* Brand & Newsletter */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <div className="h-8 w-8 rounded-lg bg-gradient-accent flex items-center justify-center">
                <span className="text-accent-foreground font-bold text-lg">G</span>
              </div>
              <span className="font-heading font-bold text-xl text-foreground">
                Gradia
              </span>
            </Link>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              Connecting exceptional talent with leading software companies and educational institutions. 
              Building careers, transforming futures.
            </p>
            
            {/* Newsletter Signup */}
            <div className="mb-6">
              <h4 className="font-semibold text-foreground mb-3">Stay Updated</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1"
                />
                <Button variant="default" size="sm">
                  Subscribe
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Get the latest job opportunities and career insights.
              </p>
            </div>

            {/* Social Media */}
            <div className="flex space-x-3">
              <Button variant="ghost" size="sm" asChild>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer">
                  <Linkedin className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                  <Twitter className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                  <Facebook className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-4 w-4" />
                </a>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
                  <Youtube className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* For Candidates */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">For Candidates</h4>
            <ul className="space-y-2">
              {candidateLinks.map((link) => (
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

          {/* For Employers */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">For Employers</h4>
            <ul className="space-y-2">
              {employerLinks.map((link) => (
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

          {/* Learning */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Learning</h4>
            <ul className="space-y-2">
              {learningLinks.map((link) => (
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

          {/* Company & Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2 mb-6">
              {companyLinks.map((link) => (
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

            <h4 className="font-semibold text-foreground mb-4">Support</h4>
            <ul className="space-y-2">
              {supportLinks.map((link) => (
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
        </div>

        <Separator className="mb-8" />

        {/* Contact Info & Bottom Footer */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex flex-col md:flex-row gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <a href="mailto:hello@gradia.com" className="hover:text-accent transition-colors">
                hello@gradia.com
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <a href="tel:+1-555-0123" className="hover:text-accent transition-colors">
                +1 (555) 012-3456
              </a>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>San Francisco, CA</span>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            © {currentYear} Gradia. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;