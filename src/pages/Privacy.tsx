import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Lock, Eye, Users, FileText, Mail } from "lucide-react";

const Privacy = () => {
  const principles = [
    {
      icon: Shield,
      title: "Data Protection",
      description: "We use industry-standard encryption and security measures to protect your personal information."
    },
    {
      icon: Lock,
      title: "Secure Storage", 
      description: "All data is stored on secure, encrypted servers with regular security audits and updates."
    },
    {
      icon: Eye,
      title: "Transparency",
      description: "We're transparent about what data we collect, how we use it, and who we share it with."
    },
    {
      icon: Users,
      title: "User Control",
      description: "You have full control over your data with options to view, edit, or delete your information."
    }
  ];

  return (
    <div className="min-h-screen">
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Privacy Policy</h1>
          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
            Your privacy is our priority. Learn how we protect and handle your personal information.
          </p>
        </div>
      </section>

      {/* Privacy Principles */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Our Privacy Principles</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {principles.map((principle, index) => (
              <Card key={index} className="text-center hover:shadow-medium transition-all duration-200">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-4">
                    <principle.icon className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-xl">{principle.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{principle.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Policy Content */}
      <section className="py-16 bg-subtle">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto prose prose-lg">
            <Card>
              <CardContent className="p-8 space-y-8">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Information We Collect</h3>
                  <div className="text-muted-foreground space-y-4">
                    <p><strong>Personal Information:</strong> Name, email address, phone number, resume/CV, work experience, education, and career preferences.</p>
                    <p><strong>Usage Data:</strong> How you interact with our platform, including pages visited, time spent, and features used.</p>
                    <p><strong>Device Information:</strong> IP address, browser type, operating system, and device identifiers.</p>
                    <p><strong>Communication Data:</strong> Messages sent through our platform and correspondence with our support team.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">How We Use Your Information</h3>
                  <div className="text-muted-foreground space-y-4">
                    <p><strong>Job Matching:</strong> To connect you with relevant opportunities based on your skills and preferences.</p>
                    <p><strong>Communication:</strong> To send you job alerts, updates, and important platform notifications.</p>
                    <p><strong>Improvement:</strong> To enhance our services and develop new features based on user feedback.</p>
                    <p><strong>Support:</strong> To provide customer service and respond to your inquiries.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Information Sharing</h3>
                  <div className="text-muted-foreground space-y-4">
                    <p><strong>With Employers:</strong> We share candidate profiles with potential employers only with your explicit consent.</p>
                    <p><strong>Service Providers:</strong> We may share data with trusted third-party service providers who assist in platform operations.</p>
                    <p><strong>Legal Requirements:</strong> We may disclose information when required by law or to protect our rights and users' safety.</p>
                    <p><strong>Never Sold:</strong> We never sell your personal information to third parties for marketing purposes.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Your Rights</h3>
                  <div className="text-muted-foreground space-y-4">
                    <p><strong>Access:</strong> You can request a copy of all personal data we hold about you.</p>
                    <p><strong>Correction:</strong> You can update or correct your personal information at any time.</p>
                    <p><strong>Deletion:</strong> You can request deletion of your account and associated data.</p>
                    <p><strong>Portability:</strong> You can request your data in a machine-readable format.</p>
                    <p><strong>Opt-out:</strong> You can unsubscribe from marketing communications at any time.</p>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Data Security</h3>
                  <div className="text-muted-foreground space-y-4">
                    <p>We implement industry-standard security measures including:</p>
                    <ul className="list-disc list-inside space-y-2">
                      <li>End-to-end encryption for sensitive data</li>
                      <li>Regular security audits and penetration testing</li>
                      <li>Secure data centers with 24/7 monitoring</li>
                      <li>Employee background checks and security training</li>
                      <li>Multi-factor authentication for admin access</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Data Retention</h3>
                  <div className="text-muted-foreground space-y-4">
                    <p>We retain your personal information only as long as necessary to provide our services or as required by law. Specifically:</p>
                    <ul className="list-disc list-inside space-y-2">
                      <li>Active profiles: Retained while your account is active</li>
                      <li>Inactive accounts: Automatically deleted after 2 years of inactivity</li>
                      <li>Communication records: Retained for up to 3 years for support purposes</li>
                      <li>Legal requirements: Some data may be retained longer due to legal obligations</li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-4">Contact Information</h3>
                  <div className="text-muted-foreground space-y-4">
                    <p>If you have questions about this Privacy Policy or want to exercise your rights, contact us:</p>
                    <ul className="space-y-2">
                      <li><strong>Email:</strong> privacy@gradia.com</li>
                      <li><strong>Mail:</strong> Gradia Privacy Team, 123 Market St, San Francisco, CA 94105</li>
                      <li><strong>Phone:</strong> +1 (555) 012-3456</li>
                    </ul>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <p className="text-sm text-muted-foreground">
                    <strong>Last Updated:</strong> March 15, 2024<br/>
                    This policy may be updated periodically. We'll notify you of significant changes via email or platform notification.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Questions About Privacy?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Our privacy team is here to help you understand how we protect your data.
          </p>
          <Button variant="cta" size="lg">
            <Mail className="h-5 w-5 mr-2" />
            Contact Privacy Team
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Privacy;