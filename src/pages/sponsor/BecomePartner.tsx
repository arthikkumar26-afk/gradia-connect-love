import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Globe, Users, Zap, TrendingUp } from "lucide-react";

export default function BecomePartner() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto max-w-6xl text-center">
          <h1 className="text-5xl font-bold mb-4">Partner With Gradia</h1>
          <p className="text-xl text-muted-foreground">
            Join hands with us to build powerful digital solutions.
          </p>
        </div>
      </section>

      {/* Why Partner With Us */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold mb-12 text-center">Why Partner With Us?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 text-center">
              <Globe className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Global Reach</h3>
              <p className="text-muted-foreground">Work with 120+ international clients</p>
            </Card>
            <Card className="p-6 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Strong Expertise</h3>
              <p className="text-muted-foreground">40+ certified engineers</p>
            </Card>
            <Card className="p-6 text-center">
              <Zap className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Fast Delivery</h3>
              <p className="text-muted-foreground">Avg project delivery time 18 days</p>
            </Card>
            <Card className="p-6 text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold mb-2">Joint Growth</h3>
              <p className="text-muted-foreground">Revenue-sharing based collaboration</p>
            </Card>
          </div>
        </div>
      </section>

      {/* How Partnership Works */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold mb-12 text-center">How Partnership Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: "1", title: "Apply", desc: "Submit your partnership application" },
              { step: "2", title: "Review", desc: "We review your proposal" },
              { step: "3", title: "Agreement", desc: "Sign partnership agreement" },
              { step: "4", title: "Launch", desc: "Start collaborating" }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-12">
            <Button size="lg" asChild>
              <a href="/partner-apply">Apply for Partnership</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
