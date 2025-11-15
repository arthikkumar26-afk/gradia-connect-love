import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Code, GraduationCap, Package } from "lucide-react";

export default function CollaborationOpportunities() {
  const companies = [
    { name: "DevX Labs", type: "AI & Machine Learning" },
    { name: "BlueByte Systems", type: "Cloud Infrastructure" },
    { name: "NovaSoft AI", type: "Automation & Testing" }
  ];

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Collaboration Opportunities</h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            We collaborate with technology companies, training institutes, and startups
          </p>
        </div>

        {/* Collaboration Types */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="p-8">
            <Code className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-2xl font-bold mb-4">Technical Collaboration</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>• AI integration projects</li>
              <li>• DevOps pipeline setup</li>
              <li>• Cybersecurity assessments</li>
              <li>• Cloud architecture design</li>
            </ul>
          </Card>

          <Card className="p-8">
            <GraduationCap className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-2xl font-bold mb-4">Training Collaboration</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Professional workshops</li>
              <li>• Coding bootcamps</li>
              <li>• Industry certifications</li>
              <li>• Mentorship programs</li>
            </ul>
          </Card>

          <Card className="p-8">
            <Package className="h-12 w-12 text-primary mb-4" />
            <h3 className="text-2xl font-bold mb-4">Product Collaboration</h3>
            <ul className="space-y-2 text-muted-foreground">
              <li>• SaaS product testing</li>
              <li>• Quality assurance</li>
              <li>• Performance optimization</li>
              <li>• Security audits</li>
            </ul>
          </Card>
        </div>

        {/* Sample Companies */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Collaboration Partners</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {companies.map((company) => (
              <Card key={company.name} className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">
                    {company.name.split(' ').map(w => w[0]).join('')}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2">{company.name}</h3>
                <p className="text-muted-foreground">{company.type}</p>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button size="lg">Start Collaboration</Button>
        </div>
      </div>
    </div>
  );
}
