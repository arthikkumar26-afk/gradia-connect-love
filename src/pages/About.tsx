import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Users, 
  Target, 
  Award, 
  Globe,
  Heart,
  Zap,
  Shield,
  TrendingUp,
  ArrowRight
} from "lucide-react";

const About = () => {
  const values = [
    {
      icon: Heart,
      title: "Human-Centered",
      description: "We believe technology should enhance human connections, not replace them."
    },
    {
      icon: Shield,
      title: "Trust & Transparency",
      description: "Every interaction is built on honesty, integrity, and clear communication."
    },
    {
      icon: Zap,
      title: "Innovation",
      description: "We continuously evolve our platform to meet the changing needs of the job market."
    },
    {
      icon: Globe,
      title: "Global Impact",
      description: "Creating opportunities that transcend geographical boundaries."
    }
  ];

  const team = [
    {
      name: "Sarah Johnson",
      role: "CEO & Founder",
      image: "👩‍💼",
      bio: "Former VP of Talent at Google, passionate about connecting people with purpose-driven work."
    },
    {
      name: "Michael Chen",
      role: "CTO & Co-Founder",
      image: "👨‍💻",
      bio: "Ex-engineering lead at LinkedIn, building the future of intelligent job matching."
    },
    {
      name: "Dr. Amanda Rodriguez",
      role: "Head of Education Partnerships",
      image: "👩‍🎓",
      bio: "Former Dean at MIT, bridging the gap between academia and industry."
    },
    {
      name: "David Kim",
      role: "VP of Operations",
      image: "👨‍💼",
      bio: "Operations expert with 15+ years scaling tech companies globally."
    }
  ];

  const stats = [
    { label: "Active Candidates", value: "50,000+", icon: Users },
    { label: "Partner Companies", value: "2,500+", icon: Target },
    { label: "Successful Placements", value: "25,000+", icon: Award },
    { label: "Countries Served", value: "35+", icon: Globe }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            About Gradia
          </h1>
          <p className="text-xl text-primary-foreground/90 max-w-3xl mx-auto mb-8">
            We're on a mission to transform how talent connects with opportunity, 
            creating meaningful careers that drive innovation and growth.
          </p>
          <Button variant="professional" size="lg" className="bg-background text-foreground hover:bg-background/90" asChild>
            <Link to="/contact">
              Get in Touch
              <ArrowRight className="h-5 w-5 ml-2" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Our Story
              </h2>
            </div>
            
            <div className="prose prose-lg max-w-none text-muted-foreground">
              <p className="text-lg leading-relaxed mb-6">
                Founded in 2020 by a team of former tech executives and education leaders, 
                Gradia was born from a simple observation: the traditional hiring process 
                was broken for both candidates and employers.
              </p>
              
              <p className="text-lg leading-relaxed mb-6">
                We saw talented individuals struggling to find opportunities that matched 
                their skills and aspirations, while companies spent months searching for 
                the right candidates. There had to be a better way.
              </p>
              
              <p className="text-lg leading-relaxed mb-6">
                Our approach combines cutting-edge AI technology with human expertise to 
                create meaningful connections. We don't just match skills to job descriptions 
                – we understand career goals, company culture, and long-term potential.
              </p>
              
              <p className="text-lg leading-relaxed">
                Today, we're proud to serve thousands of candidates and hundreds of companies 
                across the software and education sectors, with plans to expand into new 
                industries while maintaining our commitment to quality and personal attention.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Values
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do, from product development to client relationships.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="text-center hover:shadow-medium transition-all duration-200">
                <CardHeader>
                  <div className="mx-auto w-12 h-12 bg-gradient-accent rounded-lg flex items-center justify-center mb-4">
                    <value.icon className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <CardTitle className="text-xl mb-2">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">{value.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Impact
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Numbers that reflect our commitment to connecting talent with opportunity.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-accent rounded-lg mb-4">
                  <stat.icon className="h-8 w-8 text-accent-foreground" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-16 bg-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Meet Our Team
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The passionate individuals behind Gradia's mission to transform careers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="text-center hover:shadow-medium transition-all duration-200">
                <CardHeader>
                  <div className="text-6xl mb-4">{member.image}</div>
                  <CardTitle className="text-xl">{member.name}</CardTitle>
                  <Badge variant="secondary" className="mx-auto">{member.role}</Badge>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">{member.bio}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Join Our Mission
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Whether you're looking for your next career opportunity or seeking top talent, 
            we're here to help you succeed.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="professional" size="lg" className="bg-background text-foreground hover:bg-background/90" asChild>
              <Link to="/candidate/apply">
                Find Opportunities
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground hover:text-primary" asChild>
              <Link to="/employer/post-job">
                Hire Talent
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;