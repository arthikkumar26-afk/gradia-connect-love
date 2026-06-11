import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Palette,
  Clock,
  Upload,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Award,
  BookOpen,
  Target,
  RefreshCw,
  Eye,
  TrendingUp,
  Lightbulb,
  FileImage,
  Timer,
  Sparkles,
} from "lucide-react";

interface DesignBrief {
  title: string;
  description: string;
  requirements: string[];
  dimensions: string;
  colorScheme: string;
  targetAudience: string;
  deliverables: string;
  timeLimit: number;
  evaluationCriteria: { name: string; weight: number }[];
}

interface CriteriaScore {
  name: string;
  score: number;
  feedback: string;
}

interface SuggestedCourse {
  title: string;
  reason: string;
}

interface Evaluation {
  overallScore: number;
  grade: string;
  criteriaScores: CriteriaScore[];
  strengths: string[];
  improvements: string[];
  overallFeedback: string;
  industryReadiness: string;
  suggestedCourses: SuggestedCourse[];
}

type Phase = "setup" | "challenge" | "submitting" | "results";

const CATEGORIES = [
  { value: "logo", label: "Logo Design" },
  { value: "poster", label: "Poster / Flyer" },
  { value: "social_media", label: "Social Media Graphics" },
  { value: "banner", label: "Web Banner / Ad" },
  { value: "branding", label: "Branding Kit" },
  { value: "ui", label: "UI / App Screen" },
  { value: "infographic", label: "Infographic" },
  { value: "packaging", label: "Packaging Design" },
];

const DIFFICULTIES = [
  { value: "beginner", label: "Beginner", color: "bg-green-500" },
  { value: "intermediate", label: "Intermediate", color: "bg-yellow-500" },
  { value: "advanced", label: "Advanced", color: "bg-orange-500" },
  { value: "expert", label: "Expert", color: "bg-red-500" },
];

