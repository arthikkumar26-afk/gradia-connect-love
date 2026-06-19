import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import gradiaLogo from "@/assets/gradia-logo-pdf.png";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, FileText, Code, Video, MessageSquare, UserCheck, 
  FileCheck, Star, CheckCircle2, XCircle, Clock, Award, Brain,
  ChevronDown, ChevronUp, Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { StageRecordingPlayer } from "./StageRecordingPlayer";

interface StageReview {
  stageId: string;
  stageName: string;
  stageOrder: number;
  score: number | null;
  status: string | null;
  completedAt: string | null;
  notes: string | null;
  aiFeedback: any;
  // Written Test specific
  totalQuestions?: number;
  correctAnswers?: number;
  timeTaken?: number;
  questions?: any[];
  answers?: number[];
  // Demo Feedback specific
  reviews?: {
    reviewerName: string | null;
    overallRating: number | null;
    teachingRating: number | null;
    communicationRating: number | null;
    knowledgeRating: number | null;
    recommendation: string | null;
    feedbackText: string | null;
  }[];
}

const stageIcons: Record<string, React.ElementType> = {
  'Interview Guidelines': FileText,
  'CV/Resume': FileText,
  'Written Test': Code,
  'Demo Slot Booking': Clock,
  'Demo Round': Video,
  'Demo Feedback': MessageSquare,
  'Segment Round Slot Booking': Clock,
  'Segment Round': Video,
  'Segment Feedback': MessageSquare,
  'Admin & Academic Round Slot Booking': Clock,
  'Admin & Academic Round': Video,
  'Admin & Academic Feedback': MessageSquare,
  'HR Round Slot Booking': Clock,
  'HR Round': UserCheck,
  'HR Feedback': MessageSquare,
  'Core Team Round Slot Booking': Clock,
  'Core Team Round': Video,
  'Core Team Feedback': MessageSquare,
  'Management Round Slot Booking': Clock,
  'Management Round': Video,
  'Management Round Feedback': MessageSquare,
  'Final Review': FileCheck,
};

const StarRating = ({ rating, max = 5 }: { rating: number; max?: number }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: max }, (_, i) => (
      <Star
        key={i}
        className={cn(
          "h-3 w-3",
          i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
        )}
      />
    ))}
    <span className="text-xs text-muted-foreground ml-1">{rating}/{max}</span>
  </div>
);

