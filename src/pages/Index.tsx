import Hero from "@/components/sections/Hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Users, 
  Building2, 
  TrendingUp, 
  Award, 
  Star,
  ArrowRight,
  CheckCircle,
  Target,
  Shield,
  Zap
} from "lucide-react";

const Index = () => {
  const features = [
    {
      icon: Target,
      title: "Targeted Matching",
      description: "AI-powered algorithms connect you with opportunities that perfectly match your skills and career goals."
    },
    {
      icon: Shield,
      title: "Trusted Partners",
      description: "Work with vetted companies and institutions that value talent and offer genuine career growth."
    },
    {
      icon: Zap,
      title: "Fast Process",
      description: "Streamlined application and hiring processes that save time for both candidates and employers."
    },
    {
      icon: Users,
      title: "Expert Support",
      description: "Get personalized career coaching, interview prep, and ongoing support throughout your journey."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Software Engineer at TechFlow",
      image: "👩‍💻",
      content: "Gradia helped me transition from bootcamp to my dream job at a top tech company. The personalized support made all the difference.",
      rating: 5
    },
    {
      name: "Dr. Michael Rodriguez",
      role: "Professor at Stanford University",
      image: "👨‍🏫",
      content: "Finding the right academic position was challenging until I found Gradia. Their education sector expertise is unmatched.",
      rating: 5
    },
    {
      name: "Jennifer Kim",
      role: "HR Director at InnovateEd",
      image: "👩‍💼",
      content: "We've hired 15+ exceptional candidates through Gradia. Their vetting process ensures we get quality talent every time.",
      rating: 5
    }
  ];

  const steps = [
    {
      number: "01",
      title: "Create Your Profile",
      description: "Build a comprehensive profile highlighting your skills, experience, and career aspirations."
    },
    {
      number: "02", 
      title: "Get Matched",
      description: "Our AI technology connects you with relevant opportunities from our partner network."
    },
    {
      number: "03",
      title: "Prepare & Apply",
      description: "Access interview prep, coaching resources, and apply with confidence."
    },
    {
      number: "04",
      title: "Land Your Dream Job",
      description: "Secure your ideal position with ongoing support throughout the process."
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section with Trending Jobs */}
      <Hero />

      {/* Features Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose Gradia?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We've revolutionized the hiring process with cutting-edge technology and personalized human support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center hover:shadow-medium transition-all duration-200 hover:-translate-y-1">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-xl mb-2">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started on your career journey in four simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="relative mb-6">
                  <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center text-primary-foreground font-bold text-xl mx-auto shadow-glow">
                    {step.number}
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className="hidden lg:block absolute top-1/2 -translate-y-1/2 left-full ml-4 h-6 w-6 text-accent" />
                  )}
                </div>
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="cta" size="lg" asChild>
              <Link to="/candidate/login">
                Get Started Today
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Success Stories
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of professionals who've found their perfect career match through Gradia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-medium transition-all duration-200">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="text-3xl">{testimonial.image}</div>
                    <div>
                      <CardTitle className="text-lg">{testimonial.name}</CardTitle>
                      <CardDescription>{testimonial.role}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-accent text-accent" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground italic">"{testimonial.content}"</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <Button variant="outline" size="lg" asChild>
              <Link to="/companies">
                Explore Companies
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* For Companies Section */}
      <section className="py-16 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Trusted by Leading Companies
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join 500+ companies that have streamlined their hiring process and found exceptional talent through Gradia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <Card className="text-center p-6">
              <CardHeader>
                <div className="text-4xl font-bold text-accent mb-2">95%</div>
                <CardTitle className="text-xl">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Of placements still active after 12 months</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6">
              <CardHeader>
                <div className="text-4xl font-bold text-accent mb-2">30%</div>
                <CardTitle className="text-xl">Faster Hiring</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Reduce time-to-hire with pre-screened candidates</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6">
              <CardHeader>
                <div className="text-4xl font-bold text-accent mb-2">10K+</div>
                <CardTitle className="text-xl">Qualified Candidates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">In our verified talent database</p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-background rounded-2xl p-8 shadow-large">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Why Companies Choose Gradia
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-accent flex-shrink-0" />
                    <span>Access to pre-vetted talent pool with verified skills</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-accent flex-shrink-0" />
                    <span>Dedicated account manager for personalized support</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-accent flex-shrink-0" />
                    <span>Flexible hiring solutions: permanent, contract, or temporary</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-accent flex-shrink-0" />
                    <span>90-day replacement guarantee for all placements</span>
                  </li>
                </ul>
              </div>
              <div className="bg-subtle rounded-xl p-6">
                <blockquote className="text-lg italic text-foreground mb-4">
                  "Gradia helped us fill 12 critical positions in just 6 weeks. Their understanding of both technical requirements and cultural fit is exceptional."
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="text-2xl">👨‍💼</div>
                  <div>
                    <div className="font-semibold">David Park</div>
                    <div className="text-sm text-muted-foreground">VP Engineering, TechFlow Inc</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Transform Your Career?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join our community of professionals and discover opportunities that will accelerate your career growth.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="professional" size="xl" className="bg-background text-foreground hover:bg-background/90 shadow-large" asChild>
              <Link to="/candidate/login">
                Apply Now
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" className="border-2 border-background text-background hover:bg-background hover:text-foreground bg-transparent" asChild>
              <Link to="/employer/login">
                Post Job Now
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
