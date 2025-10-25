import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Quote, ArrowRight, Users, TrendingUp } from "lucide-react";

const SuccessStories = () => {
  const stories = [
    {
      candidate: "Alex Rivera",
      role: "Senior Frontend Developer",
      company: "TechFlow Solutions",
      image: "👨‍💻",
      story: "After months of unsuccessful job hunting, Gradia helped me land my dream role at a top tech company. The personalized coaching and interview prep made all the difference.",
      beforeRole: "Junior Developer",
      salaryIncrease: "85%",
      timeToHire: "3 weeks",
      rating: 5
    },
    {
      candidate: "Dr. Maria Santos",
      role: "Computer Science Professor",
      company: "Stanford University",
      image: "👩‍🏫",
      story: "Transitioning from industry back to academia seemed impossible until Gradia connected me with the perfect opportunity. Their education sector expertise is unmatched.",
      beforeRole: "Senior Engineer",
      salaryIncrease: "40%",
      timeToHire: "6 weeks",
      rating: 5
    },
    {
      candidate: "James Park",
      role: "Data Science Manager",
      company: "InnovateEd",
      image: "👨‍💼",
      story: "Gradia didn't just find me a job - they found me a career. The role perfectly matches my skills and growth aspirations.",
      beforeRole: "Data Analyst",
      salaryIncrease: "120%",
      timeToHire: "4 weeks",
      rating: 5
    }
  ];

  const stats = [
    { label: "Average Salary Increase", value: "75%", icon: TrendingUp },
    { label: "Successful Placements", value: "25K+", icon: Users },
    { label: "Average Time to Hire", value: "4 weeks", icon: ArrowRight }
  ];

  return (
    <div className="min-h-screen">
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Success Stories</h1>
          <p className="text-xl text-primary-foreground/90 max-w-2xl mx-auto">
            Real people, real careers, real success. See how Gradia has transformed professional lives.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-accent rounded-lg mb-4">
                  <stat.icon className="h-8 w-8 text-accent-foreground" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">{stat.value}</div>
                <div className="text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Success Stories */}
          <div className="space-y-12">
            {stories.map((story, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-large transition-all duration-200">
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Story Content */}
                    <div className="p-8">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="text-6xl">{story.image}</div>
                        <div>
                          <h3 className="text-2xl font-bold text-foreground">{story.candidate}</h3>
                          <p className="text-lg text-accent font-semibold">{story.role}</p>
                          <p className="text-muted-foreground">at {story.company}</p>
                        </div>
                      </div>

                      <div className="mb-6">
                        <Quote className="h-8 w-8 text-accent mb-4" />
                        <p className="text-lg text-muted-foreground italic leading-relaxed">
                          "{story.story}"
                        </p>
                      </div>

                      <div className="flex gap-1 mb-4">
                        {[...Array(story.rating)].map((_, i) => (
                          <Star key={i} className="h-5 w-5 fill-accent text-accent" />
                        ))}
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="bg-subtle p-8 flex flex-col justify-center">
                      <h4 className="text-xl font-semibold text-foreground mb-6">Career Impact</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Previous Role:</span>
                          <Badge variant="outline">{story.beforeRole}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Salary Increase:</span>
                          <Badge variant="secondary" className="text-accent font-bold">
                            +{story.salaryIncrease}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Time to Hire:</span>
                          <Badge variant="outline">{story.timeToHire}</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Your Success Story Starts Here
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join thousands of professionals who've transformed their careers with Gradia.
          </p>
          <Button variant="professional" size="xl" className="bg-background text-foreground hover:bg-background/90">
            Start Your Journey
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </section>
    </div>
  );
};

export default SuccessStories;