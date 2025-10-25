import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Building2, HelpCircle, MessageCircle } from "lucide-react";

const FAQ = () => {
  const candidateFAQs = [
    {
      question: "How do I create a profile on Gradia?",
      answer: "Creating a profile is simple! Click 'Apply Now' and follow our step-by-step guide. You'll need to provide your basic information, work experience, skills, and career preferences. Our AI will then start matching you with relevant opportunities."
    },
    {
      question: "Is Gradia free for candidates?",
      answer: "Yes! All our candidate services are completely free, including profile creation, job matching, application submission, and career coaching resources."
    },
    {
      question: "How does the job matching work?",
      answer: "Our AI-powered system analyzes your skills, experience, career goals, and preferences to match you with relevant opportunities from our partner companies. You'll receive personalized job recommendations directly to your dashboard."
    },
    {
      question: "What kind of support do you provide during the interview process?",
      answer: "We offer comprehensive interview preparation including mock interviews, company-specific coaching, salary negotiation tips, and ongoing support throughout your job search journey."
    },
    {
      question: "How long does it take to find a job through Gradia?",
      answer: "Our average time to placement is 4-6 weeks, though this varies based on your experience level, preferences, and market conditions. Many candidates receive interview invitations within the first week."
    }
  ];

  const employerFAQs = [
    {
      question: "How does Gradia screen candidates?",
      answer: "We use a multi-step vetting process including skills assessments, background verification, and cultural fit evaluation. Only pre-qualified candidates are presented to our employer partners."
    },
    {
      question: "What are your pricing plans for employers?",
      answer: "We offer flexible pricing models including per-hire fees, monthly subscriptions, and enterprise packages. Contact our sales team for a customized quote based on your hiring needs."
    },
    {
      question: "How quickly can you provide candidate matches?",
      answer: "Most employers receive their first batch of qualified candidates within 48-72 hours of posting a job. Our AI system immediately begins matching based on your specific requirements."
    },
    {
      question: "Do you offer any guarantees?",
      answer: "Yes! We provide a 90-day replacement guarantee. If a placed candidate doesn't work out within 90 days, we'll find you a replacement at no additional cost."
    },
    {
      question: "Can you help with bulk hiring or campus recruitment?",
      answer: "Absolutely! We specialize in volume hiring and have dedicated campus recruitment programs. Our team can handle everything from job fairs to bulk assessments."
    }
  ];

  const generalFAQs = [
    {
      question: "What industries do you specialize in?",
      answer: "We focus primarily on software/technology and education sectors, with plans to expand into healthcare, finance, and other professional services."
    },
    {
      question: "Do you work with international candidates and companies?",
      answer: "Yes! We work with candidates and companies globally, though we specialize in US, Canada, and UK markets. We can help with visa sponsorship connections when needed."
    },
    {
      question: "How do you ensure data privacy and security?",
      answer: "We're GDPR compliant and use enterprise-grade security measures to protect all personal and company data. Your information is never shared without explicit consent."
    },
    {
      question: "Can I delete my profile if I find a job elsewhere?",
      answer: "Of course! You can pause or delete your profile at any time from your dashboard settings. We also automatically pause active searches when you accept a position."
    }
  ];

  return (
    <div className="min-h-screen">
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto mb-8">
            Find answers to common questions about our platform, services, and processes.
          </p>
          
          {/* Search */}
          <div className="max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search FAQs..." 
                className="pl-10 bg-background/95 text-foreground"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* For Candidates */}
            <div>
              <Card className="mb-6">
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <CardTitle>For Candidates</CardTitle>
                  <CardDescription>Questions about job searching and our platform</CardDescription>
                </CardHeader>
              </Card>

              <Accordion type="single" collapsible className="space-y-2">
                {candidateFAQs.map((faq, index) => (
                  <AccordionItem key={index} value={`candidate-${index}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* For Employers */}
            <div>
              <Card className="mb-6">
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-4">
                    <Building2 className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <CardTitle>For Employers</CardTitle>
                  <CardDescription>Questions about hiring and our services</CardDescription>
                </CardHeader>
              </Card>

              <Accordion type="single" collapsible className="space-y-2">
                {employerFAQs.map((faq, index) => (
                  <AccordionItem key={index} value={`employer-${index}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* General */}
            <div>
              <Card className="mb-6">
                <CardHeader className="text-center">
                  <div className="mx-auto w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-4">
                    <HelpCircle className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <CardTitle>General</CardTitle>
                  <CardDescription>General questions about Gradia</CardDescription>
                </CardHeader>
              </Card>

              <Accordion type="single" collapsible className="space-y-2">
                {generalFAQs.map((faq, index) => (
                  <AccordionItem key={index} value={`general-${index}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </div>
      </section>

      {/* Still have questions */}
      <section className="py-16 bg-subtle">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Still Have Questions?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="cta" size="lg">
              <MessageCircle className="h-5 w-5 mr-2" />
              Live Chat
            </Button>
            <Button variant="outline" size="lg">
              Contact Support
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQ;