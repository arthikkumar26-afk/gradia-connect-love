import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function CaseStudies() {
  const studies = [
    {
      title: "Boosting App Performance for Alphacode Solutions",
      client: "Alphacode Solutions",
      challenge: "Mobile app experiencing slow load times affecting user retention",
      solution: "Implemented advanced caching strategies, optimized database queries, and reduced asset sizes",
      tools: ["Cypress", "Lighthouse", "WebPageTest", "React Profiler"],
      results: "50% faster load time, 35% improvement in user retention",
      metrics: { before: "4.2s", after: "2.1s", improvement: "50%" }
    },
    {
      title: "Security Audit for RapidNet Technologies",
      client: "RapidNet Technologies",
      challenge: "Needed comprehensive security assessment before major product launch",
      solution: "Conducted penetration testing, vulnerability scanning, and code review",
      tools: ["Burp Suite", "OWASP ZAP", "Nmap", "SonarQube"],
      results: "Found 12 critical vulnerabilities, all resolved before launch",
      metrics: { found: "12", critical: "3", high: "9" }
    },
    {
      title: "Automation Testing for ProtoApps",
      client: "ProtoApps",
      challenge: "Manual testing taking too long, delaying releases",
      solution: "Built comprehensive automation framework with CI/CD integration",
      tools: ["Selenium", "Postman", "Jenkins", "Docker"],
      results: "Reduced manual effort by 70%, release cycle shortened by 45%",
      metrics: { timeSaved: "70%", coverage: "85%", cycle: "45%" }
    }
  ];

  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Case Studies</h1>
          <p className="text-xl text-muted-foreground">
            Real-world success stories from our client partnerships
          </p>
        </div>

        <div className="space-y-12">
          {studies.map((study, index) => (
            <Card key={index} className="p-8">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-3xl font-bold">{study.title}</h2>
                <Badge variant="outline">{study.client}</Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-8 mb-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-destructive">Challenge</h3>
                  <p className="text-muted-foreground">{study.challenge}</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-primary">Solution</h3>
                  <p className="text-muted-foreground">{study.solution}</p>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">Tools Used</h3>
                <div className="flex flex-wrap gap-2">
                  {study.tools.map((tool) => (
                    <Badge key={tool} variant="secondary">{tool}</Badge>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-muted/50 rounded-lg">
                <h3 className="text-xl font-semibold mb-3">Results</h3>
                <p className="text-lg font-medium mb-4">{study.results}</p>
                <div className="flex gap-6">
                  {Object.entries(study.metrics).map(([key, value]) => (
                    <div key={key}>
                      <div className="text-3xl font-bold text-primary">{value}</div>
                      <div className="text-sm text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
