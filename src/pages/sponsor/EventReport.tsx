import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Download,
  Calendar,
  MapPin,
  Store,
  Users,
  UserCheck,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Eye,
  QrCode,
  FileText,
  Award,
  Phone,
  FileDown,
  ExternalLink,
  Star,
} from "lucide-react";
import SponsorDashboardLayout from "./SponsorDashboard";
import { toast } from "sonner";

// Mock event data - in real app, fetch based on eventId
const mockEventData = {
  id: "3",
  eventName: "Delhi NCR Mega Job Fair",
  city: "Delhi",
  date: "2024-01-20",
  stallNumber: "C-08",
  stallSize: "3m x 3m (Standard)",
  sponsorshipType: "Gold Sponsor",
  status: "completed",
  metrics: {
    totalFootfall: 8500,
    stallVisits: 456,
    leadsCaptured: 156,
    interviewsConducted: 78,
    offersMade: 32,
    hiresConfirmed: 24,
  },
  stallPerformance: {
    readinessScore: 98,
    visibilityRating: 4.5,
    boothSize: "Standard (9 sqm)",
    position: "Near Main Entrance",
  },
  candidateInsights: {
    experienceBreakdown: [
      { level: "Fresher (0-1 yr)", percentage: 35 },
      { level: "Junior (1-3 yrs)", percentage: 40 },
      { level: "Mid (3-5 yrs)", percentage: 18 },
      { level: "Senior (5+ yrs)", percentage: 7 },
    ],
    educationBackground: [
      { type: "B.Tech/B.E.", percentage: 52 },
      { type: "MCA/M.Tech", percentage: 28 },
      { type: "BCA/BSc", percentage: 15 },
      { type: "Others", percentage: 5 },
    ],
    topSkills: [
      { skill: "React.js", count: 67 },
      { skill: "Python", count: 54 },
      { skill: "Java", count: 48 },
      { skill: "Node.js", count: 42 },
      { skill: "SQL", count: 38 },
    ],
  },
  candidates: [
    { id: "1", name: "Priya Sharma", skills: "React, Node.js", experience: "2 years", interviewStatus: "Completed", outcome: "Hired" },
    { id: "2", name: "Rahul Kumar", skills: "Python, Django", experience: "3 years", interviewStatus: "Completed", outcome: "Hired" },
    { id: "3", name: "Ananya Singh", skills: "Java, Spring", experience: "1 year", interviewStatus: "Completed", outcome: "Offer Made" },
    { id: "4", name: "Vikash Patel", skills: "React, TypeScript", experience: "4 years", interviewStatus: "Completed", outcome: "Hired" },
    { id: "5", name: "Neha Gupta", skills: "Python, ML", experience: "2 years", interviewStatus: "Completed", outcome: "Rejected" },
    { id: "6", name: "Amit Verma", skills: "Node.js, MongoDB", experience: "3 years", interviewStatus: "Completed", outcome: "Hired" },
  ],
  brandingROI: {
    logoImpressions: 12500,
    brandingVisibilityScore: 92,
    costPerLead: 245,
    costPerHire: 1580,
    overallROI: "3.2x",
  },
};

const funnelStages = [
  { label: "Event Visitors", value: 8500, color: "bg-slate-200" },
  { label: "Stall Visits", value: 456, color: "bg-blue-200" },
  { label: "QR Scans", value: 312, color: "bg-blue-300" },
  { label: "Leads", value: 156, color: "bg-teal-300" },
  { label: "Interviews", value: 78, color: "bg-teal-400" },
  { label: "Hires", value: 24, color: "bg-green-500" },
];

