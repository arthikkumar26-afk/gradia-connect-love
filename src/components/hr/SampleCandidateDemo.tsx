import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Sparkles, FileText, Mail, Calendar, CheckCircle2, XCircle, ChevronRight,
  Star, Phone, MapPin, Briefcase, GraduationCap, Award, Download, MessageSquare,
  Video, ExternalLink, ThumbsUp, ThumbsDown
} from "lucide-react";
import { toast } from "sonner";

const STAGES = [
  "Application Review",
  "AI Resume Screening",
  "Written Test",
  "Technical Interview",
  "HR Interview",
  "Management Round",
  "Offer",
];

const SAMPLE = {
  name: "Aarav Sharma",
  email: "aarav.sharma.demo@example.com",
  phone: "+91 98765 43210",
  location: "Bengaluru, Karnataka",
  jobTitle: "Senior Frontend Engineer",
  experience: "4.5 years",
  currentCompany: "TechNova Solutions",
  expectedCTC: "₹18 LPA",
  noticePeriod: "30 days",
  aiScore: 87,
  matchScore: 92,
  skills: ["React", "TypeScript", "Next.js", "Node.js", "GraphQL", "AWS", "Tailwind CSS"],
  education: [
    { degree: "B.Tech Computer Science", institute: "IIT Delhi", year: "2020", grade: "8.7 CGPA" },
  ],
  experiences: [
    { role: "Senior Frontend Engineer", company: "TechNova Solutions", duration: "2022 – Present" },
    { role: "Frontend Developer", company: "PixelCraft Labs", duration: "2020 – 2022" },
  ],
  highlights: [
    "Led migration to Next.js 14 reducing TTI by 38%",
    "Built design system used by 12 product teams",
    "Mentored 5 junior engineers",
  ],
};

