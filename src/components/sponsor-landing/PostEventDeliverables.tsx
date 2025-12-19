import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  BarChart3, 
  Users, 
  TrendingUp,
  Gift,
  CalendarCheck
} from "lucide-react";

const deliverables = [
  {
    icon: FileText,
    title: "Comprehensive Hiring Summary Report",
    description: "Detailed breakdown of candidates engaged, interviews conducted, and hiring outcomes. Compare performance across events.",
    highlight: "Delivered within 7 days post-event",
  },
  {
    icon: Users,
    title: "Candidate Engagement Insights",
    description: "Deep analytics on candidate interactions: time spent at stall, questions asked, interest levels, and follow-up actions.",
    highlight: "Behavioral analytics included",
  },
  {
    icon: TrendingUp,
    title: "Skill Demand Analytics",
    description: "Market intelligence on in-demand skills, salary expectations, and candidate availability across different locations.",
    highlight: "Quarterly market reports",
  },
  {
    icon: Gift,
    title: "Renewal Priority & Discounts",
    description: "Returning sponsors get first pick on premium stalls, early-bird pricing, and exclusive tier upgrades for loyalty.",
    highlight: "Up to 20% off on renewals",
  },
];

export function PostEventDeliverables() {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Visual */}
          <div className="relative order-2 lg:order-1">
            <div className="absolute -top-8 -left-8 w-64 h-64 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-full blur-3xl" />
            
            <Card className="relative bg-white dark:bg-card shadow-2xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-5">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-teal-400" />
                  <div>
                    <div className="text-white font-semibold">Post-Event Report</div>
                    <div className="text-xs text-slate-400">Bangalore Tech Job Mela 2024</div>
                  </div>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Total Visitors", value: "1,247" },
                    { label: "Resumes Collected", value: "456" },
                    { label: "Interviews Done", value: "89" },
                    { label: "Offers Made", value: "24" },
                  ].map((metric, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 text-center">
                      <div className="text-2xl font-bold text-foreground">{metric.value}</div>
                      <div className="text-xs text-muted-foreground">{metric.label}</div>
                    </div>
                  ))}
                </div>

                {/* Hiring Rate */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-900">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-green-700 dark:text-green-400">Conversion Rate</div>
                      <div className="text-xs text-green-600 dark:text-green-500">Visitors to Hires</div>
                    </div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">1.9%</div>
                  </div>
                </div>

                {/* Top Skills */}
                <div>
                  <div className="text-sm font-semibold text-foreground mb-3">Most Sought Skills</div>
                  <div className="flex flex-wrap gap-2">
                    {["React.js", "Python", "Java", "AWS", "Node.js"].map((skill, i) => (
                      <Badge key={i} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>

                {/* Schedule */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  <CalendarCheck className="h-5 w-5 text-teal-500" />
                  <div className="text-sm text-muted-foreground">
                    Next event: <span className="font-semibold text-foreground">Hyderabad IT Drive • Feb 2025</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right - Content */}
          <div className="order-1 lg:order-2">
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
              Post-Event Value
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Insights That Drive Future Hiring
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Your sponsorship delivers value beyond the event day. Receive actionable insights and exclusive benefits to optimize your talent acquisition strategy.
            </p>

            <div className="space-y-4">
              {deliverables.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={i} 
                    className="flex gap-4 p-4 rounded-xl bg-background border hover:shadow-md transition-shadow"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{item.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                      <Badge variant="outline" className="mt-2 text-xs text-teal-600 border-teal-200">
                        {item.highlight}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
