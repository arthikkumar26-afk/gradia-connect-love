import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, XCircle, TrendingUp } from "lucide-react";

interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience: { title: string; company: string; duration: string; description: string }[];
  education: { degree: string; school: string; year: string }[];
  skills: string[];
  projects?: { name: string; technologies: string; duration: string; description: string }[];
}

interface ATSCheck {
  label: string;
  passed: boolean;
  weight: number;
  tip: string;
}

export function calculateATSScore(data: ResumeData): { score: number; checks: ATSCheck[] } {
  const checks: ATSCheck[] = [
    {
      label: "Full name present",
      passed: data.fullName.trim().length >= 3,
      weight: 8,
      tip: "Add your full name (first and last).",
    },
    {
      label: "Email provided",
      passed: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email),
      weight: 8,
      tip: "Add a valid email address.",
    },
    {
      label: "Phone number provided",
      passed: data.phone.replace(/\D/g, "").length >= 7,
      weight: 5,
      tip: "Add your phone number.",
    },
    {
      label: "Location specified",
      passed: data.location.trim().length >= 3,
      weight: 4,
      tip: "Add your city/location.",
    },
    {
      label: "Professional summary (50+ chars)",
      passed: data.summary.trim().length >= 50,
      weight: 12,
      tip: "Write a compelling summary of at least 50 characters highlighting your key strengths.",
    },
    {
      label: "Professional summary (100+ chars)",
      passed: data.summary.trim().length >= 100,
      weight: 5,
      tip: "Expand your summary to 100+ characters for better ATS parsing.",
    },
    {
      label: "At least 1 work experience",
      passed: data.experience.some(e => e.title.trim() && e.company.trim()),
      weight: 12,
      tip: "Add at least one work experience entry with title and company.",
    },
    {
      label: "Experience with descriptions",
      passed: data.experience.some(e => e.description.trim().length >= 20),
      weight: 8,
      tip: "Add detailed descriptions (20+ chars) to your work experience entries.",
    },
    {
      label: "2+ work experiences",
      passed: data.experience.filter(e => e.title.trim() && e.company.trim()).length >= 2,
      weight: 5,
      tip: "Add at least 2 work experiences for a stronger resume.",
    },
    {
      label: "Experience duration specified",
      passed: data.experience.some(e => e.duration.trim().length >= 4),
      weight: 4,
      tip: "Specify duration for your work experiences (e.g., '2020 - Present').",
    },
    {
      label: "At least 1 education entry",
      passed: data.education.some(e => e.degree.trim() && e.school.trim()),
      weight: 10,
      tip: "Add at least one education entry with degree and institution.",
    },
    {
      label: "Education year provided",
      passed: data.education.some(e => e.year.trim().length >= 4),
      weight: 4,
      tip: "Add the year of completion for your education.",
    },
    {
      label: "At least 3 skills",
      passed: data.skills.length >= 3,
      weight: 8,
      tip: "Add at least 3 relevant skills.",
    },
    {
      label: "5+ skills listed",
      passed: data.skills.length >= 5,
      weight: 4,
      tip: "Add 5+ skills for better keyword matching with job descriptions.",
    },
    {
      label: "8+ skills listed",
      passed: data.skills.length >= 8,
      weight: 3,
      tip: "List 8+ skills to maximize ATS keyword hits across different job postings.",
    },
    {
      label: "At least 1 project added",
      passed: (data.projects || []).some(p => p.name.trim() && p.description.trim()),
      weight: 6,
      tip: "Add at least one project with name and description to showcase practical experience.",
    },
  ];

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0);
  const earnedWeight = checks.filter(c => c.passed).reduce((s, c) => s + c.weight, 0);
  const score = Math.round((earnedWeight / totalWeight) * 100);

  return { score, checks };
}

export default function ATSScoreCard({ data }: { data: ResumeData }) {
  const { score, checks } = useMemo(() => calculateATSScore(data), [data]);

  const failedChecks = checks.filter(c => !c.passed);
  const passedChecks = checks.filter(c => c.passed);

  const scoreColor =
    score >= 85
      ? "text-green-600 dark:text-green-400"
      : score >= 60
      ? "text-amber-600 dark:text-amber-400"
      : "text-red-600 dark:text-red-400";

  const progressColor =
    score >= 85
      ? "[&>div]:bg-green-500"
      : score >= 60
      ? "[&>div]:bg-amber-500"
      : "[&>div]:bg-red-500";

  return (
    <Card className="border-border">
      <CardContent className="py-3 px-4 space-y-3">
        {/* Score Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">ATS Score</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${scoreColor}`}>{score}%</span>
            {score >= 85 ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px]">
                ATS Ready
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-600">
                Needs Work
              </Badge>
            )}
          </div>
        </div>

        <Progress value={score} className={`h-2 ${progressColor}`} />

        {/* Tips to improve */}
        {failedChecks.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Improve your score:</p>
            {failedChecks.slice(0, 4).map((check, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs">
                <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{check.tip}</span>
              </div>
            ))}
            {failedChecks.length > 4 && (
              <p className="text-[10px] text-muted-foreground ml-4">
                +{failedChecks.length - 4} more improvements available
              </p>
            )}
          </div>
        )}

        {/* Passed checks summary */}
        {score >= 85 && (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Your resume is optimized for ATS systems! ({passedChecks.length}/{checks.length} checks passed)</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
