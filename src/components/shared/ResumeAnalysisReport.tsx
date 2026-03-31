import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, TrendingUp, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ResumeAnalysisData {
  overall_score: number;
  career_level: string;
  experience_summary: string;
  strengths: string[];
  improvements: string[];
  skill_highlights: string[];
}

interface ResumeAnalysisReportProps {
  /** User ID to fetch analysis for */
  userId: string;
  /** Optional: pass pre-fetched data to skip DB call */
  data?: ResumeAnalysisData | null;
  /** Compact mode for inline pipeline display */
  compact?: boolean;
}

export default function ResumeAnalysisReport({ userId, data: externalData, compact = false }: ResumeAnalysisReportProps) {
  const [analysis, setAnalysis] = useState<ResumeAnalysisData | null>(externalData || null);
  const [loading, setLoading] = useState(!externalData);

  useEffect(() => {
    if (externalData) {
      setAnalysis(externalData);
      setLoading(false);
      return;
    }
    if (!userId) return;

    const fetchAnalysis = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('resume_analyses')
          .select('overall_score, career_level, experience_summary, strengths, improvements, skill_highlights')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setAnalysis({
            overall_score: data.overall_score || 0,
            career_level: data.career_level || '',
            experience_summary: data.experience_summary || '',
            strengths: data.strengths || [],
            improvements: data.improvements || [],
            skill_highlights: data.skill_highlights || [],
          });
        }
      } catch (e) {
        console.error('Error fetching resume analysis:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [userId, externalData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading resume analysis...</span>
      </div>
    );
  }

  if (!analysis || (!analysis.experience_summary && (!analysis.strengths || analysis.strengths.length === 0))) {
    return null;
  }

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Experience Summary */}
        {analysis.experience_summary && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Experience Summary</p>
            <p className="text-sm text-foreground">{analysis.experience_summary}</p>
          </div>
        )}

        {/* Strengths */}
        {analysis.strengths && analysis.strengths.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Strengths</p>
            <ul className="space-y-1">
              {analysis.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Areas to Improve */}
        {analysis.improvements && analysis.improvements.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Areas to Improve</p>
            <ul className="space-y-1">
              {analysis.improvements.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <TrendingUp className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Skills */}
        {analysis.skill_highlights && analysis.skill_highlights.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Key Skills</p>
            <div className="flex flex-wrap gap-1.5">
              {analysis.skill_highlights.map((skill, i) => (
                <Badge key={i} variant="outline" className="bg-primary/5 text-primary border-primary/30 text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full table-style report (matches Dashboard style)
  return (
    <Card className="overflow-hidden border-border shadow-soft">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-b border-green-200 dark:border-green-800 py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
            <CardTitle className="text-sm font-semibold text-foreground">AI Resume Analysis</CardTitle>
          </div>
          {analysis.overall_score > 0 && (
            <Badge className={`${analysis.overall_score >= 70 ? 'bg-green-500' : analysis.overall_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'} text-white`}>
              Score: {analysis.overall_score}%
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {/* Career Level */}
              {analysis.career_level && (
                <tr className="border-b border-green-200 dark:border-green-800">
                  <td className="px-4 py-3 bg-muted/30 font-medium text-muted-foreground align-top w-[180px]">CAREER LEVEL</td>
                  <td className="px-4 py-3 text-foreground">{analysis.career_level}</td>
                </tr>
              )}
              {/* Experience Summary */}
              {analysis.experience_summary && (
                <tr className="border-b border-green-200 dark:border-green-800">
                  <td className="px-4 py-3 bg-muted/30 font-medium text-muted-foreground align-top w-[180px]">EXPERIENCE SUMMARY</td>
                  <td className="px-4 py-3 text-foreground">{analysis.experience_summary}</td>
                </tr>
              )}
              {/* Strengths */}
              <tr className="border-b border-green-200 dark:border-green-800">
                <td className="px-4 py-3 bg-muted/30 font-medium text-muted-foreground align-top w-[180px]">STRENGTHS</td>
                <td className="px-4 py-3">
                  {analysis.strengths && analysis.strengths.length > 0 ? (
                    <ul className="space-y-1.5">
                      {analysis.strengths.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-foreground">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground italic">Not analyzed yet</span>
                  )}
                </td>
              </tr>
              {/* Areas to Improve */}
              <tr className="border-b border-green-200 dark:border-green-800">
                <td className="px-4 py-3 bg-muted/30 font-medium text-muted-foreground align-top w-[180px]">AREAS TO IMPROVE</td>
                <td className="px-4 py-3">
                  {analysis.improvements && analysis.improvements.length > 0 ? (
                    <ul className="space-y-1.5">
                      {analysis.improvements.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <TrendingUp className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <span className="text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-muted-foreground italic">Not analyzed yet</span>
                  )}
                </td>
              </tr>
              {/* Key Skills */}
              <tr>
                <td className="px-4 py-3 bg-muted/30 font-medium text-muted-foreground align-top w-[180px]">KEY SKILLS</td>
                <td className="px-4 py-3">
                  {analysis.skill_highlights && analysis.skill_highlights.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {analysis.skill_highlights.map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="bg-primary/5 text-primary border-primary/30">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground italic">Not analyzed yet</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
