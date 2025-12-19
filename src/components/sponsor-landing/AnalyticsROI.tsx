import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  TrendingUp, 
  Download,
  Eye,
  MousePointer,
  FileText,
  Users,
  UserCheck,
  ArrowRight
} from "lucide-react";

const metrics = [
  { label: "Stall Visits", value: "1,247", change: "+23%", icon: Eye },
  { label: "QR Scans", value: "892", change: "+18%", icon: MousePointer },
  { label: "Resume Downloads", value: "456", change: "+31%", icon: FileText },
  { label: "Interviews Scheduled", value: "89", change: "+12%", icon: Users },
];

const funnelData = [
  { stage: "Event Visitors", count: 15000, color: "from-slate-500 to-slate-600", width: "100%" },
  { stage: "Stall Visits", count: 1247, color: "from-teal-500 to-teal-600", width: "85%" },
  { stage: "Leads Captured", count: 892, color: "from-cyan-500 to-cyan-600", width: "65%" },
  { stage: "Interviews", count: 89, color: "from-emerald-500 to-emerald-600", width: "40%" },
  { stage: "Hires", count: 24, color: "from-green-500 to-green-600", width: "20%" },
];

export function AnalyticsROI() {
  return (
    <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 px-4 py-1.5 text-sm bg-teal-500/20 text-teal-300 border-teal-500/30">
            ROI Dashboard
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Measure Your Hiring Success
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Real-time analytics and transparent ROI tracking. Know exactly how your sponsorship translates to hires.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left - Metrics Grid */}
          <div className="space-y-6">
            {/* Metric Cards */}
            <div className="grid grid-cols-2 gap-4">
              {metrics.map((metric, i) => {
                const Icon = metric.icon;
                return (
                  <Card key={i} className="bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500/30 to-cyan-500/30 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-teal-400" />
                        </div>
                        <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {metric.change}
                        </Badge>
                      </div>
                      <div className="text-3xl font-bold text-white">{metric.value}</div>
                      <div className="text-sm text-slate-400">{metric.label}</div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Skill Distribution */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-teal-400" />
                  Top Skills in Demand
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { skill: "React.js", pct: 78 },
                  { skill: "Python", pct: 65 },
                  { skill: "Java", pct: 58 },
                  { skill: "Node.js", pct: 52 },
                  { skill: "AWS", pct: 45 },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-300">{item.skill}</span>
                      <span className="text-teal-400">{item.pct}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right - Conversion Funnel */}
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-teal-400" />
                Hiring Conversion Funnel
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-8">
              <div className="space-y-4">
                {funnelData.map((stage, i) => (
                  <div key={i} className="relative">
                    <div 
                      className={`bg-gradient-to-r ${stage.color} rounded-lg p-4 transition-all duration-300 hover:scale-[1.02]`}
                      style={{ width: stage.width }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium text-sm">{stage.stage}</span>
                        <span className="text-white/90 font-bold">{stage.count.toLocaleString()}</span>
                      </div>
                    </div>
                    {i < funnelData.length - 1 && (
                      <div className="absolute -bottom-3 left-8 text-slate-500">
                        <ArrowRight className="h-4 w-4 rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Conversion Rate */}
              <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-green-400 font-semibold">Hiring Conversion Rate</div>
                    <div className="text-sm text-slate-400">From stall visits to successful hires</div>
                  </div>
                  <div className="text-4xl font-bold text-green-400">1.9%</div>
                </div>
              </div>

              {/* CTA */}
              <Button className="w-full mt-6 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600">
                <Download className="h-4 w-4 mr-2" />
                View Sample Sponsor Report
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Date Range Filters */}
        <div className="flex flex-wrap justify-center gap-3 mt-10">
          {["Last 7 days", "Last 30 days", "Last Quarter", "Custom Range"].map((range, i) => (
            <Button 
              key={i} 
              variant="outline" 
              size="sm"
              className={`border-white/20 text-slate-300 hover:bg-white/10 hover:text-white ${i === 1 ? 'bg-white/10 text-white' : ''}`}
            >
              {range}
            </Button>
          ))}
        </div>
      </div>
    </section>
  );
}
