import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock,
  MessageCircle,
  Users,
  Building2,
  Send
} from "lucide-react";

const Contact = () => {
  const contactInfo = [
    {
      icon: Mail,
      title: "Email Us",
      description: "Get in touch via email",
      value: "hello@gradia.com",
      action: "mailto:hello@gradia.com"
    },
    {
      icon: Phone,
      title: "Call Us",
      description: "Speak with our team",
      value: "+1 (555) 012-3456",
      action: "tel:+1-555-012-3456"
    },
    {
      icon: MapPin,
      title: "Visit Us",
      description: "Our headquarters",
      value: "123 Market St, San Francisco, CA 94105",
      action: "#"
    },
    {
      icon: Clock,
      title: "Office Hours",
      description: "When we're available",
      value: "Mon-Fri: 9AM-6PM PST",
      action: "#"
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted");
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Get in Touch
          </h1>
          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
            Have questions? Want to learn more about our services? 
            We'd love to hear from you and help with your career or hiring needs.
          </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {contactInfo.map((info, index) => (
              <Card key={index} className="text-center hover:shadow-medium transition-all duration-200">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-4">
                    <info.icon className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-lg">{info.title}</CardTitle>
                  <CardDescription>{info.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {info.action.startsWith('#') ? (
                    <p className="font-medium text-foreground">{info.value}</p>
                  ) : (
                    <a 
                      href={info.action}
                      className="font-medium text-accent hover:text-accent-hover transition-colors"
                      target={info.action.startsWith('mailto:') || info.action.startsWith('tel:') ? '_self' : '_blank'}
                      rel="noopener noreferrer"
                    >
                      {info.value}
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Support Options */}
      <section className="py-16 bg-subtle">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Send Us a Message
              </h2>
              <Card>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name *</Label>
                        <Input id="firstName" placeholder="Your first name" required />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name *</Label>
                        <Input id="lastName" placeholder="Your last name" required />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address *</Label>
                      <Input id="email" type="email" placeholder="your.email@example.com" required />
                    </div>

                    <div>
                      <Label htmlFor="company">Company/Organization</Label>
                      <Input id="company" placeholder="Your company name" />
                    </div>

                    <div>
                      <Label htmlFor="inquiry">Type of Inquiry</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select inquiry type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="candidate">Candidate Support</SelectItem>
                          <SelectItem value="employer">Employer Services</SelectItem>
                          <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                          <SelectItem value="media">Media Inquiry</SelectItem>
                          <SelectItem value="general">General Question</SelectItem>
                          <SelectItem value="technical">Technical Support</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="subject">Subject *</Label>
                      <Input id="subject" placeholder="Brief subject line" required />
                    </div>

                    <div>
                      <Label htmlFor="message">Message *</Label>
                      <Textarea 
                        id="message" 
                        placeholder="Tell us more about your inquiry..."
                        rows={5}
                        required 
                      />
                    </div>

                    <Button type="submit" variant="cta" size="lg" className="w-full">
                      Send Message
                      <Send className="h-5 w-5 ml-2" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Support Options */}
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">
                Other Ways to Connect
              </h2>
              
              <div className="space-y-6">
                {/* For Candidates */}
                <Card className="hover:shadow-medium transition-all duration-200">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Users className="h-6 w-6 text-accent" />
                      <div>
                        <CardTitle>For Candidates</CardTitle>
                        <CardDescription>Career support and job search assistance</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Need help with your job search, resume, or interview preparation? 
                      Our candidate success team is here to support you.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Mail className="h-4 w-4 mr-2" />
                        candidates@gradia.com
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        Live Chat
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* For Employers */}
                <Card className="hover:shadow-medium transition-all duration-200">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Building2 className="h-6 w-6 text-accent" />
                      <div>
                        <CardTitle>For Employers</CardTitle>
                        <CardDescription>Hiring solutions and talent acquisition</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Looking to hire top talent? Our employer success team will help you 
                      find the perfect candidates for your organization.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Mail className="h-4 w-4 mr-2" />
                        employers@gradia.com
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Phone className="h-4 w-4 mr-2" />
                        Schedule Call
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* FAQ */}
                <Card className="hover:shadow-medium transition-all duration-200">
                  <CardHeader>
                    <CardTitle>Frequently Asked Questions</CardTitle>
                    <CardDescription>Find quick answers to common questions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Before reaching out, check our comprehensive FAQ section which covers 
                      most common questions about our services and platform.
                    </p>
                    <Button variant="outline" size="sm" className="w-full">
                      Browse FAQ
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Office Locations */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Locations
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              While we work with clients globally, here's where you can find our team.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <CardTitle>San Francisco HQ</CardTitle>
                <CardDescription>Main Office</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  123 Market Street<br />
                  San Francisco, CA 94105<br />
                  United States
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <CardTitle>New York</CardTitle>
                <CardDescription>East Coast Office</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  456 Broadway<br />
                  New York, NY 10013<br />
                  United States
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <CardTitle>London</CardTitle>
                <CardDescription>European Office</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  789 Tech Square<br />
                  London EC2A 4NE<br />
                  United Kingdom
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;