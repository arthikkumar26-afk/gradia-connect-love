import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Quote } from "lucide-react";

export default function SuccessStories() {
  const stories = [
    {
      company: "Nexen Labs",
      achievement: "Improved product quality by 40%",
      quote: "After onboarding Qualiron's QA services, we saw an immediate improvement in our product quality. Their attention to detail and systematic approach helped us catch issues we never knew existed.",
      person: "Amit Sharma",
      role: "VP of Engineering",
      initials: "AS",
      color: "bg-blue-500"
    },
    {
      company: "CloudWorks",
      achievement: "Achieved 99.2% test coverage",
      quote: "The automation pipelines built by Qualiron transformed our testing process. We now have confidence in every release, and our test coverage has reached industry-leading levels.",
      person: "Priya Menon",
      role: "CTO",
      initials: "PM",
      color: "bg-purple-500"
    },
    {
      company: "StratosByte",
      achievement: "Saved ₹12 lakh annually",
      quote: "By adopting Qualiron's DevOps workflow and automation solutions, we significantly reduced our operational costs while improving deployment speed and reliability. The ROI was clear within the first quarter.",
      person: "Rajesh Kumar",
      role: "Head of Operations",
      initials: "RK",
      color: "bg-green-500"
    }
  ];

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Success Stories</h1>
          <p className="text-xl text-muted-foreground">
            Hear from our clients about their transformation journey
          </p>
        </div>

        <div className="space-y-8">
          {stories.map((story, index) => (
            <Card key={index} className="p-8 hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-6">
                <Quote className="h-12 w-12 text-primary flex-shrink-0 opacity-50" />
                <div className="flex-1">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2">{story.company}</h2>
                    <div className="inline-block px-4 py-2 bg-primary/10 rounded-full">
                      <span className="text-lg font-semibold text-primary">{story.achievement}</span>
                    </div>
                  </div>

                  <blockquote className="text-lg text-muted-foreground mb-6 italic">
                    "{story.quote}"
                  </blockquote>

                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className={`${story.color} text-white`}>
                        {story.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{story.person}</div>
                      <div className="text-sm text-muted-foreground">{story.role}, {story.company}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