export const AllStagesReviewSummary = ({ interviewCandidateId }: { interviewCandidateId: string }) => {
  const [stageReviews, setStageReviews] = useState<StageReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedStage, setExpandedStage] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [candidateName, setCandidateName] = useState<string>('Candidate');
  const [jobTitle, setJobTitle] = useState<string>('Position');

  useEffect(() => {
    const fetchAllReviews = async () => {
      try {
        // Fetch candidate and job info
        const { data: icData } = await supabase
          .from('interview_candidates')
          .select('candidate_id, job_id, current_stage_id, candidate:profiles(full_name), job:jobs(job_title)')
          .eq('id', interviewCandidateId)
          .single();
        
        if (icData) {
          setCandidateName((icData.candidate as any)?.full_name || 'Candidate');
          setJobTitle((icData.job as any)?.job_title || 'Position');
        }

        // Fetch all stages
        const { data: stages } = await supabase
          .from('interview_stages')
          .select('id, name, stage_order')
          .order('stage_order');

        if (!stages) return;

        // Fetch all interview events for this candidate
        const { data: events } = await supabase
          .from('interview_events')
          .select('id, stage_id, status, completed_at, ai_score, ai_feedback, notes')
          .eq('interview_candidate_id', interviewCandidateId);

        // Fetch interview responses (for Written Test MCQ scores)
        const eventIds = (events || []).map(e => e.id);
        let responses: any[] = [];
        if (eventIds.length > 0) {
          const { data: respData } = await supabase
            .from('interview_responses')
            .select('interview_event_id, score, total_questions, correct_answers, time_taken_seconds')
            .in('interview_event_id', eventIds);
          responses = respData || [];
        }

        // Fetch management reviews (for Demo Feedback and HR Feedback)
        const { data: mgmtReviews } = await supabase
          .from('management_reviews')
          .select('reviewer_name, overall_rating, teaching_skills_rating, communication_rating, subject_knowledge_rating, recommendation, feedback_text, status, feedback_type')
          .eq('interview_candidate_id', interviewCandidateId);

        // Determine the candidate's current stage order
        const currentStageId = icData?.current_stage_id;
        const currentStage = stages.find(s => s.id === currentStageId);
        const currentStageOrder = currentStage?.stage_order ?? -1;

        // Build stage reviews
        const allowedStages = ['Written Test', 'Segment Feedback', 'Admin & Academic Feedback', 'Management Round Feedback', 'HR Feedback'];
        const reviews: StageReview[] = stages
          .filter(s => allowedStages.includes(s.name))
          .map(stage => {
            const stageEvents = (events || []).filter(e => e.stage_id === stage.id);
            const event = stageEvents.find(e => e.status === 'completed' || e.status === 'passed')
              || stageEvents.find(e => e.status === 'in_progress')
              || stageEvents[0] || null;

            // Determine if this stage was skipped:
            // Stage is before current stage, has no event OR event is not completed/passed
            const isCompleted = event?.status === 'completed' || event?.status === 'passed';
            const isSkipped = !isCompleted && stage.stage_order < currentStageOrder;

            const review: StageReview = {
              stageId: stage.id,
              stageName: stage.name,
              stageOrder: stage.stage_order,
              score: event?.ai_score || null,
              status: isSkipped ? 'skipped' : (event?.status || null),
              completedAt: event?.completed_at || null,
              notes: event?.notes || null,
              aiFeedback: event?.ai_feedback || null,
            };

            if (stage.name === 'Written Test' && event) {
              const resp = responses.find(r => r.interview_event_id === event.id);
              if (resp) {
                review.totalQuestions = resp.total_questions;
                review.correctAnswers = resp.correct_answers;
                review.timeTaken = resp.time_taken_seconds;
                review.score = resp.score || review.score;
              }
            }

            // Map feedback stages to their feedback_type
            const feedbackTypeMap: Record<string, string> = {
              'Demo Feedback': 'demo',
              'Segment Feedback': 'segment',
              'Admin & Academic Feedback': 'admin_academic',
              'Core Team Feedback': 'core_team',
              'Management Round Feedback': 'management',
              'HR Feedback': 'hr',
            };
            const feedbackTypeForStage = feedbackTypeMap[stage.name];
            if (feedbackTypeForStage) {
              const submittedReviews = (mgmtReviews || []).filter(r => 
                r.status === 'submitted' && (
                  r.feedback_type === feedbackTypeForStage || 
                  (feedbackTypeForStage === 'demo' && !r.feedback_type)
                )
              );
              if (submittedReviews.length > 0) {
                review.reviews = submittedReviews.map(r => ({
                  reviewerName: r.reviewer_name,
                  overallRating: r.overall_rating,
                  teachingRating: r.teaching_skills_rating,
                  communicationRating: r.communication_rating,
                  knowledgeRating: r.subject_knowledge_rating,
                  recommendation: r.recommendation,
                  feedbackText: r.feedback_text,
                }));
                const avgRating = submittedReviews.reduce((sum, r) => sum + (r.overall_rating || 0), 0) / submittedReviews.length;
                review.score = Math.round((avgRating / 5) * 100);
              }
            }

            return review;
          });

        setStageReviews(reviews);
      } catch (err) {
        console.error('Error fetching all stage reviews:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllReviews();
  }, [interviewCandidateId]);

  const handleDownloadPDF = useCallback(async () => {
    setIsDownloading(true);
    try {
      // Load logo as base64
      let logoDataUrl: string | null = null;
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject();
          img.src = gradiaLogo;
        });
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        logoDataUrl = canvas.toDataURL('image/png');
      } catch { /* skip logo if load fails */ }

      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      const ph = doc.internal.pageSize.getHeight();
      const margin = 16;
      const contentW = pw - margin * 2;
      let y = 0;

      const checkPage = (need: number) => {
        if (y + need > ph - 20) { doc.addPage(); y = 20; }
      };

      // Header bar
      doc.setFillColor(30, 58, 95);
      doc.rect(0, 0, pw, 38, 'F');

      // Logo on the left side of header
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', 10, 6, 26, 26);
      }

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('INTERVIEW REVIEW REPORT', pw / 2 + 12, 18, { align: 'center' });
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text('Gradia Job Portal', pw / 2 + 12, 28, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      y = 48;

      // Candidate info box
      doc.setFillColor(245, 247, 250);
      doc.roundedRect(margin, y, contentW, 28, 3, 3, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Candidate:', margin + 6, y + 10);
      doc.setFont('helvetica', 'normal');
      doc.text(candidateName, margin + 36, y + 10);
      doc.setFont('helvetica', 'bold');
      doc.text('Position:', margin + 6, y + 20);
      doc.setFont('helvetica', 'normal');
      doc.text(jobTitle, margin + 32, y + 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, pw - margin - 6, y + 10, { align: 'right' });
      y += 36;

      // Overall Score
      const pdfAllowedStages = ['Written Test', 'Segment Feedback', 'Admin & Academic Feedback', 'Management Round Feedback', 'HR Feedback'];
      const pdfReviews = stageReviews.filter(r => pdfAllowedStages.includes(r.stageName));
      const completedForPdf = pdfReviews.filter(r => r.score !== null && r.score !== undefined && (r.status === 'completed' || r.status === 'passed' || r.completedAt));
      const overallScorePdf = completedForPdf.length > 0
        ? Math.round(completedForPdf.reduce((sum, r) => sum + (r.score || 0), 0) / completedForPdf.length)
        : null;

      if (overallScorePdf !== null) {
        const scoreColor = overallScorePdf >= 70 ? [34, 139, 34] : overallScorePdf >= 50 ? [200, 150, 0] : [200, 50, 50];
        doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
        doc.roundedRect(margin, y, contentW, 16, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(`Overall Score: ${overallScorePdf}%`, margin + 8, y + 11);
        doc.setFontSize(10);
        doc.text(`${completedForPdf.length} stage(s) evaluated`, pw - margin - 8, y + 11, { align: 'right' });
        doc.setTextColor(0, 0, 0);
        y += 24;
      }

      // Stage details
      let stageNum = 0;
      for (const review of pdfReviews) {
        stageNum++;
        const isCompleted = review.status === 'completed' || review.status === 'passed' || review.completedAt;
        const isPending = !isCompleted && review.status !== 'skipped';

        checkPage(35);

        // Stage header with colored left border
        const stageHeaderH = 10;
        const borderColor = isCompleted ? [34, 139, 34] : isPending ? [180, 180, 180] : [220, 160, 40];
        doc.setFillColor(borderColor[0], borderColor[1], borderColor[2]);
        doc.rect(margin, y, 3, stageHeaderH, 'F');
        doc.setFillColor(248, 249, 251);
        doc.rect(margin + 3, y, contentW - 3, stageHeaderH, 'F');

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 95);
        doc.text(`${stageNum}. ${review.stageName}`, margin + 8, y + 7);

        if (review.score !== null && review.score !== undefined) {
          doc.setFont('helvetica', 'bold');
          const sc = review.score >= 70 ? [34, 139, 34] : review.score >= 50 ? [180, 130, 0] : [200, 50, 50];
          doc.setTextColor(sc[0], sc[1], sc[2]);
          doc.text(`${review.score}%`, pw - margin - 6, y + 7, { align: 'right' });
        } else if (isPending) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(150, 150, 150);
          doc.text('Pending', pw - margin - 6, y + 7, { align: 'right' });
        }
        doc.setTextColor(0, 0, 0);
        y += stageHeaderH + 4;

        if (isCompleted) {
          // Written Test
          if (review.stageName === 'Written Test' && review.totalQuestions) {
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Correct Answers: ${review.correctAnswers} / ${review.totalQuestions}`, margin + 10, y);
            const timeStr = review.timeTaken ? `${Math.floor(review.timeTaken / 60)}m ${review.timeTaken % 60}s` : 'N/A';
            doc.text(`Time Taken: ${timeStr}`, pw / 2, y);
            y += 6;
          }

          // Feedback Reviews
          if (review.reviews && review.reviews.length > 0) {
            for (const r of review.reviews) {
              checkPage(30);
              // Observer name
              doc.setFontSize(9);
              doc.setFont('helvetica', 'bold');
              doc.text(`Observer: ${r.reviewerName || 'Anonymous'}`, margin + 10, y);
              y += 5;

              // Ratings table
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(8);
              const ratings = [
                ['Teaching', `${r.teachingRating || 0}/5`],
                ['Communication', `${r.communicationRating || 0}/5`],
                ['Knowledge', `${r.knowledgeRating || 0}/5`],
              ];
              const colW = 50;
              ratings.forEach((pair, idx) => {
                const xPos = margin + 10 + idx * colW;
                doc.setFont('helvetica', 'normal');
                doc.text(`${pair[0]}:`, xPos, y);
                doc.setFont('helvetica', 'bold');
                doc.text(pair[1], xPos + 32, y);
              });
              y += 5;

              if (r.recommendation) {
                doc.setFont('helvetica', 'normal');
                doc.text(`Recommendation: ${r.recommendation.replace(/_/g, ' ').toUpperCase()}`, margin + 10, y);
                y += 5;
              }
              if (r.feedbackText) {
                doc.setFont('helvetica', 'italic');
                const fbLines = doc.splitTextToSize(`"${r.feedbackText}"`, contentW - 24);
                doc.text(fbLines, margin + 10, y);
                y += fbLines.length * 4 + 2;
              }
              y += 2;
            }
          }

          // Completed date
          if (review.completedAt) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(120, 120, 120);
            doc.text(`Completed: ${new Date(review.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`, margin + 10, y);
            doc.setTextColor(0, 0, 0);
            y += 5;
          }
        } else if (isPending) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(150, 150, 150);
          doc.text('This stage has not been completed yet.', margin + 10, y);
          doc.setTextColor(0, 0, 0);
          y += 5;
        }

        // Separator line
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, y + 2, pw - margin, y + 2);
        y += 8;
      }

      // Footer
      const footerY = ph - 12;
      doc.setDrawColor(30, 58, 95);
      doc.line(margin, footerY - 4, pw - margin, footerY - 4);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(`Generated by Gradia Job Portal on ${new Date().toLocaleString('en-IN')}`, pw / 2, footerY, { align: 'center' });
      doc.text('Confidential', pw - margin, footerY, { align: 'right' });

      doc.save(`${candidateName.replace(/\s+/g, '_')}_Interview_Review.pdf`);
      toast.success('Review report downloaded successfully');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Failed to download review report');
    } finally {
      setIsDownloading(false);
    }
  }, [stageReviews, candidateName, jobTitle]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
        <span className="text-sm text-muted-foreground">Loading all reviews...</span>
      </div>
    );
  }

  const completedReviews = stageReviews.filter(r => r.status === 'completed' || r.status === 'passed' || r.completedAt);
  const overallScore = completedReviews.length > 0
    ? Math.round(completedReviews.reduce((sum, r) => sum + (r.score || 0), 0) / completedReviews.filter(r => r.score).length)
    : null;

  const formatTime = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="mt-3 space-y-3">
      {/* Download Button */}
      <div className="flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownloadPDF}
          disabled={isDownloading}
          className="h-7 text-xs"
        >
          {isDownloading ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5 mr-1.5" />
          )}
          Download Report
        </Button>
      </div>
      {/* Overall Summary */}
      {overallScore !== null && (
        <div className={cn(
          "rounded-lg p-3 border",
          overallScore >= 50 
            ? "bg-green-50 border-green-200" 
            : "bg-amber-50 border-amber-200"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className={cn("h-5 w-5", overallScore >= 50 ? "text-green-600" : "text-amber-600")} />
              <div>
                <p className="text-sm font-semibold">Overall Score</p>
                <p className="text-xs text-muted-foreground">{completedReviews.filter(r => r.score).length} stages evaluated</p>
              </div>
            </div>
            <div className={cn(
              "text-2xl font-bold",
              overallScore >= 50 ? "text-green-600" : "text-amber-600"
            )}>
              {overallScore}%
            </div>
          </div>
        </div>
      )}

      {/* Stage-by-Stage Reviews */}
      <div className="space-y-2">
        {stageReviews.map((review) => {
          const Icon = stageIcons[review.stageName] || FileText;
          const isCompleted = review.status === 'completed' || review.status === 'passed' || review.completedAt;
          const isSkipped = review.status === 'skipped';
          const isExpanded = expandedStage === review.stageName;
          const hasDetails = review.score || review.notes || review.aiFeedback || review.reviews || review.totalQuestions || ['Written Test', 'Demo Round', 'Segment Round', 'Admin & Academic Round', 'Core Team Round', 'Management Round', 'HR Round', 'Demo Feedback', 'Segment Feedback', 'Admin & Academic Feedback', 'Core Team Feedback', 'Management Round Feedback', 'HR Feedback'].includes(review.stageName);

          return (
            <div
              key={review.stageName}
              className={cn(
                "border rounded-lg overflow-hidden transition-all",
                isCompleted ? "border-border" : isSkipped ? "border-amber-300 dark:border-amber-700 opacity-80" : "border-muted opacity-60"
              )}
            >
              {/* Stage Header */}
              <div
                className={cn(
                  "flex items-center gap-2 p-2.5",
                  hasDetails && isCompleted ? "cursor-pointer hover:bg-accent/30" : ""
                )}
                onClick={() => hasDetails && isCompleted && setExpandedStage(isExpanded ? null : review.stageName)}
              >
                <div className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0",
                  isCompleted ? "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400" 
                    : isSkipped ? "bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5" /> 
                    : isSkipped ? <XCircle className="h-3.5 w-3.5" />
                    : <Icon className="h-3.5 w-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">{review.stageName}</span>
                    {review.score !== null && review.score !== undefined && (
                      <Badge
                        className={cn(
                          "text-[10px] py-0 px-1.5",
                          review.score >= 50
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-red-100 text-red-700 border-red-200"
                        )}
                      >
                        {review.score}%
                      </Badge>
                    )}
                    {!isCompleted && isSkipped && (
                      <Badge className="text-[10px] py-0 px-1.5 bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700">
                        Skipped
                      </Badge>
                    )}
                    {!isCompleted && !isSkipped && (
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
                {hasDetails && isCompleted && (
                  isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              {/* Expanded Details */}
              {isExpanded && isCompleted && (
                <div className="border-t bg-muted/20 p-3 space-y-2.5">
                  {/* CV/Resume - AI Analysis */}
                  {review.stageName === 'CV/Resume' && review.aiFeedback && (
                    <div className="space-y-2">
                      {typeof review.aiFeedback === 'object' && (
                        <>
                          {review.aiFeedback.feedback && (
                            <p className="text-xs text-muted-foreground">{review.aiFeedback.feedback}</p>
                          )}
                          {review.aiFeedback.key_observations?.length > 0 && (
                            <div>
                              <p className="text-[10px] font-medium mb-1">Key Observations</p>
                              {review.aiFeedback.key_observations.map((obs: string, i: number) => (
                                <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                                  <CheckCircle2 className="h-3 w-3 text-primary mt-0.5 flex-shrink-0" />
                                  <span>{obs}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* Written Test - MCQ Results */}
                  {review.stageName === 'Written Test' && (
                    <div className="space-y-1.5">
                      {review.totalQuestions && (
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-muted-foreground">
                            Correct: <span className="font-medium text-foreground">{review.correctAnswers}/{review.totalQuestions}</span>
                          </span>
                          <span className="text-muted-foreground">
                            Time: <span className="font-medium text-foreground">{formatTime(review.timeTaken || null)}</span>
                          </span>
                        </div>
                      )}
                      {review.aiFeedback && typeof review.aiFeedback === 'object' && review.aiFeedback.feedback && (
                        <p className="text-xs text-muted-foreground">{review.aiFeedback.feedback}</p>
                      )}
                    </div>
                  )}

                  {/* Demo/HR Feedback - Observer Reviews */}
                  {['Demo Feedback', 'Segment Feedback', 'Admin & Academic Feedback', 'Core Team Feedback', 'Management Round Feedback', 'HR Feedback'].includes(review.stageName) && review.reviews && review.reviews.length > 0 && (
                    <div className="space-y-2">
                      {review.reviews.map((r, i) => (
                        <div key={i} className="bg-background rounded-md p-2 border space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="text-[10px] py-0">
                              {r.reviewerName || 'Observer'}
                            </Badge>
                            {r.recommendation && (
                              <Badge
                                className={cn(
                                  "text-[10px] py-0",
                                  r.recommendation === 'strongly_recommend' || r.recommendation === 'recommend'
                                    ? "bg-green-100 text-green-700 border-green-200"
                                    : "bg-amber-100 text-amber-700 border-amber-200"
                                )}
                              >
                                {r.recommendation.replace(/_/g, ' ')}
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <p className="text-[10px] text-muted-foreground">Teaching</p>
                              <StarRating rating={r.teachingRating || 0} />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Communication</p>
                              <StarRating rating={r.communicationRating || 0} />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Knowledge</p>
                              <StarRating rating={r.knowledgeRating || 0} />
                            </div>
                          </div>
                          {r.feedbackText && (
                            <p className="text-[11px] text-muted-foreground italic">"{r.feedbackText}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* HR Round & other stages - AI Feedback / Notes */}
                  {!['CV/Resume', 'Written Test', 'Demo Feedback', 'Segment Feedback', 'Admin & Academic Feedback', 'Core Team Feedback', 'Management Round Feedback', 'HR Feedback'].includes(review.stageName) && (
                    <div className="space-y-1.5">
                      {review.aiFeedback && typeof review.aiFeedback === 'object' && review.aiFeedback.feedback && (
                        <p className="text-xs text-muted-foreground">{review.aiFeedback.feedback}</p>
                      )}
                      {review.aiFeedback && typeof review.aiFeedback === 'string' && (
                        <p className="text-xs text-muted-foreground">{review.aiFeedback}</p>
                      )}
                      {review.notes && (
                        <p className="text-xs text-muted-foreground">{review.notes}</p>
                      )}
                    </div>
                  )}

                  {/* Recording & Results for stages with recordings */}
                  {['Written Test', 'Demo Round', 'HR Round'].includes(review.stageName) && (
                    <div className="mt-2 pt-2 border-t">
                      <StageRecordingPlayer
                        interviewCandidateId={interviewCandidateId}
                        stageId={review.stageId}
                        stageName={review.stageName}
                        showLinkForPending={false}
                      />
                    </div>
                  )}

                  {/* Completed timestamp */}
                  {review.completedAt && (
                    <p className="text-[10px] text-muted-foreground pt-1 border-t flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Completed: {new Date(review.completedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