export default function GraphicDesignChallenge() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [category, setCategory] = useState("poster");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer logic
  useEffect(() => {
    if (phase === "challenge" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            toast.warning("⏰ Time's up! Please submit your design.");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const generateBrief = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("graphic-design-challenge", {
        body: { action: "generate_brief", category, difficulty },
      });
      if (error) throw error;
      if (!data?.brief) throw new Error("No brief generated");
      setBrief(data.brief);
      setTimeLeft(data.brief.timeLimit * 60);
      setPhase("challenge");
      toast.success("🎨 Design brief generated! Your timer has started.");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate brief");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setUploadedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submitDesign = async () => {
    if (!uploadedImage || !brief) return;
    setPhase("submitting");
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const briefText = `Title: ${brief.title}\nDescription: ${brief.description}\nRequirements: ${brief.requirements.join(", ")}\nDimensions: ${brief.dimensions}\nColor Scheme: ${brief.colorScheme}\nTarget Audience: ${brief.targetAudience}\nEvaluation Criteria: ${brief.evaluationCriteria.map((c) => `${c.name} (${c.weight}%)`).join(", ")}`;

      const { data, error } = await supabase.functions.invoke("graphic-design-challenge", {
        body: { action: "evaluate_design", designBase64: uploadedImage, briefText },
      });
      if (error) throw error;
      if (!data?.evaluation) throw new Error("No evaluation received");
      setEvaluation(data.evaluation);
      setPhase("results");
      toast.success("✅ Design evaluated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to evaluate design");
      setPhase("challenge");
    }
  };

  const resetChallenge = () => {
    setPhase("setup");
    setBrief(null);
    setEvaluation(null);
    setUploadedImage(null);
    setUploadedFileName("");
    setTimeLeft(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getGradeBg = (grade: string) => {
    if (grade.startsWith("A")) return "bg-green-100 text-green-800 border-green-300";
    if (grade.startsWith("B")) return "bg-blue-100 text-blue-800 border-blue-300";
    if (grade.startsWith("C")) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  // Setup Phase
  if (phase === "setup") {
    return (
      <div className="space-y-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Palette className="w-5 h-5" />
            <span className="font-semibold">Graphic Design Challenge</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">AI-Powered Design Task</h2>
          <p className="text-muted-foreground mt-1">Get a unique design brief, create your design, and receive AI evaluation</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" /> Configure Your Challenge
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="text-sm font-medium mb-2 block">Design Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Difficulty Level</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${
                      difficulty === d.value
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full ${d.color} mx-auto mb-1`} />
                    <span className="text-sm font-medium">{d.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium text-sm mb-2">How it works:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>AI generates a unique design brief based on your selection</li>
                <li>A timer starts — create your design using any tool (Figma, Canva, Photoshop, etc.)</li>
                <li>Upload your design before the timer runs out</li>
                <li>AI evaluates your design against the brief criteria</li>
                <li>Receive detailed feedback, scores, and course recommendations</li>
              </ol>
            </div>

            <Button onClick={generateBrief} disabled={loading} className="w-full" size="lg">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Generating Brief...</> : <><Sparkles className="w-4 h-4 mr-2" /> Start Design Challenge</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Challenge Phase
  if (phase === "challenge" && brief) {
    const timePercent = brief ? (timeLeft / (brief.timeLimit * 60)) * 100 : 0;
    const isTimeLow = timeLeft < 120;

    return (
      <div className="space-y-4">
        {/* Timer Bar */}
        <Card className={`border-2 ${isTimeLow ? "border-destructive animate-pulse" : "border-primary"}`}>
          <CardContent className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className={`w-5 h-5 ${isTimeLow ? "text-destructive" : "text-primary"}`} />
              <span className={`text-xl font-mono font-bold ${isTimeLow ? "text-destructive" : "text-foreground"}`}>
                {formatTime(timeLeft)}
              </span>
            </div>
            <Progress value={timePercent} className="flex-1 mx-4 h-2" />
            <Badge variant={isTimeLow ? "destructive" : "outline"}>
              {timeLeft === 0 ? "Time's Up" : "In Progress"}
            </Badge>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Brief Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileImage className="w-5 h-5 text-primary" /> {brief.title}
              </CardTitle>
              <Badge variant="secondary">{CATEGORIES.find((c) => c.value === category)?.label}</Badge>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-3">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Brief</h4>
                    <p className="text-sm text-muted-foreground">{brief.description}</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-1">Requirements</h4>
                    <ul className="space-y-1">
                      {brief.requirements.map((r, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" /> {r}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-muted/50 rounded p-2">
                      <span className="text-muted-foreground">Dimensions</span>
                      <p className="font-medium">{brief.dimensions}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <span className="text-muted-foreground">Color Theme</span>
                      <p className="font-medium">{brief.colorScheme}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <span className="text-muted-foreground">Audience</span>
                      <p className="font-medium">{brief.targetAudience}</p>
                    </div>
                    <div className="bg-muted/50 rounded p-2">
                      <span className="text-muted-foreground">Deliverables</span>
                      <p className="font-medium">{brief.deliverables}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-1">Evaluation Criteria</h4>
                    {brief.evaluationCriteria.map((c, i) => (
                      <div key={i} className="flex justify-between text-sm py-1 border-b border-border/50">
                        <span>{c.name}</span>
                        <Badge variant="outline" className="text-xs">{c.weight}%</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Upload Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Upload className="w-5 h-5 text-primary" /> Submit Your Design
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              {uploadedImage ? (
                <div className="space-y-3">
                  <div className="relative border-2 border-primary/30 rounded-lg overflow-hidden bg-muted/30">
                    <img src={uploadedImage} alt="Design submission" className="w-full h-auto max-h-[300px] object-contain" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">{uploadedFileName}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1">
                      <RefreshCw className="w-4 h-4 mr-2" /> Replace
                    </Button>
                    <Button onClick={submitDesign} className="flex-1">
                      <Sparkles className="w-4 h-4 mr-2" /> Submit for AI Review
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-[300px] border-2 border-dashed border-muted-foreground/30 rounded-lg flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-primary" />
                  </div>
                  <div className="text-center">
                    <p className="font-medium">Click to upload your design</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG, SVG — Max 10MB</p>
                  </div>
                </button>
              )}

              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">💡 Tips</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Use any design tool — Figma, Canva, Photoshop, Illustrator</li>
                  <li>Export as PNG or JPG for best AI analysis</li>
                  <li>Higher resolution yields better evaluation</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Submitting Phase
  if (phase === "submitting") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 animate-pulse">
          <Sparkles className="w-10 h-10 text-primary animate-spin" />
        </div>
        <h3 className="text-xl font-bold mb-2">AI is Evaluating Your Design...</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Our AI is analyzing your submission against the brief criteria including composition, color usage, typography, and creativity.
        </p>
        <div className="mt-6 w-64">
          <Progress value={66} className="h-2 animate-pulse" />
        </div>
      </div>
    );
  }

  // Results Phase
  if (phase === "results" && evaluation) {
    return (
      <div className="space-y-4">
        <div className="text-center mb-4">
          <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border-2 text-lg font-bold ${getGradeBg(evaluation.grade)}`}>
            <Award className="w-6 h-6" /> Grade: {evaluation.grade}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Overall Score */}
          <Card className="text-center">
            <CardContent className="pt-6">
              <div className={`text-5xl font-bold ${getScoreColor(evaluation.overallScore)}`}>
                {evaluation.overallScore}
              </div>
              <p className="text-sm text-muted-foreground mt-1">Overall Score</p>
              <Progress value={evaluation.overallScore} className="mt-3 h-2" />
            </CardContent>
          </Card>

          {/* Submitted Design */}
          {uploadedImage && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Your Submission</p>
                <img src={uploadedImage} alt="Design submission" className="w-full h-auto max-h-[150px] object-contain rounded border" />
              </CardContent>
            </Card>
          )}

          {/* Industry Readiness */}
          <Card>
            <CardContent className="pt-6">
              <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold mb-1 text-center">Industry Readiness</p>
              <p className="text-xs text-muted-foreground text-center">{evaluation.industryReadiness}</p>
            </CardContent>
          </Card>
        </div>

        {/* Criteria Scores */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" /> Criteria Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {evaluation.criteriaScores.map((c, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className={`text-sm font-bold ${getScoreColor(c.score)}`}>{c.score}/100</span>
                  </div>
                  <Progress value={c.score} className="h-1.5 mb-1" />
                  <p className="text-xs text-muted-foreground">{c.feedback}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strengths */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-4 h-4" /> Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {evaluation.strengths.map((s, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Improvements */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                <Lightbulb className="w-4 h-4" /> Areas to Improve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {evaluation.improvements.map((s, i) => (
                  <li key={i} className="text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" /> {s}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Overall Feedback */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" /> Overall Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{evaluation.overallFeedback}</p>
          </CardContent>
        </Card>

        {/* Suggested Courses */}
        {evaluation.suggestedCourses?.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" /> Recommended Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {evaluation.suggestedCourses.map((c, i) => (
                  <div key={i} className="border rounded-lg p-3">
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.reason}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Button onClick={resetChallenge} className="w-full" size="lg">
          <RefreshCw className="w-4 h-4 mr-2" /> Take Another Challenge
        </Button>
      </div>
    );
  }

  return null;
}