export default function EventReport() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const event = mockEventData; // In real app, fetch based on eventId

  const getOutcomeBadge = (outcome: string) => {
    const config: Record<string, string> = {
      "Hired": "bg-green-100 text-green-800 border-green-200",
      "Offer Made": "bg-blue-100 text-blue-800 border-blue-200",
      "Rejected": "bg-gray-100 text-gray-600 border-gray-200",
      "In Progress": "bg-yellow-100 text-yellow-800 border-yellow-200",
    };
    return <Badge className={config[outcome] || config["In Progress"]}>{outcome}</Badge>;
  };

  return (
    <SponsorDashboardLayout activeTab="stalls">
      <div className="space-y-6">
        {/* Back Button & Header */}
        <div className="flex flex-col gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/sponsor/stalls")}
            className="w-fit -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Stalls
          </Button>
          
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">{event.eventName}</h1>
                <Badge className="bg-gray-100 text-gray-800 border-gray-200">Completed</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {new Date(event.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {event.city}
                </span>
                <span className="flex items-center gap-1.5">
                  <Store className="h-4 w-4" />
                  Stall {event.stallNumber}
                </span>
                <Badge variant="outline" className="border-blue-200 text-blue-700">{event.sponsorshipType}</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => toast.success("Downloading PDF report...")}>
                <Download className="mr-2 h-4 w-4" />
                Download Full Report
              </Button>
              <Button onClick={() => navigate("/sponsor/stalls")}>
                <Store className="mr-2 h-4 w-4" />
                Reserve Next Event
              </Button>
            </div>
          </div>
        </div>

        {/* Executive Summary - Top Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Executive Summary
            </CardTitle>
            <CardDescription>Key performance metrics from this event</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-4 bg-slate-50 rounded-xl border">
                <Users className="h-6 w-6 mx-auto text-slate-600 mb-2" />
                <p className="text-2xl font-bold text-slate-900">{event.metrics.totalFootfall.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Footfall</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                <Store className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                <p className="text-2xl font-bold text-blue-700">{event.metrics.stallVisits}</p>
                <p className="text-sm text-muted-foreground">Stall Visits</p>
              </div>
              <div className="text-center p-4 bg-teal-50 rounded-xl border border-teal-100">
                <UserCheck className="h-6 w-6 mx-auto text-teal-600 mb-2" />
                <p className="text-2xl font-bold text-teal-700">{event.metrics.leadsCaptured}</p>
                <p className="text-sm text-muted-foreground">Leads Captured</p>
              </div>
              <div className="text-center p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                <Briefcase className="h-6 w-6 mx-auto text-indigo-600 mb-2" />
                <p className="text-2xl font-bold text-indigo-700">{event.metrics.interviewsConducted}</p>
                <p className="text-sm text-muted-foreground">Interviews</p>
              </div>
              <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                <FileText className="h-6 w-6 mx-auto text-amber-600 mb-2" />
                <p className="text-2xl font-bold text-amber-700">{event.metrics.offersMade}</p>
                <p className="text-sm text-muted-foreground">Offers Made</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl border border-green-100">
                <CheckCircle2 className="h-6 w-6 mx-auto text-green-600 mb-2" />
                <p className="text-2xl font-bold text-green-700">{event.metrics.hiresConfirmed}</p>
                <p className="text-sm text-muted-foreground">Hires Confirmed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stall Performance & Mini Map */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Stall Performance</CardTitle>
              <CardDescription>Your stall's readiness and visibility metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Readiness Score</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{event.stallPerformance.readinessScore}%</span>
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Visibility Rating</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">{event.stallPerformance.visibilityRating}</span>
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  </div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Booth Size</p>
                  <p className="font-semibold">{event.stallPerformance.boothSize}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Position</p>
                  <p className="font-semibold">{event.stallPerformance.position}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stall Location</CardTitle>
              <CardDescription>Your stall position in the event layout</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 rounded-lg p-6 border-2 border-dashed border-slate-200">
                <div className="grid grid-cols-6 gap-2 mb-4">
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-8 rounded text-xs flex items-center justify-center font-medium ${
                        i === 7 ? "bg-blue-500 text-white" : "bg-slate-200 text-slate-500"
                      }`}
                    >
                      {i === 7 ? "C-08" : `${String.fromCharCode(65 + Math.floor(i / 6))}-${(i % 6) + 1}`}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-blue-500" />
                    Your Stall
                  </span>
                  <span className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded bg-slate-200" />
                    Other Stalls
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Candidate & Skill Insights */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Experience Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {event.candidateInsights.experienceBreakdown.map((item) => (
                <div key={item.level}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.level}</span>
                    <span className="font-medium">{item.percentage}%</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Education Background</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {event.candidateInsights.educationBackground.map((item) => (
                <div key={item.type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{item.type}</span>
                    <span className="font-medium">{item.percentage}%</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {event.candidateInsights.topSkills.map((item, index) => (
                  <div key={item.skill} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium">{item.skill}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{item.count} candidates</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Engagement Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Engagement Funnel
            </CardTitle>
            <CardDescription>Conversion flow from event visitors to hires</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0">
              {funnelStages.map((stage, index) => (
                <div key={stage.label} className="flex items-center flex-1 w-full md:w-auto">
                  <div className={`flex-1 text-center p-4 ${stage.color} rounded-lg`}>
                    <p className="text-xl md:text-2xl font-bold">{stage.value.toLocaleString()}</p>
                    <p className="text-xs md:text-sm text-muted-foreground">{stage.label}</p>
                  </div>
                  {index < funnelStages.length - 1 && (
                    <div className="hidden md:block text-muted-foreground px-2">→</div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100">
              <p className="text-sm text-green-800">
                <strong>Conversion Rate:</strong> {((24 / 8500) * 100).toFixed(2)}% visitors converted to hires
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Candidate Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Candidate Details</CardTitle>
                <CardDescription>All candidates who interacted with your stall</CardDescription>
              </div>
              <Button variant="outline" onClick={() => toast.success("Exporting candidates to CSV...")}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Interview Status</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {event.candidates.map((candidate) => (
                  <TableRow key={candidate.id}>
                    <TableCell className="font-medium">{candidate.name}</TableCell>
                    <TableCell>{candidate.skills}</TableCell>
                    <TableCell>{candidate.experience}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        {candidate.interviewStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>{getOutcomeBadge(candidate.outcome)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => toast.info("Viewing resume...")}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toast.info("Adding notes...")}>
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Branding & ROI */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-600" />
              Branding & ROI Analysis
            </CardTitle>
            <CardDescription>Brand visibility metrics and return on investment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <Eye className="h-6 w-6 mx-auto text-blue-600 mb-2" />
                <p className="text-2xl font-bold">{event.brandingROI.logoImpressions.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Logo Impressions</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <Star className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
                <p className="text-2xl font-bold">{event.brandingROI.brandingVisibilityScore}%</p>
                <p className="text-sm text-muted-foreground">Visibility Score</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <UserCheck className="h-6 w-6 mx-auto text-teal-600 mb-2" />
                <p className="text-2xl font-bold">₹{event.brandingROI.costPerLead}</p>
                <p className="text-sm text-muted-foreground">Cost per Lead</p>
              </div>
              <div className="text-center p-4 bg-muted/50 rounded-xl">
                <CheckCircle2 className="h-6 w-6 mx-auto text-green-600 mb-2" />
                <p className="text-2xl font-bold">₹{event.brandingROI.costPerHire.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Cost per Hire</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                <TrendingUp className="h-6 w-6 mx-auto text-green-600 mb-2" />
                <p className="text-2xl font-bold text-green-700">{event.brandingROI.overallROI}</p>
                <p className="text-sm text-muted-foreground">Overall ROI</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Downloads & Next Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Downloads</CardTitle>
              <CardDescription>Export reports and documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => toast.success("Downloading leads CSV...")}>
                <FileDown className="mr-3 h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium">Export Leads (CSV)</p>
                  <p className="text-xs text-muted-foreground">Download all candidate data</p>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => toast.success("Downloading invoice...")}>
                <FileText className="mr-3 h-5 w-5 text-slate-600" />
                <div className="text-left">
                  <p className="font-medium">Download Invoice</p>
                  <p className="text-xs text-muted-foreground">Sponsorship payment receipt</p>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => toast.success("Downloading certificate...")}>
                <Award className="mr-3 h-5 w-5 text-amber-600" />
                <div className="text-left">
                  <p className="font-medium">Download Certificate</p>
                  <p className="text-xs text-muted-foreground">Participation certificate</p>
                </div>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Actions</CardTitle>
              <CardDescription>Continue your partnership with Gradia</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start" onClick={() => navigate("/sponsor/stalls")}>
                <Store className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <p className="font-medium">Reserve Stall for Next Event</p>
                  <p className="text-xs opacity-80">Upcoming events available</p>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => toast.info("Contacting partnership manager...")}>
                <Phone className="mr-3 h-5 w-5 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">Contact Partnership Manager</p>
                  <p className="text-xs text-muted-foreground">Get personalized support</p>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => toast.info("Opening renewal options...")}>
                <ExternalLink className="mr-3 h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium">Upgrade Sponsorship Tier</p>
                  <p className="text-xs text-muted-foreground">Unlock more benefits</p>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SponsorDashboardLayout>
  );
}