export default function SampleCandidateDemo() {
  const [stageIdx, setStageIdx] = useState(1);
  const [status, setStatus] = useState<"in_review" | "shortlisted" | "rejected" | "hired">("in_review");
  const [notes, setNotes] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const RESUME_URL = "/sample-resume-aarav-sharma.pdf";

  const downloadResume = () => {
    const a = document.createElement("a");
    a.href = RESUME_URL;
    a.download = "Aarav-Sharma-Resume.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast.success("Resume downloaded");
  };

  const [mailSubject, setMailSubject] = useState(`Next steps for your application — ${SAMPLE.jobTitle}`);
  const [mailBody, setMailBody] = useState(
    `Hi ${SAMPLE.name.split(" ")[0]},\n\nThanks for applying. We'd like to invite you to the next round.\n\nBest,\nHR Team`
  );
  const [interviewDate, setInterviewDate] = useState("");
  const [interviewTime, setInterviewTime] = useState("11:00");
  const [interviewMode, setInterviewMode] = useState("Google Meet");
  const [feedbackRating, setFeedbackRating] = useState(4);
  const [feedbackText, setFeedbackText] = useState("");

  const advanceStage = () => {
    if (stageIdx < STAGES.length - 1) {
      setStageIdx(stageIdx + 1);
      toast.success(`Moved to ${STAGES[stageIdx + 1]}`);
    } else {
      setStatus("hired");
      toast.success("🎉 Candidate marked as Hired");
    }
  };

  const rejectCandidate = () => {
    setStatus("rejected");
    toast.error("Candidate marked as Rejected");
  };

  const shortlist = () => {
    setStatus("shortlisted");
    toast.success("Candidate shortlisted");
  };

  const sendMail = () => {
    toast.success(`Email sent to ${SAMPLE.email} (demo)`);
    setMailOpen(false);
  };

  const scheduleInterview = () => {
    if (!interviewDate) {
      toast.error("Please pick a date");
      return;
    }
    toast.success(`Interview scheduled for ${interviewDate} at ${interviewTime} via ${interviewMode} (demo)`);
    setScheduleOpen(false);
  };

  const submitFeedback = () => {
    toast.success(`Feedback (${feedbackRating}/5) saved (demo)`);
    setFeedbackOpen(false);
    setFeedbackText("");
  };

  const statusBadge =
    status === "hired" ? <Badge className="bg-green-600">Hired</Badge> :
    status === "rejected" ? <Badge variant="destructive">Rejected</Badge> :
    status === "shortlisted" ? <Badge className="bg-blue-600">Shortlisted</Badge> :
    <Badge variant="secondary">In Review</Badge>;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-lg">
              {SAMPLE.name.split(" ").map(s => s[0]).join("")}
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {SAMPLE.name}
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Sparkles className="h-3 w-3" /> Sample Candidate
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">{SAMPLE.jobTitle} · {SAMPLE.experience} · {SAMPLE.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/15 text-primary border-primary/30">AI Match {SAMPLE.matchScore}%</Badge>
            <Badge variant="secondary">Resume Score {SAMPLE.aiScore}/100</Badge>
            {statusBadge}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Pipeline */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">PIPELINE</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {STAGES.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`px-3 py-1.5 rounded-md text-xs whitespace-nowrap border ${
                  i < stageIdx ? "bg-green-500/10 text-green-700 border-green-500/30" :
                  i === stageIdx ? "bg-primary text-primary-foreground border-primary font-semibold" :
                  "bg-muted/50 text-muted-foreground border-border"
                }`}>
                  {i < stageIdx && "✓ "}{s}
                </div>
                {i < STAGES.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />}
              </div>
            ))}
          </div>
        </div>

        {/* Action grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button variant="outline" size="sm" onClick={() => setProfileOpen(true)}>
            <FileText className="h-4 w-4 mr-1.5" /> View Profile
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMailOpen(true)}>
            <Mail className="h-4 w-4 mr-1.5" /> Send Email
          </Button>
          <Button variant="outline" size="sm" onClick={() => setScheduleOpen(true)}>
            <Calendar className="h-4 w-4 mr-1.5" /> Schedule Interview
          </Button>
          <Button variant="outline" size="sm" onClick={() => setFeedbackOpen(true)}>
            <MessageSquare className="h-4 w-4 mr-1.5" /> Add Feedback
          </Button>
          <Button variant="outline" size="sm" onClick={() => setResumeOpen(true)}>
            <FileText className="h-4 w-4 mr-1.5" /> View Resume
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast.success("Video intro opened (demo)")}>
            <Video className="h-4 w-4 mr-1.5" /> Video Intro
          </Button>
          <Button variant="outline" size="sm" onClick={shortlist} disabled={status === "shortlisted"}>
            <Star className="h-4 w-4 mr-1.5" /> Shortlist
          </Button>
          <Button variant="outline" size="sm" onClick={() => toast("Reference check requested (demo)")}>
            <ExternalLink className="h-4 w-4 mr-1.5" /> Reference Check
          </Button>
        </div>

        {/* Notes + stage controls */}
        <div className="border-t pt-4 space-y-3">
          <div>
            <Label htmlFor="hr-notes" className="text-xs">Internal Notes</Label>
            <Textarea
              id="hr-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add stage notes (visible only to HR & employer)…"
              rows={2}
              className="text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={advanceStage} disabled={status === "rejected" || status === "hired"}>
              <CheckCircle2 className="h-4 w-4 mr-1.5" />
              {stageIdx === STAGES.length - 1 ? "Mark as Hired" : `Move to ${STAGES[stageIdx + 1]}`}
            </Button>
            <Button size="sm" variant="destructive" onClick={rejectCandidate} disabled={status === "rejected" || status === "hired"}>
              <XCircle className="h-4 w-4 mr-1.5" /> Reject
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setStageIdx(1); setStatus("in_review"); setNotes(""); toast("Demo reset"); }}>
              Reset Demo
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Profile dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{SAMPLE.name} — Full Profile</DialogTitle></DialogHeader>
          <Tabs defaultValue="overview">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="ai">AI Insights</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-3 pt-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{SAMPLE.email}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{SAMPLE.phone}</div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{SAMPLE.location}</div>
                <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" />{SAMPLE.experience}</div>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground">Current</p>
                <p className="font-medium">{SAMPLE.currentCompany}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div><p className="text-xs text-muted-foreground">Expected CTC</p><p className="font-medium">{SAMPLE.expectedCTC}</p></div>
                <div><p className="text-xs text-muted-foreground">Notice Period</p><p className="font-medium">{SAMPLE.noticePeriod}</p></div>
              </div>
            </TabsContent>
            <TabsContent value="experience" className="space-y-3 pt-3">
              {SAMPLE.experiences.map((e, i) => (
                <div key={i} className="border rounded-md p-3">
                  <p className="font-medium text-sm">{e.role}</p>
                  <p className="text-xs text-muted-foreground">{e.company} · {e.duration}</p>
                </div>
              ))}
              <div className="border-t pt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> EDUCATION</p>
                {SAMPLE.education.map((e, i) => (
                  <div key={i} className="text-sm">
                    <p className="font-medium">{e.degree}</p>
                    <p className="text-xs text-muted-foreground">{e.institute} · {e.year} · {e.grade}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="skills" className="pt-3">
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE.skills.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
              </div>
            </TabsContent>
            <TabsContent value="ai" className="space-y-3 pt-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-primary/5 rounded-md">
                <span className="font-medium">Job Match Score</span>
                <span className="text-2xl font-bold text-primary">{SAMPLE.matchScore}%</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1"><Award className="h-3.5 w-3.5" /> KEY HIGHLIGHTS</p>
                <ul className="space-y-1.5">
                  {SAMPLE.highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />{h}</li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Mail dialog */}
      <Dialog open={mailOpen} onOpenChange={setMailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Send Email to {SAMPLE.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">To</Label><Input value={SAMPLE.email} disabled /></div>
            <div><Label className="text-xs">Subject</Label><Input value={mailSubject} onChange={e => setMailSubject(e.target.value)} /></div>
            <div><Label className="text-xs">Message</Label><Textarea value={mailBody} onChange={e => setMailBody(e.target.value)} rows={6} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMailOpen(false)}>Cancel</Button>
            <Button onClick={sendMail}><Mail className="h-4 w-4 mr-1.5" /> Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Schedule Interview</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label className="text-xs">Date</Label><Input type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} /></div>
            <div><Label className="text-xs">Time</Label><Input type="time" value={interviewTime} onChange={e => setInterviewTime(e.target.value)} /></div>
            <div>
              <Label className="text-xs">Mode</Label>
              <select className="w-full h-10 rounded-md border bg-background px-3 text-sm" value={interviewMode} onChange={e => setInterviewMode(e.target.value)}>
                <option>Google Meet</option><option>Zoom</option><option>MS Teams</option><option>In-Person</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancel</Button>
            <Button onClick={scheduleInterview}><Calendar className="h-4 w-4 mr-1.5" /> Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback dialog */}
      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Interview Feedback</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Rating</Label>
              <div className="flex gap-1 mt-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setFeedbackRating(n)} type="button">
                    <Star className={`h-6 w-6 ${n <= feedbackRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div><Label className="text-xs">Comments</Label><Textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} rows={4} placeholder="Strengths, concerns, recommendation…" /></div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { toast.success("Recommend hire"); setFeedbackOpen(false); }}>
                <ThumbsUp className="h-4 w-4 mr-1.5" /> Recommend
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => { toast.error("Do not recommend"); setFeedbackOpen(false); }}>
                <ThumbsDown className="h-4 w-4 mr-1.5" /> Do Not
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackOpen(false)}>Cancel</Button>
            <Button onClick={submitFeedback}>Save Feedback</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
