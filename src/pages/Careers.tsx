import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { MapPin, Clock, Users, ArrowRight } from "lucide-react";

const Careers = () => {
  const openings = [
    {
      title: "Senior Software Engineer",
      department: "Engineering",
      location: "San Francisco, CA",
      type: "Full-time",
      description: "Join our engineering team to build the future of talent matching technology."
    },
    {
      title: "Product Manager",
      department: "Product",
      location: "Remote",
      type: "Full-time", 
      description: "Lead product strategy and roadmap for our candidate experience platform."
    },
    {
      title: "Customer Success Manager",
      department: "Customer Success",
      location: "New York, NY",
      type: "Full-time",
      description: "Help our clients achieve their hiring goals and build lasting relationships."
    }
  ];

  return (
    <div className="min-h-screen">
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Join Our Team</h1>
          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
            Help us transform how talent connects with opportunity. Build your career while building the future of hiring.
          </p>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Open Positions</h2>
          </div>

          <div className="space-y-6 max-w-4xl mx-auto">
            {openings.map((job, index) => (
              <Card key={index} className="hover:shadow-medium transition-all duration-200">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl mb-2">{job.title}</CardTitle>
                      <CardDescription>{job.description}</CardDescription>
                    </div>
                    <Badge variant="secondary">{job.department}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {job.location}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {job.type}
                      </div>
                    </div>
                    <Button variant="outline">
                      Apply Now
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Careers;