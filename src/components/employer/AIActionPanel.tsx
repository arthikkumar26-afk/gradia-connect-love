import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Brain,
  Sparkles,
  Zap,
  FileText,
  Send,
  Calendar,
  Loader2,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Star,
  XCircle,
  UserCheck,
} from "lucide-react";
import { useInterviewAutomation } from "@/hooks/useInterviewAutomation";
import { useStatusNotification } from "@/hooks/useStatusNotification";

interface AIActionPanelProps {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId?: string;
  jobTitle?: string;
  interviewCandidateId?: string;
  currentStage: string;
  aiScore?: number | null;
  resumeUrl?: string;
  onRefresh?: () => void;
}

export const AIActionPanel = ({
  candidateId,
  candidateName,
  candidateEmail,
  jobId,
  jobTitle,
  interviewCandidateId,
  currentStage,
  aiScore,
  resumeUrl,
  onRefresh,
}: AIActionPanelProps) => {
  const { analyzeResume, processStage, sendInvitation, generateOfferLetter } = useInterviewAutomation();
  const { notifyShortlisted, notifyInterviewScheduled, notifyOfferReceived, notifyRejected, notifyHired } = useStatusNotification();
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isNotifying, setIsNotifying] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  // Schedule Interview Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  
  // Offer Letter Modal
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [salary, setSalary] = useState("");
  const [startDate, setStartDate] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [isGeneratingOffer, setIsGeneratingOffer] = useState(false);

  // Rejection Modal
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const handleAIAnalysis = async () => {
    if (!jobId) {
      toast.error("No job associated with this candidate");
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const result = await analyzeResume(
        candidateId,
        jobId,
        { full_name: candidateName, email: candidateEmail },
        { job_title: jobTitle },
        resumeUrl
      );
      setAnalysisResult(result);
      toast.success("AI analysis completed!");
      onRefresh?.();
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutoAdvance = async () => {
    if (!interviewCandidateId) {
      toast.error("Candidate not in interview pipeline");
      return;
    }
    
    setIsAdvancing(true);
    try {
      await processStage(interviewCandidateId, 'advance', 'Auto-advanced by AI recommendation');
      toast.success("Candidate advanced to next stage!");
      onRefresh?.();
    } catch (error) {
      console.error("Advance failed:", error);
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleSendInvitation = async () => {
    if (!interviewCandidateId || !scheduleDate || !jobId) {
      toast.error("Please select a date and time");
      return;
    }
    
    setIsSendingInvite(true);
    try {
      await sendInvitation(interviewCandidateId, currentStage, scheduleDate, meetingLink || undefined);
      
      // Also send status notification email
      await notifyInterviewScheduled(
        candidateId,
        jobId,
        scheduleDate,
        currentStage.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        meetingLink || undefined
      );
      
      toast.success("Interview invitation sent!");
      setScheduleModalOpen(false);
      setScheduleDate("");
      setMeetingLink("");
      onRefresh?.();
    } catch (error) {
      console.error("Send invitation failed:", error);
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleGenerateOffer = async () => {
    if (!interviewCandidateId || !salary || !startDate || !jobId) {
      toast.error("Please fill in salary and start date");
      return;
    }
    
    setIsGeneratingOffer(true);
    try {
      await generateOfferLetter(
        interviewCandidateId,
        parseFloat(salary.replace(/[^0-9.]/g, '')),
        startDate,
        customContent || undefined
      );
      
      // Also send offer notification email
      await notifyOfferReceived(candidateId, jobId, salary, startDate);
      
      toast.success("Offer letter generated and sent!");
      setOfferModalOpen(false);
      setSalary("");
      setStartDate("");
      setCustomContent("");
      onRefresh?.();
    } catch (error) {
      console.error("Generate offer failed:", error);
    } finally {
      setIsGeneratingOffer(false);
    }
  };

  const handleShortlist = async () => {
    if (!jobId) return;
    setIsNotifying(true);
    try {
      await notifyShortlisted(candidateId, jobId);
    } finally {
      setIsNotifying(false);
    }
  };

  const handleReject = async () => {
    if (!jobId) return;
    setIsRejecting(true);
    try {
      await notifyRejected(candidateId, jobId, rejectionReason || undefined);
      setRejectModalOpen(false);
      setRejectionReason("");
      onRefresh?.();
    } finally {
      setIsRejecting(false);
    }
  };

  const handleHire = async () => {
    if (!jobId) return;
    setIsNotifying(true);
    try {
      await notifyHired(candidateId, jobId);
      onRefresh?.();
    } finally {
      setIsNotifying(false);
    }
  };

  const isOfferStage = currentStage === "offer" || currentStage === "offer-letter";

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Automation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Score Display */}
          {(aiScore !== undefined && aiScore !== null) || analysisResult?.score ? (
            <div className="bg-background rounded-lg p-3 border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">AI Match Score</span>
                <Badge 
                  variant={((aiScore || analysisResult?.score) >= 70) ? "default" : "secondary"}
                  className={
                    (aiScore || analysisResult?.score) >= 80 
                      ? "bg-green-500/10 text-green-600 border-green-500/20" 
                      : (aiScore || analysisResult?.score) >= 60
                      ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                      : "bg-red-500/10 text-red-600 border-red-500/20"
                  }
                >
                  {(aiScore || analysisResult?.score) >= 70 ? "Strong Match" : "Review Needed"}
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-primary">
                  {aiScore || analysisResult?.score}%
                </span>
                <Progress 
                  value={aiScore || analysisResult?.score} 
                  className="flex-1 h-2"
                />
              </div>
            </div>
          ) : null}

          {/* Analysis Insights */}
          {analysisResult?.analysis && (
            <div className="bg-background rounded-lg p-3 border space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <Brain className="h-3 w-3" />
                AI Insights
              </div>
              <p className="text-xs text-muted-foreground line-clamp-3">
                {analysisResult.analysis.summary || "Analysis completed. Candidate profile has been evaluated."}
              </p>
              {analysisResult.analysis.strengths && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {analysisResult.analysis.strengths.slice(0, 3).map((s: string, i: number) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleAIAnalysis}
              disabled={isAnalyzing}
              className="text-xs"
            >
              {isAnalyzing ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Brain className="h-3 w-3 mr-1" />
              )}
              {isAnalyzing ? "Analyzing..." : "AI Analyze"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleAutoAdvance}
              disabled={isAdvancing || !interviewCandidateId}
              className="text-xs"
            >
              {isAdvancing ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Zap className="h-3 w-3 mr-1" />
              )}
              {isAdvancing ? "Advancing..." : "Auto-Advance"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setScheduleModalOpen(true)}
              disabled={!interviewCandidateId}
              className="text-xs"
            >
              <Calendar className="h-3 w-3 mr-1" />
              Send Invite
            </Button>

            <Button
              size="sm"
              variant={isOfferStage ? "default" : "outline"}
              onClick={() => setOfferModalOpen(true)}
              disabled={!interviewCandidateId}
              className="text-xs"
            >
              <FileText className="h-3 w-3 mr-1" />
              Offer Letter
            </Button>
          </div>

          {/* Status Action Buttons */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              onClick={handleShortlist}
              disabled={isNotifying || !jobId}
              className="text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              {isNotifying ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Star className="h-3 w-3 mr-1" />
              )}
              Shortlist
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={handleHire}
              disabled={isNotifying || !jobId}
              className="text-xs text-primary hover:bg-primary/10"
            >
              {isNotifying ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <UserCheck className="h-3 w-3 mr-1" />
              )}
              Hire
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setRejectModalOpen(true)}
              disabled={!jobId}
              className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <XCircle className="h-3 w-3 mr-1" />
              Reject
            </Button>
          </div>

          {/* Quick Status */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <TrendingUp className="h-3 w-3" />
            <span>Stage: {currentStage.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Interview Modal */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Schedule Interview
            </DialogTitle>
            <DialogDescription>
              Send an interview invitation to {candidateName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="scheduleDate">Date & Time *</Label>
              <Input
                id="scheduleDate"
                type="datetime-local"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meetingLink">Meeting Link (optional)</Label>
              <Input
                id="meetingLink"
                type="url"
                placeholder="https://meet.google.com/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendInvitation} disabled={isSendingInvite || !scheduleDate}>
              {isSendingInvite ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Offer Letter Modal */}
      <Dialog open={offerModalOpen} onOpenChange={setOfferModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Generate AI Offer Letter
            </DialogTitle>
            <DialogDescription>
              AI will generate a professional offer letter for {candidateName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="salary">Salary Offered *</Label>
              <Input
                id="salary"
                type="text"
                placeholder="₹12,00,000 per year"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customContent">Additional Terms (optional)</Label>
              <Textarea
                id="customContent"
                placeholder="Add any custom terms, benefits, or welcome message..."
                value={customContent}
                onChange={(e) => setCustomContent(e.target.value)}
                rows={3}
              />
            </div>

            <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary mt-0.5" />
              <div className="text-xs">
                <p className="font-medium">AI-Powered Generation</p>
                <p className="text-muted-foreground">
                  The offer letter will be professionally formatted and emailed directly to the candidate.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateOffer} disabled={isGeneratingOffer || !salary || !startDate}>
              {isGeneratingOffer ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate & Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Modal */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Reject Candidate
            </DialogTitle>
            <DialogDescription>
              Send a rejection notification to {candidateName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">Reason (optional)</Label>
              <Textarea
                id="rejectionReason"
                placeholder="Provide feedback to help the candidate in future applications..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="bg-yellow-50 rounded-lg p-3 flex items-start gap-2 border border-yellow-200">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-xs">
                <p className="font-medium text-yellow-800">Note</p>
                <p className="text-yellow-700">
                  A professional rejection email will be sent to the candidate.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject} 
              disabled={isRejecting}
            >
              {isRejecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
