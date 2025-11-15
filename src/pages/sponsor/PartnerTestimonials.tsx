import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star } from "lucide-react";

export default function PartnerTestimonials() {
  const testimonials = [
    {
      name: "Rohan Mehta",
      title: "CTO",
      company: "TechVision Labs",
      quote: "Gradia is our go-to partner for everything testing. Their expertise and reliability have been instrumental in our product success.",
      rating: 5,
      initials: "RM",
      color: "bg-blue-500"
    },
    {
      name: "Maria Fernandes",
      title: "COO",
      company: "DataSync Solutions",
      quote: "Their speed and transparency is unmatched. We've never had such a smooth collaboration experience with any vendor.",
      rating: 5,
      initials: "MF",
      color: "bg-purple-500"
    },
    {
      name: "Deepak Jain",
      title: "Product Head",
      company: "InnovateTech",
      quote: "We improved release stability by 60% after partnering with Gradia. Their methodical approach to testing is phenomenal.",
      rating: 5,
      initials: "DJ",
      color: "bg-green-500"
    },
    {
      name: "Sara Kapoor",
      title: "VP Engineering",
      company: "CloudScale Inc",
      quote: "Smooth collaboration experience from day one. Their team integrates seamlessly with ours and delivers consistently.",
      rating: 5,
      initials: "SK",
      color: "bg-orange-500"
    },
    {
      name: "John Mathews",
      title: "CEO",
      company: "FinTech Dynamics",
      quote: "Professional, consistent, and reliable. Gradia has been a key partner in our journey to scale our platform.",
      rating: 5,
      initials: "JM",
      color: "bg-red-500"
    },
    {
      name: "Kavya S",
      title: "Tech Lead",
      company: "DevOps Masters",
      quote: "Their DevOps team is world-class. They helped us reduce deployment time by 75% and improve system reliability significantly.",
      rating: 5,
      initials: "KS",
      color: "bg-teal-500"
    }
  ];

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Partner Testimonials</h1>
          <p className="text-xl text-muted-foreground">
            What our partners say about working with us
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>

              <blockquote className="text-muted-foreground mb-6 italic">
                "{testimonial.quote}"
              </blockquote>

              <div className="flex items-center gap-3 pt-4 border-t">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className={`${testimonial.color} text-white`}>
                    {testimonial.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">{testimonial.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {testimonial.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {testimonial.company}
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
