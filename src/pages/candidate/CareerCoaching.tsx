import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Calendar, MessageCircle, Target, TrendingUp, Users, Video } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const coachingServices = [
  {
    icon: Target,
    title: "Career Strategy",
    description: "Define your career goals and create an actionable roadmap",
    duration: "60 min",
    price: "$99",
  },
  {
    icon: MessageCircle,
    title: "Resume Review",
    description: "Get professional feedback on your resume and LinkedIn profile",
    duration: "45 min",
    price: "$79",
  },
  {
    icon: Video,
    title: "Mock Interview",
    description: "Practice interviews with industry professionals",
    duration: "90 min",
    price: "$129",
  },
  {
    icon: TrendingUp,
    title: "Salary Negotiation",
    description: "Learn strategies to negotiate better compensation",
    duration: "60 min",
    price: "$99",
  },
  {
    icon: Users,
    title: "Networking Skills",
    description: "Build connections and expand your professional network",
    duration: "60 min",
    price: "$89",
  },
  {
    icon: Calendar,
    title: "Career Transition",
    description: "Navigate career changes and industry switches",
    duration: "90 min",
    price: "$149",
  },
];

export default function CareerCoaching() {
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Request Submitted!",
      description: "A career coach will contact you within 24 hours.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/jobs" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Career Coaching</h1>
            <p className="text-muted-foreground">Get personalized guidance from industry experts</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <Card className="bg-gradient-card">
            <CardHeader>
              <CardTitle className="text-2xl">Why Career Coaching?</CardTitle>
              <CardDescription>Accelerate your career growth with expert guidance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Target className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Clarity & Direction</h3>
                  <p className="text-sm text-muted-foreground">
                    Identify your strengths and create a clear career path
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Faster Progress</h3>
                  <p className="text-sm text-muted-foreground">
                    Learn from experts who've been in your shoes
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="h-4 w-4 text-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Accountability</h3>
                  <p className="text-sm text-muted-foreground">
                    Stay on track with regular check-ins and support
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Request a Coaching Session</CardTitle>
              <CardDescription>Fill out the form and we'll match you with the right coach</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" required placeholder="John Doe" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required placeholder="john@example.com" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" placeholder="+1 234 567 8900" />
                </div>
                <div>
                  <Label htmlFor="service">Coaching Service</Label>
                  <Select>
                    <SelectTrigger id="service">
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {coachingServices.map((service) => (
                        <SelectItem key={service.title} value={service.title.toLowerCase().replace(/\s+/g, '-')}>
                          {service.title} - {service.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="goals">Your Goals & Challenges</Label>
                  <Textarea
                    id="goals"
                    placeholder="Tell us about your career goals and what you'd like help with..."
                    rows={4}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Request Coaching Session
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-6">Our Coaching Services</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coachingServices.map((service) => {
              const Icon = service.icon;
              return (
                <Card key={service.title} className="hover:shadow-medium transition-shadow">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{service.title}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{service.duration}</span>
                      <span className="font-semibold text-accent text-lg">{service.price}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
