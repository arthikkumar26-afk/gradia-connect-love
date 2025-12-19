import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  FileText, 
  Filter, 
  Calendar, 
  Download, 
  Tag,
  ShieldCheck,
  Eye
} from "lucide-react";

const accessFeatures = [
  {
    icon: Filter,
    title: "Skill-Filtered Candidate Lists",
    description: "Filter candidates by skills, experience, location, and qualification. Find the perfect match for your requirements.",
  },
  {
    icon: FileText,
    title: "Resume Downloads",
    description: "Download resumes in PDF format. Access detailed candidate profiles with work history and certifications.",
  },
  {
    icon: Tag,
    title: "Shortlisting & Tagging",
    description: "Create custom shortlists, add tags, and organize candidates by role, priority, or hiring stage.",
  },
  {
    icon: Calendar,
    title: "Interview Scheduling",
    description: "Schedule interviews directly through the platform. Sync with your calendar and send automated invites.",
  },
  {
    icon: Download,
    title: "Export to CSV",
    description: "Export candidate data to CSV for use in your ATS or internal HR systems. Bulk export supported.",
  },
  {
    icon: Eye,
    title: "Real-time Updates",
    description: "Get notified when new candidates register. Access fresh talent pool throughout the event.",
  },
];

const sampleCandidates = [
  { name: "Priya Sharma", skills: ["React", "Node.js", "TypeScript"], exp: "3 years", location: "Bangalore" },
  { name: "Rahul Kumar", skills: ["Python", "Django", "AWS"], exp: "5 years", location: "Hyderabad" },
  { name: "Anjali Patel", skills: ["Java", "Spring Boot", "Microservices"], exp: "4 years", location: "Chennai" },
  { name: "Vikram Singh", skills: ["Flutter", "Dart", "Firebase"], exp: "2 years", location: "Pune" },
];

export function CandidateAccess() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Content */}
          <div>
            <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
              Talent Access
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Connect with Verified Candidates
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Access a curated pool of verified candidates. Filter, shortlist, and engage with talent that matches your exact requirements.
            </p>

            {/* Features Grid */}
            <div className="grid sm:grid-cols-2 gap-4">
              {accessFeatures.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground text-sm">{feature.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Consent Badge */}
            <div className="mt-8 flex items-center gap-3 p-4 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900">
              <ShieldCheck className="h-6 w-6 text-teal-600" />
              <div>
                <div className="font-semibold text-teal-800 dark:text-teal-300 text-sm">Data Privacy Compliant</div>
                <div className="text-xs text-teal-600 dark:text-teal-400">All candidate data shared with explicit consent</div>
              </div>
            </div>
          </div>

          {/* Right - Preview Card */}
          <div className="relative">
            <div className="absolute -top-4 -right-4 w-72 h-72 bg-gradient-to-br from-teal-400/20 to-cyan-400/20 rounded-full blur-3xl" />
            
            <Card className="relative bg-white dark:bg-card shadow-2xl border-0 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-white" />
                    <span className="text-white font-semibold">Candidate Pool</span>
                  </div>
                  <Badge className="bg-teal-500 text-white border-0">2,847 candidates</Badge>
                </div>
              </div>

              <CardContent className="p-0">
                {/* Filter Bar */}
                <div className="p-4 border-b bg-slate-50 dark:bg-muted/30 flex flex-wrap gap-2">
                  <Badge variant="outline" className="cursor-pointer hover:bg-teal-50">React</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-teal-50">Node.js</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-teal-50">3+ years</Badge>
                  <Badge variant="outline" className="cursor-pointer hover:bg-teal-50">Bangalore</Badge>
                </div>

                {/* Candidate List */}
                <div className="divide-y">
                  {sampleCandidates.map((candidate, i) => (
                    <div key={i} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 flex items-center justify-center text-white font-semibold">
                            {candidate.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-sm">{candidate.name}</div>
                            <div className="text-xs text-muted-foreground">{candidate.exp} • {candidate.location}</div>
                          </div>
                        </div>
                        <Button size="sm" variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          Resume
                        </Button>
                      </div>
                      <div className="flex gap-1 mt-2 ml-13">
                        {candidate.skills.map((skill, j) => (
                          <Badge key={j} variant="secondary" className="text-xs px-2 py-0">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="p-4 bg-slate-50 dark:bg-muted/30 flex gap-2">
                  <Button size="sm" className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500">
                    Export Selected
                  </Button>
                  <Button size="sm" variant="outline">
                    Schedule Interview
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
